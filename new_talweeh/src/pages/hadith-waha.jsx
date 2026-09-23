/* eslint-disable react/prop-types */
// /hadith-specialization — "Ṭarīq + Isnād" (mockups/hadith-waha-tariq-isnad.html). Ṭarīq's hero writing
// (text · transmission · verification) beside the program drawn as an isnād: every course on a six-column
// grid chosen so no lines cross or run behind a course; hover a course to light what it builds on and
// leads to, click it to read it. Then the overview, instructors, the curriculum by year (each course
// opens in a side drawer) and the enrolment call. Courses also sold on their own link to their page.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { HADITH as H } from '../data/hadithSpecializationWaha'
import { PUBLIC_COURSES } from '../data/publicCourseIndex'
import { loadPublicCourse } from '../data/publicCourseDetails'
import { money } from '../data/commerceCheckout'
import { lessonTitle } from '../courses/courseKit'
import '../hadith-waha-v1.css'

const by = (title) => H.COURSES.find((c) => c.title === title)
const strand = (k) => H.STRANDS.find((s) => s.k === k)
const year = (y) => H.COURSES.filter((c) => c.year === y)
const standalone = (c) => (c.catalogSlug ? PUBLIC_COURSES.find((x) => x.slug === c.catalogSlug) || null : null)
const soloCount = new Set(H.COURSES.filter((c) => standalone(c)).map((c) => c.catalogSlug)).size
const WORD = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty']
const FACTS = [['Duration', '2 years'], ['Curriculum', `${H.COURSES.length} courses`], ['Level', 'Advanced'], ['Standalone now', `${soloCount} courses`]]
const INSTRUCTOR_PAGES = { 'Sheikh Omer Khurshid': 'sheikh-omer-khurshid', 'Mufti Daud Khurshid': 'mufti-mohammad-daud-khurshid' }

// The chart: rows from foundations to application; [course title, column 0–5]. The positions came from
// a search over every arrangement for the fewest crossing lines and no line running behind a course.
const ROWS = [
  [['Tadwīn al-Sunnah', 0], ['Makānat al-Sunnah', 4]],
  [['Takwīn al-Isnād', 0], ['Ruwāt al-Ḥadīth — Part 1', 1], ['Al-Jarḥ wa al-Taʿdīl', 2], ['Nukhbat al-Fikar', 3]],
  [['Al-Athbāt wa al-Fahāris', 0], ['Takhrīj', 1], ['Ruwāt al-Ḥadīth — Part 2', 2], ['Tadrīb al-Rāwī 1', 3], ['Manāhij al-Muḥaddithīn', 4], ['Orientalist Critique', 5]],
  [['Al-Nushakh wal-Taqyeed', 1], ['Dirāsat al-Asānīd', 2], ['Tadrīb al-Rāwī 2', 3]],
  [['ʿIlal al-Ḥadīth', 2]],
  [['Muwaṭṭaʾ Mālik', 1.5], ['Ṣaḥīḥ al-Bukhārī', 3]],
]
// What builds on what. Tadrīb al-Rāwī builds on Nukhbat al-Fikar; al-Jarḥ → Dirāsat al-Asānīd is left
// implicit, since it runs through Ruwāt al-Ḥadīth — Part 2.
const LINKS = [
  ['Tadwīn al-Sunnah', 'Ruwāt al-Ḥadīth — Part 1'], ['Tadwīn al-Sunnah', 'Takwīn al-Isnād'], ['Makānat al-Sunnah', 'Manāhij al-Muḥaddithīn'], ['Makānat al-Sunnah', 'Al-Jarḥ wa al-Taʿdīl'], ['Makānat al-Sunnah', 'Orientalist Critique'],
  ['Nukhbat al-Fikar', 'Tadrīb al-Rāwī 1'],
  ['Ruwāt al-Ḥadīth — Part 1', 'Ruwāt al-Ḥadīth — Part 2'], ['Takwīn al-Isnād', 'Takhrīj'], ['Takwīn al-Isnād', 'Al-Athbāt wa al-Fahāris'], ['Al-Jarḥ wa al-Taʿdīl', 'Ruwāt al-Ḥadīth — Part 2'],
  ['Takhrīj', 'Dirāsat al-Asānīd'], ['Tadrīb al-Rāwī 1', 'Tadrīb al-Rāwī 2'], ['Al-Athbāt wa al-Fahāris', 'Al-Nushakh wal-Taqyeed'], ['Ruwāt al-Ḥadīth — Part 2', 'Dirāsat al-Asānīd'],
  ['Dirāsat al-Asānīd', 'ʿIlal al-Ḥadīth'], ['Tadrīb al-Rāwī 2', 'ʿIlal al-Ḥadīth'], ['ʿIlal al-Ḥadīth', 'Ṣaḥīḥ al-Bukhārī'], ['ʿIlal al-Ḥadīth', 'Muwaṭṭaʾ Mālik'], ['Manāhij al-Muḥaddithīn', 'Ṣaḥīḥ al-Bukhārī'], ['Al-Nushakh wal-Taqyeed', 'Muwaṭṭaʾ Mālik'],
]

