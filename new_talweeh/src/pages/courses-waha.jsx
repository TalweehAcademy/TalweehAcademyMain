/* eslint-disable react/prop-types */
// /courses — "Maktabah + Fihrist" (mockups/courses-waha-combined.html): hero, counts and pathway
// tiles on top; one filter panel (access, search, sort, subjects) above a grid of course cards that
// turn cream on hover to show the description. URL: ?category=<slug>, ?free=1 (as the header menu links) or ?access=paid.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage, useWahaMotion } from '../components/WahaShell'
import { formatCommercePrice, primaryPurchaseOption } from '../data/liveCommerceCatalog'
import { canEnrol, plainText, purchaseOptions, useCourseCatalog, useStudyList } from '../courses/courseKit'
import { addToStudyList, openStudyList } from '../courses/StudyList'
import { INSTRUCTORS } from '../data/instructors'

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>

const ChevronIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
const BookmarkIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /><path d="M12 7v6M9 10h6" /></svg>
const CheckIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>

// "Fiqh (Islamic jurisprudence)" → "Fiqh" for chips; related subjects sit together (Fiqh, then Uṣūl al-Fiqh).
const shortLabel = (label = '') => label.replace(/\s*\([^)]*\)\s*$/, '')
const subjectOrder = (slug = '') => `${slug.replace(/^usul-al-/, '')}${slug.startsWith('usul-al-') ? '~' : ''}`

// The teacher's photo: course rows name "Sh. Omer Khurshid", the instructor list "Sheikh Omer Khurshid".
const personKey = (name = '') => name.toLowerCase().replace(/\b(sh|sheikh|shaykh|shaikh|mufti|ustadh|imam)\b\.?/g, '').replace(/[^a-z]+/g, ' ').trim()
const TEACHERS = new Map(INSTRUCTORS.filter((i) => i.image).map((i) => [personKey(i.name), i]))

function Card({ course, inList }) {
  const href = `/courses/${course.slug}`
  const options = purchaseOptions(course)
  const lessons = Number(course.lessonCount || 0)
  const subject = shortLabel(course.categoryLabel)
  const price = formatCommercePrice(course)
  const teacher = TEACHERS.get(personKey(course.instructor))
  const about = plainText(course.description || course.primaryText || '')
  return (
    <article className="cw-cc">
      <div className="cw-cc-top">
        <Link className="cw-cc-media" to={href} tabIndex={-1} aria-hidden="true">
          {course.poster ? <img src={course.poster} alt="" loading="lazy" /> : <span className="ph" />}
          {subject && <span className="cw-chip cw-chip-sub">{subject}</span>}
          <span className={`cw-chip cw-chip-price${course.free ? ' free' : ''}`}>{price}</span>
        </Link>
        <div className="cw-cc-more" aria-hidden="true">
          <div className="cw-cc-chips">{subject && <span>{subject}</span>}{lessons > 0 && <span>{lessons} lessons</span>}<span className={course.free ? 'free' : ''}>{price}</span></div>
          <h3>{course.title}</h3>
          {about && <p>{about}</p>}
        </div>
      </div>
      <h3 className="cw-cc-t"><Link to={href}>{course.title}</Link></h3>
      <div className="cw-cc-who">
        {teacher ? <img src={teacher.image} alt="" loading="lazy" style={{ objectPosition: teacher.imagePosition || 'center top' }} /> : <span className="ph" aria-hidden="true" />}
        <div><b>{course.instructor}</b><span>{lessons ? `${lessons} lessons` : 'Curriculum coming soon'} · {course.free ? 'watch on this site' : 'Student Portal'}</span></div>
      </div>
      <div className="cw-cc-act">
        {course.free
          ? <Link className="wh-btn wh-btn-g" to={href}>▶ Start free course</Link>
          : <>
            <Link className="wh-btn wh-btn-glass" to={href}>View course</Link>
            {inList
              ? <button type="button" className="cw-cc-icon on" onClick={openStudyList} aria-label={`${course.title} is in your study list`}><CheckIcon /></button>
              : canEnrol(course) && (options.length > 1
                ? <Link className="cw-cc-icon" to={`${href}#enrol`} aria-label={`Choose a plan for ${course.title}`}><BookmarkIcon /></Link>
                : <button type="button" className="cw-cc-icon" onClick={() => addToStudyList(course, primaryPurchaseOption(course))} aria-label={`Add ${course.title} to your study list`}><BookmarkIcon /></button>)}
          </>}
      </div>
    </article>
  )
}

