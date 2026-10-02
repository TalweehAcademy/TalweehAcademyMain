// Build step: pulls the latest public course catalogue from the Academic System ("Update public website" on the
// On-Demand admin page starts this build) and runs the existing importer on it, before the course data is
// generated and the paid-video safety check runs.
//
// The feed is /api/on-demand/public-course-feed on Legacy: published, publicly listed courses only, no programme
// courses, and no video URLs for paid lessons. It needs the bearer token QURAN_STUDY_PUBLIC_SYNC_TOKEN (shared
// with Legacy, as for Qurʾān Study) and its address, PORTAL_COURSE_FEED_URL; when that is unset the address is
// worked out from QURAN_STUDY_PUBLICATION_URL (same Legacy site). Build-time variables only — never VITE_*.
//
// Nothing configured: does nothing, so local builds keep the committed catalogue. Feed address worked out but not
// there yet (404): keeps the committed catalogue. Any other failure (feed down, bad data, importer refusal) fails
// the build, leaving the previous deploy live.
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const token = String(process.env.QURAN_STUDY_PUBLIC_SYNC_TOKEN || '').trim()
const explicit = String(process.env.PORTAL_COURSE_FEED_URL || '').trim()
const studyFeed = String(process.env.QURAN_STUDY_PUBLICATION_URL || '').trim()

function fail(message) {
  console.error(`Course catalogue sync failed: ${message}`)
  process.exit(1)
}

function feedUrl() {
  if (explicit) return explicit
  if (!studyFeed) return ''
  try { return new URL('/api/on-demand/public-course-feed', new URL(studyFeed).origin).toString() } catch { return '' }
}

async function main() {
  const endpoint = feedUrl()
  if (!endpoint || !token) {
    console.log('Course catalogue sync not configured; using the committed course catalogue.')
    return
  }
  let url
  try { url = new URL(endpoint) } catch { fail('the course feed address is not a valid URL') }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') fail('the course feed must use HTTPS')

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (response.status === 404 && !explicit) {
    console.log('Course catalogue feed is not available on the Academic System yet; using the committed course catalogue.')
    return
  }
  if (!response.ok) fail(`the feed answered HTTP ${response.status}`)
  const payload = await response.json().catch(() => null)
  if (!payload || Number(payload.schemaVersion) !== 3 || !Array.isArray(payload.courses)) fail('unexpected feed format')
  if (payload.paidLessonVideoUrlsIncluded !== false) fail('the feed did not confirm that paid lesson videos are excluded')
  if (!payload.courses.length) fail('the feed returned no courses; keeping the previous deploy')

  console.log(`Course catalogue sync: ${payload.courses.length} courses, ${payload.lessonCount} lessons (exported ${payload.exportedAt}).`)
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'talweeh-course-sync-'))
  try {
    const file = path.join(tempRoot, 'portal-catalog.json')
    await writeFile(file, JSON.stringify(payload))
    execFileSync(process.execPath, [path.join(scriptsDir, 'import-portal-catalog.mjs'), file], { stdio: 'inherit' })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

await main()
