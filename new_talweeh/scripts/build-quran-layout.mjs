// Printed muṣḥaf layouts and word-by-word meanings for the Qurʾān pages, from the Quranic Universal Library
// (QUL, qul.tarteel.ai, by Tarteel). QUL's downloads need a signed-in account, so this reads files downloaded by hand:
//   node scripts/build-quran-layout.mjs <folder>
// where <folder> holds the unzipped downloads, each in its own folder as it comes out of its zip:
//   qpc-v2-15-lines.db/qpc-v2-15-lines.db             Mushaf layout · KFGQPC V2 layout (1421H print) · sqlite
//   taj-indopak-16-lines.db/taj-indopak-16-lines.db   Mushaf layout · Indopak 16 lines layout (Taj company) · sqlite
//   uthmani.db/uthmani.db                             Quran script · Uthmani (word by word) · sqlite
//   indopak-nastaleeq.db/indopak-nastaleeq.db         Quran script · Indopak Nastaleeq script - Word by Word · sqlite
//   english-wbw-translation.json/…json                Translation · English Word by Word Translation · json
//   english-wbw-transliteration.json/…json            Transliteration · English wbw transliteration · json
// Run after scripts/build-quran-data.mjs; writes public/quran-data/v1/layout/<name>/<page>.json and words/<sūrah>.json.
//
// The Madinah pages show Tanzil's text (hafs/), not QUL's: each QUL word is matched to the Tanzil word(s) with the
// same letters, so a page holds exactly the stored text, cut where the printed page cuts it. The IndoPak pages show
// QUL's IndoPak words (from the King Fahd Complex's Nastaleeq text), which that layout was made from.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public', 'quran-data', 'v1')
const src = process.argv[2]
if (!src) throw new Error('Usage: node scripts/build-quran-layout.mjs <folder with the QUL downloads>')
const file = (name) => path.join(src, name, name)
const db = (name) => new DatabaseSync(file(name), { readOnly: true })

const QUL_NOTICE = 'Layout and word data from the Quranic Universal Library (https://qul.tarteel.ai), by Tarteel.'
const TANZIL_NOTICE = JSON.parse(await readFile(path.join(out, 'hafs', '1.json'), 'utf8')).notice
const isNumber = (t) => /^[٠-٩۰-۹]+$/.test(t)
// Letters only (marks, tatweel and spaces dropped; the alef forms made one), to match a QUL word to Tanzil's.
const letters = (t) => t.normalize('NFKD').replace(/[^ء-غف-يٱ]/g, '')
  .replace(/[ٱآأإ]/g, 'ا').replace(/ى/g, 'ي')

// QUL words: id → { s, a, w, text }; per āyah the ids of its words (an āyah number is a word of its own, the end mark).
function words(name) {
  const byId = new Map(), byAyah = new Map()
  for (const r of db(name).prepare('SELECT id, surah, ayah, word, text FROM words ORDER BY id').all()) {
    const w = { id: r.id, s: r.surah, a: r.ayah, w: r.word, text: r.text, end: isNumber(r.text) }
    byId.set(r.id, w)
    const k = `${r.surah}:${r.ayah}`
    if (!byAyah.has(k)) byAyah.set(k, [])
    byAyah.get(k).push(w)
  }
  return { byId, byAyah }
}

// Tanzil's words for each QUL word of an āyah: QUL word id → the Tanzil text that stands for it. A Tanzil pause
// mark (a word of its own there) joins the word before it; where the two split a word differently (37:130 إِلْ
// يَاسِينَ is one word in QUL), Tanzil words are taken until the letters match.
const loose = []
function matchTanzil(quls, tanzil, key) {
  const tokens = tanzil.split(' ')
  const out = new Map()
  let i = 0
  for (const q of quls) {
    if (q.end) continue
    const want = letters(q.text)
    const from = i
    let got = '', taken = []
    while (i < tokens.length && (letters(got) !== want || !taken.length)) {
      taken.push(tokens[i]); got += tokens[i]; i++
      if (letters(got).length > want.length) break
    }
    // Spelled differently (11:13 ٱفْتَرَىٰهُ, افْتَرَاهُ in QUL): the one Tanzil word in its place, listed for checking.
    if (letters(got) !== want) { i = from; taken = [tokens[i++]]; loose.push(`${key} ${q.text} = ${taken[0]}`) }
    // pause marks and other mark-only words after it belong to it
    while (i < tokens.length && !letters(tokens[i])) taken.push(tokens[i++])
    out.set(q.id, taken.join(' '))
  }
  return i === tokens.length ? out : (console.warn(`${key}: Tanzil has words left over`), null)
}

