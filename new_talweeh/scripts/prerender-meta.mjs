// Build step (after vite build): each page gets its own HTML head, and addresses that are not pages answer 404.
//
// The site is a single-page app: every address used to get the same index.html, so a link shared on WhatsApp,
// Facebook, X or LinkedIn (which read the HTML and never run JavaScript) showed the home page's title, text and
// picture, and a missing page answered "200 OK" to search engines. This writes dist/_p/<page>.html for every page
// (the same app, with that page's title, description, picture and canonical address in the head), points each
// address at its copy in dist/_redirects, and ends the file with "/* /index.html 404": the app still shows its
// "Page not found", now with the right status.
//
// Pages: the static routes in src/seo/pageMeta.js, plus every course, article, video and instructor the site lists
// (the same data the pages use, so a course published after this build shows its page, with the home preview and a
// 404 status, until the next build). The data modules are bundled with esbuild (Vite's own) because they import JSON.
import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

const entry = `
export { PUBLIC_COURSES } from './src/data/publicCourseIndex.js'
export { ARTICLES } from './src/data/articles.js'
export { VIDEOS } from './src/media/mediaKit.js'
export { INSTRUCTORS } from './src/data/instructors.js'
export * from './src/seo/pageMeta.js'
`
const tmp = path.join(tmpdir(), `talweeh-meta-${process.pid}.mjs`)
await build({ stdin: { contents: entry, resolveDir: root, loader: 'js' }, bundle: true, platform: 'node', format: 'esm', outfile: tmp, logLevel: 'error', loader: { '.json': 'json' } })
const data = await import(pathToFileURL(tmp).href)
await rm(tmp, { force: true })
const { ROUTE_META, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, SITE_ORIGIN, absoluteUrl, fullTitle, plainDescription } = data

const pages = new Map()
const add = (route, meta) => { if (route && !pages.has(route)) pages.set(route, meta) }
for (const [route, meta] of Object.entries(ROUTE_META)) if (route !== '/') add(route, meta)
for (const c of data.PUBLIC_COURSES) add(`/courses/${c.slug}`, { title: c.title, description: c.description || c.primaryText, image: c.poster })
for (const a of data.ARTICLES) add(`/articles/${a.slug}`, { title: a.title, description: a.excerpt, image: a.imageUrl })
for (const v of data.VIDEOS) add(`/media/${v.slug}`, { title: v.title, description: v.shortOverview, image: v.thumbnail })
for (const p of data.INSTRUCTORS) add(`/instructors/${p.slug}`, { title: p.name, description: p.summary || p.role, image: p.image || p.imageUrl })

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
const START = '<!-- TALWEEH-SOCIAL-META:START -->', END = '<!-- TALWEEH-SOCIAL-META:END -->'
if (!template.includes(START) || !template.includes(END)) throw new Error('dist/index.html has no TALWEEH-SOCIAL-META markers.')

function head(route, meta) {
  const title = fullTitle(meta.title)
  const description = plainDescription(meta.description || DEFAULT_DESCRIPTION)
  const image = absoluteUrl(meta.image) || DEFAULT_IMAGE
  const url = `${SITE_ORIGIN}${route}`
  return [
    START,
    `<meta name="description" content="${esc(description)}" />`,
    meta.noindex ? '<meta name="robots" content="noindex" />' : '',
    `<link rel="canonical" href="${esc(url)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Talweeh Academy" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:alt" content="${esc(meta.title || 'Talweeh Academy')}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    END,
  ].filter(Boolean).join('\n    ')
}

const rules = []
for (const [route, meta] of pages) {
  const html = template
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, '')
    .replace(new RegExp(`${START}[\\s\\S]*?${END}`), head(route, meta))
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle(meta.title))}</title>`)
  const file = path.join(dist, '_p', `${route.slice(1)}.html`)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
  // Netlify matches a rule's path literally; addresses with non-ASCII letters are written percent-encoded.
  rules.push(`${encodeURI(route)}    /_p${encodeURI(route)}.html    200`)
}

const redirectsFile = path.join(dist, '_redirects')
const redirects = await readFile(redirectsFile, 'utf8')
const CATCH_ALL = /^\/\*\s+\/index\.html\s+200\s*$/m
if (!CATCH_ALL.test(redirects)) throw new Error('dist/_redirects has no "/* /index.html 200" line to replace.')
await writeFile(redirectsFile, redirects.replace(CATCH_ALL, [
  '# Each page: its own copy with its own head (scripts/prerender-meta.mjs).',
  ...rules,
  '# Anything else: the app shows "Page not found", with a 404 status.',
  '/*    /index.html   404',
].join('\n') + '\n'))
console.log(`Page heads: ${pages.size} pages written to dist/_p; other addresses answer 404.`)
