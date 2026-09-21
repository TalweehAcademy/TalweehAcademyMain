/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageFooter, PageHeader } from './_shared'
import { PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES } from '../data/publicCourseIndex'
import { fetchLiveCommerceCatalog, formatCommercePrice, mergeCommerceCatalog } from '../data/liveCommerceCatalog'

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.3 4.3"/></svg> }
function BookIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c3-.8 5.5-.2 8 1.5v12c-2.5-1.7-5-2.3-8-1.5v-12Zm16 0c-3-.8-5.5-.2-8 1.5v12c2.5-1.7 5-2.3 8-1.5v-12Z"/></svg> }
function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"/></svg> }
function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5"/></svg> }

function plainText(value = '') {
  return String(value || '')
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function formatPrice(course) {
  return formatCommercePrice(course)
}

function CoursePoster({ course, priority = false }) {
  if (course.poster) return <img className="public-course-poster-image" src={course.poster} alt={`${course.title} course poster`} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'low'} />
  return <div className={`public-course-poster public-course-poster-${course.category}`}>
    <div className="public-course-poster-pattern" aria-hidden="true" />
    <span className="public-course-poster-kicker">Talweeh On-Demand</span>
    <strong>{course.title}</strong>
    <span className="public-course-poster-instructor">{course.instructor}</span>
    <span className="public-course-poster-mark" aria-hidden="true">ت</span>
  </div>
}

function CourseCard({ course, priority = false }) {
  const description = plainText(course.description)
  const summary = description.length > 185 ? `${description.slice(0, 182).trim()}…` : description
  const priceLabel = formatPrice(course)
  return <article className="public-course-card">
    <Link className="public-course-card-visual" to={`/courses/${course.slug}`} aria-label={`View ${course.title}`}>
      <CoursePoster course={course} priority={priority} />
      {course.free && <span className="public-course-free-badge">Free</span>}
    </Link>
    <div className="public-course-card-body">
      <div className="public-course-card-category">{course.categoryLabel}</div>
      <Link className="public-course-card-title" to={`/courses/${course.slug}`}><h2>{course.title}</h2></Link>
      <div className="public-course-card-instructor"><UserIcon /> <span>{course.instructor}</span></div>
      {summary && <p>{summary}</p>}
      <div className="public-course-card-meta">
        <span><BookIcon /> {course.lessonCount} lessons</span>
        <span className={course.free ? 'public-course-access-free' : ''}>{priceLabel}</span>
      </div>
      <Link className="public-course-card-link" to={`/courses/${course.slug}`}>{course.free ? 'Start free course' : 'View course'} <ArrowIcon /></Link>
    </div>
  </article>
}

