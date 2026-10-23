/* eslint-disable react/prop-types */
// /start — "Find your starting point": the goal, the science (only for "one science"), where they are now and how
// they want to learn, then one course to start with, two options, where it leads and a live programme if wanted.
// All of it runs in the browser; nothing is saved or sent. The result's answers ride in the hash
// (/start#one-fiqh-1-self) so the link can be kept or shared. Placement data and rules: data/startGuide.js.
// Styles: start-guide-v1.css (sg-); the panel is a .wh-glass card like the rest of the site.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { money } from '../data/commerceCheckout'
import { COURSE, GOALS, LEVELS, MODES, MODULES, PLAN, PROGRAMMES, SUBJECTS, countOf, decode, encode, recommend } from '../data/startGuide'
import '../courses-waha-v1.css'
import '../start-guide-v1.css'

const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
const Back = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
const steps = (a) => ['goal', ...(a.goal === 'one' ? ['sub'] : []), 'level', 'mode']
const priceOf = (c) => (c.free ? 'Free · every lesson' : c.priceCents ? money(c.priceCents, c.currency) : 'Paid course')

function Options({ items, value, onPick }) {
  return (
    <div className="sg-opts" role="radiogroup">
      {items.map((o, i) => {
        const v = o.k ?? i
        return (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={`sg-opt${value === v ? ' on' : ''}`} onClick={() => onPick(v)}>
            <span className="sg-mk" aria-hidden="true" />
            <span><b>{o.b}</b><span>{o.s}</span>{o.e && <em>{o.e}</em>}</span>
          </button>
        )
      })}
    </div>
  )
}

// The result as a short plan (owner chose layout A, 2026-10-13): numbered steps, each with its own button, sized by
// how much it matters: step 1 gold, step 2 outlined, the rest as rows with "View →". What they asked for comes first:
// a live programme when they chose live, the Arabic Program for Arabic, otherwise the course to start with.
function Card({ to, poster, title, meta, tag, tagKind, btn, gold }) {
  return (
    <div className="sg-pcard">
      {poster && <img src={poster} alt="" loading="lazy" />}
      <div className="sg-pcard-t"><h4>{title}</h4>{meta && <span className="sg-meta">{meta}</span>}{tag && <span className={`sg-tag${tagKind ? ` ${tagKind}` : ''}`}>{tag}</span>}</div>
      {btn && <Link className={`wh-btn ${gold ? 'wh-btn-g' : 'wh-btn-glass'} sg-pbtn`} to={to}>{btn}{gold && <Arrow />}</Link>}
    </div>
  )
}
const courseCard = (slug, gold, btn) => {
  const c = COURSE.get(slug)
  return <Card to={`/courses/${slug}`} poster={c.poster} title={c.title} meta={`${c.instructor}${c.lessonCount ? ` · ${c.lessonCount} lessons` : ''}`} tag={priceOf(c)} tagKind={c.free ? 'free' : ''} btn={btn || (c.free ? 'Start free' : 'Go to the course')} gold={gold} />
}
const progCard = (p, gold, btn = 'See the programme') => <Card to={p.to} title={p.t} meta={p.s} tag="Live classes" tagKind="live" btn={btn} gold={gold} />
function Rows({ items }) {
  return (
    <div className="sg-rows">{items.map((x) => x.to
      ? <Link key={x.key} className="sg-row" to={x.to}><span><b>{x.title}</b><span>{x.sub}</span></span><span className="sg-go">View →</span></Link>
      : <div key={x.key} className="sg-row"><span><b>{x.title}</b><span>{x.sub}</span></span></div>)}</div>
  )
}
const courseRow = (slug, label) => { const c = COURSE.get(slug); return { key: slug, to: `/courses/${slug}`, title: c.title, sub: `${label ? `${label} · ` : ''}${priceOf(c)} · ${c.instructor}` } }

// The course after `slug` in its science's order of study, if Talweeh teaches it.
function nextAfter(k, slug) {
  const seq = PLAN[k]?.seq || []
  const i = seq.findIndex((x) => (x.group ? x.group.includes(slug) : x === slug))
  for (const x of seq.slice(i + 1)) {
    const s = x.group ? x.group.find((g) => COURSE.has(g)) : x
    if (typeof s === 'string' && COURSE.has(s)) return s
  }
  return null
}

function Leads({ k, cur }) {
  const p = PLAN[k]
  if (!p || p.seq.length < 2) return null
  const names = p.seq.map((x) => (x.soon ? x.soon : x.group ? x.name : COURSE.get(x)?.title)).filter(Boolean)
  const at = p.seq.findIndex((x) => (x.group ? x.group.includes(cur) : x === cur))
  return <p className="sg-leads"><b>{p.name} after that:</b> {names.slice(Math.max(at, 0) + 1, Math.max(at, 0) + 4).join(' → ') || names.join(' → ')} · <Link to={`/courses/roadmap?science=${p.roadmap}`}>See it on the Roadmap</Link></p>
}

