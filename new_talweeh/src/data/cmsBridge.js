import snapshot from 'virtual:talweeh-cms-snapshot'

function slugify(value) {
  return String(value || '').trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
function parseJson(value) {
  if (!value || typeof value !== 'string') return null
  try { return JSON.parse(value) } catch { return null }
}
function clone(value) {
  if (value == null) return value
  try { return structuredClone(value) } catch { return JSON.parse(JSON.stringify(value)) }
}
function categories(entry) {
  return (entry?.categories || []).map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean)
}
function asset(entry, base = {}) {
  return entry?.imageUrl || entry?.imageSignedUrl || entry?.data?.image_url || base.imageUrl || base.thumbnailUrl || base.image || base.thumbnail || ''
}
function rawObject(entry) {
  const parsed = parseJson(entry?.data?.content_json)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}
function findFallback(fallback, slug) {
  return (fallback || []).find((item) => slugify(item?.slug || item?.title || item?.name) === slugify(slug)) || {}
}
function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim() }
function flattenContent(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(flattenContent).filter(Boolean).join('\n\n')
  if (typeof value === 'object') {
    const keys = ['heading','title','eyebrow','text','body','description','excerpt','subtitle','label','quote','content']
    const parts = keys.filter((key) => key in value).map((key) => flattenContent(value[key])).filter(Boolean)
    return parts.length ? parts.join('\n\n') : Object.entries(value).filter(([key]) => !/url|href|image|icon|slug|id/i.test(key)).map(([,v]) => flattenContent(v)).filter(Boolean).join('\n\n')
  }
  return ''
}
function paragraphs(body) {
  return String(body || '').split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean).map((text) => ({ type: 'paragraph', text }))
}
function imageAliases(out, url) {
  if (!url) return out
  out.imageUrl = url
  out.image_url = url
  out.image = url
  out.thumbnailUrl = url
  out.thumbnail_url = url
  out.thumbnail = url
  return out
}

export function mergeCmsArticles(fallback = []) {
  const entries = snapshot?.articles || []
  if (!entries.length) return fallback
  return entries.map((entry) => {
    const base = { ...findFallback(fallback, entry.slug), ...rawObject(entry) }
    const data = entry.data || {}
    const names = categories(entry)
    const out = { ...base, title: entry.title, slug: entry.slug, featured: Boolean(entry.featured) }
    if (data.excerpt) out.excerpt = data.excerpt
    if (data.author) { out.author = data.author; out.byline = data.author }
    if (data.published_date) { out.publishedAt = data.published_date; out.published_date = data.published_date; out.date = data.published_date }
    if (data.read_time) { out.readTime = data.read_time; out.read_time = data.read_time }
    if (data.youtube_url) { out.youtubeUrl = data.youtube_url; out.youtube_url = data.youtube_url; out.videoUrl = data.youtube_url }
    if (names.length) { out.category = names[0]; out.categories = names }
    const rawText = flattenContent(base.content ?? base.body)
    if (data.body && normalizeText(data.body) !== normalizeText(rawText)) {
      out.body = data.body
      if (Array.isArray(base.content)) out.content = paragraphs(data.body)
      else if ('content' in base) out.content = data.body
    }
    return imageAliases(out, asset(entry, base))
  })
}

export function mergeCmsMedia(fallback = []) {
  const entries = snapshot?.media || []
  if (!entries.length) return fallback
  return entries.map((entry) => {
    const base = { ...findFallback(fallback, entry.slug), ...rawObject(entry) }
    const data = entry.data || {}
    const names = categories(entry)
    const out = { ...base, title: entry.title, slug: entry.slug, featured: Boolean(entry.featured) }
    if (data.description) { out.description = data.description; out.excerpt = data.description }
    if (data.youtube_url) { out.youtubeUrl = data.youtube_url; out.youtube_url = data.youtube_url; out.videoUrl = data.youtube_url; out.url = data.youtube_url }
    if (data.instructor) { out.instructor = data.instructor; out.speaker = data.instructor }
    if (data.published_date) { out.publishedAt = data.published_date; out.published_date = data.published_date; out.date = data.published_date }
    if (data.duration) out.duration = data.duration
    if (data.series) { out.series = data.series; out.playlist = data.series }
    if (names.length) { out.category = names[0]; out.categories = names }
    return imageAliases(out, asset(entry, base))
  })
}

