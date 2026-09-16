const portalModules = import.meta.glob('../quran-study-static/*/portal.json', { eager: true, import: 'default' })
const manifestModules = import.meta.glob('../quran-study-static/*/sources/manifest.json', { eager: true, import: 'default' })
const sourceModules = import.meta.glob('../quran-study-static/*/sources/*.json', { eager: true, import: 'default' })

function staticSurahFromPath(filePath) {
  const match = String(filePath || '').match(/quran-study-static\/(\d{3})\//)
  return match ? Number(match[1]) : 0
}

const packages = {}
for (const [filePath, portal] of Object.entries(portalModules)) {
  const surah = staticSurahFromPath(filePath)
  if (!surah) continue
  packages[surah] = { ...(packages[surah] || {}), portal, manifest: packages[surah]?.manifest || null, books: packages[surah]?.books || [] }
}
for (const [filePath, manifest] of Object.entries(manifestModules)) {
  const surah = staticSurahFromPath(filePath)
  if (!surah) continue
  packages[surah] = { ...(packages[surah] || {}), portal: packages[surah]?.portal || null, manifest, books: packages[surah]?.books || [] }
}
for (const [filePath, book] of Object.entries(sourceModules)) {
  if (/\/manifest\.json$/.test(filePath)) continue
  const surah = staticSurahFromPath(filePath)
  if (!surah) continue
  const pkg = packages[surah] || { portal: null, manifest: null, books: [] }
  packages[surah] = { ...pkg, books: [...(pkg.books || []), book] }
}

const clean = (value) => String(value ?? '').trim()
const rows = (value) => Array.isArray(value) ? value : []
const norm = (value) => clean(value).normalize('NFKD').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ـ|\s/g, '')

function pkgForSurah(surah) { return packages[Number(surah)] || null }
function bookMeta(pkg, sourceId) { return rows(pkg?.manifest?.books).find((item) => item.id === sourceId) || null }
function bookData(pkg, sourceId) {
  const meta = bookMeta(pkg, sourceId)
  return meta ? rows(pkg?.books).find((item) => item?.source?.slug === meta.slug || item?.source?.id === sourceId) : null
}
function normalizePassage(entry) {
  if (!entry) return null
  return {
    ...entry,
    arabic: entry.arabic || entry.textArabic || entry.articleArabic || entry.articleArabicRaw || '',
    rawArabic: entry.rawArabic || entry.textArabic || entry.articleArabicRaw || entry.articleArabic || '',
    english: entry.english || entry.textEnglish || entry.translationEnglish || '',
    locator: entry.locator || [entry.volumeStart ? `vol. ${entry.volumeStart}` : '', entry.printedPageStart ? `p. ${entry.printedPageStart}` : ''].filter(Boolean).join(', '),
  }
}
function derivedLinks(pkg, surah) {
  const out = []
  for (const data of rows(pkg?.books)) {
    const sourceId = data?.source?.id || rows(pkg?.manifest?.books).find((item) => item.slug === data?.source?.slug)?.id
    if (!sourceId) continue
    for (const entry of rows(data?.entries)) {
      const targets = rows(entry?.targets).filter((target) => String(target).startsWith(`${surah}:`))
      for (const targetKey of targets) {
        out.push({
          id: `derived:${sourceId}:${entry.id}:${targetKey}`,
          feature: /durr/i.test(String(sourceId)) ? 'irab' : /tahrir|tafsir/i.test(String(sourceId)) ? 'tafsir' : 'source',
          targetKey,
          sourceId,
          passageId: entry.id,
          sortOrder: Number(data?.source?.sortOrder) || 100,
          derived: true,
        })
      }
    }
  }
  return out
}
function mergeLinks(explicit, derived) {
  const seen = new Set(), out = []
  for (const link of [...rows(explicit), ...rows(derived)]) {
    const key = `${link.sourceId}|${link.passageId}|${link.targetKey}|${link.feature || ''}`
    if (seen.has(key)) continue
    seen.add(key); out.push(link)
  }
  return out.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
}

export function getStaticStudyStore(surah) {
  const pkg = pkgForSurah(surah), p = pkg?.portal
  if (!p) return { surahs: {}, drafts: {}, published: {}, studySections: [], studySources: [], studySourceLinks: [], studyPresentationOverrides: [], studyEnglishNotes: [], tafsirAyahKeys: [], irabTerms: [], vocabRoots: [], vocabDictionaries: [], vocabLemmas: [], vocabEntries: [], vocabWordMappings: [], wordIrabRecords: [], snapshotVerseKeys: [], sourceVerseKeys: [], snapshotAvailable: false, sourcesAvailable: false }
  const studySourceLinks = mergeLinks(p.verses?.sourceLinks || [], derivedLinks(pkg, Number(surah)))
  // Every draft key is emitted for every ayah in the imported snapshot range,
  // including ayahs whose authored Study fields are still empty. This lets the
  // public reader distinguish "snapshot exists" from "no snapshot ever imported".
  const snapshotVerseKeys = Object.keys(p.verses?.drafts || {}).filter((key) => String(key).startsWith(`${Number(surah)}:`))
  const sourceVerseKeys = [...new Set(studySourceLinks.map((item) => clean(item?.targetKey)).filter((key) => key.startsWith(`${Number(surah)}:`)))]
  return {
    surahs: p.surah?.legacy ? { [String(p.surah.number)]: p.surah.legacy } : {},
    drafts: p.verses?.drafts || {},
    published: p.verses?.drafts || {},
    studySections: [...rows(p.surah?.sections), ...rows(p.verses?.sections)],
    studySources: rows(pkg.manifest?.books),
    studySourceLinks,
    studyPresentationOverrides: rows(p.studyPresentationOverrides),
    studyEnglishNotes: rows(p.studyEnglishNotes),
    tafsirAyahKeys: [...new Set(studySourceLinks.filter((item) => /tahrir|tafsir/i.test(clean(item.sourceId))).map((item) => clean(item.targetKey)).filter(Boolean))],
    irabTerms: p.words?.irabTerms || [],
    vocabRoots: p.words?.roots || [],
    vocabDictionaries: p.words?.dictionaries || [],
    vocabLemmas: p.words?.lemmas || [],
    vocabEntries: p.words?.entries || [],
    vocabWordMappings: p.words?.mappings || [],
    wordIrabRecords: p.words?.irabRecords || [],
    snapshotVerseKeys,
    sourceVerseKeys,
    snapshotAvailable: snapshotVerseKeys.length > 0,
    sourcesAvailable: sourceVerseKeys.length > 0,
  }
}

