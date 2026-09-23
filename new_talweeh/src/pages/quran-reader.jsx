/* eslint-disable react/prop-types */
// Reader ("Tilāwah", from mockups/quran-waha-reader.html) at /quran?surah=&ayah=.
// Glass tool bar, centred surah title, one card per āyah with word-by-word hover, and a floating
// player whose highlight follows the recitation. Browser-only: public Qurʾān providers via
// ../quran/quranData; settings and saved āyāt live in localStorage.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { QURAN_SURAHS } from '../data/quranIndex'
import { TRANSLATIONS, audioUrl, getReciters, getSurahText, getTimings, getTranslation, getWords, searchText, surahInfo } from '../quran/quranData'
import { hasStudy } from '../quran/studyData'
import { AyahMarker, Icon, SurahPicker, useEscape, useHoverCard } from '../quran/QuranUI'
import '../quran-pages-v1.css'

const PREFS_KEY = 'talweeh-reader-prefs'
// Same key and record shape as the previous reader, so saved āyāt carry over.
const BOOKMARKS_KEY = 'qmr-bookmarks-v1'
const RECITER_KEY = 'talweeh-listen-reciter'
const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback } catch { return fallback } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }
const parseRef = (q) => { const m = q.trim().match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/); return m && Number(m[1]) >= 1 && Number(m[1]) <= 114 ? { s: Number(m[1]), a: Number(m[2]) } : null }

const I = {
  mark: <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" /></svg>,
  link: <svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>,
  pen: <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>,
  listen: <svg viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H4zM17 14h3v6h-3z" /></svg>,
  copy: <svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>,
}

function Drawer({ open, side = 'right', title, kicker, onClose, children }) {
  useEscape(open, onClose)
  return (
    <>
      <div className={`qp-ov${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`qp-drawer${side === 'left' ? ' left' : ''}${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}>
        <div className="dh"><div>{kicker && <span className="qp-kicker">{kicker}</span>}<h3>{title}</h3></div><button className="qp-ib" type="button" onClick={onClose} aria-label="Close">{Icon.close}</button></div>
        {children}
      </aside>
    </>
  )
}

function SearchPanel({ open, onGo }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState({ status: 'idle', matches: [], total: 0 })
  const inputRef = useRef(null)
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80) }, [open])
  const ref = parseRef(q)
  const surahHits = !ref && q.trim() ? QURAN_SURAHS.filter((s) => String(s[0]) === q.trim() || s[2].toLowerCase().includes(q.trim().toLowerCase())).slice(0, 4) : []
  useEffect(() => {
    const t = q.trim()
    if (t.length < 3 || ref || /^\d+$/.test(t)) { setState({ status: 'idle', matches: [], total: 0 }); return undefined }
    let live = true
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, status: 'loading' }))
      searchText(t).then((r) => live && setState({ status: 'done', ...r })).catch(() => live && setState({ status: 'error', matches: [], total: 0 }))
    }, 350)
    return () => { live = false; clearTimeout(timer) }
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <label className="qp-search">{Icon.search}<input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Arabic, translation, or enter 2:255" aria-label="Search the Qurʾān" /></label>
      <p className="hint">Tip: enter a reference such as <b>2:255</b> to jump directly.</p>
      <div className="qp-res">
        {ref && <a href={`/quran?surah=${ref.s}&ayah=${ref.a}`} onClick={(e) => { e.preventDefault(); onGo(ref.s, ref.a) }}><small>{ref.s}:{ref.a} · {surahInfo(ref.s).en}</small><p>Jump directly to this āyah →</p></a>}
        {surahHits.map((s) => <a key={s[0]} href={`/quran?surah=${s[0]}`} onClick={(e) => { e.preventDefault(); onGo(s[0]) }}><small>Surah {s[0]}</small><p style={{ color: 'var(--c-head)', fontWeight: 700 }}>{s[2]} · {s[3]}</p></a>)}
        {state.status === 'loading' && <p className="hint">Searching…</p>}
        {state.matches.length > 0 && <p className="hint">{state.total} match{state.total === 1 ? '' : 'es'} in the text</p>}
        {state.matches.map((m) => (
          <a key={`${m.s}:${m.a}`} href={`/quran?surah=${m.s}&ayah=${m.a}`} onClick={(e) => { e.preventDefault(); onGo(m.s, m.a) }}>
            <small>{m.s}:{m.a} · {surahInfo(m.s).en}</small>{/[؀-ۿ]/.test(m.text) ? <span className="qp-qt">{m.text}</span> : <p>{m.text}</p>}
          </a>
        ))}
        {state.status === 'done' && !state.matches.length && !surahHits.length && <p className="hint">No matches for “{q.trim()}”.</p>}
        {state.status === 'error' && <p className="hint">Text search is unavailable right now. Try a reference like 2:255.</p>}
      </div>
    </>
  )
}