export default function CoursesWahaPage() {
  const rootRef = useRef(null)
  const libRef = useRef(null)
  const [params, setParams] = useSearchParams()
  const { courses, categories } = useCourseCatalog()
  const studyList = useStudyList()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('')
  useWahaMotion(rootRef)

  const access = params.get('free') === '1' ? 'free' : params.get('access') === 'paid' ? 'paid' : ''
  const cat = params.get('category') || ''
  const cats = cat.split(',').filter(Boolean) // the home page links a topic as two subjects, e.g. hadith,hadith-sciences
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
  const inList = useMemo(() => new Set(studyList.map((i) => i.productKey)), [studyList])
  const needle = q.trim().toLowerCase()
  const base = useMemo(() => courses.filter((c) => !needle || `${c.title} ${c.arabicTitle || ''} ${c.instructor} ${c.categoryLabel} ${plainText(c.description)} ${c.primaryText || ''}`.toLowerCase().includes(needle)), [courses, needle])
  const pass = (c, skip) => (skip === 'access' || !access || (access === 'free' ? c.free : !c.free)) && (skip === 'cat' || !cat || cats.includes(c.category))
  let list = base.filter((c) => pass(c))
  if (sort === 'free') list = [...list].sort((a, b) => Number(b.free) - Number(a.free))
  if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'price') list = [...list].sort((a, b) => (Number(primaryPurchaseOption(a)?.amount_cents ?? a.priceCents) || 0) - (Number(primaryPurchaseOption(b)?.amount_cents ?? b.priceCents) || 0))
  if (sort === 'lessons') list = [...list].sort((a, b) => Number(b.lessonCount || 0) - Number(a.lessonCount || 0))

  const n = (pred) => base.filter(pred).length
  const catLabel = categories.filter((k) => cats.includes(k.slug)).map((k) => k.label).join(' & ')
  const title = access === 'free' ? 'Free Courses' : catLabel || (access === 'paid' ? 'Paid Courses' : 'All Courses')
  const totalLessons = courses.reduce((s, c) => s + Number(c.lessonCount || 0), 0)
  const subjects = categories.filter((k) => courses.some((c) => c.category === k.slug)).length
  const subjectList = categories.filter((k) => courses.some((c) => c.category === k.slug)).sort((a, b) => subjectOrder(a.slug).localeCompare(subjectOrder(b.slug)))
  const Opt = ({ on, count, label, onClick }) => <button type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={onClick} disabled={!count && !on}>{label}<b>{count}</b></button>

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
          <Link className="cw-path wh-glass cw-path-road" to="/courses/roadmap"><small>Guided</small><strong>Study Roadmap</strong><span>Which texts to study, level by level</span></Link>
          <Link className="cw-path wh-glass" to="/alimiyyah"><small>Scheduled</small><strong>Live · Alimiyyah</strong><span>Guided classes with instructors</span></Link>
          <Link className="cw-path wh-glass" to="/hadith-specialization"><small>Focused</small><strong>Specialization</strong><span>Ḥadīth Specialization pathway</span></Link>
        </div>

        <section className="cw-lib" ref={libRef} style={{ scrollMarginTop: 0 }}>
          <div className="cw-fpanel wh-glass" role="search">
            <div className="cw-ftop">
              <h2>{title}<small>{list.length} of {courses.length}</small></h2>
              <div className="cw-seg" role="group" aria-label="Access">
                <Opt on={!access} count={n((c) => pass(c, 'access'))} label="All" onClick={() => setFilter({ access: '' })} />
                <Opt on={access === 'free'} count={n((c) => c.free && pass(c, 'access'))} label="Free" onClick={() => setFilter({ access: access === 'free' ? '' : 'free' })} />
                <Opt on={access === 'paid'} count={n((c) => !c.free && pass(c, 'access'))} label="Paid" onClick={() => setFilter({ access: access === 'paid' ? '' : 'paid' })} />
              </div>
              <label className="cw-search"><SearchIcon /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a book, teacher or subject" aria-label="Search courses" /></label>
              <label className="cw-sort">
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort courses"><option value="">Recommended</option><option value="free">Free first</option><option value="az">Title A–Z</option><option value="price">Price: low to high</option><option value="lessons">Most lessons</option></select>
                <ChevronIcon />
              </label>
            </div>
            <div className="cw-subs" role="group" aria-label="Subject">
              <Opt on={!cat} count={n((c) => pass(c, 'cat'))} label="All subjects" onClick={() => setFilter({ cat: '' })} />
              {subjectList.map((k) => <Opt key={k.slug} on={cats.includes(k.slug)} count={n((c) => c.category === k.slug && pass(c, 'cat'))} label={shortLabel(k.label)} onClick={() => setFilter({ cat: cat === k.slug ? '' : k.slug })} />)}
              {(access || cat || q) && <button type="button" className="cw-clear" onClick={() => { setQ(''); setFilter({ access: '', cat: '' }) }}>Clear filters</button>}
            </div>
          </div>
          <div className="cw-cards">
            {list.map((c) => <Card key={c.slug} course={c} inList={inList.has(c.checkoutSlug || c.slug)} />)}
            {!list.length && <p className="cw-empty">No course matches these filters. Try another subject or clear the search.</p>}
          </div>
        </section>
      </div>
    </WahaPage>
  )
}
