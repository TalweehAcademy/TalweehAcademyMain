/* eslint-disable react/prop-types */
// /media — the Media home: a featured video, "Continue watching" (this device), the newest videos, short reminders
// (the academy's Reels, when switched on in the portal), then one row per topic; one search box looks through every
// video. /media?category=<slug> — a topic: its videos as a grid, with teacher, book and order filters and a search.
// Each card opens the watch page, /media/:slug. Data: src/media/mediaKit.js (the portal's Media when published).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import {
  FEATURED, LATEST, SHORTS, TOPICS, VIDEOS, findTopic, matches, plural, recentlyWatched, topicUrl, topicVideos, watchUrl,
} from '../media/mediaKit'
import '../media-waha-v1.css'
import '../media-v2.css'

const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
const oneLine = (text = '') => text.replace(/\s*\n+\s*/g, ' ')

function VideoCard({ video, topic, detailed = false }) {
  return (
    <Link className={`mv-card${detailed ? ' is-detailed' : ''}`} to={watchUrl(video, topic)}>
      <span className="mv-th">
        <img src={video.thumbnail} alt="" loading="lazy" />
        <span className="mv-pl"><PlayIcon /></span>
      </span>
      <span className="mv-bd">
        <strong>{video.title}</strong>
        <span className="mv-sp">{video.speaker}</span>
        {detailed && video.shortOverview && <span className="mv-ds">{oneLine(video.shortOverview)}</span>}
        {detailed && video.course && <span className="mv-co">From {video.course.title}</span>}
      </span>
    </Link>
  )
}

// A row you swipe on phones, with ‹ › on wider screens (each press moves about one screenful).
function Row({ kicker, title, arabic, count, seeAll, children }) {
  const ref = useRef(null)
  const move = (dir) => { const el = ref.current; if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' }) }
  return (
    <section className="mv-row">
      <header>
        <div>
          {kicker && <span className="cw-kicker">{kicker}</span>}
          <h2>{arabic && <span className="ar" lang="ar">{arabic}</span>}{title}{count ? <small>{plural(count)}</small> : null}</h2>
        </div>
        <div className="mv-row-ctl">
          {seeAll && <Link className="mv-all" to={seeAll}>See all →</Link>}
          <button type="button" aria-label={`Scroll ${title} back`} onClick={() => move(-1)}>‹</button>
          <button type="button" aria-label={`Scroll ${title} on`} onClick={() => move(1)}>›</button>
        </div>
      </header>
      <div className="mv-track" ref={ref}>{children}</div>
    </section>
  )
}

// Short reminders: vertical cards; one plays in a window over the page (YouTube, no cookies until played).
// A new order on each visit (after the first paint, so the prerendered page and the browser agree).
const shuffled = (list) => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function Shorts() {
  const [open, setOpen] = useState(null)
  const [list, setList] = useState(SHORTS)
  useEffect(() => { setList(shuffled(SHORTS)) }, [])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (!SHORTS.length) return null
  return (
    <>
      <Row kicker="In a minute" title="Short reminders">
        {list.map((s) => (
          <button key={s.youtubeId} type="button" className={s.upright ? 'mv-short' : 'mv-short mv-short--wide'} onClick={() => setOpen(s)}>
            {/* The upright picture fills the card; without one, the wide picture is shown whole over a blurred copy of itself. */}
            {!s.upright && <img className="mv-short-bg" src={`https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`} alt="" loading="lazy" />}
            <img src={`https://i.ytimg.com/vi/${s.youtubeId}/${s.upright || 'hqdefault'}.jpg`} alt="" loading="lazy" />
            <span className="mv-pl"><PlayIcon /></span>
            {s.title && <span className="mv-short-t"><span>{s.title}</span></span>}
          </button>
        ))}
      </Row>
      {open && (
        <div className="mv-modal" role="dialog" aria-modal="true" aria-label={open.title || 'Short reminder'} onClick={() => setOpen(null)}>
          <div className="mv-modal-in" onClick={(e) => e.stopPropagation()}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${open.youtubeId}?autoplay=1&rel=0`} title={open.title || 'Short reminder'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            <button type="button" className="mv-modal-x" aria-label="Close" onClick={() => setOpen(null)}>×</button>
          </div>
        </div>
      )}
    </>
  )
}

function MediaHome() {
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState([])
  useEffect(() => { setRecent(recentlyWatched()) }, [])
  const results = useMemo(() => (query.trim() ? VIDEOS.filter((v) => matches(v, query)) : []), [query])
  const f = FEATURED
  return (
    <div className="wh-wrap">
      <section className="mv-hero">
        <div className="ar" lang="ar">وَقُلْ رَبِّ زِدْنِي عِلْمًا</div>
        <h1>Media</h1>
        <p className="lead">Excerpts, reminders and short lessons from Talweeh Academy: {plural(VIDEOS.length)} in {TOPICS.length} topics.</p>
        <label className="mv-search">
          <SearchIcon />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every video: a title, a teacher, a book…" aria-label="Search all videos" />
        </label>
        <nav className="mv-topics" aria-label="Topics">
          {TOPICS.map((t) => <Link key={t.slug} to={topicUrl(t.slug)}>{t.label}<b>{t.count}</b></Link>)}
        </nav>
      </section>

      {query.trim() ? (
        <section className="mv-results">
          <p className="mw-count">{results.length ? `${plural(results.length)} for “${query.trim()}”` : `Nothing matches “${query.trim()}”. Try another word.`}</p>
          <div className="mv-grid">{results.map((v) => <VideoCard key={v.slug} video={v} detailed />)}</div>
        </section>
      ) : (
        <>
          {f && (
            <Link className="mv-feature" to={watchUrl(f)}>
              <span className="mv-feature-th"><img src={`https://i.ytimg.com/vi/${f.youtubeId}/maxresdefault.jpg`} onError={(e) => { e.currentTarget.src = f.thumbnail }} alt="" /><span className="mv-pl is-big"><PlayIcon /></span></span>
              <span className="mv-feature-bd">
                <span className="cw-kicker">{f.featured ? 'Featured' : 'Newest'}{f.categories[0] ? ` · ${TOPICS.find((t) => t.slug === f.categories[0])?.label ?? ''}` : ''}</span>
                <strong>{f.title}</strong>
                <span className="mv-sp">{f.speaker}</span>
                {f.shortOverview && <span className="mv-ds">{oneLine(f.shortOverview)}</span>}
                {f.course && <span className="mv-co">From {f.course.title}</span>}
                <span className="wh-btn wh-btn-g mv-watch">Watch now →</span>
              </span>
            </Link>
          )}

          {recent.length > 0 && <Row kicker="On this device" title="Continue watching">{recent.map((v) => <VideoCard key={v.slug} video={v} />)}</Row>}
          <Row kicker="Just added" title="Latest">{LATEST.slice(0, 12).map((v) => <VideoCard key={v.slug} video={v} />)}</Row>
          <Shorts />
          {TOPICS.map((t) => (
            <Row key={t.slug} kicker="Topic" title={t.label} arabic={t.arabic} count={t.count} seeAll={topicUrl(t.slug)}>
              {topicVideos(t.slug).map((v) => <VideoCard key={v.slug} video={v} topic={t.slug} />)}
            </Row>
          ))}
        </>
      )}
    </div>
  )
}

