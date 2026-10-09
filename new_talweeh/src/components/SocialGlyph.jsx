/* eslint-disable react/prop-types */
// Social icons, drawn the same way in every header and footer (the Wāḥa shell and the older PageHeader / PageFooter):
// thin line drawings that take the link's colour (styles in social-icons.css). Unknown labels fall back to the CMS
// "icon" glyph.
const SOCIAL_ICONS = {
  'X / Twitter': (
    <>
      <path d="M4.5 4h4.2l10.8 16h-4.2z" />
      <path d="M19.2 4l-6.4 7.1M4.8 20l6.4-7.1" />
    </>
  ),
  YouTube: (
    <>
      <path d="M2.6 7.6a3 3 0 0 1 2.6-2.5C7.4 4.8 9.7 4.7 12 4.7s4.6.1 6.8.4a3 3 0 0 1 2.6 2.5c.2 1.4.3 2.9.3 4.4s-.1 3-.3 4.4a3 3 0 0 1-2.6 2.5c-2.2.3-4.5.4-6.8.4s-4.6-.1-6.8-.4a3 3 0 0 1-2.6-2.5C2.4 15 2.3 13.5 2.3 12s.1-3 .3-4.4z" />
      <path d="M10.2 9.3v5.4l4.6-2.7z" />
    </>
  ),
  Telegram: (
    <>
      <path d="M20.8 4.2 3.4 10.9c-.8.3-.8 1.4 0 1.7l4.4 1.4 1.7 5.3c.2.7 1.1.9 1.6.4l2.5-2.4 4.4 3.2c.6.5 1.5.1 1.7-.6l3-14.4c.2-.9-.7-1.6-1.6-1.3z" />
      <path d="m7.8 14 9.4-6.7-6.6 7.6" />
    </>
  ),
  Instagram: (
    <>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle className="dot" cx="17.3" cy="6.7" r="1.1" />
    </>
  ),
  WhatsApp: (
    <>
      <path d="M3.6 20.4l1.2-4.1A8.6 8.6 0 1 1 8 19.3z" />
      <path d="M9.1 8.7c-.3.9 0 2.2 1 3.4s2.4 2.1 3.4 2.3c.6.1 1.1-.2 1.4-.7l.3-.5-1.8-1-.8.6c-.7-.3-1.4-1-1.8-1.8l.6-.8-1-1.8-.5.3c-.4.2-.7.5-.8 1z" />
    </>
  ),
  // TikTok: the note with its curl; Facebook: the "f" in a rounded square (same thin line style).
  TikTok: (
    <>
      <path d="M13.5 4v10.6a3.6 3.6 0 1 1-3.6-3.6" />
      <path d="M13.5 4c.4 2.5 2.2 4.3 5 4.5" />
    </>
  ),
  Facebook: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M15.5 8.2h-1.6c-1 0-1.7.8-1.7 1.8V20M10 12.8h5" />
    </>
  ),
}

export default function SocialGlyph({ label, fallback = '' }) {
  const icon = SOCIAL_ICONS[label]
  return icon
    ? <svg className="social-glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
    : fallback
}
