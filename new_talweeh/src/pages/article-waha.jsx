/* eslint-disable react/prop-types */
// /articles/:slug — one article in the Wāḥa design, set for reading: title and meta over the page,
// the text on paper in a comfortable measure with a drop cap, a contents list of its sections that
// follows the reader (with a progress line), then more articles and the way to the courses.
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { absoluteUrl, useDocumentMeta } from '../hooks/useDocumentMeta'
import { ARTICLES, getArticleBySlug } from '../data/articles'
import { formatDate, headingId, readTime } from '../articles/articleKit'
import WahaVideoPlayer from '../courses/WahaVideoPlayer'
import { youTubeId } from '../courses/courseKit'
import '../articles-waha-v1.css'

const isInternal = (url) => url.startsWith('/') && !/\.[a-z0-9]{2,4}$/i.test(url)
function Out({ url, className, children }) {
  if (isInternal(url)) return <Link className={className} to={url}>{children}</Link>
  return <a className={className} href={url} target="_blank" rel="noreferrer">{children}</a>
}

// Paragraph text with each of its links' labels linked where they first appear (as whole words).
function Linked({ text, links = [] }) {
  let parts = [text]
  links.forEach((l, k) => {
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part]
      const m = part.match(new RegExp(`(^|[^\\p{L}])(${l.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=$|[^\\p{L}])`, 'u'))
      if (!m) return [part]
      const at = m.index + m[1].length
      return [part.slice(0, at), <Out key={`l${k}`} url={l.url}>{l.label}</Out>, part.slice(at + l.label.length)]
    })
  })
  return <>{parts}</>
}

// A family of works drawn in the page: root, groups, and nested nodes whose connector shows the relation
// (the source chart's legend: black commentary, green dashed abridgment, red dashed supplement/critique,
// blue ḥadīth sourcing). Branches can be folded.
const REL = {
  sharh: { en: 'Commentary', ar: 'شرح' },
  mukhtasar: { en: 'Abridgment', ar: 'مختصر' },
  mustadrak: { en: 'Supplement / critique', ar: 'مستدرك' },
  takhrij: { en: 'Ḥadīth sourcing', ar: 'تخريج' },
}
function TreeNode({ node }) {
  const [open, setOpen] = useState(true)
  const kids = node.children || []
  return (
    <li className={`r-${node.rel}`}>
      <div className="nd">
        <span className="t">{node.t}</span>
        {node.d && <span className="d">ت. {node.d}</span>}
        {(node.also || []).map((x) => <span key={x.to} className={`also r-${x.rel}`} title={REL[x.rel]?.en}>{REL[x.rel]?.ar} ← {x.to}</span>)}
        {kids.length > 0 && <button type="button" className="fold" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={open ? 'Fold' : 'Unfold'}>{open ? '−' : `+${kids.length}`}</button>}
      </div>
      {kids.length > 0 && open && <ul>{kids.map((k) => <TreeNode key={k.t} node={k} />)}</ul>}
    </li>
  )
}
function WorksTree({ b }) {
  return (
    <figure className="at-tree">
      <figcaption>
        <span className="cw-kicker">The family of works</span>
        <strong>{b.title}</strong>
        <span className="legend">{Object.entries(REL).map(([k, v]) => <span key={k} className={`r-${k}`}><i />{v.en}</span>)}</span>
      </figcaption>
      <div className="body" dir="rtl" lang="ar">
        <div className="root">{b.root}</div>
        <div className="groups">
          {b.groups.map((g) => (
            <section key={g.ar} className="grp">
              <h4><span>{g.ar}</span><small lang="en">{g.en}</small></h4>
              <ul>{g.children.map((k) => <TreeNode key={k.t} node={k} />)}</ul>
            </section>
          ))}
        </div>
      </div>
    </figure>
  )
}

// Videos play in the Talweeh video frame, as on the course and media pages.
function Video({ url, title }) {
  const id = youTubeId(url)
  if (!id) return null
  return <div className="at-video-frame"><WahaVideoPlayer videoId={id} title={title} kicker="Talweeh Academy" /></div>
}

