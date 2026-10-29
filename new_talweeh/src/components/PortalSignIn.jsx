/* eslint-disable react/prop-types */
// "Sign in" in the header opens this box (as the WordPress site's sign-in did): what the Student Portal is, a note for
// students from the old website, then the portal's sign-in. Rendered into <body> (the header's glass would trap a fixed
// box), so it carries its own colours (portal-sign-in.css) and works under both headers (WahaHeader and PageHeader).
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LEGACY_PORTAL } from '../constants/links'
import '../portal-sign-in.css'

const OPEN_EVENT = 'talweeh:portal-sign-in'
export const openPortalSignIn = () => window.dispatchEvent(new CustomEvent(OPEN_EVENT))

const SIGN_IN = `${LEGACY_PORTAL}/auth/login`

// A real link to the portal's sign-in (so it still works opened in a new tab or without the app); a plain click opens the box.
export function SignInLink({ className = '', children = 'Sign in', onClick }) {
  return (
    <a className={className} href={SIGN_IN} aria-haspopup="dialog"
      onClick={(e) => { onClick?.(); if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); openPortalSignIn() }}>{children}</a>
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
        <p>Your lessons, quizzes, class recordings and payments for every Talweeh course and programme are in the Student Portal.</p>
        <div className="ps-moved">
          <strong>Studied with us on the old website?</strong>
          <p>Your account and courses have moved to the Student Portal. Sign in with the same email address as before. First time here? Use the link in the email we sent you, or choose “Forgot password” to set a new one.</p>
        </div>
        <div className="ps-acts">
          <a ref={first} className="ps-btn ps-btn-g" href={SIGN_IN}>Sign in →</a>
          <a className="ps-btn" href={`${LEGACY_PORTAL}/auth/forgot-password`}>Forgot password</a>
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