function Chart({ onOpen }) {
  const plotRef = useRef(null)
  const [paths, setPaths] = useState([])
  const [hover, setHover] = useState(null)
  const draw = useCallback(() => {
    const plot = plotRef.current
    if (!plot) return
    const box = plot.getBoundingClientRect(), pos = {}
    plot.querySelectorAll('[data-title]').forEach((n) => {
      const r = n.getBoundingClientRect()
      pos[n.dataset.title] = { x: r.left - box.left + r.width / 2, t: r.top - box.top, b: r.bottom - box.top }
    })
    setPaths(LINKS.map(([a, b]) => { const p = pos[a], q = pos[b], m = (p.b + q.t) / 2; return { a, b, d: `M${p.x} ${p.b} C ${p.x} ${m}, ${q.x} ${m}, ${q.x} ${q.t}` } }))
  }, [])
  useLayoutEffect(draw, [draw])
  useEffect(() => {
    window.addEventListener('resize', draw)
    document.fonts?.ready.then(draw)
    return () => window.removeEventListener('resize', draw)
  }, [draw])
  const near = new Set(hover ? LINKS.filter(([a, b]) => a === hover || b === hover).flat() : [])
  return (
    <div className="hw-chart wh-glass" onMouseLeave={() => setHover(null)}>
      <span className="cw-kicker">The program as an isnād</span>
      <div className="scroll">
      <div className="plot" ref={plotRef}>
        <svg aria-hidden="true">{paths.map((p) => <path key={`${p.a}>${p.b}`} d={p.d} className={hover && (p.a === hover || p.b === hover) ? 'lit' : ''} />)}</svg>
        {ROWS.map((row, i) => (
          <div className="row" key={i}>
            {row.map(([title, col]) => {
              const c = by(title)
              return (
                <button type="button" key={title} data-title={title}
                  className={`node s-${c.strand}${/Bukh|Muwa/.test(title) ? ' goal' : ''}${hover && near.has(title) && title !== hover ? ' lit' : ''}`}
                  style={{ left: `${((col + 0.5) / 6) * 100}%` }}
                  onMouseEnter={() => setHover(title)} onFocus={() => setHover(title)} onClick={() => onOpen(c.n)}>
                  <span className="ar" lang="ar">{c.ar}</span><small>{c.title.replace(' — ', ' ')}</small>
                </button>
              )
            })}
          </div>
        ))}
      </div>
      </div>
      <p className="hint">Hover a course to follow what it builds on and leads to · click to read it</p>
    </div>
  )
}

