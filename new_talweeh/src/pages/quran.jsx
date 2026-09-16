/* eslint-disable react/prop-types */
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageHeader, PageFooter } from './_shared'
import { QURAN_SURAH_INTRODUCTIONS } from '../data/quranSurahIntroductions'
import { makePortalAyahStudy, PortalSourceActions, PortalSourceDialog, PortalStudyDialog, surahStudyDetail, usePortalStudy } from '../components/QuranPortalStudyBridge'
import '../quran-study-portal-layer.css'
import '../quran-study-v75.css'

// Reader settings remain numeric for backwards compatibility; Quran content is fetched directly in the browser.
const SETTINGS_KEY = 'qmr-settings-v2'
const DEFAULT_TRANSLATION_ID = 84 // Saheeh International in the frontend-only catalogue
const DEFAULT_RECITATION_ID = 0 // resolved from the live MP3Quran timing catalogue
const AUDIO_PROVIDER_KEY = 'mp3quran-v3-direct'
const BOOKMARKS_KEY = 'qmr-bookmarks-v1'

function ReaderPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

async function fetchJson(url, fallbackMessage, options) {
  const response = await fetch(url, options)
  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Preserve the fallback message when an upstream/proxy returns non-JSON.
  }
  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage)
  }
  return payload
}


// ── Frontend-only Quran data layer ──────────────────────────────────────────
// This reader intentionally has NO dependency on Talweeh's application server,
// database, MySQL/Supabase, API routes, or server/quran.js. The browser talks
// directly to public Quran providers. A provider failure is isolated so Arabic
// text is never made dependent on a translation or audio request.
const ALQURAN_BASE = 'https://api.alquran.cloud/v1'
const FAWAZ_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1'
const MP3QURAN_BASE = 'https://mp3quran.net/api/v3'
const ISLAMIC_APP_WORDS_BASE = 'https://api.islamic.app/v1/words'
const qmrWordDataCache = new Map()

const DIRECT_TRANSLATIONS = [
  { id: 84, edition: 'en.sahih', fawazEdition: 'eng-ummmuhammad', name: 'Saheeh International' },
  { id: 1001, edition: 'en.pickthall', fawazEdition: 'eng-mohammedmarmadu', name: 'Marmaduke Pickthall' },
  { id: 1002, edition: 'en.yusufali', fawazEdition: 'eng-yusufaliorig', name: 'Abdullah Yusuf Ali' },
  { id: 1003, edition: 'en.asad', fawazEdition: 'eng-muhammadasad', name: 'Muhammad Asad' },
  { id: 1004, edition: 'en.ahmedali', name: 'Ahmed Ali' },
  { id: 1005, edition: 'en.ahmedraza', name: 'Ahmed Raza Khan' },
  { id: 1006, edition: 'en.arberry', fawazEdition: 'eng-ajarberry', name: 'A. J. Arberry' },
  { id: 1007, edition: 'en.daryabadi', name: 'Abdul Majid Daryabadi' },
  { id: 1008, edition: 'en.hilali', fawazEdition: 'eng-muhammadtaqiudd', name: 'Hilali & Khan' },
  { id: 1009, edition: 'en.qaribullah', name: 'Qaribullah & Darwish' },
  { id: 1010, edition: 'en.sarwar', fawazEdition: 'eng-muhammadsarwar', name: 'Muhammad Sarwar' },
  { id: 1011, edition: 'en.maududi', fawazEdition: 'eng-maududi', name: 'Abul Ala Maududi' },
  { id: 1012, edition: 'en.shakir', fawazEdition: 'eng-mohammadhabibsh', name: 'Mohammad Habib Shakir' },
  { id: 1013, edition: 'en.itani', fawazEdition: 'eng-talalitani', name: 'Talal Itani' },
  { id: 1014, edition: 'en.mubarakpuri', fawazEdition: 'eng-safiurrahmanalm', name: 'Mubarakpuri' },
  { id: 1015, edition: 'en.qarai', fawazEdition: 'eng-aliquliqarai', name: 'Ali Quli Qarai' },
  { id: 1016, edition: 'en.wahiduddin', fawazEdition: 'eng-wahiduddinkhan', name: 'Wahiduddin Khan' },
]
const DIRECT_TRANSLATION_BY_ID = new Map(DIRECT_TRANSLATIONS.map((item) => [Number(item.id), item]))

const STATIC_CHAPTER_NAMES = [
  'Al-Faatiha','Al-Baqara','Aal-i-Imraan','An-Nisaa','Al-Maaida','Al-An\'aam','Al-A\'raaf','Al-Anfaal','At-Tawba','Yunus','Hud','Yusuf','Ar-Ra\'d','Ibrahim','Al-Hijr','An-Nahl','Al-Israa','Al-Kahf','Maryam','Taa-Haa','Al-Anbiyaa','Al-Hajj','Al-Muminoon','An-Noor','Al-Furqaan','Ash-Shu\'araa','An-Naml','Al-Qasas','Al-Ankaboot','Ar-Room','Luqman','As-Sajda','Al-Ahzaab','Saba','Faatir','Yaseen','As-Saaffaat','Saad','Az-Zumar','Ghafir','Fussilat','Ash-Shura','Az-Zukhruf','Ad-Dukhaan','Al-Jaathiya','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujuraat','Qaaf','Adh-Dhaariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahmaan','Al-Waaqia','Al-Hadid','Al-Mujaadila','Al-Hashr','Al-Mumtahana','As-Saff','Al-Jumu\'a','Al-Munaafiqoon','At-Taghaabun','At-Talaaq','At-Tahrim','Al-Mulk','Al-Qalam','Al-Haaqqa','Al-Ma\'aarij','Nooh','Al-Jinn','Al-Muzzammil','Al-Muddaththir','Al-Qiyaama','Al-Insaan','Al-Mursalaat','An-Naba','An-Naazi\'aat','Abasa','At-Takwir','Al-Infitaar','Al-Mutaffifin','Al-Inshiqaaq','Al-Burooj','At-Taariq','Al-A\'laa','Al-Ghaashiya','Al-Fajr','Al-Balad','Ash-Shams','Al-Lail','Ad-Dhuhaa','Ash-Sharh','At-Tin','Al-Alaq','Al-Qadr','Al-Bayyina','Az-Zalzala','Al-Aadiyaat','Al-Qaari\'a','At-Takaathur','Al-Asr','Al-Humaza','Al-Fil','Quraish','Al-Maa\'un','Al-Kawthar','Al-Kaafiroon','An-Nasr','Al-Masad','Al-Ikhlaas','Al-Falaq','An-Naas'
]
const STATIC_AYAH_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]

// ── Phase One addition: distraction-free continuous Read Mode ─────────────
// Read Mode is deliberately isolated from the existing reader. It reuses the
// same frontend-only Quran/translation fetchers but does not alter audio,
// bookmarks, search, settings, word-hover, or the normal ayah UI.
const READ_SETTINGS_KEY = 'qmr-read-mode-v1'
const JUZ_STARTS = [
  { juz: 1, chapter: 1, ayah: 1 },
  { juz: 2, chapter: 2, ayah: 142 },
  { juz: 3, chapter: 2, ayah: 253 },
  { juz: 4, chapter: 3, ayah: 93 },
  { juz: 5, chapter: 4, ayah: 24 },
  { juz: 6, chapter: 4, ayah: 148 },
  { juz: 7, chapter: 5, ayah: 82 },
  { juz: 8, chapter: 6, ayah: 111 },
  { juz: 9, chapter: 7, ayah: 88 },
  { juz: 10, chapter: 8, ayah: 41 },
  { juz: 11, chapter: 9, ayah: 93 },
  { juz: 12, chapter: 11, ayah: 6 },
  { juz: 13, chapter: 12, ayah: 53 },
  { juz: 14, chapter: 15, ayah: 1 },
  { juz: 15, chapter: 17, ayah: 1 },
  { juz: 16, chapter: 18, ayah: 75 },
  { juz: 17, chapter: 21, ayah: 1 },
  { juz: 18, chapter: 23, ayah: 1 },
  { juz: 19, chapter: 25, ayah: 21 },
  { juz: 20, chapter: 27, ayah: 56 },
  { juz: 21, chapter: 29, ayah: 46 },
  { juz: 22, chapter: 33, ayah: 31 },
  { juz: 23, chapter: 36, ayah: 28 },
  { juz: 24, chapter: 39, ayah: 32 },
  { juz: 25, chapter: 41, ayah: 47 },
  { juz: 26, chapter: 46, ayah: 1 },
  { juz: 27, chapter: 51, ayah: 31 },
  { juz: 28, chapter: 58, ayah: 1 },
  { juz: 29, chapter: 67, ayah: 1 },
  { juz: 30, chapter: 78, ayah: 1 },
]
const READ_TEXT_STYLES = [
  { id: 'madinah15', label: 'Madinah', detail: '15-line style', script: 'uthmani' },
  { id: 'indopak13', label: 'IndoPak', detail: '13-line style', script: 'indopak' },
  { id: 'indopak15', label: 'IndoPak', detail: '15-line style', script: 'indopak' },
  { id: 'indopak16', label: 'IndoPak', detail: '16-line style', script: 'indopak' },
]

// Read Mode only: verified Quran Complex riwayah texts exposed by the same
// frontend-only public mirror already used by the reader. These do not alter
// the normal reader or its audio/word-hover behavior.
const READ_MUSHAFS = [
  { id: 'hafs', label: 'Ḥafṣ', detail: 'ʿan ʿĀṣim', edition: null },
  { id: 'warsh', label: 'Warsh', detail: 'ʿan Nāfiʿ', edition: 'ara-quranwarsh' },
  { id: 'qalun', label: 'Qālūn', detail: 'ʿan Nāfiʿ', edition: 'ara-quranqaloon' },
  { id: 'shubah', label: 'Shuʿbah', detail: 'ʿan ʿĀṣim', edition: 'ara-quranshouba' },
  { id: 'susi', label: 'al-Sūsī', detail: 'ʿan Abī ʿAmr', edition: 'ara-quransoosi' },
]
const qmrReadMushafCache = new Map()

async function fetchReadMushafTextDirect(mushafId, chapterNumber) {
  const mushaf = READ_MUSHAFS.find((item) => item.id === mushafId) || READ_MUSHAFS[0]
  if (!mushaf.edition) return null
  const key = `${mushaf.edition}:${chapterNumber}`
  if (!qmrReadMushafCache.has(key)) {
    qmrReadMushafCache.set(key, (async () => {
      const rows = await fetchFawazChapter(mushaf.edition, chapterNumber)
      if (!rows.length) throw new Error(`Unable to load ${mushaf.label} ${mushaf.detail}`)
      return rows
    })().catch((error) => {
      qmrReadMushafCache.delete(key)
      throw error
    }))
  }
  return qmrReadMushafCache.get(key)
}

const quranCorpusCache = new Map()

function stripHtml(text) {
  return String(text || '').replace(/<[^>]*>/g, '').trim()
}

function normalizeHttps(url) {
  return String(url || '').replace(/^http:\/\//i, 'https://')
}

function padSurah(chapterNumber) {
  return String(chapterNumber).padStart(3, '0')
}

async function fetchJsonTimed(url, fallbackMessage, timeoutMs = 18000) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchJson(url, fallbackMessage, { signal: controller.signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(fallbackMessage)
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

async function fetchChapterListDirect() {
  try {
    const payload = await fetchJsonTimed(`${ALQURAN_BASE}/surah`, 'Unable to load the Surah list')
    const rows = Array.isArray(payload?.data) ? payload.data : []
    if (rows.length) {
      return rows.map((c) => ({
        id: Number(c.number),
        name_arabic: c.name || '',
        english_name: c.englishName || `Surah ${c.number}`,
        name_simple: c.englishName || `Surah ${c.number}`,
        english_name_translation: c.englishNameTranslation || '',
        verse_count: Number(c.numberOfAyahs) || STATIC_AYAH_COUNTS[Number(c.number) - 1] || 0,
        revelation_type: c.revelationType || '',
        verses_available: true,
      }))
    }
  } catch (err) {
    console.warn('Direct Surah catalogue unavailable; using built-in metadata:', err?.message || err)
  }
  return STATIC_CHAPTER_NAMES.map((name, index) => ({
    id: index + 1,
    name_arabic: '',
    english_name: name,
    name_simple: name,
    english_name_translation: '',
    verse_count: STATIC_AYAH_COUNTS[index] || 0,
    revelation_type: '',
    verses_available: true,
  }))
}

async function fetchFawazChapter(edition, chapterNumber) {
  if (!edition) return []
  const urls = [
    `${FAWAZ_BASE}/editions/${edition}/${chapterNumber}.min.json`,
    `${FAWAZ_BASE}/editions/${edition}/${chapterNumber}.json`,
  ]
  for (const url of urls) {
    try {
      const payload = await fetchJsonTimed(url, 'Mirror unavailable', 15000)
      const rows = Array.isArray(payload?.chapter) ? payload.chapter : (Array.isArray(payload) ? payload : [])
      if (rows.length) return rows.map((row) => String(row?.text || ''))
    } catch {
      // Try the next mirror URL.
    }
  }
  return []
}

async function fetchUthmaniDirect(chapterNumber) {
  try {
    const payload = await fetchJsonTimed(`${ALQURAN_BASE}/surah/${chapterNumber}/quran-uthmani`, 'Arabic Quran text unavailable')
    const rows = Array.isArray(payload?.data?.ayahs) ? payload.data.ayahs : []
    if (rows.length) {
      return rows.map((ayah, index) => ({
        number: Number(ayah.number) || index + 1,
        numberInSurah: Number(ayah.numberInSurah) || index + 1,
        text: String(ayah.text || ''),
        page: Number(ayah.page) || null,
        juz: Number(ayah.juz) || null,
      }))
    }
  } catch (err) {
    console.warn(`Primary Arabic source failed for Surah ${chapterNumber}; trying mirror:`, err?.message || err)
  }
  const mirror = await fetchFawazChapter('ara-quranuthmanihaf', chapterNumber)
  if (!mirror.length) throw new Error('Unable to load this Surah')
  return mirror.map((text, index) => ({ number: index + 1, numberInSurah: index + 1, text, page: null, juz: null }))
}

async function fetchTranslationDirect(chapterNumber, translationId) {
  const item = DIRECT_TRANSLATION_BY_ID.get(Number(translationId)) || DIRECT_TRANSLATION_BY_ID.get(DEFAULT_TRANSLATION_ID)
  try {
    const payload = await fetchJsonTimed(`${ALQURAN_BASE}/surah/${chapterNumber}/${item.edition}`, 'Translation unavailable')
    const rows = Array.isArray(payload?.data?.ayahs) ? payload.data.ayahs : []
    if (rows.length) return rows.map((ayah) => stripHtml(ayah?.text || ''))
  } catch (err) {
    console.warn(`Translation ${item.edition} failed; trying mirror:`, err?.message || err)
  }
  if (item.fawazEdition) return (await fetchFawazChapter(item.fawazEdition, chapterNumber)).map(stripHtml)
  return []
}

async function fetchVersesDirect(chapterNumber, translationId) {
  // Arabic is awaited independently. Translation/Indo-Pak failures can never
  // blank the Surah.
  const uthmani = await fetchUthmaniDirect(chapterNumber)
  const [translation, indopak] = await Promise.all([
    fetchTranslationDirect(chapterNumber, translationId).catch(() => []),
    fetchFawazChapter('ara-quranindopak', chapterNumber).catch(() => []),
  ])
  return uthmani.map((ayah, index) => ({
    id: Number(ayah.number) || index + 1,
    verse_number: Number(ayah.number) || index + 1,
    verse_number_in_surah: Number(ayah.numberInSurah) || index + 1,
    verse_key: `${chapterNumber}:${Number(ayah.numberInSurah) || index + 1}`,
    chapter_number: chapterNumber,
    text_uthmani: ayah.text || '',
    text_indopak: indopak[index] || ayah.text || '',
    translation_text: stripHtml(translation[index] || ''),
    page: Number(ayah.page) || null,
    juz: Number(ayah.juz) || null,
    words: [],
  }))
}


async function fetchWordDataDirect(chapterNumber) {
  const chapter = Number(chapterNumber)
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 114) return new Map()
  if (qmrWordDataCache.has(chapter)) return qmrWordDataCache.get(chapter)

  const loadPage = async (page) => {
    const payload = await fetchJsonTimed(
      `${ISLAMIC_APP_WORDS_BASE}/${chapter}?page=${page}&per_page=50`,
      'Word details unavailable',
      12000
    )
    return payload?.data || {}
  }

  const first = await loadPage(1)
  const totalPages = Math.max(1, Number(first?.pagination?.total_pages) || 1)
  const pagePayloads = [first]

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => loadPage(index + 2))
    )
    pagePayloads.push(...rest)
  }

  const byAyah = new Map()
  for (const page of pagePayloads) {
    for (const ayah of (Array.isArray(page?.ayahs) ? page.ayahs : [])) {
      const ayahNumber = Number(ayah?.ayah_number)
      if (!Number.isInteger(ayahNumber) || ayahNumber < 1) continue
      const words = (Array.isArray(ayah?.words) ? ayah.words : [])
        .filter((word) => !word?.char_type || word.char_type === 'word')
        .map((word, index) => ({
          position: Number(word?.position) || index + 1,
          text_uthmani: String(word?.text_uthmani || ''),
          text_indopak: '',
          translation: String(word?.translation || ''),
          transliteration: String(word?.transliteration || ''),
        }))
        .filter((word) => word.text_uthmani)
      if (words.length) byAyah.set(ayahNumber, words)
    }
  }

  qmrWordDataCache.set(chapter, byAyah)
  return byAyah
}

function attachWordData(verses, chapterNumber, byAyah) {
  if (!(byAyah instanceof Map) || byAyah.size === 0) return verses
  return verses.map((verse) => {
    if (Number(verse?.chapter_number) !== Number(chapterNumber)) return verse
    const words = byAyah.get(Number(verse?.verse_number_in_surah))
    if (!Array.isArray(words) || !words.length) return verse

    const indoTokens = String(verse?.text_indopak || '').trim().split(/\s+/).filter(Boolean)
    const canMapIndoPak = indoTokens.length === words.length

    return {
      ...verse,
      words: words.map((word, index) => ({
        ...word,
        text_indopak: canMapIndoPak ? indoTokens[index] : word.text_uthmani,
      })),
    }
  })
}

