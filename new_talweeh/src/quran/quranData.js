// Browser-only Qurʾān data for the Wāḥa Qurʾān pages (read / study / listen). No Talweeh server involved.
// The texts are files on this site, /quran-data/v1, written by scripts/build-quran-data.mjs (sources and terms there):
//   Tanzil              Uthmani text (Ḥafṣ), juzʾ starts, the translations, the plain text for search
//   fawazahmed0         Warsh, Qālūn, Shuʿbah, al-Sūsī and IndoPak (King Fahd Qurʾān Complex)
//   QUL (Tarteel)       the printed pages line by line (Madinah 1421H), word-by-word meaning + transliteration
//                       (scripts/build-quran-layout.mjs; the words shown are Tanzil's)
// Still fetched from outside:
//   www.mp3quran.net    reciters, surah audio, per-āyah timings
// Every call is cached for the session; a failed call rejects so the page can show it.
import { QURAN_SURAHS } from '../data/quranIndex'

const DATA = '/quran-data/v1'
// mp3quran.net 301-redirects its API to www.
const MP3QURAN = 'https://www.mp3quran.net/api/v3'

const cache = new Map()
function once(key, load) {
  if (!cache.has(key)) cache.set(key, load().catch((err) => { cache.delete(key); throw err }))
  return cache.get(key)
}

async function getJson(url, timeout = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json) throw new Error(`Request failed (${res.status})`)
    return json
  } finally {
    clearTimeout(timer)
  }
}

export const surahInfo = (n) => {
  const s = QURAN_SURAHS[n - 1]
  return s && { n: s[0], ar: s[1], en: s[2], meaning: s[3], ayahs: s[4], type: s[5] }
}
export const pad3 = (n) => String(n).padStart(3, '0')
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
export const arNum = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d])
export const stripHtml = (t) => String(t || '').replace(/<[^>]*>/g, '').trim()

// The stored texts have the basmalah in front of āyah 1 taken off already (readers show it as a heading).
const surahFile = (dir, surah) => once(`${dir}:${surah}`, async () => (await getJson(`${DATA}/${dir}/${surah}.json`))?.ayat || [])
// Page and juzʾ starts of the Madinah muṣḥaf: { pages: [[s, a]…604], juz: [[s, a]…30] }. Page numbers follow the
// 1421H print the Read Mode pages are drawn from (layouts.madinah15); Tanzil's own differ on 25 pages.
const getIndex = () => once('index', async () => {
  const index = await getJson(`${DATA}/index.json`)
  return { ...index, pages: index.layouts?.madinah15 || index.pages }
})
// The number of the last start at or before sūrah:āyah (its first word). A start is [s, a] or, for a page that
// begins inside an āyah, [s, a, word].
const before = ([s0, a0, w0 = 1], s, a) => s0 < s || (s0 === s && (a0 < a || (a0 === a && w0 <= 1)))
const at = (starts, s, a) => { let n = 1; for (let i = 0; i < starts.length && before(starts[i], s, a); i++) n = i + 1; return n }

/* ── text sources ─────────────────────────────────────────── */
// Read Mode riwāyāt (READ_MUSHAFS in quran.jsx); `edition` is the text's folder in /quran-data/v1 (Ḥafṣ: hafs).
export const RIWAYAT = [
  { id: 'hafs', label: 'Ḥafṣ', detail: 'ʿan ʿĀṣim', edition: null },
  { id: 'warsh', label: 'Warsh', detail: 'ʿan Nāfiʿ', edition: 'warsh' },
  { id: 'qalun', label: 'Qālūn', detail: 'ʿan Nāfiʿ', edition: 'qalun' },
  { id: 'shubah', label: 'Shuʿbah', detail: 'ʿan ʿĀṣim', edition: 'shubah' },
  { id: 'susi', label: 'al-Sūsī', detail: 'ʿan Abī ʿAmr', edition: 'susi' },
]
// Read Mode styles (READ_TEXT_STYLES in quran.jsx), each a printed muṣḥaf (LAYOUTS) in Ḥafṣ; `lines` drives the
// pages cut here for the other riwāyāt.
export const STYLES = [
  { id: 'madinah15', label: 'Madinah', detail: '15-line', script: 'uthmani', lines: 15 },
  { id: 'indopak13', label: 'IndoPak', detail: '13-line · Taj', script: 'indopak', lines: 13 },
  { id: 'indopak13q', label: 'IndoPak', detail: '13-line · Qudratullah', script: 'indopak', lines: 13 },
  { id: 'indopak15', label: 'IndoPak', detail: '15-line · Qudratullah', script: 'indopak', lines: 15 },
  { id: 'indopak16', label: 'IndoPak', detail: '16-line · Taj', script: 'indopak', lines: 16 },
]

