'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g

function normalizeHoverArabic(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(ARABIC_MARKS, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/\s+/g, '')
    .trim()
}

export function findReaderVocabMapping(mappings, verseKey, segment) {
  const rows = Array.isArray(mappings) ? mappings : []
  if (!rows.length) return null

  const [surahText, ayahText] = String(verseKey || '').split(':')
  const surahNumber = Number(surahText)
  const ayahNumber = Number(ayahText)
  const wordNumber = Number(segment?.wordNumber) || 0
  const segmentNumber = Number(segment?.segmentNumber) || 0
  const targetArabic = normalizeHoverArabic(segment?.wordArabic || '')

  const verseRows = rows.filter(
    (item) =>
      Number(item?.surahNumber) === surahNumber &&
      Number(item?.ayahNumber) === ayahNumber
  )

  const exact =
    verseRows.find(
      (item) =>
        Number(item?.wordNumber) === wordNumber &&
        Number(item?.segmentNumber || 0) === segmentNumber &&
        normalizeHoverArabic(item?.wordArabic || '') === targetArabic
    ) ||
    verseRows.find(
      (item) =>
        Number(item?.wordNumber) === wordNumber &&
        normalizeHoverArabic(item?.wordArabic || '') === targetArabic
    ) ||
    verseRows.find(
      (item) => normalizeHoverArabic(item?.wordArabic || '') === targetArabic
    ) ||
    null

  if (!exact) return null

  return {
    id: exact.id,
    wordArabic: exact.wordArabic || segment?.wordArabic || '',
    transliteration: exact.transliteration || segment?.transliteration || '',
    rootId: exact.rootId || '',
    lemmaId: exact.lemmaId || '',
    wordNumber: exact.wordNumber,
    segmentNumber: Number(exact.segmentNumber || 0),
  }
}

function irabRecordHasContent(record) {
  if (!record) return false
  if (String(record.conclusionArabic || '').trim()) return true
  if (String(record.conclusionEnglish || '').trim()) return true
  if (Array.isArray(record.opinions) && record.opinions.length) return true

  const shared = record.shared || {}
  return Object.values(shared).some((value) => {
    if (Array.isArray(value)) return value.length > 0
    return Boolean(String(value || '').trim())
  })
}

export function readerWordHasIrab(records, verseKey, segment) {
  const rows = Array.isArray(records) ? records : []
  const wordNumber = Number(segment?.wordNumber) || 0
  const segmentNumber = Number(segment?.segmentNumber) || 0

  const record = rows.find(
    (item) =>
      String(item?.verseKey || '') === String(verseKey || '') &&
      Number(item?.wordNumber) === wordNumber &&
      Number(item?.segmentNumber || 0) === segmentNumber
  )

  return irabRecordHasContent(record)
}

function useFloatingPosition(open, anchorRef, cardRef, positionKey = '') {
  const [position, setPosition] = useState({
    top: -10000,
    left: -10000,
    visibility: 'hidden',
  })

  useEffect(() => {
    if (!open) return undefined

    const updatePosition = () => {
      const anchor = anchorRef.current
      const card = cardRef.current
      if (!anchor || !card) return

      const gap = 10
      const edge = 12
      const anchorRect = anchor.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()

      let left = anchorRect.left + anchorRect.width / 2 - cardRect.width / 2
      left = Math.max(
        edge,
        Math.min(left, window.innerWidth - cardRect.width - edge)
      )

      // Prefer above. Only fall below when the complete card cannot fit above.
      let top = anchorRect.top - cardRect.height - gap
      if (top < edge) top = anchorRect.bottom + gap

      top = Math.max(
        edge,
        Math.min(top, window.innerHeight - cardRect.height - edge)
      )

      setPosition({ top, left, visibility: 'visible' })
    }

    const frame = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, positionKey])

  return position
}

