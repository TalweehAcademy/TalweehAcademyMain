# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The **public Talweeh Academy website** (`talweehacademy.com`): a static React 18 + Vite
single-page app in [`new_talweeh/`](new_talweeh/). Marketing/brochure pages, a public course
catalog, articles, media, instructor profiles, and a Qur'an reader.

It has **no backend of its own**. No auth, no database, no commerce, no serverless functions.
"Enroll" is an outbound link to a Google Form or to the student portal. The build actively
enforces this (see *Static-only enforcement*).

Content is edited in a **separate repository** — the Talweeh Academic System (Next.js +
Supabase) — which contains the Website CMS. Content reaches this site as a JSON snapshot
imported at build time. See *The CMS pipeline*.

> `AGENTS.md` was removed in favour of this file. It described an Express + MySQL backend
> with JWT auth, `enrollments`, and `lesson_progress`. None of that exists any more; the
> `new_talweeh/server/` directory is gone and `verify-static-frontend.mjs` now fails the
> build if it comes back. Recover it from git history if you need the archaeology.

## Commands

All commands run from `new_talweeh/`, not the repo root.

```bash
npm ci
npm run dev                            # vite dev server
npm run lint                           # eslint . — see "Known lint baseline" below
npm run build                          # the full pipeline, see below
npm run preview                        # serve dist/
npm run cms:import -- ./snapshot.json  # apply a CMS snapshot before building
```

There is no test suite.

`npm run build` is a five-stage pipeline, and the order matters:

1. `scripts/verify-public-paid-video-safety.mjs` — fails the build if any **paid** course in
   `src/data/publicCourseCatalog.js` has a lesson with a YouTube URL. Paid lesson videos must
   never ship in public data.
2. `scripts/generate-public-course-index.mjs` → writes `src/data/publicCourseIndex.js`
3. `scripts/generate-public-course-details.mjs` → writes `src/data/publicCourseDetails.js` and
   `src/data/public-course-details/<slug>.js` (one chunk per course, lazily imported)
4. `scripts/generate-sitemap.mjs` → writes `public/sitemap.xml` (origin hardcoded to
   `https://talweehacademy.com`)
5. `vite build`, then `scripts/verify-static-frontend.mjs`

Stages 2–4 read `src/data/publicCourseCatalog.js` **as a plain Node import**, so they do not
see the Vite CMS overlay. This matters — see *Known gap: course and media CMS bindings are dead*.

Generated files are committed and marked `AUTO-GENERATED — DO NOT EDIT BY HAND`. Edit
`publicCourseCatalog.js` (or `publicCourseOverrides.json`) and re-run the build instead.

## The CMS pipeline

The CMS lives in the **`talweeh-academic-system`** repo (sibling directory), not here:

- Admin UI: `app/(portal)/admin/website/page.tsx` (`/admin/website`)
- Tables: `website_content_entries`, `website_content_categories`,
  `website_publish_snapshots` (migration `20260907000100_public_website_cms.sql`)
- Snapshot builder: `lib/public-site-cms.ts` — `buildPublicWebsiteSnapshot()` /
  `createWebsiteSnapshot()`, currently `schemaVersion: 5`
- Download: `GET /api/admin/website/export` → `talweeh-public-site-snapshot-<n>-<stamp>.json`

The handoff is **manual**. There is no automatic deploy: `website_publish_snapshots` has
`deploy_status` / `deploy_error` / `deploy_triggered_at` columns and the admin UI renders them,
but `lib/public-site-cms.ts` hardcodes `deploy_status: "not_configured"` and nothing ever sets
`'triggered'`. The hook is scaffolded, not wired.

On this side:

1. `npm run cms:import -- ./snapshot.json` (`scripts/import-cms-snapshot.mjs`) validates the
   snapshot (`publicOnly === true`, `schemaVersion >= 5`,
   `paidLessonVideoUrlsIncluded === false`, plus a per-course paid-lesson-video scan),
   downloads every Supabase Storage image into `public/cms-assets/`, and refuses to finish if
   a `*.supabase.co/storage/...` URL or a `cms-asset://` token survives. Output:
   `.talweeh-cms/snapshot.json`.
2. `npm run build` — `scripts/vite-cms-plugin.mjs` exposes that JSON as the virtual module
   `virtual:talweeh-cms-snapshot` and **rewrites source at transform time**, wrapping specific
   exports in `mergeCms*()` helpers from `src/data/cmsBridge.js`.

Both `.talweeh-cms/` and `public/cms-assets/` are gitignored, so a clean checkout builds from
the committed defaults. That is the intended fallback: with no snapshot the virtual module is
`{}` and every `mergeCms*()` returns its `fallback` argument unchanged.

**Committed source is the baseline content; the CMS snapshot is an overlay on top of it.**

### How the overlay binds (and why it is fragile)

`vite-cms-plugin.mjs` matches on hardcoded relative paths, then locates the value to wrap by
regex-matching `export const X =` and brace-scanning the initializer, sometimes gated on a
shape heuristic (`/\bslug\s*:/`, `/\btitle\s*:/`, a `youtube` mention):

