// Shared helpers for the Wāḥa courses pages (/courses and /courses/:slug).
// Browser-only: bundled course data, plus the Talweeh portal's public commerce catalog
// (prices and purchase options) exactly as the previous pages used it.
import { useEffect, useState } from 'react'
import { PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES } from '../data/publicCourseIndex'
import { fetchLiveCommerceCatalog, mergeCommerceCatalog, primaryPurchaseOption } from '../data/liveCommerceCatalog'
import { readCommerceCartItems, subscribeCommerceCart } from '../data/commerceCart'

export function plainText(value = '') {
  return String(value || '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\/\s*(p|div|li|h[1-6]|ul|ol)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function youTubeId(value = '') {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null
    if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

export const lessonTitle = (l) => (typeof l === 'string' ? l : l?.title || 'Lesson')
export const lessonOverview = (l) => (typeof l === 'string' ? '' : plainText(l?.overview || ''))
export const lessonVideo = (l) => (typeof l === 'string' ? '' : youTubeId(l?.youtubeUrl || l?.youtube_url || ''))

export const purchaseOptions = (course) => (Array.isArray(course?.purchaseOptions) ? course.purchaseOptions : [])
export const canEnrol = (course) => !course?.free && course?.checkoutAvailable !== false && Boolean(primaryPurchaseOption(course)?.id)

// Bundled catalog first, then the live one (prices / purchase options) when the portal answers.
export function useCourseCatalog() {
  const [catalog, setCatalog] = useState(() => ({ courses: PUBLIC_COURSES, categories: PUBLIC_COURSE_CATEGORIES, live: false }))
  // No abort signal: fetchLiveCommerceCatalog shares one in-flight request between callers, so
  // aborting it (React re-running effects in development) would fail every later caller too.
  useEffect(() => {
    let active = true
    fetchLiveCommerceCatalog()
      .then((payload) => { if (active) setCatalog({ ...mergeCommerceCatalog(PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES, payload), live: true }) })
      .catch((error) => console.warn('Using bundled Talweeh course catalog fallback', error))
    return () => { active = false }
  }, [])
  return catalog
}

// The enrolment cart ("study list") — same storage as /cart and /checkout.
export function useStudyList() {
  const [items, setItems] = useState(() => readCommerceCartItems())
  useEffect(() => subscribeCommerceCart(setItems), [])
  return items
}

// Map cart option ids back to their course + option using the (live) catalog.
export function resolveStudyList(items, courses) {
  return items.map((item) => {
    for (const course of courses) {
      const option = purchaseOptions(course).find((o) => String(o.id) === item.optionId)
      if (option) return { ...item, course, option }
    }
    return { ...item, course: courses.find((c) => c.slug === item.productKey || c.checkoutSlug === item.productKey) || null, option: null }
  })
}
