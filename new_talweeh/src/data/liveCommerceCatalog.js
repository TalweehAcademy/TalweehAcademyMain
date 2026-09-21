const PRODUCTION_PORTAL_BASE = 'https://alimiyyah.talweehacademy.com'
const MEMORY_CACHE_MS = 15000

let cachedPayload = null
let cachedAt = 0
let pendingRequest = null

function trimBase(value = '') {
  return String(value || '').trim().replace(/\/+$/, '')
}

export function commercePortalBase() {
  const configured = trimBase(import.meta.env.VITE_TALWEEH_PORTAL_BASE_URL)
  if (configured) return configured

  if (typeof window !== 'undefined') {
    const host = String(window.location.hostname || '').toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000'
  }

  return PRODUCTION_PORTAL_BASE
}

function normalizedKey(value = '') {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function cleanSlug(value = '') {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
  return slug || 'course'
}

export async function fetchLiveCommerceCatalog({ force = false, signal } = {}) {
  const now = Date.now()
  if (!force && cachedPayload && now - cachedAt < MEMORY_CACHE_MS) {
    return cachedPayload
  }

  if (!force && pendingRequest) return pendingRequest

  const request = fetch(`${commercePortalBase()}/api/commerce/public-catalog`, {
    method: 'GET',
    credentials: 'omit',
    mode: 'cors',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload || !Array.isArray(payload.courses)) {
        throw new Error(payload?.error || 'Live course catalog is unavailable.')
      }
      cachedPayload = payload
      cachedAt = Date.now()
      return payload
    })
    .finally(() => {
      if (pendingRequest === request) pendingRequest = null
    })

  pendingRequest = request
  return request
}

function optionPrice(option) {
  return Number(option?.amount_cents || 0)
}

export function primaryPurchaseOption(course) {
  const options = Array.isArray(course?.purchaseOptions)
    ? course.purchaseOptions
    : Array.isArray(course?.purchase_options)
      ? course.purchase_options
      : []
  return [...options].sort(
    (a, b) =>
      Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
      optionPrice(a) - optionPrice(b),
  )[0] || null
}

