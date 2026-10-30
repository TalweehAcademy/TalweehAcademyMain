import { readFile, writeFile } from 'node:fs/promises'
import { PUBLIC_COURSES } from '../src/data/publicCourseIndex.js'
import { ARTICLES } from '../src/data/articles.js'
import { MEDIA_ITEMS } from '../src/data/mediaCatalog.js'

const ORIGIN = 'https://talweehacademy.com'
const staticPaths = [
  '/',
  '/courses',
  '/courses/roadmap',
  '/start',
  '/faq',
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
  '/arabic/assessment',
  '/hadith-specialization',
  '/hadith-specialization/learning',
  '/hadith-specialization/enroll',
  '/p/terms-conditions',
  '/p/refund-policy',
  '/p/privacy-policy',
]

const coursePaths = PUBLIC_COURSES.map((course) => `/courses/${course.slug}`)

// Articles, videos and instructors as the site shows them: the portal's (homeFeed.json, synced just before this
// script in the build) when published, else the site's own lists (src/media/mediaKit.js, src/data/instructors.js).
const feed = JSON.parse(await readFile(new URL('../src/data/homeFeed.json', import.meta.url), 'utf8'))
const slugs = (list) => (Array.isArray(list) ? list.map((x) => x?.slug).filter((slug) => typeof slug === 'string' && slug) : [])
const media = feed.media && Array.isArray(feed.media.items) && feed.media.items.length ? feed.media.items : MEDIA_ITEMS
const ownInstructors = [...(await readFile(new URL('../src/data/instructors.js', import.meta.url), 'utf8')).matchAll(/^\s{4}slug: '([^']+)'/gm)].map((m) => m[1])
const instructors = slugs(feed.instructors).length ? slugs(feed.instructors) : ownInstructors
const detailPaths = [
  ...slugs(ARTICLES).map((slug) => `/articles/${slug}`),
  ...slugs(media).map((slug) => `/media/${slug}`),
  ...instructors.map((slug) => `/instructors/${slug}`),
]
const paths = [...new Set([...staticPaths, ...coursePaths, ...detailPaths])]

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
