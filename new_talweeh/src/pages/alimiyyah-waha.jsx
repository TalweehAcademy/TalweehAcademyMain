/* eslint-disable react/prop-types */
// /alimiyyah — "Kitāb + Minhāj" (mockups/alimiyyah-waha-kitab-minhaj.html). A title page on paper,
// the three benefits, the mission and the five foundations as arched cards, then the curriculum as
// a bound volume: a fihris of the ten years beside an open two-page spread that turns page by page
// (buttons or ← →). The book is one size for every year; a fuller year's list of texts shrinks to fit.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { ALIM } from '../data/alimiyyahWaha'
import '../alimiyyah-waha-v1.css'

const ORD = ['الأُولَى', 'الثَّانِيَة', 'الثَّالِثَة', 'الرَّابِعَة', 'الخَامِسَة', 'السَّادِسَة', 'السَّابِعَة', 'الثَّامِنَة', 'التَّاسِعَة', 'العَاشِرَة']
const yearAr = (n) => `السَّنَةُ ${ORD[n - 1]}`
const famCount = (y, k) => y.subjects.filter((s) => s.fam === k).length
const VAL_AR = { 'ʿIlm': 'عِلْم', 'ʿAmal': 'عَمَل', Discipline: 'اِنْضِبَاط', Tazkiyah: 'تَزْكِيَة', Adab: 'أَدَب' }
const FACTS = [['Duration', 'Full year'], ['Format', 'Online · Part-time'], ['Learning', 'Live + recorded lessons']]
const BENEFITS = [
  ['01 / Connect', 'Learn together, live', 'Interactive classes connect you with real-time instruction and opportunities to engage with your learning.'],
  ['02 / Revisit', 'Make room for study', 'High-quality recorded lessons support flexible learning at your own pace. Recordings are available for selected sessions.'],
  ['03 / Serve', 'Study with purpose', 'Connect the depth of the traditional curriculum with practical, contemporary applications and the needs of Muslim communities in the West.'],
]
const YEARS = ALIM.YEARS
const LAST = YEARS.length
const MIN_SCALE = 0.72

