/* eslint-disable react/prop-types */
// Recitation from an āyah without leaving the page (Read Mode's "Listen"): a bar along the foot of the screen with the
// reciter, play/pause, "Keep going" (on: carries on āyah after āyah and into the next sūrah; off: stops at the end of
// the āyah) and a link to the full Listen page. Same reciters, audio and āyah timings as Listen (MP3Quran), and the
// same remembered reciter. The page calls prepare(sūrah) when an āyah is tapped and play(sūrah, āyah) from the Listen
// button itself, so the audio starts inside the tap, as phones require. Styles: quran-pages-v1.css (qp-aplay).
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { audioUrl, getReciters, getTimings, surahInfo } from './quranData'
import { Icon, useEscape } from './QuranUI'

const RECITER_KEY = 'talweeh-listen-reciter' // shared with the Listen page
// MP3Quran names each reciter's riwāyah in Arabic ("حفص عن عاصم").
const RIWAYAH_AR = { hafs: 'حفص', warsh: 'ورش', qalun: 'قالون', shubah: 'شعبة', susi: 'السوسي' }
const POS_KEY = 'talweeh-ayah-player-pos'
const savedPos = () => { try { const p = JSON.parse(localStorage.getItem(POS_KEY)); return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 } } catch { return { x: 0, y: 0 } } }
const savedReciter = () => { try { return Number(localStorage.getItem(RECITER_KEY)) || 0 } catch { return 0 } }
const recName = (r) => (r ? r.nameEn || r.nameAr : '')
const STYLE_LABEL = { Murattal: 'Murattal', Mujawwad: 'Mujawwad', Muallim: 'Muʿallim' }
// Name search as on the Listen page: English without the article or doubled letters, Arabic without vowel marks.
const foldEn = (t) => String(t).toLowerCase().replace(/\b(al|ar|as|ash|an|ad|at|az)-/g, '').replace(/[^a-z ]/g, '').replace(/(.)\1+/g, '$1').replace(/y\b/g, 'i')
const foldAr = (t) => String(t).replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/(^|\s)ال/g, '$1')
const initial = (ar) => (String(ar).replace(/^(عبد|أبو|محمد)\s+/, '').trim()[0] || 'ق')
// The best-known reciters, listed first.
const WELL_KNOWN = /alafas|husar|minshawi|abdulbasit|sudais|shuraim|muaiql|ghamdi|yaser al-dosari|ali jaber|shatri|qatami/i

// The reciter list behind the bar's reciter button: a panel above the bar (a sheet on phones) with a search, the
// recitation styles, the best-known reciters first and then everyone, each with their Arabic name.
function ReciterPicker({ choices, current, onPick, onClose, place }) {
  const [q, setQ] = useState('')
  const [style, setStyle] = useState('')
  const inputRef = useRef(null)
  useEscape(true, onClose)
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }) }, [])
  // A click anywhere else closes it (the bar can be moved, so the list has no backdrop of its own).
  useEffect(() => {
    const away = (e) => { if (!e.target.closest('.qp-rp,.qp-aplay .rc')) onClose() }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [onClose])
  const list = useMemo(() => {
    const t = q.trim(), ar = /[\u0600-\u06FF]/.test(t)
    return choices.filter((r) => (!style || r.style === style) && (!t || (ar ? foldAr(r.nameAr).includes(foldAr(t).trim()) : foldEn(`${r.nameEn} ${r.moshaf}`).includes(foldEn(t).trim()))))
  }, [choices, q, style])
  const known = q.trim() || style ? [] : list.filter((r) => WELL_KNOWN.test(r.nameEn))
  const row = (r) => (
    <li key={r.id}>
      <button type="button" className={r.id === current?.id ? 'on' : ''} onClick={() => onPick(r.id)} aria-pressed={r.id === current?.id}>
        <span className="av" aria-hidden="true">{initial(r.nameAr)}</span>
        <span className="nm"><strong>{r.nameEn || r.nameAr}</strong><small>{STYLE_LABEL[r.style] || r.style}{r.moshaf && !/murattal|mujawwad|mo.?lim/i.test(r.moshaf) ? ` · ${r.moshaf}` : ''}</small></span>
        <span className="ar" lang="ar" dir="rtl">{r.nameAr}</span>
        {r.id === current?.id && <span className="ck" aria-label="Selected">✓</span>}
      </button>
    </li>
  )
  return (
    <>
      <div className={`qp-rp ${place.side}`} role="dialog" aria-label="Choose a reciter" style={{ maxHeight: place.max }}>
        <div className="qp-rp-h"><strong>Choose a reciter</strong><button type="button" className="x" onClick={onClose} aria-label="Close">{Icon.close}</button></div>
        <label className="qp-search">{Icon.search}<input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. Husary or المنشاوي" aria-label="Search reciters" /></label>
        <div className="qp-seg">{[['', 'All'], ['Murattal', 'Murattal'], ['Mujawwad', 'Mujawwad'], ['Muallim', 'Muʿallim']].map(([v, l]) => <button key={l} type="button" className={style === v ? 'on' : ''} onClick={() => setStyle(v)}>{l}</button>)}</div>
        <div className="qp-rp-list">
          {known.length > 0 && <><p className="lbl">Well known</p><ul>{known.map(row)}</ul></>}
          <p className="lbl">{q.trim() || style ? `${list.length} reciter${list.length === 1 ? '' : 's'}` : `All reciters · ${list.length}`}</p>
          {list.length ? <ul>{list.map(row)}</ul> : <p className="none">No reciter matches “{q.trim()}”. Try part of a name, or search in Arabic.</p>}
        </div>
      </div>
    </>
  )
}