export default function QuranReaderPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const surah = Math.min(114, Math.max(1, Number(params.get('surah')) || 1))
  const target = Number(params.get('ayah')) || 0
  const info = surahInfo(surah)
  const [prefs, setPrefs] = useState(() => ({ translation: 'en.sahih', showTr: true, script: 'uthmani', ar: 34, tr: 16, ...read(PREFS_KEY, {}) }))
  const setPref = (k, v) => setPrefs((p) => { const n = { ...p, [k]: v }; write(PREFS_KEY, n); return n })
  const [text, setText] = useState({ status: 'loading', rows: [] })
  const [tr, setTr] = useState([])
  const [words, setWords] = useState(new Map())
  const [bookmarks, setBookmarks] = useState(() => { const b = read(BOOKMARKS_KEY, []); return Array.isArray(b) ? b : [] })
  const [panel, setPanel] = useState(null) // 'picker' | 'search' | 'saved' | 'settings'
  const [toast, setToast] = useState('')
  const hc = useHoverCard()
  const closePanel = useCallback(() => setPanel(null), [])

  useEffect(() => { write(BOOKMARKS_KEY, bookmarks) }, [bookmarks])
  // Remember the last surah for "Continue reading" on the Qurʾān home (same key the old reader used).
  useEffect(() => { const s = read('qmr-settings-v2', {}); write('qmr-settings-v2', { ...s, chapterNumber: surah }) }, [surah])

  useEffect(() => {
    let live = true
    setText({ status: 'loading', rows: [] })
    getSurahText(surah, { script: prefs.script }).then((rows) => live && setText({ status: 'ready', rows })).catch(() => live && setText({ status: 'error', rows: [] }))
    return () => { live = false }
  }, [surah, prefs.script])
  useEffect(() => {
    let live = true
    setTr([])
    getTranslation(surah, prefs.translation).then((t) => live && setTr(t)).catch(() => live && setTr([]))
    return () => { live = false }
  }, [surah, prefs.translation])
  useEffect(() => {
    let live = true
    setWords(new Map())
    getWords(surah).then((w) => live && setWords(w)).catch(() => {})
    return () => { live = false }
  }, [surah])

  useEffect(() => {
    if (!target || text.status !== 'ready') return
    setTimeout(() => document.getElementById(`ay-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250)
  }, [target, text.status])

  const go = (s, a) => { setPanel(null); setParams(a ? { surah: String(s), ayah: String(a) } : { surah: String(s) }); if (!a) window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const flash = (m) => { setToast(m); clearTimeout(flash.t); flash.t = setTimeout(() => setToast(''), 2200) }

  /* ── saved āyāt ── */
  const saved = useMemo(() => new Set(bookmarks.map((b) => b.verseKey)), [bookmarks])
  const toggleSave = (row) => {
    const k = `${surah}:${row.a}`
    if (saved.has(k)) { setBookmarks((b) => b.filter((x) => x.verseKey !== k)); flash(`${k} removed from Saved`); return }
    setBookmarks((b) => [{ verseKey: k, chapterNumber: surah, verseNumber: row.a, chapterName: info.en, arabic: row.text, translation: tr[row.a - 1] || '', translationId: prefs.translation, savedAt: Date.now() }, ...b])
    flash(`${k} saved`)
  }
  const copy = async (t, done) => { try { await navigator.clipboard.writeText(t); flash(done) } catch { flash('Copy is not available in this browser') } }

  /* ── audio ── */
  const audioRef = useRef(null)
  const [reciters, setReciters] = useState([])
  const [readId, setReadId] = useState(() => Number(localStorage.getItem(RECITER_KEY)) || 0)
  const [timings, setTimings] = useState([])
  const [player, setPlayer] = useState({ open: false, playing: false, cur: 0, t: 0, d: 0, msg: '' })
  const pending = useRef(null)
  useEffect(() => {
    getReciters().then((list) => { setReciters(list); setReadId((id) => (list.some((r) => r.id === id) ? id : (list.find((r) => /alafas/i.test(r.nameEn)) || list[0])?.id || 0)) }).catch(() => {})
  }, [])
  const reciter = reciters.find((r) => r.id === readId)
  useEffect(() => { if (readId) try { localStorage.setItem(RECITER_KEY, String(readId)) } catch { /* ignore */ } }, [readId])
  // Load the track lazily — only once the player has been opened.
  useEffect(() => {
    if (!reciter || !player.open) return undefined
    let live = true
    const a = audioRef.current
    const wasPlaying = !a.paused
    a.pause(); setTimings([])
    a.src = audioUrl(reciter, surah); a.load()
    getTimings(reciter.id, surah).then((t) => {
      if (!live) return
      setTimings(t)
      const want = pending.current ?? player.cur
      pending.current = null
      const hit = want && t.find((x) => x.ayah === want)
      if (hit) a.currentTime = hit.from
      if (want || wasPlaying) a.play().catch(() => {})
      setPlayer((p) => ({ ...p, msg: t.length ? '' : 'No āyah timings for this reciter here — the text won’t follow.' }))
    }).catch(() => live && setPlayer((p) => ({ ...p, msg: 'Āyah timings unavailable — the text won’t follow.' })))
    return () => { live = false }
  }, [reciter, surah, player.open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPlayer((p) => ({ ...p, cur: 0 })); audioRef.current?.pause() }, [surah])
  const playFrom = (n) => {
    const t = timings.find((x) => x.ayah === n)
    setPlayer((p) => ({ ...p, open: true, cur: n }))
    if (t && audioRef.current.src) { audioRef.current.currentTime = t.from; audioRef.current.play().catch(() => {}) } else pending.current = n
  }
  const onTime = () => {
    const a = audioRef.current
    let n = player.cur
    if (timings.length) { n = timings[0].ayah; for (const x of timings) { if (x.from <= a.currentTime + 0.05) n = x.ayah; else break } }
    setPlayer((p) => ({ ...p, t: a.currentTime, d: a.duration || 0, cur: n }))
  }
  const followRef = useRef(0)
  useEffect(() => {
    if (!player.playing || !player.cur || followRef.current === player.cur) return
    followRef.current = player.cur
    document.getElementById(`ay-${player.cur}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [player.cur, player.playing])

  /* ── word hover ── */
  const wordCard = (el, wd) => hc.show(<><div className="wd">{wd.ar}</div><div className="mn">{wd.en}</div><div className="tl">{wd.tl}</div></>, el)
  const useWords = prefs.script === 'uthmani'
  const trName = TRANSLATIONS.find((t) => t.edition === prefs.translation)?.name || 'Translation'

  return (
    <WahaPage className={`qp${prefs.showTr ? '' : ' hide-tr'}`} overlays={<>
      <SurahPicker open={panel === 'picker'} onClose={closePanel} onPick={({ surah: s, ayah }) => go(s, ayah > 1 ? ayah : 0)} current={surah} badge={(n) => (hasStudy(n) ? 'Study' : '')} />
      <Drawer open={panel === 'search'} side="left" kicker="Reader" title="Search Qurʾān" onClose={closePanel}><SearchPanel open={panel === 'search'} onGo={go} /></Drawer>
      <Drawer open={panel === 'saved'} side="left" kicker="Reader" title="Saved āyāt" onClose={closePanel}>
        <p className="hint" style={{ marginTop: 0 }}>Saved on this device. Use the bookmark on any āyah to keep it here.</p>
        <div className="qp-res">
          {bookmarks.length ? bookmarks.map((b) => (
            <div key={b.verseKey} className="item">
              <div className="row"><small>{b.verseKey} · {b.chapterName}</small><button type="button" className="rm" onClick={() => setBookmarks((x) => x.filter((y) => y.verseKey !== b.verseKey))}>Remove</button></div>
              <a href={`/quran?surah=${b.chapterNumber}&ayah=${b.verseNumber}`} onClick={(e) => { e.preventDefault(); go(b.chapterNumber, b.verseNumber) }} style={{ padding: 0, border: 0, background: 'none' }}>
                <span className="qp-qt">{b.arabic}</span>{b.translation && <p>{b.translation}</p>}
              </a>
            </div>
          )) : <p className="hint" style={{ textAlign: 'center', padding: '26px 0' }}>No saved āyāt yet.</p>}
        </div>
      </Drawer>
      <Drawer open={panel === 'settings'} kicker="Reader" title="Settings" onClose={closePanel}>
        <div className="qp-dg"><label htmlFor="qp-tr">Translation</label><select id="qp-tr" value={prefs.translation} onChange={(e) => setPref('translation', e.target.value)}>{TRANSLATIONS.map((t) => <option key={t.edition} value={t.edition}>{t.name}</option>)}</select></div>
        <div className="qp-dg inline"><span className="l">Show translation</span><button type="button" className={`qp-sw${prefs.showTr ? ' on' : ''}`} onClick={() => setPref('showTr', !prefs.showTr)} aria-pressed={prefs.showTr} aria-label="Show translation" /></div>
        <div className="qp-dg"><span className="l">Arabic script</span><div className="qp-seg"><button type="button" className={prefs.script === 'uthmani' ? 'on' : ''} onClick={() => setPref('script', 'uthmani')}>Uthmani</button><button type="button" className={prefs.script === 'indopak' ? 'on' : ''} onClick={() => setPref('script', 'indopak')}>IndoPak</button></div></div>
        <div className="qp-dg inline"><span className="l">Arabic size</span><div className="qp-step"><button type="button" onClick={() => setPref('ar', Math.max(24, prefs.ar - 2))}>–</button><span>{prefs.ar}</span><button type="button" onClick={() => setPref('ar', Math.min(54, prefs.ar + 2))}>+</button></div></div>
        <div className="qp-dg inline"><span className="l">Translation size</span><div className="qp-step"><button type="button" onClick={() => setPref('tr', Math.max(12, prefs.tr - 1))}>–</button><span>{prefs.tr}</span><button type="button" onClick={() => setPref('tr', Math.min(24, prefs.tr + 1))}>+</button></div></div>
        <div className="qp-dg"><label htmlFor="qp-rec">Reciter</label><select id="qp-rec" value={readId} onChange={(e) => setReadId(Number(e.target.value))}>{reciters.map((r) => <option key={r.id} value={r.id}>{r.nameEn || r.nameAr}{r.style !== 'Murattal' ? ` (${r.style})` : ''}</option>)}</select></div>
      </Drawer>
      <div className={`qp-toast${toast ? ' on' : ''}`} role="status">{toast}</div>
      <div className={`qp-player${player.open ? '' : ' off'}`} role="region" aria-label="Recitation player">
        <button className="pp" type="button" onClick={() => { const a = audioRef.current; if (a.paused) a.play().catch(() => {}); else a.pause() }} aria-label={player.playing ? 'Pause' : 'Play'}>{player.playing ? Icon.pause : Icon.play}</button>
        <div className="now">
          <small>Now reciting</small>
          <strong>{surah}:{player.cur || 1} · {reciter ? reciter.nameEn || reciter.nameAr : '…'}</strong>
          <div className="bar" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(), a = audioRef.current; if (a.duration) a.currentTime = ((e.clientX - r.left) / r.width) * a.duration }}><i style={{ width: player.d ? `${(player.t / player.d) * 100}%` : 0 }} /></div>
          {player.msg && <span className="msg">{player.msg}</span>}
        </div>
        <select value={readId} onChange={(e) => setReadId(Number(e.target.value))} aria-label="Reciter">{reciters.map((r) => <option key={r.id} value={r.id}>{r.nameEn || r.nameAr}{r.style !== 'Murattal' ? ` (${r.style})` : ''}</option>)}</select>
        <Link className="qp-ib" to={`/quran/listen?surah=${surah}&reciter=${readId}`} aria-label="Open in Listen" title="Open in Listen">{I.listen}</Link>
        <button className="qp-ib" type="button" onClick={() => { audioRef.current.pause(); setPlayer((p) => ({ ...p, open: false })) }} aria-label="Close player">{Icon.close}</button>
      </div>
      {hc.element}
    </>}>
      <audio ref={audioRef} preload="metadata" onTimeUpdate={onTime} onPlay={() => setPlayer((p) => ({ ...p, playing: true }))} onPause={() => setPlayer((p) => ({ ...p, playing: false }))}
        onEnded={() => setPlayer((p) => ({ ...p, playing: false }))} onError={() => player.open && setPlayer((p) => ({ ...p, msg: 'This reciter’s audio is unavailable here. Choose another reciter.' }))} />

      <div className="wh-wrap">
        <div className="qp-subbar">
          <div className="in wh-glass">
            <button className="qp-ssel" type="button" onClick={() => setPanel('picker')} aria-haspopup="dialog"><span className="d">{surah}</span><span><strong>{surah}. {info.en}</strong><small>Change surah</small></span><i>▾</i></button>
            <span className="sp" />
            <div className="qp-seg" role="group" aria-label="Qurʾān mode">
              <a className="on" href={`/quran?surah=${surah}`} onClick={(e) => e.preventDefault()} aria-current="page">Reader</a>
              <Link to={`/quran/study?surah=${surah}`}>Study</Link>
              <Link to={`/quran/read?surah=${surah}`}>Read Mode</Link>
            </div>
            <button className="qp-tb" type="button" onClick={() => setPanel('search')}>{Icon.search}<span className="lb">Search</span></button>
            <button className="qp-tb" type="button" onClick={() => setPanel('saved')}>{I.mark}<span className="lb">Saved</span>{bookmarks.length > 0 && <span className="ct">{bookmarks.length}</span>}</button>
            <button className="qp-ib" type="button" onClick={() => setPanel('settings')} aria-label="Reader settings">{Icon.sliders}</button>
          </div>
        </div>

        <section className="qp-shead">
          <div className="eyebrow">Surah {surah}</div>
          <div className="name">{info.ar}</div>
          <h1>{info.en}</h1>
          <div className="qp-schips"><span>{info.meaning}</span><span>{info.type === 'Meccan' ? 'Makkī' : 'Madanī'}</span><span>{info.ayahs} āyāt</span><span>{trName}</span></div>
          <div className="qp-sacts">
            <button className="wh-btn wh-btn-g" type="button" onClick={() => playFrom(1)}>{Icon.play}Play Surah</button>
            <Link className="wh-btn wh-btn-glass" to={`/quran/study?surah=${surah}`}>{I.pen}{hasStudy(surah) ? 'Sūrah Study' : 'Study mode'}</Link>
          </div>
          <div className="qp-snav">
            {surah > 1 ? <a href={`/quran?surah=${surah - 1}`} onClick={(e) => { e.preventDefault(); go(surah - 1) }}><span className="arr">‹</span><span><small>Previous</small><b>{surahInfo(surah - 1).en}</b></span></a> : <span className="none" />}
            {surah < 114 ? <a href={`/quran?surah=${surah + 1}`} onClick={(e) => { e.preventDefault(); go(surah + 1) }}><span><small>Next</small><b>{surahInfo(surah + 1).en}</b></span><span className="arr">›</span></a> : <span className="none" />}
          </div>
        </section>

        {surah !== 1 && surah !== 9 && <div className="qp-rbism">{BASMALAH}</div>}
        {text.status === 'loading' && <p className="qp-status">Loading {info.en}…</p>}
        {text.status === 'error' && <p className="qp-status err">This surah could not be loaded. Check your connection and try again.</p>}

        <ol className="qp-rlist" style={{ '--ar': `${prefs.ar}px`, '--trs': `${prefs.tr}px` }}>
          {text.rows.map((row) => {
            const k = `${surah}:${row.a}`, ws = useWords ? words.get(row.a) : null
            return (
              <li key={row.a} id={`ay-${row.a}`} className={`qp-rayah qp-card${player.open && player.cur === row.a ? ' active' : ''}${target === row.a ? ' target' : ''}`}>
                <span className="qp-vn">{k}</span>
                <div>
                  <p className="qp-qt">
                    {ws ? ws.map((wd, i) => <span key={i}><span className="qp-w" onMouseEnter={(e) => wordCard(e.currentTarget, wd)} onMouseLeave={hc.hide}>{wd.ar}</span>{' '}</span>) : row.text}{' '}<AyahMarker n={row.a} />
                  </p>
                  {tr[row.a - 1] && <p className="tr"><b>{row.a}.</b>{tr[row.a - 1]}</p>}
                  <div className="qp-ops">
                    <button type="button" className="qp-op" onClick={() => playFrom(row.a)} aria-label={`Play from ${k}`} title="Play from here">{Icon.play}</button>
                    <button type="button" className={`qp-op${saved.has(k) ? ' on' : ''}`} onClick={() => toggleSave(row)} aria-label={saved.has(k) ? `Remove ${k} from saved` : `Save ${k}`} title="Save">{I.mark}</button>
                    <button type="button" className="qp-op" onClick={() => copy(`${window.location.origin}/quran?surah=${surah}&ayah=${row.a}`, 'Link copied')} aria-label={`Copy link to ${k}`} title="Copy link">{I.link}</button>
                    <button type="button" className="qp-op" onClick={() => copy(`${row.text}\n${tr[row.a - 1] || ''}\n— Qurʾān ${k}`, 'Āyah copied')} aria-label={`Copy ${k}`} title="Copy text">{I.copy}</button>
                    <button type="button" className="qp-op" onClick={() => navigate(`/quran/study?surah=${surah}&ayah=${row.a}`)} title="Study this āyah">{I.pen}<span>Study</span></button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {text.status === 'ready' && surah < 114 && (
          <div className="qp-next wh-glass">
            <div><span className="qp-kicker">Continue reading</span><h3>Surah {surahInfo(surah + 1).en}</h3></div>
            <div className="qp-ar">{surahInfo(surah + 1).ar}</div>
            <button className="wh-btn wh-btn-g" type="button" onClick={() => go(surah + 1)}>Next surah →</button>
          </div>
        )}
      </div>
    </WahaPage>
  )
}
