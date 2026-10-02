/* eslint-disable react/prop-types */
// Cloudflare Turnstile before the payment session is created (the portal's /api/commerce/public-checkout checks the
// token). Usually invisible ("interaction-only"); it shows a box only when Cloudflare wants a click. Each token works
// once, so a new resetKey (a changed cart, email or code) asks for a fresh one.
import { useEffect, useRef, useState } from 'react'

const SCRIPT_ID = 'cloudflare-turnstile-api'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const turnstileSiteKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()

function loadScript() {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID)
    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile could not load')), { once: true })
  })
}

export default function TurnstileCheck({ onToken, resetKey, action = 'checkout' }) {
  const containerRef = useRef(null)
  const onTokenRef = useRef(onToken)
  const [failed, setFailed] = useState(false)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!turnstileSiteKey) return undefined
    let cancelled = false
    let widgetId = null
    setFailed(false)
    onTokenRef.current(null)
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          action,
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'timeout-callback': () => onTokenRef.current(null),
          'error-callback': () => { onTokenRef.current(null); setFailed(true) },
        })
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [resetKey, action])

  return (
    <>
      <div ref={containerRef} />
      {failed && <div className="ew-error" role="alert">The security check could not load. Refresh the page, or turn off any blocker for challenges.cloudflare.com.</div>}
    </>
  )
}
