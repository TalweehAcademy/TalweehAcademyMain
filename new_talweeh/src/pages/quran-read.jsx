/* eslint-disable react/prop-types */
// Read Mode ("Muṣḥaf", from mockups/quran-waha-mushaf.html) at /quran/read.
// Book view: Madinah + Ḥafṣ shows the real 604-page muṣḥaf layout (1421H print, line by line, from this site's copy: scripts/build-quran-layout.mjs);
// IndoPak styles and the other riwāyāt come per surah and are paginated to the chosen line count.
// Scroll view: one continuous column, surah after surah.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { QURAN_JUZ_STARTS } from '../data/quranIndex'
import { LAYOUTS, PARA_NAMES, RIWAYAT, STYLES, MUSHAF_PAGES, arNum, getPrintMarks, juzName, printedPage, getMushafLines, getMushafPage, getSurahText, getTranslation, pageOf, surahInfo } from '../quran/quranData'
import { AyahMarker, Icon, SurahPicker, useEscape, QuranCredits } from '../quran/QuranUI'
import { useScrollLock } from '../hooks/useScrollLock'
import { AyahPlayer } from '../quran/AyahPlayer'
import '../quran-pages-v1.css'

const PREFS_KEY = 'talweeh-read-prefs'
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {} } catch { return {} } }
const juzOf = (surah, ayah = 1) => QURAN_JUZ_STARTS.filter(([, s, a]) => s < surah || (s === surah && a <= ayah)).pop()?.[0] || 1
const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
// The IndoPak pages' basmalah, in the IndoPak text's own spelling (QUL's 1:1).
const BASMALAH_INDOPAK = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِیْمِ'

function SurahHead({ s }) {
  return (
    <>
      <div className="qp-cart"><span>سُورَةُ {surahInfo(s).ar}</span></div>
      {s !== 1 && s !== 9 && <div className="qp-bism">{BASMALAH}</div>}
    </>
  )
}

// One printed page drawn line for line: Madinah (15 lines; pages 1–2 are centred and shorter) or IndoPak (13, 15 or
// 16 lines, in the IndoPak font, whose own glyphs draw each āyah's circle).
// Every line on the page shares one type size, chosen so the longest line exactly fills the page width,
// and each line is justified edge to edge, so the page looks the same on a phone as in print.
// Runs of empty line slots before a surah hold its title (and basmalah, except for al-Tawbah).
// How far a line may be stretched sideways to fill its width before the gaps between words widen too: printed pages
// fill a line by drawing letters longer (kashīda), which a browser cannot do reliably; a slight stretch looks closer
// than wide gaps.
// IndoPak prints stretch letters far more than the Madinah one, so their lines may stretch further.
const MAX_STRETCH = { madinah: 1.08, indopak: 1.2 }

