/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageFooter, PageHeader } from './_shared'
import { PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES } from '../data/publicCourseIndex'
import { loadPublicCourse } from '../data/publicCourseDetails'
import { fetchLiveCommerceCatalog, findLiveCourse, formatCommercePrice, mergeCommerceCatalog, mergeCourseWithLive } from '../data/liveCommerceCatalog'
import { absoluteUrl, useDocumentMeta } from '../hooks/useDocumentMeta'

const PAID_ENROLLMENT_URL = 'https://talweehacademy.com/course/'

function BookIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c3-.8 5.5-.2 8 1.5v12c-2.5-1.7-5-2.3-8-1.5v-12Zm16 0c-3-.8-5.5-.2-8 1.5v12c2.5-1.7 5-2.3 8-1.5v-12Z"/></svg> }
function UserIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"/></svg> }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10" width="13" height="9" rx="2"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3"/></svg> }
function PlayIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z"/></svg> }
function ArrowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5"/></svg> }
function BackIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6m4-5-5 5 5 5"/></svg> }

function plainText(value = '') {
  return String(value || '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\/\s*(p|div|li|h[1-6]|ul|ol)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function formatPrice(course) {
  return formatCommercePrice(course)
}

function formatLevel(value = '') {
  const normalized = String(value || '').replace(/_/g, ' ').trim()
  if (!normalized) return ''
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function getYouTubeVideoId(value = '') {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtu.be') return url.pathname.replace(/^\//, '').split('/')[0] || null
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

function CoursePoster({ course }) {
  if (course.poster) return <img className="public-course-poster-image public-course-poster-image-large" src={course.poster} alt={`${course.title} course poster`} />
  return <div className={`public-course-poster public-course-poster-${course.category} public-course-poster-large`}><div className="public-course-poster-pattern" aria-hidden="true"/><span className="public-course-poster-kicker">Talweeh On-Demand</span><strong>{course.title}</strong><span className="public-course-poster-instructor">{course.instructor}</span><span className="public-course-poster-mark" aria-hidden="true">ت</span></div>
}

function lessonTitle(lesson) { return typeof lesson === 'string' ? lesson : lesson?.title || 'Lesson' }
function lessonOverview(lesson) { return typeof lesson === 'string' ? '' : plainText(lesson?.overview || '') }
function lessonVideo(lesson) { return typeof lesson === 'string' ? '' : lesson?.youtubeUrl || lesson?.youtube_url || '' }

function RelatedCard({ course }) {
  return <Link className="public-related-course" to={`/courses/${course.slug}`}><div><span>{course.categoryLabel}</span><strong>{course.title}</strong><small>{course.instructor}</small></div><ArrowIcon /></Link>
}

export default function CourseLandingPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [course, setCourse] = useState(null)
  const [catalogCourses, setCatalogCourses] = useState(PUBLIC_COURSES)
  const [courseLoading, setCourseLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [expandedLessons, setExpandedLessons] = useState({})
  const playerRef = useRef(null)

  // Re-runs when the course resolves, overriding the static route metadata.
  useDocumentMeta({ title: course?.title, description: course?.description, image: absoluteUrl(course?.poster) })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setCourseLoading(true)
    setCourse(null)
    setShowAll(false)
    setExpandedLessons({})

    const staticPromise = loadPublicCourse(slug).catch(() => null)

    staticPromise.then((staticCourse) => {
      if (!active) return
      if (staticCourse) {
        setCourse(staticCourse)
        setCourseLoading(false)
      }

      fetchLiveCommerceCatalog({ signal: controller.signal })
        .then((payload) => {
          if (!active) return
          const mergedCatalog = mergeCommerceCatalog(
            PUBLIC_COURSES,
            PUBLIC_COURSE_CATEGORIES,
            payload,
          )
          setCatalogCourses(mergedCatalog.courses)

          const liveCourse = findLiveCourse(payload, slug, staticCourse)
          const mergedCourse = mergeCourseWithLive(staticCourse, liveCourse)
          setCourse(mergedCourse)
        })
        .catch((error) => {
          if (!active || error?.name === 'AbortError') return
          console.warn('Using bundled Talweeh course detail fallback', error)
          if (!staticCourse) setCourse(null)
        })
        .finally(() => {
          if (active) setCourseLoading(false)
        })
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [slug])

  const related = useMemo(
    () => course
      ? catalogCourses
          .filter((item) => item.category === course.category && item.slug !== course.slug)
          .slice(0, 3)
      : [],
    [catalogCourses, course],
  )

  if (courseLoading) return <div className="page-shell public-catalog-shell"><PageHeader /><main className="public-course-not-found"><span className="public-catalog-eyebrow">Courses</span><h1>Loading course…</h1></main><PageFooter /></div>

  if (!course) return <div className="page-shell public-catalog-shell"><PageHeader /><main className="public-course-not-found"><span className="public-catalog-eyebrow">Courses</span><h1>Course not found</h1><p>This public course page is unavailable.</p><Link to="/courses">Return to all courses</Link></main><PageFooter /></div>

  const courseLessons = Array.isArray(course.lessons) ? course.lessons : []
  const canPaidEnroll = !course.free && course.checkoutAvailable !== false
  const previewCount = Math.min(16, courseLessons.length)
  const lessons = showAll ? courseLessons : courseLessons.slice(0, previewCount)
  const playableIndexes = course.free ? courseLessons.map((lesson, index) => getYouTubeVideoId(lessonVideo(lesson)) ? index : -1).filter((index) => index >= 0) : []
  const requestedLesson = Math.max(0, Number.parseInt(searchParams.get('lesson') || '', 10) - 1)
  const activeLessonIndex = playableIndexes.includes(requestedLesson) ? requestedLesson : (playableIndexes[0] ?? -1)
  const activeLesson = activeLessonIndex >= 0 ? courseLessons[activeLessonIndex] : null
  const activeVideoId = activeLesson ? getYouTubeVideoId(lessonVideo(activeLesson)) : null
  const activePlayablePosition = playableIndexes.indexOf(activeLessonIndex)
  const previousPlayableIndex = activePlayablePosition > 0 ? playableIndexes[activePlayablePosition - 1] : null
  const nextPlayableIndex = activePlayablePosition >= 0 && activePlayablePosition < playableIndexes.length - 1 ? playableIndexes[activePlayablePosition + 1] : null
  const description = plainText(course.description)
  const courseIntro = plainText(course.courseIntroduction)
  const facts = [
    ['Level', formatLevel(course.level)],
    ['Language', course.language],
    ['Primary text', plainText(course.primaryText)],
    ['Audience', plainText(course.audience)],
    ['Prerequisites', plainText(course.prerequisites)],
  ].filter(([, value]) => value)

  function openLesson(index) {
    const next = new URLSearchParams(searchParams)
    next.set('lesson', String(index + 1))
    setSearchParams(next, { replace: false })
    window.setTimeout(() => playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  function toggleLessonOverview(index) {
    setExpandedLessons((current) => ({ ...current, [index]: !current[index] }))
  }

  return <div className="page-shell public-catalog-shell">
    <PageHeader />
    <main>
      <section className="public-course-hero">
        <div className="public-course-hero-inner">
          <div className="public-course-hero-copy">
            <nav className="public-course-breadcrumb" aria-label="Breadcrumb"><Link to="/courses">Courses</Link><span>/</span><Link to={`/courses?category=${encodeURIComponent(course.category)}`}>{course.categoryLabel}</Link></nav>
            <div className="public-course-badges"><span>On-Demand</span><span>{course.categoryLabel}</span>{course.free && <span className="free">Free</span>}</div>
            {course.arabicTitle && <div className="public-course-arabic-title" lang="ar" dir="rtl">{course.arabicTitle}</div>}
            <h1>{course.title}</h1>
            {course.subtitle && <p className="public-course-subtitle">{plainText(course.subtitle)}</p>}
            {description && <p className="public-course-lead">{description}</p>}
            <div className="public-course-instructor-line"><UserIcon /><span>Instructor</span><strong>{course.instructor}</strong></div>
            <div className="public-course-hero-actions">
              {course.free
                ? <a className="public-course-primary" href={playableIndexes.length ? '#free-lessons' : '#curriculum'}>{playableIndexes.length ? 'Start watching' : 'View free curriculum'} <PlayIcon /></a>
                : canPaidEnroll
                  ? <a className="public-course-primary" href={PAID_ENROLLMENT_URL}>Enroll in course <ArrowIcon /></a>
                  : null}
              <a className="public-course-secondary" href="#curriculum">View curriculum</a>
            </div>
          </div>
          <aside className="public-course-hero-poster"><CoursePoster course={course} />{course.free && <span className="public-course-free-ribbon">Free course</span>}</aside>
        </div>
      </section>

      <section className="public-course-statbar">
        <div><BookIcon /><span><strong>{course.lessonCount}</strong> curriculum lessons</span></div>
        <div><UserIcon /><span><strong>{course.instructor}</strong> instructor</span></div>
        <div>{course.free ? <PlayIcon /> : <LockIcon />}<span><strong>{course.free ? 'Public website' : 'Student Portal'}</strong> course delivery</span></div>
        <div><span className="public-course-stat-symbol">$</span><span><strong>{formatPrice(course)}</strong> access</span></div>
      </section>

      {course.free && activeLesson && activeVideoId && <section id="free-lessons" className="public-free-course-player" ref={playerRef}>
        <div className="public-free-course-player-heading">
          <div><span className="public-catalog-eyebrow">Free course player</span><h2>{lessonTitle(activeLesson)}</h2><p>Lesson {activeLessonIndex + 1} of {course.lessonCount}</p></div>
          <Link to="/courses?free=1">Browse free courses</Link>
        </div>
        <div className="public-free-course-video-wrap">
          <iframe
            key={activeVideoId}
            src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?rel=0&modestbranding=1`}
            title={`${course.title} — ${lessonTitle(activeLesson)}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        {lessonOverview(activeLesson) && <p className="public-free-course-current-overview">{lessonOverview(activeLesson)}</p>}
        <div className="public-free-course-player-nav">
          <button type="button" disabled={previousPlayableIndex == null} onClick={() => previousPlayableIndex != null && openLesson(previousPlayableIndex)}><BackIcon /> Previous lesson</button>
          <span>{activePlayablePosition + 1} / {playableIndexes.length} videos</span>
          <button type="button" disabled={nextPlayableIndex == null} onClick={() => nextPlayableIndex != null && openLesson(nextPlayableIndex)}>Next lesson <ArrowIcon /></button>
        </div>
      </section>}

      <section className="public-course-detail-layout">
        <div className="public-course-detail-main">
          <section className="public-course-about">
            <span className="public-catalog-eyebrow">About this course</span>
            <h2>A structured course with a complete learning pathway.</h2>
            {description && <p className="public-course-long-copy">{description}</p>}
            {courseIntro && courseIntro !== description && <div className="public-course-extra-copy"><h3>Course introduction</h3><p>{courseIntro}</p></div>}
            {facts.length > 0 && <div className="public-course-facts">{facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
            {course.teachingMethodology && <div className="public-course-extra-copy"><h3>Teaching methodology</h3><p>{plainText(course.teachingMethodology)}</p></div>}
            {course.learningOutcomes && <div className="public-course-extra-copy"><h3>Learning outcomes</h3><p>{plainText(course.learningOutcomes)}</p></div>}
            <div className={`public-course-delivery-note ${course.free ? 'free' : ''}`}>{course.free ? <PlayIcon /> : <LockIcon />}<div><strong>{course.free ? 'Free lessons are available directly on this website.' : 'Paid lesson delivery remains protected in the Student Portal.'}</strong><p>{course.free ? 'Choose any available lesson below and watch without leaving the public Course Library. Account-based progress tracking can be added later without changing the lesson structure.' : 'This public page contains the course overview and curriculum. Paid lesson URLs are intentionally excluded from the public catalogue export.'}</p></div></div>
          </section>

          <section id="curriculum" className="public-course-curriculum">
            <div className="public-course-section-head"><div><span className="public-catalog-eyebrow">Complete curriculum</span><h2>{course.lessonCount} lessons</h2></div><span>{course.free ? `${playableIndexes.length} videos available` : formatPrice(course)}</span></div>
            <div className="public-course-lesson-list">
              {lessons.map((lesson, index) => {
                const overview = lessonOverview(lesson)
                const canPlay = course.free && Boolean(getYouTubeVideoId(lessonVideo(lesson)))
                const expanded = Boolean(expandedLessons[index])
                return <div className={`public-course-lesson-row ${canPlay ? 'playable' : ''}`} key={`${index}-${lessonTitle(lesson)}`}>
                  <span className="public-course-lesson-number">{String(index + 1).padStart(2,'0')}</span>
                  <div className="public-course-lesson-copy">
                    <strong>{lessonTitle(lesson)}</strong>
                    {lesson?.topic && <span className="public-course-lesson-topic">{lesson.topic}</span>}
                    {overview && <><p className={expanded ? 'expanded' : ''}>{overview}</p>{overview.length > 220 && <button className="public-course-lesson-more" type="button" onClick={() => toggleLessonOverview(index)}>{expanded ? 'Show less' : 'Read full overview'}</button>}</>}
                  </div>
                  {course.free
                    ? canPlay
                      ? <button className="public-course-lesson-watch" type="button" onClick={() => openLesson(index)}><PlayIcon /> Watch</button>
                      : <span className="public-course-lesson-access free"><em>Free</em></span>
                    : <span className="public-course-lesson-access"><LockIcon /><em>Student Portal</em></span>}
                </div>
              })}
              {!lessons.length && course.lessonCount > 0 && <div className="public-catalog-empty"><BookIcon /><h3>{course.lessonCount} curriculum lessons</h3><p>Curriculum details are managed in Talweeh Academy and will appear here when included in the public course export.</p></div>}
            </div>
            {!showAll && courseLessons.length > previewCount && <button className="public-course-showall" type="button" onClick={() => setShowAll(true)}>Show entire curriculum <span>{courseLessons.length - previewCount} more lessons</span></button>}
            {showAll && courseLessons.length > previewCount && <button className="public-course-showall" type="button" onClick={() => setShowAll(false)}>Collapse curriculum</button>}
          </section>
        </div>

        <aside className={`public-course-enroll-card ${course.free ? 'free' : ''}`}>
          <span className="public-catalog-eyebrow">Course access</span>
          <h2>{course.free ? 'Start this course for free.' : canPaidEnroll ? `Enroll for ${formatPrice(course)}.` : 'Enrollment is currently unavailable.'}</h2>
          <p>{course.free ? 'No paid enrollment is required. Watch the available lessons directly from this public course page.' : canPaidEnroll ? 'Review the curriculum here, then continue to Talweeh enrollment. Paid videos remain inside the Student Portal after access is granted.' : 'This course remains visible for information, but there is no active public purchase option at this time.'}</p>
          <ul>{course.free ? <><li>Free lesson playback</li><li>Full public curriculum</li><li>No paid enrollment required</li><li>Account progress can be added later</li></> : <><li>Protected video lesson access</li><li>Quizzes and exercises</li><li>Progress tracking</li><li>Lesson notes and learning tools</li></>}</ul>
          {course.free
            ? <a href={playableIndexes.length ? '#free-lessons' : '#curriculum'}>{playableIndexes.length ? 'Start watching' : 'View curriculum'} <PlayIcon /></a>
            : canPaidEnroll
              ? <a href={PAID_ENROLLMENT_URL}>Continue to enrollment <ArrowIcon /></a>
              : null}
          <small>{course.free ? 'Free videos are intentionally allowed in the public export.' : canPaidEnroll ? 'Paid lesson video URLs are never included in the public export.' : 'Enrollment can be enabled again from the Talweeh Admin Commerce page.'}</small>
        </aside>
      </section>

      {related.length > 0 && <section className="public-course-related"><div className="public-course-related-head"><div><span className="public-catalog-eyebrow">Continue exploring</span><h2>More in {course.categoryLabel}</h2></div><Link to={`/courses?category=${encodeURIComponent(course.category)}`}>View category <ArrowIcon /></Link></div><div className="public-course-related-grid">{related.map((item) => <RelatedCard key={item.slug} course={item} />)}</div></section>}
    </main>
    <PageFooter />
  </div>
}
