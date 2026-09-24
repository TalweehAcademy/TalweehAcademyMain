/* eslint-disable react/prop-types */
// /courses/roadmap — the study roadmap, one of the ways into Courses (next to the Course Library and Free
// Courses). First the sciences to choose from; choosing one (?science=) draws its path as a winding road
// with a stop per level. Hovering a stop previews it (the texts, a line of overview, whether Talweeh teaches
// it); clicking opens the level in full: every text studied at that level with the curriculum document's
// description and objectives, books read alongside and alternatives, the Talweeh course where there is
// one, and room for study tips. Data: data/roadmap.js (the path) and data/roadmapDetails.js (the detail).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useScrollLock } from '../hooks/useScrollLock'
import { LEVEL_NAMES, ROADMAP } from '../data/roadmap'
import { ROADMAP_DETAILS } from '../data/roadmapDetails'
import { PUBLIC_COURSES } from '../data/publicCourseIndex'
import { money } from '../data/commerceCheckout'
import '../roadmap-page-v1.css'

const COURSE = new Map(PUBLIC_COURSES.map((c) => [c.slug, c]))
const taughtIn = (d) => d.levels.flat().filter((s) => s.course).length
const textsIn = (d) => d.levels.flat().length
const detailOf = (s) => ROADMAP_DETAILS[s.code] || {}
const firstSentence = (t = '') => { const m = t.match(/^.{40,220}?[.!?](\s|$)/); return (m ? m[0] : t.slice(0, 200)).trim() }
const overviewOf = (s) => firstSentence(detailOf(s).paras?.[0] || '') || s.note || ''
const coursesFor = (s) => (s.courses || (s.course ? [s.course] : [])).map((k) => COURSE.get(k)).filter(Boolean)

/* ── the path: left to right, wrapping down to a new row like text ── */
// Four looks share one layout: A road, B line with points, C cards on a line, D metro stations.
const STYLES = [['road', 'A · Road'], ['line', 'B · Line'], ['cards', 'C · Cards'], ['metro', 'D · Metro']]
const FLAG_W = { start: 84, end: 104 }
const LOOK = {
  road: { minW: 185, rowH: 250, amp: 22 },
  line: { minW: 180, rowH: 230, amp: 0 },
  cards: { minW: 185, rowH: 260, amp: 0 },
  metro: { minW: 180, rowH: 250, amp: 0 },
}
function useWidth(ref) {
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el); setW(el.clientWidth)
    return () => ro.disconnect()
  }, [ref])
  return w
}

