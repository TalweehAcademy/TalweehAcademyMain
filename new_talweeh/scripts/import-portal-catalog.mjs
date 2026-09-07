import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const input = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
if (!input) {
  console.error('Usage: node scripts/import-portal-catalog.mjs /path/to/talweeh-public-catalog-full-YYYY-MM-DD.json')
  process.exit(1)
}

const root = process.cwd()
const catalogPath = path.join(root, 'src/data/publicCourseCatalog.js')
const overridesPath = path.join(root, 'src/data/publicCourseOverrides.json')
const backupDir = path.join(root, 'src/data/catalog-backups')
const posterDir = path.join(root, 'public/catalog-posters')

const payload = JSON.parse(await fs.readFile(path.resolve(input), 'utf8'))
let overrides = { categories: [], courses: {} }
try {
  overrides = JSON.parse(await fs.readFile(overridesPath, 'utf8'))
} catch (error) {
  console.warn(`Public overrides were not loaded; continuing with portal metadata: ${error.message}`)
}

if (payload.exportMode !== 'full-catalog') {
  throw new Error('This is not a full Student Portal public catalogue export.')
}
if (!Array.isArray(payload.courses)) {
  throw new Error('Export file does not contain a courses array.')
}

const rawCourseCount = payload.courses.length
const rawLessonCount = payload.courses.reduce((sum, course) => sum + (Array.isArray(course?.lessons) ? course.lessons.length : 0), 0)
if (Number.isFinite(Number(payload.courseCount)) && Number(payload.courseCount) !== rawCourseCount) {
  throw new Error(`Export metadata says ${payload.courseCount} courses, but the file contains ${rawCourseCount}.`)
}
if (Number.isFinite(Number(payload.lessonCount)) && Number(payload.lessonCount) !== rawLessonCount) {
  throw new Error(`Export metadata says ${payload.lessonCount} lessons, but the file contains ${rawLessonCount}.`)
}

let existingCourses = []
try {
  const catalogModule = await import(`${pathToFileURL(catalogPath).href}?sync=${Date.now()}`)
  if (Array.isArray(catalogModule.PUBLIC_COURSES)) existingCourses = catalogModule.PUBLIC_COURSES
} catch (error) {
  console.warn(`Could not read existing public Course Library: ${error.message}`)
}

await fs.mkdir(backupDir, { recursive: true })
await fs.mkdir(posterDir, { recursive: true })
try {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  await fs.copyFile(catalogPath, path.join(backupDir, `publicCourseCatalog-${stamp}.js`))
} catch (error) {
  console.warn(`Course Library backup skipped: ${error.message}`)
}

function normalizeTitle(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ʿʾ‘’'`]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

function cleanText(value = '') {
  if (typeof value !== 'string' || !value.trim()) return ''
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\/\s*(p|div|li|h[1-6]|ul|ol)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function asText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function safeExt(url, fallback = '.webp') {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase()
    return ['.webp', '.png', '.jpg', '.jpeg'].includes(ext) ? ext : fallback
  } catch {
    return fallback
  }
}

function validYouTubeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value.trim())
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

const categoryLabel = new Map((overrides.categories || []).map((item) => [item.slug, item.label]))
const categoryAliases = new Map([
  ['usul-al-hadith', 'hadith-sciences'],
  ['adab', 'adab-akhlaq-tazkiyah'],
  ['aqidah', 'aqidah-usul-al-din'],
  ['usul-al-din', 'aqidah-usul-al-din'],
  ['quran', 'quran-tafsir'],
  ['tafsir', 'quran-tafsir'],
  ['nahw', 'nahw-sarf'],
  ['sarf', 'nahw-sarf'],
])
const fallbackHiddenTitles = new Set([
  normalizeTitle('Al-Tamhīd li-Qawāʿid al-Tawḥīd'),
  normalizeTitle('Sharḥ al-ʿAqāʾid al-Nasafiyyah'),
])

const existingBySlug = new Map(existingCourses.map((course) => [course.slug, course]))
const existingByPortalId = new Map(existingCourses.filter((course) => course.portalId).map((course) => [course.portalId, course]))
const existingByTitle = new Map(existingCourses.map((course) => [normalizeTitle(course.title), course]))

function isPublicPublishedCourse(source) {
  if (String(source?.status || '').toLowerCase() !== 'published') return false
  if (Object.prototype.hasOwnProperty.call(source || {}, 'publicly_listed') && source.publicly_listed !== true) return false
  // Compatibility guard for older exports that did not include publicly_listed.
  if (!Object.prototype.hasOwnProperty.call(source || {}, 'publicly_listed') && fallbackHiddenTitles.has(normalizeTitle(source?.title))) return false
  return true
}

const imported = []
const seenCanonicalSlugs = new Set()
let skippedDraft = 0
let skippedHidden = 0
let posterDownloaded = 0
let posterKept = 0
let posterMissing = 0
let posterOptimized = 0
let posterOriginalBytes = 0
let posterOptimizedBytes = 0

