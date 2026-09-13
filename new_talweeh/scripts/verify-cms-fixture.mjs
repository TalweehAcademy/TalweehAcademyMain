#!/usr/bin/env node
// Acceptance test for the CMS snapshot pipeline.
//
// This is the test that would have caught the original bug: the course and
// media bindings pointed at modules nothing imported, so published CMS content
// silently never reached the site while every build stayed green.
//
// It runs entirely offline against scripts/fixtures/cms-snapshot.example.json,
// so it needs no Supabase access and no portal export.
//
// It leaves the working tree as it found it: the fixture build overwrites the
// committed generated files, so the cleanup step rebuilds from the committed
// catalog. Cleanup runs even when an assertion fails.

import { execFileSync, execSync } from 'node:child_process'
import { readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { mergeCmsCourses, mergeCmsMedia, mergeCmsMediaCategories } from '../src/data/cmsMerge.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const fixture = path.join(here, 'fixtures', 'cms-snapshot.example.json')

// Windows resolves npm through npm.cmd, and Node 24 refuses to spawn a .cmd
// without a shell. Node scripts are spawned WITHOUT a shell on purpose: this
// repository lives under a path containing a space, which shell quoting breaks.
function npmBuild() {
  // execSync (single command string) rather than execFileSync with shell:true,
  // which Node 24 deprecates for unescaped argument concatenation.
  return execSync('npm run build', { cwd: root, encoding: 'utf8', stdio: 'pipe' })
}

const failures = []
function check(condition, message) {
  if (condition) console.log(`  ok   ${message}`)
  else { console.error(`  FAIL ${message}`); failures.push(message) }
}

function run(command, args, { allowFailure = false } = {}) {
  try {
    return { ok: true, output: execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }) }
  } catch (error) {
    if (!allowFailure) {
      console.error(error.stdout || '')
      console.error(error.stderr || '')
      throw error
    }
    return { ok: false, output: `${error.stdout || ''}${error.stderr || ''}` }
  }
}

async function distText() {
  const parts = []
  for (const dir of ['assets', '']) {
    const target = path.join(root, 'dist', dir)
    let names = []
    try { names = await readdir(target) } catch { continue }
    for (const name of names) {
      if (!/\.(js|html|css)$/i.test(name)) continue
      parts.push(await readFile(path.join(target, name), 'utf8'))
    }
  }
  return parts.join('\n')
}

const snapshot = JSON.parse(await readFile(fixture, 'utf8'))

try {
  // -------------------------------------------------------------------------
  console.log('\n1. Merge functions (direct, no build)')
  // -------------------------------------------------------------------------
  const media = mergeCmsMedia(snapshot, [])
  const item = media[0]
  check(media.length === 1, 'mergeCmsMedia returns the fixture item')
  check(
    Array.isArray(item.categories) && item.categories[0] === 'usul-al-hadith',
    'media categories are slugs, not display names (drives the /media filter)',
  )
  check(
    Array.isArray(item.collections) && item.collections[0] === 'CMSFIXTURE Usul Al Hadith',
    'media display names are kept in collections',
  )
  check(Boolean(item.shortOverview), 'media shortOverview is populated (the card blurb)')
  check(item.youtubeId === 'bbbbbbbbbbb', 'media youtubeId is derived from the YouTube URL')
  check(String(item.thumbnail || '').includes('i.ytimg.com'), 'media thumbnail falls back to the YouTube still')

  const mediaCategories = mergeCmsMediaCategories(snapshot, [{ slug: 'all', label: 'All Media' }])
  check(mediaCategories[0]?.slug === 'all', 'the "all" pseudo-category is preserved first')
  check(
    mediaCategories.some((category) => category.slug === 'cmsfixture-only'),
    'a CMS-only media category becomes filterable',
  )

  const courses = mergeCmsCourses(snapshot, [])
  const paid = courses.find((course) => course.slug === 'cmsfixture-paid-course')
  const free = courses.find((course) => course.slug === 'cmsfixture-free-course')
  check(courses.length === 2, 'mergeCmsCourses returns both fixture courses')
  check(free?.free === true, 'a zero-price course with requires_payment=false is free')
  check(
    paid?.free === false,
    'requires_payment=true beats a zero placeholder price (course is NOT free)',
  )

  // -------------------------------------------------------------------------
  console.log('\n2. Import the fixture and build')
  // -------------------------------------------------------------------------
  run(process.execPath, [path.join(here, 'import-cms-snapshot.mjs'), fixture])
  const buildOutput = npmBuild()
  check(/source: cms/.test(buildOutput), 'the build reports courses came from the CMS snapshot')

  // -------------------------------------------------------------------------
  console.log('\n3. Fixture content reaches dist')
  // -------------------------------------------------------------------------
  const bundle = await distText()
  const surfaces = [
    ['courses', 'CMSFIXTURE Free Course Title'],
    ['articles', 'CMSFIXTURE Article Title'],
    ['media', 'CMSFIXTURE Media Title'],
    ['instructors', 'CMSFIXTURE Instructor Name'],
    ['site content', 'CMSFIXTURE hero body copy.'],
  ]
  for (const [surface, marker] of surfaces) {
    check(bundle.includes(marker), `${surface}: "${marker}" is present in dist`)
  }

  // -------------------------------------------------------------------------
  console.log('\n4. The paid-video gate now inspects CMS content')
  // -------------------------------------------------------------------------
  // Before courses were merged on the Node side, this gate only ever saw the
  // committed catalog, so a paid course introduced by a snapshot was never
  // checked. Plant a violation and require the gate to reject it.
  const poisoned = JSON.parse(JSON.stringify(snapshot))
  poisoned.courses.find((course) => course.slug === 'cmsfixture-paid-course')
    .lessons[0].youtube_url = 'https://www.youtube.com/watch?v=ccccccccccc'
  const { writeFile, mkdir } = await import('node:fs/promises')
  await mkdir(path.join(root, '.talweeh-cms'), { recursive: true })
  await writeFile(path.join(root, '.talweeh-cms', 'snapshot.json'), JSON.stringify(poisoned), 'utf8')

  const gate = run(process.execPath, [path.join(here, 'verify-public-paid-video-safety.mjs')], { allowFailure: true })
  check(!gate.ok, 'a paid CMS course carrying a lesson video URL fails the safety gate')
  check(/cmsfixture-paid-course/.test(gate.output), 'the gate names the offending course')
} finally {
  // -------------------------------------------------------------------------
  console.log('\n5. Restore the committed build')
  // -------------------------------------------------------------------------
  await rm(path.join(root, '.talweeh-cms'), { recursive: true, force: true })
  await rm(path.join(root, 'public', 'cms-assets'), { recursive: true, force: true })
  npmBuild()
  console.log('  ok   regenerated from the committed catalog')
}

if (failures.length) {
  console.error(`\nCMS FIXTURE VERIFICATION FAILED: ${failures.length} check(s)\n`)
  process.exit(1)
}
console.log('\nCMS fixture verification passed.\n')
