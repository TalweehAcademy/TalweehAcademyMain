// Build step: pulls the home page videos and testimonials and the published CMS articles from the Academic System
// (Admin → Website CMS → Home page → Publish starts this build), before vite build.
//
// The feed is /api/website/public-home-feed on Legacy, with the same bearer token as the course feed
// (QURAN_STUDY_PUBLIC_SYNC_TOKEN). Videos and testimonials are written to src/data/homeFeed.json (empty lists keep
// the defaults in src/content/siteContent.js); the articles go through the CMS importer as an articles-only snapshot,
// and are added to the site's own articles (src/data/cmsMerge.js mergeCmsArticles), never replacing them.
//
// Nothing configured: does nothing, so local builds keep the committed content. Feed not on the Academic System yet
// (404): the same. Any other failure fails the build, leaving the previous deploy live.
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.join(scriptsDir, '..', 'src', 'data', 'homeFeed.json')
const token = String(process.env.QURAN_STUDY_PUBLIC_SYNC_TOKEN || '').trim()
const explicit = String(process.env.PORTAL_HOME_FEED_URL || '').trim()
const studyFeed = String(process.env.QURAN_STUDY_PUBLICATION_URL || '').trim()

function fail(message) {
  console.error(`Home feed sync failed: ${message}`)
  process.exit(1)
}

function feedUrl() {
  if (explicit) return explicit
  if (!studyFeed) return ''
  try { return new URL('/api/website/public-home-feed', new URL(studyFeed).origin).toString() } catch { return '' }
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

async function main() {
  const endpoint = feedUrl()
  if (!endpoint || !token) {
    console.log('Home feed sync not configured; using the committed home page content.')
    return
  }
  let url
  try { url = new URL(endpoint) } catch { fail('the home feed address is not a valid URL') }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') fail('the home feed must use HTTPS')

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (response.status === 404 && !explicit) {
    console.log('Home feed is not available on the Academic System yet; using the committed home page content.')
    return
  }
  if (!response.ok) fail(`the feed answered HTTP ${response.status}`)
  const feed = await response.json().catch(() => null)
  if (!feed || feed.version !== 1 || !Array.isArray(feed.videos) || !Array.isArray(feed.testimonials)) fail('unexpected feed format')

  const videos = feed.videos.map((v) => ({ youtubeId: clean(v.youtubeId, 11), title: clean(v.title, 120) })).filter((v) => YOUTUBE_ID.test(v.youtubeId))
  const testimonials = feed.testimonials.map((t) => ({ name: clean(t.name, 80), location: clean(t.location, 80), quote: String(t.quote ?? '').trim().slice(0, 1200) }))
    .filter((t) => t.name && t.quote)
  await writeFile(outFile, `${JSON.stringify({ videos, testimonials }, null, 2)}\n`)
  console.log(`Home feed sync: ${videos.length} videos, ${testimonials.length} testimonials.`)

  // Articles only: the importer validates the snapshot and saves its images on the site.
  const cms = feed.cms
  if (!cms || !Array.isArray(cms.articles) || !cms.articles.length) { console.log('Home feed sync: no published CMS articles.'); return }
  const onlyArticles = { ...cms, courses: [], media: [], instructors: [], homepage: [], pages: [], siteSettings: [] }
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'talweeh-home-sync-'))
  try {
    const file = path.join(tempRoot, 'articles.json')
    await writeFile(file, JSON.stringify(onlyArticles))
    execFileSync(process.execPath, [path.join(scriptsDir, 'import-cms-snapshot.mjs'), file], { stdio: 'inherit' })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

await main()
