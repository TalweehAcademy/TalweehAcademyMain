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
const at = (starts, s, a) => { let n = 1; for (let i = 0; i < starts.length && (starts[i][0] < s || (starts[i][0] === s && starts[i][1] <= a)); i++) n = i + 1; return n }

/* ── text sources ─────────────────────────────────────────── */
// Read Mode riwāyāt (READ_MUSHAFS in quran.jsx); `edition` is the text's folder in /quran-data/v1 (Ḥafṣ: hafs).
export const RIWAYAT = [
  { id: 'hafs', label: 'Ḥafṣ', detail: 'ʿan ʿĀṣim', edition: null },
  { id: 'warsh', label: 'Warsh', detail: 'ʿan Nāfiʿ', edition: 'warsh' },
  { id: 'qalun', label: 'Qālūn', detail: 'ʿan Nāfiʿ', edition: 'qalun' },
  { id: 'shubah', label: 'Shuʿbah', detail: 'ʿan ʿĀṣim', edition: 'shubah' },
  { id: 'susi', label: 'al-Sūsī', detail: 'ʿan Abī ʿAmr', edition: 'susi' },
]
// Read Mode styles (READ_TEXT_STYLES in quran.jsx); `lines` drives client-side pagination for non-Madinah text.
export const STYLES = [
  { id: 'madinah15', label: 'Madinah', detail: '15-line', script: 'uthmani', lines: 15 },
  { id: 'indopak13', label: 'IndoPak', detail: '13-line', script: 'indopak', lines: 13 },
  { id: 'indopak15', label: 'IndoPak', detail: '15-line', script: 'indopak', lines: 15 },
  { id: 'indopak16', label: 'IndoPak', detail: '16-line', script: 'indopak', lines: 16 },
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

// One Madinah muṣḥaf page (1–604): [{ s, a, text, juz }]
export function getMushafPage(page) {
  return once(`page:${page}`, async () => {
    const { pages } = await getIndex()
    const [s0, a0] = pages[page - 1], [s1, a1] = pages[page] || [115, 1]
    const rows = []
    for (let s = s0; s <= Math.min(s1, 114); s++) {
      for (const r of await getUthmani(s)) {
        if ((s === s0 && r.a < a0) || (s === s1 && r.a >= a1)) continue
        rows.push({ s, a: r.a, text: r.text, juz: r.juz })
      }
    }
    return rows
  })
}
export const MUSHAF_PAGES = 604

// The printed Madinah muṣḥaf's own layout for one page (1421H print): its 15 lines, word by word.
// Lines with no words are the surah title and basmalah slots; the reader fills them in.
// Returns [{ n, type, centred, words: [{ t, s, a, end }] }] (pages 1–2 have fewer lines; `centred`: a short line the
// print centres instead of stretching, such as a sūrah's last).
export function getMushafLines(page, layout = 'madinah15') {
  return once(`lines:${layout}:${page}`, async () => ((await getJson(`${DATA}/layout/${layout}/${page}.json`))?.lines || [])
    .map((l) => ({ n: l.n, type: l.type, centred: !!l.c, words: (l.words || []).map((w) => ({ t: w.t, s: w.s, a: w.a, end: !!w.end })) })))
}
export async function pageOf(surah, ayah = 1) {
  const rows = await getUthmani(surah)
  return rows[Math.max(0, Math.min(rows.length - 1, ayah - 1))]?.page || 1
}

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