function layout(name, wordsOf, textOf, pages) {
  const rows = db(name).prepare('SELECT page_number p, line_number n, line_type type, is_centered c, first_word_id f, last_word_id l, surah_number s FROM pages ORDER BY page_number, line_number').all()
  const byPage = new Map()
  for (const r of rows) {
    if (!byPage.has(r.p)) byPage.set(r.p, [])
    const line = { n: r.n, type: r.type === 'surah_name' ? 'surah' : r.type === 'basmallah' ? 'basmalah' : 'ayah', c: r.c ? 1 : 0 }
    if (line.type === 'surah') line.s = r.s
    if (line.type === 'ayah') {
      line.words = []
      for (let id = Number(r.f); id <= Number(r.l); id++) {
        const w = wordsOf.get(id)
        if (!w) throw new Error(`${name}: page ${r.p} line ${r.n} has no word ${id}`)
        line.words.push(w.end ? { s: w.s, a: w.a, end: 1 } : { t: textOf(w), s: w.s, a: w.a })
      }
    }
    byPage.get(r.p).push(line)
  }
  if (byPage.size !== pages) throw new Error(`${name}: ${byPage.size} pages, expected ${pages}`)
  return byPage
}

async function writePages(dir, byPage, notice) {
  await rm(path.join(out, 'layout', dir), { recursive: true, force: true })
  await mkdir(path.join(out, 'layout', dir), { recursive: true })
  const starts = []
  for (const [p, lines] of byPage) {
    const first = lines.flatMap((l) => l.words || [])[0]
    starts.push([first.s, first.a])
    await writeFile(path.join(out, 'layout', dir, `${p}.json`), JSON.stringify({ notice, lines }))
  }
  return starts
}

const report = []
const tanzil = new Map()
for (let s = 1; s <= 114; s++) {
  const ayat = JSON.parse(await readFile(path.join(out, 'hafs', `${s}.json`), 'utf8')).ayat
  ayat.forEach((t, i) => tanzil.set(`${s}:${i + 1}`, t))
}

// Madinah (KFGQPC V2, 1421H), drawn with Tanzil's words.
const uth = words('uthmani.db')
const tanzilOf = new Map()
const unmatched = []
for (const [k, quls] of uth.byAyah) {
  const m = matchTanzil(quls, tanzil.get(k), k)
  if (!m) { unmatched.push(k); continue }
  for (const [id, t] of m) tanzilOf.set(id, t)
}
if (unmatched.length) throw new Error(`Tanzil words could not be matched to QUL's in ${unmatched.length} āyāt: ${unmatched.slice(0, 10).join(', ')}`)
report.push(`Matched every QUL word to Tanzil's text (${tanzilOf.size} words, ${uth.byAyah.size} āyāt); matched by place, spelled differently: ${loose.length ? `\n  ${loose.join('\n  ')}` : 'none'}`)
const madinah = layout('qpc-v2-15-lines.db', uth.byId, (w) => tanzilOf.get(w.id), 604)
const madinahStarts = await writePages('madinah15', madinah, `${TANZIL_NOTICE} ${QUL_NOTICE}`)
report.push('Madinah 15-line (KFGQPC V2, 1421H): 604 pages')

// IndoPak 16-line (Taj company), drawn with QUL's IndoPak words.
let indopakStarts = null
try {
  const indo = words('indopak-nastaleeq.db')
  const indopak = layout('taj-indopak-16-lines.db', indo.byId, (w) => w.text, 548)
  indopakStarts = await writePages('indopak16', indopak, `Text of the King Fahd Glorious Qurʾān Printing Complex (Nastaleeq). ${QUL_NOTICE}`)
  report.push('IndoPak 16-line (Taj company): 548 pages')
} catch (err) {
  if (err.code !== 'ENOENT' && !/unable to open/i.test(err.message)) throw err
  report.push('IndoPak 16-line: skipped (indopak-nastaleeq.db not downloaded yet)')
}

// Word by word, per sūrah: for each āyah its words as [Tanzil text, meaning, transliteration].
const meaning = JSON.parse(await readFile(file('english-wbw-translation.json'), 'utf8'))
const translit = JSON.parse(await readFile(file('english-wbw-transliteration.json'), 'utf8'))
await rm(path.join(out, 'words'), { recursive: true, force: true })
await mkdir(path.join(out, 'words'), { recursive: true })
let missing = 0
for (let s = 1; s <= 114; s++) {
  const ayat = []
  for (let a = 1; uth.byAyah.has(`${s}:${a}`); a++) {
    ayat.push(uth.byAyah.get(`${s}:${a}`).filter((w) => !w.end).map((w) => {
      const key = `${s}:${a}:${w.w}`
      if (!meaning[key]) missing++
      return [tanzilOf.get(w.id), meaning[key] || '', translit[key] || '']
    }))
  }
  await writeFile(path.join(out, 'words', `${s}.json`), JSON.stringify({ notice: `${TANZIL_NOTICE} Word meanings and transliteration: ${QUL_NOTICE}`, ayat }))
}
report.push(`Word by word: 114 sūrahs (${missing} words without a meaning)`)

// Page starts for each layout, so a sūrah or āyah can be opened at its page.
const indexFile = path.join(out, 'index.json')
const index = JSON.parse(await readFile(indexFile, 'utf8'))
index.layouts = { madinah15: madinahStarts, ...(indopakStarts ? { indopak16: indopakStarts } : {}) }
const same = madinahStarts.every(([s, a], i) => index.pages[i][0] === s && index.pages[i][1] === a)
report.push(`Madinah page starts ${same ? 'match' : 'DIFFER FROM'} Tanzil's page numbers`)
await writeFile(indexFile, JSON.stringify(index))
console.log(report.join('\n'))
