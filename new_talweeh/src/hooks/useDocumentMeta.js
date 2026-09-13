// Per-route document metadata.
//
// index.html carries one hardcoded title, description and canonical for the
// whole site. Every URL in sitemap.xml therefore declared
// <link rel="canonical" href="https://talweehacademy.com/">, which tells search
// engines that all 47 pages are duplicates of the homepage. This hook gives
// each route its own.
//
// SCOPE / KNOWN LIMITATION: this runs in the browser, so it fixes crawlers that
// execute JavaScript (Google does). It does NOT fix social link previews —
// Facebook, WhatsApp, LinkedIn and Twitter read the raw HTML and never run JS,
// so their cards keep showing the homepage title until the routes are
// prerendered to static HTML at build time. See DEPLOYMENT_TODO.md #7.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Same origin scripts/generate-sitemap.mjs writes into sitemap.xml. Keep them
// in step or the canonical URLs and the sitemap will disagree.
export const SITE_ORIGIN = 'https://talweehacademy.com'

const SITE_NAME = 'Talweeh Academy'
const DEFAULT_DESCRIPTION =
  'At Talweeh Academy, our mission is to elevate academic awareness across all levels, offering comprehensive programs tailored for laypersons, students, and scholars.'
const DEFAULT_IMAGE = `${SITE_ORIGIN}/brand/talweeh-logo-refined.png`

// Static routes. Detail routes are absent on purpose: they call the hook
// themselves once their data has loaded, which overrides whatever is set here.
const ROUTE_META = {
  '/': { title: 'The Gateway to Islamic Scholarship - Talweeh Academy', description: DEFAULT_DESCRIPTION },
  '/courses': { title: 'Courses', description: 'Browse the full Talweeh Academy course library, from foundational Arabic and fiqh to advanced hadith sciences.' },
  '/media': { title: 'Media', description: 'Lectures, lesson excerpts and discussions from Talweeh Academy instructors.' },
  '/articles': { title: 'Articles', description: 'Written pieces from Talweeh Academy on the Islamic sciences and the life of a student of knowledge.' },
  '/instructors': { title: 'Instructors', description: 'The scholars and teachers of Talweeh Academy, and the disciplines they teach.' },
  '/about-us': { title: 'About Us', description: 'Who Talweeh Academy is, what we teach, and the tradition our programmes are grounded in.' },
  '/contact-us': { title: 'Contact Us', description: 'Get in touch with Talweeh Academy about programmes, enrolment or general enquiries.' },
  '/quran': { title: "Qur'an Reader", description: "Read the Qur'an with translation, word-by-word analysis and recitation from a range of reciters." },
  '/alimiyyah': { title: 'Alimiyyah Programme', description: 'The Talweeh Academy Alimiyyah programme: a structured, multi-year path through the classical Islamic sciences.' },
  '/hadith-specialization': { title: 'Hadith Specialization', description: 'A specialised Talweeh Academy track in the sciences of hadith, its narrators and its critical method.' },
  '/arabic': { title: 'Arabic Programme', description: 'The Talweeh Academy two-year Arabic programme, built to take students to independent reading of classical texts.' },
  '/arabic/program': { title: 'Arabic Programme Curriculum', description: 'Module-by-module curriculum for the Talweeh Academy two-year Arabic programme.' },
  '/arabic/faq': { title: 'Arabic Programme FAQ', description: 'Common questions about the Talweeh Academy Arabic programme: entry level, pacing, workload and assessment.' },
  '/arabic/about': { title: 'About the Arabic Programme', description: 'The approach, teaching method and goals behind the Talweeh Academy Arabic programme.' },
  '/p/terms-conditions': { title: 'Terms & Conditions', description: 'Terms and conditions for using the Talweeh Academy website and enrolling in its programmes.' },
}

function upsert(selector, create, apply) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = create()
    document.head.appendChild(element)
  }
  apply(element)
}

function setMetaByName(name, content) {
  upsert(
    `meta[name="${name}"]`,
    () => Object.assign(document.createElement('meta'), { name }),
    (element) => element.setAttribute('content', content),
  )
}

function setMetaByProperty(property, content) {
  upsert(
    `meta[property="${property}"]`,
    () => {
      const element = document.createElement('meta')
      element.setAttribute('property', property)
      return element
    },
    (element) => element.setAttribute('content', content),
  )
}

function setCanonical(href) {
  upsert(
    'link[rel="canonical"]',
    () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
    (element) => element.setAttribute('href', href),
  )
}

/**
 * Applies title/description/canonical and the og:/twitter: tags for one route.
 * Pass nothing on a static route and the ROUTE_META entry for the current path
 * is used; pass a title/description on a detail route once its data has loaded.
 */
export function useDocumentMeta(overrides) {
  const { pathname } = useLocation()
  const { title, description, image, path } = overrides || {}

  useEffect(() => {
    const fallback = ROUTE_META[pathname] || {}
    const resolvedTitle = title || fallback.title || SITE_NAME
    // The homepage title is already a full sentence; everything else gets the
    // site name appended so a search result or browser tab is self-describing.
    const fullTitle = resolvedTitle.includes(SITE_NAME) ? resolvedTitle : `${resolvedTitle} | ${SITE_NAME}`
    const resolvedDescription = description || fallback.description || DEFAULT_DESCRIPTION
    const resolvedImage = image || DEFAULT_IMAGE
    const canonical = `${SITE_ORIGIN}${path || pathname}`

    document.title = fullTitle
    setMetaByName('description', resolvedDescription)
    setCanonical(canonical)
    setMetaByProperty('og:title', fullTitle)
    setMetaByProperty('og:description', resolvedDescription)
    setMetaByProperty('og:url', canonical)
    setMetaByProperty('og:image', resolvedImage)
    setMetaByName('twitter:title', fullTitle)
    setMetaByName('twitter:description', resolvedDescription)
    setMetaByName('twitter:image', resolvedImage)
  }, [pathname, title, description, image, path])
}

/**
 * Rendered once, above <Routes>, so every static route gets its metadata
 * without each page having to opt in. Sibling effects run in render order, so
 * a detail page's own useDocumentMeta call runs afterwards and wins.
 */
export function RouteMeta() {
  useDocumentMeta()
  return null
}

/** Absolute URL for a page image that is stored as a site-relative path. */
export function absoluteUrl(value) {
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `${SITE_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`
}
