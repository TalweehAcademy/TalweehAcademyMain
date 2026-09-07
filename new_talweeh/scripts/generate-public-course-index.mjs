import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const catalogUrl = new URL('../src/data/publicCourseCatalog.js', import.meta.url)
catalogUrl.searchParams.set('generated', Date.now().toString())

const {
  PUBLIC_COURSES,
  PUBLIC_COURSE_CATEGORIES,
} = await import(catalogUrl.href)

if (!Array.isArray(PUBLIC_COURSES)) {
  throw new Error('PUBLIC_COURSES was not found in src/data/publicCourseCatalog.js')
}
if (!Array.isArray(PUBLIC_COURSE_CATEGORIES)) {
  throw new Error('PUBLIC_COURSE_CATEGORIES was not found in src/data/publicCourseCatalog.js')
}

const summaryFields = [
  'slug',
  'title',
  'arabicTitle',
  'instructor',
  'category',
  'categoryLabel',
  'free',
  'priceCents',
  'currency',
  'poster',
  'description',
  'primaryText',
]

const summaries = PUBLIC_COURSES.map((course) => {
  const summary = {}
  for (const key of summaryFields) {
    if (course[key] !== undefined) summary[key] = course[key]
  }

  summary.lessonCount = Number(
    course.lessonCount || course.lessons?.length || 0
  )

  return summary
})

const output = `// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
//
// Lightweight public course index for /courses.
// Generated from publicCourseCatalog.js by scripts/generate-public-course-index.mjs.
// Full curricula/lesson details remain in publicCourseCatalog.js and are loaded
// only by the individual course landing route.

export const PUBLIC_COURSE_CATEGORIES = ${JSON.stringify(PUBLIC_COURSE_CATEGORIES, null, 2)}

export const PUBLIC_COURSES = ${JSON.stringify(summaries, null, 2)}

export function publicCategoryCounts() {
  return PUBLIC_COURSES.reduce((counts, course) => {
    counts[course.category] = (counts[course.category] || 0) + 1
    return counts
  }, {})
}
`

const outPath = path.join(here, '../src/data/publicCourseIndex.js')
await writeFile(outPath, output, 'utf8')

const fullBytes = Buffer.byteLength(JSON.stringify(PUBLIC_COURSES))
const indexBytes = Buffer.byteLength(JSON.stringify(summaries))
const reduction = fullBytes > 0
  ? Math.round((1 - indexBytes / fullBytes) * 100)
  : 0

console.log(
  `Generated publicCourseIndex.js: ${summaries.length} courses; ` +
  `data payload ${indexBytes.toLocaleString()} bytes vs ` +
  `${fullBytes.toLocaleString()} bytes full catalog (${reduction}% smaller).`
)