// The open spread for one year: its introduction on the left, its texts on the right.
function Spread({ y }) {
  const listRef = useRef(null)
  // Shrink the list of texts (down to MIN_SCALE) until it fits the fixed page; scroll inside it beyond that.
  const fit = useCallback(() => {
    const w = listRef.current
    if (!w) return
    const pg = w.parentElement
    w.classList.remove('scroll')
    let s = 1
    pg.style.setProperty('--s', s)
    if (window.matchMedia('(max-width:1000px)').matches) return
    while (w.scrollHeight > w.clientHeight + 1 && s > MIN_SCALE) { s = +(s - 0.04).toFixed(2); pg.style.setProperty('--s', s) }
    w.classList.toggle('scroll', w.scrollHeight > w.clientHeight + 1)
  }, [])
  useLayoutEffect(fit, [y, fit])
  useEffect(() => {
    window.addEventListener('resize', fit)
    document.fonts?.ready.then(fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])

  const mix = ALIM.FAMILIES.filter((f) => famCount(y, f.k))
  return (
    <div className="ak-spread">
      <div className="ak-pg">
        <div className="ar" lang="ar">{yearAr(y.n)}</div>
        <span className="cw-kicker">{y.label}</span>
        <h3>{y.subtitle}</h3>
        <div className="orn" aria-hidden="true">✦ ✦ ✦</div>
        <p className="intro">{y.intro}</p>
        <div className="mix">{mix.map((f) => <span key={f.k} className={`f-${f.k}`}>{f.label} · {famCount(y, f.k)}</span>)}</div>
        <span className="folio">— {y.n * 2 - 1} —</span>
      </div>
      <div className="ak-pg">
        <h4>The texts of this year · {y.subjects.length}</h4>
        <div className="tocw" ref={listRef}>
          <ol className="ak-toc">
            {y.subjects.map((s, i) => (
              <li key={i} className={`f-${s.fam}`}><b>{i + 1}</b><strong>{s.t}</strong><span className="ak-disc">{s.disc}</span>{s.d && <small>{s.d}</small>}</li>
            ))}
          </ol>
        </div>
        <span className="folio">— {y.n * 2} —</span>
      </div>
    </div>
  )
}

function Volume() {
  const [year, setYear] = useState(1)
  const [leaves, setLeaves] = useState([])
  const volRef = useRef(null)
  const timer = useRef(null)

  const go = useCallback((n) => {
    if (n < 1 || n > LAST || n === year) return
    const id = Date.now()
    setLeaves((l) => [...l, { id, dir: n > year ? 'go' : 'back' }])
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setYear(n), 260)
  }, [year])
  useEffect(() => () => clearTimeout(timer.current), [])

  // ← → turn the page while the volume is on screen.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target !== document.body) return
      const r = volRef.current?.getBoundingClientRect()
      if (!r || r.top > window.innerHeight || r.bottom < 0) return
      if (e.key === 'ArrowRight') go(year + 1)
      else if (e.key === 'ArrowLeft') go(year - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, year])

  return (
    <section className="ak-vol" id="curriculum" ref={volRef}>
      <div className="ak-sec-h">
        <div><span className="cw-kicker">A structured journey through the Islamic sciences</span><h2>Explore your curriculum</h2></div>
        <p>Explore the texts and subjects across Talweeh Academy’s ten-year part-time ʿĀlimiyyah curriculum — one page of the book for each year.</p>
      </div>
      <div className="ak-volw">
        <nav className="ak-fihris wh-glass" aria-label="Curriculum years">
          <div className="ar" lang="ar">الفِهْرِس</div>
          <h3>Contents</h3>
          <ol>
            {YEARS.map((y) => (
              <li key={y.n}><button type="button" className={y.n === year ? 'on' : ''} aria-current={y.n === year ? 'true' : undefined} onClick={() => go(y.n)}>
                <b>{y.n}</b><span><em>{y.subtitle}</em></span><i>{y.subjects.length}</i>
              </button></li>
            ))}
          </ol>
        </nav>
        <div>
          <div className="ak-book">
            <Spread y={YEARS[year - 1]} />
            {leaves.map((l) => <div key={l.id} className={`ak-turn ${l.dir}`} onAnimationEnd={() => setLeaves((all) => all.filter((x) => x.id !== l.id))} />)}
          </div>
          <div className="ak-bnav">
            <button type="button" className="wh-btn wh-btn-glass ak-btn-sm" disabled={year === 1} onClick={() => go(year - 1)}>‹ Previous year</button>
            <p className="cw-keys"><kbd>←</kbd><kbd>→</kbd> turn the page</p>
            <button type="button" className="wh-btn wh-btn-g ak-btn-sm" disabled={year === LAST} onClick={() => go(year + 1)}>Next year ›</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function AlimiyyahWahaPage() {
  useDocumentMeta({ title: 'ʿĀlimiyyah Seminary', description: 'A comprehensive, structured path through traditional Islamic education—designed for students balancing work, family, and the pursuit of sacred knowledge.' })
  const openCurriculum = (e) => { e.preventDefault(); document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <WahaPage className="cw ak">
      <div className="wh-wrap">
        <section className="ak-tp"><div className="ak-tp-in">
          <div className="t-ar" lang="ar">العَالِمِيَّة</div>
          <div className="rule" aria-hidden="true">✦</div>
          <span className="cw-kicker">Talweeh Academy · Online Seminary</span>
          <h1>Rooted in tradition.<em>Knowledge for a life of service.</em></h1>
          <p className="lead">A comprehensive, structured path through traditional Islamic education—designed for students balancing work, family, and the pursuit of sacred knowledge.</p>
          <div className="acts">
            <a className="wh-btn wh-btn-g" href={ALIM.APPLY} target="_blank" rel="noreferrer">Apply to the seminary →</a>
            <a className="wh-btn wh-btn-glass" href="#curriculum" onClick={openCurriculum}>Open the curriculum</a>
            <a className="wh-btn ak-btn-line" href={ALIM.ENROL} target="_blank" rel="noreferrer">For enrollment</a>
          </div>
          <div className="imprint">{FACTS.map(([k, v]) => <span key={k}>{k} · <b>{v}</b></span>)}<span className="ak-pill">Applications are open</span></div>
        </div></section>

        <section className="ak-benefits">
          {BENEFITS.map(([k, h, p]) => <article key={k} className="cw-card"><span className="cw-kicker">{k}</span><h3>{h}</h3><p>{p}</p></article>)}
        </section>

        <section className="ak-mission">
          <div><span className="cw-kicker">More than academic achievement</span><h2>Sound scholarship.<br /><em>Exemplary character.</em></h2></div>
          <div>
            <p>Talweeh Academy’s seminary prepares students to grow as grounded scholars, educators, researchers, and community leaders—equipped to address the intellectual and spiritual needs of their communities.</p>
            <p>Its vision brings knowledge and character together. True scholarship calls for sound knowledge, righteous action, discipline, self-purification, and refined Islamic etiquette.</p>
          </div>
        </section>

        <section className="ak-values" aria-label="The five foundations of our approach">
          {ALIM.VALUES.map((v) => (
            <article key={v.term}><span className="va" lang="ar">{VAL_AR[v.term] || ''}</span><p className="vt">{v.term}</p><h3>{v.title}</h3><p>{v.body}</p></article>
          ))}
        </section>

        <Volume />

        <section className="ak-apply">
          <div className="ar" lang="ar">وَقُلْ رَبِّ زِدْنِي عِلْمًا</div>
          <span className="cw-kicker">Begin with intention</span>
          <h2>Your path to knowledge<br />starts with a first step.</h2>
          <p>Applications are now open. Explore the curriculum and complete the application form to learn more about joining the seminary.</p>
          <div className="acts">
            <a className="wh-btn wh-btn-g" href={ALIM.APPLY} target="_blank" rel="noreferrer">Apply to Talweeh Academy →</a>
            <a className="wh-btn wh-btn-glass" href={ALIM.ENROL} target="_blank" rel="noreferrer">For enrollment</a>
          </div>
        </section>
      </div>
    </WahaPage>
  )
}
