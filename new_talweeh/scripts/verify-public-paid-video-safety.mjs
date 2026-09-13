import { loadPublicCourses } from './lib/load-public-courses.mjs'

// Checks the courses that will actually ship, CMS overlay included — not just
// the committed catalog. Before this went through loadPublicCourses(), a paid
// course introduced by a CMS snapshot was never inspected by this gate.
const { PUBLIC_COURSES, source } = await loadPublicCourses()

const VIDEO_KEYS = [
  'youtubeUrl',
  'youtube_url',
  'videoUrl',
  'video_url',
  'video',
  'url',
]

function isYouTubeLike(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(value.trim())
}

const violations = []

for (const course of PUBLIC_COURSES) {
  if (course?.free) continue

  const lessons = Array.isArray(course?.lessons) ? course.lessons : []
  lessons.forEach((lesson, index) => {
    if (!lesson || typeof lesson === 'string') return

    for (const key of VIDEO_KEYS) {
      if (isYouTubeLike(lesson[key])) {
        violations.push({
          slug: course.slug,
          title: course.title,
          lesson: index + 1,
          key,
          value: lesson[key],
        })
      }
    }
  })
}

if (violations.length) {
  console.error('\nERROR: Paid-course video URL(s) are exposed in the public catalog:\n')
  for (const v of violations) {
    console.error(`- ${v.slug} — lesson ${v.lesson} — ${v.key}: ${v.value}`)
  }
  console.error('\nBuild stopped. Paid lesson video URLs must not ship in public frontend data.')
  process.exit(1)
}

console.log(
  `Paid-video safety check passed: ${PUBLIC_COURSES.length} public courses checked ` +
  `(source: ${source}); no paid-course YouTube lesson URLs found.`
)