// `onSize` reports the size this page fits at; `shared` is the one both facing pages use (the smaller), as in print.
// `marks` (getPrintMarks) puts the rukūʿ and manzil marks in the margin on the page's outer `side` ('r' or 'l').
function MushafLines({ lines, no, onTap, selected, layout, onSize, shared, marks, side }) {
  const boxRef = useRef(null)
  const [size, setSize] = useState(null)
  const fit = useCallback(() => {
    const box = boxRef.current
    if (!box) return
    // The room a line's words have (the opening pages' lines sit in wider margins than the page box).
    const line = box.querySelector('.qp-ml.w'), pad = line ? getComputedStyle(line) : null
    const avail = line ? line.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight) : box.clientWidth
    if (!avail) return
    box.classList.add('measure') // lays lines out packed at a fixed 20px (see CSS)
    let widest = 0
    box.querySelectorAll('.qp-lw').forEach((l) => { widest = Math.max(widest, l.getBoundingClientRect().width) })
    box.classList.remove('measure')
    if (widest) setSize(Math.max(11, Math.min(40, 20 * (avail / widest) * 0.97)))
  }, [])
  useLayoutEffect(fit, [lines, fit])
  // Safety net: if any line still runs past the page (glyph overhangs the measure missed), step down.
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box || !size) return
    box.classList.add('check') // margin marks out of the way while lines are checked
    const over = [...box.querySelectorAll('.qp-ml.w')].some((l) => l.scrollWidth > l.clientWidth + 1)
    box.classList.remove('check')
    if (over && size > 11) setSize((v) => Math.max(11, v * 0.96))
    else onSize?.(size)
  }, [size]) // eslint-disable-line react-hooks/exhaustive-deps
  // Each justified line: words at their natural spacing, the line stretched up to MAX_STRETCH to meet both edges, and
  // only what is left over shared out between the words.
  const used = size ? Math.min(size, shared || size) : null
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box || !used) return
    for (const line of box.querySelectorAll('.qp-ml.w:not(.c)')) {
      const el = line.querySelector(':scope > .qp-lw')
      el.style.removeProperty('transform'); el.style.removeProperty('gap'); el.style.removeProperty('flex'); el.style.removeProperty('width'); line.classList.add('nat')
      const words = el.querySelectorAll(':scope > .qp-mw')
      if (words.length < 2) { line.classList.remove('nat'); continue }
      const xs = [...words].map((w) => w.getBoundingClientRect())
      const content = Math.max(...xs.map((r) => r.right)) - Math.min(...xs.map((r) => r.left))
      const width = el.clientWidth, ratio = width / content
      if (!(ratio > 1.002)) continue
      const stretch = Math.min(ratio, layout?.startsWith('indopak') ? MAX_STRETCH.indopak : MAX_STRETCH.madinah)
      const extra = (width / stretch - content) / (words.length - 1)
      // The words take width ÷ stretch, so once stretched they meet both edges and nothing runs past the line.
      el.style.flex = 'none'
      el.style.width = `${(width / stretch).toFixed(2)}px`
      el.style.gap = `calc(.28em + ${extra.toFixed(2)}px)`
      el.style.transform = `scaleX(${stretch.toFixed(4)})`
    }
  }, [used, lines, shared, layout])
  useEffect(() => {
    const ro = new ResizeObserver(fit)
    if (boxRef.current) ro.observe(boxRef.current)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [fit])

  const indopak = layout?.startsWith('indopak')
  const centred = !indopak && no <= 2
  const out = []
  const seen = new Set()
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.words.length) {
      // Margin: ع with the rukūʿ's number in its sūrah, its āyāt and its number in the juzʾ, beside the line it ends
      // on (IndoPak prints); منزل at a manzil's first line.
      const ruku = indopak && marks ? l.words.filter((w) => w.end).map((w) => marks.rukuEnd.get(`${w.s}:${w.a}`)).filter(Boolean) : []
      const manzil = indopak && marks ? l.words.map((w) => { const k = `${w.s}:${w.a}`; const first = !seen.has(k); seen.add(k); return first && !(i === 0 && w === l.words[0] && w.a !== 1) ? marks.manzil.get(k) : null }).find(Boolean) : null
      if (!indopak) l.words.forEach((w) => seen.add(`${w.s}:${w.a}`))
      out.push(
        <div key={l.n} className={`qp-ml w${centred || (l.centred && l.type === 'ayah') ? ' c' : ''}${ruku.length || manzil ? ' has-m' : ''}`}>
          {(ruku.length > 0 || manzil) && (
            <span className={`qp-mrk ${side}`} aria-hidden="true">
              {manzil && <span className="mz">منزل {arNum(manzil)}</span>}
              {ruku.map((r, k) => <span key={k} className="rk"><small>{arNum(r.s)}</small><i>ع</i><small>{arNum(r.n)}</small><small>{arNum(r.j)}</small></span>)}
            </span>
          )}
          <span className="qp-lw">
            {l.words.map((w, k) => (w.end && !indopak
              ? <span key={k} className={`qp-mw${selected === `${w.s}:${w.a}` ? ' on' : ''}`} onClick={(e) => onTap(e, w)}><AyahMarker n={w.a} /></span>
              : <span key={k} className={`qp-mw${selected === `${w.s}:${w.a}` ? ' on' : ''}`} onClick={(e) => onTap(e, w)}>{w.t}</span>))}
          </span>
        </div>,
      )
      continue
    }
    // A run of empty slots: the next surah's title, then its basmalah.
    let j = i
    while (j < lines.length && !lines[j].words.length) j++
    const nextWord = lines[j]?.words[0]
    const sura = nextWord ? nextWord.s : (lines[i - 1]?.words.at(-1)?.s || 0) + 1
    const run = j - i
    // The Taj IndoPak print gives most sūrahs no basmalah line of its own: it sits in the title's frame.
    const bismInTitle = indopak && run === 1 && sura !== 1 && sura !== 9
    out.push(<div key={`h${l.n}`} className="qp-ml h"><div className={`qp-cart${bismInTitle ? ' with-b' : ''}`}><span>سُورَةُ {surahInfo(sura).ar}</span>{bismInTitle && <b>{BASMALAH_INDOPAK}</b>}</div></div>)
    if (run > 1) out.push(<div key={`b${l.n}`} className="qp-ml h"><div className="qp-bism">{sura !== 9 ? (indopak ? BASMALAH_INDOPAK : BASMALAH) : ''}</div></div>)
    for (let k = 2; k < run; k++) out.push(<div key={`e${l.n}-${k}`} className="qp-ml h" />)
    i = j - 1
  }
  // A page with all its print's lines fills the page's height; a shorter one (the Qurʾān's last) keeps its spacing.
  const full = lines.length >= (LAYOUTS[layout]?.lines || 15)
  return <div className={`qp-mushaf${centred ? ' opening' : ''}${indopak ? ' ip' : ''}${full ? ' full' : ''}`} ref={boxRef} style={size ? { '--mfs': `${Math.min(size, shared || size)}px` } : undefined}>{out}</div>
}

