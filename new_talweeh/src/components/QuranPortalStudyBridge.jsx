import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getStaticStudyStore, getStaticPassage, lookupStaticDictionaries } from './QuranPortalStaticStore'
import { StudyWordToken, findReaderVocabMapping, readerWordHasIrab } from './QuranStudyHover'
import { findStudyVocabLink, QuranReaderStudyDialog, StudyTranslationText } from './QuranReaderStudyLayer'

const emptyStore = getStaticStudyStore(0)

function plain(value) { return String(value ?? '').trim() }
function rows(value) { return Array.isArray(value) ? value : [] }
function sectionHasContent(item) { return Boolean(plain(item?.english) || plain(item?.arabic)) }
function normalizeArabic(value) {
  return String(value || '').normalize('NFKD')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ـ/g, '').replace(/\s+/g, '')
}
function readTextField(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return String(value.text || value.value || value.translation || '')
  return ''
}
function visibleByLanguage(languageMode, english, arabic) {
  if (languageMode === 'english') return Boolean(plain(english))
  if (languageMode === 'arabic') return Boolean(plain(arabic))
  return Boolean(plain(english) || plain(arabic))
}

export function usePortalStudy(chapterNumber, enabled = true, active = enabled) {
  const store = useMemo(() => enabled ? getStaticStudyStore(chapterNumber) : emptyStore, [chapterNumber, enabled])
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.body.classList.toggle('qmr-study-active', Boolean(active))
    return () => document.body.classList.remove('qmr-study-active')
  }, [active])
  return { store, loading: false }
}

function snapshotHasVerse(store, verseKey) {
  return rows(store?.snapshotVerseKeys).includes(String(verseKey || ''))
}

function effectiveSectionItems(store, verseKey, feature, tabId, legacyItems = []) {
  const section = rows(store.studySections).find((item) =>
    String(item?.targetKey || '') === String(verseKey || '') &&
    String(item?.feature || item?.kind || '').toLowerCase() === feature &&
    (!tabId || String(item?.tabId || '').toLowerCase() === tabId)
  )
  if (!section) return rows(legacyItems)
  if (!sectionHasContent(section)) return []
  return [{ id: section.id, english: section.english || '', arabic: section.arabic || '' }]
}

function splitFawaid(items) {
  const qiraat = [], normal = []
  for (const item of rows(items)) {
    if (/qir|قراء|قراءات/i.test(String(item?.categories || ''))) qiraat.push(item)
    else normal.push(item)
  }
  return { qiraat, normal }
}

function RabtPreviewChip({ verseKey, items, onOpen, hoverEnabled, hoverSize, languageMode }) {
  const anchorRef = useRef(null)
  const cardRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: -10000, left: -10000, visibility: 'hidden' })
  const visibleItems = rows(items).filter((item) => visibleByLanguage(languageMode, item?.english, item?.arabic))
  const hasItems = visibleItems.length > 0

  const cancelClose = () => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }
  const showPreview = () => { if (hoverEnabled && hasItems) { cancelClose(); setOpen(true) } }
  const scheduleClose = () => { cancelClose(); closeTimerRef.current = setTimeout(() => setOpen(false), 180) }
  const openDialog = () => { cancelClose(); setOpen(false); onOpen({ kind: 'rabt', verseKey, items }) }

  useEffect(() => () => cancelClose(), [])
  useEffect(() => { if (!hoverEnabled) setOpen(false) }, [hoverEnabled])
  useEffect(() => {
    if (!open || !hasItems) return undefined
    const update = () => {
      const anchor = anchorRef.current, card = cardRef.current
      if (!anchor || !card) return
      const edge = 12, gap = 12
      const a = anchor.getBoundingClientRect(), c = card.getBoundingClientRect()

      // Match the portal: open beside Rabṭ first, flip to the left when needed,
      // and only center as the final narrow-screen fallback.
      let left = a.right + gap
      if (left + c.width > window.innerWidth - edge) {
        const leftSide = a.left - c.width - gap
        if (leftSide >= edge) left = leftSide
        else left = a.left + a.width / 2 - c.width / 2
      }
      left = Math.max(edge, Math.min(left, window.innerWidth - c.width - edge))

      let top = a.top - 12
      if (top + c.height > window.innerHeight - edge) top = window.innerHeight - c.height - edge
      top = Math.max(edge, top)
      setPosition({ top, left, visibility: 'visible' })
    }
    const frame = requestAnimationFrame(update)
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [open, hasItems, verseKey, hoverSize, languageMode, visibleItems.length])

  const preview = open && hasItems && typeof document !== 'undefined' ? createPortal(
    <div ref={cardRef} className={`qmr-rabt-portal-card qmr-rabt-portal-card--${hoverSize}`} role="tooltip" style={position}
      onMouseEnter={showPreview} onMouseLeave={scheduleClose} onFocus={showPreview} onBlur={scheduleClose}>
      <span className="qmr-rabt-portal-title">Rabṭ</span>
      <div className="qmr-rabt-portal-scroll">
        {visibleItems.map((item, index) => <div className="qmr-rabt-portal-item" key={item.id || index}>
          {languageMode !== 'arabic' && plain(item.english) ? <div className="qmr-rabt-portal-en">{item.english}</div> : null}
          {languageMode !== 'english' && plain(item.arabic) ? <div className="qmr-rabt-portal-ar" dir="rtl" lang="ar">{item.arabic}</div> : null}
        </div>)}
      </div>
      <button type="button" className="qmr-rabt-portal-open" onClick={openDialog}>Open Rabṭ</button>
    </div>, document.body) : null

  if (!hasItems) return null
  return <>
    <span ref={anchorRef} className="qmr-rabt-chip-wrap qmr-rabt-chip-wrap--portal" onMouseEnter={showPreview} onMouseLeave={scheduleClose} onFocus={showPreview} onBlur={scheduleClose}>
      <button type="button" className="qmr-study-chip qmr-study-chip-rabt" onClick={openDialog} aria-haspopup="dialog">Rabṭ{items.length > 1 ? <span>{items.length}</span> : null}</button>
    </span>
    {preview}
  </>
}

