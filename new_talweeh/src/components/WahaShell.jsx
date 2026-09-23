/* eslint-disable react/prop-types */
// Shared shell for the Wāḥa Forest pages (homepage, Qurʾān home): top bar, sticky
// glass header, footer, theme toggle and the scroll/hover motion. Styles: home-waha-v1.css.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NavigationDropdown, navLinks, footerLinks } from '../pages/_shared'
import { useContent } from '../hooks/useContent'
import { StudyListButton, StudyListHost } from '../courses/StudyList'
import SocialGlyph from './SocialGlyph'
import { useScrollLock } from '../hooks/useScrollLock'
import { LEGACY_PORTAL } from '../constants/links'
import '../home-waha-v1.css'
import '../courses-waha-v1.css'

export const LOGO = '/brand/talweeh-arabic-gold-ui.webp'



export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Internal paths go through the router; external URLs and '#' stay plain anchors.
export function SmartLink({ to, children, ...rest }) {
  const href = to || '#'
  if (/^https?:\/\//.test(href)) return <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a>
  if (href.startsWith('#')) return <a href={href} {...rest}>{children}</a>
  return <Link to={href} {...rest}>{children}</Link>
}

export function WahaSocials({ social }) {
  return (
    <div className="wh-socials">
      {social.map((s) => (
        <a key={s.label} href={s.href || '#'} aria-label={s.label}
          {...(s.href && s.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
          <SocialGlyph label={s.label} fallback={s.icon} />
        </a>
      ))}
    </div>
  )
}

// Same `tw-theme` preference key as PublicThemeToggle, so the choice carries to other pages.
export function useSiteTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('tw-theme') === 'dark' ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('tw-theme', theme)
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

export function WahaHeader({ social }) {
  const [theme, toggleTheme] = useSiteTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  useScrollLock(menuOpen)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const dark = theme === 'dark'
  return (
    <>
      <div className="wh-topbar">
        <div className="wh-wrap">
          <a className="wh-portal" href={LEGACY_PORTAL}>Legacy Portal →</a>
          <div className="wh-tr"><span>Connect</span><WahaSocials social={social} /></div>
        </div>
      </div>
      <header className={`wh-head${scrolled ? ' scrolled' : ''}`}>
        <div className="wh-bar wh-glass">
          <Link className="wh-brand" to="/" onClick={closeMenu} aria-label="Talweeh Academy home"><img src={LOGO} alt="" /><span className="wh-wordmark"><strong>Talweeh Academy</strong><small>Structured Islamic Academia</small></span></Link>
          <nav id="wh-main-links" className={`wh-nav${menuOpen ? ' open' : ''}`} aria-label="Main navigation"
            onKeyDown={(event) => { if (event.key === 'Escape') closeMenu() }}>
            {navLinks.map((item) => item.groups
              ? <NavigationDropdown key={item.label} item={item} closeMenu={closeMenu} />
              : <Link key={item.label} to={item.to} onClick={closeMenu}>{item.label}</Link>)}
            <StudyListButton className="wh-nav-mobile" onClick={closeMenu} />
            <a className="wh-nav-mobile" href={LEGACY_PORTAL} onClick={closeMenu}>Legacy Portal</a>
          </nav>
          <button type="button" className="wh-theme-btn" onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title="Light / dark">
            <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
          </button>
          <StudyListButton />
          <a className="wh-btn wh-btn-g wh-head-cta" href={LEGACY_PORTAL}>Legacy Portal</a>
          <button type="button" className="wh-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen} aria-controls="wh-main-links" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>
    </>
  )
}

export function WahaFooter({ social, copyright }) {
  return (
    <footer className="wh-footer">
      <div className="wh-wrap">
        <div className="wh-fg">
          <div className="wh-fb">
            <img src="/brand/talweeh-seal-gold.png" alt="Talweeh Academy seal" />
            <div><strong>Talweeh Academy</strong><span>Structured Islamic Academia</span><p>Study with clarity, structure, and purpose.</p></div>
          </div>
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div className="wh-fcol" key={heading}>
              <h5>{heading}</h5>
              {links.map(({ label, to }) => <SmartLink key={label} to={to}>{label}</SmartLink>)}
            </div>
          ))}
          <div className="wh-fcol"><h5>Follow Talweeh</h5><WahaSocials social={social} /></div>
        </div>
        <div className="wh-fbot">
          <span>{copyright}</span>
          <button type="button" className="wh-totop" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
        </div>
      </div>
    </footer>
  )
}

// Scroll reveals, 3D tilt, cursor spotlight and magnetic buttons from the mockup's script.
export function useWahaMotion(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const reveal = [...root.querySelectorAll('[data-r],[data-stagger]')]
    root.querySelectorAll('[data-stagger]').forEach((parent) => {
      [...parent.children].forEach((child, i) => child.style.setProperty('--i', i))
    })
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      reveal.forEach((el) => el.classList.add('in'))
      return undefined
    }
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target) }
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' })
    reveal.forEach((el) => io.observe(el))

    const cleanups = [() => io.disconnect()]
    const listen = (el, type, fn) => { el.addEventListener(type, fn); cleanups.push(() => el.removeEventListener(type, fn)) }
    if (window.matchMedia('(hover: hover)').matches) {
      root.querySelectorAll('[data-tilt]').forEach((card) => {
        listen(card, 'mousemove', (e) => {
          const r = card.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - .5
          const y = (e.clientY - r.top) / r.height - .5
          card.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${y * -9}deg) translateY(-4px)`
        })
        listen(card, 'mouseleave', () => { card.style.transform = '' })
      })
      root.querySelectorAll('[data-magnet]').forEach((btn) => {
        listen(btn, 'mousemove', (e) => {
          const r = btn.getBoundingClientRect()
          btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .3}px)`
        })
        listen(btn, 'mouseleave', () => { btn.style.transform = '' })
      })
    }
    return () => cleanups.forEach((fn) => fn())
  }, [rootRef])
}


// Page frame: aurora background, header, main content, footer. Pass a ref to get the root element.
// `overlays` render outside <main> (which is its own stacking layer) so pop-ups can cover the header.
export function WahaPage({ children, className = '', rootRef, overlays = null }) {
  const { content: g } = useContent('global')
  return (
    <div className={`wh-home ${className}`.trim()} ref={rootRef}>
      <div className="wh-aurora" aria-hidden="true"><i /><i /></div>
      <WahaHeader social={g.footer.social} />
      <main>{children}</main>
      <WahaFooter social={g.footer.social} copyright={g.footer.copyright} />
      {overlays}
      <StudyListHost />
    </div>
  )
}
