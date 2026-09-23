/* eslint-disable react/prop-types */
// /articles — the article library in the Wāḥa design. The newest article leads as a feature on paper;
// the rest follow as cards. Topic chips appear once articles carry categories; search covers titles
// and excerpts. Articles come from data/articles.js (CMS-merged).
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { ARTICLES } from '../data/articles'
import { formatDate, readTime } from '../articles/articleKit'
import '../articles-waha-v1.css'

const byDate = [...ARTICLES].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))

function Meta({ a }) {
  return <span className="meta">{a.category && <b>{a.category}</b>}{a.author && <span>{a.author}</span>}{a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}<span>{readTime(a)}</span></span>
}

function Feature({ a }) {
  return (
    <Link className="at-feature" to={`/articles/${a.slug}`}>
      <div className="paper">
        <span className="cw-kicker">Latest article</span>
        <h2>{a.title}</h2>
        <Meta a={a} />
        {a.excerpt && <p className="ex">{a.excerpt}</p>}
        <span className="go">Read the article →</span>
      </div>
      <div className="art">
        {a.imageUrl ? <img src={a.imageUrl} alt="" /> : <span className="orn" aria-hidden="true"><i>✦</i><b>Talweeh Academy</b><small>Articles &amp; essays</small></span>}
      </div>
    </Link>
  )
}

function Card({ a }) {
  return (
    <Link className="at-card" to={`/articles/${a.slug}`}>
      {a.imageUrl && <img src={a.imageUrl} alt="" loading="lazy" />}
      <div>
        <Meta a={a} />
        <h3>{a.title}</h3>
        {a.excerpt && <p>{a.excerpt}</p>}
        <span className="go">Read →</span>
      </div>
    </Link>
  )
}

export default function ArticlesWahaPage() {
  useDocumentMeta({ title: 'Articles' })
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const cats = useMemo(() => ['All', ...new Set(ARTICLES.map((a) => a.category).filter(Boolean))], [])
  const needle = q.trim().toLowerCase()
  const list = byDate.filter((a) => (cat === 'All' || a.category === cat) && (!needle || `${a.title} ${a.excerpt || ''} ${a.category || ''}`.toLowerCase().includes(needle)))
  const [first, ...rest] = list
  const browsing = cat !== 'All' || needle

  return (
    <WahaPage className="cw at">
      <div className="wh-wrap">
        <section className="at-hero">
          <span className="cw-kicker">Talweeh Academy · Articles</span>
          <h1>Essays from the <em>Islamic sciences</em></h1>
          <p>Short studies from our teachers on uṣūl, fiqh, ḥadīth, theology and the Arabic sciences — written to be read slowly.</p>
        </section>

        {(cats.length > 1 || ARTICLES.length > 4) && (
          <div className="at-tools">
            {cats.length > 1 && <div className="at-chips" role="group" aria-label="Topics">{cats.map((c) => <button type="button" key={c} className={c === cat ? 'on' : ''} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}</div>}
            <label className="at-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" aria-label="Search articles" /></label>
          </div>
        )}

        {!list.length && <p className="at-empty">No articles match{needle ? ` “${q}”` : ''} — try another topic or word.</p>}
        {first && !browsing && <Feature a={first} />}
        {(browsing ? list : rest).length > 0 && (
          <section className="at-more">
            {!browsing && <div className="at-sec-h"><span className="cw-kicker">More to read</span><h2>Earlier articles</h2></div>}
            <div className="at-grid">{(browsing ? list : rest).map((a) => <Card key={a.slug} a={a} />)}</div>
          </section>
        )}

        <section className="at-cta">
          <span className="cw-kicker">Keep learning</span>
          <h2>Study these sciences in depth.</h2>
          <p>Our articles open doors; our courses walk you through the texts behind them with a teacher.</p>
          <div className="acts"><Link className="wh-btn wh-btn-g" to="/courses">Browse courses →</Link><Link className="wh-btn wh-btn-glass" to="/media">Watch lessons in Media</Link></div>
        </section>
      </div>
    </WahaPage>
  )
}