function StudyArabic({ verse, script, store, onOpen, hoverEnabled, hoverSize }) {
  const indopak = script === 'indopak'
  const arabicClass = indopak ? 'qmr-arabic qmr-arabic--indopak' : 'qmr-arabic'
  const displayedArabic = indopak ? String(verse.text_indopak || '') : String(verse.text_uthmani || '')
  const metadata = rows(verse.words)
  const metadataWords = metadata.map((item) => indopak
    ? String(item?.text_indopak || item?.text_uthmani || item?.text || '').trim()
    : String(item?.text_uthmani || item?.text || '').trim()
  ).filter(Boolean)
  const words = metadataWords.length ? metadataWords : displayedArabic.split(/\s+/).filter(Boolean)
  const arabicMark = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/
  function metadataArabicValues(item) {
    return [item?.text_uthmani, item?.text_uthmani_simple, item?.text_imlaei, item?.text_imlaei_simple, item?.text_indopak, item?.text]
      .map((value) => normalizeArabic(value || '')).filter(Boolean)
  }
  function hasTooltip(item) {
    return Boolean(readTextField(item?.translation || item?.word_translation || item?.translation_text) || readTextField(item?.transliteration || item?.transliteration_text))
  }
  const firstVisible = normalizeArabic(words[0] || '')
  const firstIndex = firstVisible ? metadata.findIndex((item) => metadataArabicValues(item).includes(firstVisible)) : 0
  const offset = firstIndex > 0 ? firstIndex : 0
  function metaFor(wordArabic, index) {
    const target = normalizeArabic(wordArabic)
    const positional = metadata[index + offset] || metadata[index] || null
    if (positional && metadataArabicValues(positional).includes(target) && hasTooltip(positional)) return positional
    return metadata.find((item) => metadataArabicValues(item).includes(target) && hasTooltip(item)) || metadata.find((item) => metadataArabicValues(item).includes(target)) || positional
  }
  function detachLeadingClitic(token, letter) {
    const chars = Array.from(String(token || ''))
    if (chars[0] !== letter) return null
    let cut = 1
    while (cut < chars.length && arabicMark.test(chars[cut])) cut += 1
    const prefix = chars.slice(0, cut).join(''), remainder = chars.slice(cut).join('')
    return prefix && remainder ? [prefix, remainder] : null
  }
  const segments = []
  words.forEach((wordArabic, index) => {
    const item = metaFor(wordArabic, index)
    const wordNumber = Number(item?.position) || index + 1
    const transliteration = readTextField(item?.transliteration || item?.transliteration_text)
    const translation = readTextField(item?.translation || item?.word_translation || item?.translation_text)
    const wa = /^wa-(.+)$/i.exec(transliteration), fa = /^fa-(.+)$/i.exec(transliteration)
    let split = null, prefixTransliteration = '', prefixTranslation = '', remainderTransliteration = transliteration
    if (wa) { split = detachLeadingClitic(wordArabic, 'و'); prefixTransliteration = 'wa'; prefixTranslation = 'and'; remainderTransliteration = wa[1] }
    else if (fa) { split = detachLeadingClitic(wordArabic, 'ف'); prefixTransliteration = 'fa'; prefixTranslation = 'then / so'; remainderTransliteration = fa[1] }
    if (split) {
      segments.push({ wordArabic: split[0], wordNumber, segmentNumber: 1, transliteration: prefixTransliteration, translation: prefixTranslation })
      segments.push({ wordArabic: split[1], wordNumber, segmentNumber: 2, transliteration: remainderTransliteration, translation })
    } else segments.push({ wordArabic, wordNumber, segmentNumber: 0, transliteration, translation })
  })
  if (!segments.length) return <p className={arabicClass} dir="rtl" lang="ar">{displayedArabic}</p>
  const draft = store.drafts?.[verse.verse_key] || {}
  return <p className={arabicClass} dir="rtl" lang="ar">{segments.map((segment, index) => {
    const mappedVocab = findReaderVocabMapping(store.vocabWordMappings || [], verse.verse_key, segment) || findStudyVocabLink(draft, segment.wordArabic) || null
    const hasIrab = readerWordHasIrab(store.wordIrabRecords || [], verse.verse_key, segment)
    return <span key={`${verse.verse_key}-${segment.wordNumber}-${segment.segmentNumber}-${index}`}>
      {index > 0 && segments[index - 1]?.wordNumber !== segment.wordNumber ? ' ' : ''}
      <StudyWordToken verseKey={verse.verse_key} segment={segment} mappedVocab={mappedVocab} hasIrab={hasIrab} hoverEnabled={hoverEnabled} hoverSize={hoverSize} onOpenStudy={onOpen} />
    </span>
  })}</p>
}