function Drawer({ n, onClose, onGo }) {
  const c = n ? H.COURSES[n - 1] : null
  const solo = c ? standalone(c) : null
  const [lessons, setLessons] = useState(null)
  const panelRef = useRef(null)
  useEffect(() => {
    setLessons(null)
    if (!solo) return undefined
    let active = true
    loadPublicCourse(solo.slug).then((d) => { if (active) setLessons(Array.isArray(d?.lessons) ? d.lessons : []) }).catch(() => { if (active) setLessons([]) })
    return () => { active = false }
  }, [solo])
  useEffect(() => {
    if (!c) return undefined
    const key = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    panelRef.current?.scrollTo(0, 0)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', key)
  }, [c, onClose])
  const LIMIT = 8
  return (
    <>
      <div className={`hw-shade${c ? ' on' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`hw-drawer${c ? ' on' : ''}`} aria-label="Course details" aria-hidden={!c} ref={panelRef} tabIndex={-1}>
        {c && (
          <>
            <button className="x" type="button" onClick={onClose} aria-label="Close">✕</button>
            <div className="ar" lang="ar">{c.ar}</div>
            <span className="cw-kicker">Year {c.year} · course {c.i} of {year(c.year).length}</span>
            <h3>{c.title}</h3>
            <p className="sub">{c.subtitle}</p>
            <div className="meta"><span className={`hw-schip s-${c.strand}`}>{strand(c.strand)?.label}</span></div>
            <div className="hw-det">
              <div><span className="hw-label">Course overview</span><p>{c.overview}</p>{c.note && <p className="note">{c.note}</p>}</div>
              {c.outcomes?.length > 0 && <div className="out"><span className="hw-label">Learning outcomes</span><ul>{c.outcomes.map((o) => <li key={o}>{o}</li>)}</ul></div>}
              {solo && (
                <div className="hw-stand">
                  <div className="h">
                    {solo.poster && <img src={solo.poster} alt="" loading="lazy" />}
                    <div><span className="hw-label">Standalone Talweeh course</span><strong>{solo.title}</strong><small>{solo.instructor}{solo.lessonCount ? ` · ${solo.lessonCount} lessons` : ''}</small></div>
                    <Link className="wh-btn wh-btn-g hw-btn-sm" to={`/courses/${solo.slug}`}>{solo.free ? 'Watch the standalone course' : `View standalone course${solo.priceCents ? ` · ${money(solo.priceCents, solo.currency)}` : ''}`} →</Link>
                  </div>
                  {lessons === null ? <p className="note">Loading lessons…</p>
                    : lessons.length ? (
                      <ol className="less">
                        {lessons.slice(0, LIMIT).map((l, i) => <li key={i}><b>{String(i + 1).padStart(2, '0')}</b>{lessonTitle(l)}</li>)}
                        {lessons.length > LIMIT && <li className="more"><Link to={`/courses/${solo.slug}`}>+ {lessons.length - LIMIT} more lessons on the course page →</Link></li>}
                      </ol>
                    ) : <p className="note">This standalone course is available, but its lesson list has not been published yet.</p>}
                </div>
              )}
            </div>
            <div className="dnav">
              <button className="wh-btn wh-btn-glass hw-btn-sm" type="button" disabled={n === 1} onClick={() => onGo(n - 1)}>‹ Previous course</button>
              <button className="wh-btn wh-btn-g hw-btn-sm" type="button" disabled={n === H.COURSES.length} onClick={() => onGo(n + 1)}>Next course ›</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

export default function HadithWahaPage() {
  useDocumentMeta({ title: 'Hadith Specialization', description: H.HERO.lead })
  const [yr, setYr] = useState(1)
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])
  const toCurriculum = (e) => { e.preventDefault(); document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <WahaPage className="cw hw" overlays={<Drawer n={open} onClose={close} onGo={setOpen} />}>
      <div className="wh-wrap">
        <section className="hw-hero">
          <div className="th">
            <div className="triad">
              {[['النَّصّ', 'Text'], ['الرِّوَايَة', 'Transmission'], ['التَّحْقِيق', 'Verification']].map(([ar, en], i) => (
                <Fragment key={en}>{i > 0 && <i aria-hidden="true" />}<div><span className="ar" lang="ar">{ar}</span><small>{en}</small></div></Fragment>
              ))}
            </div>
            <span className="cw-kicker">{H.HERO.eyebrow}</span>
            <h1>Hadith <em>Specialization</em></h1>
            <p className="name">{H.HERO.name} — a tradition studied through its sources.</p>
            <p className="lead">{H.HERO.lead}</p>
            <div className="facts">{FACTS.map(([k, v]) => <span key={k}><small>{k}</small><b>{v}</b></span>)}</div>
            <div className="acts"><a className="wh-btn wh-btn-g" href="#curriculum" onClick={toCurriculum}>Explore curriculum</a><a className="wh-btn wh-btn-glass" href={H.ENROL}>For enrollment</a></div>
            <small className="mail">Enrollment inquiries: {H.EMAIL}</small>
          </div>
          <Chart onOpen={setOpen} />
        </section>

        <section className="hw-blk hw-ovw">
          <div><span className="cw-kicker">Program overview</span><h2>From preservation to critical analysis.</h2></div>
          <div>{H.OVERVIEW.map((p) => <p key={p}>{p}</p>)}</div>
        </section>

        <section className="hw-blk">
          <div className="hw-sec-h"><div><span className="cw-kicker">Instructors</span><h2>Guided by specialist study.</h2></div></div>
          <div className="hw-inst">{H.INSTRUCTORS.map(([name, desc], i) => (
            <Link className="cw-card" key={name} to={INSTRUCTOR_PAGES[name] ? `/instructors/${INSTRUCTOR_PAGES[name]}` : '/instructors'}>
              <span className="n">0{i + 1}</span><div><h3>{name}</h3><p>{desc}</p><small>Read instructor bio →</small></div>
            </Link>
          ))}</div>
        </section>

        <section className="hw-blk" id="curriculum">
          <div className="hw-sec-h"><div><span className="cw-kicker">Hadith Specialization curriculum</span><h2>{WORD[H.COURSES.length] || H.COURSES.length} courses across two years.</h2></div><p>Select a year, then open any course to read its overview and learning outcomes. {soloCount} of them can also be taken today as standalone Talweeh courses.</p></div>
          <div className="hw-years" role="tablist" aria-label="Year">
            {[1, 2].map((y) => (
              <button key={y} type="button" role="tab" aria-selected={yr === y} className={yr === y ? 'on' : ''} onClick={() => setYr(y)}>
                <div><span>Year {y}</span><strong>{y === 1 ? '1st Year' : '2nd Year'}</strong></div><small>{year(y).length} courses</small>
              </button>
            ))}
          </div>
          <div className="hw-cgrid">{year(yr).map((c) => (
            <button type="button" key={c.n} className={`hw-cc s-${c.strand}`} onClick={() => setOpen(c.n)}>
              <span className="n">{String(c.n).padStart(2, '0')}</span>
              <span><span className="ar" lang="ar">{c.ar}</span><strong>{c.title}</strong><small>{c.subtitle}</small>
                <span className="tags"><span className={`hw-schip s-${c.strand}`}>{strand(c.strand)?.label}</span>{standalone(c) && <span className="solo">Also a standalone course</span>}</span></span>
            </button>
          ))}</div>
        </section>

        <section className="hw-cta">
          <div className="ar" lang="ar">وَمَا آتَاكُمُ الرَّسُولُ فَخُذُوهُ</div>
          <span className="cw-kicker">Enrollment</span>
          <h2>Interested in the Hadith Specialization?</h2>
          <p>Contact Talweeh Academy for enrollment information and program inquiries.</p>
          <div className="acts"><a className="wh-btn wh-btn-g" href={H.ENROL}>For enrollment →</a><Link className="wh-btn wh-btn-glass" to="/courses?category=hadith-sciences">Browse the standalone courses</Link></div>
          <small>Enrollment inquiries: {H.EMAIL}</small>
        </section>
      </div>
    </WahaPage>
  )
}
