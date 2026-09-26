import { writeFile } from 'node:fs/promises'
import { PUBLIC_COURSES } from '../src/data/publicCourseIndex.js'

const ORIGIN = 'https://talweehacademy.com'
const staticPaths = [
  '/',
  '/courses',
  '/media',
  '/articles',
  '/about-us',
  '/instructors',
  '/contact-us',
  '/quran',
  '/alimiyyah',
  '/arabic',
  '/arabic/program',
  '/arabic/faq',
  '/arabic/about',
  '/arabic/learning',
  '/arabic/enroll',
  '/hadith-specialization',
  '/hadith-specialization/learning',
  '/hadith-specialization/enroll',
  '/p/terms-conditions',
]

const coursePaths = PUBLIC_COURSES.map((course) => `/courses/${course.slug}`)
const paths = [...new Set([...staticPaths, ...coursePaths])]

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${escapeXml(`${ORIGIN}${path}`)}</loc></url>`).join('\n')}
</urlset>
`

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml, 'utf8')
console.log(`Generated sitemap.xml with ${paths.length} URLs.`)
