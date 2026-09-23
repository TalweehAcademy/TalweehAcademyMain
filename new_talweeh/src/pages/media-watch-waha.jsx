/* eslint-disable react/prop-types */
// /media/:slug — the Majlis watch page of the Mawḍūʿ media design (mockups/media-waha-mawdu.html).
// Title over a green stage band, the Talweeh video frame, previous / next and "up next" within the
// topic the viewer came from (?category=, else the video's own topic), then the overview beside a
// card with the teacher, topic, source course and Subscribe; more from the course and topic close it.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import WahaVideoPlayer from '../courses/WahaVideoPlayer'
import { absoluteUrl, useDocumentMeta } from '../hooks/useDocumentMeta'
import { SUBSCRIBE_URL, VIDEOS, findVideo, topicLabel, topicUrl, topicVideos, watchUrl } from '../media/mediaKit'
import '../media-waha-v1.css'

const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
const YT = <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.1 7.2a2.8 2.8 0 0 0-2-2C16.3 4.7 12 4.7 12 4.7s-4.3 0-6.1.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 3.4 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.8.5 6.1.5 6.1.5s4.3 0 6.1-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-4.8 29 29 0 0 0-.5-4.8ZM10.2 15.4V8.6l5.8 3.4-5.8 3.4Z" /></svg>

function VideoCard({ video, topic }) {
  return (
    <Link className="mw-card" to={watchUrl(video, topic)}>
      <span className="th"><img src={video.thumbnail} alt="" loading="lazy" /><span className="pl"><PlayIcon /></span></span>
      <span className="bd"><small>{topicLabel(topic)}</small><strong>{video.title}</strong><span className="sp">{video.speaker}</span>{video.course && <span className="co">From {video.course.title}</span>}</span>
    </Link>
  )
}

export default function MediaWatchWahaPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const video = findVideo(slug)
  const [copied, setCopied] = useState(false)
  const [autoplay, setAutoplay] = useState(false)
  useDocumentMeta({ title: video?.title, description: video?.shortOverview, image: absoluteUrl(video?.thumbnail), path: video ? `/media/${video.slug}` : undefined })
  useEffect(() => { setCopied(false) }, [slug])

  if (!video) {
    return (
      <WahaPage className="cw mw">
        <div className="wh-wrap cw-status"><span className="cw-kicker">Talweeh Media</span><h1>Video not found</h1><p>This video is unavailable.</p><p style={{ marginTop: 18 }}><Link className="wh-btn wh-btn-g" to="/media">Return to Media</Link></p></div>
      </WahaPage>
    )
  }

  const requested = params.get('category')
  const topic = requested && video.categories.includes(requested) ? requested : video.categories[0]
  const list = topicVideos(topic)
  const i = list.findIndex((v) => v.slug === video.slug)
  const prev = list[i - 1], next = list[i + 1]
  const fromCourse = video.course ? VIDEOS.filter((v) => v.slug !== video.slug && v.course?.slug === video.course.slug) : []
  const more = list.filter((v) => v.slug !== video.slug && !fromCourse.includes(v)).slice(0, 6)
  // Navigating on is a click, so the next video may start on its own.
  const go = (v) => { setAutoplay(true); navigate(watchUrl(v, topic)) }
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <WahaPage className="cw mw">
      <div className="wh-wrap">
        <p className="cw-crumbs"><Link to="/media">Media</Link> / <Link to={topicUrl(topic)}>{topicLabel(topic)}</Link> / {video.title}</p>

        <section className="mw-stage">
          <div className="top">
            <div><span className="cw-kicker">{topicLabel(topic)} · {i + 1} of {list.length}</span><h1>{video.title}</h1><p className="by">{video.speaker}</p></div>
            <div className="pn">
              <Link className="wh-btn wh-btn-glass mw-btn-sm" to={topicUrl(topic)}>☰ All in topic</Link>
              {prev && <button type="button" className="wh-btn wh-btn-glass mw-btn-sm" onClick={() => go(prev)}>‹ Previous</button>}
              {next && <button type="button" className="wh-btn wh-btn-g mw-btn-sm" onClick={() => go(next)}>Next ›</button>}
            </div>
          </div>
          <WahaVideoPlayer key={video.slug} videoId={video.youtubeId} title={video.title} kicker={video.speaker} autoplay={autoplay} onEnded={() => next && go(next)} />
          <div className="foot">
            <p className="cw-keys"><kbd>Space</kbd> play · <kbd>←</kbd><kbd>→</kbd> 10 s · <kbd>&lt;</kbd><kbd>&gt;</kbd> speed · <kbd>F</kbd> full screen</p>
            {next && (
              <button type="button" className="mw-upn" onClick={() => go(next)}>
                <img src={next.thumbnail} alt="" /><span><small>Up next in {topicLabel(topic)}</small><strong>{next.title}</strong></span>
              </button>
            )}
          </div>
        </section>

        <section className="mw-body">
          <div>
            <span className="cw-kicker">Overview</span><h2>About this video</h2>
            <div className="mw-ov">{video.overview.split(/\n\n+/).filter((p) => p && !/following link:?\s*$/i.test(p)).map((p, k) => <p key={k}>{p}</p>)}</div>
          </div>
          <aside className="mw-about wh-glass">
            <span className="cw-kicker">In this majlis</span>
            <dl>
              <div><dt>Teacher</dt><dd>{video.speaker}</dd></div>
              <div><dt>Topic</dt><dd><Link to={topicUrl(topic)}>{topicLabel(topic)} →</Link></dd></div>
              <div><dt>Full title on YouTube</dt><dd>{video.fullTitle}</dd></div>
            </dl>
            {video.course && (
              <Link className="mw-cta" to={`/courses/${video.course.slug}`}>
                <span className="i" aria-hidden="true">📜</span>
                <span><small>Excerpt from the course</small><strong>{video.course.title}</strong></span>
                <b>{video.course.free ? 'Watch free →' : 'View course →'}</b>
              </Link>
            )}
            <a className="mw-sub" href={SUBSCRIBE_URL} target="_blank" rel="noreferrer">{YT}<span><strong>Subscribe</strong><small>Talweeh Academy</small></span></a>
            <button type="button" className="wh-btn wh-btn-glass mw-btn-sm mw-copy" onClick={copyLink}>{copied ? '✓ Link copied' : 'Copy link to this video'}</button>
          </aside>
        </section>

        {fromCourse.length > 0 && (
          <section className="mw-more">
            <div className="mw-more-h"><div><span className="cw-kicker">From {video.course.title}</span><h2>More from this course</h2></div><Link className="wh-btn wh-btn-glass mw-btn-sm" to={`/courses/${video.course.slug}`}>{video.course.free ? 'Watch the whole course →' : 'View the course →'}</Link></div>
            <div className="mw-grid">{fromCourse.slice(0, 3).map((v) => <VideoCard key={v.slug} video={v} topic={topic} />)}</div>
          </section>
        )}
        {more.length > 0 && (
          <section className="mw-more">
            <div className="mw-more-h"><div><span className="cw-kicker">Continue watching</span><h2>More in {topicLabel(topic)}</h2></div><Link className="wh-btn wh-btn-glass mw-btn-sm" to={topicUrl(topic)}>All {topicLabel(topic)} →</Link></div>
            <div className="mw-grid">{more.map((v) => <VideoCard key={v.slug} video={v} topic={topic} />)}</div>
          </section>
        )}
      </div>
    </WahaPage>
  )
}