async function fetchTimingReadsDirect() {
  const payload = await fetchJsonTimed(`${MP3QURAN_BASE}/ayat_timing/reads`, 'Unable to load reciters')
  const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.reads) ? payload.reads : [])
  return rows.map((read) => ({
    id: Number(read.id),
    name: String(read.name || '').trim(),
    folderUrl: normalizeHttps(read.folder_url),
    surahCount: Number(read.soar_count) || 0,
  })).filter((read) => Number.isInteger(read.id) && read.id > 0 && read.folderUrl)
}

async function fetchRecitationsDirect() {
  const [timingReads, reciterPayload] = await Promise.all([
    fetchTimingReadsDirect(),
    fetchJsonTimed(`${MP3QURAN_BASE}/reciters?language=eng`, 'English reciter names unavailable').catch(() => ({ reciters: [] })),
  ])
  const englishByReadId = new Map()
  for (const reciter of (Array.isArray(reciterPayload?.reciters) ? reciterPayload.reciters : [])) {
    for (const moshaf of (Array.isArray(reciter?.moshaf) ? reciter.moshaf : [])) {
      const id = Number(moshaf.id)
      if (!Number.isInteger(id) || id < 1) continue
      englishByReadId.set(id, {
        reciterName: String(reciter.name || '').trim(),
        moshafName: String(moshaf.name || '').trim(),
      })
    }
  }
  return timingReads.map((read) => {
    const english = englishByReadId.get(read.id)
    const baseName = english?.reciterName || read.name || `Reciter ${read.id}`
    const detail = english?.moshafName && !/hafs a['’]?n assem/i.test(english.moshafName) ? english.moshafName : ''
    return { ...read, name: detail ? `${baseName} — ${detail}` : baseName }
  }).sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

function normalizeArabicSearch(text) {
  return String(text || '').normalize('NFKD')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/ـ/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeLatinSearch(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim()
}

async function loadQuranCorpusDirect(edition) {
  if (!quranCorpusCache.has(edition)) {
    quranCorpusCache.set(edition, (async () => {
      try {
        const payload = await fetchJsonTimed(`${ALQURAN_BASE}/quran/${edition}`, 'Quran search corpus unavailable', 25000)
        const surahs = Array.isArray(payload?.data?.surahs) ? payload.data.surahs : []
        if (!surahs.length) throw new Error('Quran search corpus was empty')
        return surahs
      } catch (err) {
        quranCorpusCache.delete(edition)
        throw err
      }
    })())
  }
  return quranCorpusCache.get(edition)
}

async function searchQuranDirect(query, translationId) {
  const translationEdition = DIRECT_TRANSLATION_BY_ID.get(Number(translationId))?.edition || 'en.sahih'
  const isArabic = /[\u0600-\u06FF]/.test(query)
  const [arabicSurahs, translationSurahs] = await Promise.all([
    loadQuranCorpusDirect('quran-uthmani'),
    loadQuranCorpusDirect(translationEdition),
  ])
  const needle = isArabic ? normalizeArabicSearch(query) : normalizeLatinSearch(query)
  const results = []
  for (let s = 0; s < arabicSurahs.length && results.length < 30; s += 1) {
    const arSurah = arabicSurahs[s]
    const trSurah = translationSurahs[s]
    const arAyahs = Array.isArray(arSurah?.ayahs) ? arSurah.ayahs : []
    const trAyahs = Array.isArray(trSurah?.ayahs) ? trSurah.ayahs : []
    for (let a = 0; a < arAyahs.length && results.length < 30; a += 1) {
      const ar = arAyahs[a]
      const tr = trAyahs[a]
      const haystack = isArabic ? normalizeArabicSearch(ar?.text) : normalizeLatinSearch(tr?.text)
      if (!haystack.includes(needle)) continue
      const chapterNumber = Number(arSurah?.number) || s + 1
      const ayahNumber = Number(ar?.numberInSurah) || a + 1
      results.push({
        verseKey: `${chapterNumber}:${ayahNumber}`,
        chapterNumber,
        ayahNumber,
        chapterName: arSurah?.englishName || trSurah?.englishName || `Surah ${chapterNumber}`,
        chapterArabicName: arSurah?.name || '',
        arabic: stripHtml(ar?.text || ''),
        translation: stripHtml(tr?.text || ''),
      })
    }
  }
  return results
}

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveBookmarks(bookmarks) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks))
  } catch {
    // localStorage unavailable — bookmarks remain for this session only
  }
}

function parseVerseReference(raw) {
  const match = String(raw || '').trim().match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/)
  if (!match) return null
  const chapter = Number(match[1])
  const ayah = Number(match[2])
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 114 || !Number.isInteger(ayah) || ayah < 1) return null
  return { chapter, ayah }
}

function getInitialLocation(settings) {
  if (typeof window === 'undefined') return { chapterNumber: settings.chapterNumber || 1, ayah: null }
  const params = new URLSearchParams(window.location.search)
  const chapter = Number(params.get('surah'))
  const ayah = Number(params.get('ayah'))
  return {
    chapterNumber: Number.isInteger(chapter) && chapter >= 1 && chapter <= 114 ? chapter : (settings.chapterNumber || 1),
    ayah: Number.isInteger(ayah) && ayah >= 1 ? ayah : null,
  }
}

function verseShareUrl(chapter, ayah) {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.pathname = '/quran'
  url.search = ''
  url.searchParams.set('surah', String(chapter))
  url.searchParams.set('ayah', String(ayah))
  url.hash = ''
  return url.toString()
}

async function copyText(text) {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}



const GLOBAL_AUDIO_BRIDGE_KEY = '__talweehQuranAudioBridgeV15'
const GLOBAL_ROUTE_PATCH_KEY = '__talweehQuranRoutePatchV15'
const GLOBAL_THEME_MIRROR_KEY = '__talweehQuranThemeMirrorV15'

function isQuranRoute() {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/quran' || window.location.pathname.startsWith('/quran/')
}

function ensureRouteChangeEvents() {
  if (typeof window === 'undefined' || window[GLOBAL_ROUTE_PATCH_KEY]) return
  window[GLOBAL_ROUTE_PATCH_KEY] = true
  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method]
    window.history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args)
      window.dispatchEvent(new Event('talweeh:quran-route-change'))
      return result
    }
  }
}

function ensureThemeMirror() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || window[GLOBAL_THEME_MIRROR_KEY]) return
  window[GLOBAL_THEME_MIRROR_KEY] = true
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  const apply = () => {
    const nodes = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean)
    const tokens = nodes.flatMap((node) => [
      node.getAttribute('data-theme'),
      node.getAttribute('data-mode'),
      node.getAttribute('data-color-scheme'),
      node.getAttribute('class'),
    ]).filter(Boolean).join(' ').toLowerCase()
    const explicitLight = /(^|[\s_-])light([\s_-]|$)/.test(tokens)
    const explicitDark = /(^|[\s_-])dark([\s_-]|$)/.test(tokens)
    const dark = explicitDark ? true : explicitLight ? false : Boolean(media?.matches)
    const next = dark ? 'dark' : 'light'
    if (document.body.dataset.qmrTheme !== next) document.body.dataset.qmrTheme = next
  }
  apply()
  const observer = new MutationObserver(apply)
  for (const node of [document.documentElement, document.body, document.getElementById('root')].filter(Boolean)) {
    observer.observe(node, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode', 'data-color-scheme'] })
  }
  media?.addEventListener?.('change', apply)
}

function ensureGlobalAudioBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  if (window[GLOBAL_AUDIO_BRIDGE_KEY]) return window[GLOBAL_AUDIO_BRIDGE_KEY]

  ensureRouteChangeEvents()
  ensureThemeMirror()

  let audio = document.getElementById('qmr-global-audio')
  if (!audio) {
    audio = document.createElement('audio')
    audio.id = 'qmr-global-audio'
    audio.preload = 'auto'
    audio.setAttribute('playsinline', '')
    audio.style.display = 'none'
    document.body.appendChild(audio)
  }

  let shell = document.getElementById('qmr-global-mini-player')
  if (!shell) {
    shell = document.createElement('div')
    shell.id = 'qmr-global-mini-player'
    shell.className = 'qmr-global-mini-player'
    shell.hidden = true
    shell.innerHTML = `
      <div class="qmr-mini-player-card" role="region" aria-label="Qur'an audio player">
        <div class="qmr-mini-player-info">
          <span class="qmr-mini-player-kicker">Qurʾān recitation</span>
          <strong class="qmr-mini-player-title">Recitation</strong>
          <span class="qmr-mini-player-reciter"></span>
        </div>
        <div class="qmr-mini-player-controls">
          <button type="button" class="qmr-mini-btn" data-qmr-mini-action="prev" data-qmr-tooltip="Previous ayah" aria-label="Previous ayah">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5 9 12l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="qmr-mini-btn qmr-mini-main" data-qmr-mini-action="toggle" data-qmr-tooltip="Pause" aria-label="Pause">
            <span class="qmr-mini-icon-pause"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 6.5v11M15.5 6.5v11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>
            <span class="qmr-mini-icon-play" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5 18 12 8 18.5Z" fill="currentColor"/></svg></span>
          </button>
          <button type="button" class="qmr-mini-btn" data-qmr-mini-action="next" data-qmr-tooltip="Next ayah" aria-label="Next ayah">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="qmr-mini-btn qmr-mini-close" data-qmr-mini-action="stop" data-qmr-tooltip="Stop and close" aria-label="Stop and close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
          </button>
        </div>
        <input class="qmr-mini-player-seek" type="range" min="0" max="1" value="0" step="0.1" aria-label="Seek recitation" />
      </div>`
    document.body.appendChild(shell)
  }

  const titleEl = shell.querySelector('.qmr-mini-player-title')
  const reciterEl = shell.querySelector('.qmr-mini-player-reciter')
  const seekEl = shell.querySelector('.qmr-mini-player-seek')
  const toggleBtn = shell.querySelector('[data-qmr-mini-action="toggle"]')
  const playIcon = shell.querySelector('.qmr-mini-icon-play')
  const pauseIcon = shell.querySelector('.qmr-mini-icon-pause')

  const bridge = {
    audio,
    shell,
    active: false,
    track: null,
    mode: null,
    currentAyahKey: null,
    reciterName: '',
    recitationId: null,
    chapterName: '',
    chapterNumber: null,
    stopAtMs: null,
    range: null,
    loopEnabled: false,
    repeatAyah: false,
    currentTimestamp() {
      if (!this.track || !this.currentAyahKey) return null
      return this.track.timestampByKey?.get(this.currentAyahKey) || null
    },
    updateCurrentAyah(ms) {
      const timestamps = this.track?.timestamps || []
      if (!timestamps.length) return
      const current = this.currentTimestamp()
      if (current && ms >= current.from && ms < current.to) return
      let low = 0
      let high = timestamps.length - 1
      let found = null
      while (low <= high) {
        const middle = Math.floor((low + high) / 2)
        const candidate = timestamps[middle]
        if (ms < candidate.from) high = middle - 1
        else if (ms >= candidate.to) low = middle + 1
        else {
          found = candidate
          break
        }
      }
      if (found?.verse_key) this.currentAyahKey = found.verse_key
    },
    go(offset) {
      if (!this.track?.timestamps?.length) return
      let index = this.currentAyahKey ? this.track.timestampIndexByKey?.get(this.currentAyahKey) : -1
      if (!Number.isInteger(index) || index < 0) index = 0
      const target = this.track.timestamps[index + offset]
      if (!target) return
      if (this.mode === 'ayah') this.stopAtMs = target.to
      this.audio.currentTime = target.from / 1000
      this.currentAyahKey = target.verse_key
      this.render()
    },
    stop() {
      try { this.audio.pause() } catch {}
      try { this.audio.currentTime = 0 } catch {}
      this.active = false
      this.mode = null
      this.currentAyahKey = null
      this.stopAtMs = null
      this.range = null
      this.render()
      window.dispatchEvent(new Event('talweeh:quran-audio-stopped'))
    },
    render() {
      const shouldShow = this.active && !isQuranRoute()
      this.shell.hidden = !shouldShow
      if (!shouldShow) return
      const ayahNumber = this.currentAyahKey?.split(':')?.[1]
      titleEl.textContent = this.chapterName
        ? `${this.chapterName}${ayahNumber ? ` · Ayah ${ayahNumber}` : ''}`
        : (this.currentAyahKey ? `Qurʾān ${this.currentAyahKey}` : 'Qurʾān recitation')
      reciterEl.textContent = this.reciterName || 'Selected reciter'
      const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0
      seekEl.max = String(Math.max(1, duration))
      seekEl.value = String(Math.min(this.audio.currentTime || 0, duration || 0))
      const paused = this.audio.paused
      playIcon.hidden = !paused
      pauseIcon.hidden = paused
      toggleBtn.setAttribute('aria-label', paused ? 'Resume' : 'Pause')
      toggleBtn.dataset.qmrTooltip = paused ? 'Resume' : 'Pause'
    },
  }

  shell.querySelector('[data-qmr-mini-action="prev"]')?.addEventListener('click', () => bridge.go(-1))
  shell.querySelector('[data-qmr-mini-action="next"]')?.addEventListener('click', () => bridge.go(1))
  shell.querySelector('[data-qmr-mini-action="stop"]')?.addEventListener('click', () => bridge.stop())
  toggleBtn?.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
    bridge.render()
  })
  seekEl?.addEventListener('input', (event) => {
    const next = Number(event.target.value)
    if (Number.isFinite(next)) {
      bridge.stopAtMs = null
      bridge.range = null
      bridge.mode = 'surah'
      audio.currentTime = next
      bridge.updateCurrentAyah(next * 1000)
      bridge.render()
    }
  })

  audio.addEventListener('play', () => {
    bridge.active = true
    bridge.render()
  })
  audio.addEventListener('pause', () => bridge.render())
  audio.addEventListener('timeupdate', () => {
    if (!bridge.active) return
    const ms = (audio.currentTime || 0) * 1000
    bridge.updateCurrentAyah(ms)

    if (!isQuranRoute()) {
      if (bridge.repeatAyah && bridge.currentAyahKey) {
        const current = bridge.currentTimestamp()
        if (current && ms >= current.to) {
          audio.currentTime = current.from / 1000
          bridge.render()
          return
        }
      }
      if (bridge.stopAtMs !== null && ms >= bridge.stopAtMs) {
        if (bridge.mode === 'range' && bridge.loopEnabled && bridge.range) {
          audio.currentTime = bridge.range.fromMs / 1000
          bridge.updateCurrentAyah(bridge.range.fromMs)
        } else {
          bridge.stop()
          return
        }
      }
    }
    bridge.render()
  })
  audio.addEventListener('ended', () => {
    if (isQuranRoute()) return
    if (bridge.mode === 'surah' && bridge.loopEnabled) {
      audio.currentTime = 0
      audio.play().catch(() => bridge.stop())
    } else {
      bridge.stop()
    }
  })

  const rerender = () => bridge.render()
  window.addEventListener('talweeh:quran-route-change', rerender)
  window.addEventListener('popstate', rerender)

  window[GLOBAL_AUDIO_BRIDGE_KEY] = bridge
  bridge.render()
  return bridge
}


function QmrFloatingTooltip() {
  const [tooltip, setTooltip] = useState(null)
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false })
  const tooltipRef = useRef(null)
  const targetRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const selector = '[data-qmr-tooltip], .qmr-word[data-tip]'

    const getTarget = (node) => {
      if (!(node instanceof Element)) return null
      return node.closest(selector)
    }

    const getText = (target) => {
      if (!target) return ''
      return String(target.getAttribute('data-qmr-tooltip') || target.getAttribute('data-tip') || '').trim()
    }

    const schedulePosition = () => {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = window.requestAnimationFrame(() => {
        const target = targetRef.current
        const tip = tooltipRef.current
        if (!target || !tip || !document.documentElement.contains(target)) return

        const targetRect = target.getBoundingClientRect()
        const tipRect = tip.getBoundingClientRect()
        const margin = 8
        const gap = 9

        let top = targetRect.top - tipRect.height - gap
        if (top < margin) top = targetRect.bottom + gap
        top = Math.max(margin, Math.min(top, window.innerHeight - tipRect.height - margin))

        let left = targetRect.left + targetRect.width / 2 - tipRect.width / 2
        left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin))

        setPosition({ left, top, ready: true })
      })
    }

    const show = (target) => {
      const text = getText(target)
      if (!text) return

      // Avoid the browser's native title bubble duplicating the Talweeh tooltip.
      if (target.hasAttribute('title')) {
        target.dataset.qmrSavedTitle = target.getAttribute('title') || ''
        target.removeAttribute('title')
      }

      targetRef.current = target
      setPosition((current) => ({ ...current, ready: false }))
      setTooltip(text)
      window.requestAnimationFrame(schedulePosition)
    }

    const hide = () => {
      targetRef.current = null
      setTooltip(null)
      setPosition({ left: 0, top: 0, ready: false })
    }

    const onPointerOver = (event) => {
      const target = getTarget(event.target)
      if (!target) return
      if (target === targetRef.current) return
      show(target)
    }

    const onPointerOut = (event) => {
      const current = targetRef.current
      if (!current) return
      if (event.relatedTarget instanceof Node && current.contains(event.relatedTarget)) return
      hide()
    }

    const onFocusIn = (event) => {
      const target = getTarget(event.target)
      if (target) show(target)
    }

    const onFocusOut = (event) => {
      const current = targetRef.current
      if (!current) return
      if (event.relatedTarget instanceof Node && current.contains(event.relatedTarget)) return
      hide()
    }

    const onViewportChange = () => {
      if (targetRef.current) schedulePosition()
    }

    document.addEventListener('pointerover', onPointerOver, true)
    document.addEventListener('pointerout', onPointerOut, true)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)

    return () => {
      window.cancelAnimationFrame(rafRef.current)
      document.removeEventListener('pointerover', onPointerOver, true)
      document.removeEventListener('pointerout', onPointerOut, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [])

  useEffect(() => {
    if (!tooltip) return
    const id = window.requestAnimationFrame(() => {
      const target = targetRef.current
      const tip = tooltipRef.current
      if (!target || !tip) return

      const targetRect = target.getBoundingClientRect()
      const tipRect = tip.getBoundingClientRect()
      const margin = 8
      const gap = 9

      let top = targetRect.top - tipRect.height - gap
      if (top < margin) top = targetRect.bottom + gap
      top = Math.max(margin, Math.min(top, window.innerHeight - tipRect.height - margin))

      let left = targetRect.left + targetRect.width / 2 - tipRect.width / 2
      left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin))

      setPosition({ left, top, ready: true })
    })
    return () => window.cancelAnimationFrame(id)
  }, [tooltip])

  if (!tooltip) return null

  return (
    <ReaderPortal>
      <div
        ref={tooltipRef}
        className="qmr-floating-tooltip"
        role="tooltip"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
          visibility: position.ready ? 'visible' : 'hidden',
        }}
      >
        {tooltip}
      </div>
    </ReaderPortal>
  )
}

