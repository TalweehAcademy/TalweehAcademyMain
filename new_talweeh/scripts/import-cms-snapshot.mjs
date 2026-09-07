#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const inputArg = process.argv[2]

function fail(message) {
  console.error(`CMS IMPORT ERROR: ${message}`)
  process.exit(1)
}

if (!inputArg) {
  fail('missing snapshot path. Usage: npm run cms:import -- ./talweeh-public-site-snapshot-....json')
}

const inputPath = path.resolve(root, inputArg)
const cacheDir = path.join(root, '.talweeh-cms')
const snapshotPath = path.join(cacheDir, 'snapshot.json')
const assetDir = path.join(root, 'public', 'cms-assets')

function safePart(value, fallback = 'asset') {
  const out = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  return out || fallback
}

function extensionFrom(contentType, source = '') {
  const byType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  }
  if (byType[contentType]) return byType[contentType]
  try {
    const ext = path.extname(new URL(source).pathname).toLowerCase()
    if (/^\.(jpg|jpeg|png|webp|gif|svg)$/.test(ext)) return ext === '.jpeg' ? '.jpg' : ext
  } catch {}
  return '.webp'
}

async function downloadAsset(url, relativeBase) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return url || null
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`asset download failed (${response.status}) for ${relativeBase}`)
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (contentType && !contentType.startsWith('image/')) throw new Error(`unexpected asset content type ${contentType} for ${relativeBase}`)
  const ext = extensionFrom(contentType, url)
  const rel = `${relativeBase}${ext}`.replace(/\\/g, '/')
  const abs = path.join(assetDir, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  const bytes = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(abs, bytes)
  return `/cms-assets/${rel}`
}

let raw
try {
  raw = await fs.readFile(inputPath, 'utf8')
} catch (error) {
  fail(`could not read ${inputPath}: ${error.message}`)
}

let snapshot
try {
  snapshot = JSON.parse(raw)
} catch {
  fail('selected snapshot file is not valid JSON')
}

if (!snapshot || snapshot.publicOnly !== true) fail('snapshot is not marked publicOnly')
if (Number(snapshot.schemaVersion || 0) < 5) fail(`unsupported snapshot schema ${snapshot.schemaVersion || 'unknown'}`)
if (snapshot.paidLessonVideoUrlsIncluded !== false) fail('snapshot does not explicitly exclude paid lesson video URLs')

for (const course of snapshot.courses || []) {
  if (Number(course.price_cents || 0) <= 0) continue
  for (const lesson of course.lessons || []) {
    if (lesson && (lesson.youtube_url || lesson.youtubeUrl || lesson.video_url || lesson.videoUrl)) {
      fail(`paid course ${course.slug || course.title || course.id} contains a lesson video URL`)
    }
  }
}

await fs.rm(assetDir, { recursive: true, force: true })
await fs.mkdir(assetDir, { recursive: true })

const collections = ['articles', 'media', 'instructors', 'homepage', 'pages', 'siteSettings']
for (const collection of collections) {
  for (const entry of snapshot[collection] || []) {
    const remote = entry?.imageSignedUrl || entry?.imageUrl
    if (!remote || !/^https?:\/\//i.test(remote)) continue
    const local = await downloadAsset(remote, `${safePart(collection)}/${safePart(entry.slug || entry.title)}`)
    entry.imageUrl = local
    entry.imageSignedUrl = local
  }
}

for (const course of snapshot.courses || []) {
  const slug = safePart(course.slug || course.title || course.id, 'course')
  const posterRemote = course.posterSignedUrl || course.posterUrl
  if (posterRemote && /^https?:\/\//i.test(posterRemote)) {
    const local = await downloadAsset(posterRemote, `courses/${slug}-poster`)
    course.posterUrl = local
    course.posterSignedUrl = local
  }
  const thumbRemote = course.posterThumbSignedUrl || course.posterThumbUrl
  if (thumbRemote && /^https?:\/\//i.test(thumbRemote)) {
    const local = await downloadAsset(thumbRemote, `courses/${slug}-thumb`)
    course.posterThumbUrl = local
    course.posterThumbSignedUrl = local
  }
}

for (const collection of collections) {
  for (const entry of snapshot[collection] || []) {
    if (typeof entry.imageSignedUrl === 'string' && entry.imageSignedUrl.startsWith('http')) delete entry.imageSignedUrl
  }
}
for (const course of snapshot.courses || []) {
  if (typeof course.posterSignedUrl === 'string' && course.posterSignedUrl.startsWith('http')) delete course.posterSignedUrl
  if (typeof course.posterThumbSignedUrl === 'string' && course.posterThumbSignedUrl.startsWith('http')) delete course.posterThumbSignedUrl
}

await fs.mkdir(cacheDir, { recursive: true })
await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n')
console.log(`CMS manual import: snapshot #${snapshot.snapshotNumber ?? '?'} written to ${path.relative(root, snapshotPath)}`)
console.log(`CMS manual import: ${snapshot.articles?.length || 0} articles, ${snapshot.media?.length || 0} media, ${snapshot.instructors?.length || 0} instructors, ${snapshot.courses?.length || 0} courses`)
console.log('Next: npm run build')