function Result({ a, onRestart }) {
  const r = recommend(a), M = r.module, whole = M?.n === 1
  const [copied, setCopied] = useState(false)
  const steps = []
  const used = new Set()
  const take = (slug) => { used.add(slug); return slug }
  const rest = (label) => r.alts.filter((x) => x.slug && !used.has(x.slug)).map((x) => courseRow(x.slug, label === undefined ? x.label : label))

  if (M) {
    // Arabic (and the Qurʾān): the live classes are the ʿĀlimiyyah, whose first years are mainly Arabic; the Arabic
    // Program is on demand. Live: the ʿĀlimiyyah first, the Arabic Program second; at own pace or either: the Arabic
    // Program, with the ʿĀlimiyyah below for a teacher (either).
    const live = a.mode === 'live'
    if (live) steps.push({ k: 'Join the live classes', why: 'The ʿĀlimiyyah’s first years are mainly Arabic, with a teacher and a class.', body: progCard(PROGRAMMES.alim, true) })
    steps.push({ k: live ? `Or on demand: the Arabic Program${whole ? '' : ` · from Module ${M.n}`}` : whole ? 'Take the full programme' : `Join at Module ${M.n}`,
      why: whole ? 'You’re at the start of Arabic, so the full programme takes you from Module 1, step by step, at your own pace.' : `At ${LEVELS[a.level].b.toLowerCase()} level you’d join at Module ${M.n}: ${M.texts.join(', ')}.`,
      body: <Card to="/arabic" title={`Arabic Program${whole ? '' : ` · Module ${M.n}`}`} meta={whole ? 'Two years, five modules, from your first Arabic sentence to linguistic tafsīr' : `${M.name} · ${M.d}`} tag="On demand" btn="See the Arabic Program" gold={!live} /> })
    steps.push({ k: 'Check your level', body: <Card to="/arabic/assessment" title="Arabic assessment" meta="Free · about 10 minutes · tells you which module to start with" btn="Take the assessment" /> })
    const rows = r.alts.filter((x) => x.slug).map((x) => courseRow(x.slug, ''))
    if (rows.length) steps.push({ k: 'Or one course on its own', rows })
    if (a.mode === 'either') steps.push({ k: 'If you’d like a teacher', rows: [{ key: 'prog', to: PROGRAMMES.alim.to, title: PROGRAMMES.alim.t, sub: 'Live classes · its first years are mainly Arabic' }] })
  } else if (r.further) {
    steps.push({ k: 'Study it further with a teacher', why: r.why, body: progCard(r.prog, true) })
    const rows = rest('As a review')
    if (rows.length) steps.push({ k: 'Or review on your own', rows })
  } else {
    const liveFirst = a.mode === 'live' && r.prog
    if (liveFirst) steps.push({ k: 'Join the live classes', body: progCard(r.prog, true) })
    if (r.soon) steps.push({ k: 'Coming soon', body: <Card title={r.soon} meta="Your starting point; it isn’t on the site yet" tag="Coming soon" /> })
    if (r.start) {
      take(r.start)
      steps.push({ k: liveFirst ? 'Until classes begin, start on your own' : r.soon ? 'Until then, start with' : 'Start here', why: r.why, body: courseCard(r.start, !liveFirst) })
      const next = nextAfter(r.path, r.start)
      if (next && !liveFirst && !used.has(next)) { take(next); r.shown = next; steps.push({ k: 'Then', body: courseCard(next, false, 'View the course') }) }
    } else if (r.why) steps.push({ k: 'Where to begin', why: r.why })
    const rows = rest()
    if (r.prog && !liveFirst) rows.push({ key: 'prog', to: r.prog.to, title: r.prog.t, sub: `If you’d like a teacher · ${r.prog.s}` })
    if (rows.length) steps.push({ k: liveFirst ? 'Then, at the same stage' : 'Alongside', rows })
  }

  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800) }
    navigator.clipboard?.writeText(`${window.location.origin}/start#${encode(a)}`).then(done, () => {})
  }
  return (
    <div className="sg-res">
      <p className="sg-sum">{GOALS.find((x) => x.k === a.goal).b}{a.sub ? ` · ${PLAN[a.sub].name}` : ''} · {LEVELS[a.level].b} · {MODES.find((x) => x.k === a.mode).b}</p>
      <ol className="sg-plan">
        {steps.map((s, i) => (
          <li key={i} className={`sg-st${s.rows ? ' later' : ''}`}>
            <span className="sg-num" aria-hidden="true">{i + 1}</span>
            <div className="sg-st-b">
              <small className="sg-k">{s.k}</small>
              {s.body}
              {s.rows && <Rows items={s.rows} />}
              {s.why && <p className="sg-st-why">{s.why}</p>}
            </div>
          </li>
        ))}
      </ol>
      {M ? <p className="sg-leads"><b>The five modules:</b> {MODULES.map((m) => `${m.n} ${m.name}`).join(' → ')} · <Link to="/arabic">About the programme</Link></p> : <Leads k={r.path} cur={r.shown || r.start} />}
      <div className="sg-help"><span>Not quite right? Studied somewhere else, or want to talk it through?</span><Link className="wh-btn wh-btn-glass" to="/contact-us">Message us</Link></div>
      <div className="sg-foot"><button type="button" className="sg-link" onClick={copy}>{copied ? 'Link copied' : 'Copy a link to this result'}</button><button type="button" className="wh-btn wh-btn-glass" onClick={onRestart}>Start over</button></div>
    </div>
  )
}

