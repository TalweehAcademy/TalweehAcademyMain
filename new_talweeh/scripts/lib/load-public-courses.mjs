// Single source of public course data for every build stage.
//
// Why this exists: the course pages do not import src/data/publicCourseCatalog.js.
// They import the generated publicCourseIndex.js and publicCourseDetails.js,
// which are produced by plain Node scripts that never run through Vite. So a
// CMS overlay applied by the Vite plugin could never reach them — course edits
// published in the portal silently did nothing while the build stayed green.
//
// Every stage that reads course data must go through loadPublicCourses() so the
// CMS snapshot is applied exactly once, in one place:
//   1. verify-public-paid-video-safety.mjs   (safety gate)
//   2. generate-public-course-index.mjs      (/courses)
//   3. generate-public-course-details.mjs    (/courses/:slug chunks)
// generate-sitemap.mjs needs no change: it reads the regenerated index.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeCmsCourseCategories, mergeCmsCourses } from '../../src/data/cmsMerge.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '../..')

async function readSnapshot() {
  const file = path.join(projectRoot, '.talweeh-cms', 'snapshot.json')
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    // No snapshot imported. That is the normal state of a clean checkout, and
    // the build falls back to the committed catalog.
    return null
  }
}

export async function loadPublicCourses() {
  // Cache-bust so repeated imports inside one build pick up a regenerated file.
  const catalogUrl = new URL('../../src/data/publicCourseCatalog.js', import.meta.url)
  catalogUrl.searchParams.set('generated', Date.now().toString())
  const { PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES } = await import(catalogUrl.href)

  if (!Array.isArray(PUBLIC_COURSES)) {
    throw new Error('PUBLIC_COURSES was not found in src/data/publicCourseCatalog.js')
  }
  if (!Array.isArray(PUBLIC_COURSE_CATEGORIES)) {
    throw new Error('PUBLIC_COURSE_CATEGORIES was not found in src/data/publicCourseCatalog.js')
  }

  const snapshot = await readSnapshot()
  const cmsCourseCount = Array.isArray(snapshot?.courses) ? snapshot.courses.length : 0

  if (!cmsCourseCount) {
    if (snapshot) {
      console.log(
        `Public courses: committed catalog (${PUBLIC_COURSES.length} courses). ` +
        'A CMS snapshot is present but contains no courses.'
      )
    } else {
      console.log(`Public courses: committed catalog (${PUBLIC_COURSES.length} courses); no CMS snapshot.`)
    }
    return {
      PUBLIC_COURSES,
      PUBLIC_COURSE_CATEGORIES,
      source: 'committed',
    }
  }

  const courses = mergeCmsCourses(snapshot, PUBLIC_COURSES)
  const categories = mergeCmsCourseCategories(snapshot, PUBLIC_COURSE_CATEGORIES)

  // A snapshot with courses that yields nothing is a corrupt merge, not a
  // legitimate empty catalog. Fail rather than generate an empty /courses page.
  if (!Array.isArray(courses) || courses.length === 0) {
    throw new Error(
      `CMS snapshot lists ${cmsCourseCount} course(s) but the merge produced none. ` +
      'Refusing to generate an empty public catalog.'
    )
  }
  const missingSlugs = courses.filter((course) => !course?.slug).length
  if (missingSlugs) {
    throw new Error(`CMS snapshot produced ${missingSlugs} course(s) with no slug.`)
  }

  // Not fatal — identical output is conceivable if the committed catalog was
  // itself generated from this same export — but it almost always means the
  // overlay did not really apply, which is the failure mode this file exists
  // to prevent. Say so loudly.
  if (JSON.stringify(courses) === JSON.stringify(PUBLIC_COURSES)) {
    console.warn(
      'WARNING: the CMS snapshot produced a course list byte-identical to the committed catalog. ' +
      'Verify the snapshot is the one you intended to publish.'
    )
  }

  console.log(
    `Public courses: CMS snapshot #${snapshot.snapshotNumber ?? '?'} ` +
    `(${courses.length} courses, ${categories.length} categories; ` +
    `committed catalog had ${PUBLIC_COURSES.length}).`
  )

  return {
    PUBLIC_COURSES: courses,
    PUBLIC_COURSE_CATEGORIES: categories,
    source: 'cms',
  }
}