function IconPause({ size = 16 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 6.5v11M15.5 6.5v11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function IconChevronLeft({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 6.5 9 12l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconChevronRight({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.5 6.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconMore({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <circle cx="18" cy="12" r="1.35" fill="currentColor" />
    </svg>
  )
}

function IconSliders({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M5 17h14M9 4v6M15 14v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconContinuous({ size = 17 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.8 5.8 15 11.1 6.8 16.4Z" fill="currentColor" />
      <path d="M15.8 7.4 19 10.6l-3.2 3.2M18.8 10.6H14" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPlay({ size = 16 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5 18 12 8 18.5Z" fill="currentColor" />
    </svg>
  )
}

function IconBookmark({ filled = false, size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5v15l-5-3.2-5 3.2Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLink({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.6 14.4 14.4 9.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.7 15.9 6 17.6a3.2 3.2 0 0 1-4.5-4.5l3.4-3.4a3.2 3.2 0 0 1 4.5 0" transform="translate(3 0)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m16.3 8.1 1.7-1.7a3.2 3.2 0 0 1 4.5 4.5l-3.4 3.4a3.2 3.2 0 0 1-4.5 0" transform="translate(-3 0)" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconSearch({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15 15 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconBookOpen({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 5.2c2.7-.7 5.1-.2 7.5 1.4v12.2c-2.4-1.6-4.8-2.1-7.5-1.4V5.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M19.5 5.2c-2.7-.7-5.1-.2-7.5 1.4v12.2c2.4-1.6 4.8-2.1 7.5-1.4V5.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function IconSettings({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3.3v2.1M12 18.6v2.1M3.3 12h2.1M18.6 12h2.1M5.85 5.85l1.48 1.48M16.67 16.67l1.48 1.48M18.15 5.85l-1.48 1.48M7.33 16.67l-1.48 1.48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconPen({ size = 18 }) {
  return (
    <svg className="qmr-svg-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l4.2-1 10.7-10.7a2.4 2.4 0 0 0-3.4-3.4L4.8 15.6 4 20Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.8 6.6 3.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function youtubeIdFromUrl(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  const direct = value.match(/^[A-Za-z0-9_-]{11}$/)
  if (direct) return direct[0]
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return match?.[1] || ''
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveSettings(patch) {
  try {
    const current = loadSettings()
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // localStorage unavailable (private mode, etc.) — settings just won't persist
  }
}

function loadReadSettings() {
  try {
    const raw = localStorage.getItem(READ_SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveReadSettings(patch) {
  try {
    const current = loadReadSettings()
    localStorage.setItem(READ_SETTINGS_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // Read Mode still works if localStorage is unavailable.
  }
}

function ReadStartPicker({ kind, chapters, surah, juz, onSelectSurah, onSelectJuz }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const activeChapter = chapters.find((item) => Number(item.id) === Number(surah))
  const filteredChapters = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter((chapter) =>
      String(chapter.id).includes(q) ||
      String(chapter.english_name || '').toLowerCase().includes(q) ||
      String(chapter.english_name_translation || '').toLowerCase().includes(q)
    )
  }, [chapters, query])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <div className="qmr-read-start-picker" ref={rootRef}>
      <button
        type="button"
        className="qmr-read-start-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>
          <small>Start at</small>
          <strong>
            {kind === 'juz'
              ? `Juz ${juz}`
              : `${surah}. ${activeChapter?.english_name || `Surah ${surah}`}`}
          </strong>
        </span>
        <IconChevronRight size={15} />
      </button>
      {open && (
        <div className="qmr-read-start-popover" role="dialog" aria-label={kind === 'juz' ? 'Choose Juz' : 'Choose Surah'}>
          {kind === 'surah' ? (
            <>
              <label className="qmr-read-start-search">
                <IconSearch size={16} />
                <input
                  type="search"
                  placeholder="Search Surah…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                  aria-label="Search Surah"
                />
              </label>
              <div className="qmr-read-surah-options" role="listbox" aria-label="Surahs">
                {filteredChapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    className={Number(chapter.id) === Number(surah) ? 'active' : ''}
                    role="option"
                    aria-selected={Number(chapter.id) === Number(surah)}
                    onClick={() => {
                      onSelectSurah(Number(chapter.id))
                      setOpen(false)
                    }}
                  >
                    <span className="qmr-read-option-number">{chapter.id}</span>
                    <span className="qmr-read-option-copy">
                      <strong>{chapter.english_name}</strong>
                      <small>{chapter.english_name_translation}</small>
                    </span>
                    {chapter.name_arabic && <span className="qmr-read-option-arabic" dir="rtl" lang="ar">{chapter.name_arabic}</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="qmr-read-juz-options" role="listbox" aria-label="Juz">
              {JUZ_STARTS.map((item) => (
                <button
                  key={item.juz}
                  type="button"
                  className={Number(item.juz) === Number(juz) ? 'active' : ''}
                  role="option"
                  aria-selected={Number(item.juz) === Number(juz)}
                  onClick={() => {
                    onSelectJuz(item.juz)
                    setOpen(false)
                  }}
                >
                  <strong>Juz {item.juz}</strong>
                  <small>{item.chapter}:{item.ayah}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReadOnlyMode({ chapters, translations, translationId, onTranslationChange, initialChapter, onClose }) {
  const initialReadSettings = useMemo(loadReadSettings, [])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [startKind, setStartKind] = useState(initialReadSettings.startKind === 'juz' ? 'juz' : 'surah')
  const [selectedSurah, setSelectedSurah] = useState(() => {
    const saved = Number(initialReadSettings.surah)
    return saved >= 1 && saved <= 114 ? saved : Number(initialChapter) || 1
  })
  const [selectedJuz, setSelectedJuz] = useState(() => {
    const saved = Number(initialReadSettings.juz)
    return saved >= 1 && saved <= 30 ? saved : 1
  })
  const [displayMode, setDisplayMode] = useState(
    ['arabic', 'both', 'translation'].includes(initialReadSettings.displayMode)
      ? initialReadSettings.displayMode
      : 'arabic'
  )
  const [textStyle, setTextStyle] = useState(
    READ_TEXT_STYLES.some((item) => item.id === initialReadSettings.textStyle)
      ? initialReadSettings.textStyle
      : 'madinah15'
  )
  const [mushafId, setMushafId] = useState(
    READ_MUSHAFS.some((item) => item.id === initialReadSettings.mushafId)
      ? initialReadSettings.mushafId
      : 'hafs'
  )
  const [readTheme, setReadTheme] = useState(initialReadSettings.readTheme === 'night' ? 'night' : 'day')
  const [navigationMode, setNavigationMode] = useState(initialReadSettings.navigationMode === 'swipe' ? 'swipe' : 'scroll')
  const [pageSpread, setPageSpread] = useState(Number(initialReadSettings.pageSpread) === 2 ? 2 : 1)
  const [wideScreen, setWideScreen] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(min-width: 900px)').matches : true)
  const [pageIndex, setPageIndex] = useState(0)
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const scrollRef = useRef(null)
  const generationRef = useRef(0)
  const loadingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const swipeStartRef = useRef(null)
  onCloseRef.current = onClose

  const startLocation = useMemo(() => {
    if (startKind === 'juz') {
      return JUZ_STARTS.find((item) => item.juz === Number(selectedJuz)) || JUZ_STARTS[0]
    }
    return { juz: null, chapter: Number(selectedSurah) || 1, ayah: 1 }
  }, [startKind, selectedJuz, selectedSurah])

  const activeTextStyle = READ_TEXT_STYLES.find((item) => item.id === textStyle) || READ_TEXT_STYLES[0]
  const activeMushaf = READ_MUSHAFS.find((item) => item.id === mushafId) || READ_MUSHAFS[0]
  const showArabic = displayMode !== 'translation'
  const showReadTranslation = displayMode !== 'arabic'
  const effectiveSpread = pageSpread === 2 && wideScreen ? 2 : 1

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false)
        else onCloseRef.current?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [settingsOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(min-width: 900px)')
    const update = () => setWideScreen(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    saveReadSettings({
      startKind,
      surah: selectedSurah,
      juz: selectedJuz,
      displayMode,
      textStyle,
      mushafId,
      readTheme,
      navigationMode,
      pageSpread,
    })
  }, [startKind, selectedSurah, selectedJuz, displayMode, textStyle, mushafId, readTheme, navigationMode, pageSpread])

  async function loadChapterForRead(chapterNumber, requestedTranslationId, requestedMushafId) {
    const [rows, mushafText] = await Promise.all([
      fetchVersesDirect(chapterNumber, requestedTranslationId),
      fetchReadMushafTextDirect(requestedMushafId, chapterNumber),
    ])
    if (!mushafText) return rows.map((verse) => ({ ...verse, text_read_mushaf: verse.text_uthmani }))
    if (mushafText.length !== rows.length) throw new Error('Selected riwayah text does not match this Surah')
    return rows.map((verse, index) => ({ ...verse, text_read_mushaf: mushafText[index] || '' }))
  }

  useEffect(() => {
    const generation = ++generationRef.current
    loadingRef.current = true
    setLoading(true)
    setLoadError(null)
    setHasMore(startLocation.chapter < 114)
    setSegments([])
    setPageIndex(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0

    loadChapterForRead(startLocation.chapter, translationId, mushafId)
      .then((rows) => {
        if (generation !== generationRef.current) return
        const verses = rows.filter((verse) => Number(verse.verse_number_in_surah) >= Number(startLocation.ayah || 1))
        setSegments([{ chapterNumber: startLocation.chapter, fromAyah: startLocation.ayah || 1, verses }])
      })
      .catch((error) => {
        if (generation !== generationRef.current) return
        setLoadError(String(error?.message || 'Unable to load reading text'))
      })
      .finally(() => {
        if (generation !== generationRef.current) return
        loadingRef.current = false
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLocation.chapter, startLocation.ayah, translationId, mushafId])

  async function loadNextChapter() {
    if (loadingRef.current || !hasMore || segments.length === 0) return
    const lastChapter = Number(segments[segments.length - 1]?.chapterNumber || 0)
    const nextChapter = lastChapter + 1
    if (nextChapter > 114) {
      setHasMore(false)
      return
    }

    const generation = generationRef.current
    loadingRef.current = true
    setLoading(true)
    setLoadError(null)
    try {
      const verses = await loadChapterForRead(nextChapter, translationId, mushafId)
      if (generation !== generationRef.current) return
      setSegments((current) => {
        if (current.some((segment) => Number(segment.chapterNumber) === nextChapter)) return current
        return [...current, { chapterNumber: nextChapter, fromAyah: 1, verses }]
      })
      if (nextChapter >= 114) setHasMore(false)
    } catch (error) {
      if (generation === generationRef.current) setLoadError(String(error?.message || 'Unable to continue loading'))
    } finally {
      if (generation === generationRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }

  function maybeLoadMore(event) {
    if (navigationMode !== 'scroll') return
    const el = event.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 1400) loadNextChapter()
  }

  useEffect(() => {
    if (navigationMode !== 'scroll' || loading || !hasMore || segments.length === 0) return undefined
    const id = window.requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el && el.scrollHeight <= el.clientHeight + 900) loadNextChapter()
    })
    return () => window.cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length, loading, hasMore, navigationMode])

  function selectSurah(id) {
    setSelectedSurah(Number(id))
  }

  function selectJuz(id) {
    setSelectedJuz(Number(id))
  }

  function arabicTextFor(verse) {
    if (activeMushaf.id !== 'hafs') return verse.text_read_mushaf || verse.text_uthmani
    return activeTextStyle.script === 'indopak' ? verse.text_indopak : verse.text_uthmani
  }

  function pageBreakBefore(verse, previousVerse) {
    const page = Number(verse?.page)
    const previousPage = Number(previousVerse?.page)
    return page > 0 && previousPage > 0 && page !== previousPage ? page : null
  }

  function PageBreak({ page }) {
    if (!page) return null
    return (
      <span className="qmr-read-page-break" aria-label={`Page ${page}`}>
        <span>Page {page}</span>
      </span>
    )
  }

  function renderArabicFlow(segment) {
    return (
      <p className="qmr-read-arabic-flow" dir="rtl" lang="ar">
        {segment.verses.map((verse, index) => (
          <span className="qmr-read-verse-unit" key={verse.verse_key}>
            <PageBreak page={pageBreakBefore(verse, segment.verses[index - 1])} />
            <span className="qmr-read-inline-ayah">
              {arabicTextFor(verse)}
              <span className="qmr-read-ayah-number" aria-label={`Ayah ${verse.verse_number_in_surah}`}>﴿{verse.verse_number_in_surah}﴾</span>{' '}
            </span>
          </span>
        ))}
      </p>
    )
  }

  function renderTranslationOnly(segment) {
    return (
      <div className="qmr-read-translation-list">
        {segment.verses.map((verse, index) => (
          <div className="qmr-read-translation-unit" key={verse.verse_key}>
            <PageBreak page={pageBreakBefore(verse, segment.verses[index - 1])} />
            <p>
              <span className="qmr-read-reference">{verse.verse_key}</span>
              {verse.translation_text || 'Translation unavailable for this ayah.'}
            </p>
          </div>
        ))}
      </div>
    )
  }

  function renderBoth(segment) {
    return (
      <div className="qmr-read-paired-list">
        {segment.verses.map((verse, index) => (
          <div className="qmr-read-pair-unit" key={verse.verse_key}>
            <PageBreak page={pageBreakBefore(verse, segment.verses[index - 1])} />
            <article className="qmr-read-pair">
              <p className="qmr-read-pair-arabic" dir="rtl" lang="ar">
                {arabicTextFor(verse)}
                <span className="qmr-read-ayah-number" aria-label={`Ayah ${verse.verse_number_in_surah}`}>﴿{verse.verse_number_in_surah}﴾</span>
              </p>
              <p className="qmr-read-pair-translation">
                <span className="qmr-read-reference">{verse.verse_key}</span>
                {verse.translation_text || 'Translation unavailable for this ayah.'}
              </p>
            </article>
          </div>
        ))}
      </div>
    )
  }

  const readPages = useMemo(() => {
    const pages = []
    for (const segment of segments) {
      const chapter = chapters.find((item) => Number(item.id) === Number(segment.chapterNumber))
      segment.verses.forEach((verse, index) => {
        const physicalPage = Number(verse.page) || null
        const pageKey = physicalPage ? `page-${physicalPage}` : `fallback-${segment.chapterNumber}-${Math.floor(index / 10)}`
        let page = pages[pages.length - 1]
        if (!page || page.key !== pageKey) {
          page = { key: pageKey, pageNumber: physicalPage, items: [] }
          pages.push(page)
        }
        page.items.push({
          verse,
          chapter,
          chapterNumber: Number(segment.chapterNumber),
          showSurahMarker: index === 0 || Number(verse.verse_number_in_surah) === 1,
          startingMidSurah: index === 0 && Number(segment.fromAyah) > 1,
        })
      })
    }
    return pages
  }, [segments, chapters])

  const maxPageIndex = Math.max(0, readPages.length - effectiveSpread)

  useEffect(() => {
    setPageIndex((current) => Math.min(current, maxPageIndex))
  }, [maxPageIndex])

  useEffect(() => {
    if (navigationMode !== 'swipe' || loading || !hasMore || readPages.length === 0) return
    if (pageIndex >= Math.max(0, readPages.length - effectiveSpread - 2)) loadNextChapter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationMode, pageIndex, readPages.length, effectiveSpread, loading, hasMore])

  function goPreviousPage() {
    setPageIndex((current) => Math.max(0, current - effectiveSpread))
  }

  function goNextPage() {
    const next = pageIndex + effectiveSpread
    if (next <= maxPageIndex) setPageIndex(next)
    else if (hasMore && !loading) loadNextChapter()
  }

  function onSwipeStart(event) {
    const touch = event.touches?.[0]
    if (touch) swipeStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function onSwipeEnd(event) {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    const touch = event.changedTouches?.[0]
    if (!start || !touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 52 || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0) goNextPage()
    else goPreviousPage()
  }

  function renderPageSurahMarker(item) {
    if (!item.showSurahMarker) return null
    return (
      <span className="qmr-read-page-surah-marker">
        <span>Surah {item.chapterNumber}</span>
        <strong>{item.chapter?.english_name || `Surah ${item.chapterNumber}`}</strong>
        {item.chapter?.name_arabic && <em dir="rtl" lang="ar">{item.chapter.name_arabic}</em>}
        {item.startingMidSurah && <small>Starting here</small>}
      </span>
    )
  }

  function renderSwipePage(page) {
    if (!page) return null
    return (
      <article className="qmr-read-page-sheet" key={page.key}>
        <div className="qmr-read-page-number-line">
          <span>{page.pageNumber ? `Page ${page.pageNumber}` : 'Reading page'}</span>
        </div>
        {displayMode === 'arabic' && (
          <p className="qmr-read-page-arabic" dir="rtl" lang="ar">
            {page.items.map((item) => (
              <span className="qmr-read-page-verse" key={item.verse.verse_key}>
                {renderPageSurahMarker(item)}
                <span>{arabicTextFor(item.verse)}</span>
                <span className="qmr-read-ayah-number" aria-label={`Ayah ${item.verse.verse_number_in_surah}`}>﴿{item.verse.verse_number_in_surah}﴾</span>{' '}
              </span>
            ))}
          </p>
        )}
        {displayMode === 'translation' && (
          <div className="qmr-read-page-translation">
            {page.items.map((item) => (
              <div key={item.verse.verse_key}>
                {renderPageSurahMarker(item)}
                <p><span className="qmr-read-reference">{item.verse.verse_key}</span>{item.verse.translation_text || 'Translation unavailable for this ayah.'}</p>
              </div>
            ))}
          </div>
        )}
        {displayMode === 'both' && (
          <div className="qmr-read-page-paired">
            {page.items.map((item) => (
              <article key={item.verse.verse_key}>
                {renderPageSurahMarker(item)}
                <p className="qmr-read-pair-arabic" dir="rtl" lang="ar">
                  {arabicTextFor(item.verse)}
                  <span className="qmr-read-ayah-number" aria-label={`Ayah ${item.verse.verse_number_in_surah}`}>﴿{item.verse.verse_number_in_surah}﴾</span>
                </p>
                <p className="qmr-read-pair-translation"><span className="qmr-read-reference">{item.verse.verse_key}</span>{item.verse.translation_text || 'Translation unavailable for this ayah.'}</p>
              </article>
            ))}
          </div>
        )}
      </article>
    )
  }

  function retryInitialLoad() {
    const generation = ++generationRef.current
    loadingRef.current = true
    setLoading(true)
    setLoadError(null)
    loadChapterForRead(startLocation.chapter, translationId, mushafId)
      .then((rows) => {
        if (generation !== generationRef.current) return
        setSegments([{
          chapterNumber: startLocation.chapter,
          fromAyah: startLocation.ayah || 1,
          verses: rows.filter((verse) => Number(verse.verse_number_in_surah) >= Number(startLocation.ayah || 1)),
        }])
        setPageIndex(0)
      })
      .catch((error) => {
        if (generation === generationRef.current) setLoadError(String(error?.message || 'Unable to load reading text'))
      })
      .finally(() => {
        if (generation === generationRef.current) {
          loadingRef.current = false
          setLoading(false)
        }
      })
  }

  const settingsControls = (
    <div className="qmr-read-controls">
      <div className="qmr-read-control qmr-read-control-start">
        <span className="qmr-read-control-label">Begin from</span>
        <div className="qmr-read-kind-toggle" role="group" aria-label="Start from Surah or Juz">
          <button type="button" className={startKind === 'surah' ? 'active' : ''} onClick={() => setStartKind('surah')}>Surah</button>
          <button type="button" className={startKind === 'juz' ? 'active' : ''} onClick={() => setStartKind('juz')}>Juz</button>
        </div>
        <ReadStartPicker
          kind={startKind}
          chapters={chapters}
          surah={selectedSurah}
          juz={selectedJuz}
          onSelectSurah={selectSurah}
          onSelectJuz={selectJuz}
        />
      </div>

      <div className="qmr-read-control">
        <span className="qmr-read-control-label">Show</span>
        <div className="qmr-read-display-toggle" role="group" aria-label="Reading display">
          <button type="button" className={displayMode === 'arabic' ? 'active' : ''} onClick={() => setDisplayMode('arabic')}>Arabic</button>
          <button type="button" className={displayMode === 'both' ? 'active' : ''} onClick={() => setDisplayMode('both')}>Arabic + Translation</button>
          <button type="button" className={displayMode === 'translation' ? 'active' : ''} onClick={() => setDisplayMode('translation')}>Translation</button>
        </div>
      </div>

      {showArabic && (
        <div className="qmr-read-control qmr-read-control-mushaf">
          <span className="qmr-read-control-label">Mushaf / Riwayah</span>
          <div className="qmr-read-mushaf-options" role="group" aria-label="Mushaf riwayah">
            {READ_MUSHAFS.map((item) => (
              <button key={item.id} type="button" className={mushafId === item.id ? 'active' : ''} onClick={() => setMushafId(item.id)}>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {showArabic && (
        <div className="qmr-read-control qmr-read-control-style">
          <span className="qmr-read-control-label">Text style</span>
          <div className="qmr-read-style-options" role="group" aria-label="Qur'an text style">
            {READ_TEXT_STYLES.map((item) => (
              <button key={item.id} type="button" className={textStyle === item.id ? 'active' : ''} onClick={() => setTextStyle(item.id)}>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {showReadTranslation && (
        <div className="qmr-read-control qmr-read-control-translation">
          <span className="qmr-read-control-label">Translation</span>
          <TranslationPicker
            translations={translations}
            activeId={translationId}
            onChange={onTranslationChange}
            disabled={translations.length === 0}
          />
        </div>
      )}

      <div className="qmr-read-control qmr-read-control-compact">
        <span className="qmr-read-control-label">Appearance</span>
        <div className="qmr-read-mini-toggle" role="group" aria-label="Day or night reading mode">
          <button type="button" className={readTheme === 'day' ? 'active' : ''} onClick={() => setReadTheme('day')}>Day</button>
          <button type="button" className={readTheme === 'night' ? 'active' : ''} onClick={() => setReadTheme('night')}>Night</button>
        </div>
      </div>

      <div className="qmr-read-control qmr-read-control-compact">
        <span className="qmr-read-control-label">Move through Qurʾān</span>
        <div className="qmr-read-mini-toggle" role="group" aria-label="Scroll or swipe">
          <button type="button" className={navigationMode === 'scroll' ? 'active' : ''} onClick={() => setNavigationMode('scroll')}>Scroll</button>
          <button type="button" className={navigationMode === 'swipe' ? 'active' : ''} onClick={() => setNavigationMode('swipe')}>Swipe</button>
        </div>
      </div>

      {navigationMode === 'swipe' && (
        <div className="qmr-read-control qmr-read-control-compact">
          <span className="qmr-read-control-label">Desktop spread</span>
          <div className="qmr-read-mini-toggle" role="group" aria-label="One or two pages on desktop">
            <button type="button" className={pageSpread === 1 ? 'active' : ''} onClick={() => setPageSpread(1)}>1 page</button>
            <button type="button" className={pageSpread === 2 ? 'active' : ''} onClick={() => setPageSpread(2)}>2 pages</button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <ReaderPortal>
      <section className="qmr-read-mode" data-read-theme={readTheme} role="dialog" aria-label="Qur'an Read Mode">
        <header className="qmr-read-header">
          <div className="qmr-read-header-top">
            <div className="qmr-read-heading">
              <span>Qurʾān</span>
              <strong>Read Mode</strong>
            </div>
            <div className="qmr-read-header-actions">
              <button
                type="button"
                className={settingsOpen ? 'qmr-read-icon-btn active' : 'qmr-read-icon-btn'}
                onClick={() => setSettingsOpen((value) => !value)}
                aria-label={settingsOpen ? 'Hide Read Mode settings' : 'Show Read Mode settings'}
                aria-expanded={settingsOpen}
              >
                <IconSettings size={18} />
              </button>
              <button type="button" className="qmr-read-icon-btn" onClick={onClose} aria-label="Exit Read Mode">
                <svg className="qmr-svg-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          {settingsOpen && <div className="qmr-read-settings-panel">{settingsControls}</div>}
        </header>

        {navigationMode === 'scroll' ? (
          <div className={`qmr-read-scroll qmr-read-style-${activeTextStyle.id}`} ref={scrollRef} onScroll={maybeLoadMore}>
            <div className="qmr-read-document">
              {segments.map((segment) => {
                const chapter = chapters.find((item) => Number(item.id) === Number(segment.chapterNumber))
                return (
                  <section className="qmr-read-surah-section" key={`${segment.chapterNumber}:${segment.fromAyah}`}>
                    <header className="qmr-read-surah-marker">
                      <span>Surah {segment.chapterNumber}</span>
                      <strong>{chapter?.english_name || `Surah ${segment.chapterNumber}`}</strong>
                      {chapter?.name_arabic && <em dir="rtl" lang="ar">{chapter.name_arabic}</em>}
                      {segment.fromAyah > 1 && <small>Starting at ayah {segment.fromAyah}</small>}
                    </header>
                    {displayMode === 'arabic' && renderArabicFlow(segment)}
                    {displayMode === 'translation' && renderTranslationOnly(segment)}
                    {displayMode === 'both' && renderBoth(segment)}
                  </section>
                )
              })}

              {loading && <div className="qmr-read-loading" role="status"><span /> Loading…</div>}
              {loadError && (
                <div className="qmr-read-error" role="alert">
                  <strong>Could not continue loading.</strong>
                  <span>{loadError}</span>
                  <button type="button" onClick={segments.length ? loadNextChapter : retryInitialLoad}>Try again</button>
                </div>
              )}
              {!loading && !loadError && !hasMore && segments.length > 0 && <div className="qmr-read-end">End of the Qurʾān</div>}
            </div>
          </div>
        ) : (
          <div
            className={`qmr-read-swipe qmr-read-style-${activeTextStyle.id}`}
            onTouchStart={onSwipeStart}
            onTouchEnd={onSwipeEnd}
          >
            <button type="button" className="qmr-read-page-nav qmr-read-page-nav-prev" onClick={goPreviousPage} disabled={pageIndex <= 0} aria-label="Previous page">
              <IconChevronLeft size={22} />
            </button>
            <div className={`qmr-read-page-spread qmr-read-page-spread-${effectiveSpread}`}>
              {readPages.slice(pageIndex, pageIndex + effectiveSpread).map(renderSwipePage)}
              {readPages.length === 0 && loading && <div className="qmr-read-loading" role="status"><span /> Loading…</div>}
              {readPages.length === 0 && loadError && (
                <div className="qmr-read-error" role="alert">
                  <strong>Could not load reading pages.</strong>
                  <span>{loadError}</span>
                  <button type="button" onClick={retryInitialLoad}>Try again</button>
                </div>
              )}
            </div>
            <button type="button" className="qmr-read-page-nav qmr-read-page-nav-next" onClick={goNextPage} disabled={!hasMore && pageIndex >= maxPageIndex} aria-label="Next page">
              <IconChevronRight size={22} />
            </button>
            <div className="qmr-read-page-status" aria-live="polite">
              {readPages[pageIndex]?.pageNumber ? `Page ${readPages[pageIndex].pageNumber}` : `${Math.min(pageIndex + 1, readPages.length)} / ${readPages.length}`}
              {effectiveSpread === 2 && readPages[pageIndex + 1]?.pageNumber ? ` – ${readPages[pageIndex + 1].pageNumber}` : ''}
            </div>
          </div>
        )}
      </section>
    </ReaderPortal>
  )
}

function ChapterList({ chapters, activeChapter, onSelect }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chapters
    return chapters.filter((c) =>
      String(c.id).includes(q) ||
      c.english_name.toLowerCase().includes(q) ||
      c.english_name_translation.toLowerCase().includes(q)
    )
  }, [chapters, query])

  return (
    <div className="qmr-chapter-list">
      <input
        type="search"
        className="qmr-search"
        placeholder="Search Surah…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search Surah"
      />
      <ul>
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={c.id === activeChapter ? 'qmr-chapter-btn active' : 'qmr-chapter-btn'}
              onClick={() => onSelect(c.id)}
            >
              <span className="qmr-chapter-num">{c.id}</span>
              <span className="qmr-chapter-names">
                <strong>{c.english_name}</strong>
                <em>{c.english_name_translation}</em>
              </span>
              <span className="qmr-chapter-arabic">{c.name_arabic}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="qmr-empty">No Surah matches “{query}”.</li>}
      </ul>
    </div>
  )
}

function ReciterPicker({ recitations, activeId, onChange, disabled, compact = false, placement = 'down' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)

  const sortedRecitations = useMemo(
    () => [...recitations].sort((a, b) => a.name.localeCompare(b.name)),
    [recitations]
  )
  const activeReciter = sortedRecitations.find((r) => Number(r.id) === Number(activeId)) || null
  const filteredRecitations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedRecitations
    return sortedRecitations.filter((r) => String(r.name || '').toLowerCase().includes(q))
  }, [sortedRecitations, query])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <div className={`qmr-reciter-control${compact ? ' qmr-reciter-control-compact' : ''}${placement === 'up' ? ' qmr-reciter-placement-up' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="qmr-reciter-trigger"
        onClick={() => !disabled && setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={compact ? `Change reciter. Current reciter: ${activeReciter?.name || 'none'}` : 'Choose reciter'}
        data-qmr-tooltip={compact ? 'Change reciter' : undefined}
      >
        <span className="qmr-reciter-trigger-copy">
          {!compact && <small>Selected reciter</small>}
          <strong>{disabled ? 'Reciters unavailable' : (activeReciter?.name || 'Choose reciter')}</strong>
        </span>
        <IconChevronRight size={compact ? 14 : 17} />
      </button>

      {open && !disabled && (
        <div className="qmr-reciter-popover">
          <label className="qmr-reciter-search">
            <IconSearch size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reciters…"
              aria-label="Search reciters"
              autoFocus
            />
          </label>
          <div className="qmr-reciter-list" role="listbox" aria-label="Reciters">
            {filteredRecitations.map((reciter) => {
              const selected = Number(reciter.id) === Number(activeId)
              return (
                <button
                  key={reciter.id}
                  type="button"
                  className={selected ? 'qmr-reciter-option active' : 'qmr-reciter-option'}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(Number(reciter.id))
                    setOpen(false)
                  }}
                >
                  <span>{reciter.name}</span>
                  {selected && <span className="qmr-reciter-check" aria-hidden="true">✓</span>}
                </button>
              )
            })}
            {filteredRecitations.length === 0 && (
              <div className="qmr-reciter-empty">No reciters match “{query}”.</div>
            )}
          </div>
        </div>
      )}

      {!compact && !disabled && <span className="qmr-reciter-count">{sortedRecitations.length} reciters available</span>}
    </div>
  )
}

function TranslationPicker({ translations, activeId, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const activeTranslation = translations.find((item) => Number(item.id) === Number(activeId)) || null
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return translations
    return translations.filter((item) => String(item.name || '').toLowerCase().includes(q))
  }, [translations, query])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <div className="qmr-translation-control" ref={rootRef}>
      <button
        type="button"
        className="qmr-translation-trigger"
        onClick={() => !disabled && setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>
          <small>Selected translation</small>
          <strong>{disabled ? 'Translations unavailable' : (activeTranslation?.name || 'Choose translation')}</strong>
        </span>
        <IconChevronRight size={17} />
      </button>
      {open && !disabled && (
        <div className="qmr-translation-popover">
          {translations.length > 5 && (
            <label className="qmr-translation-search">
              <IconSearch size={17} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search translations…"
                aria-label="Search translations"
                autoFocus
              />
            </label>
          )}
          <div className="qmr-translation-list" role="listbox" aria-label="Translations">
            {filtered.map((translation) => {
              const selected = Number(translation.id) === Number(activeId)
              return (
                <button
                  key={translation.id}
                  type="button"
                  className={selected ? 'qmr-translation-option active' : 'qmr-translation-option'}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(Number(translation.id))
                    setOpen(false)
                  }}
                >
                  <span>{translation.name}</span>
                  {selected && <span aria-hidden="true">✓</span>}
                </button>
              )
            })}
            {filtered.length === 0 && <div className="qmr-translation-empty">No translations match “{query}”.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

const AyahRow = memo(function AyahRow({
  verse,
  active,
  target,
  activePlaying,
  activePaused,
  bookmarked,
  menuOpen,
  script,
  showTranslation,
  studyBefore,
  studyArabic,
  studyTranslation,
  studyActions,
  sourceActions,
  playbackContextKey,
  bookmarkContextKey,
  registerRef,
  onPause,
  onResume,
  onPlayAyah,
  onPlayFromAyah,
  onToggleBookmark,
  onShare,
  onToggleMenu,
  onCopy,
}) {
  const indopak = script === 'indopak'
  const arabicClass = indopak ? 'qmr-arabic qmr-arabic--indopak' : 'qmr-arabic'
  const renderArabic = () => {
    if (verse.words && verse.words.length > 0) {
      return (
        <p className={arabicClass} dir="rtl" lang="ar">
          {verse.words.map((word, index) => (
            <span key={word.position}>
              {index > 0 ? ' ' : ''}
              <span
                className="qmr-word"
                tabIndex={0}
                data-tip={word.transliteration ? `${word.translation}\n${word.transliteration}` : word.translation}
              >
                {indopak ? word.text_indopak : word.text_uthmani}
              </span>
            </span>
          ))}
        </p>
      )
    }
    return <p className={arabicClass} dir="rtl" lang="ar">{indopak ? verse.text_indopak : verse.text_uthmani}</p>
  }

  return (
    <li
      ref={(el) => registerRef(verse.verse_key, el)}
      className={`qmr-ayah${active ? ' active' : ''}${target ? ' target' : ''}`}
    >
      <div className="qmr-ayah-toprow">
        <span className="qmr-ayah-key">{verse.verse_key}</span>
        <button
          type="button"
          className="qmr-ayah-play qmr-ayah-control-icon"
          aria-label={activePlaying ? 'Pause this ayah' : 'Play this ayah only'}
          data-qmr-tooltip={activePlaying ? 'Pause' : 'Play this ayah'}
          title={activePlaying ? 'Pause' : 'Play this ayah'}
          onClick={() => {
            if (activePlaying) onPause()
            else if (activePaused) onResume()
            else onPlayAyah(verse.verse_key)
          }}
        >
          {activePlaying ? <IconPause size={16} /> : <IconPlay size={15} />}
        </button>
        <button
          type="button"
          className="qmr-ayah-play qmr-ayah-control-icon qmr-ayah-play-continuous"
          aria-label="Play continuously from this ayah to the end of the Surah"
          data-qmr-tooltip="Play continuously from here"
          title="Play continuously from here"
          onClick={() => onPlayFromAyah(verse.verse_key)}
        >
          <IconContinuous size={17} />
        </button>
        <span className="qmr-ayah-action-spacer" />
        <button
          type="button"
          className={bookmarked ? 'qmr-ayah-action saved' : 'qmr-ayah-action'}
          aria-label={bookmarked ? 'Remove saved ayah' : 'Save ayah'}
          data-qmr-tooltip={bookmarked ? 'Remove from Saved' : 'Save ayah'}
          title={bookmarked ? 'Remove from Saved' : 'Save ayah'}
          onClick={() => onToggleBookmark(verse)}
        >
          <IconBookmark filled={bookmarked} />
        </button>
        <button
          type="button"
          className="qmr-ayah-action"
          aria-label="Copy or share ayah link"
          data-qmr-tooltip="Copy or share"
          title="Copy or share"
          onClick={() => onShare(verse)}
        >
          <IconLink />
        </button>
        <div className="qmr-ayah-more-wrap">
          <button
            type="button"
            className="qmr-ayah-action"
            aria-label="More ayah actions"
            aria-expanded={menuOpen}
            data-qmr-tooltip="More actions"
            title="More actions"
            onClick={() => onToggleMenu(verse.verse_key)}
          >
            <IconMore />
          </button>
          {menuOpen && (
            <div className="qmr-ayah-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => onCopy(verse, 'link')}>Copy verse link</button>
              <button type="button" role="menuitem" onClick={() => onCopy(verse, 'arabic')}>Copy Arabic</button>
              <button type="button" role="menuitem" onClick={() => onCopy(verse, 'both')}>Copy Arabic + translation</button>
            </div>
          )}
        </div>
      </div>
      {studyBefore}
      <div className="qmr-ayah-text">
        {studyArabic || renderArabic()}
        {showTranslation && (studyTranslation === undefined ? <p className="qmr-translation">{verse.translation_text}</p> : studyTranslation)}
        {studyActions}
        {sourceActions}
      </div>
    </li>
  )
}, (prev, next) => (
  prev.verse === next.verse &&
  prev.active === next.active &&
  prev.target === next.target &&
  prev.activePlaying === next.activePlaying &&
  prev.activePaused === next.activePaused &&
  prev.bookmarked === next.bookmarked &&
  prev.menuOpen === next.menuOpen &&
  prev.script === next.script &&
  prev.showTranslation === next.showTranslation &&
  prev.studyBefore === next.studyBefore &&
  prev.studyArabic === next.studyArabic &&
  prev.studyTranslation === next.studyTranslation &&
  prev.studyActions === next.studyActions &&
  prev.sourceActions === next.sourceActions &&
  prev.playbackContextKey === next.playbackContextKey &&
  prev.bookmarkContextKey === next.bookmarkContextKey
))

export default function QuranPage() {
  const initialSettings = useMemo(loadSettings, [])
  const initialBridge = useMemo(() => (typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] || null : null), [])
  const initialLocation = useMemo(() => {
    if (initialBridge?.active && Number(initialBridge.chapterNumber)) {
      return {
        chapterNumber: Number(initialBridge.chapterNumber),
        ayah: Number(initialBridge.currentAyahKey?.split(':')?.[1]) || null,
      }
    }
    return getInitialLocation(initialSettings)
  }, [initialSettings, initialBridge])

  const [chapters, setChapters] = useState([])
  const [chaptersError, setChaptersError] = useState(null)
  const [translations, setTranslations] = useState([])
  const [recitations, setRecitations] = useState([])
  const [recitationsError, setRecitationsError] = useState(null)

  const [chapterNumber, setChapterNumber] = useState(initialLocation.chapterNumber)
  const [translationId, setTranslationId] = useState(Number(initialSettings.translationId) || DEFAULT_TRANSLATION_ID)
  // Quran.com chapter-reciter IDs and MP3Quran timing-read IDs are different.
  // Only reuse a saved reciter after it was saved by the current audio provider.
  const [recitationId, setRecitationId] = useState(
    initialBridge?.active && Number(initialBridge.recitationId)
      ? Number(initialBridge.recitationId)
      : (initialSettings.audioProvider === AUDIO_PROVIDER_KEY && initialSettings.recitationChosen
          ? (Number(initialSettings.recitationId) || DEFAULT_RECITATION_ID)
          : DEFAULT_RECITATION_ID)
  )
  const [script, setScript] = useState(initialSettings.script === 'indopak' ? 'indopak' : 'uthmani')
  const [arabicSize, setArabicSize] = useState(initialSettings.arabicSize || 30)
  const [translationSize, setTranslationSize] = useState(initialSettings.translationSize || 17)
  const [showTranslation, setShowTranslation] = useState(initialSettings.showTranslation !== false)
  const initialQuranMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        const requested = url.searchParams.get('quranMode')
        if (['reader', 'study', 'sources'].includes(requested)) return requested
        if (url.searchParams.get('study') === '1') return 'study'
      } catch {}
    }
    return ['reader', 'study', 'sources'].includes(initialSettings.quranMode) ? initialSettings.quranMode : (initialSettings.studyMode ? 'study' : 'reader')
  }, [initialSettings])
  const [quranMode, setQuranMode] = useState(initialQuranMode)
  const studyMode = quranMode === 'study'
  const sourcesMode = quranMode === 'sources'
  const [studyLanguage, setStudyLanguage] = useState(['english', 'arabic', 'both'].includes(initialSettings.studyLanguage) ? initialSettings.studyLanguage : 'both')
  const [rabtHoverEnabled, setRabtHoverEnabled] = useState(initialSettings.rabtHoverEnabled !== false)
  const [rabtHoverSize, setRabtHoverSize] = useState(['compact', 'standard', 'large'].includes(initialSettings.rabtHoverSize) ? initialSettings.rabtHoverSize : 'compact')
  const [vocabArabicSize, setVocabArabicSize] = useState(() => {
    const saved = Number(initialSettings.vocabArabicSize)
    return Number.isFinite(saved) ? Math.min(34, Math.max(16, saved)) : 22
  })
  const [studyDialog, setStudyDialog] = useState(null)
  const [sourceDialog, setSourceDialog] = useState(null)
  const { store: studyStore, loading: studyLoading } = usePortalStudy(chapterNumber, true, quranMode !== 'reader')

  const [bookmarks, setBookmarks] = useState(() => loadBookmarks())
  const [searchOpen, setSearchOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [actionVerseKey, setActionVerseKey] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pendingJump, setPendingJump] = useState(
    initialLocation.ayah ? { chapter: initialLocation.chapterNumber, ayah: initialLocation.ayah } : null
  )
  const [targetAyahKey, setTargetAyahKey] = useState(
    initialLocation.ayah ? `${initialLocation.chapterNumber}:${initialLocation.ayah}` : null
  )

  const [verses, setVerses] = useState([])
  const [versesLoading, setVersesLoading] = useState(true)
  const [versesError, setVersesError] = useState(null)

  const [audioState, setAudioState] = useState(
    initialBridge?.active ? (initialBridge.audio?.paused ? 'paused' : 'playing') : 'idle'
  ) // idle | loading | playing | paused
  const [audioMode, setAudioMode] = useState(initialBridge?.active ? initialBridge.mode : null) // 'ayah' | 'surah' | 'range'
  const [currentAyahKey, setCurrentAyahKey] = useState(initialBridge?.active ? initialBridge.currentAyahKey : null)
  const [audioErrorMsg, setAudioErrorMsg] = useState(null)
  const [repeatAyah, setRepeatAyah] = useState(Boolean(initialBridge?.active && initialBridge.repeatAyah))
  const [loopEnabled, setLoopEnabled] = useState(Boolean(initialBridge?.active && initialBridge.loopEnabled))
  const [volume, setVolume] = useState(Number.isFinite(initialBridge?.audio?.volume) ? initialBridge.audio.volume : 1)
  const [playbackRate, setPlaybackRate] = useState(Number.isFinite(initialBridge?.audio?.playbackRate) ? initialBridge.audio.playbackRate : 1)
  const [rangeFrom, setRangeFrom] = useState(1)
  const [rangeTo, setRangeTo] = useState(1)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [readModeOpen, setReadModeOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return new URL(window.location.href).searchParams.get('mode') === 'read' } catch { return false }
  })
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false)
  const [audioPos, setAudioPos] = useState({ t: 0, d: 0 })
  const [playerPosition, setPlayerPosition] = useState(null)

  const audioSelectionKey = `${recitationId}:${chapterNumber}`
  const audioRef = useRef(null)
  const playerRef = useRef(null)
  const playerDragRef = useRef(null)
  const subbarRef = useRef(null)
  const audioPosSecRef = useRef(-1)
  const ayahRefs = useRef(new Map())
  // Gapless track for the current chapter+reciter: one MP3 for the whole
  // Surah plus per-ayah millisecond timestamps. No per-verse file swaps.
  const trackRef = useRef(initialBridge?.active ? initialBridge.track : null) // { key, audioUrl, timestamps: [{verse_key, from, to}] }
  const audioModeRef = useRef(initialBridge?.active ? initialBridge.mode : null)
  const repeatAyahRef = useRef(Boolean(initialBridge?.active && initialBridge.repeatAyah))
  const loopEnabledRef = useRef(Boolean(initialBridge?.active && initialBridge.loopEnabled))
  const stopAtMsRef = useRef(initialBridge?.active ? initialBridge.stopAtMs : null) // stop boundary for ayah/range modes
  const rangeRef = useRef(initialBridge?.active ? initialBridge.range : null) // { fromMs, toMs } for range looping
  const currentKeyRef = useRef(initialBridge?.active ? initialBridge.currentAyahKey : null)
  const noticeTimerRef = useRef(null)
  const trackLoadRef = useRef(null) // { key, controller, promise }
  const playRequestRef = useRef(0)
  const searchAbortRef = useRef(null)
  const pendingReciterSwitchRef = useRef(null)
  const audioSelectionRef = useRef(audioSelectionKey)
  audioSelectionRef.current = audioSelectionKey

  useEffect(() => { audioModeRef.current = audioMode }, [audioMode])
  useEffect(() => { repeatAyahRef.current = repeatAyah }, [repeatAyah])
  useEffect(() => { loopEnabledRef.current = loopEnabled }, [loopEnabled])

  function beginPlayerDrag(event) {
    if (event.button !== 0) return
    if (event.target.closest?.('button,input,select,textarea,a,label,[role="button"],.qmr-reciter-control')) return
    const box = playerRef.current?.getBoundingClientRect()
    if (!box) return
    event.preventDefault()
    playerDragRef.current = {
      pointerId: event.pointerId,
      dx: event.clientX - box.left,
      dy: event.clientY - box.top,
      width: box.width,
      height: box.height,
    }
    setPlayerPosition({ left: box.left, top: box.top })
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch {}
  }

  useEffect(() => {
    const onMove = (event) => {
      const drag = playerDragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      const edge = 8
      const left = Math.max(edge, Math.min(event.clientX - drag.dx, window.innerWidth - drag.width - edge))
      const top = Math.max(edge, Math.min(event.clientY - drag.dy, window.innerHeight - drag.height - edge))
      setPlayerPosition({ left, top })
    }
    const onEnd = (event) => {
      const drag = playerDragRef.current
      if (!drag || (event.pointerId != null && event.pointerId !== drag.pointerId)) return
      playerDragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [])

  useEffect(() => {
    if (!playerPosition) return undefined
    const clamp = () => {
      const box = playerRef.current?.getBoundingClientRect()
      if (!box) return
      const edge = 8
      setPlayerPosition((current) => current ? {
        left: Math.max(edge, Math.min(current.left, window.innerWidth - box.width - edge)),
        top: Math.max(edge, Math.min(current.top, window.innerHeight - box.height - edge)),
      } : current)
    }
    window.addEventListener('resize', clamp)
    return () => window.removeEventListener('resize', clamp)
  }, [Boolean(playerPosition)])

  const activeChapterInfo = chapters.find((c) => c.id === chapterNumber)
  const activeReciterInfo = recitations.find((r) => Number(r.id) === Number(recitationId))
  const activeReciterName = activeReciterInfo?.name || 'Selected reciter'

  useEffect(() => {
    if (initialSettings.audioProvider === AUDIO_PROVIDER_KEY) return
    saveSettings({ audioProvider: AUDIO_PROVIDER_KEY, recitationChosen: false, recitationId: 0 })
  }, [initialSettings])
  const verseCount = activeChapterInfo?.verse_count || 1
  const bookmarkedKeys = useMemo(() => new Set(bookmarks.map((item) => item.verseKey)), [bookmarks])
  const bookmarkContextKey = `${chapterNumber}:${translationId}:${script}:${activeChapterInfo?.english_name || ''}`

  const studySnapshotAvailable = Boolean(studyStore?.snapshotAvailable && (studyStore?.snapshotVerseKeys || []).length)
  const sourcesSnapshotAvailable = Boolean(studyStore?.sourcesAvailable && (studyStore?.sourceVerseKeys || []).length)
  const enhancedModesAvailable = studySnapshotAvailable || sourcesSnapshotAvailable

  useEffect(() => {
    if (quranMode === 'study' && !studySnapshotAvailable) {
      setQuranMode('reader')
      setStudyDialog(null)
    }
    if (quranMode === 'sources' && !sourcesSnapshotAvailable) {
      setQuranMode('reader')
      setSourceDialog(null)
    }
  }, [quranMode, chapterNumber, studySnapshotAvailable, sourcesSnapshotAvailable])

  // Build Study/Source presentation only when Study data or Reader content changes.
  // Audio progress, menus, and other Reader updates can then keep memoized ayah rows stable.
  const studyPresentationByVerse = useMemo(() => {
    const map = new Map()
    if (!studyMode) return map
    for (const verse of verses) {
      map.set(verse.verse_key, makePortalAyahStudy({
        verse,
        store: studyStore,
        onOpen: setStudyDialog,
        script,
        languageMode: studyLanguage,
        rabtHoverEnabled,
        rabtHoverSize,
      }))
    }
    return map
  }, [studyMode, verses, studyStore, script, studyLanguage, rabtHoverEnabled, rabtHoverSize])

  const sourceActionsByVerse = useMemo(() => {
    const map = new Map()
    if (!sourcesMode) return map
    for (const verse of verses) {
      map.set(verse.verse_key, <PortalSourceActions verseKey={verse.verse_key} store={studyStore} onOpen={setSourceDialog} />)
    }
    return map
  }, [sourcesMode, verses, studyStore])

  // The surah bar sticks below the site header on desktop (where the header
  // is sticky) and at the very top on mobile (where the header is static and
  // scrolls away). Track both the header's height and its computed position.
  useEffect(() => {
    const subbar = subbarRef.current
    const header = document.querySelector('.site-header')
    if (!subbar || !header) return
    const apply = () => {
      const headerIsPinned = ['sticky', 'fixed'].includes(getComputedStyle(header).position)
      subbar.style.setProperty('--qmr-subbar-top', headerIsPinned ? `${header.offsetHeight}px` : '0px')
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(header)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  useEffect(() => {
    const bridge = ensureGlobalAudioBridge()
    if (!bridge) return undefined
    const el = bridge.audio
    audioRef.current = el

    if (bridge.active) {
      trackRef.current = bridge.track || trackRef.current
      currentKeyRef.current = bridge.currentAyahKey || currentKeyRef.current
      stopAtMsRef.current = bridge.stopAtMs ?? stopAtMsRef.current
      rangeRef.current = bridge.range || rangeRef.current
      setAudioPos({ t: Math.floor(el.currentTime || 0), d: Number.isFinite(el.duration) ? el.duration : 0 })
    }

    const onTimeUpdate = () => handleTimeUpdate()
    const onEnded = () => handleEnded()
    const onError = () => setAudioErrorMsg('This audio file failed to load.')
    const onExternalStop = () => {
      setAudioState('idle')
      setAudioMode(null)
      setCurrentAyahKey(null)
      setPlayerMenuOpen(false)
      setAudioPos({ t: 0, d: 0 })
    }

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('ended', onEnded)
    el.addEventListener('error', onError)
    window.addEventListener('talweeh:quran-audio-stopped', onExternalStop)
    bridge.render()

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('error', onError)
      window.removeEventListener('talweeh:quran-audio-stopped', onExternalStop)
      audioRef.current = null
      bridge.render()
    }
    // The bridge owns the audio element for the life of the SPA. Component
    // listeners are attached only while the Qur'an Reader page is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setChapterLocation(chapter) {
    setStudyDialog(null)
    setSourceDialog(null)
    const next = Math.min(114, Math.max(1, Number(chapter) || 1))
    setPendingJump(null)
    setTargetAyahKey(null)
    setChapterNumber(next)
    const url = new URL(window.location.href)
    url.pathname = '/quran'
    url.search = ''
    url.searchParams.set('surah', String(next))
    window.history.replaceState({}, '', url)
  }

  function goToChapter(offset) {
    setChapterLocation(chapterNumber + offset)
  }

  useEffect(() => {
    fetchChapterListDirect()
      .then((list) => { setChapters(list); setChaptersError(null) })
      .catch((e) => setChaptersError(String(e.message || e)))

    const list = DIRECT_TRANSLATIONS.map(({ id, name }) => ({ id, name }))
    setTranslations(list)
    setTranslationId((prev) => list.some((item) => Number(item.id) === Number(prev)) ? prev : DEFAULT_TRANSLATION_ID)

    fetchRecitationsDirect()
      .then((reciterList) => {
        setRecitations(reciterList)
        setRecitationsError(reciterList.length ? null : 'No timed reciters are available right now.')
        if (!reciterList.length) return
        setRecitationId((current) => {
          if (reciterList.some((r) => Number(r.id) === Number(current))) return current
          const preferred = reciterList.find((r) => /mishar|afasy|alafasy/i.test(r.name || '')) || reciterList[0]
          return Number(preferred.id)
        })
      })
      .catch((err) => {
        setRecitations([])
        setRecitationsError(String(err?.message || 'Reciters could not be loaded. Please try again.'))
      })
  }, [])

  useEffect(() => {
    if (!translationId) return
    let cancelled = false
    setVersesLoading(true)
    setVersesError(null)
    fetchVersesDirect(chapterNumber, translationId)
      .then((data) => {
        if (cancelled) return
        setVerses(data)

        // Word meanings/transliteration are an enhancement only. They load
        // after the Surah itself, so this can never make Arabic text fail.
        fetchWordDataDirect(chapterNumber)
          .then((byAyah) => {
            if (cancelled) return
            setVerses((current) => attachWordData(current, chapterNumber, byAyah))
          })
          .catch(() => {
            // Keep the reader fully usable if the optional word provider is unavailable.
          })
      })
      .catch((e) => {
        if (cancelled) return
        setVerses([])
        setVersesError(String(e?.message || e))
      })
      .finally(() => {
        if (!cancelled) setVersesLoading(false)
      })
    return () => { cancelled = true }
  }, [chapterNumber, translationId])

  // Keep a globally playing recitation alive when the reader is remounted.
  // A normal Surah/settings reciter change stops the old track. When the
  // reciter is changed from the floating player, preserve the current ayah and
  // automatically continue from the same place with the new reciter.
  useEffect(() => {
    const bridge = ensureGlobalAudioBridge()
    const resumingSameTrack = Boolean(
      bridge?.active && bridge.track?.key === audioSelectionKey && bridge.audio === audioRef.current
    )
    const pendingSwitch = pendingReciterSwitchRef.current?.id === Number(recitationId)
      ? pendingReciterSwitchRef.current
      : null

    if (resumingSameTrack) {
      trackRef.current = bridge.track
      currentKeyRef.current = bridge.currentAyahKey
      stopAtMsRef.current = bridge.stopAtMs
      rangeRef.current = bridge.range
      setAudioState(bridge.audio.paused ? 'paused' : 'playing')
      setAudioMode(bridge.mode)
      setCurrentAyahKey(bridge.currentAyahKey)
    } else if (pendingSwitch) {
      playRequestRef.current += 1
      audioRef.current?.pause()
      stopAtMsRef.current = null
      rangeRef.current = null
      currentKeyRef.current = pendingSwitch.verseKey
      setCurrentAyahKey(pendingSwitch.verseKey)
      setAudioMode(pendingSwitch.mode || 'surah')
      setAudioState('loading')
      setPlayerMenuOpen(false)
    } else {
      stopAudio()
    }

    if (!recitationId) return undefined
    if (trackLoadRef.current && trackLoadRef.current.key !== audioSelectionKey) {
      trackLoadRef.current.controller.abort()
      trackLoadRef.current = null
    }
    setRangeFrom(1)
    setRangeTo(activeChapterInfo?.verse_count || 1)
    const timer = window.setTimeout(() => {
      if (resumingSameTrack) return
      ;(async () => {
        try {
          const track = await loadTrack()
          if (!pendingSwitch || pendingReciterSwitchRef.current !== pendingSwitch) return
          const timestamp = tsForKey(track, pendingSwitch.verseKey) || track.timestamps?.[0]
          pendingReciterSwitchRef.current = null
          if (!timestamp) throw new Error('Audio not found for the current ayah with this reciter')

          if (pendingSwitch.wasPlaying) {
            const request = beginPlaybackRequest()
            await startPlayback(
              pendingSwitch.mode === 'ayah' ? 'ayah' : 'surah',
              timestamp.from,
              pendingSwitch.mode === 'ayah' ? timestamp.to : null,
              request
            )
            return
          }

          const el = audioRef.current
          if (el) {
            el.currentTime = timestamp.from / 1000
            el.pause()
          }
          currentKeyRef.current = timestamp.verse_key
          setCurrentAyahKey(timestamp.verse_key)
          setAudioMode(pendingSwitch.mode || 'surah')
          setAudioState('paused')
          const nextBridge = ensureGlobalAudioBridge()
          const selected = recitations.find((item) => Number(item.id) === Number(recitationId))
          if (nextBridge) {
            nextBridge.active = true
            nextBridge.track = track
            nextBridge.mode = pendingSwitch.mode || 'surah'
            nextBridge.currentAyahKey = timestamp.verse_key
            nextBridge.reciterName = selected?.name || 'Selected reciter'
            nextBridge.recitationId = recitationId
            nextBridge.chapterName = activeChapterInfo?.english_name || `Surah ${chapterNumber}`
            nextBridge.chapterNumber = chapterNumber
            nextBridge.stopAtMs = pendingSwitch.mode === 'ayah' ? timestamp.to : null
            nextBridge.range = null
            nextBridge.render()
          }
        } catch (err) {
          pendingReciterSwitchRef.current = null
          if (err?.name !== 'AbortError') {
            console.warn('Qurʾān audio prefetch failed:', err?.message || err)
            setAudioState('idle')
            setAudioErrorMsg(String(err?.message || err))
          }
        }
      })()
    }, 80)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSelectionKey, activeChapterInfo?.verse_count, recitationId])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    if (bridge) { bridge.audio.volume = volume; bridge.render() }
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    if (bridge) { bridge.audio.playbackRate = playbackRate; bridge.render() }
  }, [playbackRate])

  useEffect(() => {
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    if (!bridge) return
    bridge.repeatAyah = repeatAyah
    bridge.loopEnabled = loopEnabled
    bridge.render()
  }, [repeatAyah, loopEnabled])

  useEffect(() => {
    saveSettings({
      chapterNumber,
      translationId,
      recitationId,
      script,
      arabicSize,
      translationSize,
      showTranslation,
      quranMode,
      studyMode,
      studyLanguage,
      rabtHoverEnabled,
      rabtHoverSize,
      vocabArabicSize,
      audioProvider: AUDIO_PROVIDER_KEY,
    })
  }, [chapterNumber, translationId, recitationId, script, arabicSize, translationSize, showTranslation, quranMode, studyLanguage, rabtHoverEnabled, rabtHoverSize, vocabArabicSize])

  useEffect(() => {
    saveBookmarks(bookmarks)
  }, [bookmarks])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (quranMode === 'reader') url.searchParams.delete('quranMode')
      else url.searchParams.set('quranMode', quranMode)
      if (quranMode === 'study') url.searchParams.set('study', '1')
      else url.searchParams.delete('study')
      window.history.replaceState({}, '', url)
    } catch {}
  }, [quranMode])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--qmr-vocab-arabic-size', `${vocabArabicSize}px`)
  }, [vocabArabicSize])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setPickerOpen(false)
      setSettingsOpen(false)
      setSearchOpen(false)
      setSavedOpen(false)
      setActionVerseKey(null)
      setStudyDialog(null)
      setSourceDialog(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!actionVerseKey && !playerMenuOpen) return undefined
    const onPointerDown = (event) => {
      if (actionVerseKey && !event.target.closest?.('.qmr-ayah-more-wrap')) setActionVerseKey(null)
      if (playerMenuOpen && !event.target.closest?.('.qmr-player-menu-wrap')) setPlayerMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [actionVerseKey, playerMenuOpen])

  useEffect(() => {
    if (!pendingJump || versesLoading || verses.length === 0 || pendingJump.chapter !== chapterNumber) return
    const info = chapters.find((c) => c.id === pendingJump.chapter)
    if (info && pendingJump.ayah > info.verse_count) {
      showNotice(`Surah ${info.english_name} has ${info.verse_count} ayahs.`)
      setPendingJump(null)
      return
    }
    const key = `${pendingJump.chapter}:${pendingJump.ayah}`
    const el = ayahRefs.current.get(key)
    if (!el) return
    setTargetAyahKey(key)
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    const url = new URL(window.location.href)
    url.pathname = '/quran'
    url.search = ''
    url.searchParams.set('surah', String(pendingJump.chapter))
    url.searchParams.set('ayah', String(pendingJump.ayah))
    window.history.replaceState({}, '', url)
    setPendingJump(null)
    const timer = window.setTimeout(() => setTargetAyahKey(null), 2800)
    return () => window.clearTimeout(timer)
  }, [pendingJump, versesLoading, verses, chapterNumber, chapters])

  useEffect(() => {
    if (currentAyahKey && audioState === 'playing') {
      const el = ayahRefs.current.get(currentAyahKey)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentAyahKey, audioState])

  function showNotice(message) {
    setNotice(message)
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2400)
  }

  function closeReaderPanels() {
    setPickerOpen(false)
    setSettingsOpen(false)
    setSearchOpen(false)
    setSavedOpen(false)
    setActionVerseKey(null)
  }

  function setReadModeInUrl(enabled) {
    try {
      const url = new URL(window.location.href)
      if (enabled) url.searchParams.set('mode', 'read')
      else url.searchParams.delete('mode')
      window.history.replaceState({}, '', url)
    } catch {
      // URL state is convenience only; Read Mode itself still works.
    }
  }

  function openReadMode() {
    closeReaderPanels()
    setReadModeInUrl(true)
    setReadModeOpen(true)
  }

  function closeReadMode() {
    setReadModeOpen(false)
    setReadModeInUrl(false)
  }

  function jumpToAyah(chapter, ayah) {
    const chapterNumberValue = Number(chapter)
    const ayahNumberValue = Number(ayah)
    if (!Number.isInteger(chapterNumberValue) || chapterNumberValue < 1 || chapterNumberValue > 114 ||
        !Number.isInteger(ayahNumberValue) || ayahNumberValue < 1) return
    closeReaderPanels()
    setTargetAyahKey(`${chapterNumberValue}:${ayahNumberValue}`)
    setPendingJump({ chapter: chapterNumberValue, ayah: ayahNumberValue })
    setChapterNumber(chapterNumberValue)
  }

  function bookmarkForVerse(v) {
    return bookmarks.find((item) => item.verseKey === v.verse_key)
  }

  function toggleBookmark(v) {
    const existing = bookmarkForVerse(v)
    if (existing) {
      setBookmarks((current) => current.filter((item) => item.verseKey !== v.verse_key))
      showNotice(`${v.verse_key} removed from Saved`)
      return
    }
    const chapterName = activeChapterInfo?.english_name || `Surah ${chapterNumber}`
    const arabic = script === 'indopak' ? v.text_indopak : v.text_uthmani
    setBookmarks((current) => [{
      verseKey: v.verse_key,
      chapterNumber,
      verseNumber: v.verse_number_in_surah,
      chapterName,
      arabic,
      translation: v.translation_text,
      translationId,
      savedAt: Date.now(),
    }, ...current])
    showNotice(`${v.verse_key} saved`)
  }

  async function shareVerse(v) {
    const arabic = script === 'indopak' ? v.text_indopak : v.text_uthmani
    const url = verseShareUrl(chapterNumber, v.verse_number_in_surah)
    const text = `${arabic}\n\n${v.translation_text}\n\nQurʾān ${v.verse_key}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `Qurʾān ${v.verse_key}`, text, url })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    const ok = await copyText(url)
    showNotice(ok ? 'Verse link copied' : 'Unable to copy verse link')
  }

  async function copyVerseOption(v, option) {
    const arabic = script === 'indopak' ? v.text_indopak : v.text_uthmani
    let text = ''
    if (option === 'link') text = verseShareUrl(chapterNumber, v.verse_number_in_surah)
    if (option === 'arabic') text = `${arabic}\n— Qurʾān ${v.verse_key}`
    if (option === 'both') text = `${arabic}\n\n${v.translation_text}\n— Qurʾān ${v.verse_key}\n${verseShareUrl(chapterNumber, v.verse_number_in_surah)}`
    const ok = await copyText(text)
    setActionVerseKey(null)
    showNotice(ok ? 'Copied' : 'Unable to copy')
  }

  function chapterForReference(chapter) {
    return chapters.find((item) => Number(item.id) === Number(chapter)) || null
  }

  function makeReferenceSuggestion(reference) {
    const info = chapterForReference(reference.chapter)
    if (info && reference.ayah > Number(info.verse_count || 0)) return null
    return {
      verseKey: `${reference.chapter}:${reference.ayah}`,
      chapterNumber: reference.chapter,
      ayahNumber: reference.ayah,
      chapterName: info?.english_name || `Surah ${reference.chapter}`,
      chapterArabicName: info?.name_arabic || '',
      referenceOnly: true,
    }
  }

  async function performSearch(rawQuery, { automatic = false } = {}) {
    const query = String(rawQuery || '').trim()
    if (!query) {
      searchAbortRef.current?.abort()
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }

    const reference = parseVerseReference(query)
    if (reference) {
      searchAbortRef.current?.abort()
      const suggestion = makeReferenceSuggestion(reference)
      setSearchLoading(false)
      if (suggestion) {
        setSearchResults([suggestion])
        setSearchError(null)
      } else {
        const info = chapterForReference(reference.chapter)
        setSearchResults([])
        setSearchError(info ? `${info.english_name} has ${info.verse_count} ayahs.` : 'That verse reference is not available.')
      }
      return
    }

    if (automatic && query.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    setSearchLoading(true)
    setSearchError(null)
    try {
      const results = await searchQuranDirect(query, translationId)
      if (controller.signal.aborted) return
      setSearchResults(results)
      if (!results.length) setSearchError(`Not found. No ayahs match “${query}”.`)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setSearchResults([])
      setSearchError(`Not found. No ayahs match “${query}”.`)
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null
        setSearchLoading(false)
      }
    }
  }

  function runSearch(event) {
    event?.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    const reference = parseVerseReference(query)
    if (reference) {
      const suggestion = makeReferenceSuggestion(reference)
      if (suggestion) jumpToAyah(reference.chapter, reference.ayah)
      else performSearch(query)
      return
    }
    performSearch(query)
  }

  useEffect(() => {
    if (!searchOpen) return undefined
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return undefined
    }
    const timer = window.setTimeout(() => {
      performSearch(query, { automatic: true })
    }, 240)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, searchQuery, translationId, chapters])

  function openSearch() {
    setSearchOpen(true)
    setSavedOpen(false)
    setSettingsOpen(false)
    setPickerOpen(false)
    setActionVerseKey(null)
  }

  function openSaved() {
    setSavedOpen(true)
    setSearchOpen(false)
    setSettingsOpen(false)
    setPickerOpen(false)
    setActionVerseKey(null)
  }

  function changeReciterFromPlayer(id) {
    const nextId = Number(id)
    if (!Number.isInteger(nextId) || nextId <= 0 || nextId === Number(recitationId)) return
    pendingReciterSwitchRef.current = {
      id: nextId,
      verseKey: currentKeyRef.current || `${chapterNumber}:1`,
      mode: audioModeRef.current || 'surah',
      wasPlaying: audioState === 'playing' || audioState === 'loading',
    }
    setRecitationId(nextId)
    saveSettings({ recitationChosen: true, audioProvider: AUDIO_PROVIDER_KEY })
  }

  // Load the gapless Surah track (one MP3 + timestamps). Requests are keyed
  // by chapter+reciter and stale in-flight loads are aborted when the user
  // changes selection. Timestamp maps make the hot playback path O(1).
  async function loadTrack() {
    const key = audioSelectionRef.current
    if (trackRef.current?.key === key) return trackRef.current
    if (trackLoadRef.current?.key === key) return trackLoadRef.current.promise

    if (trackLoadRef.current) trackLoadRef.current.controller.abort()
    const controller = new AbortController()
    const [selectedRecitation, selectedChapter] = key.split(':').map(Number)

    const promise = (async () => {
      if (!selectedRecitation) throw new Error('Choose a reciter in Reader settings first.')
      const selected = recitations.find((item) => Number(item.id) === Number(selectedRecitation))
      if (!selected?.folderUrl) throw new Error('This reciter is not available for timed playback.')
      const params = new URLSearchParams({ surah: String(selectedChapter), read: String(selectedRecitation) })
      const timingPayload = await fetchJson(`${MP3QURAN_BASE}/ayat_timing?${params}`, 'Unable to load audio timing for this reciter', { signal: controller.signal })
      const rows = Array.isArray(timingPayload) ? timingPayload : []
      const data = {
        audioUrl: `${selected.folderUrl.endsWith('/') ? selected.folderUrl : `${selected.folderUrl}/`}${padSurah(selectedChapter)}.mp3`,
        timestamps: rows
          .map((row) => ({ ayah: Number(row.ayah), from: Number(row.start_time), to: Number(row.end_time) }))
          .filter((row) => Number.isInteger(row.ayah) && row.ayah >= 1 && Number.isFinite(row.from) && Number.isFinite(row.to) && row.to > row.from)
          .sort((a, b) => a.ayah - b.ayah)
          .map((row) => ({ verse_key: `${selectedChapter}:${row.ayah}`, from: row.from, to: row.to })),
      }
      if (!data.timestamps.length) throw new Error('This reciter does not have timing data for this Surah. Choose another reciter.')
      if (audioSelectionRef.current !== key) {
        const stale = new Error('Audio selection changed')
        stale.name = 'AbortError'
        throw stale
      }
      const timestamps = Array.isArray(data.timestamps) ? data.timestamps : []
      const timestampByKey = new Map()
      const timestampIndexByKey = new Map()
      timestamps.forEach((timestamp, index) => {
        timestampByKey.set(timestamp.verse_key, timestamp)
        timestampIndexByKey.set(timestamp.verse_key, index)
      })
      const track = {
        key,
        chapterNumber: selectedChapter,
        audioUrl: data.audioUrl,
        timestamps,
        timestampByKey,
        timestampIndexByKey,
      }
      trackRef.current = track
      const bridge = ensureGlobalAudioBridge()
      if (bridge) {
        bridge.track = track
        bridge.chapterNumber = selectedChapter
        bridge.recitationId = selectedRecitation
      }
      if (audioRef.current && audioRef.current.src !== data.audioUrl) {
        audioRef.current.src = data.audioUrl
        audioRef.current.volume = volume
        audioRef.current.playbackRate = playbackRate
        audioRef.current.load()
      }
      return track
    })().finally(() => {
      if (trackLoadRef.current?.key === key) trackLoadRef.current = null
    })

    trackLoadRef.current = { key, controller, promise }
    return promise
  }

  function tsForVerse(track, verseNumberInSurah) {
    return track.timestampByKey.get(`${track.chapterNumber}:${verseNumberInSurah}`)
  }

  function tsForKey(track, verseKey) {
    return track.timestampByKey.get(verseKey)
  }

  function beginPlaybackRequest() {
    return { id: ++playRequestRef.current, key: audioSelectionRef.current }
  }

  function isPlaybackRequestCurrent(request) {
    return request.id === playRequestRef.current && request.key === audioSelectionRef.current
  }

  function stopAudio() {
    playRequestRef.current += 1
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    stopAtMsRef.current = null
    rangeRef.current = null
    currentKeyRef.current = null
    audioPosSecRef.current = -1
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    if (bridge) {
      bridge.active = false
      bridge.mode = null
      bridge.currentAyahKey = null
      bridge.stopAtMs = null
      bridge.range = null
      bridge.render()
    }
    setAudioState('idle')
    setAudioMode(null)
    setCurrentAyahKey(null)
    setPlayerMenuOpen(false)
    setAudioPos({ t: 0, d: 0 })
  }

  // Manual scrub on the player's seek bar. Clears any ayah/range stop
  // boundary — once the listener takes the wheel, play through to the end.
  function seekTo(seconds) {
    const el = audioRef.current
    if (!el) return
    stopAtMsRef.current = null
    rangeRef.current = null
    audioModeRef.current = 'surah'
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    if (bridge) {
      bridge.mode = 'surah'
      bridge.stopAtMs = null
      bridge.range = null
    }
    setAudioMode('surah')
    el.currentTime = seconds
    updateCurrentAyah(seconds * 1000)
    setAudioPos((p) => ({ ...p, t: seconds }))
  }

  function formatTime(totalSeconds = 0) {
    const s = Math.max(0, Math.floor(totalSeconds))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  function pauseAudio() {
    audioRef.current?.pause()
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    bridge?.render()
    setAudioState('paused')
  }

  function resumeAudio() {
    audioRef.current?.play().catch(() => setAudioErrorMsg('Playback was blocked by the browser.'))
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    if (bridge) { bridge.active = true; bridge.render() }
    setAudioState('playing')
  }

  async function startPlayback(mode, seekMs, stopMs, request) {
    if (!isPlaybackRequestCurrent(request)) return
    setAudioErrorMsg(null)
    setAudioMode(mode)
    audioModeRef.current = mode
    stopAtMsRef.current = stopMs ?? null
    updateCurrentAyah(seekMs)
    const el = audioRef.current
    if (!el) return
    const selectedReciter = recitations.find((item) => Number(item.id) === Number(recitationId))
    const bridge = ensureGlobalAudioBridge()
    if (bridge) {
      bridge.active = true
      bridge.track = trackRef.current
      bridge.mode = mode
      bridge.currentAyahKey = currentKeyRef.current
      bridge.reciterName = selectedReciter?.name || 'Selected reciter'
      bridge.recitationId = recitationId
      bridge.chapterName = activeChapterInfo?.english_name || `Surah ${chapterNumber}`
      bridge.chapterNumber = chapterNumber
      bridge.stopAtMs = stopMs ?? null
      bridge.range = rangeRef.current
      bridge.loopEnabled = loopEnabledRef.current
      bridge.repeatAyah = repeatAyahRef.current
      bridge.render()
    }
    el.currentTime = seekMs / 1000
    try {
      // play() is invoked before the first await. When prefetch has already
      // prepared the current track, this preserves the iOS user gesture.
      const playPromise = el.play()
      await playPromise
      if (!isPlaybackRequestCurrent(request)) {
        el.pause()
        return
      }
      if (bridge) { bridge.active = true; bridge.render() }
      setAudioState('playing')
    } catch (err) {
      if (!isPlaybackRequestCurrent(request)) return
      setAudioState('idle')
      setAudioErrorMsg('Playback was blocked by the browser — press play again.')
    }
  }

  async function playAyah(verseKey) {
    const request = beginPlaybackRequest()
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      const track = trackRef.current?.key === request.key ? trackRef.current : await loadTrack()
      if (!isPlaybackRequestCurrent(request)) return
      const ts = tsForKey(track, verseKey)
      if (!ts) throw new Error('Audio not found for this ayah')
      rangeRef.current = null
      await startPlayback('ayah', ts.from, ts.to, request)
    } catch (err) {
      if (err?.name === 'AbortError' || !isPlaybackRequestCurrent(request)) return
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  // Continuous play: start at this ayah and keep going to the end of the
  // Surah (no stop boundary, unlike playAyah).
  async function playFromAyah(verseKey) {
    const request = beginPlaybackRequest()
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      const track = trackRef.current?.key === request.key ? trackRef.current : await loadTrack()
      if (!isPlaybackRequestCurrent(request)) return
      const ts = tsForKey(track, verseKey)
      if (!ts) throw new Error('Audio not found for this ayah')
      rangeRef.current = null
      await startPlayback('surah', ts.from, null, request)
    } catch (err) {
      if (err?.name === 'AbortError' || !isPlaybackRequestCurrent(request)) return
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  async function playSurahFromStart() {
    const request = beginPlaybackRequest()
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      const track = trackRef.current?.key === request.key ? trackRef.current : await loadTrack()
      if (!track || !isPlaybackRequestCurrent(request)) return
      rangeRef.current = null
      await startPlayback('surah', 0, null, request)
    } catch (err) {
      if (err?.name === 'AbortError' || !isPlaybackRequestCurrent(request)) return
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  async function playRange() {
    const from = Math.min(Math.max(1, rangeFrom), verseCount)
    const to = Math.min(Math.max(from, rangeTo), verseCount)
    const request = beginPlaybackRequest()
    setAudioState('loading')
    setAudioErrorMsg(null)
    try {
      const track = trackRef.current?.key === request.key ? trackRef.current : await loadTrack()
      if (!isPlaybackRequestCurrent(request)) return
      const fromTs = tsForVerse(track, from)
      const toTs = tsForVerse(track, to)
      if (!fromTs || !toTs) throw new Error('Audio not found for that range')
      rangeRef.current = { fromMs: fromTs.from, toMs: toTs.to }
      await startPlayback('range', fromTs.from, toTs.to, request)
    } catch (err) {
      if (err?.name === 'AbortError' || !isPlaybackRequestCurrent(request)) return
      setAudioState('idle')
      setAudioErrorMsg(String(err.message || err))
    }
  }

  function currentTsIndex() {
    const track = trackRef.current
    if (!track || !currentKeyRef.current) return -1
    return track.timestampIndexByKey.get(currentKeyRef.current) ?? -1
  }

  function goToOffset(offset) {
    const track = trackRef.current
    const el = audioRef.current
    if (!track || !el || !audioModeRef.current) return
    const idx = currentTsIndex()
    if (idx === -1) return
    const target = track.timestamps[idx + offset]
    if (!target) return
    // In ayah mode, keep stopping at the (new) ayah's end.
    if (audioModeRef.current === 'ayah') stopAtMsRef.current = target.to
    el.currentTime = target.from / 1000
    updateCurrentAyah(target.from)
    const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
    if (bridge) {
      bridge.currentAyahKey = target.verse_key
      if (audioModeRef.current === 'ayah') bridge.stopAtMs = target.to
      bridge.render()
    }
  }

  function updateCurrentAyah(ms) {
    const track = trackRef.current
    if (!track || track.timestamps.length === 0) return

    const currentIndex = currentKeyRef.current ? track.timestampIndexByKey.get(currentKeyRef.current) : undefined
    if (currentIndex !== undefined) {
      const current = track.timestamps[currentIndex]
      if (ms >= current.from && ms < current.to) return
      const next = track.timestamps[currentIndex + 1]
      if (next && ms >= next.from && ms < next.to) {
        currentKeyRef.current = next.verse_key
        const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
        if (bridge) { bridge.currentAyahKey = next.verse_key; bridge.render() }
        setCurrentAyahKey(next.verse_key)
        return
      }
    }

    let low = 0
    let high = track.timestamps.length - 1
    let found = null
    while (low <= high) {
      const middle = Math.floor((low + high) / 2)
      const candidate = track.timestamps[middle]
      if (ms < candidate.from) high = middle - 1
      else if (ms >= candidate.to) low = middle + 1
      else {
        found = candidate
        break
      }
    }
    const key = found?.verse_key || null
    if (key && key !== currentKeyRef.current) {
      currentKeyRef.current = key
      const bridge = typeof window !== 'undefined' ? window[GLOBAL_AUDIO_BRIDGE_KEY] : null
      if (bridge) { bridge.currentAyahKey = key; bridge.render() }
      setCurrentAyahKey(key)
    }
  }

  // The gapless engine: one MP3 keeps playing; this handler tracks which ayah
  // the playhead is inside (for highlighting) and enforces stop/repeat/loop
  // boundaries by seeking — never by swapping audio files.
  function handleTimeUpdate() {
    const el = audioRef.current
    const track = trackRef.current
    if (!el || !track || el.paused) return
    const ms = el.currentTime * 1000

    // Feed the slim player's seek bar (1s granularity to keep rerenders cheap).
    const wholeSec = Math.floor(el.currentTime)
    if (wholeSec !== audioPosSecRef.current) {
      audioPosSecRef.current = wholeSec
      setAudioPos({ t: wholeSec, d: el.duration || 0 })
    }

    // Repeat current ayah: jump back to its start when crossing its end.
    if (repeatAyahRef.current && currentKeyRef.current) {
      const ts = track.timestampByKey.get(currentKeyRef.current)
      if (ts && ms >= ts.to) {
        el.currentTime = ts.from / 1000
        return
      }
    }

    // Stop boundary (ayah / range modes).
    if (stopAtMsRef.current !== null && ms >= stopAtMsRef.current) {
      if (audioModeRef.current === 'range' && loopEnabledRef.current && rangeRef.current) {
        el.currentTime = rangeRef.current.fromMs / 1000
        updateCurrentAyah(rangeRef.current.fromMs)
        return
      }
      stopAudio()
      return
    }

    // Some chapter files carry silence between consecutive ayah timestamps.
    // The current ayah index lets us inspect only the next gap instead of
    // scanning the entire Surah on every timeupdate event.
    const currentIndex = currentKeyRef.current ? track.timestampIndexByKey.get(currentKeyRef.current) : undefined
    if (currentIndex !== undefined && currentIndex < track.timestamps.length - 1) {
      const cur = track.timestamps[currentIndex]
      const next = track.timestamps[currentIndex + 1]
      if (ms >= cur.to && ms < next.from) {
        if (stopAtMsRef.current === null || next.from < stopAtMsRef.current) {
          el.currentTime = next.from / 1000
          updateCurrentAyah(next.from)
        }
        return
      }
    }

    updateCurrentAyah(ms)
  }

  // Natural end of the surah file (surah mode reaches here).
  function handleEnded() {
    if (audioModeRef.current === 'surah' && loopEnabledRef.current && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      return
    }
    stopAudio()
  }

  useEffect(() => {
    const modalOpen = settingsOpen || searchOpen || savedOpen || Boolean(studyDialog) || Boolean(sourceDialog)
    if (!modalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [settingsOpen, searchOpen, savedOpen, studyDialog, sourceDialog])

  function registerAyahRef(verseKey, el) {
    if (el) ayahRefs.current.set(verseKey, el)
    else ayahRefs.current.delete(verseKey)
  }

  function renderArabic(v) {
    const indopak = script === 'indopak'
    const cls = indopak ? 'qmr-arabic qmr-arabic--indopak' : 'qmr-arabic'
    if (v.words && v.words.length > 0) {
      return (
        <p className={cls} dir="rtl" lang="ar">
          {v.words.map((w, i) => (
            <span key={w.position}>
              {i > 0 ? ' ' : ''}
              <span
                className="qmr-word"
                tabIndex={0}
                data-tip={w.transliteration ? `${w.translation}\n${w.transliteration}` : w.translation}
              >
                {indopak ? w.text_indopak : w.text_uthmani}
              </span>
            </span>
          ))}
        </p>
      )
    }
    return <p className={cls} dir="rtl" lang="ar">{indopak ? v.text_indopak : v.text_uthmani}</p>
  }

  return (
    <div className="page-shell qmr-shell">
      <PageHeader />
      <QmrFloatingTooltip />
      <main>
        {/* ── Sticky surah bar (quran.com-style) ─────────── */}
        <div className="qmr-subbar" ref={subbarRef}>
          <div className="qmr-subbar-inner">
            <button
              type="button"
              className="qmr-surah-select"
              onClick={() => {
                setPickerOpen((o) => !o)
                setSettingsOpen(false)
                setSearchOpen(false)
                setSavedOpen(false)
              }}
              aria-expanded={pickerOpen}
            >
              <span className="qmr-surah-select-title">{activeChapterInfo ? `${activeChapterInfo.id}. ${activeChapterInfo.english_name}` : 'Select Surah'}</span>
              <span className="qmr-surah-select-sub">Change Surah</span>
            </button>
            <div className="qmr-subbar-right" aria-label="Qurʾān reader tools">
              {activeChapterInfo && (
                <span className="qmr-subbar-meta">
                  {activeChapterInfo.revelation_type} · {activeChapterInfo.verse_count} Ayahs
                </span>
              )}
              <button type="button" className="qmr-toolbar-btn" onClick={openReadMode} aria-label="Open Read Mode" data-qmr-tooltip="Read Mode">
                <IconBookOpen /><span className="qmr-toolbar-label">Read</span>
              </button>
              {enhancedModesAvailable ? <div className="qmr-reader-mode-switch" role="group" aria-label="Qurʾān mode">
                <button type="button" className={quranMode === 'reader' ? 'is-active' : ''} onClick={() => { setQuranMode('reader'); setStudyDialog(null); setSourceDialog(null) }}>Reader</button>
                {studySnapshotAvailable ? <button type="button" className={quranMode === 'study' ? 'is-active' : ''} onClick={() => { setQuranMode('study'); setSourceDialog(null) }}>Study</button> : null}
                {sourcesSnapshotAvailable ? <button type="button" className={quranMode === 'sources' ? 'is-active' : ''} onClick={() => { setQuranMode('sources'); setStudyDialog(null) }}>Sources</button> : null}
              </div> : null}
              {quranMode !== 'reader' && ((quranMode === 'study' && studySnapshotAvailable) || (quranMode === 'sources' && sourcesSnapshotAvailable)) ? (
                <div className="qmr-study-language-switch" role="group" aria-label="Study language">
                  <button type="button" className={studyLanguage === 'english' ? 'is-active' : ''} onClick={() => setStudyLanguage('english')}>English</button>
                  <button type="button" className={studyLanguage === 'arabic' ? 'is-active' : ''} onClick={() => setStudyLanguage('arabic')}>Arabic</button>
                  <button type="button" className={studyLanguage === 'both' ? 'is-active' : ''} onClick={() => setStudyLanguage('both')}>Both</button>
                </div>
              ) : null}
              <button type="button" className="qmr-toolbar-btn" onClick={openSearch} aria-label="Search the Qurʾān" data-qmr-tooltip="Search Qurʾān">
                <IconSearch /><span className="qmr-toolbar-label">Search</span>
              </button>
              <button type="button" className="qmr-toolbar-btn" onClick={openSaved} aria-label={`Saved ayahs (${bookmarks.length})`} data-qmr-tooltip="Saved ayahs">
                <IconBookmark /><span className="qmr-toolbar-label">Saved</span>
                {bookmarks.length > 0 && <span className="qmr-toolbar-count">{bookmarks.length}</span>}
              </button>
              <button
                type="button"
                className="qmr-icon-btn"
                aria-label="Reader settings"
                data-qmr-tooltip="Reader settings"
                onClick={() => {
                  setSettingsOpen((o) => !o)
                  setPickerOpen(false)
                  setSearchOpen(false)
                  setSavedOpen(false)
                }}
              >
                <IconSettings />
              </button>
            </div>
          </div>
          {pickerOpen && (
            <div className="qmr-surah-dropdown">
              {chaptersError ? (
                <p className="qmr-status qmr-error">{chaptersError}</p>
              ) : chapters.length === 0 ? (
                <p className="qmr-status">Loading Surahs…</p>
              ) : (
                <ChapterList
                  chapters={chapters}
                  activeChapter={chapterNumber}
                  onSelect={(id) => { setChapterLocation(id); setPickerOpen(false) }}
                />
              )}
            </div>
          )}
        </div>
        {pickerOpen && <div className="qmr-overlay qmr-overlay-picker" onClick={() => setPickerOpen(false)} />}

        <section className="qmr-reader-page">
          {/* ── Surah header ──────────────────────────────── */}
          {activeChapterInfo && (
            <header className="qmr-surah-head">
              <div className="qmr-surah-head-body">
                <span className="qmr-surah-eyebrow">Surah {activeChapterInfo.id}</span>
                <p className="qmr-surah-head-arabic">{activeChapterInfo.name_arabic}</p>
                <h1>Surah {activeChapterInfo.english_name}</h1>
                <div className="qmr-surah-meta-row" aria-label="Surah information">
                  <span>{activeChapterInfo.english_name_translation}</span>
                  <span>{activeChapterInfo.revelation_type}</span>
                  <span>{activeChapterInfo.verse_count} Ayahs</span>
                </div>
                <div className="qmr-surah-head-actions">
                  <button
                    type="button"
                    className="qmr-play-surah"
                    onClick={playSurahFromStart}
                    disabled={versesLoading || audioState === 'loading'}
                    title="Play this Surah continuously from the beginning"
                  >
                    {audioState === 'loading' ? '…' : <IconPlay size={15} />} <span>Play Surah</span>
                  </button>
                  {studyMode && surahStudyDetail(chapterNumber, studyStore) ? (
                    <button type="button" className="qmr-study-surah-button" onClick={() => setStudyDialog(surahStudyDetail(chapterNumber, studyStore))}>
                      <IconPen size={15} /><span>Sūrah Study</span>
                    </button>
                  ) : null}
                </div>
                {(() => {
                  const intro = QURAN_SURAH_INTRODUCTIONS[chapterNumber]
                  const videoId = youtubeIdFromUrl(intro?.youtubeUrl || intro?.videoId)
                  if (!intro || !videoId) return null
                  return (
                    <div className="qmr-surah-intro">
                      <div className="qmr-surah-intro-copy">
                        <span className="qmr-surah-intro-kicker">Talweeh Surah Introduction</span>
                        <strong>{intro.title || `Introduction to Surah ${activeChapterInfo.english_name}`}</strong>
                        {intro.description && <p>{intro.description}</p>}
                        {intro.instructor && <small>{intro.instructor}</small>}
                      </div>
                      <div className="qmr-surah-intro-video">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                          title={intro.title || `Introduction to Surah ${activeChapterInfo.english_name}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )
                })()}
                <div className="qmr-surah-nav-row" aria-label="Surah navigation">
                  <button
                    type="button"
                    className="qmr-surah-nav"
                    aria-label="Previous Surah"
                    disabled={chapterNumber <= 1}
                    onClick={() => goToChapter(-1)}
                  >
                    Previous Surah
                  </button>
                  <button
                    type="button"
                    className="qmr-surah-nav"
                    aria-label="Next Surah"
                    disabled={chapterNumber >= 114}
                    onClick={() => goToChapter(1)}
                  >
                    Next Surah
                  </button>
                </div>
              </div>
            </header>
          )}

          {versesLoading && <p className="qmr-status">Loading verses…</p>}
          {versesError && <p className="qmr-status qmr-error">{versesError}</p>}

            {!versesLoading && !versesError && verses.length > 0 && (
              <ol className="qmr-ayah-list" style={{ '--qmr-arabic-size': `${arabicSize}px`, '--qmr-translation-size': `${translationSize}px` }}>
                {verses.map((v) => {
                  const active = v.verse_key === currentAyahKey
                  const study = studyMode ? (studyPresentationByVerse.get(v.verse_key) || {}) : {}
                  const sourceActions = sourcesMode ? (sourceActionsByVerse.get(v.verse_key) || null) : null
                  return (
                    <AyahRow
                      key={v.verse_key}
                      verse={v}
                      active={active}
                      target={v.verse_key === targetAyahKey}
                      activePlaying={active && audioState === 'playing'}
                      activePaused={active && audioState === 'paused'}
                      bookmarked={bookmarkedKeys.has(v.verse_key)}
                      menuOpen={actionVerseKey === v.verse_key}
                      script={script}
                      showTranslation={showTranslation}
                      studyBefore={study.before}
                      studyArabic={study.arabic}
                      studyTranslation={study.translation}
                      studyActions={study.actions}
                      sourceActions={sourceActions}
                      playbackContextKey={audioSelectionKey}
                      bookmarkContextKey={bookmarkContextKey}
                      registerRef={registerAyahRef}
                      onPause={pauseAudio}
                      onResume={resumeAudio}
                      onPlayAyah={playAyah}
                      onPlayFromAyah={playFromAyah}
                      onToggleBookmark={toggleBookmark}
                      onShare={shareVerse}
                      onToggleMenu={(verseKey) => setActionVerseKey((key) => key === verseKey ? null : verseKey)}
                      onCopy={copyVerseOption}
                    />
                  )
                })}
              </ol>
            )}
            {!versesLoading && !versesError && verses.length === 0 && (
              <p className="qmr-status">No verses available for this Surah right now.</p>
            )}
        </section>
      </main>
      {quranMode !== 'reader' && studyLoading ? <div className="qmr-study-loading-badge">Loading {studyMode ? 'Study' : 'Sources'}…</div> : null}
      <PortalStudyDialog detail={studyDialog} store={studyStore} languageMode={studyLanguage} onClose={() => setStudyDialog(null)} />
      <PortalSourceDialog detail={sourceDialog} store={studyStore} languageMode={studyLanguage} onClose={() => setSourceDialog(null)} />
      {/* ── Reader search ───────────────────────────────── */}
      {searchOpen && (
        <ReaderPortal>
          <>
          <div className="qmr-overlay qmr-overlay-modal" onClick={() => setSearchOpen(false)} />
          <aside className="qmr-panel qmr-panel-left" role="dialog" aria-label="Search the Qurʾān">
            <div className="qmr-drawer-head">
              <div>
                <span className="qmr-panel-kicker">Reader</span>
                <h3>Search Qurʾān</h3>
              </div>
              <button type="button" className="qmr-icon-btn" aria-label="Close search" onClick={() => setSearchOpen(false)}>✕</button>
            </div>
            <div className="qmr-panel-body">
              <form className="qmr-global-search" onSubmit={runSearch}>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Arabic, translation, or enter 2:255"
                  aria-label="Search Qurʾān"
                  autoFocus
                />
                <button type="submit" disabled={searchLoading}>{searchLoading ? '…' : 'Search'}</button>
              </form>
              <p className="qmr-panel-hint">Tip: enter a verse reference such as <strong>2:255</strong> to jump directly.</p>
              {searchError && <p className="qmr-status qmr-error qmr-search-status">{searchError}</p>}
              {searchLoading && searchQuery.trim().length >= 2 && (
                <div className="qmr-search-typing" role="status"><span /> Searching as you type…</div>
              )}
              {searchResults.length > 0 && (
                <div className="qmr-search-results">
                  {searchResults.map((result) => {
                    const [chapter, ayah] = result.verseKey.split(':').map(Number)
                    const info = chapterForReference(chapter)
                    const chapterName = result.chapterName || result.surahEnglishName || info?.english_name || `Surah ${chapter}`
                    const chapterArabicName = result.chapterArabicName || result.surahArabicName || info?.name_arabic || ''
                    return (
                      <button
                        key={`${result.verseKey}-${result.translation || ''}`}
                        type="button"
                        className={result.referenceOnly ? 'qmr-search-result qmr-search-result-reference' : 'qmr-search-result'}
                        onClick={() => jumpToAyah(chapter, ayah)}
                      >
                        <span className="qmr-search-result-heading">
                          <span className="qmr-search-result-reference-copy">
                            <strong>Surah {chapterName}</strong>
                            <span>Ayah {ayah}</span>
                            <code>{result.verseKey}</code>
                          </span>
                          {chapterArabicName && <span className="qmr-search-result-surah-arabic" dir="rtl" lang="ar">{chapterArabicName}</span>}
                        </span>
                        {result.referenceOnly && <span className="qmr-search-result-jump">Jump directly to this ayah</span>}
                        {result.arabic && <span className="qmr-search-result-arabic" dir="rtl" lang="ar">{result.arabic}</span>}
                        {result.translation && <span className="qmr-search-result-translation">{result.translation}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
          </>
        </ReaderPortal>
      )}

      {/* ── Saved ayahs ──────────────────────────────────── */}
      {savedOpen && (
        <ReaderPortal>
          <>
          <div className="qmr-overlay qmr-overlay-modal" onClick={() => setSavedOpen(false)} />
          <aside className="qmr-panel qmr-panel-left" role="dialog" aria-label="Saved ayahs">
            <div className="qmr-drawer-head">
              <div>
                <span className="qmr-panel-kicker">Reader</span>
                <h3>Saved Ayahs</h3>
              </div>
              <button type="button" className="qmr-icon-btn" aria-label="Close saved ayahs" onClick={() => setSavedOpen(false)}>✕</button>
            </div>
            <div className="qmr-panel-body">
              <p className="qmr-panel-hint">Saved on this device for now. Account sync will be added when the Talweeh account system is connected.</p>
              {bookmarks.length === 0 ? (
                <div className="qmr-saved-empty">
                  <IconBookmark size={24} />
                  <strong>No saved ayahs yet</strong>
                  <p>Use the bookmark beside any ayah to keep it here.</p>
                </div>
              ) : (
                <div className="qmr-saved-list">
                  {bookmarks.map((item) => (
                    <article className="qmr-saved-card" key={item.verseKey}>
                      <button
                        type="button"
                        className="qmr-saved-open"
                        onClick={() => jumpToAyah(item.chapterNumber, item.verseNumber)}
                      >
                        <span className="qmr-saved-key">{item.verseKey} · {item.chapterName}</span>
                        <span className="qmr-saved-arabic" dir="rtl" lang="ar">{item.arabic}</span>
                        {item.translation && <span className="qmr-saved-translation">{item.translation}</span>}
                      </button>
                      <button
                        type="button"
                        className="qmr-saved-remove"
                        aria-label={`Remove ${item.verseKey} from saved`}
                        onClick={() => setBookmarks((current) => current.filter((saved) => saved.verseKey !== item.verseKey))}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
          </>
        </ReaderPortal>
      )}

      {/* ── Settings drawer (quran.com-style) ───────────── */}
      {settingsOpen && (
        <ReaderPortal>
          <>
          <div className="qmr-overlay qmr-overlay-modal" onClick={() => setSettingsOpen(false)} />
          <aside className="qmr-drawer" role="dialog" aria-label="Reader settings">
            <div className="qmr-drawer-head">
              <h3>Settings</h3>
              <button type="button" className="qmr-icon-btn" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>
            <div className="qmr-drawer-body">
              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Translation</span>
                <TranslationPicker
                  translations={translations}
                  activeId={translationId}
                  onChange={setTranslationId}
                  disabled={translations.length === 0}
                />
              </div>

              <div className="qmr-drawer-group qmr-drawer-inline">
                <span className="qmr-drawer-label">Show translation</span>
                <label className="qmr-switch">
                  <input
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(e) => setShowTranslation(e.target.checked)}
                  />
                  <span aria-hidden="true" />
                </label>
              </div>

              <div className="qmr-drawer-group qmr-study-settings-group">
                <span className="qmr-drawer-label">Qurʾān mode</span>
                <div className="qmr-script-toggle qmr-settings-mode-toggle" role="group" aria-label="Qurʾān mode">
                  <button type="button" className={quranMode === 'reader' ? 'active' : ''} onClick={() => setQuranMode('reader')}>Reader</button>
                  {studySnapshotAvailable ? <button type="button" className={quranMode === 'study' ? 'active' : ''} onClick={() => setQuranMode('study')}>Study</button> : null}
                  {sourcesSnapshotAvailable ? <button type="button" className={quranMode === 'sources' ? 'active' : ''} onClick={() => setQuranMode('sources')}>Sources</button> : null}
                </div>
              </div>

              {quranMode !== 'reader' ? <>
                <div className="qmr-drawer-group">
                  <span className="qmr-drawer-label">Study / Sources language</span>
                  <div className="qmr-script-toggle qmr-settings-language-toggle" role="group" aria-label="Study language">
                    <button type="button" className={studyLanguage === 'english' ? 'active' : ''} onClick={() => setStudyLanguage('english')}>English</button>
                    <button type="button" className={studyLanguage === 'arabic' ? 'active' : ''} onClick={() => setStudyLanguage('arabic')}>Arabic</button>
                    <button type="button" className={studyLanguage === 'both' ? 'active' : ''} onClick={() => setStudyLanguage('both')}>Both</button>
                  </div>
                </div>
                <div className="qmr-drawer-group qmr-drawer-inline">
                  <span className="qmr-drawer-label">Study hover previews</span>
                  <label className="qmr-switch"><input type="checkbox" checked={rabtHoverEnabled} onChange={(event) => setRabtHoverEnabled(event.target.checked)} /><span aria-hidden="true" /></label>
                </div>
                <div className="qmr-drawer-group">
                  <span className="qmr-drawer-label">Hover text size</span>
                  <div className="qmr-script-toggle qmr-hover-size-toggle" role="group" aria-label="Hover text size">
                    <button type="button" className={rabtHoverSize === 'compact' ? 'active' : ''} onClick={() => setRabtHoverSize('compact')}>Small</button>
                    <button type="button" className={rabtHoverSize === 'standard' ? 'active' : ''} onClick={() => setRabtHoverSize('standard')}>Medium</button>
                    <button type="button" className={rabtHoverSize === 'large' ? 'active' : ''} onClick={() => setRabtHoverSize('large')}>Large</button>
                  </div>
                </div>
                <div className="qmr-drawer-group qmr-drawer-inline">
                  <span className="qmr-drawer-label">Vocabulary Arabic size</span>
                  <div className="qmr-stepper"><button type="button" onClick={() => setVocabArabicSize((size) => Math.max(16, size - 2))}>–</button><span>{vocabArabicSize}</span><button type="button" onClick={() => setVocabArabicSize((size) => Math.min(34, size + 2))}>+</button></div>
                </div>
              </> : null}

              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Reciter</span>
                <ReciterPicker
                  recitations={recitations}
                  activeId={recitationId}
                  onChange={(id) => {
                    setRecitationId(id)
                    saveSettings({ recitationChosen: true, audioProvider: AUDIO_PROVIDER_KEY })
                  }}
                  disabled={recitations.length === 0}
                />
                {recitationsError && <p className="qmr-control-error">{recitationsError}</p>}
              </div>

              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Arabic script</span>
                <div className="qmr-script-toggle" role="group" aria-label="Arabic script">
                  <button
                    type="button"
                    className={script === 'uthmani' ? 'active' : ''}
                    onClick={() => setScript('uthmani')}
                  >
                    Uthmani
                  </button>
                  <button
                    type="button"
                    className={script === 'indopak' ? 'active' : ''}
                    onClick={() => setScript('indopak')}
                  >
                    Indo-Pak
                  </button>
                </div>
              </div>

              <div className="qmr-drawer-group qmr-drawer-inline">
                <span className="qmr-drawer-label">Arabic size</span>
                <div className="qmr-stepper">
                  <button type="button" onClick={() => setArabicSize((s) => Math.max(20, s - 2))}>–</button>
                  <span>{arabicSize}</span>
                  <button type="button" onClick={() => setArabicSize((s) => Math.min(48, s + 2))}>+</button>
                </div>
              </div>

              <div className="qmr-drawer-group qmr-drawer-inline">
                <span className="qmr-drawer-label">Translation size</span>
                <div className="qmr-stepper">
                  <button type="button" onClick={() => setTranslationSize((s) => Math.max(13, s - 1))}>–</button>
                  <span>{translationSize}</span>
                  <button type="button" onClick={() => setTranslationSize((s) => Math.min(26, s + 1))}>+</button>
                </div>
              </div>

              <div className="qmr-drawer-group">
                <span className="qmr-drawer-label">Play a range of ayahs</span>
                <div className="qmr-range" aria-label="Play a range of ayahs">
                  <input
                    type="number"
                    min={1}
                    max={verseCount}
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(Number(e.target.value))}
                    aria-label="From ayah"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    min={1}
                    max={verseCount}
                    value={rangeTo}
                    onChange={(e) => setRangeTo(Number(e.target.value))}
                    aria-label="To ayah"
                  />
                  <button
                    type="button"
                    onClick={() => { playRange(); setSettingsOpen(false) }}
                    disabled={versesLoading || audioState === 'loading'}
                  >
                    ▶ Play
                  </button>
                </div>
              </div>
            </div>
          </aside>
          </>
        </ReaderPortal>
      )}

      {readModeOpen && (
        <ReadOnlyMode
          chapters={chapters}
          translations={translations}
          translationId={translationId}
          onTranslationChange={setTranslationId}
          initialChapter={chapterNumber}
          onClose={closeReadMode}
        />
      )}

      {/* ── Compact audio player ─────────────────────────── */}
      {audioState !== 'idle' && (
        <div
          ref={playerRef}
          className={`qmr-player${playerPosition ? ' qmr-player--dragged' : ''}`}
          role="region"
          aria-label="Qur'an audio player"
          style={playerPosition ? { '--qmr-player-drag-left': `${playerPosition.left}px`, '--qmr-player-drag-top': `${playerPosition.top}px` } : undefined}
        >
          <div className="qmr-player-head qmr-player-drag-handle" onPointerDown={beginPlayerDrag} title="Drag player">
            <div className="qmr-player-now">
              <span className="qmr-player-eyebrow">Now reciting</span>
              <strong>
                {activeChapterInfo?.english_name || `Surah ${chapterNumber}`}
                {currentAyahKey ? ` · Ayah ${currentAyahKey.split(':')[1]}` : ''}
              </strong>
              <div className="qmr-player-reciter-row">
                <ReciterPicker
                  recitations={recitations}
                  activeId={recitationId}
                  compact
                  placement="up"
                  disabled={recitations.length === 0}
                  onChange={changeReciterFromPlayer}
                />
              </div>
            </div>
            <div className="qmr-player-head-actions">
              <div className="qmr-player-menu-wrap">
                <button
                  type="button"
                  className="qmr-player-btn"
                  aria-label="Playback settings"
                  aria-expanded={playerMenuOpen}
                  data-qmr-tooltip="Playback settings"
                  onClick={() => setPlayerMenuOpen((open) => !open)}
                >
                  <IconSliders size={18} />
                </button>
                {playerMenuOpen && (
                  <div className="qmr-player-menu" role="dialog" aria-label="Playback settings">
                    <div className="qmr-player-menu-title">
                      <strong>Playback settings</strong>
                      <span>{activeReciterName}</span>
                    </div>
                    <div className="qmr-player-toggle-grid">
                      <label className="qmr-player-toggle-card">
                        <span>
                          <strong>Repeat ayah</strong>
                          <small>Repeat the current ayah</small>
                        </span>
                        <input type="checkbox" checked={repeatAyah} onChange={(e) => setRepeatAyah(e.target.checked)} />
                      </label>
                      <label className="qmr-player-toggle-card">
                        <span>
                          <strong>Loop</strong>
                          <small>Loop the current playback mode</small>
                        </span>
                        <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} />
                      </label>
                    </div>
                    <div className="qmr-player-setting-block">
                      <span className="qmr-player-setting-label">Playback speed</span>
                      <div className="qmr-player-speed-options">
                        {[0.75, 1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            className={playbackRate === speed ? 'active' : ''}
                            onClick={() => setPlaybackRate(speed)}
                          >
                            {speed}×
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="qmr-player-setting-block qmr-player-volume">
                      <span className="qmr-player-setting-label">Volume</span>
                      <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
                    </label>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="qmr-player-btn qmr-player-close"
                onClick={stopAudio}
                aria-label="Stop and close player"
                data-qmr-tooltip="Stop and close"
              >
                <svg className="qmr-svg-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <input
            type="range"
            className="qmr-player-seek"
            min={0}
            max={Math.max(1, Math.floor(audioPos.d))}
            value={Math.min(audioPos.t, Math.floor(audioPos.d) || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
            style={{ '--qmr-seek-fill': `${audioPos.d ? (audioPos.t / audioPos.d) * 100 : 0}%` }}
          />

          <div className="qmr-player-row">
            <span className="qmr-player-time">{formatTime(audioPos.t)}</span>
            <div className="qmr-player-controls">
              <button
                type="button"
                className="qmr-player-btn qmr-player-nav"
                onClick={() => goToOffset(-1)}
                disabled={!audioMode}
                aria-label="Previous ayah"
                data-qmr-tooltip="Previous ayah"
              >
                <IconChevronLeft size={20} />
              </button>
              {audioState === 'playing' ? (
                <button type="button" className="qmr-player-btn qmr-player-main" onClick={pauseAudio} aria-label="Pause" data-qmr-tooltip="Pause">
                  <IconPause size={20} />
                </button>
              ) : (
                <button type="button" className="qmr-player-btn qmr-player-main" onClick={resumeAudio} aria-label="Resume" data-qmr-tooltip="Resume">
                  <IconPlay size={19} />
                </button>
              )}
              <button
                type="button"
                className="qmr-player-btn qmr-player-nav"
                onClick={() => goToOffset(1)}
                disabled={!audioMode}
                aria-label="Next ayah"
                data-qmr-tooltip="Next ayah"
              >
                <IconChevronRight size={20} />
              </button>
            </div>
            <span className="qmr-player-time qmr-player-time-right">{formatTime(audioPos.d)}</span>
          </div>
          {audioErrorMsg && <p className="qmr-player-error">{audioErrorMsg}</p>}
        </div>
      )}
      {audioErrorMsg && audioState === 'idle' && (
        <div className="qmr-player qmr-player-error-only">
          <p className="qmr-player-error">{audioErrorMsg}</p>
        </div>
      )}

      {notice && <div className="qmr-toast" role="status">{notice}</div>}

      <PageFooter />
    </div>
  )
}
