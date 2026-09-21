/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ASSET } from '../constants/assets'
import { useContent } from '../hooks/useContent'
import { Editable } from '../components/ContentEditor'
import CommerceCartLink from '../components/CommerceCartLink'

const preview = (label) => ({ label, to: `/navigation-preview/${encodeURIComponent(label)}` })
const courseCategoryLink = (label, slug) => ({ label, to: `/courses?category=${encodeURIComponent(slug)}` })
const navLinks = [
  { label: 'Quran', to: '/quran' },
  { label: 'Courses', groups: [
    { title: 'Browse courses', links: [
      { label: 'All Courses', to: '/courses' },
      { label: 'Live', to: '/alimiyyah' },
      { label: 'On Demand', to: '/courses' },
      { label: 'Free', to: '/courses?free=1' },
      { label: 'Specialization', to: '/hadith-specialization' },
    ] },
    { title: 'On-Demand Subjects', links: [
      courseCategoryLink('Fiqh', 'fiqh'),
      courseCategoryLink('Uṣūl al-Fiqh', 'usul-al-fiqh'),
      courseCategoryLink('Ḥadīth', 'hadith'),
      courseCategoryLink('Ḥadīth Sciences', 'hadith-sciences'),
      courseCategoryLink('ʿAqīdah & Uṣūl al-Dīn', 'aqidah-usul-al-din'),
    ] },
    { title: 'Language, Qurʾān & Adab', links: [
      courseCategoryLink('Arabic Language', 'arabic-language'),
      courseCategoryLink('Naḥw & Ṣarf', 'nahw-sarf'),
      courseCategoryLink('Qurʾān & Tafsīr', 'quran-tafsir'),
      courseCategoryLink('Tajwīd', 'tajwid'),
      courseCategoryLink('Adab, Akhlāq & Tazkiyah', 'adab-akhlaq-tazkiyah'),
    ] },
  ] },
  { label: 'Media', groups: [
    { title: 'Academic Benefits', links: [
      { label: 'Usul Al Hadith', to: '/media?category=usul-al-hadith' },
      { label: 'Usul Al Fiqh', to: '/media?category=usul-al-fiqh' },
      { label: 'Fiqh', to: '/media?category=fiqh' },
      { label: 'Arabic', to: '/media?category=arabic' },
      { label: 'Tips for Students', to: '/media?category=tips-for-students' },
    ] },
    { title: 'Explore', links: [
      { label: 'All Media', to: '/media' },
      { label: 'General Naseeha', to: '/media?category=general-naseeha' },
      { label: 'Podcasts', to: '/media?category=podcasts' },
      { label: 'Articles', to: '/articles' },
    ] },
  ] },
  preview('Alimiyyah'),
  { label: 'Arabic', to: '/arabic' },
  { label: 'Hadith Specialization', to: '/hadith-specialization' },
  { label: 'About', groups: [{ title: 'Talweeh Academy', links: [
    { label: 'What is Talweeh', to: '/about-us' },
    { label: 'Instructors', to: '/instructors' },
    { label: 'Contact', to: '/contact-us' },
    { label: 'Terms and Conditions', to: '/p/terms-conditions' },
  ] }] },
]

