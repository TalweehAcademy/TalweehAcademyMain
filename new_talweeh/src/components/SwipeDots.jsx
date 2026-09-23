/* eslint-disable react/prop-types */
// Dots under a sideways-swiping row (phones): shows which card is in view; tapping a dot scrolls to it.
import { useEffect, useState } from 'react'

export default function SwipeDots({ targetRef, count }) {
  const [on, setOn] = useState(0)
  useEffect(() => {
    const el = targetRef.current
    if (!el) return undefined
    const update = () => {
      const kids = [...el.children]
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0, dist = Infinity
      kids.forEach((k, i) => { const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i } })
      setOn(best)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [targetRef, count])
  if (count < 2) return null
  const go = (i) => { const el = targetRef.current, k = el?.children[i]; if (k) el.scrollTo({ left: k.offsetLeft - (el.clientWidth - k.offsetWidth) / 2, behavior: 'smooth' }) }
  return (
    <div className="wh-sdots" role="tablist" aria-label="Swipe for more">
      {Array.from({ length: count }, (_, i) => <button key={i} type="button" role="tab" aria-selected={i === on} aria-label={`Item ${i + 1} of ${count}`} className={i === on ? 'on' : ''} onClick={() => go(i)} />)}
    </div>
  )
}
