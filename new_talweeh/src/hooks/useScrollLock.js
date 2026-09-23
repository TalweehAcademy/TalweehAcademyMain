import { useEffect } from 'react'

// Stops the page behind an open menu, sheet or dialog from scrolling. Counted, so overlapping
// overlays (a sheet that opens a picker) release the page only when the last one closes.
let locks = 0
let saved = null

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined
    const html = document.documentElement, body = document.body
    if (locks++ === 0) {
      saved = { html: html.style.overflow, body: body.style.overflow, ob: html.style.overscrollBehavior }
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      html.style.overscrollBehavior = 'none'
    }
    return () => {
      if (--locks === 0 && saved) {
        html.style.overflow = saved.html
        body.style.overflow = saved.body
        html.style.overscrollBehavior = saved.ob
        saved = null
      }
    }
  }, [active])
}
