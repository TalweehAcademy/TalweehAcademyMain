# Talweeh Academy Public Website

Static React + Vite public website. The production deployment has no Talweeh
application backend, database client, Supabase client, authentication session,
or serverless function dependency.

The browser may connect directly to public content providers used by visible
features, including YouTube embeds and the Qur'an reader's public text,
translation, word-data, and audio providers. These providers do not receive
Talweeh database credentials or student records.

## Local development

```bash
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

## Production build

```bash
npm run lint
npm run build
```

The build ends with `verify-static-frontend.mjs`. It fails if the deployable
bundle contains a Supabase/database client, a Talweeh runtime API endpoint,
serverless-function path, or a tracked backend directory.

## Optional manual CMS import

The Academic Portal may export a public-only JSON snapshot. Importing it is a
local build operation, not a production connection:

```bash
npm run cms:import -- ./talweeh-public-site-snapshot.json
npm run build
```

During import, permitted CMS images are downloaded into
`public/cms-assets/`, and the snapshot is stored locally under
`.talweeh-cms/`. The production site never requests the portal or Supabase to
render pages. Both generated directories are ignored by Git because a publish
workflow should deliberately decide when to package or commit generated
content.

Never place Supabase keys, service-role keys, database credentials, Stripe
secret keys, or student data in this project.
