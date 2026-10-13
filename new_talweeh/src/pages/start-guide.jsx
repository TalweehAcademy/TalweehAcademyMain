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
import { COURSE, GOALS, LEVELS, MODES, MODULES, PLAN, SUBJECTS, countOf, decode, encode, recommend } from '../data/startGuide'
import '../courses-waha-v1.css'
import '../start-guide-v1.css'

const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
const Back = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
const Info = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
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

function CourseCard({ slug, kicker, why }) {
  const c = COURSE.get(slug)
  return (
    <div className="sg-start">
      <div className="sg-start-row">
        {c.poster && <img src={c.poster} alt="" loading="lazy" />}
        <div className="sg-start-t"><span className="cw-kicker">{kicker}</span><h3>{c.title}</h3><p>{c.instructor}{c.lessonCount ? ` · ${c.lessonCount} lessons` : ''}</p></div>
        <span className={`sg-tag${c.free ? ' free' : ''}`}>{priceOf(c)}</span>
      </div>
      {why && <p className="sg-why"><Info />{why}</p>}
      <div className="sg-acts"><Link className="wh-btn wh-btn-g" to={`/courses/${slug}`}>Go to the course <Arrow /></Link></div>
    </div>
  )
}

function Path({ k, cur }) {
  const p = PLAN[k]
  if (!p || p.seq.length < 2) return null
  return (
    <div className="sg-path">
      <div className="sg-path-h"><small>Where it leads · {p.name}</small><Link to={`/courses/roadmap?science=${p.roadmap}`}>See it on the Study Roadmap →</Link></div>
      <ol>{p.seq.map((x, i) => {
        const here = x.group ? x.group.includes(cur) : x === cur
        const label = x.soon ? x.soon : x.group ? x.name : COURSE.get(x)?.title
        if (!label) return null
        return <li key={i} className={`${here ? 'here' : ''}${x.soon ? ' soon' : ''}`}>{label}{x.soon && <small> · coming soon</small>}</li>
      })}</ol>
    </div>
  )
}

function Result({ a, onRestart }) {
  const r = recommend(a), M = r.module, whole = M?.n === 1
  const [copied, setCopied] = useState(false)
  const prog = r.prog && (
    <Link className="sg-alt sg-progm" to={r.prog.to}>
      <small>{r.further ? 'Study it further with a teacher' : a.mode === 'live' ? 'Live with a teacher' : 'If you’d like a teacher'}</small>
      <b>{r.prog.t}</b><span>{r.prog.s}</span>
    </Link>
  )
  const liveFirst = a.mode === 'live' && r.prog && !r.further
  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800) }
    navigator.clipboard?.writeText(`${window.location.origin}/start#${encode(a)}`).then(done, () => {})
  }
  return (
    <div className="sg-res">
      <p className="sg-sum">{GOALS.find((x) => x.k === a.goal).b}{a.sub ? ` · ${PLAN[a.sub].name}` : ''} · {LEVELS[a.level].b} · {MODES.find((x) => x.k === a.mode).b}</p>
      {M && (
        <div className="sg-start">
          <div className="sg-start-row">
            <div className="sg-start-t"><span className="cw-kicker">{whole ? 'Start here · the full programme' : `Start here · join at Module ${M.n}`}</span>
              <h3>Arabic Program{whole ? '' : ` · Module ${M.n}`}</h3>
              <p>{whole ? 'Two years, five modules, from your first Arabic sentence to linguistic tafsīr' : `${M.name} · ${M.d}`}</p></div>
            <span className="sg-tag">{whole ? 'Modules 1–2 mostly live' : M.f}</span>
          </div>
          <p className="sg-why"><Info />{whole
            ? `You’re at the start of Arabic, so the full programme takes you from Module 1, step by step.${a.mode === 'self' ? ' Modules 1 and 2 are mostly live classes.' : ''}`
            : `At ${LEVELS[a.level].b.toLowerCase()} level you’d join at Module ${M.n}: ${M.texts.join(', ')}.`} The Arabic assessment checks your level in about 10 minutes.</p>
          <div className="sg-acts"><Link className="wh-btn wh-btn-g" to="/arabic">See the Arabic Program <Arrow /></Link><Link className="wh-btn wh-btn-glass" to="/arabic/assessment">Take the Arabic assessment</Link></div>
        </div>
      )}
      {liveFirst && <>{prog}<span className="cw-kicker sg-gap">Meanwhile, at your own pace</span></>}
      {r.soon && <div className="sg-alt sg-soon"><small>Coming soon · your starting point</small><b>{r.soon}</b><span>It isn’t on the site yet.{r.start ? ' Until then:' : ''}</span></div>}
      {r.start ? <CourseCard slug={r.start} kicker={r.soon ? 'Start with' : 'Start here'} why={r.why} /> : r.why && <p className="sg-why sg-why-solo"><Info />{r.why}</p>}
      {r.alts.length > 0 && (
        <div className="sg-alts">{r.alts.map((x) => x.soon
          ? <div key={x.soon} className="sg-alt sg-soon"><small>{x.label}</small><b>{x.soon}</b><span>Being added as its own course</span></div>
          : <Link key={x.slug} className="sg-alt" to={`/courses/${x.slug}`}><small>{x.label}</small><b>{COURSE.get(x.slug).title}</b><span>{priceOf(COURSE.get(x.slug))} · {COURSE.get(x.slug).instructor}</span></Link>)}
        </div>
      )}
      {M ? (
        <div className="sg-path"><div className="sg-path-h"><small>The five modules</small><Link to="/arabic">About the programme →</Link></div>
          <ol>{MODULES.map((m) => <li key={m.n} className={`${m.n === M.n ? 'here' : ''}${m.n < M.n ? ' done' : ''}`}>{m.n} · {m.name}</li>)}</ol></div>
      ) : <Path k={r.path} cur={r.start} />}
      {!liveFirst && !M && prog}
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