export const AyahPlayer = forwardRef(function AyahPlayer({ riwayah = 'hafs', onAyah, onClose }, ref) {
  const audioRef = useRef(null)
  const [reciters, setReciters] = useState([])
  const [readId, setReadId] = useState(savedReciter)
  const [at, setAt] = useState(null) // { s, a } now playing (null: bar hidden)
  const [playing, setPlaying] = useState(false)
  const [keepGoing, setKeepGoing] = useState(true)
  const [msg, setMsg] = useState('')
  const [picking, setPicking] = useState(false)
  // The list opens on whichever side of the bar has more room, and no taller than that room.
  const [place, setPlace] = useState({ side: 'up', max: 560 })
  const openPicker = () => {
    const r = barRef.current?.getBoundingClientRect()
    if (r) {
      const up = r.top - 16, down = window.innerHeight - r.bottom - 16
      const side = up >= Math.min(560, down) ? 'up' : 'down'
      setPlace({ side, max: Math.max(220, Math.min(560, (side === 'up' ? up : down) - 10)) })
    }
    setPicking(true)
  }
  const closePicker = useCallback(() => setPicking(false), [])
  // Moved by its grip: an offset from its place at the foot of the screen, kept on screen and remembered.
  const barRef = useRef(null)
  const [pos, setPos] = useState(savedPos)
  const drag = useRef(null)
  const [dragging, setDragging] = useState(false)
  const clampPos = useCallback((p) => {
    const el = barRef.current
    if (!el) return p
    const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight
    const bottom = parseFloat(getComputedStyle(el).bottom) || 0
    const maxX = Math.max(0, (vw - w) / 2 - 8)
    return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-(vh - h - bottom - 8), Math.min(0, p.y)) }
  }, [])
  const onGripDown = (e) => {
    e.preventDefault()
    drag.current = { x: e.clientX, y: e.clientY, from: pos }
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onGripMove = (e) => {
    const d = drag.current
    if (d) setPos(clampPos({ x: d.from.x + e.clientX - d.x, y: d.from.y + e.clientY - d.y }))
  }
  const onGripUp = () => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    setPos((p) => { try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* private mode */ } return p })
  }
  // A narrower window brings it back on screen.
  useEffect(() => { const r = () => setPos((p) => clampPos(p)); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [clampPos])
  useEffect(() => { if (at) setPos((p) => clampPos(p)) }, [at, clampPos])
  const timings = useRef(new Map()) // `${reciter}:${sūrah}` → [{ ayah, from, to }], once loaded
  const live = useRef({ s: 0, a: 0, reciter: null, stop: null })

  const loadReciters = useCallback(() => getReciters().then((list) => { setReciters(list); return list }), [])
  // The reciter to use: the remembered one if it reads the page's riwāyah, else Alafasy or the first who does.
  const pick = useCallback((list, id = readId) => {
    const word = RIWAYAH_AR[riwayah] || RIWAYAH_AR.hafs
    const fits = (r) => r.rewaya.includes(word)
    return list.find((r) => r.id === id && fits(r)) || list.find((r) => fits(r) && /alafas/i.test(r.nameEn)) || list.find(fits) || list.find((r) => r.id === id) || list[0]
  }, [readId, riwayah])
  const loadTimings = useCallback((reciter, s) => {
    const key = `${reciter.id}:${s}`
    if (timings.current.has(key)) return Promise.resolve(timings.current.get(key))
    return getTimings(reciter.id, s).then((rows) => { timings.current.set(key, rows); return rows })
  }, [])

  // Starts sūrah:āyah. Called from the tap itself: everything it needs was loaded by prepare(), and the start time goes
  // in the address (#t=), so play() runs before anything is awaited.
  const start = useCallback((s, a, reciter) => {
    const audio = audioRef.current
    if (!audio || !reciter) return
    const rows = timings.current.get(`${reciter.id}:${s}`)
    const row = rows?.find((r) => r.ayah === a)
    const from = a === 1 ? 0 : row?.from || 0 // āyah 1 starts with the basmalah
    live.current = { s, a, reciter, stop: row?.to ?? null }
    setAt({ s, a }); setMsg('')
    audio.src = `${audioUrl(reciter, s)}#t=${from.toFixed(2)}`
    audio.play().catch(() => setMsg('The recitation could not start. Press play, or try another reciter.'))
    onAyah?.(s, a)
    if (!rows) loadTimings(reciter, s).then((t) => { // no timings yet: seek once they come
      const r = t.find((x) => x.ayah === a)
      if (r && live.current.s === s && live.current.a === a && a !== 1) audio.currentTime = r.from
      if (r) live.current.stop = r.to
    }).catch(() => {})
  }, [loadTimings, onAyah])

  useImperativeHandle(ref, () => ({
    prepare(s) {
      (reciters.length ? Promise.resolve(reciters) : loadReciters()).then((list) => { const r = pick(list); if (r) loadTimings(r, s).catch(() => {}) }).catch(() => {})
    },
    play(s, a) {
      const r = reciters.length ? pick(reciters) : null
      if (r) { start(s, a, r); return }
      setAt({ s, a }); setMsg('Loading the reciters…')
      loadReciters().then((list) => start(s, a, pick(list))).catch(() => setMsg('The reciters could not be loaded. Check your connection.'))
    },
  }), [reciters, loadReciters, pick, loadTimings, start])

  // Follows the voice āyah by āyah; without "Keep going" it stops at the end of the āyah being recited.
  const onTime = () => {
    const audio = audioRef.current, cur = live.current
    const rows = cur.reciter && timings.current.get(`${cur.reciter.id}:${cur.s}`)
    if (!rows?.length) return
    const t = audio.currentTime
    if (!keepGoing && cur.stop != null && t >= cur.stop - 0.05) { audio.pause(); return }
    const row = rows.find((r) => t >= r.from && t < r.to)
    // (each new āyah's end becomes the stop, so turning Keep going off stops at the end of the āyah being recited)
    if (row && row.ayah !== cur.a) { cur.a = row.ayah; cur.stop = row.to; setAt({ s: cur.s, a: row.ayah }); onAyah?.(cur.s, row.ayah) }
  }
  const onEnded = () => {
    const cur = live.current
    if (keepGoing && cur.s < 114 && cur.reciter) loadTimings(cur.reciter, cur.s + 1).catch(() => []).then(() => start(cur.s + 1, 1, cur.reciter))
  }
  const toggle = () => {
    const audio = audioRef.current
    if (audio.paused) audio.play().catch(() => setMsg('The recitation could not start. Try another reciter.'))
    else audio.pause()
  }
  const changeReciter = (id) => {
    setPicking(false)
    if (id === live.current.reciter?.id) return
    setReadId(id)
    try { localStorage.setItem(RECITER_KEY, String(id)) } catch { /* private mode */ }
    const r = reciters.find((x) => x.id === id), cur = live.current
    if (r && cur.s) loadTimings(r, cur.s).catch(() => []).then(() => start(cur.s, cur.a, r))
  }
  const close = () => { audioRef.current?.pause(); setAt(null); setPlaying(false); setPicking(false); onClose?.() }
  useEffect(() => () => audioRef.current?.pause(), [])

  const reciter = live.current.reciter
  const word = RIWAYAH_AR[riwayah] || RIWAYAH_AR.hafs
  const choices = reciters.filter((r) => r.rewaya.includes(word))
  return (
    <div ref={barRef} className={`qp-aplay wh-glass${at ? ' on' : ''}${dragging ? ' dragging' : ''}`} role="region" aria-label="Recitation" aria-hidden={!at}
      style={{ '--dx': `${pos.x}px`, '--dy': `${pos.y}px` }}>
      <span className="grip" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}
        onDoubleClick={() => { setPos({ x: 0, y: 0 }); try { localStorage.removeItem(POS_KEY) } catch { /* private mode */ } }}
        role="separator" aria-label="Drag to move the player (double-click to put it back)" title="Drag to move · double-click to put it back"><i /><i /><i /><i /><i /><i /></span>
      <audio ref={audioRef} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={onTime} onEnded={onEnded}
        onError={() => at && setMsg('This reciter’s audio is unavailable here. Choose another reciter.')} />
      <button type="button" className="pp" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} disabled={!reciter}>{playing ? Icon.pause : Icon.play}</button>
      <div className="t">
        <strong>{at ? `${at.s}:${at.a} · ${surahInfo(at.s).en}` : ''}</strong>
        <small>{msg || (reciter ? `${recName(reciter)} · ${STYLE_LABEL[reciter.style] || reciter.style}` : '')}</small>
      </div>
      {choices.length > 1 && (
        <button type="button" className="rc" onClick={() => (picking ? setPicking(false) : openPicker())} aria-haspopup="dialog" aria-expanded={picking}>
          <span className="av" aria-hidden="true">{initial(reciter?.nameAr)}</span><span className="nm">{recName(reciter) || 'Reciter'}</span><svg className="cv" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      )}
      {picking && <ReciterPicker choices={choices} current={reciter} onPick={changeReciter} onClose={closePicker} place={place} />}
      <label className="kg"><input type="checkbox" checked={keepGoing} onChange={(e) => setKeepGoing(e.target.checked)} /> Keep going</label>
      {at && <Link className="lp" to={`/quran/listen?surah=${at.s}&ayah=${at.a}${reciter ? `&reciter=${reciter.id}` : ''}`} onClick={() => audioRef.current?.pause()}>Listen page</Link>}
      <button type="button" className="x" onClick={close} aria-label="Stop and close">{Icon.close}</button>
    </div>
  )
})