export function makePortalAyahStudy({ verse, store, onOpen, script = 'uthmani', languageMode = 'both', rabtHoverEnabled = true, rabtHoverSize = 'compact' }) {
  const key = verse.verse_key
  if (!snapshotHasVerse(store, key)) return {}
  const draft = store.drafts?.[key] || {}
  const rabtItems = effectiveSectionItems(store, key, 'rabt', 'rabt', draft.rabt || [])
  const irabItems = effectiveSectionItems(store, key, 'irab', 'irab', draft.irab || [])
  const split = splitFawaid(draft.fawaid || [])
  const verseSections = rows(store.studySections).filter((item) => String(item?.targetKey || '') === String(key))
  const hasSavedFawaid = verseSections.some((item) => item?.feature === 'fawaid' && sectionHasContent(item))
  const hasSavedQiraat = verseSections.some((item) => item?.feature === 'qiraat' && sectionHasContent(item))
  const tafsirItems = effectiveSectionItems(store, key, 'tafsir', 'tafsir', draft.tafsir || [])
    .filter((item) => !item?.imported && visibleByLanguage(languageMode, item?.english, item?.arabic))
  const translations = rows(draft.translations).filter((item) => plain(item?.translation)).slice(0, 2)

  const before = rabtItems.length ? <div className="qmr-study-before-ayah"><RabtPreviewChip verseKey={key} items={rabtItems} onOpen={onOpen} hoverEnabled={rabtHoverEnabled} hoverSize={rabtHoverSize} languageMode={languageMode} /></div> : null
  const arabic = <StudyArabic verse={verse} script={script} store={store} onOpen={onOpen} hoverEnabled={rabtHoverEnabled} hoverSize={rabtHoverSize} />
  const translated = translations.length ? <div className="qmr-study-translation-stack">{translations.map((translation, index) => <p key={translation.id || `${key}-translation-${index}`} className={`qmr-translation qmr-study-translation${index === 1 ? ' qmr-study-translation-secondary' : ''}`}><StudyTranslationText verseKey={key} translation={translation} onOpen={onOpen} languageMode={languageMode} hoverEnabled={rabtHoverEnabled} hoverSize={rabtHoverSize} /></p>)}</div> : undefined
  const actions = (irabItems.length || split.normal.length || hasSavedFawaid || tafsirItems.length || split.qiraat.length || hasSavedQiraat) ? <div className="qmr-study-actions" aria-label={`Study details for ${key}`}>
    {irabItems.length ? <button type="button" className="qmr-study-chip" onClick={() => onOpen({ kind: 'irab', verseKey: key, items: irabItems })}>Iʿrāb{irabItems.length > 1 ? <span>{irabItems.length}</span> : null}</button> : null}
    {(split.normal.length || hasSavedFawaid) ? <button type="button" className="qmr-study-chip" onClick={() => onOpen({ kind: 'fawaid', verseKey: key, items: split.normal })}>Fawāʾid{split.normal.length > 1 ? <span>{split.normal.length}</span> : null}</button> : null}
    {tafsirItems.length ? <button type="button" className="qmr-study-chip" onClick={() => onOpen({ kind: 'tafsir', verseKey: key, items: tafsirItems, importedAvailable: false })}>Tafsīr</button> : null}
    {(split.qiraat.length || hasSavedQiraat) ? <button type="button" className="qmr-study-chip" onClick={() => onOpen({ kind: 'qiraat', verseKey: key, items: split.qiraat })}>Qirāʾāt{split.qiraat.length > 1 ? <span>{split.qiraat.length}</span> : null}</button> : null}
  </div> : null
  return { before, arabic, translation: translated, actions }
}

