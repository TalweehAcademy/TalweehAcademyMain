/* eslint-disable react/prop-types */
// /media — "Mawḍūʿ" (mockups/media-waha-mawdu.html). With no ?category= the page asks for a topic:
// one tile per topic with its Arabic name, a line about it and a strip of thumbnails. With
// ?category=<slug> it lists that topic's videos as rows — the video on the left, the title,
// teacher and description on the right — with a topic switcher and a search inside the topic.
// Each row opens the watch page, /media/:slug.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { TOPICS, findTopic, matches, plural, topicUrl, topicVideos, watchUrl } from '../media/mediaKit'
import '../media-waha-v1.css'

const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>

function TopicTile({ topic, wide = false, compact = false }) {
  const vids = topicVideos(topic.slug)
  return (
    <Link className={`mw-tile${wide ? ' wide' : ''}${compact ? ' compact' : ''}`} to={topicUrl(topic.slug)}>
      <span className="mw-tile-bg" aria-hidden="true" />
      <span className="cnt">{plural(vids.length)}</span>
      <span className="in">
        {topic.arabic && <span className="ar" lang="ar">{topic.arabic}</span>}
        <strong>{topic.label}</strong>
        {!compact && topic.blurb && <span className="bl">{topic.blurb}</span>}
        <span className="go">Browse this topic →</span>
      </span>
      {!compact && (
        <span className="strip" aria-hidden="true">
          {vids.slice(0, wide ? 5 : 3).map((v) => <img key={v.slug} src={v.thumbnail} alt="" loading="lazy" />)}
        </span>
      )}
    </Link>
  )
}

function TopicsView() {
  // One wide tile only when it makes the last row of three come out even.
  const wideFirst = (TOPICS.length + 1) % 3 === 0
  return (
    <div className="wh-wrap">
      <section className="mw-hero">
        <div className="ar" lang="ar">وَقُلْ رَبِّ زِدْنِي عِلْمًا</div>
        <h1>What would you like to learn about?</h1>
        <p className="lead">Excerpts, reminders and short lessons from Talweeh Academy, gathered by topic. Choose one to see every video in it, each with a short overview.</p>
      </section>
      <section className="mw-tgrid">{TOPICS.map((t, i) => <TopicTile key={t.slug} topic={t} wide={wideFirst && i === 0} />)}</section>
    </div>
  )
}

function TopicView({ topic }) {
  const [query, setQuery] = useState('')
  const all = topicVideos(topic.slug)
  const list = all.filter((v) => matches(v, query))
  return (
    <div className="wh-wrap">
      <p className="cw-crumbs"><Link to="/media">Media</Link> / {topic.label}</p>
      <section className="mw-thead">
        <div>
          {topic.arabic && <div className="ar" lang="ar">{topic.arabic}</div>}
          <h1>{topic.label}</h1>
          {topic.blurb && <p>{topic.blurb}</p>}
        </div>
        <Link className="wh-btn wh-btn-glass mw-btn-sm" to="/media">← All topics</Link>
      </section>

      <div className="mw-switch">
        <nav className="mw-chips" aria-label="Media topics">
          {TOPICS.map((t) => <Link key={t.slug} className={`mw-chip${t.slug === topic.slug ? ' on' : ''}`} to={topicUrl(t.slug)} aria-current={t.slug === topic.slug ? 'page' : undefined}>{t.label}<b>{t.count}</b></Link>)}
        </nav>
        <label className="mw-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search in ${topic.label}`} aria-label={`Search ${topic.label}`} />
        </label>
      </div>

      <p className="mw-count">{query ? `${list.length} of ${plural(all.length)}` : plural(all.length)}</p>
      <section className="mw-rows">
        {list.map((v) => (
          <Link key={v.slug} className="mw-row" to={watchUrl(v, topic.slug)}>
            <span className="th">
              <img src={v.thumbnail} alt="" loading="lazy" />
              <span className="n">{String(all.indexOf(v) + 1).padStart(2, '0')}</span>
              <span className="pl"><PlayIcon /></span>
            </span>
            <span className="bd">
              <small>{topic.label}</small>
              <strong>{v.title}</strong>
              <span className="sp">{v.speaker}</span>
              <span className="ds">{v.shortOverview.replace(/\s*\n+\s*/g, ' ')}</span>
              <span className="ft">{v.course && <span className="co">From {v.course.title}</span>}<span className="w">Watch →</span></span>
            </span>
          </Link>
        ))}
        {!list.length && <p className="mw-empty">Nothing in {topic.label} matches “{query}” — try another word.</p>}
      </section>

      {TOPICS.length > 1 && (
        <section className="mw-others">
          <span className="cw-kicker">Keep exploring</span><h2>Other topics</h2>
          <div className="mw-tgrid">{TOPICS.filter((t) => t.slug !== topic.slug).map((t) => <TopicTile key={t.slug} topic={t} compact />)}</div>
        </section>
      )}
    </div>
  )
}

export default function MediaWahaPage() {
  const [params] = useSearchParams()
  const topic = findTopic(params.get('category'))
  useDocumentMeta(topic ? { title: `${topic.label} — Media`, description: topic.blurb, path: topicUrl(topic.slug) } : {})
  return (
    <WahaPage className="cw mw">
      {topic ? <TopicView key={topic.slug} topic={topic} /> : <TopicsView />}
    </WahaPage>
  )
}
