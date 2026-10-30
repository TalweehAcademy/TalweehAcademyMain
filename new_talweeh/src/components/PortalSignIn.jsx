/* eslint-disable react/prop-types */
// "Sign in" in the top bar's corner opens this box (as the WordPress site's sign-in did): what the Student Portal is and
// its sign-in, "Didn't get the email?" for students from the old website, and a note that free courses need no account. Rendered into <body> (the header's glass would trap a fixed
// box), so it carries its own colours (portal-sign-in.css) and works under both headers (WahaHeader and PageHeader).
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import TurnstileCheck from './TurnstileCheck'
import { commercePortalBase } from '../data/liveCommerceCatalog'
import { LEGACY_PORTAL } from '../constants/links'
import '../portal-sign-in.css'

const OPEN_EVENT = 'talweeh:portal-sign-in'
const turnstileSiteKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
export const openPortalSignIn = () => window.dispatchEvent(new CustomEvent(OPEN_EVENT))

const SIGN_IN = `${LEGACY_PORTAL}/auth/login`

// A real link to the portal's sign-in (so it still works opened in a new tab or without the app); a plain click opens the box.
export function SignInLink({ className = '', children = 'Sign in', onClick }) {
  return (
    <a className={className} href={SIGN_IN} aria-haspopup="dialog"
      onClick={(e) => { onClick?.(); if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); openPortalSignIn() }}>{children}</a>
  )
}

// "Didn't get the email?": the portal sends a student their invitation again (/api/commerce/invite-resend). It answers
// the same for any address, so this only ever says "if that email belongs to a student".
function ResendForm() {
  const [email, setEmail] = useState('')
  const [captcha, setCaptcha] = useState({ round: 0, token: null })
  const [state, setState] = useState({ busy: false, done: '', error: '' })
  const onToken = useCallback((token) => setCaptcha((c) => ({ ...c, token })), [])
  const ready = !turnstileSiteKey || Boolean(captcha.token)
  const submit = async (e) => {
    e.preventDefault()
    if (state.busy || !ready) return
    setState({ busy: true, done: '', error: '' })
    try {
      const response = await fetch(`${commercePortalBase()}/api/commerce/invite-resend`, {
        method: 'POST', credentials: 'omit', mode: 'cors', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, captcha_token: captcha.token || '' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setState({ busy: false, done: '', error: payload.error || 'That did not go through. Please try again.' })
        if (payload.captcha || turnstileSiteKey) setCaptcha((c) => ({ round: c.round + 1, token: null }))
        return
      }
      setState({ busy: false, done: payload.message || 'If that email belongs to a Talweeh student, we’ve sent the instructions again.', error: '' })
    } catch {
      setState({ busy: false, done: '', error: 'The portal could not be reached. Check your connection and try again.' })
    }
  }
  if (state.done) return <p className="ps-done" role="status">✓ {state.done}</p>
  return (
    <form className="ps-form" onSubmit={submit}>
      <label className="ps-sr" htmlFor="ps-email">Email you studied with</label>
      <div className="ps-row">
        <input id="ps-email" type="email" required autoComplete="email" placeholder="Email you studied with" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className="ps-btn ps-send" disabled={state.busy || !ready}>{state.busy ? 'Sending…' : 'Send again'}</button>
      </div>
      <TurnstileCheck onToken={onToken} resetKey={captcha.round} action="invite_resend" />
      {state.error && <p className="ps-err" role="alert">{state.error}</p>}
    </form>
  )
}

function Dialog({ onClose }) {
  const first = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    first.current?.focus()
    const key = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow; opener?.focus?.() }
  }, [onClose])
  return createPortal(
    <div className="ps-root">
      <div className="ps-ov" onClick={onClose} aria-hidden="true" />
      <div className="ps-box" role="dialog" aria-modal="true" aria-labelledby="ps-h">
        <button type="button" className="ps-x" onClick={onClose} aria-label="Close">✕</button>
        <span className="ps-kicker">Talweeh Student Portal</span>
        <h3 id="ps-h">Sign in to your courses</h3>
        <p>The Student Portal is for students enrolled in paid courses and programmes: your lessons, quizzes, schedule and payments are there.</p>
        <div className="ps-acts">
          <a ref={first} className="ps-btn ps-btn-g" href={SIGN_IN}>Sign in →</a>
          <a className="ps-btn" href={`${LEGACY_PORTAL}/auth/forgot-password`}>Forgot password</a>
        </div>
        <div className="ps-moved">
          <strong>Studied with us on the old website?</strong>
          <p>Every student has been sent an email with instructions for signing in to the new portal. Didn’t get it? Enter your email and we’ll send it again.</p>
          <ResendForm />
        </div>
        <div className="ps-free">
          <strong>Only took free courses?</strong>
          <p>You don’t need to sign in: every free course is open right here on the website. <Link to="/courses?free=1" onClick={onClose}>Browse free courses →</Link></p>
        </div>
        <p className="ps-note">Need help? Email <span className="ps-mail">info@talweehacademy.com</span></p>
      </div>
    </div>,
    document.body,
  )
}

// Mounted by each header; renders only while open.
export function PortalSignInHost() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])
  const close = useCallback(() => setOpen(false), [])
  return open ? <Dialog onClose={close} /> : null
}
