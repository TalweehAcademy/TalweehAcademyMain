// Talweeh study packages (src/quran-study-static/NNN — the same files QuranPortalStaticStore
// reads) shaped for the Dirāsah study page. Loaded per surah, on demand.
const portals = import.meta.glob('../quran-study-static/*/portal.json', { import: 'default' })
const manifests = import.meta.glob('../quran-study-static/*/sources/manifest.json', { import: 'default' })
const books = import.meta.glob('../quran-study-static/*/sources/*.json', { import: 'default' })

const dir = (n) => `../quran-study-static/${String(n).padStart(3, '0')}`
export const STUDY_SURAHS = Object.keys(portals).map((p) => Number(p.match(/static\/(\d{3})\//)[1])).sort((a, b) => a - b)
export const hasStudy = (n) => STUDY_SURAHS.includes(Number(n))

const clean = (v) => String(v ?? '').trim()
const rows = (v) => (Array.isArray(v) ? v : [])
const listish = (v) => {
  if (Array.isArray(v)) return v
  try { return JSON.parse(String(v).replace(/'/g, '"')) } catch { return [] }
}
const key = (s) => clean(s).replace(/\s/g, '')

// Sūrah study topics, grouped like surahStudyTabs() in QuranReaderStudyLayer.jsx.
function surahTopics(legacy) {
  const meta = rows(legacy?.metadata)
  const test = (re) => (m) => re.test(`${m.id || ''} ${m.labelArabic || ''} ${m.labelEnglish || ''}`)
  const join = (pred) => meta.filter(pred).filter((m) => clean(m.valueArabic)).map((m) => `${clean(m.labelArabic)}: ${clean(m.valueArabic)}`).join('\n')
  const isNuzul = test(/revel|nuzul|نزول|مكي|مدني|meccan|medinan|order/i)
  const isCounts = test(/ayah|verse|word|letter|آي|الآيات|كلم|حرف/i)
  const L = legacy || {}
  return [
    { id: 'ayat', ar: 'الآيات', en: 'Āyāt', arabic: join(isCounts), english: '' },
    { id: 'nuzul', ar: 'النزول', en: 'Revelation', arabic: join(isNuzul), english: '' },
    { id: 'sabab-nuzul', ar: 'سبب النزول', en: 'Reason of Revelation', arabic: clean(L.sababNuzulArabic), english: clean(L.sababNuzulEnglish) },
    { id: 'introduction', ar: 'مقدمة', en: 'Introduction', arabic: clean(L.introductionArabic), english: clean(L.introductionEnglish) },
    { id: 'topics', ar: 'موضوعات', en: 'Themes', arabic: clean(L.topicsArabic), english: clean(L.topicsEnglish) },
    { id: 'virtues', ar: 'فضائل السورة', en: 'Virtues', arabic: clean(L.virtuesArabic), english: clean(L.virtuesEnglish) },
    { id: 'notes', ar: 'ملاحظات', en: 'Notes', arabic: clean(L.notesArabic), english: clean(L.notesEnglish) },
  ]
}

const cache = new Map()
export function loadStudy(n) {
  if (!hasStudy(n)) return Promise.resolve(null)
  if (!cache.has(n)) cache.set(n, build(n))
  return cache.get(n)
}

async function build(n) {
  const base = dir(n)
  const portal = await portals[`${base}/portal.json`]()
  const manifest = manifests[`${base}/sources/manifest.json`] ? await manifests[`${base}/sources/manifest.json`]() : { books: [] }
  const bookList = rows(manifest.books)
  const bookData = {}
  await Promise.all(bookList.map(async (b) => {
    const loader = books[`${base}/${b.path}`]
    if (loader) bookData[b.id] = await loader()
  }))

  // Book passages (iʿrāb and tafsīr) and which āyāt they cover.
  const passages = {}, links = {}
  for (const b of bookList) {
    if (b.categories?.includes('vocab')) continue
    const feature = b.categories?.includes('irab') ? 'irab' : 'tafsir'
    for (const e of rows(bookData[b.id]?.entries)) {
      const targets = listish(e.targets)
      if (!targets.length) continue
      passages[e.id] = {
        book: b.nameEnglish, bookAr: b.nameArabic, author: b.authorEnglish,
        heading: clean(e.headingArabic), arabic: clean(e.arabic || e.textArabic),
        locator: clean(e.locator) || [e.volumeStart ? `vol. ${e.volumeStart}` : '', e.printedPageStart ? `p. ${e.printedPageStart}` : ''].filter(Boolean).join(' · '),
      }
      for (const t of targets) ((links[t] ||= {})[feature] ||= []).push(e.id)
    }
  }

  // Roots: Talweeh's own excerpt first, then one entry from each dictionary book.
  const roots = {}
  for (const r of rows(portal.words?.roots)) {
    const ex = rows(r.excerpts)[0]
    roots[r.id] = { root: clean(r.rootArabic), dicts: ex ? [{ name: 'Talweeh notes', arabic: clean(ex.arabic) }] : [] }
  }
  for (const b of bookList) {
    if (!b.categories?.includes('vocab')) continue
    const seen = new Set()
    for (const e of rows(bookData[b.id]?.entries)) {
      const k = key(e.rootArabic || e.rootKey || e.headwordArabic)
      for (const [id, r] of Object.entries(roots)) {
        if (key(r.root) === k && !seen.has(id)) { seen.add(id); r.dicts.push({ name: b.nameEnglish, arabic: clean(e.articleArabic || e.arabic || e.textArabic) }) }
      }
    }
  }

  const wordIrab = {}
  for (const rec of rows(portal.words?.irabRecords)) {
    const sh = rec.shared || {}
    const facts = [sh.wordClass, sh.declension, sh.binaSign, sh.mahallArabic, ...rows(sh.classifications).map((c) => c.valueArabic)].map(clean).filter(Boolean)
    wordIrab[`${rec.verseKey}:${rec.wordNumber}`] = { word: clean(rec.wordArabic), tl: clean(rec.transliteration), conclusion: clean(rec.conclusionArabic), facts: [...new Set(facts)] }
  }

  const pick = (xs) => rows(xs).map((x) => ({ arabic: clean(x.arabic), english: clean(x.english) })).filter((x) => x.arabic || x.english)
  const ayahs = {}
  for (const [k, d] of Object.entries(portal.verses?.drafts || {})) {
    ayahs[k] = {
      tr: rows(d.translations).filter((t) => clean(t.translation)).map((t) => ({
        text: clean(t.translation),
        brackets: rows(t.brackets).filter((b) => clean(b.reason) || clean(b.reference)).map((b) => ({ text: clean(b.text), reason: clean(b.reason), reference: clean(b.reference) })),
      })),
      rabt: pick(d.rabt), irab: pick(d.irab), fawaid: pick(d.fawaid),
      vocab: rows(d.vocab).filter((v) => roots[v.rootId]).map((v) => ({ w: v.wordNumber, word: clean(v.wordArabic), root: v.rootId })),
    }
  }
  const legacy = portal.surah?.legacy || null
  return { surah: n, nameAr: clean(legacy?.nameArabic), topics: surahTopics(legacy), ayahs, links, passages, roots, wordIrab }
}