// [{ a, text, page, juz }] for the Uthmani (Ḥafṣ) text, with Madinah page + juz numbers.
export function getUthmani(surah) {
  return once(`uth:${surah}`, async () => {
    const [ayat, index] = await Promise.all([surahFile('hafs', surah), getIndex()])
    return ayat.map((text, i) => ({ a: i + 1, text, page: at(index.pages, surah, i + 1), juz: at(index.juz, surah, i + 1) }))
  })
}

// Text for a style + riwāyah: [{ a, text }]
export async function getSurahText(surah, { script = 'uthmani', riwayah = 'hafs' } = {}) {
  const r = RIWAYAT.find((x) => x.id === riwayah) || RIWAYAT[0]
  const dir = r.edition || (script === 'indopak' ? 'indopak' : null)
  if (dir) return (await surahFile(dir, surah)).map((text, i) => ({ a: i + 1, text }))
  return getUthmani(surah)
}

// Printed muṣḥafs Read Mode draws page by page (scripts/build-quran-layout.mjs): Madinah 15-line (1421H print) and
// IndoPak 16-line (Taj company), 15-line (Qudratullah) and 13-line (Taj company, Qudratullah). `script`: the text its
// pages hold; page numbers here count from the first page of text, shown as printed (printedPage).
export const LAYOUTS = {
  madinah15: { pages: 604, lines: 15, script: 'uthmani' },
  // The printed Taj 16-line numbers al-Fātiḥah's page 2 (page 1 is its title page): `numberFrom` is the printed number
  // of the first page, checked against the print (6:135–141 on its page 132). Madinah checked too (al-Mulk on 562).
  indopak16: { pages: 548, lines: 16, script: 'indopak', numberFrom: 2 },
  indopak15: { pages: 610, lines: 15, script: 'indopak' },
  // Taj 13-line, like its 16-line, numbers al-Fātiḥah's page 2 (checked: its page 5 holds 2:13–20 line for line).
  indopak13: { pages: 847, lines: 13, script: 'indopak', numberFrom: 2 },
  indopak13q: { pages: 849, lines: 13, script: 'indopak' },
}
export const MUSHAF_PAGES = LAYOUTS.madinah15.pages
export const printedPage = (layout, page) => page + (LAYOUTS[layout]?.numberFrom || 1) - 1
const layoutStarts = async (layout) => { const index = await getIndex(); return index.layouts?.[layout] || index.pages }

// One printed page: [{ s, a, text, juz }]
export function getMushafPage(page, layout = 'madinah15') {
  return once(`page:${layout}:${page}`, async () => {
    const [pages, { juz }] = await Promise.all([layoutStarts(layout), getIndex()])
    // An āyah the next page begins inside (a start with a word) is partly on this page too.
    const [s0, a0] = pages[page - 1], [s1, a1, w1] = pages[page] || [115, 1]
    const rows = []
    for (let s = s0; s <= Math.min(s1, 114); s++) {
      for (const r of await getSurahText(s, { script: LAYOUTS[layout].script })) {
        if ((s === s0 && r.a < a0) || (s === s1 && (r.a > a1 || (r.a === a1 && !w1)))) continue
        rows.push({ s, a: r.a, text: r.text, juz: at(juz, s, r.a) })
      }
    }
    return rows
  })
}

