// A tab opened before a new version of the site still asks for the old version's page files, which the new version
// has replaced (they answer 404), and the page would stay empty until a reload. Vite reports such a failed load as
// "vite:preloadError"; the page then loads the new version itself. Only once per address in a minute, so a page
// that truly cannot load (an outage) shows RouteError instead of reloading in a loop.
const KEY = 'talweeh-new-version-reload'

export function reloadForNewVersion() {
  const path = window.location.pathname
  try {
    const last = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    if (last && last.path === path && Date.now() - last.t < 60_000) return false
    sessionStorage.setItem(KEY, JSON.stringify({ path, t: Date.now() }))
  } catch {
    if (window.__talweehReloaded) return false // storage blocked: once per page load
    window.__talweehReloaded = true
  }
  window.location.reload()
  return true
}

export function watchForNewVersion() {
  window.addEventListener('vite:preloadError', (e) => { if (reloadForNewVersion()) e.preventDefault() })
}