| Source file | Wrapper | Status |
|---|---|---|
| `src/data/articles.js` | `mergeCmsArticles` | working |
| `src/data/instructors.js` | `mergeCmsInstructors` | working |
| `src/content/siteContent.js` (`CONTENT_DEFAULTS`) | `mergeCmsContentDefaults` | working |
| `src/data/publicCourseCatalog.js` | `mergeCmsCourses` | **dead** |
| `src/pages/media.jsx` | `mergeCmsMedia` | **dead** |

Rename a file, reorder an export, or change a data shape and the binding silently stops
applying. The build still passes — you just get stale content with no error. Treat any change
to those five paths as a change to the CMS contract, and re-verify the overlay after it.

### Known gap: course and media CMS bindings are dead

Two of the five bindings currently do nothing:

- **Courses.** The plugin wraps `src/data/publicCourseCatalog.js`, but no page imports it.
  `courses.jsx`, `course-landing.jsx`, and `hadith-specialization.jsx` all import the
  *generated* `publicCourseIndex.js` / `publicCourseDetails.js`, and those are produced by
  build stages 2–3 from a plain Node import that bypasses Vite entirely. CMS course edits
  reach a module nothing reads.
- **Media.** The plugin's `wrapMediaInitializer` looks for an inline array inside
  `src/pages/media.jsx`, but that file has no top-level `const` at all — media now comes from
  `src/data/mediaCatalog.js`, which the plugin never touches.

Articles, instructors, and site content do flow through. Do not assume the course/media path
works because the pipeline runs cleanly.

## Static-only enforcement

`scripts/verify-static-frontend.mjs` runs after `vite build` and scans `src/`, `dist/`, and
`index.html`. It fails on:

- directories `server`, `api`, `netlify/functions`, `functions`, `supabase`, `prisma`
- dependencies matching `@supabase/*`, `firebase*`, `mysql`/`mysql2`, `pg`, `prisma`,
  `@prisma/*`, `express`, `stripe`
- content matching a Supabase host or client, a service-role key, a
  `VITE_*`/`NEXT_PUBLIC_*` database/backend env var, a Netlify function path, a
  `fetch()` to a Talweeh portal API, or a relative `fetch('/api/...')`

If you need to add a runtime data source, expect to argue with this file — and prefer the
build-time snapshot pipeline instead.

The one legitimate outbound-fetch exception is `src/pages/quran.jsx`, which calls public
Qur'an providers (`api.alquran.cloud`, `mp3quran.net`, `cdn.jsdelivr.net`). Those hosts are
allowlisted in the CSP.

## Layout and conventions

- `src/App.jsx` holds the router (`react-router-dom` v6) plus the landing page inline. Every
  route except the landing page is `lazy()`-loaded. `PageHeader` / `PageFooter` come from
  `src/pages/_shared.jsx`.
- `src/pages/` — one file per route. `src/data/` — catalog/article/instructor/media data.
  `src/content/` — `siteContent.js` (`CONTENT_DEFAULTS`, read via `src/hooks/useContent.js`)
  and `arabicProgram.js`.
- `useContent(page)` returns `{ content, save, reset }`; `save`/`reset` are deliberate no-ops
  kept for component-interface compatibility. There is no in-browser editing.
- Styling is plain CSS, versioned by filename (`media-player-v16.css`, `media-v17.css`,
  `arabic-redesign-v1.css`, …), imported per page. There is no CSS framework and no design
  token system — match whatever the file next to you does.
- `src/constants/assets.js` exports `ASSET = '/wp-content/uploads'`. Legacy WordPress media
  paths are preserved and the files are self-hosted under `new_talweeh/public/wp-content/`
  (tracked in git, despite the root `.gitignore` entry — those 7 files predate the rule).
  Two of them are fonts preloaded from `index.html`.
- `mockups/` is static HTML design exploration, not built or deployed.
- `scripts/import-portal-catalog.mjs` is a one-off catalog importer wired to no npm script;
  it rewrites `publicCourseCatalog.js` from an On-Demand catalog export.

## Deployment

- `vercel.json` — SPA rewrite plus security headers including a strict CSP.
- `public/_headers` and `public/_redirects` — the Netlify/Cloudflare Pages equivalents,
  carrying the same CSP. Both sets exist; only one platform's will apply. **Keep the CSP in
  `vercel.json` and `public/_headers` in sync**, or fix on one platform and delete the other.
- Adding any new external script, frame, image, font, or fetch origin means editing the CSP in
  *both* places.
- `public/robots.txt` disallows `/navigation-preview/`, which is a live internal design-preview
  route (`/navigation-preview/:section`).

## Known lint baseline

`npm run lint` reports **45 errors, 4 warnings** — overwhelmingly `react/prop-types` on
internal components, plus a handful of `no-unused-vars` / `no-empty` in `src/pages/quran.jsx`.
This is pre-existing and does not gate the build. Don't treat a clean-lint run as the bar for a
change; do avoid adding new categories of error.
