/* eslint-disable react/prop-types */
// /courses — "Maktabah + Fihrist" (mockups/courses-waha-combined.html): hero, counts and pathway
// tiles on top; a pinned search + sort bar, a sidebar (access + every subject) and detailed course
// rows below. URL: ?category=<slug>, ?free=1 (as the header menu links) or ?access=paid.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage, useWahaMotion } from '../components/WahaShell'
import { formatCommercePrice, primaryPurchaseOption } from '../data/liveCommerceCatalog'
import { canEnrol, plainText, purchaseOptions, useCourseCatalog, useStudyList } from '../courses/courseKit'
import { addToStudyList, openStudyList } from '../courses/StudyList'
import { loadPublicCourse } from '../data/publicCourseDetails'

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>

function CurriculumPreview({ slug }) {
  const [lessons, setLessons] = useState(null)
  return (
    <details onToggle={(e) => { if (e.currentTarget.open && !lessons) loadPublicCourse(slug).then((c) => setLessons(c?.lessons || [])).catch(() => setLessons([])) }}>
      <summary>Preview curriculum ▾</summary>
      {lessons === null ? <p className="cw-keys" style={{ marginTop: 8 }}>Loading…</p> : lessons.length ? (
        <ol>
          {lessons.slice(0, 8).map((l, i) => <li key={i}>{typeof l === 'string' ? l : l.title}</li>)}
          {lessons.length > 8 && <li style={{ listStyle: 'none', color: 'var(--p-mut)' }}>…and {lessons.length - 8} more</li>}
        </ol>
      ) : <p className="cw-keys" style={{ marginTop: 8 }}>The curriculum will be listed soon.</p>}
    </details>
  )
}

function Row({ course, inList }) {
  const href = `/courses/${course.slug}`
  const options = purchaseOptions(course)
  const lessons = Number(course.lessonCount || 0)
  return (
    <article className="cw-row cw-card">
      <Link to={href} tabIndex={-1} aria-hidden="true">{course.poster ? <img src={course.poster} alt="" loading="lazy" /> : <span className="ph" />}</Link>
      <div>
        <span className="cat">{course.categoryLabel}</span>
        <h3><Link to={href}>{course.title}</Link></h3>
        {course.description && <p>{plainText(course.description)}</p>}
        <div className="facts"><span>{course.instructor}</span><span>{lessons ? `${lessons} lessons` : 'Curriculum coming soon'}</span><span>{course.free ? 'Watch on this site' : 'Student Portal'}</span></div>
      </div>
      <div className="end">
        <span className={`cw-price${course.free ? ' free' : ''}`}>{formatCommercePrice(course)}</span>
        {course.free
          ? <Link className="wh-btn wh-btn-g" to={href}>▶ Start free course</Link>
          : <>
            <Link className="wh-btn wh-btn-glass" to={href}>View course</Link>
            {inList
              ? <button type="button" className="wh-btn cw-in-list" onClick={openStudyList}>✓ In your study list</button>
              : canEnrol(course) && (options.length > 1
                ? <Link className="wh-btn wh-btn-g" to={`${href}#enrol`}>Choose a plan</Link>
                : <button type="button" className="wh-btn wh-btn-g" onClick={() => addToStudyList(course, primaryPurchaseOption(course))}>Add to study list</button>)}
          </>}
      </div>
      {lessons > 0 && <CurriculumPreview slug={course.slug} />}
    </article>
  )
}