// One printed page line by line: its 15 (Madinah) or 16 (IndoPak) lines, word by word.
// Lines with no words are the surah title and basmalah slots; the reader fills them in.
// Returns [{ n, type, centred, words: [{ t, s, a, end }] }] (Madinah pages 1–2 have fewer lines; `centred`: a short
// line the print centres instead of stretching). An āyah's end is its number (Madinah) or its circle glyph (IndoPak).
export function getMushafLines(page, layout = 'madinah15') {
  return once(`lines:${layout}:${page}`, async () => ((await getJson(`${DATA}/layout/${layout}/${page}.json`))?.lines || [])
    .map((l) => ({ n: l.n, type: l.type, centred: !!l.c, words: (l.words || []).map((w) => ({ t: w.t, s: w.s, a: w.a, end: !!w.end })) })))
}
// The page of a layout that holds sūrah:āyah.
export async function pageOf(surah, ayah = 1, layout = 'madinah15') {
  return at(await layoutStarts(layout), surah, ayah)
}

// What a printed page's header and margins show (Tanzil's metadata): the juzʾ an āyah is in; for each rukūʿ's last
// āyah ("s:a") its number in its sūrah, its number of āyāt and its number in its juzʾ (the three figures by the ع in
// IndoPak margins); each manzil's and ḥizb quarter's first āyah; the 15 sajdah āyāt.
export function getPrintMarks() {
  return once('marks', async () => {
    const { ruku, manzil, juz, counts, hizbQuarters = [], sajda = [], layouts = {} } = await getIndex()
    const rukuEnd = new Map(), inJuz = new Map()
    let inSurah = 0
    ruku.forEach(([s, a], i) => {
      const [ns, na] = ruku[i + 1] || [115, 1]
      const end = ns === s ? na - 1 : counts[s - 1]
      inSurah = i && ruku[i - 1][0] === s ? inSurah + 1 : 1
      const j = at(juz, s, end)
      inJuz.set(j, (inJuz.get(j) || 0) + 1)
      rukuEnd.set(`${s}:${end}`, { s: inSurah, n: end - a + 1, j: inJuz.get(j) })
    })
    return {
      rukuEnd,
      manzil: new Map(manzil.map(([s, a], i) => [`${s}:${a}`, i + 1])),
      // ḥizb quarter q (0–239) → ḥizb q÷4+1, quarter q%4 (0 = the ḥizb's start)
      hizb: new Map(hizbQuarters.map(([s, a], q) => [`${s}:${a}`, { h: Math.floor(q / 4) + 1, part: q % 4 }])),
      sajda: new Set(sajda.map(([s, a]) => `${s}:${a}`)),
      juzOf: (s, a) => at(juz, s, a),
      // true when a layout's page begins inside an āyah (its start then names a word)
      startsInside: (layout, page) => (layouts[layout]?.[page - 1]?.length || 0) > 2,
    }
  })
}
// Juzʾ names as printed: IndoPak paras by their first words, Madinah by number.
export const PARA_NAMES = ['الم', 'سيقول', 'تلك الرسل', 'لن تنالوا', 'والمحصنت', 'لا يحب الله', 'واذا سمعوا', 'ولو اننا', 'قال الملا', 'واعلموا', 'يعتذرون', 'وما من دابة', 'وما ابرئ', 'ربما', 'سبحن الذي', 'قال الم', 'اقترب', 'قد افلح', 'وقال الذين', 'امن خلق', 'اتل ما اوحي', 'ومن يقنت', 'وما لي', 'فمن اظلم', 'اليه يرد', 'حم', 'قال فما خطبكم', 'قد سمع الله', 'تبرك الذي', 'عم']
const ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر']
export const juzName = (n) => `الجزء ${n <= 10 ? ORDINALS[n - 1] : n < 20 ? `${n === 11 ? 'الحادي' : ORDINALS[n - 11]} عشر` : n === 20 ? 'العشرون' : n === 30 ? 'الثلاثون' : `${n === 21 ? 'الحادي' : ORDINALS[n - 21]} والعشرون`}`

import { TRANSLATIONS } from './translations'
export { TRANSLATIONS }

// English translation (Saheeh International by default): array indexed by āyah - 1.
// An edition no longer offered (a choice remembered from before) falls back to Saheeh International.
export function getTranslation(surah, edition = 'en.sahih') {
  const id = TRANSLATIONS.some((t) => t.edition === edition) ? edition : 'en.sahih'
  return surahFile(`tr/${id}`, surah)
}

