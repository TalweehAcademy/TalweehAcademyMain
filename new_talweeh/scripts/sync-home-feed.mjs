// Build step: pulls the home page videos and testimonials and the published CMS articles from the Academic System
// and Media (Admin → Website CMS → Home page / Media → Publish starts this build), before vite build.
//
// The feed is /api/website/public-home-feed on Legacy, with the same bearer token as the course feed
// (QURAN_STUDY_PUBLIC_SYNC_TOKEN). Videos and testimonials are written to src/data/homeFeed.json (empty lists keep
// the defaults in src/content/siteContent.js); the articles go through the CMS importer as an articles-only snapshot,
// and are added to the site's own articles (src/data/cmsMerge.js mergeCmsArticles), never replacing them.
//
// Nothing configured: does nothing, so local builds keep the committed content. Feed not on the Academic System yet
// (404): the same. Any other failure fails the build, leaving the previous deploy live.
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.join(scriptsDir, '..', 'src', 'data', 'homeFeed.json')
const publicDir = path.join(scriptsDir, '..', 'public')
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

// A home video saved in the portal without a title: ask YouTube's public oEmbed for it, so the home page can show
// the title and teacher under the thumbnail. Best effort only; no answer leaves the title empty.
async function youTubeTitle(id) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return ''
    const data = await res.json().catch(() => null)
    return clean(data?.title, 120)
  } catch {
    return ''
  }
}

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
  await Promise.all(videos.filter((v) => !v.title).map(async (v) => { v.title = await youTubeTitle(v.youtubeId) }))
  const testimonials = feed.testimonials.map((t) => ({ name: clean(t.name, 80), location: clean(t.location, 80), quote: String(t.quote ?? '').trim().slice(0, 1200) }))
    .filter((t) => t.name && t.quote)
  // Media (/media pages): kept only when the portal sends it; an empty list keeps the site's own catalogue.
  const m = feed.media && typeof feed.media === 'object' ? feed.media : null
  const SLUG = /^[a-z0-9_-]{2,120}$/
  const media = m ? {
    topics: (Array.isArray(m.topics) ? m.topics : []).map((t) => ({ slug: clean(t.slug, 60), label: clean(t.label, 60), arabic: clean(t.arabic, 60), blurb: clean(t.blurb, 300) }))
      .filter((t) => SLUG.test(t.slug) && t.label),
    items: (Array.isArray(m.items) ? m.items : []).map((x) => ({
      slug: clean(x.slug, 120), youtubeId: clean(x.youtubeId, 11), title: clean(x.title, 200), speaker: clean(x.speaker, 80),
      topics: (Array.isArray(x.topics) ? x.topics : []).map((t) => clean(t, 60)).filter((t) => SLUG.test(t)),
      course: x.course && SLUG.test(String(x.course)) ? String(x.course) : null,
      courseId: /^[0-9a-f-]{36}$/i.test(String(x.courseId || '')) ? String(x.courseId) : null,
      overview: String(x.overview ?? '').trim().slice(0, 6000), shortOverview: String(x.shortOverview ?? '').trim().slice(0, 600),
      featured: x.featured === true, addedAt: clean(x.addedAt, 40),
    })).filter((x) => SLUG.test(x.slug) && YOUTUBE_ID.test(x.youtubeId) && x.title && x.topics.length),
    shorts: (Array.isArray(m.shorts) ? m.shorts : []).map((x) => ({ youtubeId: clean(x.youtubeId, 11), title: clean(x.title, 120), upright: ['oar2', 'oardefault'].includes(x.upright) ? x.upright : null })).filter((x) => YOUTUBE_ID.test(x.youtubeId)),
  } : null
  // Instructors (/instructors pages): an uploaded photo is downloaded into public/feed-assets/instructors (built with
  // the site, never committed; not cms-assets, which the article importer below empties); else the site's own picture.
  const people = Array.isArray(feed.instructors) ? feed.instructors : null
  const instructors = []
  if (people) {
    await rm(path.join(publicDir, 'feed-assets', 'instructors'), { recursive: true, force: true })
    await mkdir(path.join(publicDir, 'feed-assets', 'instructors'), { recursive: true })
    for (const x of people) {
      const slug = clean(x.slug, 80)
      if (!/^[a-z0-9-]{2,80}$/.test(slug) || !clean(x.name, 120)) continue
      let image = typeof x.image === 'string' && /^\/[\w./-]+$/.test(x.image) ? x.image : ''
      if (x.imageDownload) {
        const response = await fetch(x.imageDownload, { cache: 'no-store' })
        const type = response.headers.get('content-type') || ''
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type.split(';')[0].trim()]
        if (!response.ok || !ext) fail(`the photo of ${slug} could not be downloaded (${response.status} ${type})`)
        const version = clean(x.imageVersion, 80).replace(/[^\w.-]/g, '').replace(/\.\w+$/, '')
        const name = `${version.startsWith(slug) ? version : `${slug}-${version || 'photo'}`}.${ext}`
        await writeFile(path.join(publicDir, 'feed-assets', 'instructors', name), Buffer.from(await response.arrayBuffer()))
        image = `/feed-assets/instructors/${name}`
      }
      instructors.push({
        slug, name: clean(x.name, 120), role: clean(x.role, 160), image, imagePosition: clean(x.imagePosition, 40) || 'center top',
        summary: String(x.summary ?? '').trim().slice(0, 800),
        sections: (Array.isArray(x.sections) ? x.sections : []).map((sec) => ({ title: clean(sec?.title, 120), body: String(sec?.body ?? '').trim().slice(0, 6000) })).filter((sec) => sec.body),
      })
    }
  }
  // Contact details and footer: the contact email, Telegram, social links (known networks, https only), copyright.
  const NETWORKS = ['X / Twitter', 'YouTube', 'Telegram', 'Instagram', 'WhatsApp', 'TikTok', 'Facebook']
  const https = (v) => { try { const u = new URL(String(v || '')); return u.protocol === 'https:' ? u.toString() : '' } catch { return '' } }
  const f = feed.site && typeof feed.site === 'object' ? feed.site : null
  const site = f ? {
    contactEmail: /^\S+@\S+\.\S+$/.test(String(f.contactEmail || '')) ? clean(f.contactEmail, 120) : '',
    telegramUrl: https(f.telegramUrl),
    social: (Array.isArray(f.social) ? f.social : []).filter((x) => NETWORKS.includes(x?.label)).map((x) => ({ label: x.label, href: https(x.href) })).filter((x) => x.href),
    copyright: clean(f.copyright, 160),
  } : null
  // Home page sections: only text values (cut to size), links as site paths or https; an uploaded picture
  // ({ download, name }) is saved into public/feed-assets/home and replaced by its path.
  const hs = feed.homeSections && typeof feed.homeSections === 'object' ? feed.homeSections : null
  let homeSections = null
  if (hs) {
    await rm(path.join(publicDir, 'feed-assets', 'home'), { recursive: true, force: true })
    await mkdir(path.join(publicDir, 'feed-assets', 'home'), { recursive: true })
    const value = async (v) => {
      if (v && typeof v === 'object' && v.download) {
        const response = await fetch(v.download, { cache: 'no-store' })
        const type = (response.headers.get('content-type') || '').split(';')[0].trim()
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type]
        if (!response.ok || !ext) fail(`a home page picture could not be downloaded (${response.status} ${type})`)
        const name = `${String(v.name || 'picture').replace(/[^\w.-]/g, '').replace(/\.\w+$/, '').slice(0, 80) || 'picture'}.${ext}`
        await writeFile(path.join(publicDir, 'feed-assets', 'home', name), Buffer.from(await response.arrayBuffer()))
        return `/feed-assets/home/${name}`
      }
      return typeof v === 'string' ? v.slice(0, 2000) : ''
    }
    homeSections = {}
    for (const [key, v] of Object.entries(hs)) {
      if (!/^[a-zA-Z]{2,40}$/.test(key)) continue
      if (Array.isArray(v)) {
        const rows = []
        for (const row of v.slice(0, 8)) { const out = {}; for (const [k, x] of Object.entries(row || {})) if (/^[a-zA-Z]{1,40}$/.test(k)) out[k] = await value(x); rows.push(out) }
        homeSections[key] = rows
      } else if (v && typeof v === 'object') {
        const out = {}; for (const [k, x] of Object.entries(v)) if (/^[a-zA-Z]{1,40}$/.test(k)) out[k] = await value(x)
        homeSections[key] = out
      }
    }
  }
  await writeFile(outFile, `${JSON.stringify({ videos, testimonials, ...(media ? { media } : {}), ...(people ? { instructors } : {}), ...(site ? { site } : {}), ...(homeSections ? { homeSections } : {}) }, null, 2)}\n`)
  console.log(`Home feed sync: ${videos.length} videos, ${testimonials.length} testimonials${media ? `, media: ${media.items.length} videos in ${media.topics.length} topics, ${media.shorts.length} shorts` : ''}${people ? `, ${instructors.length} instructors` : ''}.`)

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