for (const source of payload.courses) {
  if (!source?.slug && !source?.title) continue
  if (String(source?.status || '').toLowerCase() !== 'published') {
    skippedDraft += 1
    continue
  }
  if (!isPublicPublishedCourse(source)) {
    skippedHidden += 1
    continue
  }

  const existing =
    (source.id && existingByPortalId.get(source.id)) ||
    (source.slug && existingBySlug.get(source.slug)) ||
    existingByTitle.get(normalizeTitle(source.title)) ||
    {}

  const canonicalSlug = existing.slug || source.slug
  if (!canonicalSlug) continue
  if (seenCanonicalSlugs.has(canonicalSlug)) {
    throw new Error(`Duplicate public course detected during import: ${canonicalSlug}`)
  }
  seenCanonicalSlugs.add(canonicalSlug)

  const override = overrides.courses?.[canonicalSlug] || overrides.courses?.[source.slug] || {}
  const price = Number(source.price_cents)
  const priceCents = Number.isFinite(price) ? price : null
  const free = priceCents === 0

  let poster = ''
  const oldPoster = typeof existing.poster === 'string' ? existing.poster : ''
  const oldPosterFile = oldPoster.startsWith('/catalog-posters/')
    ? path.join(root, 'public', oldPoster.replace(/^\//, ''))
    : null
  const oldPosterExists = oldPosterFile
    ? await fs.access(oldPosterFile).then(() => true).catch(() => false)
    : Boolean(oldPoster)

  const signedPosterUrl = source.posterSignedUrl || source.poster_signed_url || ''
  if (signedPosterUrl) {
    // Normalize every Portal poster to a reasonably sized WebP. The Course Library
    // previously served 2–4 MB PNGs to each card, which made the grid feel slow.
    // 1280px is sufficient for both the card grid and the individual course page.
    const filename = `${canonicalSlug}.webp`
    const out = path.join(posterDir, filename)
    try {
      const response = await fetch(signedPosterUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!bytes.length) throw new Error('empty response')

      const optimized = await sharp(bytes, { failOn: 'none' })
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: 78, effort: 4, smartSubsample: true })
        .toBuffer()

      await fs.writeFile(out, optimized)
      poster = `/catalog-posters/${filename}`
      posterDownloaded += 1
      posterOptimized += 1
      posterOriginalBytes += bytes.length
      posterOptimizedBytes += optimized.length
    } catch (error) {
      if (oldPosterExists) {
        poster = oldPoster
        posterKept += 1
      } else {
        posterMissing += 1
      }
      console.warn(`Poster download failed for ${source.title || canonicalSlug}: ${error.message}`)
    }
  } else if (oldPosterExists) {
    poster = oldPoster
    posterKept += 1
  } else {
    posterMissing += 1
    if (source.poster_path || source.posterPath) {
      console.warn(`No signed poster URL was supplied for ${source.title || canonicalSlug}. Generate a fresh Student Portal export and import it before the signed URLs expire.`)
    }
  }

  const sourceCategories = Array.isArray(source.categories) ? source.categories : []
  let category = override.category || existing.category || source.publicCategory || sourceCategories?.[0]?.slug || 'islamic-studies'
  category = categoryAliases.get(category) || category
  const sourceCategoryLabel = sourceCategories.find((item) => item?.slug === category)?.name || sourceCategories?.[0]?.name || ''

  const topicsById = new Map((source.topics || []).map((topic) => [String(topic.id), topic]))
  const oldLessons = Array.isArray(existing.lessons) ? existing.lessons : []
  const oldById = new Map(oldLessons.filter((lesson) => lesson?.portalId).map((lesson) => [String(lesson.portalId), lesson]))
  const oldByTitle = new Map(oldLessons.map((lesson) => [normalizeTitle(typeof lesson === 'string' ? lesson : lesson?.title), lesson]))

  const lessons = (Array.isArray(source.lessons) ? source.lessons : [])
    .filter((lesson) => lesson?.published !== false)
    .map((lesson, index) => {
      const prior =
        (lesson?.id && oldById.get(String(lesson.id))) ||
        oldByTitle.get(normalizeTitle(lesson?.title)) ||
        oldLessons[index] ||
        {}

      const row = {
        portalId: lesson?.id || prior?.portalId || null,
        title: cleanText(lesson?.title || (typeof prior === 'string' ? prior : prior?.title) || 'Lesson'),
        overview: cleanText(lesson?.overview || (typeof prior === 'string' ? '' : prior?.overview) || ''),
        topic: cleanText(topicsById.get(String(lesson?.topic_id))?.title || lesson?.topic || (typeof prior === 'string' ? '' : prior?.topic) || ''),
      }

      // SECURITY BOUNDARY: only free courses may carry a public lesson URL.
      if (free) {
        const incoming = validYouTubeUrl(lesson?.youtube_url || lesson?.youtubeUrl || lesson?.video_url || lesson?.url)
        const previous = validYouTubeUrl(typeof prior === 'string' ? '' : prior?.youtubeUrl || prior?.youtube_url)
        const youtubeUrl = incoming || previous
        if (youtubeUrl) row.youtubeUrl = youtubeUrl
      }
      return row
    })

  imported.push({
    portalId: source.id || existing.portalId || null,
    number: override.number ?? source.number ?? existing.number ?? null,
    sortOrder: Number.isFinite(Number(source.sort_order)) ? Number(source.sort_order) : (Number(existing.sortOrder) || 999999),
    slug: canonicalSlug,
    title: cleanText(asText(source.title, existing.title || canonicalSlug)),
    arabicTitle: cleanText(source.arabic_title || existing.arabicTitle || ''),
    instructor: cleanText(asText(source.instructor_name || source.instructor, existing.instructor || '')),
    category,
    categoryLabel: categoryLabel.get(category) || existing.categoryLabel || sourceCategoryLabel || 'Islamic Studies / Other Subjects',
    categories: sourceCategories.map((item) => ({ slug: item?.slug || '', name: cleanText(item?.name || '') })).filter((item) => item.slug || item.name),
    free,
    priceCents,
    currency: cleanText(asText(source.currency, existing.currency || 'USD')),
    description: cleanText(source.description || source.course_introduction || source.subtitle || existing.description || ''),
    courseIntroduction: cleanText(source.course_introduction || existing.courseIntroduction || ''),
    subtitle: cleanText(source.subtitle || existing.subtitle || ''),
    poster,
    status: 'published',
    featured: Boolean(source.featured),
    level: cleanText(source.level || existing.level || ''),
    language: cleanText(source.language || existing.language || ''),
    primaryText: cleanText(source.primary_text || existing.primaryText || ''),
    audience: cleanText(source.audience || existing.audience || ''),
    prerequisites: cleanText(source.prerequisites || existing.prerequisites || ''),
    teachingMethodology: cleanText(source.teaching_methodology || existing.teachingMethodology || ''),
    learningOutcomes: cleanText(source.learning_outcomes || existing.learningOutcomes || ''),
    lessons,
    lessonCount: lessons.length,
  })
}