export default function CoursesWahaPage() {
  const rootRef = useRef(null)
  const bandRef = useRef(null)
  const libRef = useRef(null)
  const [params, setParams] = useSearchParams()
  const { courses, categories } = useCourseCatalog()
  const studyList = useStudyList()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('')
  useWahaMotion(rootRef)

  const access = params.get('free') === '1' ? 'free' : params.get('access') === 'paid' ? 'paid' : ''
  const cat = params.get('category') || ''
  const setFilter = (next) => {
    const p = new URLSearchParams()
    const a = 'access' in next ? next.access : access, c = 'cat' in next ? next.cat : cat
    if (a === 'free') p.set('free', '1'); else if (a === 'paid') p.set('access', 'paid')
    if (c) p.set('category', c)
    setParams(p, { replace: true })
  }

  // Deep links from the header menu land on the list.
  useEffect(() => {
    if (access || cat) setTimeout(() => libRef.current?.scrollIntoView({ block: 'start' }), 80)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Paint the band behind the search bar only while it is pinned.
  useEffect(() => {
    const on = () => bandRef.current?.classList.toggle('stuck', bandRef.current.getBoundingClientRect().top <= 0 && window.scrollY > 200)
    window.addEventListener('scroll', on, { passive: true }); on()
    return () => window.removeEventListener('scroll', on)
  }, [])

  const inList = useMemo(() => new Set(studyList.map((i) => i.productKey)), [studyList])
  const needle = q.trim().toLowerCase()
  const base = useMemo(() => courses.filter((c) => !needle || `${c.title} ${c.arabicTitle || ''} ${c.instructor} ${c.categoryLabel} ${plainText(c.description)} ${c.primaryText || ''}`.toLowerCase().includes(needle)), [courses, needle])
  const pass = (c, skip) => (skip === 'access' || !access || (access === 'free' ? c.free : !c.free)) && (skip === 'cat' || !cat || c.category === cat)
  let list = base.filter((c) => pass(c))
  if (sort === 'free') list = [...list].sort((a, b) => Number(b.free) - Number(a.free))
  if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'price') list = [...list].sort((a, b) => (Number(primaryPurchaseOption(a)?.amount_cents ?? a.priceCents) || 0) - (Number(primaryPurchaseOption(b)?.amount_cents ?? b.priceCents) || 0))
  if (sort === 'lessons') list = [...list].sort((a, b) => Number(b.lessonCount || 0) - Number(a.lessonCount || 0))

  const n = (pred) => base.filter(pred).length
  const catLabel = categories.find((k) => k.slug === cat)?.label
  const title = access === 'free' ? 'Free Courses' : catLabel || (access === 'paid' ? 'Paid Courses' : 'All Courses')
  const totalLessons = courses.reduce((s, c) => s + Number(c.lessonCount || 0), 0)
  const subjects = categories.filter((k) => courses.some((c) => c.category === k.slug)).length
  const Opt = ({ on, count, label, onClick }) => <button type="button" className={`cw-opt${on ? ' on' : ''}`} onClick={onClick} disabled={!count && !on}>{label}<b>{count}</b></button>

  const pickPath = (a) => { setFilter({ access: a, cat: '' }); libRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return (
    <WahaPage className="cw" rootRef={rootRef}>
      <div className="wh-wrap">
        <section className="cw-hero">
          <div className="ar" data-r>حَيَاةُ الْعِلْمِ مُذَاكَرَتُهُ</div>
          <h1 data-r>Study the Islamic sciences at your own pace.</h1>
          <p className="lead" data-r>Structured, self-paced courses taught by Talweeh instructors — free courses open right here, paid courses continue in the Student Portal.</p>
          <div className="cw-stats" data-r><span><b>{courses.length}</b> courses</span><span><b>{courses.filter((c) => c.free).length}</b> free</span><span><b>{totalLessons}</b> lessons</span><span><b>{subjects}</b> subjects</span></div>
        </section>

        <div className="cw-paths" data-stagger>
          <button type="button" className={`cw-path wh-glass${!access && !cat ? ' on' : ''}`} onClick={() => pickPath('')}><small>Self-paced</small><strong>Course Library</strong><span>Every public course</span></button>
          <button type="button" className={`cw-path wh-glass${access === 'free' && !cat ? ' on' : ''}`} onClick={() => pickPath('free')}><small>Open access</small><strong>Free Courses</strong><span>Watch every lesson here</span></button>
          <Link className="cw-path wh-glass" to="/alimiyyah"><small>Scheduled</small><strong>Live · Alimiyyah</strong><span>Guided classes with instructors</span></Link>
          <Link className="cw-path wh-glass" to="/hadith-specialization"><small>Focused</small><strong>Specialization</strong><span>Ḥadīth Specialization pathway</span></Link>
        </div>

        <section className="cw-lib" ref={libRef} style={{ scrollMarginTop: 0 }}>
          <div className="cw-lib-h"><span className="cw-kicker">Course Library</span><h2>{title}</h2></div>
          <div className="cw-band" ref={bandRef}>
            <div className="cw-fbar wh-glass">
              <label className="cw-search"><SearchIcon /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, instructors or subjects" aria-label="Search courses" /></label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort courses"><option value="">Recommended</option><option value="free">Free first</option><option value="az">Title A–Z</option><option value="price">Price: low to high</option><option value="lessons">Most lessons</option></select>
              <span className="cnt">{list.length} of {courses.length}</span>
            </div>
          </div>
          <div className="cw-fx">
            <aside className="cw-side wh-glass" aria-label="Filter courses">
              <h4>Access</h4>
              <Opt on={!access} count={n((c) => pass(c, 'access'))} label="All courses" onClick={() => setFilter({ access: '' })} />
              <Opt on={access === 'free'} count={n((c) => c.free && pass(c, 'access'))} label="Free — watch here" onClick={() => setFilter({ access: access === 'free' ? '' : 'free' })} />
              <Opt on={access === 'paid'} count={n((c) => !c.free && pass(c, 'access'))} label="Paid — Student Portal" onClick={() => setFilter({ access: access === 'paid' ? '' : 'paid' })} />
              <h4>Subject</h4>
              <Opt on={!cat} count={n((c) => pass(c, 'cat'))} label="All subjects" onClick={() => setFilter({ cat: '' })} />
              {categories.map((k) => <Opt key={k.slug} on={cat === k.slug} count={n((c) => c.category === k.slug && pass(c, 'cat'))} label={k.label} onClick={() => setFilter({ cat: cat === k.slug ? '' : k.slug })} />)}
              <button type="button" className="wh-btn wh-btn-glass cw-reset" onClick={() => { setQ(''); setFilter({ access: '', cat: '' }) }}>Clear filters</button>
            </aside>
            <div className="cw-rows">
              {list.map((c) => <Row key={c.slug} course={c} inList={inList.has(c.checkoutSlug || c.slug)} />)}
              {!list.length && <p className="cw-empty">No course matches these filters. Try another subject or clear the search.</p>}
            </div>
          </div>
        </section>
      </div>
    </WahaPage>
  )
}
