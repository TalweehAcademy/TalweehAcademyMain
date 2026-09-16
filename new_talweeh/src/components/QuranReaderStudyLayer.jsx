/* eslint-disable react/prop-types */
'use client'

import { TranslationAnnotationButton } from './QuranStudyHover'

import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import QuranWordIrabPanel from './QuranWordIrabPanel'
import { getStaticStudyStore, getStaticTafsir, getStaticPassage, lookupStaticDictionaries } from './QuranPortalStaticStore'

function plain(value) {
  return String(value || '').trim()
}

export function normalizeStudyArabic(value) {
  return plain(value)
    .normalize('NFKD')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/\s+/g, '')
}

export function findStudyVocabLink(studyDraft, word) {
  if (!studyDraft?.vocab?.length) return null
  const target = normalizeStudyArabic(word)
  if (!target) return null
  return studyDraft.vocab.find((item) => normalizeStudyArabic(item.wordArabic) === target) || null
}

function normalizeAnnotationLabel(value) {
  return plain(value).replace(/^[\[\(]\s*/, '').replace(/\s*[\]\)]$/, '').trim().toLowerCase()
}

function findBracketNote(notes, bracketText) {
  const target = normalizeAnnotationLabel(bracketText)
  return (notes || []).find((note) => normalizeAnnotationLabel(note.text) === target) || null
}

export function StudyTranslationText({
  translation,
  verseKey,
  onOpen,
  allowCreateNotes = false,
  hoverEnabled = true,
  hoverSize = 'compact',
  languageMode = 'both',
}) {
  const text = plain(translation?.translation)
  if (!text) return null

  const parts = []
  const pattern = /(\[([^\]]+)\]|\(([^)]+)\))/g
  let lastIndex = 0
  let match
  let occurrence = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const original = match[0]
    const label = match[2] || match[3] || ''
    const existingNote = findBracketNote(
      translation?.brackets || [],
      label
    )

    occurrence += 1

    if (existingNote || allowCreateNotes) {
      const note =
        existingNote || {
          id: '',
          text: label,
          reason: '',
          reference: '',
        }

      parts.push(
        <TranslationAnnotationButton
          key={`${verseKey}-annotation-${match.index}-${occurrence}`}
          original={original}
          existingNote={existingNote}
          note={note}
          verseKey={verseKey}
          translationId={translation?.id || ''}
          hoverEnabled={hoverEnabled}
          hoverSize={hoverSize}
          languageMode={languageMode}
          onOpen={onOpen}
        />
      )
    } else {
      parts.push(original)
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

function ArabicBlock({ children, subtle = false }) {
  if (!plain(children)) return null
  return <div className={subtle ? 'qmr-study-arabic qmr-study-arabic-subtle' : 'qmr-study-arabic'} dir="rtl" lang="ar">{children}</div>
}

function ReferenceList({ refs }) {
  if (!Array.isArray(refs) || refs.length === 0) return null
  return <div className="qmr-study-reference-list">{refs.map((ref) => (
    <div className="qmr-study-reference" key={ref.id || `${ref.locator}-${ref.arabic}`}>
      <ArabicBlock>{ref.arabic}</ArabicBlock>
      {ref.locator ? <small dir="rtl">{ref.locator}</small> : null}
    </div>
  ))}</div>
}

function detailTarget(detail) {
  if (!detail) return { feature: '', targetKey: '' }
  const wordKey = `${detail.verseKey}:word:${detail.wordNumber || normalizeStudyArabic(detail.word?.wordArabic || detail.link?.wordArabic)}`
  if (detail.kind === 'vocab') return { feature: 'vocab', targetKey: `${detail.verseKey}:word:${detail.wordNumber || normalizeStudyArabic(detail.link?.wordArabic)}` }
  if (detail.kind === 'word-vocab') return { feature: 'vocab', targetKey: wordKey }
  if (detail.kind === 'word-irab') return { feature: 'irab', targetKey: wordKey }
  if (detail.kind === 'word-sarf') return { feature: 'sarf', targetKey: wordKey }
  if (detail.kind === 'bracket') return { feature: 'translation', targetKey: `${detail.verseKey}:annotation:${detail.note?.id || normalizeAnnotationLabel(detail.note?.text)}` }
  if (detail.kind === 'surah') return { feature: 'surah', targetKey: String(detail.verseKey || detail.surah?.number || '') }
  return { feature: detail.kind || '', targetKey: String(detail.verseKey || '') }
}

function legacyEnglish(detail) {
  if (!detail) return ''
  if (detail.kind === 'rabt') return (detail.items || []).map((item) => plain(item.english)).filter(Boolean).join('\n\n')
  if (detail.kind === 'irab') return (detail.items || []).map((item) => plain(item.english)).filter(Boolean).join('\n\n')
  if (detail.kind === 'fawaid') return (detail.items || []).map((item) => plain(item.english)).filter(Boolean).join('\n\n')
  if (detail.kind === 'bracket') return plain(detail.note?.reason)
  return ''
}

function sourceName(source) {
  if (!source) return 'Source'
  const ar = plain(source.nameArabic)
  const en = plain(source.nameEnglish)
  if (ar && en) return `${ar} — ${en}`
  return ar || en || source.slug || 'Source'
}

function useInlineAuthoring(detail) {
  const { feature, targetKey } = detailTarget(detail)
  const [data, setData] = useState({ studySources: [], studyEnglishNotes: [], studySourceLinks: [], studyPresentationOverrides: [],
    vocabRoots: [],
    vocabLemmas: [],
    vocabWordMappings: [],})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const surahNumber = Number(String(targetKey || detail?.verseKey || '').split(':')[0]) || 81
      const payload = getStaticStudyStore(surahNumber)
      setData({
        studySources: payload.studySources || [],
        studyEnglishNotes: payload.studyEnglishNotes || [],
        studySections: payload.studySections || [],
        studySourceLinks: payload.studySourceLinks || [],
        studyPresentationOverrides: payload.studyPresentationOverrides || [],
        vocabRoots: payload.vocabRoots || [],
        vocabLemmas: payload.vocabLemmas || [],
        vocabWordMappings: payload.vocabWordMappings || [],
      })
    } catch (err) {
      setError(err?.message || 'Unable to load Study authoring')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (detail) void refresh() }, [feature, targetKey])

  const noteRecord = data.studyEnglishNotes.find((item) => item.feature === feature && item.targetKey === targetKey) || null
  const links = data.studySourceLinks
    .filter((item) => item.feature === feature && item.targetKey === targetKey)
    .slice()
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))

  async function patch() {
    throw new Error('Public Study mode is read-only.')
  }

  return { feature, targetKey, data, links, noteRecord, loading, error, refresh, patch }
}

function effectiveBlocks(authoring, sourceId, passageId, baseBlocks, baseArabic) {
  const override = authoring.data.studyPresentationOverrides.find((item) => item.sourceId === sourceId && item.passageId === passageId)
  if (override?.blocks?.length) return override.blocks
  if (Array.isArray(baseBlocks) && baseBlocks.length) {
    return baseBlocks.map((block, index) => ({ id: block.id || `base-${index}`, type: block.type || 'prose', text: block.text || (Array.isArray(block.lines) ? block.lines.join('\n') : '') }))
  }
  return plain(baseArabic) ? [{ id: 'base-1', type: 'prose', text: String(baseArabic) }] : []
}

