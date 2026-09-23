/* eslint-disable react/prop-types */
// /courses/:slug — "Majlis" (mockups/course-waha-majlis.html): the course introduces itself in a
// green hero with its poster; free courses then play in the Talweeh video frame (speed, ±10 s)
// with the lessons as cards grouped by topic; paid courses offer one "Add to study list" button
// (with a plan choice when there are several) and list the lessons as locked.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES } from '../data/publicCourseIndex'
import { loadPublicCourse } from '../data/publicCourseDetails'
import { fetchLiveCommerceCatalog, findLiveCourse, formatCommercePrice, mergeCommerceCatalog, mergeCourseWithLive, primaryPurchaseOption } from '../data/liveCommerceCatalog'
import { money, optionBillingLabel } from '../data/commerceCheckout'
import { absoluteUrl, useDocumentMeta } from '../hooks/useDocumentMeta'
import { canEnrol, lessonOverview, lessonTitle, lessonVideo, plainText, purchaseOptions, useStudyList } from '../courses/courseKit'
import { addToStudyList, openStudyList } from '../courses/StudyList'
import WahaVideoPlayer from '../courses/WahaVideoPlayer'

const LEVEL = (v = '') => String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const PREVIEW = 24

function useCourse(slug) {
  const [state, setState] = useState({ loading: true, course: null, catalog: PUBLIC_COURSES })
  useEffect(() => {
    let active = true
    setState({ loading: true, course: null, catalog: PUBLIC_COURSES })
    loadPublicCourse(slug).catch(() => null).then((staticCourse) => {
      if (!active) return
      if (staticCourse) setState((s) => ({ ...s, loading: false, course: staticCourse }))
      fetchLiveCommerceCatalog()
        .then((payload) => {
          if (!active) return
          const merged = mergeCommerceCatalog(PUBLIC_COURSES, PUBLIC_COURSE_CATEGORIES, payload)
          setState({ loading: false, course: mergeCourseWithLive(staticCourse, findLiveCourse(payload, slug, staticCourse)), catalog: merged.courses })
        })
        .catch(() => { if (active) setState((s) => ({ ...s, loading: false })) })
    })
    return () => { active = false }
  }, [slug])
  return state
}