// Word by word: Map(āyah → [{ ar, en, tl }]); the Arabic is the stored Tanzil text, cut into QUL's words.
export function getWords(surah) {
  return once(`words:${surah}`, async () => {
    const ayat = (await getJson(`${DATA}/words/${surah}.json`))?.ayat || []
    return new Map(ayat.map((ws, i) => [i + 1, ws.map(([ar, en, tl]) => ({ ar, en, tl }))]))
  })
}

// Full-text search (English in Saheeh International, Arabic in Tanzil's plain text without vowel marks), on this
// site's copy: the whole text is loaded on the first search. Resolves { matches: [{ s, a, text }], total }.
const plainArabic = (t) => t.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim()
const searchRows = (lang) => once(`search:${lang}`, async () => {
  const res = await fetch(`${DATA}/search/${lang}.txt`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (await res.text()).split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
    const [s, a, ...rest] = l.split('|')
    const text = rest.join('|')
    return { s: Number(s), a: Number(a), text, key: lang === 'ar' ? plainArabic(text) : text.toLowerCase() }
  })
})
export async function searchText(q) {
  const arabic = /[\u0600-\u06FF]/.test(q)
  const needle = arabic ? plainArabic(q) : q.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!needle) return { matches: [], total: 0 }
  const hits = (await searchRows(arabic ? 'ar' : 'en')).filter((r) => r.key.includes(needle))
  return { matches: hits.slice(0, 10).map(({ s, a, text }) => ({ s, a, text })), total: hits.length }
}

/* ── recitation ───────────────────────────────────────────── */
// Reciters that have per-āyah timing (so the text can follow the voice).
// [{ id, nameAr, nameEn, moshaf, rewaya, style, folderUrl, surahCount }]
export function getReciters() {
  return once('reciters', async () => {
    const [reads, eng] = await Promise.all([
      getJson(`${MP3QURAN}/ayat_timing/reads`),
      getJson(`${MP3QURAN}/reciters?language=eng`).catch(() => ({ reciters: [] })),
    ])
    const english = new Map()
    for (const r of eng?.reciters || []) for (const m of r.moshaf || []) english.set(Number(m.id), { name: r.name, moshaf: m.name })
    const rows = Array.isArray(reads) ? reads : (reads?.reads || [])
    return rows.map((r) => {
      const en = english.get(Number(r.id))
      const moshaf = en?.moshaf || ''
      const style = /mujawwad/i.test(moshaf) ? 'Mujawwad' : /mo['’]?lim|muallim|teach/i.test(moshaf) ? 'Muallim' : 'Murattal'
      return {
        id: Number(r.id), nameAr: String(r.name || '').trim(), nameEn: en?.name || '', moshaf, style,
        rewaya: String(r.rewaya || '').trim(), folderUrl: String(r.folder_url || '').replace(/^http:/, 'https:'), surahCount: Number(r.soar_count) || 0,
      }
    }).filter((r) => r.id > 0 && r.folderUrl).sort((a, b) => (a.nameEn || a.nameAr).localeCompare(b.nameEn || b.nameAr, 'en'))
  })
}
export const audioUrl = (reciter, surah) => `${reciter.folderUrl.endsWith('/') ? reciter.folderUrl : reciter.folderUrl + '/'}${pad3(surah)}.mp3`
// [{ ayah, from, to }] in seconds; āyah 0 (the basmalah / opening) is dropped.
export function getTimings(readId, surah) {
  return once(`timing:${readId}:${surah}`, async () => {
    const rows = await getJson(`${MP3QURAN}/ayat_timing?surah=${surah}&read=${readId}`)
    return (Array.isArray(rows) ? rows : [])
      .map((r) => ({ ayah: Number(r.ayah), from: Number(r.start_time) / 1000, to: Number(r.end_time) / 1000 }))
      .filter((r) => r.ayah >= 1 && r.to > r.from)
      .sort((a, b) => a.ayah - b.ayah)
  })
}