function PresentationBlocks({ blocks, manual = false }) {
  if (!blocks?.length) return null
  return (
    <div
      className={`qmr-source-blocks${manual ? ' qmr-source-blocks--manual' : ''}`}
      dir="rtl"
      lang="ar"
    >
      {blocks.map((block, index) => {
        if (!plain(block.text)) return null

        if (block.type === 'poetry') {
          return (
            <blockquote className="qmr-source-poetry" key={block.id || index}>
              {String(block.text)
                .split('\n')
                .filter((line) => plain(line))
                .map((line, lineIndex) => (
                  <div key={lineIndex}>{line}</div>
                ))}
            </blockquote>
          )
        }

        if (block.type === 'heading') {
          return (
            <h4 className="qmr-source-heading" key={block.id || index}>
              {block.text}
            </h4>
          )
        }

        if (block.type === 'quote') {
          return (
            <blockquote className="qmr-source-quote" key={block.id || index}>
              {block.text}
            </blockquote>
          )
        }

        return (
          <p className="qmr-source-prose" key={block.id || index}>
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

function PresentationEditor({ authoring, sourceId, passageId, baseBlocks, baseArabic, editable = false }) {
  const exactOverride = authoring.data.studyPresentationOverrides.find(
    (item) => item.sourceId === sourceId && item.passageId === passageId
  )
  const passageFallbackOverride = authoring.data.studyPresentationOverrides.find(
    (item) => item.passageId === passageId
  )
  const savedOverride = exactOverride || passageFallbackOverride || null

  const sourceBlocks = Array.isArray(baseBlocks) && baseBlocks.length
    ? baseBlocks.map((block, index) => ({
        id: block.id || `base-${index}`,
        type: block.type || 'prose',
        text:
          block.text ||
          (Array.isArray(block.lines) ? block.lines.join('\n') : ''),
      }))
    : (plain(baseArabic)
        ? [{ id: 'base-1', type: 'prose', text: String(baseArabic) }]
        : [])

  const active = savedOverride?.blocks?.length
    ? savedOverride.blocks
    : sourceBlocks

  const hasOverride = Boolean(savedOverride)
  const [editing, setEditing] = useState(false)
  const [blocks, setBlocks] = useState(active)
  const [committedBlocks, setCommittedBlocks] = useState(active)
  const [committedManual, setCommittedManual] = useState(hasOverride)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const overrideVersion = savedOverride?.updatedAt || ''

  useEffect(() => {
    if (editing) return
    setCommittedBlocks(active)
    setCommittedManual(hasOverride)
    setBlocks(active)
  }, [sourceId, passageId, overrideVersion, editing])

  useEffect(() => {
    if (!editable && editing) setEditing(false)
  }, [editable, editing])

  function changeBlock(index, patch) {
    setBlocks((current) =>
      current.map((block, i) =>
        i === index ? { ...block, ...patch } : block
      )
    )
  }

  function move(index, delta) {
    setBlocks((current) => {
      const next = current.slice()
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setMessage('')

    try {
      const snapshot = blocks.map((block, index) => ({
        id: block.id || `block-${index + 1}`,
        type: block.type || 'prose',
        text: String(block.text || ''),
      }))

      const payload = await authoring.patch({
        action: 'saveOverride',
        sourceId,
        passageId,
        blocks: snapshot,
      })

      const persisted =
        (payload.studyPresentationOverrides || []).find(
          (item) =>
            item.sourceId === sourceId &&
            item.passageId === passageId
        ) ||
        (payload.studyPresentationOverrides || []).find(
          (item) => item.passageId === passageId
        )

      const display = persisted?.blocks?.length
        ? persisted.blocks
        : snapshot

      setCommittedBlocks(display)
      setCommittedManual(true)
      setBlocks(display)
      setEditing(false)
      setMessage('Saved')
    } catch (err) {
      setMessage(err?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    setSaving(true)
    setMessage('')

    try {
      await authoring.patch({
        action: 'resetOverride',
        sourceId,
        passageId,
      })
      setCommittedBlocks(sourceBlocks)
      setCommittedManual(false)
      setBlocks(sourceBlocks)
      setEditing(false)
      setMessage('Reset to source')
    } catch (err) {
      setMessage(err?.message || 'Could not reset')
    } finally {
      setSaving(false)
    }
  }

  if (!editable) {
    return (
      <PresentationBlocks
        blocks={committedBlocks}
        manual={committedManual}
      />
    )
  }

  if (!editing) {
    return (
      <>
        <div className="qmr-source-format-actions">
          <button
            type="button"
            onClick={() => {
              setBlocks(committedBlocks)
              setEditing(true)
            }}
          >
            ✎ Edit source formatting
          </button>
          {committedManual ? (
            <button
              type="button"
              className="qmr-source-reset"
              onClick={reset}
              disabled={saving}
            >
              Reset to source
            </button>
          ) : null}
          {message ? <p className="qmr-inline-message" role="status" aria-live="polite">{message}</p> : null}
        </div>

        <PresentationBlocks
          blocks={committedBlocks}
          manual={committedManual}
        />
      </>
    )
  }

  return (
    <div className="qmr-source-editor">
      <div className="qmr-source-editor-head">
        <strong>Source presentation</strong>
        <span>
          Prose reflows automatically. New lines you add manually are retained.
          Poetry preserves each line.
        </span>
      </div>

      {blocks.map((block, index) => (
        <div className="qmr-source-editor-row" key={block.id || index}>
          <div className="qmr-source-editor-controls">
            <select
              value={block.type}
              onChange={(event) =>
                changeBlock(index, { type: event.target.value })
              }
            >
              <option value="prose">Prose</option>
              <option value="poetry">Poetry</option>
              <option value="heading">Heading</option>
              <option value="quote">Quote</option>
            </select>

            <button type="button" onClick={() => move(index, -1)}>↑</button>
            <button type="button" onClick={() => move(index, 1)}>↓</button>
            <button
              type="button"
              onClick={() =>
                setBlocks((current) =>
                  current.filter((_, i) => i !== index)
                )
              }
            >
              Delete
            </button>
          </div>

          <textarea
            dir="rtl"
            lang="ar"
            rows={block.type === 'poetry' ? 4 : 6}
            value={block.text}
            onChange={(event) =>
              changeBlock(index, { text: event.target.value })
            }
          />
        </div>
      ))}

      <div className="qmr-source-editor-footer">
        <button
          type="button"
          onClick={() =>
            setBlocks((current) => [
              ...current,
              {
                id: `block-${Date.now()}`,
                type: 'prose',
                text: '',
              },
            ])
          }
        >
          + Add block
        </button>

        <span />

        <button type="button" onClick={() => setEditing(false)}>
          Cancel
        </button>

        <button
          type="button"
          className="qmr-source-save"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save formatting'}
        </button>
      </div>

      {message ? <p className="qmr-inline-message" role="status" aria-live="polite">{message}</p> : null}
    </div>
  )
}


function sectionRecord(authoring, tabId) {
  return (authoring.data.studySections || []).find(
    (item) =>
      item.feature === authoring.feature &&
      item.targetKey === authoring.targetKey &&
      item.tabId === tabId
  ) || null
}

function tabSourceAuthoring(authoring, tabId) {
  const targetKey = `${authoring.targetKey}:tab:${tabId}`
  const specific = (authoring.data.studySourceLinks || [])
    .filter(
      (item) =>
        item.feature === authoring.feature &&
        item.targetKey === targetKey
    )
    .slice()
    .sort(
      (a, b) =>
        (Number(a.sortOrder) || 0) -
        (Number(b.sortOrder) || 0)
    )

  return {
    ...authoring,
    targetKey,
    links: specific.length ? specific : authoring.links,
  }
}

function BilingualSectionEditor({
  authoring,
  tab,
  editing,
  editable,
}) {
  const record = sectionRecord(authoring, tab.id)
  const fallbackEnglish = String(
    (tab.useLegacyEnglish && authoring.noteRecord?.english) ||
    tab.fallbackEnglish ||
    ''
  )
  const fallbackArabic = String(tab.fallbackArabic || '')
  const currentEnglish = record ? String(record.english || '') : fallbackEnglish
  const currentArabic = record ? String(record.arabic || '') : fallbackArabic

  const [english, setEnglish] = useState(currentEnglish)
  const [arabic, setArabic] = useState(currentArabic)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setEnglish(record ? String(record.english || '') : fallbackEnglish)
    setArabic(record ? String(record.arabic || '') : fallbackArabic)
    setMessage('')
  }, [
    tab.id,
    record?.updatedAt,
    fallbackEnglish,
    fallbackArabic,
  ])

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      await authoring.patch({
        action: 'saveSection',
        feature: authoring.feature,
        targetKey: authoring.targetKey,
        tabId: tab.id,
        labelArabic: tab.labelArabic || '',
        labelEnglish: tab.labelEnglish || '',
        english,
        arabic,
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quran-study-authoring-updated'))
        window.dispatchEvent(new CustomEvent('quran-study-surah-section-updated'))
      }
      setMessage('Saved')
    } catch (err) {
      setMessage(err?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    setSaving(true)
    setMessage('')
    try {
      await authoring.patch({
        action: 'resetSection',
        feature: authoring.feature,
        targetKey: authoring.targetKey,
        tabId: tab.id,
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quran-study-authoring-updated'))
        window.dispatchEvent(new CustomEvent('quran-study-surah-section-updated'))
      }
      setEnglish(fallbackEnglish)
      setArabic(fallbackArabic)
      setMessage('Reset to imported content')
    } catch (err) {
      setMessage(err?.message || 'Could not reset')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <section className="qmr-study-dialog-section qmr-bilingual-editor">
        <label className="qmr-bilingual-field">
          <span>English</span>
          <small>Talweeh wording. When present it displays first.</small>
          <textarea
            rows={6}
            value={english}
            onChange={(event) => setEnglish(event.target.value)}
            placeholder="Add the English explanation…"
          />
        </label>

        <label className="qmr-bilingual-field">
          <span dir="rtl" lang="ar">العربية</span>
          <small>Edit the Arabic presentation for this section.</small>
          <textarea
            dir="rtl"
            lang="ar"
            rows={8}
            value={arabic}
            onChange={(event) => setArabic(event.target.value)}
            placeholder="أضف النص العربي…"
          />
        </label>

        <div className="qmr-inline-editor-actions">
          {record ? (
            <button
              type="button"
              className="qmr-source-reset"
              onClick={reset}
              disabled={saving}
            >
              Reset to imported
            </button>
          ) : <span />}
          <span />
          <button
            type="button"
            className="qmr-source-save"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {message ? <p className="qmr-inline-message" role="status" aria-live="polite">{message}</p> : null}
      </section>
    )
  }

  const displayEnglish = record ? plain(record.english) : plain(fallbackEnglish)
  const displayArabic = record ? plain(record.arabic) : plain(fallbackArabic)

  if (!displayEnglish && !displayArabic) {
    return editable ? (
      <section className="qmr-study-dialog-section qmr-study-empty-section">
        <p>No content has been added to this section yet.</p>
      </section>
    ) : null
  }

  return (
    <section className="qmr-study-dialog-section qmr-bilingual-display">
      {displayEnglish ? (
        <div className="qmr-bilingual-english">
          <span className="qmr-study-small-label">English</span>
          <p className="qmr-study-prose">{displayEnglish}</p>
        </div>
      ) : null}
      {displayArabic ? <ArabicBlock>{displayArabic}</ArabicBlock> : null}
    </section>
  )
}

function StudyFeatureTabs({
  authoring,
  tabs,
  editing,
  editable,
  showSources = false,
}) {
  const allTabs = tabs.filter(Boolean)

  const tabHasContent = (tab) => {
    const record = sectionRecord(authoring, tab.id)
    return Boolean(
      plain(record?.english) ||
      plain(record?.arabic) ||
      (tab.useLegacyEnglish && plain(authoring.noteRecord?.english)) ||
      plain(tab.fallbackEnglish) ||
      plain(tab.fallbackArabic)
    )
  }

  // During Fawāʾid editing we expose every category so a new one can be
  // authored. In normal display, only categories that actually contain a
  // Fāʾidah are shown.
  const visibleTabs =
    authoring.feature === 'fawaid' && !editing
      ? allTabs.filter(tabHasContent)
      : allTabs
  const firstWithContent = visibleTabs.find((tab) => {
    const record = sectionRecord(authoring, tab.id)
    return (
      plain(record?.english) ||
      plain(record?.arabic) ||
      (tab.useLegacyEnglish && plain(authoring.noteRecord?.english)) ||
      plain(tab.fallbackEnglish) ||
      plain(tab.fallbackArabic)
    )
  })

  const [activeId, setActiveId] = useState(
    firstWithContent?.id || visibleTabs[0]?.id || ''
  )

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeId)) {
      setActiveId(firstWithContent?.id || visibleTabs[0]?.id || '')
    }
  }, [
    authoring.feature,
    authoring.targetKey,
    visibleTabs.map((tab) => tab.id).join('|'),
  ])

  const active = visibleTabs.find((tab) => tab.id === activeId) || visibleTabs[0]
  if (!active) return null

  const sourceAuthoring = tabSourceAuthoring(authoring, active.id)

  return (
    <div className="qmr-feature-tabs-wrap">
      {visibleTabs.length > 1 ? (
        <div className="qmr-feature-tabs" role="tablist">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active.id === tab.id}
              className={active.id === tab.id ? 'is-active' : ''}
              onClick={() => setActiveId(tab.id)}
            >
              <strong dir="rtl" lang="ar">{tab.labelArabic}</strong>
              {tab.labelEnglish ? <small>{tab.labelEnglish}</small> : null}
            </button>
          ))}
        </div>
      ) : null}

      <BilingualSectionEditor
        authoring={authoring}
        tab={active}
        editing={editing}
        editable={editable}
      />

      {showSources ? <LinkedSourcesPanel authoring={sourceAuthoring} editable={editable} /> : null}
    </div>
  )
}

function joinMetadata(metadata, predicate, language) {
  return metadata
    .filter(predicate)
    .map((item) => {
      const label = language === 'ar' ? item.labelArabic : item.labelEnglish
      const value = language === 'ar' ? item.valueArabic : item.valueEnglish
      if (!plain(label) && !plain(value)) return ''
      return [plain(label), plain(value)].filter(Boolean).join(': ')
    })
    .filter(Boolean)
    .join('\n')
}

function surahStudyTabs(detail) {
  const surah = detail.surah || {}
  const metadata = Array.isArray(surah.metadata) ? surah.metadata : []
  const isNuzul = (item) => /revel|nuzul|نزول|مكي|مدني|meccan|medinan/i.test(
    `${item.id || ''} ${item.labelArabic || ''} ${item.labelEnglish || ''}`
  )
  const isCounts = (item) => /ayah|verse|word|letter|آي|الآيات|كلم|حرف/i.test(
    `${item.id || ''} ${item.labelArabic || ''} ${item.labelEnglish || ''}`
  )

  return [
    {
      id: 'ayat',
      labelArabic: 'الآيات',
      labelEnglish: 'Āyāt',
      fallbackEnglish: joinMetadata(metadata, isCounts, 'en'),
      fallbackArabic: joinMetadata(metadata, isCounts, 'ar'),
    },
    {
      id: 'nuzul',
      labelArabic: 'النزول',
      labelEnglish: 'Revelation',
      fallbackEnglish: joinMetadata(metadata, isNuzul, 'en'),
      fallbackArabic: joinMetadata(metadata, isNuzul, 'ar'),
    },
    {
      id: 'sabab-nuzul',
      labelArabic: 'سبب النزول',
      labelEnglish: 'Reason of Revelation',
      fallbackEnglish: surah.sababNuzulEnglish || '',
      fallbackArabic: surah.sababNuzulArabic || '',
    },
    {
      id: 'introduction',
      labelArabic: 'مقدمة',
      labelEnglish: 'Introduction',
      fallbackEnglish: surah.introductionEnglish || '',
      fallbackArabic: surah.introductionArabic || '',
    },
    {
      id: 'topics',
      labelArabic: 'موضوعات',
      labelEnglish: 'Themes',
      fallbackEnglish: surah.topicsEnglish || '',
      fallbackArabic: surah.topicsArabic || '',
    },
    {
      id: 'virtues',
      labelArabic: 'فضائل السورة',
      labelEnglish: 'Virtues',
      fallbackEnglish: surah.virtuesEnglish || '',
      fallbackArabic: surah.virtuesArabic || '',
    },
    {
      id: 'notes',
      useLegacyEnglish: true,
      labelArabic: 'ملاحظات',
      labelEnglish: 'Notes',
      fallbackEnglish: surah.notesEnglish || '',
      fallbackArabic: surah.notesArabic || '',
    },
  ]
}

const FAWAID_TAB_DEFINITIONS = [
  { id: 'general', labelArabic: 'عامّة', labelEnglish: 'General', match: /^(?:general|عام|فوائد?)$/i },
  { id: 'usuli', labelArabic: 'أصولية', labelEnglish: 'Uṣūlī', match: /أصول|usul|uṣūl/i },
  { id: 'balaghi', labelArabic: 'بلاغية', labelEnglish: 'Balāghī', match: /بلاغ|balagh|balāgh/i },
  { id: 'fiqhi', labelArabic: 'فقهية', labelEnglish: 'Fiqhī', match: /فقه|fiqh/i },
  { id: 'hadithi', labelArabic: 'حديثية', labelEnglish: 'Ḥadīthī', match: /حديث|hadith|ḥadīth/i },
  { id: 'lughawi', labelArabic: 'لغوية', labelEnglish: 'Lughawī', match: /لغو|لغة|lugh|lingu/i },
  { id: 'aqadi', labelArabic: 'عقدية', labelEnglish: 'ʿAqīdah', match: /عقيد|aqid|ʿaq/i },
]

function isQiraatCategory(value) {
  return /قراء|qira|qirā/i.test(String(value || ''))
}

function fawaidStudyTabs(detail) {
  const items = (detail.items || []).filter(
    (item) => !isQiraatCategory(item.categories)
  )

  return FAWAID_TAB_DEFINITIONS.map((definition) => {
    const matched = items.filter((item) => {
      const category = plain(item.categories)
      if (definition.id === 'general') {
        return !category || !FAWAID_TAB_DEFINITIONS.slice(1).some((tab) => tab.match.test(category))
      }
      return definition.match.test(category)
    })

    return {
      ...definition,
      useLegacyEnglish: definition.id === 'general',
      fallbackEnglish: matched.map((item) => plain(item.english)).filter(Boolean).join('\n\n'),
      fallbackArabic: matched.map((item) => plain(item.arabic)).filter(Boolean).join('\n\n'),
    }
  })
}

function legacyBilingualTab(detail, config = {}) {
  const items = detail.items || []
  return {
    id: config.id || 'main',
    useLegacyEnglish: true,
    labelArabic: config.labelArabic || '',
    labelEnglish: config.labelEnglish || '',
    fallbackEnglish: items.map((item) => plain(item.english)).filter(Boolean).join('\n\n'),
    fallbackArabic: items.map((item) => plain(item.arabic)).filter(Boolean).join('\n\n'),
  }
}

function TafsirStudyContent({ detail, authoring, editable }) {
  const initialItems = (detail.items || []).filter((item) => plain(item.arabic) || plain(item.english))
  const hasImportedPointer = Boolean(detail.importedAvailable) || (detail.items || []).some((item) => item.imported && item.passageId)
  const [items, setItems] = useState(initialItems)
  const [surahIntroductions, setSurahIntroductions] = useState([])
  const [loading, setLoading] = useState(hasImportedPointer)
  const [error, setError] = useState('')
  const [requestedSourceId, setRequestedSourceId] = useState('')

  useEffect(() => {
    if (!hasImportedPointer) {
      setItems(initialItems)
      setSurahIntroductions([])
      setLoading(false)
      setError('')
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError('')
    Promise.resolve(getStaticTafsir(detail.verseKey || ''))
      .then((payload) => {
        if (cancelled) return
        const imported = Array.isArray(payload.items) ? payload.items : []
        const introductions = Array.isArray(payload.surahIntroductions) ? payload.surahIntroductions : []
        setItems([...initialItems, ...imported.filter((candidate) => !initialItems.some((item) => item.id === candidate.id))])
        setSurahIntroductions(introductions)
      })
      .catch((err) => { if (!cancelled) { setError(err?.message || 'Unable to load tafsīr'); setSurahIntroductions([]) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [detail.verseKey, detail.importedAvailable, hasImportedPointer])

  if (loading) {
    return <section className="qmr-study-dialog-section"><p>Loading tafsīr…</p></section>
  }
  if (error) {
    return <section className="qmr-study-dialog-section qmr-study-empty-section"><p>{error}</p></section>
  }

  const sourceIdFor = (item, index) => plain(item?.sourceSlug) || plain(item?.id) || `tafsir-${index + 1}`
  const selectedSourceId = items.some((item, index) => sourceIdFor(item, index) === requestedSourceId)
    ? requestedSourceId
    : sourceIdFor(items[0], 0)
  const selectedIndex = items.findIndex((item, index) => sourceIdFor(item, index) === selectedSourceId)
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null
  const selectedIntroduction = surahIntroductions.find(
    (item, index) => sourceIdFor(item, index) === selectedSourceId
  ) || null

  if (!selected) {
    return editable ? <section className="qmr-study-dialog-section qmr-study-empty-section"><p>No tafsīr source is linked to this āyah yet.</p></section> : null
  }

  const range = Number(selected.ayahStart) > 0
    ? (Number(selected.ayahEnd) > Number(selected.ayahStart)
        ? `${selected.ayahStart}–${selected.ayahEnd}`
        : String(selected.ayahStart))
    : ''

  return (
    <section className="qmr-study-dialog-section qmr-tafsir-source-section">
      <label className="qmr-vocab-v2-dictionary-picker qmr-source-picker">
        <span className="qmr-study-small-label">Tafsīr source</span>
        <select value={selectedSourceId} onChange={(event) => setRequestedSourceId(event.target.value)}>
          {items.map((item, index) => (
            <option key={plain(item.id) || index} value={sourceIdFor(item, index)}>
              {[plain(item.sourceNameArabic), plain(item.sourceNameEnglish)].filter(Boolean).join(' — ') || `Tafsīr ${index + 1}`}
            </option>
          ))}
        </select>
      </label>

      <div className="qmr-tafsir-source-meta">
        <div className="qmr-tafsir-source-title">
          <strong dir="rtl" lang="ar">{plain(selected.sourceNameArabic) || 'التفسير'}</strong>
          {plain(selected.sourceNameEnglish) ? <span>{selected.sourceNameEnglish}</span> : null}
        </div>
        <div className="qmr-tafsir-source-facts">
          {plain(selected.authorArabic) ? <span dir="rtl" lang="ar">{selected.authorArabic}</span> : null}
          {range ? <span>Āyāt {range}</span> : null}
          {plain(selected.locator) ? <span dir="rtl" lang="ar">{selected.locator}</span> : null}
        </div>
      </div>

      {selectedIntroduction ? (
        <div className="qmr-tafsir-introduction">
          <div className="qmr-tafsir-section-label">
            <strong dir="rtl" lang="ar">مقدمة السورة</strong>
            <span>Sūrah introduction</span>
          </div>
          <PresentationEditor
            authoring={authoring}
            sourceId={selectedSourceId}
            passageId={plain(selectedIntroduction.passageId) || plain(selectedIntroduction.id)}
            baseBlocks={selectedIntroduction.blocks}
            baseArabic={selectedIntroduction.arabic}
            editable={editable}
          />
        </div>
      ) : null}

      <div className={selectedIntroduction ? 'qmr-tafsir-ayah-commentary' : undefined}>
        {selectedIntroduction ? (
          <div className="qmr-tafsir-section-label">
            <strong dir="rtl" lang="ar">تفسير الآية</strong>
            <span>Āyah commentary</span>
          </div>
        ) : null}
        <PresentationEditor
          authoring={authoring}
          sourceId={selectedSourceId}
          passageId={plain(selected.passageId) || plain(selected.id)}
          baseBlocks={selected.blocks}
          baseArabic={selected.arabic}
          editable={editable}
        />
      </div>
    </section>
  )
}

function EnglishAuthoring({ detail, authoring, editing, onDone }) {
  const imported = legacyEnglish(detail)
  const current = authoring.noteRecord ? String(authoring.noteRecord.english || '') : imported
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { if (editing) setValue(authoring.noteRecord ? String(authoring.noteRecord.english || '') : imported) }, [editing, authoring.noteRecord?.updatedAt, imported])

  if (!editing) {
    const display = authoring.noteRecord ? plain(authoring.noteRecord.english) : ''
    return display ? <section className="qmr-study-dialog-section qmr-inline-english"><span className="qmr-study-small-label">English</span><p className="qmr-study-prose">{display}</p></section> : null
  }

  async function save() {
    setSaving(true); setMessage('')
    try { await authoring.patch({ action: 'saveEnglish', feature: authoring.feature, targetKey: authoring.targetKey, english: value }); setMessage('Saved'); onDone() }
    catch (err) { setMessage(err?.message || 'Could not save') } finally { setSaving(false) }
  }
  async function reset() {
    setSaving(true); setMessage('')
    try { await authoring.patch({ action: 'resetEnglish', feature: authoring.feature, targetKey: authoring.targetKey }); setMessage('Reset'); onDone() }
    catch (err) { setMessage(err?.message || 'Could not reset') } finally { setSaving(false) }
  }

  return <section className="qmr-study-dialog-section qmr-inline-editor-card">
    <div className="qmr-inline-editor-label"><strong>English</strong><span>Your Talweeh note. When present it always displays first.</span></div>
    <textarea rows={6} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Add the English explanation…" />
    <div className="qmr-inline-editor-actions">
      {authoring.noteRecord ? <button type="button" onClick={reset} disabled={saving}>Reset to imported</button> : <span />}
      <button type="button" onClick={onDone}>Cancel</button>
      <button type="button" className="qmr-source-save" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
    {message ? <p className="qmr-inline-message" role="status" aria-live="polite">{message}</p> : null}
  </section>
}

function LinkedSourcesPanel({ authoring, editable = false }) {
  const [requested, setRequested] = useState('')
  const [passage, setPassage] = useState(null)
  const [loading, setLoading] = useState(false)
  const links = authoring.links
  const groups = links.map((link) => ({ link, source: authoring.data.studySources.find((item) => item.id === link.sourceId) })).filter((item) => item.source?.active !== false)
  const selectedId = groups.some((item) => item.link.id === requested) ? requested : (groups[0]?.link.id || '')
  const selected = groups.find((item) => item.link.id === selectedId)

  useEffect(() => {
    let cancelled = false
    if (!selected) { setPassage(null); return undefined }
    setLoading(true)
    Promise.resolve(getStaticPassage(selected.link.sourceId, selected.link.passageId, Number(String(selected.link.targetKey || '').split(':')[0]) || 81))
      .then((payload) => { if (!cancelled) setPassage(payload?.passage || null) })
      .catch(() => { if (!cancelled) setPassage(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selected?.link.id])

  if (!groups.length) return null
  return <section className="qmr-study-dialog-section qmr-linked-source-section">
    <label className="qmr-vocab-v2-dictionary-picker"><span className="qmr-study-small-label">Source</span><select value={selectedId} onChange={(event) => setRequested(event.target.value)}>{groups.map(({ link, source }) => <option key={link.id} value={link.id}>{sourceName(source)}</option>)}</select></label>
    {selected?.source ? <div className="qmr-vocab-v2-source-meta">{selected.source.nameArabic ? <strong dir="rtl" lang="ar">{selected.source.nameArabic}</strong> : null}{selected.source.authorEnglish ? <span>{selected.source.authorEnglish}</span> : null}{selected.source.authorArabic ? <span dir="rtl" lang="ar">{selected.source.authorArabic}</span> : null}</div> : null}
    {loading ? <p className="qmr-study-muted">Loading source passage…</p> : null}
    {passage ? <>
      <PresentationEditor authoring={authoring} sourceId={selected.link.sourceId} passageId={selected.link.passageId} baseBlocks={passage.blocks} baseArabic={passage.arabic} editable={editable} />
      {passage.locator ? <small className="qmr-vocab-v2-locator">{passage.locator}</small> : null}
    </> : null}
  </section>
}

function dictionaryDisplayName(dictionary) {
  if (!dictionary) return 'Dictionary'
  const ar = plain(dictionary.nameArabic); const en = plain(dictionary.nameEnglish)
  if (ar && en) return `${ar} — ${en}`
  return ar || en || dictionary.slug || 'Dictionary'
}

function dictionaryPickerArabicName(dictionary) {
  const slug = plain(dictionary?.slug)
  if (slug === 'maqayis-al-lughah') return 'مقاييس اللغة'
  if (slug === 'al-mujam-al-ishtiqaqi') return 'المعجم الاشتقاقي'
  if (slug === 'kitab-al-ayn') return 'كتاب العين'
  return plain(dictionary?.nameArabic) || dictionaryDisplayName(dictionary)
}

function dictionaryPickerEnglishName(dictionary) {
  const slug = plain(dictionary?.slug)
  if (slug === 'al-mujam-al-ishtiqaqi') return 'al-Muʿjam al-Ishtiqāqī'
  return plain(dictionary?.nameEnglish) || slug || 'Dictionary'
}


function VocabularyMappingEditor({ wordDetail, link, vocabRoots, vocabLemmas, authoring, editing, onSaved }) {
  const currentRoot = vocabRoots.find((item) => item.id === link?.rootId)
  const currentLemma = vocabLemmas.find((item) => item.id === link?.lemmaId)
  const [rootArabic, setRootArabic] = useState(currentRoot?.rootArabic || '')
  const [lemmaArabic, setLemmaArabic] = useState(currentLemma?.lemmaArabic || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setRootArabic(currentRoot?.rootArabic || '')
    setLemmaArabic(currentLemma?.lemmaArabic || '')
    setMessage('')
  }, [wordDetail.verseKey, wordDetail.wordNumber, currentRoot?.id, currentLemma?.id])

  if (!editing) return null

  async function save() {
    if (!plain(rootArabic)) {
      setMessage('Enter the Arabic root first.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const payload = await authoring.patch({
        action: 'saveWordVocabMapping',
        verseKey: wordDetail.verseKey,
        wordNumber: wordDetail.wordNumber,
        wordArabic: wordDetail.word?.wordArabic || '',
        transliteration: wordDetail.word?.transliteration || '',
        rootArabic,
        lemmaArabic,
      })
      onSaved?.(payload.savedMapping || null, payload.vocabRoots || [], payload.vocabLemmas || [])
      setMessage('Vocabulary mapping saved')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quran-study-authoring-updated'))
      }
    } catch (err) {
      setMessage(err?.message || 'Could not save vocabulary mapping')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setSaving(true)
    setMessage('')
    try {
      const payload = await authoring.patch({
        action: 'removeWordVocabMapping',
        verseKey: wordDetail.verseKey,
        wordNumber: wordDetail.wordNumber,
        wordArabic: wordDetail.word?.wordArabic || '',
      })
      onSaved?.(null, payload.vocabRoots || [], payload.vocabLemmas || [])
      setRootArabic('')
      setLemmaArabic('')
      setMessage('Vocabulary mapping removed')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quran-study-authoring-updated'))
      }
    } catch (err) {
      setMessage(err?.message || 'Could not remove vocabulary mapping')
    } finally {
      setSaving(false)
    }
  }

  return <section className="qmr-study-dialog-section qmr-word-mapping-editor">
    <div className="qmr-word-mapping-grid">
      <label>
        <span>Root</span>
        <input dir="rtl" lang="ar" value={rootArabic} onChange={(event) => setRootArabic(event.target.value)} placeholder="ك و ر" />
      </label>
      <label>
        <span>Lemma <small>optional</small></span>
        <input dir="rtl" lang="ar" value={lemmaArabic} onChange={(event) => setLemmaArabic(event.target.value)} placeholder="كَوَّرَ" />
      </label>
    </div>
    <div className="qmr-inline-editor-actions">
      {link ? <button type="button" className="qmr-source-reset" onClick={remove} disabled={saving}>Remove mapping</button> : null}
      <span />
      <button type="button" className="qmr-source-save" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save mapping'}</button>
    </div>
    {message ? <p className="qmr-inline-message" role="status" aria-live="polite">{message}</p> : null}
  </section>
}

function WordStudyContent({ detail, vocabRoots, vocabDictionaries, vocabLemmas, vocabEntries, irabTerms, editable }) {
  const requestedTab = ['vocab', 'irab', 'sarf'].includes(detail.initialTab) ? detail.initialTab : 'vocab'
  const [activeTab, setActiveTab] = useState(requestedTab)
  const [editing, setEditing] = useState(false)
  const [localLink, setLocalLink] = useState(detail.link || null)
  const [localRoots, setLocalRoots] = useState(vocabRoots)
  const [localLemmas, setLocalLemmas] = useState(vocabLemmas)

  useEffect(() => {
    setLocalLink(detail.link || null)
    setLocalRoots(vocabRoots)
    setLocalLemmas(vocabLemmas)
    setActiveTab(requestedTab)
    setEditing(false)
  }, [detail.verseKey, detail.wordNumber, detail.link?.id, detail.initialTab])

  useEffect(() => {
    if (!editable) setEditing(false)
  }, [editable])

  const subDetail = activeTab === 'vocab'
    ? {
        kind: 'word-vocab',
        verseKey: detail.verseKey,
        wordNumber: detail.wordNumber,
        word: detail.word,
        link: localLink,
      }
    : activeTab === 'irab'
      ? {
          kind: 'word-irab',
          verseKey: detail.verseKey,
          wordNumber: detail.wordNumber,
          word: detail.word,
        }
      : {
          kind: 'word-sarf',
          verseKey: detail.verseKey,
          wordNumber: detail.wordNumber,
          word: detail.word,
        }

  const authoring = useInlineAuthoring(subDetail)


  // Persisted vocabulary mappings are authoritative when Word Study is reopened.
  // detail.link can be stale because the Reader draft was loaded before an inline edit.
  const persistedVocabLink = useMemo(() => {
    const [surahText, ayahText] = String(detail.verseKey || '').split(':')
    const surahNumber = Number(surahText)
    const ayahNumber = Number(ayahText)
    const targetArabic = normalizeStudyArabic(detail.word?.wordArabic || '')
    const targetWordNumber = Number(detail.wordNumber) || 0
    const targetSegmentNumber = Number(detail.segmentNumber) || 0

    const mappings = Array.isArray(authoring.data.vocabWordMappings)
      ? authoring.data.vocabWordMappings
      : []

    const verseMappings = mappings.filter((item) =>
      Number(item.surahNumber) === surahNumber &&
      Number(item.ayahNumber) === ayahNumber
    )

    const exact =
      verseMappings.find((item) =>
        Number(item.wordNumber) === targetWordNumber &&
        Number(item.segmentNumber || 0) === targetSegmentNumber &&
        normalizeStudyArabic(item.wordArabic || '') === targetArabic
      ) ||
      verseMappings.find((item) =>
        Number(item.wordNumber) === targetWordNumber &&
        normalizeStudyArabic(item.wordArabic || '') === targetArabic
      ) ||
      verseMappings.find((item) =>
        normalizeStudyArabic(item.wordArabic || '') === targetArabic
      ) ||
      null

    if (!exact) return null

    return {
      id: exact.id,
      wordArabic: exact.wordArabic || detail.word?.wordArabic || '',
      transliteration: exact.transliteration || '',
      rootId: exact.rootId || '',
      lemmaId: exact.lemmaId || '',
      wordNumber: exact.wordNumber,
      segmentNumber: Number(exact.segmentNumber || 0),
    }
  }, [
    authoring.data.vocabWordMappings,
    detail.verseKey,
    detail.wordNumber,
    detail.segmentNumber,
    detail.word?.wordArabic,
  ])

  useEffect(() => {
    if (!persistedVocabLink) return

    setLocalLink((current) => {
      if (
        current?.id === persistedVocabLink.id &&
        current?.rootId === persistedVocabLink.rootId &&
        current?.lemmaId === persistedVocabLink.lemmaId
      ) {
        return current
      }
      return persistedVocabLink
    })
  }, [
    persistedVocabLink?.id,
    persistedVocabLink?.rootId,
    persistedVocabLink?.lemmaId,
  ])

  useEffect(() => {
    if (Array.isArray(authoring.data.vocabRoots)) {
      setLocalRoots(authoring.data.vocabRoots)
    }
    if (Array.isArray(authoring.data.vocabLemmas)) {
      setLocalLemmas(authoring.data.vocabLemmas)
    }
  }, [
    authoring.data.vocabRoots,
    authoring.data.vocabLemmas,
  ])


  function handleMappingSaved(savedMapping, roots, lemmas) {
    if (roots?.length) setLocalRoots(roots)
    if (lemmas?.length || Array.isArray(lemmas)) setLocalLemmas(lemmas)
    if (!savedMapping) {
      setLocalLink(null)
      return
    }
    setLocalLink({
      id: savedMapping.id,
      wordArabic: savedMapping.wordArabic,
      transliteration: savedMapping.transliteration || '',
      rootId: savedMapping.rootId,
      lemmaId: savedMapping.lemmaId || '',
      wordNumber: savedMapping.wordNumber,
    })
  }

  const wordArabic = detail.word?.wordArabic || localLink?.wordArabic || ''

  return <div className="qmr-word-study">
    <div className="qmr-study-word-heading qmr-word-study-heading">
      <strong dir="rtl" lang="ar">{wordArabic}</strong>
      {detail.word?.transliteration ? <span>{detail.word.transliteration}</span> : null}
    </div>

    <div className="qmr-word-study-tabs" role="tablist" aria-label={`Study ${wordArabic}`}>
      <button type="button" className={activeTab === 'vocab' ? 'is-active' : ''} onClick={() => { setActiveTab('vocab'); setEditing(false) }}>Vocabulary</button>
      <button type="button" className={activeTab === 'irab' ? 'is-active' : ''} onClick={() => { setActiveTab('irab'); setEditing(false) }}>Iʿrāb</button>
      <button type="button" className={activeTab === 'sarf' ? 'is-active' : ''} onClick={() => { setActiveTab('sarf'); setEditing(false) }}>Ṣarf</button>
    </div>

    {editable ? <div className="qmr-word-study-editbar">
      <strong>{activeTab === 'vocab' ? 'Vocabulary' : activeTab === 'irab' ? 'Iʿrāb' : 'Ṣarf'}</strong>
      <button type="button" className="qmr-study-dialog-edit" onClick={() => setEditing((value) => !value)}>✎ {editing ? 'Done' : 'Edit'}</button>
    </div> : null}

    {authoring.error ? <p className="qmr-vocab-corpus-warning">{authoring.error}</p> : null}
    <EnglishAuthoring detail={subDetail} authoring={authoring} editing={editable && editing} onDone={() => setEditing(false)} />

    {activeTab === 'vocab' ? <>
      <VocabularyMappingEditor
        wordDetail={detail}
        link={localLink}
        vocabRoots={localRoots}
        vocabLemmas={localLemmas}
        authoring={authoring}
        editing={editable && editing}
        onSaved={handleMappingSaved}
      />
      {localLink ? (
        <VocabDialogContent
          detail={{ kind: 'vocab', verseKey: detail.verseKey, wordNumber: detail.wordNumber, link: localLink }}
          vocabRoots={localRoots}
          vocabDictionaries={vocabDictionaries}
          vocabLemmas={localLemmas}
          vocabEntries={vocabEntries}
          authoring={authoring}
          editable={editable}
        />
      ) : (
        <section className="qmr-study-dialog-section qmr-word-empty">
          <strong>No vocabulary mapping yet</strong>
          <p>{editable ? <>Select <b>Edit</b>, enter the root, and save. Any installed dictionary containing that root will then appear automatically.</> : 'No root has been assigned to this word yet.'}</p>
        </section>
      )}
    </> : activeTab === 'irab' ? <>
      <QuranWordIrabPanel
        wordDetail={detail}
        editing={editable && editing}
        canEdit={editable}
      />
    </> : <>
      <section className="qmr-study-dialog-section qmr-word-empty">
        <strong>No Ṣarf analysis linked yet</strong>
        <p>This tab is reserved for word-level morphology. English notes added here are saved against this exact word.</p>
      </section>
    </>}
  </div>
}

function VocabDialogContent({ detail, vocabRoots, vocabDictionaries, vocabLemmas, vocabEntries, authoring, editable = false, showDictionaries = false }) {
  const root = vocabRoots.find((item) => item.id === detail.link.rootId)
  const lemma = vocabLemmas.find((item) => item.id === detail.link.lemmaId)
  const [corpusState, setCorpusState] = useState({ rootKey: '', loading: false, dictionaries: [], warning: '' })
  const [requestedDictionaryId, setRequestedDictionaryId] = useState('')
  const rootArabic = plain(root?.rootArabic)

  useEffect(() => {
    let cancelled = false
    if (!rootArabic) { setCorpusState({ rootKey: '', loading: false, dictionaries: [], warning: '' }); return () => { cancelled = true } }
    setCorpusState((current) => ({ ...current, rootKey: rootArabic, loading: true, warning: '' }))
    Promise.resolve(lookupStaticDictionaries(rootArabic, Number(String(detail?.verseKey || '81:1').split(':')[0]) || 81))
      .then((payload) => {
        if (cancelled) return
        setCorpusState({ rootKey: rootArabic, loading: false, dictionaries: Array.isArray(payload?.dictionaries) ? payload.dictionaries : [], warning: (payload?.warnings || []).join(' · ') })
      })
      .catch((error) => { if (!cancelled) setCorpusState({ rootKey: rootArabic, loading: false, dictionaries: [], warning: error?.message || 'Dictionary lookup failed' }) })
    return () => { cancelled = true }
  }, [rootArabic])

  const localMatchingEntries = vocabEntries.filter((entry) => entry.active !== false && entry.rootId === detail.link.rootId && (!detail.link.lemmaId || !entry.lemmaId || entry.lemmaId === detail.link.lemmaId))
  const localGroups = vocabDictionaries.filter((dictionary) => dictionary.active !== false).filter((dictionary) => localMatchingEntries.some((entry) => entry.dictionaryId === dictionary.id)).map((dictionary) => ({ dictionary, entries: localMatchingEntries.filter((entry) => entry.dictionaryId === dictionary.id) }))
  const corpusGroups = corpusState.rootKey === rootArabic ? corpusState.dictionaries : []
  const visibleLocalGroups = corpusGroups.length ? localGroups.filter(({ dictionary }) => dictionary.slug !== 'legacy-imported-vocabulary' && dictionary.id !== 'dict-legacy-imported-vocabulary') : localGroups
  const groupsById = new Map()
  for (const group of [...visibleLocalGroups, ...corpusGroups]) {
    if (!group?.dictionary?.id) continue
    const existing = groupsById.get(group.dictionary.id)
    if (existing) {
      const merged = [...existing.entries, ...(group.entries || [])]
      const unique = []
      const uniqueKeys = new Set()
      for (const entry of merged) {
        const key = entry.id || [plain(entry.headwordArabic), plain(entry.arabic).replace(/\*/g, '').replace(/\s+/g, ' ').trim()].join('|')
        if (uniqueKeys.has(key)) continue
        uniqueKeys.add(key)
        unique.push(entry)
      }
      existing.entries = unique
    } else groupsById.set(group.dictionary.id, { dictionary: group.dictionary, entries: group.entries || [] })
  }
  const groups = Array.from(groupsById.values()).sort((a, b) => (Number(a.dictionary.sortOrder) || 0) - (Number(b.dictionary.sortOrder) || 0) || dictionaryDisplayName(a.dictionary).localeCompare(dictionaryDisplayName(b.dictionary)))
  const selectedDictionaryId = groups.some((group) => group.dictionary.id === requestedDictionaryId) ? requestedDictionaryId : (groups[0]?.dictionary.id || '')
  const selectedGroup = groups.find((group) => group.dictionary.id === selectedDictionaryId)
  const selectedDictionary = selectedGroup?.dictionary
  const source = authoring.data.studySources.find((item) => item.slug === selectedDictionary?.slug)
  const presentationSourceId = source?.id || (selectedDictionary?.slug ? `source-${selectedDictionary.slug}` : selectedDictionary?.id || '')
  const selectedEntries = []
  const seen = new Set()
  for (const entry of selectedGroup?.entries || []) {
    const key = entry.id || [plain(entry.headwordArabic), plain(entry.arabic).replace(/\*/g, '').replace(/\s+/g, ' ').trim()].join('|')
    if (seen.has(key)) continue; seen.add(key); selectedEntries.push(entry)
  }

  return <div className="qmr-study-dialog-sections">
    <div className="qmr-study-word-heading qmr-vocab-v2-heading"><strong dir="rtl" lang="ar">{detail.link.wordArabic}</strong>{detail.link.transliteration ? <span>{detail.link.transliteration}</span> : null}</div>
    {root || lemma ? <section className="qmr-study-dialog-section qmr-study-root-card qmr-vocab-v2-identity">
      {lemma ? <div className="qmr-vocab-v2-identity-item"><span className="qmr-study-small-label">Lemma</span><strong dir="rtl" lang="ar">{lemma.lemmaArabic}</strong>{lemma.transliteration ? <small>{lemma.transliteration}</small> : null}</div> : null}
      {root ? <div className="qmr-vocab-v2-identity-item"><span className="qmr-study-small-label">Root</span><strong dir="rtl" lang="ar">{root.rootArabic}</strong>{root.transliteration ? <small>{root.transliteration}</small> : null}</div> : null}
    </section> : null}
    {showDictionaries && corpusState.loading ? <div className="qmr-vocab-corpus-status">Searching installed dictionaries…</div> : null}
    {showDictionaries && groups.length ? <section className="qmr-study-dialog-section qmr-vocab-v2-dictionary-section">
      <div className="qmr-vocab-v4-dictionary-picker" role="group" aria-label="Dictionary">
        <span className="qmr-study-small-label">Dictionary</span>
        <div className="qmr-vocab-v4-dictionary-options">
          {groups.map(({ dictionary }) => {
            const isSelected = dictionary.id === selectedDictionaryId
            return <button type="button" key={dictionary.id} className={`qmr-vocab-v4-dictionary-option${isSelected ? ' is-selected' : ''}`} aria-pressed={isSelected} onClick={() => setRequestedDictionaryId(dictionary.id)}>
              <span className="qmr-vocab-v4-dictionary-arabic" dir="rtl" lang="ar">{dictionaryPickerArabicName(dictionary)}</span>
              <small>{dictionaryPickerEnglishName(dictionary)}</small>
            </button>
          })}
        </div>
      </div>
      {selectedDictionary ? <div className="qmr-vocab-v2-source-meta">{selectedDictionary.nameArabic ? <strong dir="rtl" lang="ar">{selectedDictionary.nameArabic}</strong> : null}{selectedDictionary.authorEnglish ? <span>{selectedDictionary.authorEnglish}</span> : null}{selectedDictionary.authorArabic ? <span dir="rtl" lang="ar">{selectedDictionary.authorArabic}</span> : null}</div> : null}
      {selectedEntries.length > 1 ? <div className="qmr-vocab-v3-entry-count">{selectedEntries.length} entries in this dictionary</div> : null}
      {selectedEntries.map((entry, entryIndex) => <article className="qmr-vocab-v2-entry" key={entry.id}>
        {selectedEntries.length > 1 ? <span className="qmr-vocab-v3-entry-number">Entry {entryIndex + 1}</span> : null}
        {entry.headwordArabic || entry.headwordEnglish ? <div className="qmr-vocab-v2-headword">{entry.headwordEnglish ? <strong>{entry.headwordEnglish}</strong> : null}{entry.headwordArabic ? <strong dir="rtl" lang="ar">{entry.headwordArabic}</strong> : null}</div> : null}
        {entry.sectionHeadingArabic ? <div className="qmr-vocab-v3-chapter"><span className="qmr-study-small-label">Chapter</span><strong dir="rtl" lang="ar">{entry.sectionHeadingArabic}</strong>{entry.sectionKey ? <small dir="rtl" lang="ar">{entry.sectionKey}</small> : null}</div> : null}
        {presentationSourceId ? <PresentationEditor authoring={authoring} sourceId={presentationSourceId} passageId={entry.id} baseBlocks={entry.arabicBlocks} baseArabic={entry.arabic} editable={editable} /> : <ArabicBlock>{entry.arabic}</ArabicBlock>}
        {entry.locator ? <small className="qmr-vocab-v2-locator">{entry.locator}</small> : null}
        {entry.sectionMeaningArabic ? <details className="qmr-vocab-v3-section-meaning"><summary><span dir="rtl" lang="ar">معنى الفصل المعجمي</span></summary><ArabicBlock subtle>{entry.sectionMeaningArabic}</ArabicBlock></details> : null}
      </article>)}
    </section> : showDictionaries && root?.excerpts?.length ? <section className="qmr-study-dialog-section"><span className="qmr-study-small-label">Legacy vocabulary notes</span>{root.excerpts.map((excerpt) => <div className="qmr-study-dictionary-entry" key={excerpt.id || `${excerpt.dictionary}-${excerpt.locator}`}><div className="qmr-study-source-line">{excerpt.dictionary ? <strong>{excerpt.dictionary}</strong> : null}{excerpt.locator ? <span>{excerpt.locator}</span> : null}</div><ArabicBlock subtle>{excerpt.arabic}</ArabicBlock></div>)}</section> : showDictionaries && !corpusState.loading ? <p className="qmr-study-muted">No dictionary entry has been imported for this mapped word yet.</p> : null}
    {showDictionaries && corpusState.warning ? <p className="qmr-vocab-corpus-warning">{corpusState.warning}</p> : null}
  </div>
}


function TranslationAnnotationEditor({ detail, authoring, editing }) {
  const original = detail.note || {}
  const [reason, setReason] = useState(String(original.reason || ''))
  const [reference, setReference] = useState(String(original.reference || ''))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setReason(String(detail.note?.reason || ''))
    setReference(String(detail.note?.reference || ''))
    setMessage('')
  }, [detail.verseKey, detail.note?.id, detail.note?.reason, detail.note?.reference])

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      await authoring.patch({
        action: 'saveTranslationAnnotation',
        verseKey: detail.verseKey,
        translationId: detail.translationId || '',
        noteId: detail.note?.id || '',
        noteText: detail.note?.text || '',
        reason,
        reference,
      })
      setMessage('Saved')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quran-study-authoring-updated'))
      }
    } catch (err) {
      setMessage(err?.message || 'Could not save annotation')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <section className="qmr-study-dialog-section qmr-translation-note-editor">
        <label className="qmr-bilingual-field">
          <span>English</span>
          <small>Your explanation for this supplied wording.</small>
          <textarea rows={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add the English explanation..." />
        </label>

        <label className="qmr-bilingual-field">
          <span dir="rtl" lang="ar">العربية</span>
          <small>Edit the Arabic source/explanation shown for this annotation.</small>
          <textarea dir="rtl" lang="ar" rows={6} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="أضف النص العربي..." />
        </label>

        <div className="qmr-inline-editor-actions">
          <span />
          <button type="button" className="qmr-source-save" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {message ? <p className="qmr-inline-message" role="status" aria-live="polite">{message}</p> : null}
      </section>
    )
  }

  return (
    <div className="qmr-study-dialog-sections">
      {plain(reason) ? (
        <section className="qmr-study-dialog-section">
          <span className="qmr-study-small-label">English</span>
          <p className="qmr-study-prose">{reason}</p>
        </section>
      ) : null}
      {plain(reference) ? (
        <section className="qmr-study-dialog-section">
          <span className="qmr-study-small-label" dir="rtl" lang="ar">العربية</span>
          <ArabicBlock>{reference}</ArabicBlock>
        </section>
      ) : null}
    </div>
  )
}

function TranslationTextEditor({ detail, authoring, editing }) {
  const sourceTranslations = Array.isArray(detail.translations) && detail.translations.length
    ? detail.translations.slice(0, 2)
    : (detail.translation ? [detail.translation] : [])

  const firstSource = sourceTranslations[0] || {
    id: `translation-inline-${String(detail.verseKey || '').replace(':', '-')}`,
    translation: '',
    brackets: [],
  }
  const secondSource = sourceTranslations[1] || null

  const [primaryText, setPrimaryText] = useState(String(firstSource.translation || ''))
  const [secondaryText, setSecondaryText] = useState(String(secondSource?.translation || ''))
  const [showSecond, setShowSecond] = useState(Boolean(secondSource?.translation))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const translations = Array.isArray(detail.translations) && detail.translations.length
      ? detail.translations.slice(0, 2)
      : (detail.translation ? [detail.translation] : [])

    setPrimaryText(String(translations[0]?.translation || ''))
    setSecondaryText(String(translations[1]?.translation || ''))
    setShowSecond(Boolean(translations[1]?.translation))
    setMessage('')
  }, [detail.verseKey, detail.translation?.id, detail.translation?.translation, detail.translations])

  async function save() {
    setSaving(true)
    setMessage('')

    try {
      const translations = [
        {
          id: firstSource.id || '',
          translation: primaryText,
        },
      ]

      if (showSecond) {
        translations.push({
          id: secondSource?.id || '',
          translation: secondaryText,
        })
      }

      await authoring.patch({
        action: 'saveTranslationSet',
        verseKey: detail.verseKey,
        translations,
      })

      setMessage('Saved')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quran-study-authoring-updated'))
      }
    } catch (err) {
      setMessage(err?.message || 'Could not save translations')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <section className="qmr-study-dialog-section qmr-translation-text-editor">
        <label className="qmr-bilingual-field">
          <span>Translation 1</span>
          <small>
            Primary detailed translation. Bracketed or parenthetical wording can have its own annotation.
          </small>
          <textarea
            rows={8}
            value={primaryText}
            onChange={(event) => setPrimaryText(event.target.value)}
            placeholder="Enter the detailed translation..."
          />
        </label>

        {showSecond ? (
          <div className="qmr-secondary-translation-editor">
            <label className="qmr-bilingual-field">
              <span>Translation 2</span>
              <small>Optional alternative translation.</small>
              <textarea
                rows={8}
                value={secondaryText}
                onChange={(event) => setSecondaryText(event.target.value)}
                placeholder="Enter the second translation..."
              />
            </label>

            <button
              type="button"
              className="qmr-secondary-translation-remove"
              onClick={() => {
                setShowSecond(false)
                setSecondaryText('')
              }}
            >
              Remove Translation 2
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="qmr-secondary-translation-add"
            onClick={() => setShowSecond(true)}
          >
            + Add Translation 2
          </button>
        )}

        <div className="qmr-inline-editor-actions">
          <span />
          <button
            type="button"
            className="qmr-source-save"
            disabled={saving}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save translations'}
          </button>
        </div>

        {message ? <p className="qmr-inline-message" role="status" aria-live="polite">{message}</p> : null}
      </section>
    )
  }

  return (
    <div className="qmr-study-dialog-sections qmr-translation-dialog-stack">
      {plain(primaryText) ? (
        <section className="qmr-study-dialog-section">
          <span className="qmr-study-small-label">Translation 1</span>
          <p className="qmr-study-prose qmr-translation-preview-text">{primaryText}</p>
        </section>
      ) : null}

      {showSecond && plain(secondaryText) ? (
        <section className="qmr-study-dialog-section">
          <span className="qmr-study-small-label">Translation 2</span>
          <p className="qmr-study-prose qmr-translation-preview-text">{secondaryText}</p>
        </section>
      ) : null}
    </div>
  )
}