export function getStaticPassage(sourceId, passageId, surah = 81) {
  const pkg = pkgForSurah(surah), data = bookData(pkg, sourceId)
  const entry = rows(data?.entries).find((item) => String(item.id) === String(passageId))
  return entry ? { source: bookMeta(pkg, sourceId) || data?.source || null, passage: normalizePassage(entry) } : null
}

export function getStaticTafsir(verseKey) {
  const surah = Number(clean(verseKey).split(':')[0]), pkg = pkgForSurah(surah), store = getStaticStudyStore(surah)
  const links = rows(store.studySourceLinks).filter((item) => String(item.targetKey) === String(verseKey) && /tahrir|tafsir/i.test(clean(item.sourceId)))
  const items = links.map((link) => {
    const hit = getStaticPassage(link.sourceId, link.passageId, surah)
    if (!hit) return null
    return {
      ...hit.passage,
      passageId: hit.passage?.id || link.passageId,
      sourceId: link.sourceId,
      sourceSlug: hit.source?.slug || link.sourceId,
      sourceNameArabic: hit.source?.nameArabic || '',
      sourceNameEnglish: hit.source?.nameEnglish || '',
      authorArabic: hit.source?.authorArabic || '',
      authorEnglish: hit.source?.authorEnglish || '',
    }
  }).filter(Boolean)
  const tahrir = rows(pkg?.books).find((item) => /tahrir/i.test(String(item?.source?.slug || '')))
  const tahrirMeta = rows(pkg?.manifest?.books).find((item) => item.slug === tahrir?.source?.slug) || null
  const surahIntroductions = rows(tahrir?.entries)
    .filter((entry) => entry?.passageKind === 'surah-introduction' || entry?.passageKind === 'surah-intro')
    .map((entry) => ({
      ...normalizePassage(entry),
      passageId: entry.id,
      sourceId: tahrirMeta?.id || tahrir?.source?.id || '',
      sourceSlug: tahrirMeta?.slug || tahrir?.source?.slug || '',
      sourceNameArabic: tahrirMeta?.nameArabic || '',
      sourceNameEnglish: tahrirMeta?.nameEnglish || '',
      authorArabic: tahrirMeta?.authorArabic || '',
      authorEnglish: tahrirMeta?.authorEnglish || '',
    }))
  return { verseKey, items, surahIntroductions }
}

function dictionaryGroup(meta, data, rootArabic) {
  const entries = rows(data?.entries).filter((entry) => {
    const keys = [entry.rootArabic, entry.rootKey, ...rows(entry.rootKeys), entry.foldedRootKey, ...rows(entry.foldedRootKeys)].filter(Boolean)
    return keys.some((key) => norm(key) === norm(rootArabic))
  }).map((entry) => ({ ...entry, arabic: entry.articleArabic || entry.articleArabicRaw || '', arabicBlocks: entry.blocks || [], locator: entry.locator || [entry.volume ? `vol. ${entry.volume}` : '', entry.printedPageStart ? `p. ${entry.printedPageStart}` : ''].filter(Boolean).join(', ') }))
  if (!entries.length) return null
  return { dictionary: { ...meta, id: `dict-${meta.slug}`, slug: meta.slug }, entries }
}

export function lookupStaticDictionaries(rootArabic, surah = 81) {
  const pkg = pkgForSurah(surah)
  if (!pkg) return { dictionaries: [], warnings: [] }
  const slugs = ['maqayis-al-lughah', 'al-mujam-al-ishtiqaqi', 'kitab-al-ayn']
  const dictionaries = slugs.map((slug) => {
    const meta = rows(pkg.manifest?.books).find((item) => item.slug === slug)
    const data = rows(pkg.books).find((item) => item?.source?.slug === slug)
    return meta && data ? dictionaryGroup(meta, data, rootArabic) : null
  }).filter(Boolean)
  return { dictionaries, warnings: [] }
}

export function getStaticWordIrab(verseKey, wordNumber, segmentNumber = 0) {
  const store = getStaticStudyStore(Number(clean(verseKey).split(':')[0]))
  return rows(store.wordIrabRecords).find((record) => record.verseKey === verseKey && Number(record.wordNumber) === Number(wordNumber) && Number(record.segmentNumber || 0) === Number(segmentNumber)) || null
}
