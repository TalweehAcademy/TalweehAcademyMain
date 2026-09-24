// Build step: replays every Qurʾān Study range published from the Academic System ("Publish to Website")
// on top of the checked-in src/quran-study-static files, before the rest of the build runs.
//
// Needs QURAN_STUDY_PUBLICATION_URL (…/api/quran-study/publications on Legacy) and
// QURAN_STUDY_PUBLIC_SYNC_TOKEN (shared with Legacy) as build-time environment variables — never VITE_*.
// With both unset it does nothing, so local builds keep the checked-in files. With them set, any failure
// (feed down, checksum mismatch, importer refusal) fails the build, leaving the previous deploy live.
//
// Publications are imported oldest first, so a newer overlapping range wins for the āyāt it covers. Each
// snapshot is fetched from a short-lived signed storage URL the feed hands out — a JSON envelope holding the
// ZIP base64-encoded, since the storage bucket only accepts JSON — and the ZIP is checked against the
// SHA-256 in the feed, then passed to the existing importer with the range it was published as.
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const endpoint = String(process.env.QURAN_STUDY_PUBLICATION_URL || '').trim()
const token = String(process.env.QURAN_STUDY_PUBLIC_SYNC_TOKEN || '').trim()
const importer = path.resolve(process.cwd(), 'scripts/import-quran-study-snapshot.mjs')

function fail(message) { throw new Error(`Qurʾān Study publication sync: ${message}`) }

async function feed(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) fail(`feed request failed with HTTP ${response.status}${typeof payload?.error === 'string' ? ` — ${payload.error}` : ''}`)
  return payload
}

function validatePublication(value) {
  const id = String(value?.id || '').trim()
  const sha256 = String(value?.sha256 || '').trim().toLowerCase()
  const surah = Number(value?.surah), fromAyah = Number(value?.fromAyah), toAyah = Number(value?.toAyah)
  if (!id || !/^[a-f0-9]{64}$/.test(sha256)) fail('feed publication metadata is incomplete')
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) fail(`publication ${id} has an invalid sūrah number`)
  if (!Number.isInteger(fromAyah) || fromAyah < 1 || !Number.isInteger(toAyah) || toAyah < fromAyah) fail(`publication ${id} has an invalid āyah range`)
  return { id, sha256, surah, fromAyah, toAyah, publishedAt: String(value.publishedAt || '') }
}

async function main() {
  if (!endpoint && !token) {
    console.log('Qurʾān Study publication sync not configured; using the checked-in Study files.')
    return
  }
  if (!endpoint || !token) fail('QURAN_STUDY_PUBLICATION_URL and QURAN_STUDY_PUBLIC_SYNC_TOKEN must both be set, or both unset')

  let endpointUrl
  try { endpointUrl = new URL(endpoint) } catch { fail('QURAN_STUDY_PUBLICATION_URL is not a valid URL') }
  if (endpointUrl.protocol !== 'https:' && endpointUrl.hostname !== 'localhost') fail('the publication URL must use HTTPS')

  const list = await feed(endpointUrl)
  if (Number(list?.schemaVersion) !== 3) fail('unsupported publication feed schema')
  const publications = (Array.isArray(list.publications) ? list.publications : [])
    .map(validatePublication)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.surah - b.surah || a.fromAyah - b.fromAyah)

  if (!publications.length) {
    console.log('Qurʾān Study publication sync: nothing published yet; using the checked-in Study files.')
    return
  }

  try {
    const trigger = JSON.parse(String(process.env.INCOMING_HOOK_BODY || '').trim() || 'null')
    if (trigger?.publicationId) console.log(`Qurʾān Study build trigger: ${trigger.action || 'publish'} ${trigger.publicationId}`)
  } catch { /* not a Study-triggered build */ }

  console.log(`Qurʾān Study publication sync: ${publications.length} active range publication(s).`)
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'talweeh-quran-study-sync-'))
  try {
    for (const publication of publications) {
      const label = `${publication.surah}:${publication.fromAyah}–${publication.toAyah}`
      const itemUrl = new URL(endpointUrl)
      itemUrl.searchParams.set('id', publication.id)
      const signed = await feed(itemUrl)
      if (typeof signed?.url !== 'string' || !/^https?:\/\//.test(signed.url)) fail(`no download link for publication ${publication.id}`)

      const response = await fetch(signed.url, { cache: 'no-store' })
      if (!response.ok) fail(`download of ${label} failed with HTTP ${response.status}`)
      const envelope = await response.json().catch(() => null)
      if (envelope?.kind !== 'talweeh-quran-study-snapshot-zip' || typeof envelope.zipBase64 !== 'string') fail(`${label} is not a Qurʾān Study snapshot envelope`)
      const bytes = Buffer.from(envelope.zipBase64, 'base64')
      if (createHash('sha256').update(bytes).digest('hex') !== publication.sha256) fail(`SHA-256 mismatch for ${label} (publication ${publication.id})`)

      const zipPath = path.join(tempRoot, `${publication.id}.zip`)
      await writeFile(zipPath, bytes)
      console.log(`Importing ${label} from publication ${publication.id} (${bytes.length.toLocaleString()} bytes)…`)
      const result = spawnSync(process.execPath, [importer, zipPath, `--expect-range=${publication.surah}:${publication.fromAyah}-${publication.toAyah}`], { cwd: process.cwd(), env: process.env, stdio: 'inherit' })
      if (result.error) fail(`the snapshot importer could not start for ${label}: ${result.error.message}`)
      if (result.status !== 0) fail(`the snapshot importer rejected ${label} (exit ${result.status ?? 'unknown'})`)
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
  console.log('Qurʾān Study publication sync complete.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
