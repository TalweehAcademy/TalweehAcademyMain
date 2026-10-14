// Downloads the Qurʾān texts the Qurʾān pages show and writes them to public/quran-data/v1, so the pages read them
// from this site instead of from outside services (src/quran/quranData.js). Run by hand, not by the build:
//   node scripts/build-quran-data.mjs
// then run scripts/build-quran-layout.mjs (it adds the page layouts to index.json, which this rewrites), check the
// reports both print and commit the files. The texts are fixed; a new run is only needed when a source
// publishes a correction (tanzil.net/updates) or a text is added.
//
// Sources (credited on the pages, QuranCredits in src/quran/QuranUI.jsx):
//   Tanzil Project   Uthmani text (Ḥafṣ), version 1.1; the plain text used for Arabic search; page and juzʾ starts of
//                    the Madinah muṣḥaf; the English translations. Tanzil's terms: copies unchanged, its notice
//                    kept in every file, its source named and linked; translations for non-commercial use.
//   fawazahmed0/quran-api (public domain), from the King Fahd Qurʾān Complex: Warsh, Qālūn, Shuʿbah, al-Sūsī, IndoPak.
//
// Nothing in a text is changed. The only step is the one the pages always took: the basmalah the sources put in
// front of āyah 1 (every sūrah but al-Fātiḥah and at-Tawbah) is taken off, since the pages show it as a heading.
import { execSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TRANSLATIONS } from '../src/quran/translations.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public', 'quran-data', 'v1')
const TANZIL_TEXT = (type) => `https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=false&tatweel=true&quranType=${type}&outType=txt-2&agree=true`
const TANZIL_TRANS = (id) => `https://tanzil.net/trans/?transID=${id}&type=txt-2`
const TANZIL_META = 'https://tanzil.net/res/text/metadata/quran-data.js'
const FAWAZ = (edition) => `https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/${edition}.min.json`
const RIWAYAT = { warsh: 'ara-quranwarsh', qalun: 'ara-quranqaloon', shubah: 'ara-quranshouba', susi: 'ara-quransoosi', indopak: 'ara-quranindopak' }

const TANZIL_NOTICE = 'Tanzil Quran Text, Copyright (C) 2007-2021 Tanzil Project, License: Creative Commons Attribution 3.0. Permission is granted to copy and distribute verbatim copies of this text, but changing it is not allowed. This Quran text can be used in any website or application, provided that its source (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to keep track of changes. Please check updates at: http://tanzil.net/updates/'
const TRANS_NOTICE = (name) => `${name}. Translation from Tanzil (https://tanzil.net/trans/), for non-commercial use; the translation remains the work of its translator and publisher.`
const FAWAZ_NOTICE = 'Text of the King Fahd Glorious Qurʾān Printing Complex (qurancomplex.gov.sa), from fawazahmed0/quran-api (https://github.com/fawazahmed0/quran-api), public domain.'