export default function ArticleWahaPage() {
  const { slug } = useParams()
  const a = getArticleBySlug(slug)
  useDocumentMeta({ title: a?.title, description: a?.excerpt, image: absoluteUrl(a?.imageUrl) })
  const [progress, setProgress] = useState(0)
  const [on, setOn] = useState('')
  const [copied, setCopied] = useState(false)

  const sections = useMemo(() => (a?.content || []).map((b, i) => ({ ...b, i })).filter((b) => b.type === 'heading').map((b) => ({ text: b.text, id: headingId(b.text, b.i) })), [a])

  // Reading progress and the section in view.
  useEffect(() => {
    if (!a) return undefined
    const onScroll = () => {
      const body = document.getElementById('at-body')
      if (!body) return
      const r = body.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6
      setProgress(Math.min(1, Math.max(0, -r.top / Math.max(1, total))))
      let cur = ''
      for (const s of sections) { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) cur = s.id }
      setOn(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [a, sections])

  if (!a) {
    return (
      <WahaPage className="cw at">
        <div className="wh-wrap at-missing"><span className="cw-kicker">Articles</span><h1>Article not found</h1><p>This article is unavailable.</p><Link className="wh-btn wh-btn-g" to="/articles">Back to articles</Link></div>
      </WahaPage>
    )
  }

  const more = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3)
  const copy = () => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1600) }
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  let firstPara = true

  return (
    <WahaPage className="cw at" overlays={<div className="at-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />}>
      <div className="wh-wrap">
        <p className="cw-crumbs"><Link to="/articles">Articles</Link>{a.category && <> / {a.category}</>} / {a.title}</p>
        <header className="at-head">
          <span className="cw-kicker">{a.category || 'Article'}</span>
          <h1>{a.title}</h1>
          <div className="meta">
            <span className="by"><img src="/brand/talweeh-seal-gold.png" alt="" />{a.author || 'Talweeh Academy'}</span>
            {a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}
            <span>{readTime(a)}</span>
          </div>
        </header>
        {a.imageUrl && <img className="at-cover" src={a.imageUrl} alt="" />}

        <div className="at-read">
          <aside className="at-toc">
            {sections.length > 0 && (
              <nav className="wh-glass" aria-label="In this article">
                <span className="cw-kicker">In this article</span>
                <i className="bar" aria-hidden="true"><b style={{ transform: `scaleY(${progress})` }} /></i>
                {sections.map((s, k) => <button type="button" key={s.id} className={on === s.id ? 'on' : ''} onClick={() => go(s.id)}><b>{String(k + 1).padStart(2, '0')}</b>{s.text}</button>)}
              </nav>
            )}
            <div className="acts">
              <button type="button" className="wh-btn wh-btn-glass at-btn-sm" onClick={copy}>{copied ? '✓ Link copied' : 'Copy link'}</button>
              <Link className="wh-btn wh-btn-glass at-btn-sm" to="/articles">All articles</Link>
            </div>
          </aside>

          <article className="at-paper" id="at-body">
            <Video url={a.youtubeUrl} title={a.title} />
            {(a.content || []).map((b, i) => {
              if (b.type === 'heading') return <h2 key={i} id={headingId(b.text, i)}><span className="orn" aria-hidden="true">✦</span>{b.text}</h2>
              if (b.type === 'subheading') return <h3 key={i}>{b.text}</h3>
              if (b.type === 'video') return <Video key={i} url={b.url} title={b.title || a.title} />
              if (b.type === 'tree') return <WorksTree key={i} b={b} />
              if (b.type === 'image') return <figure key={i} className="at-fig"><img src={b.src} alt={b.alt || ''} loading="lazy" />{b.caption && <figcaption>{b.caption}</figcaption>}</figure>
              if (b.type === 'buttons') return <div key={i} className="at-buttons">{b.items.map((x) => <Out key={x.url} url={x.url} className="wh-btn wh-btn-g at-btn-sm">{x.label} →</Out>)}</div>
              if (b.type === 'table') {
                const [head, ...rows] = b.header ? b.rows : [null, ...b.rows]
                return <div key={i} className="at-table"><table>{head && <thead><tr>{head.map((c) => <th key={c}>{c}</th>)}</tr></thead>}<tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
              }
              if (b.type === 'list') { const L = b.ordered ? 'ol' : 'ul'; return <L key={i} className="at-list">{b.items.map((x, k) => <li key={k}>{x}</li>)}</L> }
              if (b.type === 'verse') return <blockquote key={i} className="at-verse"><p className="arabic" lang="ar" dir="rtl">{b.arabic}</p>{b.translation && <p className="tr">{b.translation}</p>}</blockquote>
              if (b.type === 'references') return <ol key={i} className="at-refs">{b.items.map((x, k) => <li key={k}>{x}</li>)}</ol>
              // A bracketed editor's note reads as a note, not as the opening paragraph.
              if (/^\[.*\]$/s.test(b.text || '')) return <p key={i} className="note"><Linked text={b.text.slice(1, -1)} links={b.links} /></p>
              const cls = firstPara ? 'lead' : undefined
              firstPara = false
              return <p key={i} className={cls}><Linked text={b.text} links={b.links} /></p>
            })}
            <div className="end" aria-hidden="true">✦ ✦ ✦</div>
          </article>
        </div>

        {more.length > 0 && (
          <section className="at-more">
            <div className="at-sec-h"><span className="cw-kicker">Keep reading</span><h2>More articles</h2></div>
            <div className="at-grid">{more.map((x) => (
              <Link className="at-card" key={x.slug} to={`/articles/${x.slug}`}>
                {x.imageUrl && <img src={x.imageUrl} alt="" loading="lazy" />}
                <div><span className="meta">{x.category && <b>{x.category}</b>}<span>{readTime(x)}</span></span><h3>{x.title}</h3>{x.excerpt && <p>{x.excerpt}</p>}<span className="go">Read →</span></div>
              </Link>
            ))}</div>
          </section>
        )}

        <section className="at-cta">
          <span className="cw-kicker">Go deeper</span>
          <h2>Study these questions with a teacher.</h2>
          <p>Talweeh’s courses take you through the classical texts behind articles like this one, lesson by lesson.</p>
          <div className="acts"><Link className="wh-btn wh-btn-g" to="/courses">Browse courses →</Link><Link className="wh-btn wh-btn-glass" to="/articles">More articles</Link></div>
        </section>
      </div>
    </WahaPage>
  )
}
