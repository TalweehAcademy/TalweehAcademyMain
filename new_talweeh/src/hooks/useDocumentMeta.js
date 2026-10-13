// Per-route document metadata.
//
// index.html carries one hardcoded title, description and canonical for the
// whole site. Every URL in sitemap.xml therefore declared
// <link rel="canonical" href="https://talweehacademy.com/">, which tells search
// engines that all 47 pages are duplicates of the homepage. This hook gives
// each route its own.
//
// Link previews: the build (scripts/prerender-meta.mjs) writes the same tags into each page's own HTML, so
// WhatsApp, Facebook, X and LinkedIn, which never run JavaScript, see them too. Both read src/seo/pageMeta.js.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, ROUTE_META, SITE_ORIGIN, absoluteUrl, fullTitle, plainDescription } from '../seo/pageMeta'

export { SITE_ORIGIN, absoluteUrl }

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
    // The homepage title is already a full sentence; everything else gets the site name appended.
    const pageTitle = fullTitle(title || fallback.title)
    const resolvedDescription = plainDescription(description || fallback.description || DEFAULT_DESCRIPTION)
    const resolvedImage = image || DEFAULT_IMAGE
    const canonical = `${SITE_ORIGIN}${path || pathname}`

    document.title = pageTitle
    setMetaByName('description', resolvedDescription)
    setCanonical(canonical)
    setMetaByProperty('og:title', pageTitle)
    setMetaByProperty('og:description', resolvedDescription)
    setMetaByProperty('og:url', canonical)
    setMetaByProperty('og:image', resolvedImage)
    setMetaByName('twitter:title', pageTitle)
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