function DialogContent({
  detail,
  vocabRoots,
  vocabDictionaries,
  vocabLemmas,
  vocabEntries,
  irabTerms,
  wordIrabRecords,
  authoring,
  editable,
  editing,
}) {
  if (!detail) return null

  if (detail.kind === 'word') {
    return (
      <WordStudyContent
        detail={detail}
        vocabRoots={vocabRoots}
        vocabDictionaries={vocabDictionaries}
        vocabLemmas={vocabLemmas}
        vocabEntries={vocabEntries}
        irabTerms={irabTerms}
        wordIrabRecords={wordIrabRecords}
        editable={editable}
      />
    )
  }

  if (detail.kind === 'surah') {
    return (
      <StudyFeatureTabs
        authoring={authoring}
        tabs={surahStudyTabs(detail)}
        editing={editing}
        editable={editable}
        showSources={false}
      />
    )
  }

  if (detail.kind === 'rabt') {
    return (
      <StudyFeatureTabs
        authoring={authoring}
        tabs={[
          legacyBilingualTab(detail, {
            id: 'rabt',
            labelArabic: 'الربط',
            labelEnglish: 'Rabṭ',
          }),
        ]}
        editing={editing}
        editable={editable}
        showSources={false}
      />
    )
  }

  if (detail.kind === 'irab') {
    return (
      <StudyFeatureTabs
        authoring={authoring}
        tabs={[
          legacyBilingualTab(detail, {
            id: 'irab',
            labelArabic: 'الإعراب',
            labelEnglish: 'Iʿrāb',
          }),
        ]}
        editing={editing}
        editable={editable}
        showSources={false}
      />
    )
  }

  if (detail.kind === 'fawaid') {
    return (
      <StudyFeatureTabs
        authoring={authoring}
        tabs={fawaidStudyTabs(detail)}
        editing={editing}
        editable={editable}
        showSources={false}
      />
    )
  }

  if (detail.kind === 'tafsir') {
    if (!detail.importedAvailable) {
      return (
        <StudyFeatureTabs
          authoring={authoring}
          tabs={[
            legacyBilingualTab(detail, {
              id: 'tafsir',
              labelArabic: 'التفسير',
              labelEnglish: 'Tafsīr',
            }),
          ]}
          editing={editing}
          editable={editable}
          showSources={false}
        />
      )
    }
    return <TafsirStudyContent detail={detail} authoring={authoring} editing={editing} editable={editable} />
  }

  if (detail.kind === 'qiraat') {
    const qiraatItems = (detail.items || []).filter(
      (item) => isQiraatCategory(item.categories) || !plain(item.categories)
    )

    return (
      <StudyFeatureTabs
        authoring={authoring}
        tabs={[
          {
            id: 'qiraat',
            labelArabic: 'القراءات',
            labelEnglish: 'Qirāʾāt',
            fallbackEnglish: qiraatItems.map((item) => plain(item.english)).filter(Boolean).join('\n\n'),
            fallbackArabic: qiraatItems.map((item) => plain(item.arabic)).filter(Boolean).join('\n\n'),
          },
          {
            id: 'qurra-variants',
            labelArabic: 'أوجه القرّاء',
            labelEnglish: 'Qurrāʾ Variants',
            fallbackEnglish: '',
            fallbackArabic: '',
          },
        ]}
        editing={editing}
        editable={editable}
        showSources={false}
      />
    )
  }

  if (detail.kind === 'bracket') {
    return <TranslationAnnotationEditor detail={detail} authoring={authoring} editing={editing} />
  }

  if (detail.kind === 'translation') {
    return <TranslationTextEditor detail={detail} authoring={authoring} editing={editing} />
  }

  if (detail.kind === 'vocab') {
    return (
      <VocabDialogContent
        detail={detail}
        vocabRoots={vocabRoots}
        vocabDictionaries={vocabDictionaries}
        vocabLemmas={vocabLemmas}
        vocabEntries={vocabEntries}
        authoring={authoring}
        editable={editable}
      />
    )
  }

  return null
}