export function PortalStudyDialog({ detail, store, languageMode = 'both', onClose }) {
  if (!detail) return null
  return <QuranReaderStudyDialog detail={detail} vocabRoots={store.vocabRoots} vocabDictionaries={store.vocabDictionaries} vocabLemmas={store.vocabLemmas} vocabEntries={store.vocabEntries} irabTerms={store.irabTerms} wordIrabRecords={store.wordIrabRecords} languageMode={languageMode} onClose={onClose} canEdit={false} />
}

export function surahStudyDetail(chapterNumber, store) {
  const key = String(chapterNumber)
  const legacy = store.surahs?.[key] || null
  const hasSections = rows(store.studySections).some((item) => item?.feature === 'surah' && String(item?.targetKey || '') === key && sectionHasContent(item))
  if (!legacy && !hasSections) return null
  return { kind: 'surah', verseKey: key, surah: legacy || { number: chapterNumber, metadata: [] } }
}

export function sourceLinksForVerse(store, verseKey) {
  return rows(store.studySourceLinks).filter((item) => String(item?.targetKey || '') === String(verseKey || ''))
}

const SOURCE_FEATURE_META = {
  irab: { label: 'Iʿrāb', order: 10 },
  tafsir: { label: 'Tafsīr', order: 20 },
  dictionaries: { label: 'Dictionaries', order: 30 },
  rabt: { label: 'Rabṭ', order: 40 },
  fawaid: { label: 'Fawāʾid', order: 50 },
  qiraat: { label: 'Qirāʾāt', order: 60 },
  translation: { label: 'Translation', order: 70 },
  source: { label: 'Sources', order: 90 },
}

function sourceFeatureKey(link) {
  const feature = String(link?.feature || '').toLowerCase()
  const sourceId = String(link?.sourceId || '').toLowerCase()
  if (/irab|iʿr|إعراب/.test(feature) || /durr/.test(sourceId)) return 'irab'
  if (/tafsir|تفسير/.test(feature) || /tahrir|tafsir/.test(sourceId)) return 'tafsir'
  if (/dict|lex|vocab/.test(feature) || /maqayis|ishtiqaq|kitab-al-ayn/.test(sourceId)) return 'dictionaries'
  if (/rabt|ربط/.test(feature)) return 'rabt'
  if (/fawa|benefit|فائد/.test(feature)) return 'fawaid'
  if (/qira|قراء/.test(feature)) return 'qiraat'
  if (/translat/.test(feature)) return 'translation'
  return feature && SOURCE_FEATURE_META[feature] ? feature : 'source'
}