export default function CourseWahaPage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const { loading, course, catalog } = useCourse(slug)
  const studyList = useStudyList()
  const [fullDesc, setFullDesc] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [planId, setPlanId] = useState('')
  const [autoplay, setAutoplay] = useState(false)
  const stageRef = useRef(null)
  useDocumentMeta({ title: course?.title, description: course?.description, image: absoluteUrl(course?.poster) })

  const lessons = useMemo(() => (Array.isArray(course?.lessons) ? course.lessons : []), [course])
  const playable = useMemo(() => (course?.free ? lessons.map((l, i) => (lessonVideo(l) ? i : -1)).filter((i) => i >= 0) : []), [course, lessons])
  const requested = Math.max(0, Number.parseInt(params.get('lesson') || '', 10) - 1)
  const cur = playable.includes(requested) ? requested : (playable[0] ?? -1)
  const options = purchaseOptions(course)
  const plan = options.find((o) => String(o.id) === planId) || primaryPurchaseOption(course)
  useEffect(() => { setPlanId(''); setShowAll(false); setFullDesc(false); setAutoplay(false) }, [slug])
  useEffect(() => {
    if (window.location.hash === '#enrol') document.getElementById('enrol')?.scrollIntoView({ block: 'center' })
  }, [course?.slug])

  if (loading && !course) return <WahaPage className="cw"><div className="wh-wrap cw-status"><span className="cw-kicker">Courses</span><h1>Loading course…</h1></div></WahaPage>
  if (!course) return <WahaPage className="cw"><div className="wh-wrap cw-status"><span className="cw-kicker">Courses</span><h1>Course not found</h1><p>This course page is unavailable.</p><p style={{ marginTop: 18 }}><Link className="wh-btn wh-btn-g" to="/courses">Return to all courses</Link></p></div></WahaPage>

  const canWatch = course.free && playable.length > 0
  const inList = studyList.some((i) => i.productKey === (course.checkoutSlug || course.slug))
  const description = plainText(course.description)
  const openLesson = (i) => {
    const next = new URLSearchParams(params); next.set('lesson', String(i + 1)); setParams(next, { replace: true })
    setAutoplay(true)
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const step = (d) => { const p = playable[playable.indexOf(cur) + d]; if (p != null) openLesson(p) }
  const related = catalog.filter((c) => c.category === course.category && c.slug !== course.slug).slice(0, 3)
  const extras = [['Course introduction', course.courseIntroduction], ['Who it is for', course.audience], ['Learning outcomes', course.learningOutcomes], ['Teaching methodology', course.teachingMethodology], ['Prerequisites', course.prerequisites]]
    .map(([h, v]) => [h, plainText(v)]).filter(([, v]) => v && v !== description)

  // Lesson cards, grouped under their topic headings.
  const shown = showAll ? lessons : lessons.slice(0, PREVIEW)
  let lastTopic = null
  const cards = []
  shown.forEach((l, i) => {
    const topic = typeof l === 'string' ? '' : l?.topic
    if (topic && topic !== lastTopic) { cards.push(<div className="cw-topic" key={`t-${i}`}>{topic}</div>); lastTopic = topic }
    const play = canWatch && playable.includes(i)
    const overview = lessonOverview(l)
    const inner = <><span className="n"><b>{i + 1}</b></span><span><strong>{lessonTitle(l)}</strong>{overview && <small>{overview}</small>}<span className="tag">{play ? '▶ Watch lesson' : course.free ? 'Video coming soon' : '🔒 Student Portal'}</span></span></>
    cards.push(play
      ? <button type="button" key={i} className={`cw-lc cw-card${i === cur ? ' on' : ''}`} onClick={() => openLesson(i)}>{inner}</button>
      : <div key={i} className="cw-lc cw-card">{inner}</div>)
  })

  return (
    <WahaPage className="cw">
      <div className="wh-wrap">
        <p className="cw-crumbs"><Link to="/courses">Courses</Link> / <Link to={`/courses?category=${encodeURIComponent(course.category)}`}>{course.categoryLabel}</Link> / {course.title}</p>
        <section className="cw-mhero">
          <div>
            <span className="cw-kicker">{course.categoryLabel} · {course.free ? 'Free course' : 'On-demand course'}</span>
            {course.arabicTitle && <div className="ar">{course.arabicTitle}</div>}
            <h1>{course.title}</h1>
            {description && <><p className={`lead${!fullDesc && description.length > 360 ? ' clip' : ''}`}>{description}</p>{!fullDesc && description.length > 360 && <button type="button" className="cw-more" onClick={() => setFullDesc(true)}>Read more ▾</button>}</>}
            <div className="facts">
              <span>{course.instructor}</span>
              <span>{course.lessonCount || lessons.length || '—'} lessons</span>
              {course.level && <span>{LEVEL(course.level)}</span>}
              {course.language && <span>{course.language}</span>}
            </div>
            {canWatch ? (
              <div className="cw-acts"><a className="wh-btn wh-btn-g" href="#watch" onClick={(e) => { e.preventDefault(); stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>▶ Start watching</a><a className="wh-btn wh-btn-glass" href="#lessons">All lessons</a></div>
            ) : !course.free ? (
              <div id="enrol">
                {options.length > 1 && (
                  <div className="cw-plans" role="radiogroup" aria-label="Choose a plan">
                    {options.map((o) => <button type="button" key={o.id} role="radio" aria-checked={plan?.id === o.id} className={plan?.id === o.id ? 'on' : ''} onClick={() => setPlanId(String(o.id))}><b>{o.display_name || 'Access'} · {money(o.amount_cents, o.currency)}</b><small>{optionBillingLabel(o)}</small></button>)}
                  </div>
                )}
                <div className="cw-acts">
                  <span className="pr">{plan ? money(plan.amount_cents, plan.currency) : formatCommercePrice(course)}{plan && <small>{optionBillingLabel(plan)}</small>}</span>
                  {inList
                    ? <button type="button" className="wh-btn cw-in-list" onClick={openStudyList}>✓ In your study list</button>
                    : canEnrol(course) && <button type="button" className="wh-btn wh-btn-g" onClick={() => addToStudyList(course, plan)}>Add to study list</button>}
                </div>
                {!canEnrol(course) && <p className="cw-note">Online enrolment for this course isn’t open right now.</p>}
              </div>
            ) : null}
          </div>
          {course.poster ? <img src={course.poster} alt={`${course.title} course poster`} /> : <span className="ph" />}
        </section>

        {canWatch && cur >= 0 && (
          <section className="cw-stage" id="watch" ref={stageRef}>
            <div className="now"><span className="cw-kicker">Now playing · Lesson {cur + 1} of {lessons.length}</span><h2>{lessonTitle(lessons[cur])}</h2></div>
            <WahaVideoPlayer videoId={lessonVideo(lessons[cur])} title={lessonTitle(lessons[cur])} kicker={`Lesson ${cur + 1}`} autoplay={autoplay} onEnded={() => step(1)} />
            <div className="ctl">
              <button type="button" className="wh-btn wh-btn-glass" disabled={playable.indexOf(cur) <= 0} onClick={() => step(-1)}>‹ Previous lesson</button>
              <p className="cw-keys"><kbd>Space</kbd> play · <kbd>←</kbd><kbd>→</kbd> 10 s · <kbd>&lt;</kbd><kbd>&gt;</kbd> speed · <kbd>F</kbd> full screen</p>
              <button type="button" className="wh-btn wh-btn-g" disabled={playable.indexOf(cur) >= playable.length - 1} onClick={() => step(1)}>Next lesson ›</button>
            </div>
            {lessonOverview(lessons[cur]) && <p className="ov">{lessonOverview(lessons[cur])}</p>}
          </section>
        )}

        <section className="cw-lessons" id="lessons">
          <div className="cw-lessons-h"><div><span className="cw-kicker">Curriculum</span><h2>{lessons.length ? `${lessons.length} lessons` : 'Curriculum'}</h2></div>{!course.free && <p>Lessons for this course are delivered in the Talweeh Student Portal after enrolment.</p>}</div>
          <div className="cw-lgrid">{cards.length ? cards : <p className="cw-empty">The curriculum for this course will be listed soon.</p>}</div>
          {lessons.length > PREVIEW && !showAll && <div className="cw-showall"><button type="button" className="wh-btn wh-btn-glass" onClick={() => setShowAll(true)}>Show all {lessons.length} lessons</button></div>}
        </section>

        {extras.length > 0 && <section className="cw-extra">{extras.map(([h, v]) => <div key={h}><h3>{h}</h3><p>{v}</p></div>)}</section>}

        {related.length > 0 && (
          <section className="cw-related"><span className="cw-kicker">More in {course.categoryLabel}</span>
            <div className="grid">{related.map((c) => <Link key={c.slug} className="cw-card" to={`/courses/${c.slug}`}><small>{c.free ? 'Free' : formatCommercePrice(c)}</small><strong>{c.title}</strong><span>{c.instructor}</span></Link>)}</div>
          </section>
        )}
      </div>
    </WahaPage>
  )
}