export function mergeCmsInstructors(fallback = []) {
  const entries = snapshot?.instructors || []
  if (!entries.length) return fallback
  return entries.map((entry) => {
    const base = { ...findFallback(fallback, entry.slug), ...rawObject(entry) }
    const data = entry.data || {}
    const names = categories(entry)
    const out = { ...base, name: entry.title, title: entry.title, slug: entry.slug, featured: Boolean(entry.featured) }
    if (data.role) { out.role = data.role; out.position = data.role; out.designation = data.role }
    if (data.bio) { out.bio = data.bio; out.biography = data.bio; out.description = data.bio }
    if (data.website_url) { out.websiteUrl = data.website_url; out.website_url = data.website_url; out.website = data.website_url }
    if (names.length) { out.categories = names; out.specialties = names }
    return imageAliases(out, asset(entry, base))
  })
}

function applySimpleSection(base, entry) {
  const out = { ...base, ...rawObject(entry) }
  const data = entry.data || {}
  if (data.eyebrow) out.eyebrow = data.eyebrow
  if (data.body) {
    if ('text' in out) out.text = data.body
    else if ('description' in out) out.description = data.body
    else if ('subtitle' in out) out.subtitle = data.body
    else if ('body' in out || Object.keys(out).length === 0) out.body = data.body
  }
  if (data.cta_label) {
    if ('cta' in out && typeof out.cta === 'string') out.cta = data.cta_label
    out.ctaLabel = data.cta_label
    out.buttonLabel = out.buttonLabel || data.cta_label
  }
  if (data.cta_href) { out.ctaHref = data.cta_href; out.href = out.href || data.cta_href }
  if (data.secondary_cta_label) out.secondaryCtaLabel = data.secondary_cta_label
  if (data.secondary_cta_href) out.secondaryCtaHref = data.secondary_cta_href
  const url = asset(entry, out)
  if (url) { out.imageUrl = url; if ('image' in out) out.image = url }
  return out
}

export function mergeCmsContentDefaults(fallback = {}) {
  const home = snapshot?.homepage || []
  const pages = snapshot?.pages || []
  if (!home.length && !pages.length) return fallback
  const result = clone(fallback) || {}
  const homeKey = Object.keys(result).find((key) => ['landing','home','homepage'].includes(slugify(key))) || 'landing'
  result[homeKey] = { ...(result[homeKey] || {}) }
  for (const entry of home) {
    const key = Object.keys(result[homeKey]).find((candidate) => slugify(candidate) === slugify(entry.slug)) || entry.slug
    result[homeKey][key] = applySimpleSection(result[homeKey][key] || {}, entry)
  }
  for (const entry of pages) {
    const key = Object.keys(result).find((candidate) => slugify(candidate) === slugify(entry.slug)) || entry.slug
    result[key] = applySimpleSection(result[key] || {}, entry)
  }
  return result
}

export function mergeCmsCourses(fallback = []) {
  const entries = snapshot?.courses || []
  if (!entries.length) return fallback
  return entries.map((course) => {
    const base = { ...findFallback(fallback, course.slug) }
    const cats = (course.categories || []).filter(Boolean)
    const first = cats[0] || {}
    const poster = course.posterThumbUrl || course.posterUrl || course.posterThumbSignedUrl || course.posterSignedUrl || base.poster || base.posterUrl || base.imageUrl || ''
    const priceCents = Number(course.price_cents || 0)
    const out = {
      ...base,
      ...course,
      slug: course.slug,
      title: course.title,
      arabicTitle: course.arabic_title ?? base.arabicTitle,
      subtitle: course.subtitle ?? base.subtitle,
      description: course.description ?? base.description,
      instructor: course.instructor_name ?? base.instructor,
      instructor_name: course.instructor_name,
      featured: Boolean(course.featured),
      free: priceCents === 0,
      priceCents,
      price: priceCents / 100,
      category: first.slug ?? base.category,
      categoryLabel: first.name ?? base.categoryLabel,
      categories: cats,
      poster,
      posterUrl: poster,
      imageUrl: poster,
    }
    return out
  })
}
