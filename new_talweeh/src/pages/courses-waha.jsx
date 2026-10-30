/* eslint-disable react/prop-types */
// /courses — "Maktabah + Fihrist" (mockups/courses-waha-combined.html): hero, counts and pathway
// tiles on top; one filter panel (access, search, sort, subjects) above a grid of course cards that
// turn cream on hover to show the description. URL: ?category=<slug>, ?free=1 (as the header menu links) or ?access=paid.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { WahaPage, useWahaMotion } from '../components/WahaShell'
import { StartLink } from '../components/StartGuideHost'
import { formatCommercePrice, primaryPurchaseOption } from '../data/liveCommerceCatalog'
import { canEnrol, plainText, purchaseOptions, useCourseCatalog, useStudyList } from '../courses/courseKit'
import { addToStudyList, openStudyList } from '../courses/StudyList'
import { INSTRUCTORS } from '../data/instructors'

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>

const ChevronIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
const BookmarkIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /><path d="M12 7v6M9 10h6" /></svg>
const CheckIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>

// "Fiqh (Islamic jurisprudence)" → "Fiqh" for chips; related subjects sit together (Fiqh, then Uṣūl al-Fiqh).
// Search: accents, ʿayn/hamzah marks, Arabic vowel marks and capitals don't matter ("hadith" finds Ḥadīth, "tuhfah"
// finds Tuḥfah). Every word typed must appear somewhere; a course ranks by where (title first, then teacher and subject,
// then the description), so a few letters bring the right courses to the top.
const fold = (v = '') => String(v).normalize('NFD').replace(/[̀-ًͯ-ٰٟـ]/g, '').replace(/[ʿʾ'’‘`]/g, '').replace(/[-–—_/]/g, ' ').toLowerCase()
function searchIndex(c) {
  return { title: fold(`${c.title} ${c.arabicTitle || ''}`), who: fold(`${c.instructor || ''} ${c.categoryLabel || ''}`), text: fold(`${plainText(c.description)} ${c.primaryText || ''}`) }
}
function matchScore(ix, words) {
  let score = 0
  for (const w of words) {
    const re = new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    if (re.test(ix.title)) score += 12
    else if (ix.title.includes(w)) score += 8
    else if (re.test(ix.who)) score += 6
    else if (ix.who.includes(w)) score += 4
    else if (w.length >= 3 && re.test(ix.text)) score += 1
    else return 0
  }
  return score
}
const SORTS = [['', 'Recommended'], ['free', 'Free first'], ['az', 'Title A–Z'], ['price', 'Price: low to high'], ['lessons', 'Most lessons']]

// Sort: a styled menu (the browser's own select list can't take the site's look).
function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])
  const pick = (v) => { onChange(v); setOpen(false); ref.current?.querySelector('button')?.focus() }
  const show = () => { setHi(Math.max(0, SORTS.findIndex(([v]) => v === value))); setOpen(true) }
  const onKey = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % SORTS.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + SORTS.length) % SORTS.length) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(SORTS[hi][0]) }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
  }
  const label = (SORTS.find(([v]) => v === value) || SORTS[0])[1]
  return (
    <div className={`cw-sort${open ? ' open' : ''}`} ref={ref}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`Sort courses: ${label}`} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        <small>Sort</small><span>{label}</span><ChevronIcon />
      </button>
      {open && (
        <ul className="cw-sort-menu" role="listbox" aria-label="Sort courses" aria-activedescendant={`cw-sort-${hi}`}>
          {SORTS.map(([v, t], i) => (
            <li key={v || 'rec'} id={`cw-sort-${i}`} role="option" aria-selected={v === value} className={`${i === hi ? 'hi' : ''}${v === value ? ' on' : ''}`} onPointerEnter={() => setHi(i)} onClick={() => pick(v)}>
              <span>{t}</span>{v === value && <CheckIcon />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Search box with suggestions from 2 letters: the best few courses (poster, title, teacher), arrow keys to move, Enter
// to open one; the grid below filters at the same time.
function SearchBox({ q, setQ, hits, total, onShowAll }) {
  const navigate = useNavigate()
  const [focus, setFocus] = useState(false)
  const [hi, setHi] = useState(-1)
  const ref = useRef(null)
  const show = focus && fold(q).trim().length >= 2
  const top = hits.slice(0, 6)
  useEffect(() => { setHi(-1) }, [q])
  useEffect(() => {
    if (!show) return undefined
    const away = (e) => { if (!ref.current?.contains(e.target)) setFocus(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [show])
  const go = (c) => { setFocus(false); navigate(`/courses/${c.slug}`) }
  const onKey = (e) => {
    if (e.key === 'Escape') { if (show) setFocus(false); else setQ(''); return }
    if (!show) { if (e.key === 'ArrowDown') setFocus(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, top.length)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (hi >= 0 && hi < top.length) go(top[hi]); else { setFocus(false); onShowAll() } }
  }
  return (
    <div className="cw-search-wrap" ref={ref}>
      <label className="cw-search"><SearchIcon />
        <input value={q} onChange={(e) => { setQ(e.target.value); setFocus(true) }} onFocus={() => setFocus(true)} onKeyDown={onKey}
          placeholder="Search a book, teacher or subject" aria-label="Search courses" role="combobox" aria-expanded={show} aria-controls="cw-sug" aria-autocomplete="list"
          aria-activedescendant={show && hi >= 0 ? `cw-sug-${hi}` : undefined} autoComplete="off" spellCheck="false" />
        {q && <button type="button" className="cw-search-x" aria-label="Clear search" onClick={() => { setQ(''); ref.current?.querySelector('input')?.focus() }}>✕</button>}
      </label>
      {show && (
        <div className="cw-sug" id="cw-sug" role="listbox" aria-label="Matching courses">
          {top.length ? top.map((c, i) => (
            <div key={c.slug} id={`cw-sug-${i}`} role="option" aria-selected={i === hi} className={i === hi ? 'hi' : ''} onPointerEnter={() => setHi(i)} onPointerDown={(e) => e.preventDefault()} onClick={() => go(c)}>
              {c.poster ? <img src={c.poster} alt="" loading="lazy" /> : <span className="ph" />}
              <span className="t"><strong>{c.title}</strong><small>{[c.instructor, shortLabel(c.categoryLabel)].filter(Boolean).join(' · ')}</small></span>
              {c.free && <span className="fr">Free</span>}
            </div>
          )) : <p className="cw-sug-none">No course matches “{q.trim()}”.</p>}
          {top.length > 0 && (
            <div id={`cw-sug-${top.length}`} role="option" aria-selected={hi === top.length} className={`all${hi === top.length ? ' hi' : ''}`} onPointerEnter={() => setHi(top.length)} onPointerDown={(e) => e.preventDefault()} onClick={() => { setFocus(false); onShowAll() }}>
              {total > top.length ? `See all ${total} results` : 'Show results below'} ↓
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const shortLabel = (label = '') => label.replace(/\s*\([^)]*\)\s*$/, '')
const subjectOrder = (slug = '') => `${slug.replace(/^usul-al-/, '')}${slug.startsWith('usul-al-') ? '~' : ''}`

// The teacher's photo: course rows name "Sh. Omer Khurshid", the instructor list "Sheikh Omer Khurshid".
const personKey = (name = '') => name.toLowerCase().replace(/\b(sh|sheikh|shaykh|shaikh|mufti|ustadh|imam)\b\.?/g, '').replace(/[^a-z]+/g, ' ').trim()
const TEACHERS = new Map(INSTRUCTORS.filter((i) => i.image).map((i) => [personKey(i.name), i]))

function Card({ course, inList }) {
  const href = `/courses/${course.slug}`
  const options = purchaseOptions(course)
  const lessons = Number(course.lessonCount || 0)
  const previews = course.free ? 0 : Number(course.freePreviewCount || 0)
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
          {previews > 0 && <span className="cw-chip cw-chip-prev">▶ Free preview</span>}
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
        <div><b>{course.instructor}</b><span>{lessons ? `${lessons} lessons` : 'Curriculum coming soon'} · {course.free ? 'watch on this site' : previews ? `${previews} free to watch` : 'Student Portal'}</span></div>
      </div>
      {previews > 0 && <Link className="cw-cc-free" to={`${href}#watch`}>▶ Watch {previews === 1 ? 'the free lesson' : 'a free lesson'}</Link>}
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
  const cardsRef = useRef(null)
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
  const words = useMemo(() => fold(q).split(/\s+/).filter(Boolean), [q])
  const indexed = useMemo(() => courses.map((c) => [c, searchIndex(c)]), [courses])
  const scores = useMemo(() => {
    const m = new Map()
    if (words.length) for (const [c, ix] of indexed) { const s = matchScore(ix, words); if (s) m.set(c, s) }
    return m
  }, [indexed, words])
  const base = useMemo(() => (words.length ? courses.filter((c) => scores.has(c)) : courses), [courses, words, scores])
  const pass = (c, skip) => (skip === 'access' || !access || (access === 'free' ? c.free : !c.free)) && (skip === 'cat' || !cat || cats.includes(c.category))
  let list = base.filter((c) => pass(c))
  if (words.length && !sort) list = [...list].sort((a, b) => scores.get(b) - scores.get(a))
  if (sort === 'free') list = [...list].sort((a, b) => Number(b.free) - Number(a.free))
  if (sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'price') list = [...list].sort((a, b) => (Number(primaryPurchaseOption(a)?.amount_cents ?? a.priceCents) || 0) - (Number(primaryPurchaseOption(b)?.amount_cents ?? b.priceCents) || 0))
  if (sort === 'lessons') list = [...list].sort((a, b) => Number(b.lessonCount || 0) - Number(a.lessonCount || 0))

  const n = (pred) => base.filter(pred).length
  const catLabel = categories.filter((k) => cats.includes(k.slug)).map((k) => shortLabel(k.label)).join(' & ')
  const title = access === 'free' ? 'Free Courses' : catLabel || (access === 'paid' ? 'Paid Courses' : 'All Courses')
  const totalLessons = courses.reduce((s, c) => s + Number(c.lessonCount || 0), 0)
  const subjects = categories.filter((k) => courses.some((c) => c.category === k.slug)).length
  // Hours of recorded lessons: only lessons whose length the portal knows, rounded down, so the figure never overstates.
  const knownHours = courses.reduce((s, c) => s + Number(c.durationSeconds || 0), 0) / 3600
  const hours = knownHours >= 200 ? `${Math.floor(knownHours / 50) * 50}+` : knownHours >= 20 ? `${Math.floor(knownHours / 10) * 10}+` : ''
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
          {hours
            ? <div className="cw-stats" data-r><span><b>{hours}</b> hours of recorded lessons</span></div>
            : <div className="cw-stats" data-r><span><b>{courses.length}</b> courses</span><span><b>{courses.filter((c) => c.free).length}</b> free</span><span><b>{totalLessons}</b> lessons</span><span><b>{subjects}</b> subjects</span></div>}
        </section>

        <div className="cw-paths" data-stagger>
          <button type="button" className={`cw-path wh-glass${!access && !cat ? ' on' : ''}`} onClick={() => pickPath('')}><small>Self-paced</small><strong>Course Library</strong><span>Every public course</span></button>
          <button type="button" className={`cw-path wh-glass${access === 'free' && !cat ? ' on' : ''}`} onClick={() => pickPath('free')}><small>Open access</small><strong>Free Courses</strong><span>Watch every lesson here</span></button>
          <Link className="cw-path wh-glass cw-path-road" to="/courses/roadmap"><small>Guided</small><strong>Study Roadmap</strong><span>Which texts to study, level by level</span></Link>
          <Link className="cw-path wh-glass" to="/alimiyyah"><small>Scheduled</small><strong>Live · Alimiyyah</strong><span>Guided classes with instructors</span></Link>
          <Link className="cw-path wh-glass" to="/hadith-specialization"><small>Focused</small><strong>Specialization</strong><span>Ḥadīth Specialization pathway</span></Link>
        </div>
        <div className="cw-start-cta" data-r>
          <StartLink className="wh-btn wh-btn-g">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
            <span className="cw-start-q">Not sure where to begin? </span>Find your starting point
          </StartLink>
        </div>

        <section className="cw-lib" ref={libRef} style={{ scrollMarginTop: 0 }}>
          <div className="cw-fpanel wh-glass" role="search">
            <div className="cw-ftop">
              <h2><span className="cw-ftitle" title={title}>{title}</span><small>{list.length} of {courses.length}</small>{(access || cat || q) && <button type="button" className="cw-clear" onClick={() => { setQ(''); setFilter({ access: '', cat: '' }) }}>Clear</button>}</h2>
              <div className="cw-seg" role="group" aria-label="Access">
                <Opt on={!access} count={n((c) => pass(c, 'access'))} label="All" onClick={() => setFilter({ access: '' })} />
                <Opt on={access === 'free'} count={n((c) => c.free && pass(c, 'access'))} label="Free" onClick={() => setFilter({ access: access === 'free' ? '' : 'free' })} />
                <Opt on={access === 'paid'} count={n((c) => !c.free && pass(c, 'access'))} label="Paid" onClick={() => setFilter({ access: access === 'paid' ? '' : 'paid' })} />
              </div>
              <SearchBox q={q} setQ={setQ} hits={words.length ? [...list].sort((a, b) => scores.get(b) - scores.get(a)) : []} total={list.length} onShowAll={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
              <SortMenu value={sort} onChange={setSort} />
            </div>
            <div className="cw-subs" role="group" aria-label="Subject">
              <Opt on={!cat} count={n((c) => pass(c, 'cat'))} label="All subjects" onClick={() => setFilter({ cat: '' })} />
              {subjectList.map((k) => <Opt key={k.slug} on={cats.includes(k.slug)} count={n((c) => c.category === k.slug && pass(c, 'cat'))} label={shortLabel(k.label)} onClick={() => setFilter({ cat: cat === k.slug ? '' : k.slug })} />)}
            </div>
          </div>
          <div className="cw-cards" ref={cardsRef} style={{ scrollMarginTop: 110 }}>
            {list.map((c) => <Card key={c.slug} course={c} inList={inList.has(c.checkoutSlug || c.slug)} />)}
            {!list.length && <p className="cw-empty">No course matches these filters. Try another subject or clear the search.</p>}
          </div>
        </section>
      </div>
    </WahaPage>
  )
}
