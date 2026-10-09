// Frontend-only public content source.
//
// The public Talweeh site renders from src/content/siteContent.js.
// There is no live database or API overlay: the portal's contact details and footer (below) arrive at build time.
import { CONTENT_DEFAULTS } from '../content/siteContent'
import HOME_FEED from '../data/homeFeed.json'

// Contact details and footer from the portal (Admin → Website CMS → Contact & footer, pulled at build by
// scripts/sync-home-feed.mjs) replace these few fields only; everything else stays as written in siteContent.js.
const SITE = HOME_FEED.site || null
const ICON = { 'X / Twitter': '𝕏', YouTube: '▶', Telegram: '◉', Instagram: '◎', WhatsApp: '✆', TikTok: '♪', Facebook: 'f' }
const PAGES = SITE ? {
  ...CONTENT_DEFAULTS,
  global: {
    ...CONTENT_DEFAULTS.global,
    footer: {
      ...CONTENT_DEFAULTS.global.footer,
      ...(SITE.copyright ? { copyright: SITE.copyright } : {}),
      ...(SITE.social?.length ? { social: SITE.social.map((s) => ({ label: s.label, icon: ICON[s.label] || '•', href: s.href })) } : {}),
    },
  },
  contact: {
    ...CONTENT_DEFAULTS.contact,
    telegram: { ...CONTENT_DEFAULTS.contact.telegram, ...(SITE.telegramUrl ? { url: SITE.telegramUrl } : {}) },
    email: { ...CONTENT_DEFAULTS.contact.email, ...(SITE.contactEmail ? { address: SITE.contactEmail } : {}) },
  },
} : CONTENT_DEFAULTS

export function useContent(page) {
  const content = PAGES[page] || {}

  // Kept for component-interface compatibility. Public-site editing is disabled;
  // content changes are made in source and deployed normally.
  const save = async () => undefined
  const reset = async () => undefined

  return { content, save, reset }
}