function Route({ d, look, onOpen }) {
  const boxRef = useRef(null)
  const W = useWidth(boxRef)
  const [hover, setHover] = useState(null)
  // Leaving a stop closes its preview after a moment, so the pointer can cross the gap into the preview.
  const closeT = useRef(0)
  const show = (i) => { clearTimeout(closeT.current); setHover(i) }
  const hide = () => { clearTimeout(closeT.current); closeT.current = setTimeout(() => setHover(null), 180) }
  useEffect(() => () => clearTimeout(closeT.current), [])
  const L = LOOK[look]
  const stops = d.levels.map((lv, i) => ({ lv, i })).filter((x) => x.lv.length)
  // On wider screens the Begin and Mastery flags get lanes of their own at either end, so they never sit on a
  // stop; on a phone (one stop per row) there is room for them beside the centred stop anyway.
  const wide = (W || 1000) >= 600
  const x0 = wide ? 14 + FLAG_W.start + 14 : 0, x1 = (W || 1000) - (wide ? 14 + FLAG_W.end + 14 : 0)
  const per = Math.max(1, Math.min(stops.length, Math.floor((x1 - x0) / L.minW)))
  const colW = (x1 - x0) / per
  const top = 70
  // Metro rows grow with the longest list of texts in them.
  const rowHs = []
  for (let r = 0; r * per < stops.length; r++) {
    const most = Math.max(...stops.slice(r * per, r * per + per).map((s) => Math.min(s.lv.length, 4)))
    rowHs.push(look === 'metro' ? L.rowH + (most - 1) * 30 : L.rowH)
  }
  const rowY = (r) => top + rowHs.slice(0, r).reduce((a, b) => a + b, 0)
  const pts = stops.map((s, k) => { const r = Math.floor(k / per), c = k % per; return { ...s, r, c, x: x0 + colW * (c + 0.5), y: rowY(r) } })
  const H = rowY(rowHs.length) - 30
  const edge = 14
  const start = { x: wide ? edge + FLAG_W.start / 2 : Math.max(edge + FLAG_W.start / 2, (pts[0]?.x || 0) - colW * 0.45), y: pts[0]?.y || top }
  const last = pts.at(-1) || start
  const end = { x: wide ? (W || 1000) - edge - FLAG_W.end / 2 : Math.min((W || 1000) - edge - FLAG_W.end / 2, last.x + colW * 0.45), y: last.y }
  let path = `M ${start.x} ${start.y} L ${pts[0]?.x} ${pts[0]?.y}`
  pts.forEach((p, k) => {
    const q = pts[k + 1]
    if (!q) return
    if (q.r === p.r) {
      const dx = q.x - p.x, s = k % 2 ? -1 : 1
      path += ` C ${p.x + dx / 2} ${p.y - L.amp * s}, ${q.x - dx / 2} ${q.y + L.amp * s}, ${q.x} ${q.y}`
    } else {
      // Wrap: out to the right edge, down, back along under the row to the left edge, and in.
      const R = W || 1000, turn = q.y - 58
      path += ` C ${R - edge} ${p.y}, ${R - edge} ${turn}, ${R - edge - 40} ${turn} L ${edge + 40} ${turn} C ${edge} ${turn}, ${edge} ${q.y}, ${q.x} ${q.y}`
    }
  })
  path += ` L ${end.x} ${end.y}`

  const peekSide = (p) => (p.c === 0 ? 'al' : p.c === per - 1 ? 'ar' : 'ac')
  return (
    <div className={`rp-route look-${look}`} ref={boxRef} style={{ height: H }}>
      {W > 0 && <>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {look === 'road' && <path d={path} className="rt-asphalt" />}
          <path d={path} className="rt-line" />
          {look === 'road' && <path d={path} className="rt-centre" />}
        </svg>
        <span className="rp-flag start" style={{ left: start.x, top: start.y }}>Begin</span>
        <span className="rp-flag end" style={{ left: end.x, top: end.y }}>Mastery</span>
        {pts.map((p) => {
          const lit = p.lv.some((s) => s.course)
          const hv = hover === p.i
          const events = { onFocus: () => show(p.i), onBlur: hide, onClick: () => onOpen(p.i) }
          return (
            <div key={p.i} className={`rt-stop${lit ? ' lit' : ''}${hv ? ' hov' : ''}`} style={{ left: p.x, top: p.y, width: Math.min(colW - 16, 250) }}
              onMouseEnter={() => show(p.i)} onMouseLeave={hide}>
              {look === 'cards' ? (
                <button type="button" className="rt-card" {...events}>
                  <span className="n">{p.i + 1}</span>
                  <small>Level {p.i + 1} · {LEVEL_NAMES[p.i]}</small>
                  <strong>{p.lv.slice(0, 2).map((s) => s.text).join(' · ')}{p.lv.length > 2 ? ` + ${p.lv.length - 2}` : ''}</strong>
                  {lit ? <em>✓ Taught at Talweeh</em> : <em className="no">Not yet at Talweeh</em>}
                </button>
              ) : (
                <>
                  <button type="button" className="rt-pin" aria-label={`Level ${p.i + 1}`} {...events}><span>{p.i + 1}</span></button>
                  <button type="button" className="rt-label" tabIndex={-1} {...events}>
                    <small>Level {p.i + 1} · {LEVEL_NAMES[p.i]}</small>
                    {look === 'metro'
                      ? <ul>{p.lv.slice(0, 4).map((s, j) => <li key={j} className={s.course ? 'lit' : ''}><i />{j === 3 && p.lv.length > 4 ? `+ ${p.lv.length - 3} more` : s.text}</li>)}</ul>
                      : <><strong>{p.lv.slice(0, 2).map((s) => s.text).join(' · ')}{p.lv.length > 2 ? ` + ${p.lv.length - 2} more` : ''}</strong>{lit && <em>✓ Taught at Talweeh</em>}</>}
                  </button>
                </>
              )}
              {hv && (
                <Peek side={peekSide(p)} onOpen={() => onOpen(p.i)}>
                  {p.lv.slice(0, 3).map((s) => (
                    <div key={s.code + s.text}>
                      <small>{s.code}{s.path ? ` · ${s.path} path` : ''}</small>
                      <strong>{s.text}</strong>
                      {overviewOf(s) && <p>{overviewOf(s)}</p>}
                      {s.course ? <span className="rp-yes">✓ Taught at Talweeh</span> : <span className="rp-no">Not yet taught at Talweeh</span>}
                    </div>
                  ))}
                  {p.lv.length > 3 && <p className="rp-more">+ {p.lv.length - 3} more texts at this level</p>}
                  <span className="rp-hint">Click for the full level →</span>
                </Peek>
              )}
            </div>
          )
        })}
      </>}
    </div>
  )
}

