// Build step (after vite build): lets the page talk to the portal it was built for.
//
// public/_headers names the live portal (https://legacy.talweehacademy.com) in img-src and connect-src. A site built
// for another portal (the test site: VITE_TALWEEH_PORTAL_BASE_URL is the test portal) adds that portal's origin
// next to it in dist/_headers, so the catalogue, checkout and posters load from it.
//
// VITE_TALWEEH_PORTAL_BASE_URL unset, or the live portal: does nothing. Not an https address: fails the build.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LIVE = 'https://legacy.talweehacademy.com'
const configured = String(process.env.VITE_TALWEEH_PORTAL_BASE_URL || '').trim()

if (configured) {
  let origin
  try {
    origin = new URL(configured).origin
  } catch {
    throw new Error(`VITE_TALWEEH_PORTAL_BASE_URL is not an address: ${configured}`)
  }
  if (!origin.startsWith('https://')) throw new Error(`VITE_TALWEEH_PORTAL_BASE_URL must be https: ${configured}`)

  if (origin !== LIVE) {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', '_headers')
    const headers = await readFile(file, 'utf8')
    const updated = headers.replaceAll(`${LIVE} `, `${LIVE} ${origin} `)
    if (updated === headers) throw new Error(`dist/_headers does not name ${LIVE}; the portal origin could not be added.`)
    await writeFile(file, updated)
    console.log(`Content-Security-Policy: added ${origin} next to ${LIVE}.`)
  }
}
