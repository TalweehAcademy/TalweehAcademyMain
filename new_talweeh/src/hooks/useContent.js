// Frontend-only public content source.
//
// The public Talweeh site renders from src/content/siteContent.js.
// There is intentionally no database/API overlay on this website.
import { CONTENT_DEFAULTS } from '../content/siteContent'

export function useContent(page) {
  const content = CONTENT_DEFAULTS[page] || {}

  // Kept for component-interface compatibility. Public-site editing is disabled;
  // content changes are made in source and deployed normally.
  const save = async () => undefined
  const reset = async () => undefined

  return { content, save, reset }
}