// The preview opens on whichever side of its stop has room on screen right now: below if it fits between the
// stop and the bottom of the window (or the footer, if that is higher), otherwise above if it fits under the
// sticky header, otherwise on the roomier side with the overview lines dropped so it is shorter.
function Peek({ side, onOpen, children }) {
  const ref = useRef(null)
  const [fit, setFit] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || fit) return
    const stop = el.parentElement.getBoundingClientRect(), h = el.offsetHeight
    const foot = document.querySelector('.wh-footer')?.getBoundingClientRect().top ?? Infinity
    const head = document.querySelector('.wh-head')?.getBoundingClientRect().bottom ?? 0
    const below = Math.min(window.innerHeight, foot) - 12 - (stop.bottom + 8)
    const above = stop.top - 40 - (head + 12)
    setFit(h <= below ? 'down' : h <= above ? 'up' : above > below ? 'up tight' : 'down tight')
  }, [fit])
  const cls = side.replace(' up', '') + (fit ? ` ${fit}` : '')
  return <div ref={ref} className={`rp-peek ${cls}`} style={fit ? undefined : { visibility: 'hidden' }} role="tooltip" onClick={onOpen}>{children}</div>
}

/* ── the level pop-up ── */
function LevelModal({ d, i, onClose, onGo }) {
  useScrollLock(i != null)
  const boxRef = useRef(null)
  useEffect(() => {
    if (i == null) return undefined
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    boxRef.current?.scrollTo(0, 0); boxRef.current?.focus()
    return () => window.removeEventListener('keydown', k)
  }, [i, onClose])
  if (i == null) return null
  const lv = d.levels[i]
  const filled = d.levels.map((l, k) => (l.length ? k : -1)).filter((k) => k >= 0)
  const at = filled.indexOf(i), prev = filled[at - 1], next = filled[at + 1]
  // Books beyond the level's main texts: the document's "also read", alternatives and notes.
  const extras = lv.flatMap((s) => { const x = detailOf(s); return [...(x.alsoRead || []).map((t) => ['Also read', t]), ...(x.notes || []).map((t) => ['Alongside', t]), ...(x.alternatives || []).map((t) => ['Elsewhere', t])] })
  return (
    <div className="rp-modal">
      <div className="rp-ov" onClick={onClose} aria-hidden="true" />
      <div className="rp-box" role="dialog" aria-modal="true" aria-labelledby="rp-mh" ref={boxRef} tabIndex={-1}>
        <button type="button" className="rp-x" onClick={onClose} aria-label="Close">✕</button>
        <span className="cw-kicker">{d.name} · Level {i + 1} of {d.levels.length}</span>
        <h2 id="rp-mh">{LEVEL_NAMES[i]}</h2>
        <p className="rp-sub">{lv.length === 1 ? 'The text studied at this level' : `${lv.length} texts are studied at this level${lv.some((s) => s.path) ? ' — one on each path' : ''}`}</p>

        {lv.map((s) => {
          const x = detailOf(s), cs = coursesFor(s)
          return (
            <article key={s.code + s.text} className={`rp-book${s.course ? ' lit' : ''}`}>
              <div className="rp-bh">
                <div><small>{s.code}{s.path ? ` · ${s.path} path` : ''}</small><h3>{s.text}</h3>{s.note && <em>{s.note}</em>}</div>
                {cs.length > 0 ? <span className="rp-yes">✓ Taught at Talweeh</span> : <span className="rp-no">Not yet taught at Talweeh</span>}
              </div>
              {x.books?.length > 0 && <p className="rp-books">Texts: {x.books.join(' · ')}</p>}
              {x.paras?.map((p, k) => <p key={k}>{p}</p>)}
              {x.objectives?.length > 0 && <><h4>What you will learn</h4><ul>{x.objectives.map((o, k) => <li key={k}>{o}</li>)}</ul></>}
              {!x.paras?.length && !x.objectives?.length && <p className="rp-soon">A description of this text will be added soon.</p>}
              {cs.length > 0 && (
                <div className="rp-courses">{cs.map((c) => (
                  <Link key={c.slug} className="rp-course" to={`/courses/${c.slug}`}>
                    {c.poster && <img src={c.poster} alt="" />}
                    <span><small>Talweeh course</small><strong>{c.title}</strong><em>{c.instructor}{c.lessonCount ? ` · ${c.lessonCount} lessons` : ''}</em></span>
                    <b>{c.free ? 'Free →' : `${c.priceCents ? money(c.priceCents, c.currency) : 'View'} →`}</b>
                  </Link>
                ))}</div>
              )}
            </article>
          )
        })}

        {extras.length > 0 && (
          <section className="rp-extra"><h4>Other books at this level</h4>
            <ul>{extras.map(([k, t], n) => <li key={n}><b>{k}</b>{t}</li>)}</ul>
          </section>
        )}
        <section className="rp-tips"><h4>How to study this level</h4><p>Study tips for this level — how to read these texts, what to memorise, and how to revise — will be added here soon.</p></section>

        <div className="rp-nav">
          {prev != null ? <button type="button" className="wh-btn wh-btn-glass rp-btn" onClick={() => onGo(prev)}>‹ Level {prev + 1}</button> : <span />}
          {next != null ? <button type="button" className="wh-btn wh-btn-g rp-btn" onClick={() => onGo(next)}>Level {next + 1} ›</button> : <Link className="wh-btn wh-btn-g rp-btn" to="/courses" onClick={onClose}>Browse all courses →</Link>}
        </div>
      </div>
    </div>
  )
}

