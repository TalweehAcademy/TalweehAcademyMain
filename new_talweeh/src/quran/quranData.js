// Browser-only Qurʾān data for the Wāḥa Qurʾān pages (read / study / listen).
// Same public providers as src/pages/quran.jsx — no Talweeh server involved:
//   api.alquran.cloud   Uthmani text, Madinah page layout, translations, search
//   cdn.jsdelivr.net    fawazahmed0 mirror: IndoPak script and the other riwāyāt
//   api.islamic.app     word-by-word meaning + transliteration
//   www.mp3quran.net    reciters, surah audio, per-āyah timings
// Every call is cached for the session; a failed call rejects so the page can show it.
import { QURAN_SURAHS } from '../data/quranIndex'

const ALQURAN = 'https://api.alquran.cloud/v1'
const FAWAZ = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1'
const WORDS = 'https://api.islamic.app/v1/words'
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

// The API prefixes āyah 1 of every surah except 1 and 9 with the basmalah; readers show it as a heading.
const BASMALAH_WORDS = 4
function dropBasmalah(surah, ayah, text) {
  if (surah === 1 || surah === 9 || ayah !== 1) return text
  const words = text.replace(/\uFEFF/g, '').split(' ')
  return /^بِسْمِ/.test(words[0]) ? words.slice(BASMALAH_WORDS).join(' ') : text
}

/* ── text sources ─────────────────────────────────────────── */
// Read Mode riwāyāt (READ_MUSHAFS in quran.jsx). Ḥafṣ uses alquran.cloud's Uthmani text.
export const RIWAYAT = [
  { id: 'hafs', label: 'Ḥafṣ', detail: 'ʿan ʿĀṣim', edition: null },
  { id: 'warsh', label: 'Warsh', detail: 'ʿan Nāfiʿ', edition: 'ara-quranwarsh' },
  { id: 'qalun', label: 'Qālūn', detail: 'ʿan Nāfiʿ', edition: 'ara-quranqaloon' },
  { id: 'shubah', label: 'Shuʿbah', detail: 'ʿan ʿĀṣim', edition: 'ara-quranshouba' },
  { id: 'susi', label: 'al-Sūsī', detail: 'ʿan Abī ʿAmr', edition: 'ara-quransoosi' },
]
// Read Mode styles (READ_TEXT_STYLES in quran.jsx); `lines` drives client-side pagination for non-Madinah text.
export const STYLES = [
  { id: 'madinah15', label: 'Madinah', detail: '15-line', script: 'uthmani', lines: 15 },
  { id: 'indopak13', label: 'IndoPak', detail: '13-line', script: 'indopak', lines: 13 },
  { id: 'indopak15', label: 'IndoPak', detail: '15-line', script: 'indopak', lines: 15 },
  { id: 'indopak16', label: 'IndoPak', detail: '16-line', script: 'indopak', lines: 16 },
]

async function fawazChapter(edition, surah) {
  for (const url of [`${FAWAZ}/editions/${edition}/${surah}.min.json`, `${FAWAZ}/editions/${edition}/${surah}.json`]) {
    try {
      const json = await getJson(url)
      const rows = Array.isArray(json?.chapter) ? json.chapter : []
      if (rows.length) return rows.map((r) => String(r?.text || ''))
    } catch { /* try the next mirror */ }
  }
  throw new Error('This text is unavailable right now')
}

// [{ a, text, page, juz }] for the Uthmani (Ḥafṣ) text, with Madinah page + juz numbers.
export function getUthmani(surah) {
  return once(`uth:${surah}`, async () => {
    try {
      const json = await getJson(`${ALQURAN}/surah/${surah}/quran-uthmani`)
      const rows = json?.data?.ayahs || []
      if (rows.length) return rows.map((r) => ({ a: r.numberInSurah, text: dropBasmalah(surah, r.numberInSurah, r.text), page: r.page, juz: r.juz }))
    } catch { /* fall back to the mirror */ }
    const rows = await fawazChapter('ara-quranuthmanihaf', surah)
    return rows.map((text, i) => ({ a: i + 1, text: dropBasmalah(surah, i + 1, text), page: null, juz: null }))
  })
}

// Text for a style + riwāyah: [{ a, text }]
export async function getSurahText(surah, { script = 'uthmani', riwayah = 'hafs' } = {}) {
  const r = RIWAYAT.find((x) => x.id === riwayah) || RIWAYAT[0]
  if (r.edition) return once(`riw:${r.id}:${surah}`, async () => (await fawazChapter(r.edition, surah)).map((text, i) => ({ a: i + 1, text: dropBasmalah(surah, i + 1, text) })))
  if (script === 'indopak') return once(`indo:${surah}`, async () => (await fawazChapter('ara-quranindopak', surah)).map((text, i) => ({ a: i + 1, text: dropBasmalah(surah, i + 1, text) })))
  return getUthmani(surah)
}

