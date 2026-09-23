/* eslint-disable react/prop-types */
// Small pieces shared by the Wāḥa Qurʾān pages (read / study / listen).
import { useCallback, useEffect, useRef, useState } from 'react'
import { QURAN_SURAHS, QURAN_JUZ_STARTS } from '../data/quranIndex'
import { arNum, surahInfo } from './quranData'

export const Icon = {
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  close: <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  prev: <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>,
  next: <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>,
  book: <svg viewBox="0 0 24 24"><path d="M3 5.5C5.7 4.8 8 5.3 11 7v12c-3-1.7-5.3-2.2-8-1.5zM21 5.5c-2.7-.7-5-.2-8 1.5v12c3-1.7 5.3-2.2 8-1.5z" /></svg>,
  scroll: <svg viewBox="0 0 24 24"><path d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h4" /></svg>,
  sliders: <svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>,
  minus: <svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg>,
  plus: <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>,
  play: <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>,
  pause: <svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  skipPrev: <svg viewBox="0 0 24 24"><path d="M18 6 9 12l9 6zM6 6v12" /></svg>,
  skipNext: <svg viewBox="0 0 24 24"><path d="m6 6 9 6-9 6zM18 6v12" /></svg>,
  shrink: <svg viewBox="0 0 24 24"><path d="M14 10l6-6M20 9V4h-5M10 14l-6 6M4 15v5h5" /></svg>,
  enlarge: <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" /></svg>,
  restore: <svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 20v-5h5M4 4l5 5M20 20l-5-5" /></svg>,
}

export function AyahMarker({ n }) {
  return <span className="qp-am" aria-label={`Āyah ${n}`}><span>{arNum(n)}</span></span>
}

export function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return undefined
    const key = (e) => { if (e.key === 'Escape') onEscape() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [active, onEscape])
}

// Modal "Go to" picker: surahs (searchable, Meccan/Medinan) and optionally juz.
export function SurahPicker({ open, onClose, onPick, current, withJuz = true, badge, title = 'Choose a surah' }) {
  const [tab, setTab] = useState('surah')
  const [rev, setRev] = useState('')
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  useEscape(open, onClose)
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 60) }, [open])
  const t = q.trim().toLowerCase()
  const ref = t.match(/^(\d{1,3})\s*:\s*(\d{1,3})$/)
  const surahs = QURAN_SURAHS.filter((s) => (!rev || s[5] === rev) && (!t || (ref ? String(s[0]) === ref[1] : String(s[0]) === t || s[2].toLowerCase().includes(t) || s[3].toLowerCase().includes(t) || s[1].includes(q.trim()))))
  const juz = QURAN_JUZ_STARTS.filter(([j, c]) => !t || String(j) === t || surahInfo(c).en.toLowerCase().includes(t))
  return (
    <>
      <div className={`qp-ov${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div className={`qp-gp${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}>
        <div className="qp-gp-h"><div><span className="qp-kicker">Go to</span><h3>{title}</h3></div><button className="qp-ib" type="button" onClick={onClose} aria-label="Close">{Icon.close}</button></div>
        <div className="qp-gp-tools">
          {withJuz && <div className="qp-seg"><button type="button" className={tab === 'surah' ? 'on' : ''} onClick={() => setTab('surah')}>Surah</button><button type="button" className={tab === 'juz' ? 'on' : ''} onClick={() => setTab('juz')}>Juz</button></div>}
          {tab === 'surah' && <div className="qp-seg">{[['', 'All'], ['Meccan', 'Meccan'], ['Medinan', 'Medinan']].map(([v, l]) => <button key={l} type="button" className={rev === v ? 'on' : ''} onClick={() => setRev(v)}>{l}</button>)}</div>}
          <label className="qp-search">{Icon.search}<input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, meaning, number, or 67:1" aria-label="Search surahs" /></label>
        </div>
        <div className="qp-gp-grid">
          {tab === 'surah' && surahs.map((s) => (
            <button key={s[0]} type="button" className={`qp-gs${s[0] === current ? ' on' : ''}`} tabIndex={open ? 0 : -1}
              onClick={() => onPick({ surah: s[0], ayah: ref && String(s[0]) === ref[1] ? Number(ref[2]) : 1 })}>
              <span className="qp-dia">{s[0]}</span>
              <span style={{ minWidth: 0 }}><span className="t"><strong>{s[2]}{badge?.(s[0]) && <span className="badge">{badge(s[0])}</span>}</strong><span className="qp-ar">{s[1]}</span></span><small>{s[3]} · {s[4]} āyāt · {s[5] === 'Meccan' ? 'Makkī' : 'Madanī'}</small></span>
            </button>
          ))}
          {tab === 'juz' && juz.map(([j, c, a]) => (
            <button key={j} type="button" className="qp-gj" tabIndex={open ? 0 : -1} onClick={() => onPick({ surah: c, ayah: a, juz: j })}>
              <small>Juz</small><b>{j}<span>{surahInfo(c).ar}</span></b><small>Starts at {surahInfo(c).en} {c}:{a}</small>
            </button>
          ))}
          {((tab === 'surah' && !surahs.length) || (tab === 'juz' && !juz.length)) && <p className="qp-gp-note">Nothing matches.</p>}
        </div>
      </div>
    </>
  )
}

// A single floating hover card: show(content, anchorEl) / hide().
export function useHoverCard() {
  const [card, setCard] = useState(null)
  const cardRef = useRef(null)
  const timer = useRef(null)
  const show = useCallback((content, el) => { clearTimeout(timer.current); setCard({ content, el }) }, [])
  const hide = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(() => setCard(null), 150) }, [])
  const keep = useCallback(() => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!card || !cardRef.current) return
    const r = card.el.getBoundingClientRect(), c = cardRef.current, w = c.offsetWidth, h = c.offsetHeight
    let top = r.bottom + 10
    if (top + h > window.innerHeight - 10) top = r.top - h - 10
    c.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px'
    c.style.top = Math.max(10, top) + 'px'
  }, [card])
  useEffect(() => {
    const off = () => setCard(null)
    window.addEventListener('scroll', off, { passive: true })
    return () => window.removeEventListener('scroll', off)
  }, [])
  const element = <div ref={cardRef} className={`qp-hc${card ? ' on' : ''}`} role="tooltip" onMouseEnter={keep} onMouseLeave={hide}>{card?.content}</div>
  return { element, show, hide }
}