function dictionaryRootsForVerse(store, verseKey) {
  const [surahNumber, ayahNumber] = String(verseKey || '').split(':').map(Number)
  const rootsById = new Map(rows(store.vocabRoots).map((root) => [String(root.id), root]))
  const seen = new Set(), out = []
  for (const mapping of rows(store.vocabWordMappings)) {
    const exactKey = String(mapping?.verseKey || '') === String(verseKey || '')
    const numericKey = Number(mapping?.surahNumber) === surahNumber && Number(mapping?.ayahNumber) === ayahNumber
    if (!exactKey && !numericKey) continue
    const rootId = String(mapping?.rootId || '')
    const root = rootsById.get(rootId)
    const rootArabic = plain(root?.rootArabic)
    if (!rootId || !rootArabic || seen.has(rootId)) continue
    const dictionaries = lookupStaticDictionaries(rootArabic, surahNumber || 81)?.dictionaries || []
    if (!dictionaries.length) continue
    seen.add(rootId)
    out.push({ rootId, rootArabic, wordArabic: mapping?.wordArabic || '', wordNumber: mapping?.wordNumber || null })
  }
  return out
}

export function PortalSourceActions({ verseKey, store, onOpen }) {
  if (!snapshotHasVerse(store, verseKey)) return null
  const links = sourceLinksForVerse(store, verseKey)
  const grouped = new Map()
  for (const link of links) {
    const key = sourceFeatureKey(link)
    if (key === 'dictionaries') continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(link)
  }
  const dictionaryRoots = dictionaryRootsForVerse(store, verseKey)
  const groups = Array.from(grouped.entries())
    .map(([key, featureLinks]) => ({ key, links: featureLinks, ...(SOURCE_FEATURE_META[key] || SOURCE_FEATURE_META.source) }))
    .sort((a, b) => a.order - b.order)
  if (dictionaryRoots.length) groups.push({ key: 'dictionaries', links: [], ...SOURCE_FEATURE_META.dictionaries })
  groups.sort((a, b) => a.order - b.order)
  if (!groups.length) return null

  return <div className="qmr-source-actions" aria-label={`Source categories for ${verseKey}`}>
    {groups.map((group) => {
      let count = 0
      if (group.key === 'dictionaries') {
        const ids = new Set()
        for (const root of dictionaryRoots) for (const dictionary of lookupStaticDictionaries(root.rootArabic, Number(String(verseKey).split(':')[0]) || 81)?.dictionaries || []) ids.add(dictionary?.dictionary?.id || dictionary?.dictionary?.slug)
        count = ids.size
      } else count = new Set(group.links.map((item) => item.sourceId).filter(Boolean)).size
      return <button type="button" key={group.key} className="qmr-study-chip qmr-source-chip" onClick={() => onOpen(group.key === 'dictionaries'
        ? { kind: 'dictionaries', category: group.key, label: group.label, verseKey, roots: dictionaryRoots }
        : { kind: 'book-source', category: group.key, label: group.label, verseKey, links: group.links })}>
        {group.label}{count > 1 ? <span>{count}</span> : null}
      </button>
    })}
  </div>
}

function sourceLabel(source) { return source?.nameEnglish || source?.nameArabic || source?.slug || 'Source' }
function sourceArabicBlocks(passage) {
  const blocks = rows(passage?.blocks || passage?.arabicBlocks)
  if (blocks.length) return blocks
  const arabic = passage?.arabic || passage?.rawArabic || passage?.textArabic || passage?.articleArabic || ''
  return arabic ? [{ id: 'arabic', type: 'prose', text: arabic }] : []
}
function SourceArabicBody({ passage }) {
  const blocks = sourceArabicBlocks(passage)
  if (!blocks.length) return <p className="qmr-study-muted">No Arabic passage text is available.</p>
  return <>{blocks.map((block, index) => block?.type === 'heading'
    ? <h5 key={block.id || index}>{block.text}</h5>
    : block?.type === 'poetry'
      ? <blockquote key={block.id || index}>{block.text || rows(block.lines).join('\n')}</blockquote>
      : <p key={block.id || index}>{block.text || rows(block.lines).join('\n')}</p>)}</>
}
function SourcePassage({ hit, languageMode }) {
  const passage = hit?.passage || {}, source = hit?.source || {}
  const english = passage.english || passage.textEnglish || passage.translationEnglish || ''
  return <div className="qmr-source-reader-passage">
    <div className="qmr-source-reader-meta">
      <div>{source.nameArabic ? <strong dir="rtl" lang="ar">{source.nameArabic}</strong> : null}<span>{source.nameEnglish || source.slug || ''}</span></div>
      {passage.locator ? <small>{passage.locator}</small> : null}
    </div>
    {languageMode !== 'english' ? <div className="qmr-source-reader-arabic" dir="rtl" lang="ar">
      {passage.headingArabic ? <h4>{passage.headingArabic}</h4> : null}
      <SourceArabicBody passage={passage} />
    </div> : null}
    {languageMode !== 'arabic' ? <div className="qmr-source-reader-english">{passage.headingEnglish ? <h4>{passage.headingEnglish}</h4> : null}{english ? <p>{english}</p> : <p className="qmr-study-muted">No English rendering is available for this source passage.</p>}</div> : null}
  </div>
}