// A printed page's top line: its juzʾ (IndoPak: the para's name and number), its page number, its sūrah.
function PageHead({ lines, layout, no, marks }) {
  const first = lines.find((l) => l.words.length)?.words[0]
  if (!first) return null
  const indopak = layout?.startsWith('indopak')
  const j = marks?.juzOf(first.s, first.a)
  return (
    <div className={`qp-phead${indopak ? ' ip' : ''}`}>
      <span>{j ? (indopak ? <>{PARA_NAMES[j - 1]} <i>{arNum(j)}</i></> : juzName(j)) : ''}</span>
      <b>{arNum(printedPage(layout, no))}</b>
      <span>{indopak ? <>{surahInfo(first.s).ar} <i>{arNum(first.s)}</i></> : `سُورَةُ ${surahInfo(first.s).ar}`}</span>
    </div>
  )
}

// Rows [{ s, a, text }] → surah headers + continuous text, one clickable span per āyah.
function Flow({ rows, center, onTap, selected }) {
  const blocks = []
  let cur = null
  for (const r of rows) {
    if (!cur || cur.s !== r.s || r.a === 1) { cur = { s: r.s, head: r.a === 1, rows: [] }; blocks.push(cur) }
    cur.rows.push(r)
  }
  return blocks.map((b, i) => (
    <div key={`${b.s}-${i}`}>
      {b.head && <SurahHead s={b.s} />}
      <div className={`qp-txt${center ? ' center' : ''}`}>
        {b.rows.map((r) => (
          <span key={r.a}>
            <span className={`qp-v${selected === `${r.s}:${r.a}` ? ' on' : ''}`} data-k={`${r.s}:${r.a}`} onClick={(e) => onTap(e, r)}>{r.text} <AyahMarker n={r.a} /></span>
            {center ? <br /> : ' '}
          </span>
        ))}
      </div>
    </div>
  ))
}

// Split a surah's āyāt into pages of roughly `lines` lines at the current text size.
function paginate(rows, lines, fs) {
  const perLine = Math.max(18, Math.round(40 * 30 / fs))
  const budget = perLine * lines
  const pages = [[]]
  let used = perLine * 3 // surah title + basmalah on the first page
  for (const r of rows) {
    const cost = r.text.length + 6
    if (used + cost > budget && pages[pages.length - 1].length) { pages.push([]); used = 0 }
    pages[pages.length - 1].push(r)
    used += cost
  }
  return pages
}