export default function CoursesPage() {
  const [params, setParams] = useSearchParams()
  const requestedCategory = params.get('category') || ''
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState(() => ({
    courses: PUBLIC_COURSES,
    categories: PUBLIC_COURSE_CATEGORIES,
    live: false,
  }))

  useEffect(() => {
    const controller = new AbortController()
    fetchLiveCommerceCatalog({ signal: controller.signal })
      .then((payload) => {
        setCatalog(mergeCommerceCatalog(PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES, payload))
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.warn('Using bundled Talweeh course catalog fallback', error)
        }
      })
    return () => controller.abort()
  }, [])

  const courses = catalog.courses
  const categories = catalog.categories
  const counts = useMemo(() => courses.reduce((next, course) => {
    const key = String(course.category || '')
    if (key) next[key] = (next[key] || 0) + 1
    return next
  }, {}), [courses])
  const totalLessons = useMemo(
    () => courses.reduce((sum, course) => sum + Number(course.lessonCount || course.lessons?.length || 0), 0),
    [courses],
  )
  const activeCategory = categories.some((category) => category.slug === requestedCategory && counts[category.slug]) ? requestedCategory : ''
  const freeOnly = params.get('free') === '1'

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return courses.filter((course) => {
      if (activeCategory && course.category !== activeCategory) return false
      if (freeOnly && !course.free) return false
      if (!needle) return true
      const haystack = `${course.title} ${course.arabicTitle || ''} ${course.instructor} ${course.categoryLabel} ${plainText(course.description)} ${course.primaryText || ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [activeCategory, freeOnly, query, courses])

  function chooseCategory(category) {
    const next = new URLSearchParams(params)
    // Subject filters are mutually exclusive with the Free filter.
    // Clicking a subject always switches fully to that subject.
    next.delete('free')
    if (category) next.set('category', category); else next.delete('category')
    setParams(next, { replace: true })
  }

  function chooseFree() {
    const next = new URLSearchParams(params)
    // Free is a complete view, not an additional filter layered on a subject.
    next.delete('category')
    next.set('free', '1')
    setParams(next, { replace: true })
  }

  const activeLabel = activeCategory ? categories.find((category) => category.slug === activeCategory)?.label : null
  const freeCount = courses.filter((course) => course.free).length

  return <div className="page-shell public-catalog-shell">
    <PageHeader />
    <main>
      <section className="public-catalog-hero">
        <div className="public-catalog-hero-inner">
          <div>
            <span className="public-catalog-eyebrow">Talweeh Academy Course Library</span>
            <h1>Study the Islamic sciences at your own pace.</h1>
            <p>Explore Talweeh&apos;s public On-Demand Course Library. Free courses can be watched directly here. Paid courses show their full public overview and curriculum before enrollment.</p>
          </div>
          <aside className="public-catalog-hero-note">
            <strong>{courses.length} courses</strong>
            <span>{totalLessons.toLocaleString()} public curriculum lessons</span>
            <small>{freeCount} free · paid courses continue to enrollment</small>
          </aside>
        </div>
      </section>

      <section className="public-catalog-pathways" aria-label="Course pathways">
        <Link to="/navigation-preview/Alimiyyah"><span>Live study</span><strong>Alimiyyah Program</strong><small>Structured live classes</small></Link>
        <Link className="active" to="/courses"><span>Self-paced</span><strong>Course Library</strong><small>Browse all public courses</small></Link>
        <Link to="/courses?free=1"><span>Begin here</span><strong>Free Courses</strong><small>Watch directly on this website</small></Link>
        <Link to="/hadith-specialization"><span>Advanced study</span><strong>Hadith Specialization</strong><small>Dedicated specialization program</small></Link>
      </section>

      <section className="public-catalog-content">
        <div className="public-catalog-heading-row">
          <div><span className="public-catalog-eyebrow">Course Library</span><h2>{activeLabel || (freeOnly ? 'Free Courses' : 'All Courses')}</h2><p>{visible.length} {visible.length === 1 ? 'course' : 'courses'} shown</p></div>
          <label className="public-catalog-search"><SearchIcon /><span className="sr-only">Search courses</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, instructor, text or subject" /></label>
        </div>

        <nav className="public-catalog-filterbar" aria-label="Course subject filters">
          <button type="button" className={!activeCategory && !freeOnly ? 'active' : ''} onClick={() => { const next = new URLSearchParams(params); next.delete('category'); next.delete('free'); setParams(next,{replace:true}) }}>All <b>{courses.length}</b></button>
          <button type="button" className={freeOnly ? 'active' : ''} onClick={chooseFree}>Free <b>{freeCount}</b></button>
          {categories.filter((category) => counts[category.slug]).map((category) => <button type="button" key={category.slug} className={activeCategory === category.slug ? 'active' : ''} onClick={() => chooseCategory(category.slug)}>{category.label} <b>{counts[category.slug]}</b></button>)}
        </nav>

        {visible.length ? <div className="public-course-grid">{visible.map((course, index) => <CourseCard key={course.slug} course={course} priority={index < 3} />)}</div> : <div className="public-catalog-empty"><BookIcon /><h3>No courses match this view.</h3><p>Clear the current filter or try another search.</p><button type="button" onClick={() => { setQuery(''); setParams(new URLSearchParams(),{replace:true}) }}>Show all courses</button></div>}
      </section>

      <section className="public-catalog-portal-cta">
        <div><span className="public-catalog-eyebrow">Two clear pathways</span><h2>Free courses here. Paid learning in the Student Portal.</h2><p>Open-access courses play directly on TalweehAcademy.com. Paid On-Demand courses keep their lesson videos, quizzes, notes and progress inside the Student Portal after enrollment.</p></div>
        <Link to="/courses?free=1">Browse free courses <ArrowIcon /></Link>
      </section>
    </main>
    <PageFooter />
  </div>
}