function DictionaryPassage({ item, languageMode }) {
  const source = item?.dictionary || {}, entries = rows(item?.entries)
  return <div className="qmr-source-reader-passage qmr-source-reader-passage--dictionary">
    <div className="qmr-source-reader-meta">
      <div>{source.nameArabic ? <strong dir="rtl" lang="ar">{source.nameArabic}</strong> : null}<span>{source.nameEnglish || source.slug || 'Dictionary'}</span></div>
      <small>{item?.rootArabic ? `Root ${item.rootArabic}` : ''}</small>
    </div>
    {languageMode !== 'english' ? <div className="qmr-source-reader-arabic" dir="rtl" lang="ar">
      {item?.wordArabic ? <h4>{item.wordArabic} · {item.rootArabic}</h4> : item?.rootArabic ? <h4>{item.rootArabic}</h4> : null}
      {entries.map((entry, index) => <section className="qmr-source-dictionary-entry" key={entry.id || index}>
        {entry.headwordArabic ? <h5>{entry.headwordArabic}</h5> : null}
        <SourceArabicBody passage={{ ...entry, blocks: entry.arabicBlocks || entry.blocks, arabic: entry.arabic }} />
        {entry.locator ? <small className="qmr-source-dictionary-locator">{entry.locator}</small> : null}
      </section>)}
    </div> : null}
    {languageMode !== 'arabic' ? <div className="qmr-source-reader-english">
      {entries.some((entry) => plain(entry.english || entry.textEnglish || entry.translationEnglish))
        ? entries.map((entry, index) => plain(entry.english || entry.textEnglish || entry.translationEnglish) ? <p key={entry.id || index}>{entry.english || entry.textEnglish || entry.translationEnglish}</p> : null)
        : <p className="qmr-study-muted">No English rendering is available for this dictionary source.</p>}
    </div> : null}
  </div>
}

