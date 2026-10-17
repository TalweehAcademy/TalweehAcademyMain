import { useEffect } from 'react'

// Stops the page behind an open menu, sheet or dialog from scrolling. Counted, so overlapping
// overlays (a sheet that opens a picker) release the page only when the last one closes.
// Only <html> is locked: hiding overflow on <body> too turns it into its own scroll box, which
// unsticks the sticky header (an open phone menu jumped to the top of the page, out of sight).
let locks = 0
let saved = null

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined
    const html = document.documentElement
    if (locks++ === 0) {
      saved = { html: html.style.overflow, ob: html.style.overscrollBehavior }
      html.style.overflow = 'hidden'
      html.style.overscrollBehavior = 'none'
    }
    return () => {
      if (--locks === 0 && saved) {
        html.style.overflow = saved.html
        html.style.overscrollBehavior = saved.ob
        saved = null
      }
    }
  }, [active])
}
