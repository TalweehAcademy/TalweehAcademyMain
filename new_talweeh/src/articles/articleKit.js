// Shared helpers for the Wāḥa article pages (/articles and /articles/:slug). Articles come from
// data/articles.js (CMS-merged); every field but the title and content is optional.
import { extractVideoId } from '../utils/youtube'

// A date-only value ("2026-01-08") is read at local noon, so it doesn't slip a day in western time zones.
export const formatDate = (date) => (date ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '')

const blockText = (b) => [b.text, b.translation, ...(b.items || []).map((x) => (typeof x === 'string' ? x : '')), ...(b.rows || []).flat()].filter(Boolean).join(' ')
const words = (article) => (article.content || []).reduce((n, b) => n + blockText(b).split(/\s+/).filter(Boolean).length, 0)
// The CMS read time when set, else an estimate at ~200 words a minute.
export const readTime = (article) => article.readTime || `${Math.max(1, Math.round(words(article) / 200))} min read`

export const embedUrl = (url) => {
  const id = extractVideoId(url)
  if (!id) return null
  return `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams({ modestbranding: '1', playsinline: '1', rel: '0' })}`
}

// Section headings with stable ids, for the contents list beside the article.
export const headingId = (text, i) => `s-${i}-${String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}`