export function PortalSourceDialog({ detail, store, languageMode = 'both', onClose }) {
  const links = rows(detail?.links)
  const directResolved = useMemo(() => links.map((link) => ({
    id: link.id,
    link,
    hit: getStaticPassage(link.sourceId, link.passageId, Number(String(detail?.verseKey || '').split(':')[0]) || 81),
  })).filter((item) => item.hit), [detail?.verseKey, detail?.category, links.map((item) => item.id).join('|')])

  const rootGroups = useMemo(() => {
    if (detail?.kind !== 'dictionaries') return []
    const surah = Number(String(detail?.verseKey || '').split(':')[0]) || 81
    return rows(detail?.roots).map((root) => {
      const payload = lookupStaticDictionaries(root.rootArabic, surah)
      const dictionaries = rows(payload?.dictionaries)
        .filter((group) => rows(group?.entries).length)
        .map((group) => ({
          id: `dict:${root.rootId}:${group.dictionary?.id || group.dictionary?.slug}`,
          rootId: root.rootId,
          rootArabic: root.rootArabic,
          wordArabic: root.wordArabic,
          dictionary: group.dictionary,
          entries: group.entries,
        }))
      return { ...root, dictionaries }
    }).filter((root) => root.dictionaries.length)
  }, [detail?.kind, detail?.verseKey, rows(detail?.roots).map((item) => `${item.rootId}:${item.rootArabic}`).join('|')])

  const [selectedDirectId, setSelectedDirectId] = useState('')
  const [selectedRootId, setSelectedRootId] = useState('')
  const [selectedDictionaryId, setSelectedDictionaryId] = useState('')
  const directKey = directResolved.map((item) => item.id).join('|')
  const rootKey = rootGroups.map((root) => `${root.rootId}:${root.dictionaries.map((item) => item.id).join(',')}`).join('|')

  useEffect(() => { setSelectedDirectId(directResolved[0]?.id || '') }, [detail?.verseKey, detail?.category, directKey])
  useEffect(() => { setSelectedRootId(rootGroups[0]?.rootId || '') }, [detail?.verseKey, detail?.category, rootKey])

  const selectedRoot = rootGroups.find((root) => String(root.rootId) === String(selectedRootId)) || rootGroups[0]
  const selectedRootDictionaryKey = rows(selectedRoot?.dictionaries).map((item) => item.id).join('|')
  useEffect(() => { setSelectedDictionaryId(selectedRoot?.dictionaries?.[0]?.id || '') }, [selectedRoot?.rootId, selectedRootDictionaryKey])

  if (!detail || typeof document === 'undefined') return null
  const title = detail.label || SOURCE_FEATURE_META[detail.category]?.label || 'Sources'
  const selectedDirect = directResolved.find((item) => item.id === selectedDirectId) || directResolved[0]
  const selectedDictionary = rows(selectedRoot?.dictionaries).find((item) => item.id === selectedDictionaryId) || selectedRoot?.dictionaries?.[0]
  const isDictionary = detail.kind === 'dictionaries'

  return createPortal(<>
    <button type="button" className="qmr-study-dialog-backdrop" aria-label={`Close ${title}`} onClick={onClose} />
    <section className="qmr-source-reader-dialog" role="dialog" aria-modal="true" aria-label={`${title} for ${detail.verseKey}`} data-qmr-study-language={languageMode}>
      <header className="qmr-study-dialog-head"><div><small>{detail.verseKey}</small><h3>{title}</h3></div><button type="button" className="qmr-study-dialog-close" aria-label="Close" onClick={onClose}>×</button></header>

      {isDictionary ? (
        <div className="qmr-source-reader-body qmr-source-reader-body--dictionary">
          <nav className="qmr-source-root-tabs" aria-label="Arabic roots">
            <span className="qmr-source-nav-label">Root</span>
            {rootGroups.map((root) => <button type="button" key={root.rootId} className={String(selectedRoot?.rootId) === String(root.rootId) ? 'is-active' : ''} onClick={() => setSelectedRootId(root.rootId)}>
              <strong dir="rtl" lang="ar">{root.rootArabic}</strong>
              {root.wordArabic ? <small dir="rtl" lang="ar">{root.wordArabic}</small> : null}
            </button>)}
          </nav>
          <div className="qmr-source-reader-stage">
            {selectedRoot ? <div className="qmr-source-root-heading"><span>Root</span><strong dir="rtl" lang="ar">{selectedRoot.rootArabic}</strong></div> : null}
            {rows(selectedRoot?.dictionaries).length ? <nav className="qmr-source-dictionary-tabs" aria-label={`Dictionaries for ${selectedRoot?.rootArabic || ''}`}>
              {rows(selectedRoot?.dictionaries).map((item) => <button type="button" key={item.id} className={selectedDictionary?.id === item.id ? 'is-active' : ''} onClick={() => setSelectedDictionaryId(item.id)}>{sourceLabel(item.dictionary)}</button>)}
            </nav> : null}
            {selectedDictionary ? <DictionaryPassage item={selectedDictionary} languageMode={languageMode} /> : <p className="qmr-study-muted qmr-source-reader-empty">No published dictionary entry is available for this root.</p>}
          </div>
        </div>
      ) : (
        <div className={`qmr-source-reader-body${directResolved.length <= 1 ? ' qmr-source-reader-body--single' : ''}`}>
          {directResolved.length > 1 ? <nav className="qmr-source-reader-tabs" aria-label={`${title} sources`}>{directResolved.map((item) => <button type="button" key={item.id} className={selectedDirect?.id === item.id ? 'is-active' : ''} onClick={() => setSelectedDirectId(item.id)}><strong>{sourceLabel(item.hit?.source)}</strong><small>{title}</small></button>)}</nav> : null}
          {selectedDirect ? <SourcePassage hit={selectedDirect.hit} languageMode={languageMode} /> : <p className="qmr-study-muted qmr-source-reader-empty">No published {title.toLowerCase()} source is mapped here yet.</p>}
        </div>
      )}
    </section>
  </>, document.body)
}