function TopicView({ topic }) {
  const all = topicVideos(topic.slug)
  const [query, setQuery] = useState('')
  const [teacher, setTeacher] = useState('')
  const [book, setBook] = useState('')
  const [order, setOrder] = useState('topic')
  const teachers = [...new Set(all.map((v) => v.speaker))].sort()
  const books = [...new Map(all.filter((v) => v.course).map((v) => [v.course.slug, v.course.title])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  let list = all.filter((v) => matches(v, query) && (!teacher || v.speaker === teacher) && (!book || v.course?.slug === book))
  if (order === 'newest') list = [...list].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || b.order - a.order)
  if (order === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
  const filtered = Boolean(query || teacher || book)
  return (
    <div className="wh-wrap">
      <p className="cw-crumbs"><Link to="/media">Media</Link> / {topic.label}</p>
      <section className="mw-thead">
        <div>
          {topic.arabic && <div className="ar" lang="ar">{topic.arabic}</div>}
          <h1>{topic.label}</h1>
          {topic.blurb && <p>{topic.blurb}</p>}
        </div>
        <Link className="wh-btn wh-btn-glass mw-btn-sm" to="/media">← All media</Link>
      </section>

      <nav className="mw-chips mv-chips" aria-label="Media topics">
        {TOPICS.map((t) => <Link key={t.slug} className={`mw-chip${t.slug === topic.slug ? ' on' : ''}`} to={topicUrl(t.slug)} aria-current={t.slug === topic.slug ? 'page' : undefined}>{t.label}<b>{t.count}</b></Link>)}
      </nav>

      <div className="mv-filters">
        <label className="mw-search"><SearchIcon /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search in ${topic.label}`} aria-label={`Search ${topic.label}`} /></label>
        {teachers.length > 1 && <label className="mv-select"><span>Teacher</span><select value={teacher} onChange={(e) => setTeacher(e.target.value)}><option value="">All</option>{teachers.map((t) => <option key={t}>{t}</option>)}</select></label>}
        {books.length > 0 && <label className="mv-select"><span>From</span><select value={book} onChange={(e) => setBook(e.target.value)}><option value="">Any book</option>{books.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}</select></label>}
        <label className="mv-select"><span>Order</span><select value={order} onChange={(e) => setOrder(e.target.value)}><option value="topic">Suggested</option><option value="newest">Newest</option><option value="az">A–Z</option></select></label>
      </div>

      <p className="mw-count">{filtered ? `${list.length} of ${plural(all.length)}` : plural(all.length)}</p>
      <div className="mv-grid">{list.map((v) => <VideoCard key={v.slug} video={v} topic={topic.slug} detailed />)}</div>
      {!list.length && <p className="mw-empty">Nothing in {topic.label} matches. Try another word or filter.</p>}

      {TOPICS.length > 1 && (
        <section className="mv-others">
          <span className="cw-kicker">Keep exploring</span><h2>Other topics</h2>
          <div className="mv-topic-cards">
            {TOPICS.filter((t) => t.slug !== topic.slug).map((t) => (
              <Link key={t.slug} to={topicUrl(t.slug)} className="mv-topic-card">
                <span className="mv-topic-thumbs" aria-hidden="true">{topicVideos(t.slug).slice(0, 3).map((v) => <img key={v.slug} src={v.thumbnail} alt="" loading="lazy" />)}</span>
                {t.arabic && <span className="ar" lang="ar">{t.arabic}</span>}
                <strong>{t.label}</strong><small>{plural(t.count)}</small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function MediaWahaPage() {
  const [params] = useSearchParams()
  const topic = findTopic(params.get('category'))
  useDocumentMeta(topic ? { title: `${topic.label} — Media`, description: topic.blurb, path: topicUrl(topic.slug) } : { title: 'Media', path: '/media' })
  return (
    <WahaPage className="cw mw mv">
      {topic ? <TopicView key={topic.slug} topic={topic} /> : <MediaHome />}
    </WahaPage>
  )
}
