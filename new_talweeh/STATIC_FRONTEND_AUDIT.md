# Static Frontend Audit

## Result

The deployable public website is a static React/Vite application. It does not
use the Talweeh Academic Portal, Supabase, MySQL, a Talweeh API, authentication,
or a serverless function at runtime.

## Removed from this clean distribution

- Retired portal-CMS sync scripts preserved inside backup directories.
- Historical patch/backup directories and ZIP archives.
- A local CMS import JSON artifact.
- Stale README instructions describing an Express/MySQL application.

## CMS behavior retained

The optional CMS workflow imports an exported public JSON snapshot before a
build. It writes local static content and downloads CMS images locally. The
import now also localizes nested Supabase Storage image URLs and refuses to
complete if a Supabase Storage URL or unresolved CMS asset token remains.

This is a manual build-time content pipeline. It is not a browser-to-portal or
browser-to-database connection.

## Runtime external services retained

- Public Qur'an text, translation, word-data, and audio providers used by the
  Qur'an reader.
- YouTube for intentionally embedded public videos.
- Ordinary outbound links, including the Student Portal link.

These do not expose or access Talweeh student, commerce, authentication, or
academic data.

## Enforcement

`npm run build` runs `scripts/verify-static-frontend.mjs` after Vite. The build
fails if source or generated output contains known database clients, backend
environment variables, Supabase endpoints, Talweeh portal API fetches,
serverless-function paths, or backend directories.

## Verification performed

- JavaScript syntax checks passed for the CMS importer and static verifier.
- Vite production build passed.
- Static frontend verification passed against source and compiled output.
- Existing ESLint baseline: 45 errors and 4 warnings. These are pre-existing
  application lint issues outside this backend-separation change.
