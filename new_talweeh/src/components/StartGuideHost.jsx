/* eslint-disable react/prop-types */
// "Find your starting point" as a popup over the page the visitor is on: a centred panel on desktop, a sheet that
// slides up on a phone (drag the handle down, tap outside, × or Esc to close). StartLink opens it; a new tab or a
// shared result link still goes to the /start page. The guide is loaded the first time it is wanted (or hovered).
// It renders inside .wh-home, like the study list, so the page's colours apply. Frame styles: home-waha-v1.css (sg-pop).
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useScrollLock } from '../hooks/useScrollLock'

const OPEN_EVENT = 'talweeh:start-guide'
const load = () => import('../pages/start-guide')
const Guide = lazy(() => load().then((m) => ({ default: m.StartGuide })))

export function StartLink({ children, onClick, ...rest }) {
  const open = (e) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return
    e.preventDefault()
    window.dispatchEvent(new Event(OPEN_EVENT))
  }
  return <Link to="/start" {...rest} onClick={open} onMouseEnter={load} onFocus={load}>{children}</Link>
}

export function StartGuideHost() {
  const [on, setOn] = useState(false)
  const [drag, setDrag] = useState(0)
  const startY = useRef(null)
  const panelRef = useRef(null)
  const back = useRef(null)
  const { pathname } = useLocation()
  useScrollLock(on)
  useEffect(() => {
    const open = () => { back.current = document.activeElement; setOn(true) }
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [])
  // Following a link in the result (a course, the Roadmap) closes the popup.
  useEffect(() => setOn(false), [pathname])
  useEffect(() => {
    if (!on) return undefined
    panelRef.current?.focus()
    const key = (e) => { if (e.key === 'Escape') setOn(false) }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); back.current?.focus?.() }
  }, [on])
  if (!on) return null
  const close = () => setOn(false)
  const grab = {
    onTouchStart: (e) => { startY.current = e.touches[0].clientY },
    onTouchMove: (e) => { if (startY.current != null) setDrag(Math.max(0, e.touches[0].clientY - startY.current)) },
    onTouchEnd: () => { if (drag > 90) close(); setDrag(0); startY.current = null },
  }
  return (
    <div className="sg-pop">
      <div className="sg-pop-dim" onClick={close} aria-hidden="true" />
      <div className="sg-pop-panel wh-glass" role="dialog" aria-modal="true" aria-label="Find your starting point" tabIndex={-1} ref={panelRef}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}>
        <div className="sg-pop-head" {...grab}>
          <span className="sg-pop-grab" aria-hidden="true" />
          <div><span className="cw-kicker">Not sure where to begin?</span><strong>Find your starting point</strong></div>
          <button type="button" className="sg-pop-x" onClick={close} aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>
        <Suspense fallback={<div className="sg-pop-wait" aria-busy="true" />}><Guide popup /></Suspense>
      </div>
    </div>
  )
}
