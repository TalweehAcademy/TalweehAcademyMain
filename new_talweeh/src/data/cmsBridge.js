// Vite-side adapter for the CMS snapshot.
//
// All merge logic lives in ./cmsMerge.js so the plain Node build scripts can
// reuse it. This file only binds the snapshot, which is supplied by the
// `virtual:talweeh-cms-snapshot` module that scripts/vite-cms-plugin.mjs
// resolves from .talweeh-cms/snapshot.json (or `{}` when no snapshot has been
// imported). The one-argument signatures below are what the plugin injects
// into the wrapped source files — do not change them without updating
// scripts/vite-cms-plugin.mjs.
//
// NOTE: courses are deliberately NOT exported here. The course pages read the
// generated publicCourseIndex.js / publicCourseDetails.js, which are produced
// outside Vite, so courses are merged in scripts/lib/load-public-courses.mjs
// instead. Adding a course binding here would be dead code, which is exactly
// the bug this arrangement replaced.

import snapshot from 'virtual:talweeh-cms-snapshot'
import {
  mergeCmsArticles as mergeArticles,
  mergeCmsContentDefaults as mergeContentDefaults,
  mergeCmsInstructors as mergeInstructors,
  mergeCmsMedia as mergeMedia,
  mergeCmsMediaCategories as mergeMediaCategories,
} from './cmsMerge.js'

export function mergeCmsArticles(fallback = []) {
  return mergeArticles(snapshot, fallback)
}

export function mergeCmsMedia(fallback = []) {
  return mergeMedia(snapshot, fallback)
}

export function mergeCmsMediaCategories(fallback = []) {
  return mergeMediaCategories(snapshot, fallback)
}

export function mergeCmsInstructors(fallback = []) {
  return mergeInstructors(snapshot, fallback)
}

export function mergeCmsContentDefaults(fallback = {}) {
  return mergeContentDefaults(snapshot, fallback)
}
