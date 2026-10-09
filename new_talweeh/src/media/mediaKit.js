// Shared helpers for the Mawḍūʿ media pages (/media and /media/:slug).
// Videos come from the portal (homeFeed.json) when published there, else mediaCatalog.js with titles, teachers,
// topic names and course links from mediaTopics.js.
import { MEDIA_CATEGORIES, MEDIA_ITEMS, mediaCategoryLabel } from '../data/mediaCatalog'
import { MEDIA_TOPIC_INFO, MEDIA_VIDEO_INFO } from '../data/mediaTopics'
import { PUBLIC_COURSES } from '../data/publicCourseIndex'
import HOME_FEED from '../data/homeFeed.json'

const splitTitle = (full = '') => {
  const [title, ...rest] = full.split(/\s*\|\s*/)
  return { title: title.trim(), speaker: rest.join(' · ').trim() || 'Talweeh Academy' }
}

// The portal's Media (Admin → Website CMS → Media, pulled by scripts/sync-home-feed.mjs into homeFeed.json) when it
// has been published; else the site's own catalogue above.
const FEED = HOME_FEED.media && Array.isArray(HOME_FEED.media.items) && HOME_FEED.media.items.length ? HOME_FEED.media : null
// A course chosen in the portal arrives as its portal id (the catalogue's portalId); the starting videos as the
// site's own course address.
const courseFor = (slug, portalId = null) => {
  const course = (portalId && PUBLIC_COURSES.find((c) => c.portalId === portalId)) || (slug ? PUBLIC_COURSES.find((c) => c.slug === slug) : null)
  return course ? { slug: course.slug, title: course.title, free: Boolean(course.free) } : null
}

export const VIDEOS = FEED
  ? FEED.items.map((item, index) => ({
    slug: item.slug,
    youtubeId: item.youtubeId,
    youtubeUrl: `https://www.youtube.com/watch?v=${item.youtubeId}`,
    thumbnail: `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`,
    categories: item.topics || [],
    fullTitle: `${item.title} | ${item.speaker}`,
    title: item.title,
    speaker: item.speaker,
    overview: item.overview || '',
    shortOverview: item.shortOverview || item.overview || '',
    course: courseFor(item.course, item.courseId),
    featured: Boolean(item.featured),
    addedAt: item.addedAt || '',
    order: index,
  }))
  : MEDIA_ITEMS.map((item, index) => {
    const info = MEDIA_VIDEO_INFO[item.slug] || splitTitle(item.title)
    return { ...item, fullTitle: item.title, title: info.title, speaker: info.speaker, course: courseFor(info.course), featured: false, addedAt: '', order: index }
  })

export const topicLabel = (slug) => (FEED ? FEED.topics.find((t) => t.slug === slug)?.label : null) || MEDIA_TOPIC_INFO[slug]?.label || mediaCategoryLabel(slug)
export const topicVideos = (slug) => VIDEOS.filter((v) => v.categories.includes(slug))

// Topics: in the portal's order when published there, else largest first; topics with no videos are left out.
export const TOPICS = (FEED
  ? FEED.topics.map((t) => ({ slug: t.slug, label: t.label, arabic: t.arabic || '', blurb: t.blurb || '', count: topicVideos(t.slug).length }))
  : MEDIA_CATEGORIES.filter((c) => c.slug !== 'all')
    .map((c) => ({ slug: c.slug, label: topicLabel(c.slug), arabic: MEDIA_TOPIC_INFO[c.slug]?.arabic || '', blurb: MEDIA_TOPIC_INFO[c.slug]?.blurb || '', count: topicVideos(c.slug).length }))
    .sort((a, b) => b.count - a.count))
  .filter((t) => t.count > 0)

// The newest first: by when it was added in the portal, else the catalogue's own order read backwards.
export const LATEST = [...VIDEOS].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || b.order - a.order)
// Leads the Media page: the video featured in the portal, else the newest.
export const FEATURED = VIDEOS.find((v) => v.featured) || LATEST[0] || null
// Short reminders: Reels posted to YouTube, when switched on in the portal.
export const SHORTS = FEED && Array.isArray(FEED.shorts) ? FEED.shorts : []
export const TEACHERS = [...new Set(VIDEOS.map((v) => v.speaker))].sort()

// "Continue watching": the videos opened on this device, newest first (kept in the visitor's own browser only).
const RECENT_KEY = 'talweeh-media-recent'
export function rememberWatched(slug) {
  try {
    const list = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]').filter((s) => s !== slug)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([slug, ...list].slice(0, 12)))
  } catch { /* private window: nothing kept */ }
}
export function recentlyWatched() {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]').map((slug) => VIDEOS.find((v) => v.slug === slug)).filter(Boolean)
  } catch { return [] }
}

export const findTopic = (slug) => TOPICS.find((t) => t.slug === slug) || null
export const findVideo = (slug) => VIDEOS.find((v) => v.slug === slug) || null

export const topicUrl = (slug) => `/media?category=${encodeURIComponent(slug)}`
// The topic travels with the video only when it isn't the video's own first topic.
export const watchUrl = (video, topic) => `/media/${video.slug}${topic && topic !== video.categories[0] ? `?category=${encodeURIComponent(topic)}` : ''}`

export const matches = (video, query) => {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return `${video.title} ${video.speaker} ${video.shortOverview} ${video.course?.title || ''}`.toLowerCase().includes(needle)
}

export const plural = (n) => `${n} ${n === 1 ? 'video' : 'videos'}`
export const SUBSCRIBE_URL = 'https://www.youtube.com/@Talweeh.Academy?sub_confirmation=1'