export default function QuranReadPage() {
  const [params, setParams] = useSearchParams()
  const prefs = useMemo(loadPrefs, [])
  const [view, setView] = useState(prefs.view === 'scroll' ? 'scroll' : 'book')
  const [styleId, setStyleId] = useState(STYLES.some((s) => s.id === prefs.style) ? prefs.style : 'madinah15')
  const [riwayah, setRiwayah] = useState(RIWAYAT.some((r) => r.id === prefs.riwayah) ? prefs.riwayah : 'hafs')
  const [fs, setFs] = useState(Number(prefs.fs) || 30)
  const style = STYLES.find((s) => s.id === styleId)
  // Styles with a printed layout (Madinah 15-line, IndoPak 16-line, both Ḥafṣ) turn real pages; the others are cut
  // into pages here. `madinah` stands for "printed pages" below.
  const layout = riwayah === 'hafs' && LAYOUTS[style.id] ? style.id : null
  const madinah = !!layout
  const totalPages = layout ? LAYOUTS[layout].pages : MUSHAF_PAGES

  const [surah, setSurah] = useState(() => Math.min(114, Math.max(1, Number(params.get('surah')) || 1)))
  // 0 = not known yet: resolved from ?surah=&ayah= below.
  const [page, setPage] = useState(() => { const p = Number(params.get('page')); return p ? Math.min(totalPages, Math.max(1, p)) : 0 })
  const [sub, setSub] = useState(0) // page index within a surah, for non-Madinah book view
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  // Phones: the reading tools live in a sheet behind one floating button, so the page is just the muṣḥaf.
  const [toolsOpen, setToolsOpen] = useState(false)
  // The Display panel is a sheet on phones (quran-pages-v1.css, 640px) and needs the page held still there; on wider
  // screens it hangs from the sticky toolbar, and holding the page would unstick the toolbar, leaving the panel at
  // the top of a scrolled page.
  useScrollLock(toolsOpen || (dockOpen && window.matchMedia('(max-width: 640px)').matches))
  const [pop, setPop] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ view, style: styleId, riwayah, fs })) } catch { /* private mode */ } }, [view, styleId, riwayah, fs])

  // First open with ?surah=&ayah= in Madinah book view: find its page.
  const wantAyah = Number(params.get('ayah')) || 1
  useEffect(() => {
    if (page) return
    pageOf(surah, wantAyah, layout || 'madinah15').then(setPage).catch(() => setPage(1))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back to Madinah pages from another style or from scroll: open at the current surah.
  const enteredBookRef = useRef(false)
  useEffect(() => {
    if (!enteredBookRef.current) { enteredBookRef.current = true; return }
    if (madinah && view === 'book') pageOf(surah, 1, layout).then(setPage).catch(() => {})
  }, [madinah, layout, view]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── book view, Madinah: two real pages ── */
  const spreadStart = page ? (page % 2 ? page : page - 1) : 0
  const [spreadRows, setSpreadRows] = useState([null, null])
  const [spreadLines, setSpreadLines] = useState([null, null])
  useEffect(() => {
    // (a page past this layout's end is the other layout's, until the page is found again for this one)
    if (!madinah || view !== 'book' || !spreadStart || spreadStart > totalPages) return undefined
    let live = true
    setSpreadLines([null, null])
    // If the line layout can't be fetched, the page falls back to flowing text (spreadLines stays null).
    Promise.all([getMushafLines(spreadStart, layout), spreadStart + 1 <= totalPages ? getMushafLines(spreadStart + 1, layout) : Promise.resolve([])])
      .then((pair) => { if (live) setSpreadLines(pair) })
      .catch(() => {})
    return () => { live = false }
  }, [madinah, layout, totalPages, view, spreadStart])
  useEffect(() => {
    if (!madinah || view !== 'book' || !spreadStart || spreadStart > totalPages) return undefined
    let live = true
    setError('')
    Promise.all([getMushafPage(spreadStart, layout), spreadStart + 1 <= totalPages ? getMushafPage(spreadStart + 1, layout) : Promise.resolve([])])
      .then((pair) => {
        if (!live) return
        setSpreadRows(pair)
        // Keep the surah the reader asked for if it's on this spread; otherwise follow the page.
        const rows = [...pair[0], ...pair[1]]
        setSurah((cur) => (rows.some((r) => r.s === cur) ? cur : rows[0]?.s || cur))
      })
      .catch(() => live && setError('This page could not be loaded. Check your connection and try again.'))
    return () => { live = false }
  }, [madinah, layout, totalPages, view, spreadStart])

  /* ── book view (other styles/riwāyāt) and scroll view: text per surah ── */
  const [texts, setTexts] = useState({})
  const textKey = `${style.script}:${riwayah}`
  const loadSurah = useCallback((n) => getSurahText(n, { script: style.script, riwayah }).then((rows) => {
    setTexts((t) => ({ ...t, [`${textKey}:${n}`]: rows.map((r) => ({ s: n, a: r.a, text: r.text })) }))
  }), [style.script, riwayah, textKey])
  const surahRows = texts[`${textKey}:${surah}`]
  useEffect(() => {
    if ((view === 'book' && madinah) || surahRows) return
    setError('')
    loadSurah(surah).catch(() => setError('This surah could not be loaded in the selected style. Try Madinah · Ḥafṣ, or check your connection.'))
  }, [view, madinah, surah, surahRows, loadSurah])
  const subPages = useMemo(() => (surahRows ? paginate(surahRows, style.lines, fs) : []), [surahRows, style.lines, fs])

  /* ── scroll view: current surah then the ones after it ── */
  const [scrollFrom, setScrollFrom] = useState(surah)
  const [scrollCount, setScrollCount] = useState(1)
  useEffect(() => { setScrollFrom(surah); setScrollCount(1) }, [view, textKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const scrollSurahs = Array.from({ length: scrollCount }, (_, i) => scrollFrom + i).filter((n) => n <= 114)
  useEffect(() => {
    if (view !== 'scroll') return
    scrollSurahs.forEach((n) => { if (!texts[`${textKey}:${n}`]) loadSurah(n).catch(() => {}) })
  }, [view, scrollFrom, scrollCount, textKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const moreRef = useRef(null)
  useEffect(() => {
    if (view !== 'scroll' || !moreRef.current) return undefined
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setScrollCount((c) => Math.min(c + 1, 115 - scrollFrom)) }, { rootMargin: '600px' })
    io.observe(moreRef.current)
    return () => io.disconnect()
  }, [view, scrollFrom, scrollCount])
  // Location follows the section at the top of the screen.
  useEffect(() => {
    if (view !== 'scroll') return undefined
    const onScroll = () => {
      let top = scrollFrom
      document.querySelectorAll('.qp-sec').forEach((el) => { if (el.getBoundingClientRect().top < 240) top = Number(el.dataset.s) })
      setSurah(top)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [view, scrollFrom])

  /* ── URL stays shareable ── */
  useEffect(() => {
    const next = new URLSearchParams()
    next.set('surah', String(surah))
    if (view === 'book' && madinah && page) next.set('page', String(spreadStart))
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [surah, page, spreadStart, view, madinah]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── navigation ── */
  const surahSubCount = subPages.length
  const canPrev = madinah && view === 'book' ? spreadStart > 1 : (sub > 0 || surah > 1)
  const canNext = madinah && view === 'book' ? spreadStart + 2 <= totalPages : (sub + 2 < surahSubCount || surah < 114)
  const turn = useCallback((d) => {
    setPop(null)
    if (madinah && view === 'book') { setPage((p) => { const s = p % 2 ? p : p - 1; return Math.min(totalPages - 1, Math.max(1, s + d * 2)) }); return }
    if (d > 0) { if (sub + 2 < surahSubCount) setSub(sub + 2); else if (surah < 114) { setSurah(surah + 1); setSub(0) } }
    else if (sub > 0) setSub(Math.max(0, sub - 2))
    else if (surah > 1) {
      const prev = surah - 1, rows = texts[`${textKey}:${prev}`]
      setSurah(prev); setSub(rows ? Math.max(0, (paginate(rows, style.lines, fs).length - 1) & ~1) : 0)
    }
  }, [madinah, totalPages, view, sub, surahSubCount, surah, texts, textKey, style.lines, fs])
  useEffect(() => {
    if (view !== 'book') return undefined
    const key = (e) => { if (e.target.closest('input,select,textarea')) return; if (e.key === 'ArrowLeft') turn(1); if (e.key === 'ArrowRight') turn(-1) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [view, turn])

  const goTo = async ({ surah: s, ayah = 1 }) => {
    setPickerOpen(false); setPop(null)
    setSurah(s); setSub(0)
    if (view === 'scroll') { setScrollFrom(s); setScrollCount(1); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (madinah) setPage(await pageOf(s, ayah, layout).catch(() => 1))
  }

  /* ── tap an āyah ── */
  const onTap = (e, r) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPop({ k: `${r.s}:${r.a}`, s: r.s, a: r.a, tr: '', x: Math.max(12, Math.min(window.innerWidth - 372, rect.left + rect.width / 2 - 180)), y: Math.min(window.innerHeight - 190, rect.bottom + 8) })
    getTranslation(r.s).then((t) => setPop((p) => (p && p.k === `${r.s}:${r.a}` ? { ...p, tr: t[r.a - 1] || '' } : p))).catch(() => {})
    playerRef.current?.prepare(r.s) // so Listen can start the audio straight from the tap
  }
  /* ── Listen: recitation from the tapped āyah, on this page (AyahPlayer) ── */
  const playerRef = useRef(null)
  const [playKey, setPlayKey] = useState(null)
  const followRef = useRef({})
  followRef.current = { madinah, view, layout, surah }
  const onPlayAyah = useCallback((s, a) => {
    setPlayKey(`${s}:${a}`)
    const { madinah: paged, view: v, layout: lay, surah: cur } = followRef.current
    // The page follows the voice: printed pages turn to the āyah's spread; scroll view keeps it on screen.
    if (paged && v === 'book') pageOf(s, a, lay).then((p) => setPage((now) => { const sp = (x) => (x % 2 ? x : x - 1); return sp(p) === sp(now) ? now : p })).catch(() => {})
    else if (v === 'scroll') document.querySelector(`[data-k="${s}:${a}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    else if (s !== cur) { setSurah(s); setSub(0) }
  }, [])
  const shown = pop?.k || playKey
  useEffect(() => {
    const close = () => setPop(null)
    document.addEventListener('click', close)
    window.addEventListener('scroll', close, { passive: true })
    return () => { document.removeEventListener('click', close); window.removeEventListener('scroll', close) }
  }, [])
  const closeDock = useCallback(() => setDockOpen(false), [])
  useEscape(dockOpen, closeDock)
  const closeTools = useCallback(() => { setToolsOpen(false); setDockOpen(false) }, [])
  useEscape(toolsOpen && !dockOpen, closeTools)
  useEffect(() => {
    if (!dockOpen) return undefined
    const close = (e) => { if (!e.target.closest('.qp-dock,.qp-dbtn')) setDockOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [dockOpen])

  /* ── location label ── */
  const firstRow = madinah && view === 'book' ? [...(spreadRows[0] || []), ...(spreadRows[1] || [])].find((r) => r.s === surah) : null
  const locSurah = surahInfo(surah)
  const locSub = madinah && view === 'book'
    ? `Juz ${firstRow?.juz || juzOf(locSurah.n)} · Page ${spreadStart ? printedPage(layout, spreadStart) : '…'}`
    : view === 'book' ? `Juz ${juzOf(surah)} · Page ${Math.min(sub + 1, surahSubCount || 1)} of ${surahSubCount || '…'}` : `Juz ${juzOf(surah)} · ${locSurah.ayahs} āyāt`
  const riw = RIWAYAT.find((r) => r.id === riwayah)

  const [marks, setMarks] = useState(null)
  useEffect(() => { getPrintMarks().then(setMarks).catch(() => {}) }, [])
  // The text size each printed page of the spread fits at; both pages use the smaller one.
  const [fitSizes, setFitSizes] = useState({})
  const onSize = useCallback((no, v) => setFitSizes((f) => (f[no] === v ? f : { ...f, [no]: v })), [])
  const spreadSize = [spreadStart, spreadStart + 1].map((n) => fitSizes[`${layout}:${n}`]).filter(Boolean)
  const sharedSize = spreadSize.length ? Math.min(...spreadSize) : undefined
  const renderPage = (rows, no, key, lines) => {
    if (lines && lines.length) {
      return (
        <article key={key} className={`qp-page lined${layout?.startsWith('indopak') ? ' ip' : ''} ${key === 'r' ? 'side-r' : 'side-l'}`}>
          <span className="frame" />
          <PageHead lines={lines} layout={layout} no={no} marks={marks} />
          <MushafLines lines={lines} no={no} onTap={onTap} selected={shown} layout={layout} onSize={(v) => onSize(`${layout}:${no}`, v)} shared={sharedSize} marks={marks} side={key === 'r' ? 'r' : 'l'} />
        </article>
      )
    }
    if (!rows) return <article key={key} className="qp-page"><span className="frame" /><p className="qp-status">Loading…</p></article>
    if (!rows.length) return <article key={key} className="qp-page blank"><span className="frame" /></article>
    return (
      <article key={key} className="qp-page">
        <span className="frame" />
        <Flow rows={rows} center={layout === 'madinah15' && no <= 2} onTap={onTap} selected={shown} />
        <div className="qp-pno">{no ? arNum(no) : ''}</div>
      </article>
    )
  }

  return (
    <WahaPage className="qp qp-readmode" overlays={<>
      <AyahPlayer ref={playerRef} riwayah={riwayah} onAyah={onPlayAyah} onClose={() => setPlayKey(null)} />
      <button type="button" className={`qp-fab${toolsOpen ? ' hide' : ''}`} onClick={() => setToolsOpen(true)} aria-haspopup="dialog" aria-label="Reading options">
        {Icon.sliders}<span><strong>{locSurah.en}</strong><small>{locSub}</small></span>
      </button>
      <SurahPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={goTo} current={surah} title="Choose where to read" />
      <div className={`qp-vpop${pop ? ' on' : ''}`} style={pop ? { left: pop.x, top: pop.y } : undefined} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Āyah">
        {pop && <>
          <small>{pop.k} · {surahInfo(pop.s).en}</small>
          <p>{pop.tr || 'Loading translation…'}</p>
          <div className="row">
            <button className="wh-btn wh-btn-g" type="button" onClick={() => { playerRef.current?.play(pop.s, pop.a); setPop(null) }}>▶ Listen</button>
            <Link className="wh-btn wh-btn-glass" to={`/quran/study?surah=${pop.s}&ayah=${pop.a}`}>Study</Link>
            <Link className="wh-btn wh-btn-glass" to={`/quran?surah=${pop.s}&ayah=${pop.a}`}>Reader</Link>
          </div>
        </>}
      </div>
    </>}>
      <div className="wh-wrap" style={{ '--fs': `${fs}px` }}>
        <section className="qp-intro">
          <span className="qp-kicker">Read Mode</span>
          <h1>Read as you would from the muṣḥaf</h1>
          <p>Turn muṣḥaf pages or scroll continuously. Tap an āyah for its translation, recitation and study notes.</p>
        </section>

        {/* inside <main> (its own stacking layer) so it sits under the sheet, not over it */}
        <div className={`qp-sheet-ov${toolsOpen ? ' open' : ''}`} onClick={closeTools} aria-hidden="true" />
        <div className={`qp-viewbar wh-glass${toolsOpen ? ' sheet-open' : ''}`} role={toolsOpen ? 'dialog' : undefined} aria-label={toolsOpen ? 'Reading options' : undefined}>
          <div className="qp-sheet-h"><span className="qp-kicker">Reading options</span><button className="qp-ib" type="button" onClick={closeTools} aria-label="Close">{Icon.close}</button></div>
          <div className="qp-seg qp-vseg" role="group" aria-label="Reading view">
            <button type="button" className={view === 'book' ? 'on' : ''} onClick={() => setView('book')}>{Icon.book}<span>Muṣḥaf pages</span></button>
            <button type="button" className={view === 'scroll' ? 'on' : ''} onClick={() => setView('scroll')}>{Icon.scroll}<span>Scroll</span></button>
          </div>
          <button className="qp-loc" type="button" onClick={() => { setToolsOpen(false); setDockOpen(false); setPickerOpen(true) }} aria-haspopup="dialog">
            <span className="d">{locSurah.n}</span><span><strong>{locSurah.en}</strong><small>{locSub}</small></span><span className="qp-ar">{locSurah.ar}</span><i>▾</i>
          </button>
          <div className="qp-vb-r">
            <button className="qp-ib" type="button" onClick={() => setFs((f) => Math.max(22, f - 2))} aria-label="Smaller text">{Icon.minus}</button>
            <button className="qp-ib" type="button" onClick={() => setFs((f) => Math.min(44, f + 2))} aria-label="Larger text">{Icon.plus}</button>
            <button className="qp-dbtn" type="button" aria-expanded={dockOpen} onClick={() => setDockOpen((o) => !o)}>{Icon.sliders}<span>Display</span><small>{style.label}{style.script === 'indopak' ? ` ${style.detail}` : ''} · {riw.label}</small></button>
            <div className={`qp-dock${dockOpen ? ' open' : ''}`} role="dialog" aria-label="Display options">
              <div className="grp"><span className="lbl">Muṣḥaf style</span>
                <div className="qp-seg">{STYLES.map((s) => <button key={s.id} type="button" className={s.id === styleId ? 'on' : ''} onClick={() => { setStyleId(s.id); setSub(0) }}>{s.label}<small>{s.detail}</small></button>)}</div>
              </div>
              <div className="grp"><span className="lbl">Riwāyah</span>
                <div className="qp-seg">{RIWAYAT.map((r) => <button key={r.id} type="button" className={r.id === riwayah ? 'on' : ''} onClick={() => { setRiwayah(r.id); setSub(0) }}>{r.label}<small>{r.detail}</small></button>)}</div>
              </div>
              <div className="qp-dock-f"><span>Riwāyāt other than Ḥafṣ come from the Quran Complex editions, surah by surah.</span><Link className="wh-btn wh-btn-glass" to={`/quran?surah=${surah}`}>Exit Read Mode</Link></div>
            </div>
          </div>
        </div>

        {error && <p className="qp-status err">{error}</p>}

        {view === 'book' && (
          <div className="qp-book">
            <div className="qp-spread">
              {madinah
                ? [renderPage(spreadRows[0], spreadStart, 'r', spreadLines[0]), renderPage(spreadRows[1], spreadStart + 1, 'l', spreadLines[1])]
                : [renderPage(subPages[sub] || (surahRows ? [] : null), sub + 1, 'r'), renderPage(subPages[sub + 1] || (surahRows ? [] : null), subPages[sub + 1] ? sub + 2 : 0, 'l')]}
            </div>
            <button className="qp-turn l" type="button" onClick={() => turn(1)} disabled={!canNext} aria-label="Next page">‹</button>
            <button className="qp-turn r" type="button" onClick={() => turn(-1)} disabled={!canPrev} aria-label="Previous page">›</button>
          </div>
        )}

        {view === 'scroll' && (
          <div className="qp-scroll">
            <div className="qp-paper">
              {scrollSurahs.map((n, i) => {
                const rows = texts[`${textKey}:${n}`]
                return (
                  <section key={n} className="qp-sec" data-s={n}>
                    {i > 0 && <div className="qp-pb">۞</div>}
                    {rows ? <Flow rows={rows} center={n === 1} onTap={onTap} selected={shown} /> : <p className="qp-status">Loading {surahInfo(n).en}…</p>}
                  </section>
                )
              })}
              {scrollFrom + scrollCount <= 114 && <div className="qp-more" ref={moreRef}><button className="wh-btn wh-btn-glass" type="button" onClick={() => setScrollCount((c) => c + 1)}>Continue to {surahInfo(scrollFrom + scrollCount).en} ↓</button></div>}
            </div>
          </div>
        )}
        <QuranCredits />
      </div>
    </WahaPage>
  )
}