export function StudyWordToken({
  verseKey,
  segment,
  mappedVocab,
  hasIrab,
  hoverEnabled = true,
  hoverSize = 'compact',
  onOpenStudy,
}) {
  const anchorRef = useRef(null)
  const cardRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [open, setOpen] = useState(false)

  const hasVocabulary = Boolean(mappedVocab)
  const hasQuickActions = hasVocabulary || hasIrab

  const positionKey = [
    verseKey,
    segment.wordNumber,
    segment.segmentNumber,
    segment.translation,
    segment.transliteration,
    hasVocabulary ? 'vocab' : '',
    hasIrab ? 'irab' : '',
  ].join('|')

  const position = useFloatingPosition(open, anchorRef, cardRef, positionKey)

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const showPreview = () => {
    if (!hoverEnabled) return
    cancelClose()
    setOpen(true)
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => () => cancelClose(), [])

  useEffect(() => {
    if (!hoverEnabled) setOpen(false)
  }, [hoverEnabled])

  const openWordStudy = (initialTab = '') => {
    cancelClose()
    setOpen(false)

    onOpenStudy({
      kind: 'word',
      verseKey,
      wordNumber: segment.wordNumber,
      segmentNumber: segment.segmentNumber,
      initialTab: initialTab || undefined,
      word: {
        wordArabic: segment.wordArabic,
        textUthmani: segment.wordArabic,
        textIndopak: segment.wordArabic,
        transliteration: segment.transliteration,
        translation: segment.translation,
      },
      link: mappedVocab || null,
    })
  }

  const preview =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={cardRef}
            className={`qmr-study-word-hover-card qmr-study-word-hover-card--${hoverSize}`}
            role="tooltip"
            style={position}
            onMouseEnter={showPreview}
            onMouseLeave={scheduleClose}
            onFocus={showPreview}
            onBlur={scheduleClose}
          >
            {String(segment.translation || '').trim() ? (
              <strong className="qmr-study-word-hover-meaning">
                {segment.translation}
              </strong>
            ) : null}

            {String(segment.transliteration || '').trim() ? (
              <span className="qmr-study-word-hover-transliteration">
                {segment.transliteration}
              </span>
            ) : null}

            {hasQuickActions ? (
              <div
                className="qmr-study-word-hover-actions"
                aria-label={`Available study material for ${segment.wordArabic}`}
              >
                {hasVocabulary ? (
                  <button type="button" onClick={() => openWordStudy('vocab')}>
                    Vocabulary
                  </button>
                ) : null}

                {hasIrab ? (
                  <button type="button" onClick={() => openWordStudy('irab')}>
                    Iʿrāb
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null

  return (
    <>
      <span
        ref={anchorRef}
        className="qmr-word qmr-study-word qmr-study-word-all"
        tabIndex={0}
        role="button"
        aria-label={`Open Word Study for ${segment.wordArabic}`}
        onMouseEnter={showPreview}
        onMouseLeave={scheduleClose}
        onFocus={showPreview}
        onBlur={scheduleClose}
        onClick={() => openWordStudy()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openWordStudy()
          }
        }}
      >
        {segment.wordArabic}
      </span>
      {preview}
    </>
  )
}

export function TranslationAnnotationButton({
  original,
  existingNote,
  note,
  verseKey,
  translationId,
  hoverEnabled = true,
  hoverSize = 'compact',
  languageMode = 'both',
  onOpen,
}) {
  const anchorRef = useRef(null)
  const cardRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [open, setOpen] = useState(false)

  const showEnglish = languageMode !== 'arabic'
  const showArabic = languageMode !== 'english'
  const hasPreview = Boolean(
    existingNote &&
      ((showEnglish && String(existingNote.reason || '').trim()) ||
        (showArabic && String(existingNote.reference || '').trim()))
  )

  const positionKey = [
    existingNote?.reason || '',
    existingNote?.reference || '',
    languageMode,
  ].join('|')

  const position = useFloatingPosition(
    open && hasPreview,
    anchorRef,
    cardRef,
    positionKey
  )

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const showPreview = () => {
    if (!hasPreview || !hoverEnabled) return
    cancelClose()
    setOpen(true)
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => () => cancelClose(), [])

  useEffect(() => {
    if (!hoverEnabled) setOpen(false)
  }, [hoverEnabled])

  const openAnnotation = () => {
    cancelClose()
    setOpen(false)
    onOpen?.({
      kind: 'bracket',
      verseKey,
      note,
      translationId,
      annotationExists: Boolean(existingNote),
    })
  }

  const preview =
    open && hasPreview && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={cardRef}
            className={`qmr-translation-annotation-hover-card qmr-translation-annotation-hover-card--${hoverSize}`}
            role="tooltip"
            style={position}
            onMouseEnter={showPreview}
            onMouseLeave={scheduleClose}
          >
            <strong className="qmr-translation-annotation-hover-title">
              {original}
            </strong>

            {showEnglish && String(existingNote.reason || '').trim() ? (
              <div className="qmr-translation-annotation-hover-en">
                {existingNote.reason}
              </div>
            ) : null}

            {showArabic && String(existingNote.reference || '').trim() ? (
              <div
                className="qmr-translation-annotation-hover-ar"
                dir="rtl"
                lang="ar"
              >
                {existingNote.reference}
              </div>
            ) : null}

            <span className="qmr-translation-annotation-hover-hint">
              Click the highlighted phrase to open
            </span>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`qmr-study-bracket${
          existingNote ? '' : ' qmr-study-bracket--empty'
        }`}
        title={
          existingNote
            ? `Open note for ${original}`
            : `Add note for ${original}`
        }
        aria-label={
          existingNote
            ? `Open note for ${original}`
            : `Add note for ${original}`
        }
        onMouseEnter={showPreview}
        onMouseLeave={scheduleClose}
        onFocus={showPreview}
        onBlur={scheduleClose}
        onClick={openAnnotation}
      >
        {original}
      </button>
      {preview}
    </>
  )
}
