// Talweeh study packages (src/quran-study-static/NNN/portal.json, published from the library through the portal)
// shaped for the Dirāsah study page. Loaded per surah, on demand. Only what the team wrote or confirmed is shown: the
// written text of each window, and the parts of books added to it with their references (quotes); no books themselves.
import { STUDY_ON } from './studySwitch'

const portals = import.meta.glob('../quran-study-static/*/portal.json', { import: 'default' })

const dir = (n) => `../quran-study-static/${String(n).padStart(3, '0')}`
// Hidden while STUDY_ON is off (./studySwitch.js): no sūrah has a study.
export { STUDY_ON }
export const STUDY_SURAHS = STUDY_ON ? Object.keys(portals).map((p) => Number(p.match(/static\/(\d{3})\//)[1])).sort((a, b) => a - b) : []
export const hasStudy = (n) => STUDY_SURAHS.includes(Number(n))

const clean = (v) => String(v ?? '').trim()
const rows = (v) => (Array.isArray(v) ? v : [])

// Where a quote is from, as printed: «vol. 4 · p. 406», a page range when it runs on.
export function quoteRef(q) {
  const f = q.from || {}, t = q.to || {}
  const pages = f.page && t.page && t.page !== f.page ? `pp. ${f.page}–${t.page}` : f.page ? `p. ${f.page}` : ''
  return [f.vol ? `vol. ${f.vol}` : '', pages].filter(Boolean).join(' · ')
}
const quote = (q) => ({ text: clean(q.text), book: clean(q.titleArabic), author: clean(q.authorArabic), ref: quoteRef(q), url: clean(q.url), summary: q.summary === true })

// Sūrah study topics, as the library's Sūrah Study (surahStudyTabs in QuranReaderStudyLayer.jsx): what was written in
// each tab (studySections), else the sūrah's own details; then the team's own tabs; each with the parts of books added.
function surahTopics(surahRow) {
  const legacy = surahRow?.legacy || {}
  const meta = rows(legacy.metadata)
  const test = (re) => (m) => re.test(`${m.id || ''} ${m.labelArabic || ''} ${m.labelEnglish || ''}`)
  const join = (pred) => meta.filter(pred).filter((m) => clean(m.valueArabic)).map((m) => `${clean(m.labelArabic)}: ${clean(m.valueArabic)}`).join('\n')
  const isNuzul = test(/revel|nuzul|نزول|مكي|مدني|meccan|medinan|order/i)
  const isCounts = test(/ayah|verse|word|letter|آي|الآيات|كلم|حرف/i)
  const L = legacy
  const fixed = [
    { id: 'ayat', ar: 'الآيات', en: 'Āyāt', arabic: join(isCounts), english: '' },
    { id: 'nuzul', ar: 'النزول', en: 'Revelation', arabic: join(isNuzul), english: '' },
    { id: 'sabab-nuzul', ar: 'سبب النزول', en: 'Reason of Revelation', arabic: clean(L.sababNuzulArabic), english: clean(L.sababNuzulEnglish) },
    { id: 'introduction', ar: 'مقدمة', en: 'Introduction', arabic: clean(L.introductionArabic), english: clean(L.introductionEnglish) },
    { id: 'topics', ar: 'موضوعات', en: 'Themes', arabic: clean(L.topicsArabic), english: clean(L.topicsEnglish) },
    { id: 'virtues', ar: 'فضائل السورة', en: 'Virtues', arabic: clean(L.virtuesArabic), english: clean(L.virtuesEnglish) },
    { id: 'notes', ar: 'ملاحظات', en: 'Notes', arabic: clean(L.notesArabic), english: clean(L.notesEnglish) },
  ]
  const own = rows(surahRow?.sectionTypes).slice().sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((t) => ({ id: clean(t.id), ar: clean(t.labelArabic), en: clean(t.labelEnglish) || clean(t.labelArabic), arabic: '', english: '' }))
  const written = new Map(rows(surahRow?.sections).filter((x) => x.feature === 'surah').map((x) => [clean(x.tabId), x]))
  const quotes = rows(surahRow?.quotes)
  return [...fixed, ...own].map((t) => {
    const w = written.get(t.id)
    return { ...t, arabic: w ? clean(w.arabic) : t.arabic, english: w ? clean(w.english) : t.english, quotes: quotes.filter((q) => clean(q.section) === t.id).map(quote) }
  })
}

const cache = new Map()
export function loadStudy(n) {
  if (!hasStudy(n)) return Promise.resolve(null)
  if (!cache.has(n)) cache.set(n, build(n))
  return cache.get(n)
}

// The written text of an āyah's window: the library's final version (studySections, tab = the feature) when there is
// one, else the study's own entries; English from Talweeh's notes when an entry has none.
async function build(n) {
  const base = dir(n)
  const portal = await portals[`${base}/portal.json`]()
  const V = portal.verses || {}

  const roots = {}
  for (const r of rows(portal.words?.roots)) {
    const ex = rows(r.excerpts)[0]
    roots[r.id] = { root: clean(r.rootArabic), note: ex ? clean(ex.arabic) : '' }
  }

  const wordIrab = {}
  for (const rec of rows(portal.words?.irabRecords)) {
    const sh = rec.shared || {}
    const facts = [sh.wordClass, sh.declension, sh.binaSign, sh.mahallArabic, ...rows(sh.classifications).map((c) => c.valueArabic)].map(clean).filter(Boolean)
    wordIrab[`${rec.verseKey}:${rec.wordNumber}`] = { word: clean(rec.wordArabic), tl: clean(rec.transliteration), conclusion: clean(rec.conclusionArabic), facts: [...new Set(facts)] }
  }

  // Per word (81:1:2): its ṣarf as written, and the parts of books added to its root, iʿrāb or ṣarf.
  const words = {}
  const wordOf = (targetKey) => { const m = /^(\d+:\d+):word:(\d+)$/.exec(clean(targetKey)); return m ? `${m[1]}:${m[2]}` : '' }
  for (const x of rows(V.sections)) {
    const w = wordOf(x.targetKey)
    if (w && (clean(x.arabic) || clean(x.english))) ((words[w] ||= { sarf: null, quotes: [] }).sarf = { arabic: clean(x.arabic), english: clean(x.english) })
  }
  const quotes = {}
  for (const q of rows(V.quotes)) {
    if (!clean(q.text)) continue
    const w = wordOf(q.targetKey)
    if (w) { (words[w] ||= { sarf: null, quotes: [] }).quotes.push({ ...quote(q), feature: clean(q.feature) }); continue }
    ;((quotes[clean(q.targetKey)] ||= {})[clean(q.feature)] ||= []).push(quote(q))
  }

  const sectionOf = (k, f) => rows(V.sections).find((x) => clean(x.targetKey) === k && clean(x.feature) === f && clean(x.tabId || f) === f)
  const noteOf = (k, f) => clean(rows(V.englishNotes).find((x) => clean(x.targetKey) === k && clean(x.feature) === f)?.english)
  const written = (k, f, list) => {
    const sec = sectionOf(k, f)
    if (sec) return clean(sec.arabic) || clean(sec.english) ? [{ arabic: clean(sec.arabic), english: clean(sec.english) }] : []
    const out = rows(list).map((x) => ({ arabic: clean(x.arabic), english: clean(x.english) })).filter((x) => x.arabic || x.english)
    const en = noteOf(k, f)
    if (en && out.length && !out[0].english) out[0] = { ...out[0], english: en }
    return out
  }
  const ayahs = {}
  for (const [k, d] of Object.entries(V.drafts || {})) {
    ayahs[k] = {
      tr: rows(d.translations).filter((t) => clean(t.translation)).map((t) => ({
        text: clean(t.translation),
        brackets: rows(t.brackets).filter((b) => clean(b.reason) || clean(b.reference)).map((b) => ({ text: clean(b.text), reason: clean(b.reason), reference: clean(b.reference) })),
      })),
      rabt: written(k, 'rabt', d.rabt), irab: written(k, 'irab', d.irab), fawaid: written(k, 'fawaid', d.fawaid),
      tafsir: written(k, 'tafsir', []), qiraat: written(k, 'qiraat', []),
      vocab: rows(d.vocab).filter((v) => roots[v.rootId]).map((v) => ({ w: v.wordNumber, word: clean(v.wordArabic), root: v.rootId })),
      quotes: quotes[k] || {},
    }
  }
  const legacy = portal.surah?.legacy || null
  return { surah: n, nameAr: clean(legacy?.nameArabic), topics: surahTopics(portal.surah), ayahs, roots, wordIrab, words }
}