// One Madinah muṣḥaf page (1–604): [{ s, a, text, juz }]
export function getMushafPage(page) {
  return once(`page:${page}`, async () => {
    const json = await getJson(`${ALQURAN}/page/${page}/quran-uthmani`)
    return (json?.data?.ayahs || []).map((r) => ({ s: r.surah.number, a: r.numberInSurah, text: dropBasmalah(r.surah.number, r.numberInSurah, r.text), juz: r.juz }))
  })
}
export const MUSHAF_PAGES = 604

// The printed Madinah muṣḥaf's own layout for one page: its 15 lines, word by word, from quran.com.
// Lines with no words are the surah title and basmalah slots; the reader fills them in.
// Returns [{ n, words: [{ t, s, a, end }] }] for line numbers 1–15 (pages 1–2 have fewer lines).
const QURAN_COM = 'https://api.quran.com/api/v4'
export function getMushafLines(page) {
  return once(`lines:${page}`, async () => {
    const json = await getJson(`${QURAN_COM}/verses/by_page/${page}?words=true&word_fields=text_uthmani,line_number&per_page=60&fields=chapter_id`)
    const byLine = new Map()
    for (const v of json?.verses || []) {
      const [s, a] = String(v.verse_key).split(':').map(Number)
      for (const w of v.words || []) {
        if (!byLine.has(w.line_number)) byLine.set(w.line_number, [])
        byLine.get(w.line_number).push({ t: w.text_uthmani, s, a, end: w.char_type_name === 'end' })
      }
    }
    const nums = [...byLine.keys()]
    if (!nums.length) return []
    const last = Math.max(15, ...nums)
    const out = []
    for (let n = 1; n <= last; n++) out.push({ n, words: byLine.get(n) || [] })
    // Trim empty slots after the last written line (short final pages).
    while (out.length && !out[out.length - 1].words.length) out.pop()
    return out
  })
}
export async function pageOf(surah, ayah = 1) {
  const rows = await getUthmani(surah)
  return rows[Math.max(0, Math.min(rows.length - 1, ayah - 1))]?.page || 1
}

// English translations offered by the reader (DIRECT_TRANSLATIONS in quran.jsx), all on api.alquran.cloud.
export const TRANSLATIONS = [
  ['en.sahih', 'Saheeh International'], ['en.pickthall', 'Marmaduke Pickthall'], ['en.yusufali', 'Abdullah Yusuf Ali'],
  ['en.asad', 'Muhammad Asad'], ['en.ahmedali', 'Ahmed Ali'], ['en.ahmedraza', 'Ahmed Raza Khan'], ['en.arberry', 'A. J. Arberry'],
  ['en.daryabadi', 'Abdul Majid Daryabadi'], ['en.hilali', 'Hilali & Khan'], ['en.qaribullah', 'Qaribullah & Darwish'],
  ['en.sarwar', 'Muhammad Sarwar'], ['en.maududi', 'Abul Ala Maududi'], ['en.shakir', 'Mohammad Habib Shakir'],
  ['en.itani', 'Talal Itani'], ['en.mubarakpuri', 'Mubarakpuri'], ['en.qarai', 'Ali Quli Qarai'], ['en.wahiduddin', 'Wahiduddin Khan'],
].map(([edition, name]) => ({ edition, name }))

// English translation (Saheeh International by default): array indexed by āyah - 1.
export function getTranslation(surah, edition = 'en.sahih') {
  return once(`tr:${edition}:${surah}`, async () => {
    const json = await getJson(`${ALQURAN}/surah/${surah}/${edition}`)
    return (json?.data?.ayahs || []).map((r) => stripHtml(r.text))
  })
}

// Word by word: Map(āyah → [{ ar, en, tl }])
export function getWords(surah) {
  return once(`words:${surah}`, async () => {
    const page = async (p) => (await getJson(`${WORDS}/${surah}?page=${p}&per_page=50`, 12000))?.data || {}
    const first = await page(1)
    const total = Math.max(1, Number(first?.pagination?.total_pages) || 1)
    const pages = [first, ...(await Promise.all(Array.from({ length: total - 1 }, (_, i) => page(i + 2))))]
    const byAyah = new Map()
    for (const p of pages) {
      for (const ayah of p?.ayahs || []) {
        const words = (ayah.words || []).filter((w) => !w.char_type || w.char_type === 'word').map((w) => ({ ar: w.text_uthmani, en: w.translation, tl: w.transliteration }))
        if (words.length) byAyah.set(Number(ayah.ayah_number), words)
      }
    }
    return byAyah
  })
}

// Full-text search (English via Saheeh International, Arabic via the plain Arabic text).
// Resolves { matches: [{ s, a, text }], total }; "no results" is a 404 from the API, returned as empty.
export async function searchText(q) {
  const edition = /[\u0600-\u06FF]/.test(q) ? 'quran-simple-clean' : 'en.sahih'
  const res = await fetch(`${ALQURAN}/search/${encodeURIComponent(q)}/all/${edition}`)
  if (res.status === 404) return { matches: [], total: 0 }
  const json = await res.json()
  const rows = Array.isArray(json?.data?.matches) ? json.data.matches : []
  return { matches: rows.slice(0, 10).map((m) => ({ s: m.surah?.number, a: m.numberInSurah, text: m.text })), total: json?.data?.count || rows.length }
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