const courses = imported.sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999) || a.title.localeCompare(b.title))

const categories = Array.isArray(overrides.categories) && overrides.categories.length
  ? overrides.categories
  : Array.from(new Map(courses.flatMap((course) => course.categories || []).filter((item) => item.slug).map((item) => [item.slug, { slug: item.slug, label: item.name || item.slug }])).values())

const header = `// Talweeh Academy public On-Demand Course Library\n// PUBLIC SNAPSHOT generated from Student Portal. Do not hand-edit course content.\n// Free-course YouTube URLs may be included; paid-course video URLs are never written here.\n// Public-only category overrides live in src/data/publicCourseOverrides.json when present.\n\n`
const js = `${header}export const PUBLIC_COURSE_CATEGORIES = ${JSON.stringify(categories, null, 2)}\n\nexport const PUBLIC_COURSES = ${JSON.stringify(courses, null, 2)}\n\nexport function getPublicCourse(slug) {\n  return PUBLIC_COURSES.find((course) => course.slug === slug) || null\n}\n\nexport function publicCategoryCounts() {\n  return PUBLIC_COURSES.reduce((counts, course) => {\n    counts[course.category] = (counts[course.category] || 0) + 1\n    return counts\n  }, {})\n}\n`
await fs.writeFile(catalogPath, js)

const publicLessonCount = courses.reduce((sum, course) => sum + course.lessonCount, 0)
const publicFreeCount = courses.filter((course) => course.free).length
const publicVideoCount = courses.reduce((sum, course) => sum + course.lessons.filter((lesson) => Boolean(lesson.youtubeUrl)).length, 0)
console.log('Public Course Library sync complete.')
console.log(`Raw export: ${rawCourseCount} courses / ${rawLessonCount} lessons.`)
console.log(`Public published: ${courses.length} courses / ${publicLessonCount} lessons.`)
console.log(`Free public courses: ${publicFreeCount}; public free lesson videos: ${publicVideoCount}.`)
console.log(`Posters downloaded: ${posterDownloaded}; existing posters kept: ${posterKept}; missing posters: ${posterMissing}.`)
if (posterOptimized) {
  const originalMb = (posterOriginalBytes / 1024 / 1024).toFixed(1)
  const optimizedMb = (posterOptimizedBytes / 1024 / 1024).toFixed(1)
  const savedPct = posterOriginalBytes ? Math.round((1 - posterOptimizedBytes / posterOriginalBytes) * 100) : 0
  console.log(`Poster optimization: ${posterOptimized} image(s), ${originalMb} MB → ${optimizedMb} MB (${savedPct}% smaller).`)
}
if (skippedDraft) console.log(`Excluded ${skippedDraft} non-published course(s).`)
if (skippedHidden) console.log(`Excluded ${skippedHidden} hidden/internal course(s).`)