// The guide itself: on the /start page (popup = false) the result's answers ride in the hash; in the popup
// (components/StartGuideHost.jsx) the address is left alone and the panel scrolls instead of the page.
export function StartGuide({ popup = false }) {
  const first = !popup && typeof window !== 'undefined' ? decode(window.location.hash) : null
  const [a, setA] = useState(first || {})
  const [step, setStep] = useState(first ? steps(first).length : 0)
  const headRef = useRef(null)
  const timer = useRef(0)
  const qs = steps(a), total = qs.length, done = step >= total
  useEffect(() => () => clearTimeout(timer.current), [])
  // A result link opened while already on the page (only the hash changes) shows that result.
  useEffect(() => {
    if (popup) return undefined
    const on = () => { const x = decode(window.location.hash); if (x) { setA(x); setStep(steps(x).length) } }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [popup])
  // The hash holds the answers once the result shows, and clears while answering.
  useEffect(() => {
    if (popup) return
    const url = window.location.pathname + window.location.search + (done ? `#${encode(a)}` : '')
    window.history.replaceState(window.history.state, '', url)
  }, [done, a, popup])
  const cardRef = useRef(null)
  // Each new question (and the result) starts at the top of the card, below the sticky header.
  useEffect(() => {
    if (step === 0) return
    headRef.current?.focus({ preventScroll: true })
    const el = cardRef.current
    if (!el) return
    if (popup) { const box = el.closest('.sg-pop-panel'); if (box) box.scrollTo({ top: 0, behavior: 'smooth' }) }
    else if (el.getBoundingClientRect().top < 90) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step, popup])

  const pick = (key, v) => {
    const next = { ...a, [key]: v }
    if (key === 'goal' && v !== 'one') delete next.sub
    setA(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStep((s) => s + 1), 260)
  }
  const restart = () => { setA({}); setStep(0) }
  const q = qs[step]

  return (
    <section className={popup ? 'sg-card sg-card-pop' : 'sg-card wh-glass'} aria-live="polite" ref={cardRef}>
      <div className="sg-top">
        <button type="button" className="sg-back" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} aria-label="Back"><Back /></button>
        <div className="sg-prog" aria-hidden="true">{qs.map((_, i) => <i key={i} className={i < step + (done ? 0 : 1) ? 'on' : ''} />)}</div>
        <span className="sg-count">{done ? 'Your result' : `${step + 1} of ${total}`}</span>
      </div>

      {done ? <Result a={a} onRestart={restart} /> : (
        <div className="sg-q" key={q}>
          {q === 'goal' && <><h2 ref={headRef} tabIndex={-1}>What would you like to study?</h2><Options items={GOALS} value={a.goal} onPick={(v) => pick('goal', v)} /></>}
          {q === 'sub' && <><h2 ref={headRef} tabIndex={-1}>Which science?</h2><p className="sg-hint">Sciences with Talweeh courses today.</p>
            <div className="sg-chips">{SUBJECTS.map(([k, n]) => <button key={k} type="button" className={`sg-chip${a.sub === k ? ' on' : ''}`} aria-pressed={a.sub === k} onClick={() => pick('sub', k)}>{n}<small>{countOf(k)}</small></button>)}</div></>}
          {q === 'level' && <><h2 ref={headRef} tabIndex={-1}>Where are you now?</h2><p className="sg-hint">Pick the one closest to what you’ve already finished.</p><Options items={LEVELS} value={a.level} onPick={(v) => pick('level', v)} /></>}
          {q === 'mode' && <><h2 ref={headRef} tabIndex={-1}>How would you like to learn?</h2><Options items={MODES} value={a.mode} onPick={(v) => pick('mode', v)} /></>}
          <div className="sg-foot">
            <small>{q === 'level' && (a.goal === 'arabic' || a.goal === 'quran') ? <>Unsure? The <Link to="/arabic/assessment">Arabic assessment</Link> checks it in about 10 minutes.</> : 'Nothing is saved or sent.'}</small>
            <button type="button" className="wh-btn wh-btn-g" disabled={a[q] === undefined} onClick={() => setStep((s) => s + 1)}>{step === total - 1 ? 'See my starting point' : 'Next'} <Arrow /></button>
          </div>
        </div>
      )}
    </section>
  )
}

export default function StartGuidePage() {
  useDocumentMeta({ title: 'Find your starting point', description: 'Not sure where to begin? Four short questions, then the Talweeh course or programme to start with, and where it leads.' })
  return (
    <WahaPage className="cw sg-page">
      <div className="wh-wrap">
        <p className="cw-crumbs"><Link to="/courses">Courses</Link> / Find your starting point</p>
        <section className="sg-hero">
          <span className="cw-kicker">Not sure where to begin?</span>
          <h1>Find your starting point</h1>
          <p>Four short questions, then the course or programme to start with and where it leads. Nothing is saved or sent.</p>
        </section>
        <StartGuide />
      </div>
    </WahaPage>
  )
}
