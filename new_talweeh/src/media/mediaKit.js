// Shared helpers for the Mawḍūʿ media pages (/media and /media/:slug).
// Videos come from mediaCatalog.js; titles, teachers, topic names and course links from mediaTopics.js.
import { MEDIA_CATEGORIES, MEDIA_ITEMS, mediaCategoryLabel } from '../data/mediaCatalog'
import { MEDIA_TOPIC_INFO, MEDIA_VIDEO_INFO } from '../data/mediaTopics'
import { PUBLIC_COURSES } from '../data/publicCourseIndex'

const splitTitle = (full = '') => {
  const [title, ...rest] = full.split(/\s*\|\s*/)
  return { title: title.trim(), speaker: rest.join(' · ').trim() || 'Talweeh Academy' }
}

export const VIDEOS = MEDIA_ITEMS.map((item) => {
  const info = MEDIA_VIDEO_INFO[item.slug] || splitTitle(item.title)
  const course = info.course ? PUBLIC_COURSES.find((c) => c.slug === info.course) : null
  return {
    ...item,
    fullTitle: item.title,
    title: info.title,
    speaker: info.speaker,
    course: course ? { slug: course.slug, title: course.title, free: Boolean(course.free) } : null,
  }
})

export const topicLabel = (slug) => MEDIA_TOPIC_INFO[slug]?.label || mediaCategoryLabel(slug)
export const topicVideos = (slug) => VIDEOS.filter((v) => v.categories.includes(slug))

// Every topic from the catalog, largest first; topics with no videos yet are left out.
export const TOPICS = MEDIA_CATEGORIES
  .filter((c) => c.slug !== 'all')
  .map((c) => ({ slug: c.slug, label: topicLabel(c.slug), arabic: MEDIA_TOPIC_INFO[c.slug]?.arabic || '', blurb: MEDIA_TOPIC_INFO[c.slug]?.blurb || '', count: topicVideos(c.slug).length }))
  .filter((t) => t.count > 0)
  .sort((a, b) => b.count - a.count)

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
