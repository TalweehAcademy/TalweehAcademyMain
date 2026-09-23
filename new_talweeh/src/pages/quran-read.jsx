/* eslint-disable react/prop-types */
// Read Mode ("Muṣḥaf", from mockups/quran-waha-mushaf.html) at /quran/read.
// Book view: Madinah + Ḥafṣ shows the real 604-page muṣḥaf layout (api.alquran.cloud/page);
// IndoPak styles and the other riwāyāt come per surah and are paginated to the chosen line count.
// Scroll view: one continuous column, surah after surah.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { QURAN_JUZ_STARTS } from '../data/quranIndex'
import { RIWAYAT, STYLES, MUSHAF_PAGES, arNum, getMushafPage, getSurahText, getTranslation, pageOf, surahInfo } from '../quran/quranData'
import { AyahMarker, Icon, SurahPicker, useEscape } from '../quran/QuranUI'
import '../quran-pages-v1.css'

const PREFS_KEY = 'talweeh-read-prefs'
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {} } catch { return {} } }
const juzOf = (surah, ayah = 1) => QURAN_JUZ_STARTS.filter(([, s, a]) => s < surah || (s === surah && a <= ayah)).pop()?.[0] || 1
const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'

function SurahHead({ s }) {
  return (
    <>
      <div className="qp-cart"><span>سُورَةُ {surahInfo(s).ar}</span></div>
      {s !== 1 && s !== 9 && <div className="qp-bism">{BASMALAH}</div>}
    </>
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
  const madinah = style.script === 'uthmani' && riwayah === 'hafs'

  const [surah, setSurah] = useState(() => Math.min(114, Math.max(1, Number(params.get('surah')) || 1)))
  // 0 = not known yet: resolved from ?surah=&ayah= below.
  const [page, setPage] = useState(() => { const p = Number(params.get('page')); return p ? Math.min(MUSHAF_PAGES, Math.max(1, p)) : 0 })
  const [sub, setSub] = useState(0) // page index within a surah, for non-Madinah book view
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const [pop, setPop] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ view, style: styleId, riwayah, fs })) } catch { /* private mode */ } }, [view, styleId, riwayah, fs])

  // First open with ?surah=&ayah= in Madinah book view: find its page.
  const wantAyah = Number(params.get('ayah')) || 1
  useEffect(() => {
    if (page) return
    pageOf(surah, wantAyah).then(setPage).catch(() => setPage(1))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back to Madinah pages from another style or from scroll: open at the current surah.
  const enteredBookRef = useRef(false)
  useEffect(() => {
    if (!enteredBookRef.current) { enteredBookRef.current = true; return }
    if (madinah && view === 'book') pageOf(surah).then(setPage).catch(() => {})
  }, [madinah, view]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── book view, Madinah: two real pages ── */
  const spreadStart = page ? (page % 2 ? page : page - 1) : 0
  const [spreadRows, setSpreadRows] = useState([null, null])
  useEffect(() => {
    if (!madinah || view !== 'book' || !spreadStart) return undefined
    let live = true
    setError('')
    Promise.all([getMushafPage(spreadStart), spreadStart + 1 <= MUSHAF_PAGES ? getMushafPage(spreadStart + 1) : Promise.resolve([])])
      .then((pair) => {
        if (!live) return
        setSpreadRows(pair)
        // Keep the surah the reader asked for if it's on this spread; otherwise follow the page.
        const rows = [...pair[0], ...pair[1]]
        setSurah((cur) => (rows.some((r) => r.s === cur) ? cur : rows[0]?.s || cur))
      })
      .catch(() => live && setError('This page could not be loaded. Check your connection and try again.'))
    return () => { live = false }
  }, [madinah, view, spreadStart])

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
  const canNext = madinah && view === 'book' ? spreadStart + 2 <= MUSHAF_PAGES : (sub + 2 < surahSubCount || surah < 114)
  const turn = useCallback((d) => {
    setPop(null)
    if (madinah && view === 'book') { setPage((p) => { const s = p % 2 ? p : p - 1; return Math.min(MUSHAF_PAGES - 1, Math.max(1, s + d * 2)) }); return }
    if (d > 0) { if (sub + 2 < surahSubCount) setSub(sub + 2); else if (surah < 114) { setSurah(surah + 1); setSub(0) } }
    else if (sub > 0) setSub(Math.max(0, sub - 2))
    else if (surah > 1) {
      const prev = surah - 1, rows = texts[`${textKey}:${prev}`]
      setSurah(prev); setSub(rows ? Math.max(0, (paginate(rows, style.lines, fs).length - 1) & ~1) : 0)
    }
  }, [madinah, view, sub, surahSubCount, surah, texts, textKey, style.lines, fs])
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
    if (madinah) setPage(await pageOf(s, ayah).catch(() => 1))
  }

  /* ── tap an āyah ── */
  const onTap = (e, r) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPop({ k: `${r.s}:${r.a}`, s: r.s, a: r.a, tr: '', x: Math.max(12, Math.min(window.innerWidth - 372, rect.left + rect.width / 2 - 180)), y: Math.min(window.innerHeight - 190, rect.bottom + 8) })
    getTranslation(r.s).then((t) => setPop((p) => (p && p.k === `${r.s}:${r.a}` ? { ...p, tr: t[r.a - 1] || '' } : p))).catch(() => {})
  }
  useEffect(() => {
    const close = () => setPop(null)
    document.addEventListener('click', close)
    window.addEventListener('scroll', close, { passive: true })
    return () => { document.removeEventListener('click', close); window.removeEventListener('scroll', close) }
  }, [])
  const closeDock = useCallback(() => setDockOpen(false), [])
  useEscape(dockOpen, closeDock)
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
    ? `Juz ${firstRow?.juz || juzOf(locSurah.n)} · Page ${spreadStart || '…'}`
    : view === 'book' ? `Juz ${juzOf(surah)} · Page ${Math.min(sub + 1, surahSubCount || 1)} of ${surahSubCount || '…'}` : `Juz ${juzOf(surah)} · ${locSurah.ayahs} āyāt`
  const riw = RIWAYAT.find((r) => r.id === riwayah)

  const renderPage = (rows, no, key) => {
    if (!rows) return <article key={key} className="qp-page"><span className="frame" /><p className="qp-status">Loading…</p></article>
    if (!rows.length) return <article key={key} className="qp-page blank"><span className="frame" /></article>
    return (
      <article key={key} className="qp-page">
        <span className="frame" />
        <Flow rows={rows} center={madinah && no <= 2} onTap={onTap} selected={pop?.k} />
        <div className="qp-pno">{no ? arNum(no) : ''}</div>
      </article>
    )
  }

  return (
    <WahaPage className="qp" overlays={<>
      <SurahPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={goTo} current={surah} title="Choose where to read" />
      <div className={`qp-vpop${pop ? ' on' : ''}`} style={pop ? { left: pop.x, top: pop.y } : undefined} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Āyah">
        {pop && <>
          <small>{pop.k} · {surahInfo(pop.s).en}</small>
          <p>{pop.tr || 'Loading translation…'}</p>
          <div className="row">
            <Link className="wh-btn wh-btn-g" to={`/quran/listen?surah=${pop.s}&ayah=${pop.a}`}>▶ Listen</Link>
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

        <div className="qp-viewbar wh-glass">
          <div className="qp-seg qp-vseg" role="group" aria-label="Reading view">
            <button type="button" className={view === 'book' ? 'on' : ''} onClick={() => setView('book')}>{Icon.book}<span>Muṣḥaf pages</span></button>
            <button type="button" className={view === 'scroll' ? 'on' : ''} onClick={() => setView('scroll')}>{Icon.scroll}<span>Scroll</span></button>
          </div>
          <button className="qp-loc" type="button" onClick={() => setPickerOpen(true)} aria-haspopup="dialog">
            <span className="d">{locSurah.n}</span><span><strong>{locSurah.en}</strong><small>{locSub}</small></span><span className="qp-ar">{locSurah.ar}</span><i>▾</i>
          </button>
          <div className="qp-vb-r">
            <button className="qp-ib" type="button" onClick={() => setFs((f) => Math.max(22, f - 2))} aria-label="Smaller text">{Icon.minus}</button>
            <button className="qp-ib" type="button" onClick={() => setFs((f) => Math.min(44, f + 2))} aria-label="Larger text">{Icon.plus}</button>
            <button className="qp-dbtn" type="button" aria-expanded={dockOpen} onClick={() => setDockOpen((o) => !o)}>{Icon.sliders}<span>Display</span><small>{style.label}{style.script === 'indopak' ? ` ${style.lines}` : ''} · {riw.label}</small></button>
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
                ? [renderPage(spreadRows[0], spreadStart, 'r'), renderPage(spreadRows[1], spreadStart + 1, 'l')]
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
                    {rows ? <Flow rows={rows} center={n === 1} onTap={onTap} selected={pop?.k} /> : <p className="qp-status">Loading {surahInfo(n).en}…</p>}
                  </section>
                )
              })}
              {scrollFrom + scrollCount <= 114 && <div className="qp-more" ref={moreRef}><button className="wh-btn wh-btn-glass" type="button" onClick={() => setScrollCount((c) => c + 1)}>Continue to {surahInfo(scrollFrom + scrollCount).en} ↓</button></div>}
            </div>
          </div>
        )}
      </div>
    </WahaPage>
  )
}