/* ── the page ── */
function SciencePicker({ on, look }) {
  return (
    <div className="rp-sciences">
      {ROADMAP.map((d) => {
        const first = d.levels.find((l) => l.length)?.[0]
        return (
          <Link key={d.k} className={`rp-sci${d.k === on ? ' on' : ''}`} to={`?science=${d.k}${look ? `&look=${look}` : ''}`} replace={Boolean(on)} preventScrollReset>
            <span className="ar" lang="ar">{d.ar}</span>
            <strong>{d.name}</strong>
            {d.sub && <small>{d.sub}</small>}
            <span className="rp-meta"><i><b style={{ width: `${(taughtIn(d) / textsIn(d)) * 100}%` }} /></i>{d.levels.filter((l) => l.length).length} levels · {taughtIn(d)} at Talweeh</span>
            {first && <span className="rp-first">Start with <b>{first.text}</b></span>}
          </Link>
        )
      })}
    </div>
  )
}

export default function RoadmapWahaPage() {
  const [params, setParams] = useSearchParams()
  const d = ROADMAP.find((x) => x.k === params.get('science')) || null
  const look = STYLES.some(([k]) => k === params.get('look')) ? params.get('look') : 'metro'
  const pickLook = (k) => { const p = new URLSearchParams(params); p.set('look', k); setParams(p, { replace: true, preventScrollReset: true }) }
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])
  useDocumentMeta({ title: d ? `${d.name} — Study roadmap` : 'Study roadmap', description: 'For each Islamic science, the texts to study level by level — and which of them Talweeh teaches.' })
  useEffect(() => setOpen(null), [d?.k])
  const roadRef = useRef(null)
  // Choosing a science brings its road into view.
  useLayoutEffect(() => { if (d && roadRef.current) roadRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [d?.k]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WahaPage className="cw rp" overlays={d && <LevelModal d={d} i={open} onClose={close} onGo={setOpen} />}>
      <div className="wh-wrap">
        <p className="cw-crumbs"><Link to="/courses">Courses</Link> / Study roadmap{d && <> / {d.name}</>}</p>
        <section className="rp-hero">
          <span className="cw-kicker">Study roadmap</span>
          <h1>Where to begin, and what comes next</h1>
          <p>Choose a science to see its path: the texts studied level by level, from the first primer to the advanced works — and which of them you can study with Talweeh today.</p>
        </section>

        <section className="rp-pick"><div className="rp-pick-h"><h2>{d ? 'Choose another science' : 'Choose a science'}</h2><span>{ROADMAP.length} sciences</span></div><SciencePicker on={d?.k} look={params.get('look')} /></section>

        {d && (
          <section className="rp-path" ref={roadRef}>
            <div className="rp-path-h">
              <div><span className="ar" lang="ar">{d.ar}</span><h2>{d.name}{d.sub && <small> · {d.sub}</small>}</h2><p>{d.blurb}</p></div>
              <div className="rp-legend"><span><i className="lit" />Taught at Talweeh</span><span><i />Not yet at Talweeh</span><span className="tip">Hover a stop to preview · click for the full level</span></div>
            </div>
            {import.meta.env.DEV && (
              <div className="rp-dev" role="group" aria-label="Path design (local preview only)">
                <span>Path design (local preview):</span>
                {STYLES.map(([k, l]) => <button key={k} type="button" className={k === look ? 'on' : ''} onClick={() => pickLook(k)}>{l}</button>)}
              </div>
            )}
            <Route d={d} look={look} onOpen={setOpen} />
            {(d.also || []).length > 0 && (
              <div className="rp-also"><span>Also at Talweeh in {d.name}:</span>{d.also.map((k) => COURSE.get(k)).filter(Boolean).map((c) => <Link key={c.slug} to={`/courses/${c.slug}`}>{c.title}</Link>)}</div>
            )}
          </section>
        )}
      </div>
    </WahaPage>
  )
}