function dialogTitle(detail) {
  if (!detail) return ''
  if (detail.kind === 'surah') return 'Sūrah Study'
  if (detail.kind === 'word') return 'Word Study'
  if (detail.kind === 'rabt') return 'Rabṭ'
  if (detail.kind === 'bracket') return detail.note?.text ? `[${detail.note.text}]` : 'Translation note'
  if (detail.kind === 'translation') return 'Translation'
  if (detail.kind === 'vocab') return 'Vocabulary'
  if (detail.kind === 'irab') return 'Iʿrāb'
  if (detail.kind === 'fawaid') return 'Fawāʾid'
  if (detail.kind === 'tafsir') return 'Tafsīr'
  if (detail.kind === 'qiraat') return 'Qirāʾāt'
  return 'Study'
}

export function QuranReaderStudyDialog({
  detail,
  vocabRoots = [],
  vocabDictionaries = [],
  vocabLemmas = [],
  vocabEntries = [],
  irabTerms = [],
  wordIrabRecords = [],
  languageMode = 'both',
  onClose,
  canEdit,
}) {
  const authoring = useInlineAuthoring(detail)
  const [editingContent, setEditingContent] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [topSaveState, setTopSaveState] = useState({ visible: false, disabled: false, label: 'Save' })
  const [saveToast, setSaveToast] = useState('')
  const dialogRef = useRef(null)
  const dialogInteractionRef = useRef(null)
  const editable = Boolean(canEdit)

  useEffect(() => {
    setEditingContent(false)
    setFullscreen(false)
  }, [detail?.kind, detail?.verseKey])

  useEffect(() => {
    if (!editable) setEditingContent(false)
  }, [editable])

  useEffect(() => {
    const onSaved = (event) => {
      setSaveToast(event?.detail?.message || 'Saved')
    }
    window.addEventListener('quran-study-save-confirmed', onSaved)
    return () => window.removeEventListener('quran-study-save-confirmed', onSaved)
  }, [])

  useEffect(() => {
    if (!saveToast) return undefined
    const timer = window.setTimeout(() => setSaveToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [saveToast])

  useEffect(() => {
    const root = dialogRef.current
    if (!root || typeof MutationObserver === 'undefined') return undefined

    const syncTopSave = () => {
      const buttons = Array.from(root.querySelectorAll('.qmr-source-save'))
      const visibleButtons = buttons.filter((button) => {
        if (!(button instanceof HTMLElement)) return false
        const style = window.getComputedStyle(button)
        return style.display !== 'none' && style.visibility !== 'hidden' && button.getClientRects().length > 0
      })
      const active = visibleButtons[0] || null
      setTopSaveState({
        visible: Boolean(active),
        disabled: Boolean(active?.disabled),
        label: active?.textContent?.trim() || 'Save',
      })
    }

    syncTopSave()
    const observer = new MutationObserver(syncTopSave)
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'class', 'style'] })
    window.addEventListener('resize', syncTopSave)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncTopSave)
    }
  }, [detail?.kind, detail?.verseKey, editingContent, editable])

  function saveFromHeader() {
    const root = dialogRef.current
    if (!root) return
    const buttons = Array.from(root.querySelectorAll('.qmr-source-save'))
    const active = buttons.find((button) => {
      if (!(button instanceof HTMLElement) || button.disabled) return false
      const style = window.getComputedStyle(button)
      return style.display !== 'none' && style.visibility !== 'hidden' && button.getClientRects().length > 0
    })
    active?.click()
  }

  function desktopDialogEnabled() {
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 701px)').matches
  }

  function setFloatingDialogRect({ left, top, width, height }) {
    const root = dialogRef.current
    if (!root) return
    root.classList.add('qmr-study-dialog--floating')
    root.style.setProperty('--qmr-study-dialog-left', `${Math.round(left)}px`)
    root.style.setProperty('--qmr-study-dialog-top', `${Math.round(top)}px`)
    root.style.setProperty('--qmr-study-dialog-width', `${Math.round(width)}px`)
    root.style.setProperty('--qmr-study-dialog-height', `${Math.round(height)}px`)
  }

  function clampFloatingDialog() {
    const root = dialogRef.current
    if (!root || !root.classList.contains('qmr-study-dialog--floating') || !desktopDialogEnabled()) return
    const margin = 12
    const rect = root.getBoundingClientRect()
    const width = Math.min(rect.width, Math.max(320, window.innerWidth - margin * 2))
    const height = Math.min(rect.height, Math.max(260, window.innerHeight - margin * 2))
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, window.innerWidth - width - margin))
    const top = Math.min(Math.max(margin, rect.top), Math.max(margin, window.innerHeight - height - margin))
    setFloatingDialogRect({ left, top, width, height })
  }

  function beginDialogDrag(event) {
    if (!desktopDialogEnabled() || event.button !== 0) return
    if (event.target instanceof Element && event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return
    const root = dialogRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    setFloatingDialogRect(rect)
    dialogInteractionRef.current = {
      type: 'drag',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }
    root.classList.add('qmr-study-dialog--dragging')
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  function moveDialogDrag(event) {
    const state = dialogInteractionRef.current
    if (!state || state.type !== 'drag' || state.pointerId !== event.pointerId) return
    const margin = 12
    const maxLeft = Math.max(margin, window.innerWidth - state.width - margin)
    const maxTop = Math.max(margin, window.innerHeight - state.height - margin)
    const left = Math.min(Math.max(margin, state.left + event.clientX - state.startX), maxLeft)
    const top = Math.min(Math.max(margin, state.top + event.clientY - state.startY), maxTop)
    setFloatingDialogRect({ left, top, width: state.width, height: state.height })
  }

  function finishDialogDrag(event) {
    const state = dialogInteractionRef.current
    if (!state || state.type !== 'drag' || state.pointerId !== event.pointerId) return
    dialogRef.current?.classList.remove('qmr-study-dialog--dragging')
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    dialogInteractionRef.current = null
  }

  function beginDialogResize(event) {
    if (!desktopDialogEnabled() || event.button !== 0) return
    const root = dialogRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    setFloatingDialogRect(rect)
    dialogInteractionRef.current = {
      type: 'resize',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }
    root.classList.add('qmr-study-dialog--resizing')
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  }

  function moveDialogResize(event) {
    const state = dialogInteractionRef.current
    if (!state || state.type !== 'resize' || state.pointerId !== event.pointerId) return
    const margin = 12
    const maxWidth = Math.max(320, window.innerWidth - state.left - margin)
    const maxHeight = Math.max(260, window.innerHeight - state.top - margin)
    const minWidth = Math.min(480, maxWidth)
    const minHeight = Math.min(300, maxHeight)
    const width = Math.min(Math.max(minWidth, state.width + event.clientX - state.startX), maxWidth)
    const height = Math.min(Math.max(minHeight, state.height + event.clientY - state.startY), maxHeight)
    setFloatingDialogRect({ left: state.left, top: state.top, width, height })
  }

  function finishDialogResize(event) {
    const state = dialogInteractionRef.current
    if (!state || state.type !== 'resize' || state.pointerId !== event.pointerId) return
    dialogRef.current?.classList.remove('qmr-study-dialog--resizing')
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    dialogInteractionRef.current = null
  }

  function resizeDialogFromKeyboard(event) {
    if (!desktopDialogEnabled() || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    const root = dialogRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    const step = event.shiftKey ? 48 : 24
    const margin = 12
    const maxWidth = Math.max(320, window.innerWidth - rect.left - margin)
    const maxHeight = Math.max(260, window.innerHeight - rect.top - margin)
    const minWidth = Math.min(480, maxWidth)
    const minHeight = Math.min(300, maxHeight)
    let width = rect.width
    let height = rect.height
    if (event.key === 'ArrowLeft') width -= step
    if (event.key === 'ArrowRight') width += step
    if (event.key === 'ArrowUp') height -= step
    if (event.key === 'ArrowDown') height += step
    width = Math.min(Math.max(minWidth, width), maxWidth)
    height = Math.min(Math.max(minHeight, height), maxHeight)
    setFloatingDialogRect({ left: rect.left, top: rect.top, width, height })
    event.preventDefault()
  }

  useEffect(() => {
    const root = dialogRef.current
    if (!root) return undefined
    root.classList.remove('qmr-study-dialog--floating', 'qmr-study-dialog--dragging', 'qmr-study-dialog--resizing')
    for (const name of ['--qmr-study-dialog-left', '--qmr-study-dialog-top', '--qmr-study-dialog-width', '--qmr-study-dialog-height']) {
      root.style.removeProperty(name)
    }
    dialogInteractionRef.current = null
    const onViewportResize = () => clampFloatingDialog()
    window.addEventListener('resize', onViewportResize)
    return () => window.removeEventListener('resize', onViewportResize)
  }, [detail?.kind, detail?.verseKey])

  if (!detail || typeof document === 'undefined') return null

  const bracketEditing = detail.kind === 'bracket'
  const showHeaderEdit = editable && detail.kind !== 'word' && detail.kind !== 'vocab' && detail.kind !== 'tafsir'

  return createPortal(
    <>
      <button
        className="qmr-study-dialog-backdrop"
        type="button"
        aria-label="Close study details"
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        className={`qmr-study-dialog${fullscreen ? ' qmr-study-dialog--fullscreen' : ''}`}
        data-qmr-study-language={languageMode}
        role="dialog"
        aria-modal="true"
        aria-label={`${dialogTitle(detail)} for ${detail.verseKey || 'ayah'}`}
      >
        <header
          className="qmr-study-dialog-head"
          onPointerDown={beginDialogDrag}
          onPointerMove={moveDialogDrag}
          onPointerUp={finishDialogDrag}
          onPointerCancel={finishDialogDrag}
        >
          <div>
            {detail.verseKey ? <small>{detail.verseKey}</small> : null}
            <h3>{dialogTitle(detail)}</h3>
          </div>

          <div className="qmr-study-dialog-head-actions">
            {topSaveState.visible ? (
              <button
                type="button"
                className="qmr-study-dialog-save"
                onClick={saveFromHeader}
                disabled={topSaveState.disabled}
              >
                {topSaveState.label.includes('Saving') ? 'Saving…' : 'Save'}
              </button>
            ) : null}
            {showHeaderEdit ? (
              <button
                type="button"
                className="qmr-study-dialog-edit"
                onClick={() => setEditingContent((value) => !value)}
              >
                ✎ {editingContent ? 'Done' : 'Edit'}
              </button>
            ) : null}
                        <button
              type="button"
              className="qmr-study-dialog-fullscreen"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
              aria-pressed={fullscreen}
              title={fullscreen ? 'Return to window view' : 'Open large view'}
              onClick={() => setFullscreen((value) => !value)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {fullscreen ? (
                  <>
                    <path d="M9 3v6H3" />
                    <path d="m3 9 6-6" />
                    <path d="M15 21v-6h6" />
                    <path d="m21 15-6 6" />
                  </>
                ) : (
                  <>
                    <path d="M8 3H3v5" />
                    <path d="m3 3 6 6" />
                    <path d="M16 21h5v-5" />
                    <path d="m21 21-6-6" />
                  </>
                )}
              </svg>
              <span>{fullscreen ? 'Window view' : 'Large view'}</span>
            </button>
<button
              type="button"
              className="qmr-study-dialog-close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        {saveToast ? (
          <div className="qmr-save-toast" role="status" aria-live="polite">
            ✓ {saveToast}
          </div>
        ) : null}

        <div className="qmr-study-dialog-body">
          {authoring.error ? (
            <p className="qmr-vocab-corpus-warning">{authoring.error}</p>
          ) : null}

          <DialogContent
            detail={detail}
            vocabRoots={vocabRoots}
            vocabDictionaries={vocabDictionaries}
            vocabLemmas={vocabLemmas}
            vocabEntries={vocabEntries}
            irabTerms={irabTerms}
            wordIrabRecords={wordIrabRecords}
            authoring={authoring}
            editable={editable}
            editing={editable && editingContent}
          />
        </div>

        <button
          type="button"
          className="qmr-study-dialog-resize-handle"
          aria-label="Resize study window"
          title="Drag to resize. Arrow keys also resize."
          onPointerDown={beginDialogResize}
          onPointerMove={moveDialogResize}
          onPointerUp={finishDialogResize}
          onPointerCancel={finishDialogResize}
          onKeyDown={resizeDialogFromKeyboard}
        >
          <span aria-hidden="true" />
        </button>
      </section>
    </>,
    document.body
  )
}