async function get(url, as = 'text') {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(`${res.status}`)
      return as === 'json' ? await res.json() : await res.text()
    } catch (err) {
      if (attempt === 3) throw new Error(`${url}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
}

// "sura|aya|text" lines (Tanzil's txt-2), the notice lines after "#" left out: Map("s:a" → text).
function parsePipes(text, label) {
  const rows = new Map()
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const [s, a, ...rest] = line.replace(/\r$/, '').split('|')
    rows.set(`${Number(s)}:${Number(a)}`, rest.join('|').replace(/^﻿/, ''))
  }
  if (rows.size !== 6236) throw new Error(`${label}: ${rows.size} āyāt, expected 6236`)
  return rows
}
const metaList = (js, name) => {
  const block = js.split(`QuranData.${name} = [`)[1].split('];')[0]
  return [...block.matchAll(/\[(\d+),\s*(\d+)[^\]]*\]/g)].map((m) => [Number(m[1]), Number(m[2])])
    // Tanzil ends each list with an end marker, [115, 1].
    .filter(([sura]) => sura <= 114)
}

// The basmalah is recognised by its letters alone: the sources write its marks in different orders (بِّسْمِ before
// al-Tīn and al-Qadr), and the riwāyāt and IndoPak spell it their own way.
const letters = (t) => t.normalize('NFKD').replace(/[^\u0621-\u063A\u0641-\u064A\u0671]/g, '').replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627')
const BASMALAH = letters('بسم الله الرحمن الرحيم')
function withoutBasmalah(s, a, text, label) {
  if (s === 1 || s === 9 || a !== 1) return text
  const words = text.split(' ')
  if (letters(words.slice(0, 4).join('')) !== BASMALAH) return text
  if (words.length < 5) throw new Error(`${label} ${s}:1 is only the basmalah`)
  removed++
  return words.slice(4).join(' ')
}

const counts = []
let removed = 0
const basmalahReport = []
const surahRows = (rows, label, { basmalah = true } = {}) => {
  const bySurah = []
  for (let s = 1; s <= 114; s++) {
    const ayat = []
    for (let a = 1; rows.has(`${s}:${a}`); a++) ayat.push(basmalah ? withoutBasmalah(s, a, rows.get(`${s}:${a}`), label) : rows.get(`${s}:${a}`))
    if (counts[s - 1] != null && ayat.length !== counts[s - 1]) throw new Error(`${label}: sūrah ${s} has ${ayat.length} āyāt, expected ${counts[s - 1]}`)
    bySurah.push(ayat)
  }
  return bySurah
}
async function writeSurahs(dir, bySurah, notice) {
  // Tanzil puts the basmalah before āyah 1 of all 112 sūrahs that have one; the fawazahmed0 texts never do.
  if (!dir.startsWith('tr/') && removed !== 0 && removed !== 112) throw new Error(`${dir}: the basmalah was taken off ${removed} sūrahs, expected 0 or 112`)
  basmalahReport.push(`${dir} ${removed}`)
  removed = 0
  await mkdir(path.join(out, dir), { recursive: true })
  for (let s = 1; s <= 114; s++) await writeFile(path.join(out, dir, `${s}.json`), JSON.stringify({ notice, ayat: bySurah[s - 1] }))
}
const report = []

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

// Ḥafṣ (Tanzil Uthmani) fixes the āyah counts every other text is checked against.
const uthmaniRaw = await get(TANZIL_TEXT('uthmani'))
if (!/Version 1\.1/.test(uthmaniRaw)) throw new Error('Tanzil Uthmani is no longer version 1.1: read tanzil.net/updates before using it.')
const uthmani = parsePipes(uthmaniRaw, 'Uthmani')
for (let s = 1; s <= 114; s++) { let n = 0; while (uthmani.has(`${s}:${n + 1}`)) n++; counts.push(n) }
await writeSurahs('hafs', surahRows(uthmani, 'Uthmani'), TANZIL_NOTICE)
report.push('Ḥafṣ (Tanzil Uthmani 1.1): 6236 āyāt')

const meta = await get(TANZIL_META)
const pages = metaList(meta, 'Page'), juz = metaList(meta, 'Juz')
// Rukūʿ, manzil and ḥizb-quarter starts, for the printed pages' margins.
const ruku = metaList(meta, 'Ruku'), manzil = metaList(meta, 'Manzil'), hizbQuarters = metaList(meta, 'HizbQaurter')
if (ruku.length !== 556 || manzil.length !== 7 || hizbQuarters.length !== 240) throw new Error(`Tanzil metadata: ${ruku.length} rukūʿ, ${manzil.length} manāzil, ${hizbQuarters.length} ḥizb quarters`)
if (pages.length !== 604 || juz.length !== 30) throw new Error(`Tanzil metadata: ${pages.length} pages, ${juz.length} ajzāʾ`)
await writeFile(path.join(out, 'index.json'), JSON.stringify({ notice: 'Page, juzʾ, rukūʿ, manzil and ḥizb-quarter starts from Tanzil Quran Metadata, Creative Commons Attribution 3.0 (https://tanzil.net).', counts, pages, juz, ruku, manzil, hizbQuarters }))
report.push('Index: 604 page starts, 30 juzʾ, 556 rukūʿ, 7 manāzil, 240 ḥizb quarters')

// Arabic search: Tanzil's plain text without marks, one "s|a|text" line per āyah (basmalah kept, as Tanzil gives it).
const clean = parsePipes(await get(TANZIL_TEXT('simple-clean')), 'Simple clean')
await mkdir(path.join(out, 'search'), { recursive: true })
await writeFile(path.join(out, 'search', 'ar.txt'), `# ${TANZIL_NOTICE}\n${[...clean].map(([k, t]) => `${k.replace(':', '|')}|${t}`).join('\n')}\n`)
report.push('Arabic search text (Tanzil simple-clean): 6236 āyāt')

for (const [id, edition] of Object.entries(RIWAYAT)) {
  const json = await get(FAWAZ(edition), 'json')
  const rows = new Map((json.quran || []).map((r) => [`${r.chapter}:${r.verse}`, String(r.text || '')]))
  await writeSurahs(id, surahRows(rows, edition), FAWAZ_NOTICE)
  report.push(`${id} (${edition}): ${rows.size} āyāt`)
}

for (const { edition, name } of TRANSLATIONS) {
  const rows = parsePipes(await get(TANZIL_TRANS(edition)), edition)
  const bySurah = surahRows(rows, edition, { basmalah: false })
  await writeSurahs(`tr/${edition}`, bySurah, TRANS_NOTICE(name))
  if (edition === 'en.sahih') await writeFile(path.join(out, 'search', 'en.txt'), `# ${TRANS_NOTICE(name)}\n${[...rows].map(([k, t]) => `${k.replace(':', '|')}|${t}`).join('\n')}\n`)
  report.push(`${edition} (${name}): 6236 āyāt`)
}

await writeFile(path.join(out, 'NOTICE.txt'), [
  'Qurʾān data for the Talweeh Academy Qurʾān pages, written by scripts/build-quran-data.mjs.', '',
  `hafs/, search/ar.txt, index.json: ${TANZIL_NOTICE}`, '',
  'tr/: English translations from Tanzil (https://tanzil.net/trans/), for non-commercial use; each remains the work of its translator and publisher.', '',
  `warsh/, qalun/, shubah/, susi/, indopak/: ${FAWAZ_NOTICE}`, '',
].join('\n'))
console.log(report.join('\n'))
console.log(`Basmalah taken off (sūrahs): ${basmalahReport.filter((r) => !r.startsWith('tr/')).join(', ')}`)
console.log(`Written: ${execSync(`du -sh "${out}"`).toString().trim()}`)