export function formatCommercePrice(course) {
  if (course?.free) return 'Free'

  const options = Array.isArray(course?.purchaseOptions)
    ? course.purchaseOptions
    : Array.isArray(course?.purchase_options)
      ? course.purchase_options
      : []
  const primary = primaryPurchaseOption(course)
  const cents = Number(primary?.amount_cents ?? course?.priceCents ?? course?.price_cents)
  const currency = String(primary?.currency || course?.currency || 'USD').toUpperCase()

  if (!Number.isFinite(cents) || cents <= 0) {
    return course?.checkoutAvailable === false ? 'Enrollment unavailable' : 'Enrollment required'
  }

  let amount
  try {
    amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)
  } catch {
    amount = `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
  }

  const prefix = options.length > 1 ? 'From ' : ''
  if (primary?.billing_type === 'subscription') {
    const count = Number(primary.billing_interval_count || 1)
    const interval = primary.billing_interval || 'month'
    const cadence = count === 1 ? interval : `${count} ${interval}s`
    return `${prefix}${amount} ${currency} / ${cadence}`
  }

  return `${prefix}${amount} ${currency}`
}

function staticMatch(liveCourse, staticCourses) {
  const exactSlugs = new Set(
    [
      liveCourse?.course_slug,
      liveCourse?.checkout_slug,
      liveCourse?.public_slug,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )

  for (const course of staticCourses) {
    if (exactSlugs.has(String(course?.slug || ''))) return course
  }

  const liveTitle = normalizedKey(liveCourse?.title)
  if (liveTitle) {
    const byTitle = staticCourses.find(
      (course) => normalizedKey(course?.title) === liveTitle,
    )
    if (byTitle) return byTitle
  }

  const sourceKeys = [
    normalizedKey(liveCourse?.course_slug),
    normalizedKey(liveCourse?.checkout_slug),
  ].filter(Boolean)

  return staticCourses.find((course) => {
    const slugKey = normalizedKey(course?.slug)
    return slugKey && sourceKeys.some(
      (source) => source === slugKey || source.endsWith(slugKey) || slugKey.endsWith(source),
    )
  }) || null
}

export function mergeCourseWithLive(staticCourse, liveCourse) {
  if (!liveCourse) return staticCourse || null

  const categories = Array.isArray(liveCourse.categories)
    ? liveCourse.categories.filter((category) => category?.slug || category?.name)
    : []
  const primaryCategory = categories[0] || null
  const purchaseOptions = Array.isArray(liveCourse.purchase_options)
    ? liveCourse.purchase_options
    : []

  const fallback = staticCourse || {}
  const slug =
    fallback.slug ||
    liveCourse.public_slug ||
    cleanSlug(liveCourse.title) ||
    liveCourse.course_slug ||
    liveCourse.checkout_slug

  return {
    ...fallback,
    id: fallback.id || liveCourse.checkout_slug || liveCourse.public_slug,
    slug,
    checkoutSlug: liveCourse.checkout_slug,
    sourceCourseSlug: liveCourse.course_slug,
    title: liveCourse.title || fallback.title || 'Talweeh course',
    arabicTitle: liveCourse.arabic_title ?? fallback.arabicTitle ?? '',
    subtitle: liveCourse.subtitle ?? fallback.subtitle ?? '',
    description: liveCourse.description ?? fallback.description ?? '',
    courseIntroduction: liveCourse.course_introduction ?? fallback.courseIntroduction ?? '',
    instructor: liveCourse.instructor_name ?? fallback.instructor ?? '',
    featured: Boolean(liveCourse.featured),
    level: liveCourse.level ?? fallback.level ?? '',
    language: liveCourse.language ?? fallback.language ?? '',
    primaryText: liveCourse.primary_text ?? fallback.primaryText ?? '',
    audience: liveCourse.audience ?? fallback.audience ?? '',
    prerequisites: liveCourse.prerequisites ?? fallback.prerequisites ?? '',
    teachingMethodology:
      liveCourse.teaching_methodology ?? fallback.teachingMethodology ?? '',
    learningOutcomes:
      liveCourse.learning_outcomes ?? fallback.learningOutcomes ?? '',
    category: primaryCategory?.slug || fallback.category || 'islamic-studies',
    categoryLabel:
      primaryCategory?.name || fallback.categoryLabel || 'Islamic Studies / Other Subjects',
    categories,
    free: Boolean(liveCourse.free),
    priceCents: Number(liveCourse.price_cents || 0),
    currency: String(liveCourse.currency || fallback.currency || 'USD').toUpperCase(),
    poster: liveCourse.poster_url || fallback.poster || '',
    posterUrl: liveCourse.poster_url || fallback.posterUrl || fallback.poster || '',
    lessonCount: (() => {
      const liveCount = Number(liveCourse.lesson_count)
      const fallbackCount = Number(fallback.lessonCount || fallback.lessons?.length || 0)
      if (staticCourse) {
        const safeLiveCount = Number.isFinite(liveCount) ? liveCount : 0
        return Math.max(fallbackCount, safeLiveCount)
      }
      return Number.isFinite(liveCount) ? liveCount : 0
    })(),
    checkoutAvailable: Boolean(liveCourse.checkout_available),
    purchaseOptions,
    liveCommerce: true,
    liveUpdatedAt: liveCourse.updated_at || null,
    lessons: Array.isArray(fallback.lessons) ? fallback.lessons : [],
  }
}

export function mergeCommerceCatalog(staticCourses = [], staticCategories = [], payload) {
  const liveCourses = Array.isArray(payload?.courses) ? payload.courses : []
  if (!liveCourses.length) {
    return { courses: staticCourses, categories: staticCategories, live: false }
  }

  const usedStaticSlugs = new Set()
  const courses = liveCourses.map((liveCourse) => {
    const matched = staticMatch(liveCourse, staticCourses)
    if (matched?.slug) usedStaticSlugs.add(matched.slug)
    return mergeCourseWithLive(matched, liveCourse)
  })

  const categoryMap = new Map()
  for (const course of liveCourses) {
    for (const category of Array.isArray(course.categories) ? course.categories : []) {
      if (!category?.slug) continue
      const existing = categoryMap.get(category.slug)
      const next = {
        slug: String(category.slug),
        label: String(category.name || category.slug),
        sortOrder: Number(category.sort_order || 0),
      }
      if (!existing || next.sortOrder < existing.sortOrder) categoryMap.set(next.slug, next)
    }
  }

  const categories = categoryMap.size
    ? [...categoryMap.values()]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
        .map(({ slug, label }) => ({ slug, label }))
    : staticCategories

  return { courses, categories, live: true }
}

export function findLiveCourse(payload, requestedSlug, staticCourse = null) {
  const courses = Array.isArray(payload?.courses) ? payload.courses : []
  const requested = String(requestedSlug || '').trim()
  const exact = courses.find((course) =>
    [course.public_slug, course.course_slug, course.checkout_slug]
      .map((value) => String(value || ''))
      .includes(requested),
  )
  if (exact) return exact

  if (staticCourse?.title) {
    const titleKey = normalizedKey(staticCourse.title)
    const byTitle = courses.find(
      (course) => normalizedKey(course?.title) === titleKey,
    )
    if (byTitle) return byTitle
  }

  const requestedKey = normalizedKey(requested)
  if (!requestedKey) return null
  return courses.find((course) =>
    [course.public_slug, course.course_slug, course.checkout_slug]
      .map(normalizedKey)
      .some((value) =>
        value && (value === requestedKey || value.endsWith(requestedKey) || requestedKey.endsWith(value)),
      ),
  ) || null
}