function NavigationDropdown({ item, closeMenu }) {
  const [open, setOpen] = useState(false)
  const container = useRef(null)
  const trigger = useRef(null)
  const id = `navigation-${item.label.toLowerCase()}`
  useEffect(() => {
    function outside(event) {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return (
    <div className="academy-nav-dropdown" ref={container}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus() }
      }}>
      <button type="button" className="academy-nav-trigger" ref={trigger}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
        {item.label} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      <div id={id} className={`academy-nav-panel${item.label === 'Courses' ? ' academy-nav-panel-courses' : ''}`} hidden={!open}>
        {item.groups.map(group => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map(link => (
              <Link key={link.label} to={link.to} onClick={() => { setOpen(false); closeMenu() }}>
                {link.label.replace('Academic Benefits: ', '')}
              </Link>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

const footerLinks = {
  Explore: [
    { label: 'Courses', to: '/courses' },
    { label: 'Arabic', to: '/arabic' },
    { label: 'Quran', to: '/quran' },
    { label: 'Alimiyyah', to: '/alimiyyah' },
  ],
  Academy: [
    { label: 'About Us', to: '/about-us' },
    { label: 'Instructors', to: '/instructors' },
    { label: 'Articles', to: '/articles' },
  ],
  Student: [
    { label: 'Student Portal', to: '/navigation-preview/Student%20Portal' },
    { label: 'Contact', to: '/contact-us' },
    { label: 'Terms & Conditions', to: '/p/terms-conditions' },
  ],
}

export function SocialIcons({ social, className = 'social-links' }) {
  return (
    <div className={className}>
      {social.map((s) => (
        <a
          key={s.label}
          href={s.href || '#'}
          aria-label={s.label}
          {...(s.href && s.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {s.icon}
        </a>
      ))}
    </div>
  )
}

export function PublicThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('tw-theme') === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('tw-theme', theme)
  }, [theme])

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="academy-theme-toggle"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to study mode'}
      title={dark ? 'Switch to light mode' : 'Switch to study mode'}
    >
      <span className="academy-theme-icon" aria-hidden="true">{dark ? '☀' : '☾'}</span>
      <span>{dark ? 'Light mode' : 'Study mode'}</span>
    </button>
  )
}

export function PageHeader() {
  const { content: g } = useContent('global')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header academy-header">
      <div className="site-header-top">
        <div className="top-bar-links">
          <a className="top-bar-btn" href="https://portal.talweehacademy.com">
            Student Portal
          </a>
        </div>
        <div className="academy-top-tools">
          <PublicThemeToggle />
          <div className="academy-social-suite">
          <span className="academy-social-label">Connect</span>
          <SocialIcons social={g.footer.social} className="top-bar-social" />
          </div>
        </div>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <img src="/brand/talweeh-arabic-gold-ui.webp" alt="" />
          <span className="academy-wordmark"><strong>Talweeh Academy</strong><small>Structured Islamic Academia</small></span>
        </Link>
        <button
          type="button"
          className="nav-burger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="academy-main-links"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <div id="academy-main-links" className={menuOpen ? 'nav-links open' : 'nav-links'}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setMenuOpen(false)
              event.currentTarget.parentElement.querySelector('.nav-burger')?.focus()
            }
          }}>
          {navLinks.map(item => item.groups
            ? <NavigationDropdown key={item.label} item={item} closeMenu={() => setMenuOpen(false)} />
            : <Link to={item.to} key={item.label} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
          <CommerceCartLink className="academy-cart-mobile" onNavigate={() => setMenuOpen(false)} />
          <Link className="academy-portal-mobile" to="/navigation-preview/Student%20Portal" onClick={() => setMenuOpen(false)}>Student Portal</Link>
        </div>
        <div className="nav-actions">
          <CommerceCartLink />
          <Link className="journey-button" to="/navigation-preview/Student%20Portal">Student Portal</Link>
        </div>
      </nav>
    </header>
  )
}

export function PageHero({ title }) {
  return (
    <section className="hero">
      <div className="hero-overlay">
        <h1>{title}</h1>
        <span className="page-hero-ornament" aria-hidden="true"><i /></span>
        <p>
          <Link to="/">Home</Link> | {title}
        </p>
      </div>
    </section>
  )
}

export function PageFooter() {
  const { content: g } = useContent('global')

  return (
    <Editable page="global" sectionKey="footer">
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand-block">
            <div className="footer-seal-frame">
              <img
                className="footer-seal"
                src="/brand/talweeh-footer-seal.webp"
                alt="Talweeh Academy seal"
              />
            </div>
            <div className="footer-brand-copy">
              <strong>Talweeh Academy</strong>
              <span>Structured Islamic Academia</span>
              <p>Study with clarity, structure, and purpose.</p>
            </div>
          </div>
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div className="footer-column" key={heading}>
              <h4>{heading}</h4>
              {links.map(({ label, to }) => (
                <Link to={to} key={label}>{label}</Link>
              ))}
            </div>
          ))}
          <div className="footer-column">
            <h4>Follow Talweeh</h4>
            <SocialIcons social={g.footer.social} />
          </div>
        </div>
        <div className="footer-bottom">
          <span>{g.footer.copyright}</span>
          <button
            type="button"
            aria-label="Scroll to top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ⌃
          </button>
        </div>
      </footer>
    </Editable>
  )
}
