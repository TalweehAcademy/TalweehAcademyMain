import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const catalogUrl = new URL('../src/data/publicCourseCatalog.js', import.meta.url)
catalogUrl.searchParams.set('generated', Date.now().toString())

const { PUBLIC_COURSES } = await import(catalogUrl.href)

if (!Array.isArray(PUBLIC_COURSES)) {
  throw new Error('PUBLIC_COURSES was not found in src/data/publicCourseCatalog.js')
}

const detailsDir = path.join(here, '../src/data/public-course-details')
await rm(detailsDir, { recursive: true, force: true })
await mkdir(detailsDir, { recursive: true })

function safeFileName(slug) {
  const safe = String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!safe) throw new Error(`Invalid course slug: ${slug}`)
  return safe
}

const seen = new Set()
const manifestRows = []
let totalBytes = 0
let largest = { slug: '', bytes: 0 }

for (const course of PUBLIC_COURSES) {
  const slug = String(course?.slug || '')
  if (!slug) throw new Error('A public course is missing its slug.')
  if (seen.has(slug)) throw new Error(`Duplicate public course slug: ${slug}`)
  seen.add(slug)

  const fileName = `${safeFileName(slug)}.js`
  const json = JSON.stringify(course, null, 2)
  const source = `// AUTO-GENERATED — DO NOT EDIT BY HAND.\nexport default ${json}\n`
  const bytes = Buffer.byteLength(source)

  await writeFile(path.join(detailsDir, fileName), source, 'utf8')
  manifestRows.push({ slug, fileName, bytes })
  totalBytes += bytes
  if (bytes > largest.bytes) largest = { slug, bytes }
}

const loaderSource = `// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Each loader is a literal dynamic import so Vite emits one course-data chunk
// per public course. Only the requested course is downloaded by the browser.

const COURSE_LOADERS = {
${manifestRows.map(({ slug, fileName }) =>
  `  ${JSON.stringify(slug)}: () => import('./public-course-details/${fileName}'),`
).join('\n')}
}

export async function loadPublicCourse(slug) {
  const loader = COURSE_LOADERS[String(slug || '')]
  if (!loader) return null
  const module = await loader()
  return module.default || null
}
`

await writeFile(
  path.join(here, '../src/data/publicCourseDetails.js'),
  loaderSource,
  'utf8'
)

console.log(
  `Generated ${manifestRows.length} per-course data modules; ` +
  `${totalBytes.toLocaleString()} source bytes total.`
)
console.log(
  `Largest individual course module: ${largest.slug} ` +
  `(${largest.bytes.toLocaleString()} source bytes).`
)
