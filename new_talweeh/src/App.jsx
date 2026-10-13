/* eslint-disable react/prop-types */
import { lazy as talweehProgramLazy } from 'react'
import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react'
import './App.css'
import './public-theme.css'
import './commerce-cart-link.css'
import './night-portal-v1.css'
import './social-icons.css'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RouteMeta } from './hooks/useDocumentMeta'
import { useScrollLock } from './hooks/useScrollLock'
import { createPortal } from 'react-dom'
import { extractVideoId } from './utils/youtube'
import WahaVideoPlayer from './courses/WahaVideoPlayer'
import { StudyListHost } from './courses/StudyList'
import { StartGuideHost, StartLink } from './components/StartGuideHost'
import { PUBLIC_COURSES } from './data/publicCourseIndex'
import { formatCommercePrice } from './data/liveCommerceCatalog'
const CoursesPage = lazy(() => import('./pages/courses-waha'))
const ArticlesPage = lazy(() => import('./pages/articles-waha'))
import { ARTICLES } from './data/articles'
import HOME_FEED from './data/homeFeed.json'
const MediaPage = lazy(() => import('./pages/media-waha'))
const MediaDetailPage = lazy(() => import('./pages/media-watch-waha'))
const ArticleDetailPage = lazy(() => import('./pages/article-waha'))
const AboutWahaPage = lazy(() => import('./pages/about-waha'))
const CourseLandingPage = lazy(() => import('./pages/course-waha'))
const RoadmapPage = lazy(() => import('./pages/roadmap-waha'))
const StartGuidePage = lazy(() => import('./pages/start-guide'))
const CommerceCartPage = lazy(() => import('./pages/cart-waha'))
const CommerceCheckoutPage = lazy(() => import('./pages/checkout-waha'))
const QuranReaderPage = lazy(() => import('./pages/quran-reader'))
const QuranHomePage = lazy(() => import('./pages/quran-home'))
const QuranReadPage = lazy(() => import('./pages/quran-read'))
const QuranStudyPage = lazy(() => import('./pages/quran-study'))
const QuranListenPage = lazy(() => import('./pages/quran-listen'))
const ArabicPage = lazy(() => import('./pages/arabic-waha'))
const ArabicProgramPage = lazy(() => import('./pages/arabic-program'))
const ArabicFaqPage = lazy(() => import('./pages/arabic-faq'))
const ArabicAboutPage = lazy(() => import('./pages/arabic-about'))
import { useContent } from './hooks/useContent'
import { EditModeProvider, EditModeToggle, Editable } from './components/ContentEditor'
import { LOGO, SmartLink, WahaHeader, WahaFooter, WahaPage, useWahaMotion } from './components/WahaShell'
const HadithSpecializationPage = talweehProgramLazy(() => import('./pages/hadith-waha'))
const HadithLearningPage = lazy(() => import('./pages/hadith-learning'))
const ArabicLearningPage = lazy(() => import('./pages/arabic-learning'))
const ArabicEnrolPage = lazy(() => import('./pages/arabic-enrol'))
const ArabicAssessmentPage = lazy(() => import('./pages/arabic-assessment'))
const HadithEnrolPage = lazy(() => import('./pages/hadith-enrol'))
const AlimiyyahPage = lazy(() => import('./pages/alimiyyah-waha'))
const NavigationPreviewPage = lazy(() => import('./pages/navigation-preview'))

// ═══ Homepage — Wāḥa Forest design (mockups/landing-waha-forest.html) ═══
// Styles live in home-waha-v1.css, every class prefixed `wh-`.

function useNarrow(breakpoint = 700) {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return narrow
}

function SectionHeading({ title, text }) {
  return (
    <div className="wh-sh" data-r>
      <div className="wh-divider" aria-hidden="true"><img src={LOGO} alt="" /></div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

// ── Choose how you learn: the two routes, side by side (rows line up across both columns) ──
const CHECK = <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
const COURSE_COUNT = PUBLIC_COURSES.length
const FREE_COUNT = PUBLIC_COURSES.filter((course) => course.free).length
const SUBJECT_COUNT = new Set(PUBLIC_COURSES.map((course) => course.category)).size
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const inWords = (n) => NUMBER_WORDS[n] || String(n)

function RouteProgram({ to, image, posters, kicker, arabic, title, text, facts, more }) {
  const Tag = to.startsWith('#') ? 'a' : Link
  const target = to.startsWith('#') ? { href: to } : { to }
  return (
    <Tag className="wh-rp" {...target}>
      {posters
        ? <div className="wh-rp-fan" aria-hidden="true">{posters.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}</div>
        : <img className="wh-rp-img" src={image} alt="" loading="lazy" />}
      <div className="wh-rp-b">
        <div className="wh-rp-k"><span>{kicker}</span><span className="wh-ar">{arabic}</span></div>
        <h4>{title}</h4>
        <p>{text}</p>
        <div className="wh-rp-facts">{facts.map((fact) => <span key={fact}>{fact}</span>)}</div>
        <span className="wh-rp-more">{more}</span>
      </div>
    </Tag>
  )
}

function StudyRoutes() {
  return (
    <div className="wh-routes" data-r>
      <div className="wh-route" id="self-paced">
        <div className="wh-route-h">
          <div><span className="wh-way-tag">Self-paced · Recorded lessons</span></div>
          <h3>At your own pace</h3>
          <p>Watch, pause and rewatch. Start on any day and keep your place.</p>
        </div>
        <RouteProgram to="/arabic" image="/brand/program-arabic-manuscript.webp" kicker="Program" arabic="العربية"
          title="2-Year Arabic Program" text="Step by step from your first lesson to reading the Qurʾān and classical texts."
          facts={['2 years', 'About 6 hrs a week', 'Start any time']} more="Explore the program →" />
        <RouteProgram to="#courses" kicker="Courses" arabic="حسب الطلب"
          posters={['/catalog-posters/al-shamail-al-muhammadiyyah.webp', '/catalog-posters/introduction-to-usul-al-hadith.webp', '/catalog-posters/usul-al-shashi.webp']}
          title="On-demand courses" text="Single courses on one book or one science: Ḥadīth, Fiqh, Uṣūl, Naḥw, Adab and more."
          facts={[`${COURSE_COUNT} courses`, `${SUBJECT_COUNT} subjects`, `${FREE_COUNT} free`]} more="See the courses ↓" />
        <div className="wh-route-x"><span>Also: {inWords(FREE_COUNT)} courses free to begin today.</span><Link to="/courses?free=1">See free courses →</Link></div>
        <div className="wh-route-s">{CHECK}<span>Suits you if you study around work, family or a changing timetable.</span></div>
      </div>
      <div className="wh-route" id="live">
        <div className="wh-route-h">
          <div><span className="wh-way-tag is-live">Live · With scholars</span></div>
          <h3>Live with scholars</h3>
          <p>Scheduled online classes, taught and followed by our teachers.</p>
        </div>
        <RouteProgram to="/alimiyyah" image="/brand/program-alimiyyah.webp" kicker="Program" arabic="العالمية"
          title="ʿĀlimiyyah" text="Preparing future scholars: a full path through the Islamic sciences, beginning with Arabic."
          facts={['10-year path', 'Starts with Arabic', 'By application']} more="Explore ʿĀlimiyyah →" />
        <RouteProgram to="/hadith-specialization" image="/brand/program-hadith-books.webp" kicker="Specialization" arabic="الحديث"
          title="Hadith Specialization" text="Advanced study of the Ḥadīth sciences, from the preservation of the Sunnah to Tadrīb al-Rāwī."
          facts={['2 years', 'Advanced', 'Live classes']} more="Explore the specialization →" />
        <div className="wh-route-x"><span>Also: standalone live courses each term.</span><Link to="/contact-us">Ask about live courses →</Link></div>
        <div className="wh-route-s">{CHECK}<span>Suits you if you want fixed class times and a teacher guiding you.</span></div>
      </div>
    </div>
  )
}

// ── Start with a course: four topics, each a big poster and two more, a new pick on each visit ──
const shuffledCourses = (list) => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
// Subject slugs as both catalogues name them: the build's course index (hadith-sciences, nahw-sarf) and the
// portal's live catalogue that /courses loads in the browser (usul-al-hadith, nahw).
const COURSE_TOPICS = [
  { key: 'free', title: 'Begin free', arabic: 'مجاني', match: (c) => c.free, lead: 'arabic-crash-course', more: 'All free courses →', to: '/courses?free=1' },
  { key: 'hadith', title: 'Ḥadīth', arabic: 'الحديث', cats: ['hadith', 'hadith-sciences', 'usul-al-hadith'], more: 'All Ḥadīth courses →' },
  { key: 'fiqh', title: 'Fiqh & Uṣūl', arabic: 'الفقه', cats: ['fiqh', 'usul-al-fiqh'], more: 'All Fiqh & Uṣūl courses →' },
  { key: 'arabic', title: 'Arabic', arabic: 'العربية', cats: ['arabic-language', 'nahw-sarf', 'nahw'], more: 'All Arabic courses →' },
].map((t) => ({ ...t, match: t.match || ((c) => t.cats.includes(c.category)), to: t.to || `/courses?category=${t.cats.join(',')}` }))
  .map((t) => ({ ...t, count: PUBLIC_COURSES.filter(t.match).length }))

// Three per topic, the lead first; a course already shown in an earlier topic is not repeated.
function pickTopicCourses(order) {
  const used = new Set()
  return COURSE_TOPICS.map((topic) => {
    const pool = order.filter((c) => c.poster && topic.match(c) && !used.has(c.slug))
    const lead = pool.find((c) => c.slug === topic.lead) || pool[0]
    const picks = lead ? [lead, ...pool.filter((c) => c !== lead).slice(0, 2)] : []
    picks.forEach((c) => used.add(c.slug))
    return { ...topic, picks }
  })
}

function CourseShelf() {
  // First paint keeps the catalogue order so the prerendered page and the browser agree; then shuffle.
  const [topics, setTopics] = useState(() => pickTopicCourses(PUBLIC_COURSES))
  useEffect(() => { setTopics(pickTopicCourses(shuffledCourses(PUBLIC_COURSES))) }, [])
  return (
    <>
      <div className="wh-topics" data-r>
        {topics.filter((t) => t.picks.length).map(({ key, title, arabic, count, picks: [lead, ...rest], more, to }) => (
          <div key={key} className="wh-topic">
            <div className="wh-topic-h"><div><h3>{title}</h3><small>{count} course{count === 1 ? '' : 's'}</small></div><span className="wh-ar">{arabic}</span></div>
            <Link className="wh-tpc" to={`/courses/${lead.slug}`}>
              <div className="wh-tpc-p"><img src={lead.poster} alt="" loading="lazy" /><span className={`wh-tp-price${lead.free ? ' free' : ''}`}>{formatCommercePrice(lead)}</span></div>
              <div className="wh-tpc-b">
                <span className="wh-tpc-sub">{lead.categoryLabel}</span>
                <h4>{lead.title}</h4>
                <span className="wh-tpc-meta">{lead.instructor}</span>
                <span className="wh-tpc-meta is-n">{lead.lessonCount ? `${lead.lessonCount} lessons` : '\u00a0'}</span>
              </div>
            </Link>
            {[0, 1].map((i) => rest[i]
              ? <Link key={rest[i].slug} className="wh-tpl" to={`/courses/${rest[i].slug}`}><div><h4>{rest[i].title}</h4><span>{rest[i].lessonCount ? `${rest[i].lessonCount} lessons` : rest[i].categoryLabel}</span></div><span className={`wh-tp-price${rest[i].free ? ' free' : ''}`}>{formatCommercePrice(rest[i])}</span></Link>
              : <span key={i} className="wh-tpl is-empty" aria-hidden="true" />)}
            <Link className="wh-topic-more" to={to}>{more}</Link>
          </div>
        ))}
      </div>
      <p className="wh-swipe-hint" aria-hidden="true">Swipe for more subjects →</p>
      <div className="wh-shelf-foot" data-r>
        <Link className="wh-btn wh-btn-g" to="/courses" data-magnet>Browse all {COURSE_COUNT} courses →</Link>
        <Link className="wh-btn wh-btn-glass" to="/courses/roadmap">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" /></svg>
          See the study roadmap
        </Link>
      </div>
    </>
  )
}

function formatLandingDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ── What our students say: three at a time, all readable (one on phones), ‹ › and dots ──
// "What our students say": the testimonials, then the review quotes picked in the portal, dealt into one card per
// column (1 on phones, 2 on tablets, 3 on desktop). The columns' cards turn over in turn, so each card holds a quote for
// about 12 s (one turn every 4 s on desktop, 6 s on tablets; a phone's single card every 8 s). Hover or keyboard focus holds them; a hidden tab or "reduce motion" keeps
// them still. Each column keeps all its quotes stacked in one cell (only one shown), so a card never changes height.
const HOLD = 12000
const PHONE_HOLD = 8000
const TURN_OUT = 520
function StudentReflections({ testimonials }) {
  const narrow = useNarrow()
  const tablet = useNarrow(1001)
  const count = testimonials.length
  const cols = Math.max(1, Math.min(narrow ? 1 : tablet ? 2 : 3, count))
  const groups = useMemo(() => Array.from({ length: cols }, (_, c) => testimonials.filter((_, i) => i % cols === c)), [testimonials, cols])
  const [pos, setPos] = useState(() => groups.map(() => 0))
  const [turning, setTurning] = useState(-1)
  const held = useRef(false)
  useEffect(() => {
    setPos(groups.map(() => 0)); setTurning(-1)
    const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (still || !groups.some((g) => g.length > 1)) return undefined
    let next = 0
    let swap
    const tick = setInterval(() => {
      if (held.current || document.hidden) return
      let c = next
      for (let k = 0; k < cols && groups[c].length < 2; k += 1) c = (c + 1) % cols
      next = (c + 1) % cols
      setTurning(c)
      swap = setTimeout(() => { setPos((p) => p.map((v, i) => (i === c ? (v + 1) % groups[c].length : v))); setTurning(-1) }, TURN_OUT)
    }, cols === 1 ? PHONE_HOLD : HOLD / cols)
    return () => { clearInterval(tick); clearTimeout(swap) }
  }, [groups, cols])
  if (!count) return null
  const initials = (name) => { const w = name.split(/\s+/).filter(Boolean); return (w[0]?.[0] || '') + (w.length > 1 ? w[w.length - 1][0] : '') }
  const hold = (on) => () => { held.current = on }
  return (
    <div className="wh-refl wh-refl-flip" data-r onMouseEnter={hold(true)} onMouseLeave={hold(false)} onFocus={hold(true)} onBlur={hold(false)}>
      {groups.map((group, c) => (
        <div key={c} className="wh-refl-slot">
          {group.map((item, k) => {
            const on = k === (pos[c] ?? 0)
            return (
              <figure key={`${item.name}-${k}`} className={`wh-refl-q wh-glass${on ? (turning === c ? ' on out' : ' on') : ''}`} aria-hidden={on ? undefined : 'true'}>
                <span className="wh-refl-mark" aria-hidden="true">“</span>
                <blockquote>{item.quote}</blockquote>
                <figcaption><span className="wh-refl-av" aria-hidden="true">{initials(item.name)}</span><div><b>{item.name}</b><span>{item.location}</span></div></figcaption>
              </figure>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Read & reflect: the newest article large with its cover, the next two beside it ──
function ReadReflect({ articles }) {
  const [lead, ...rest] = articles
  const Meta = ({ a }) => <div className="wh-rr-meta">{a.category && <span className="wh-rr-tag">{a.category}</span>}<span>{formatLandingDate(a.publishedAt)}</span>{a.readTime && <span>{a.readTime}</span>}</div>
  return (
    <div className={`wh-rr${rest.length ? '' : ' is-one'}`} data-r>
      <Link className="wh-rr-lead wh-glass" to={`/articles/${lead.slug}`}>
        {lead.imageUrl && <img src={lead.imageUrl} alt="" loading="lazy" />}
        <div className="wh-rr-b"><Meta a={lead} /><h3>{lead.title}</h3>{lead.excerpt && <p>{lead.excerpt}</p>}<span className="wh-rr-more">Read the article →</span></div>
      </Link>
      {rest.length > 0 && (
        <div className="wh-rr-side">
          {rest.map((a) => (
            <Link key={a.id} className="wh-rr-item wh-glass" to={`/articles/${a.slug}`}>
              {a.imageUrl ? <img src={a.imageUrl} alt="" loading="lazy" /> : <span className="ph" aria-hidden="true" />}
              <div className="wh-rr-b"><Meta a={a} /><h4>{a.title}</h4>{a.excerpt && <p>{a.excerpt}</p>}<span className="wh-rr-more">Read →</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Watch a lesson: clean thumbnails, the title and teacher under each; the player opens in place on click ──
// Titles come as "Topic | Teacher | Talweeh Academy"; the channel name is dropped and a teacher part shown on its own.
const TEACHER_PART = /^(sh\.?|sheikh|shaykh|mufti|ustadh)\s/i
function splitVideoTitle(raw = '') {
  const parts = raw.split('|').map((p) => p.trim()).filter((p) => p && !/^talweeh academy$/i.test(p))
  const teacher = parts.find((p) => TEACHER_PART.test(p)) || ''
  return { title: parts.filter((p) => p !== teacher).join(' · ') || raw, teacher }
}

// Tapping a lesson opens it over the page, already playing: a panel that slides up on a phone, a popup on larger
// screens, with the other lessons under it. One player is kept ready in the closed panel (warmed when this section
// comes near the screen) so the tap itself starts the video; phones refuse sound when it starts any later.
function WatchLessons({ videos }) {
  const items = videos.map((v, i) => ({ ...v, id: extractVideoId(v.src), i })).filter((v) => v.id).slice(0, 4)
  const [openId, setOpenId] = useState(null)
  // The panel lives at the end of <body>, above the site header (first paint has none, as the prerendered page).
  const [host, setHost] = useState(null)
  useEffect(() => setHost(document.body), [])
  const playerRef = useRef(null)
  const gridRef = useRef(null)
  const panelRef = useRef(null)
  const returnRef = useRef(null)
  useScrollLock(Boolean(openId))
  useEffect(() => {
    const el = gridRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((entries) => { if (entries.some((x) => x.isIntersecting)) { playerRef.current?.warm(); io.disconnect() } }, { rootMargin: '500px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => { if (panelRef.current) panelRef.current.inert = !openId }, [openId, host])
  const close = () => { playerRef.current?.pause(); setOpenId(null); returnRef.current?.focus({ preventScroll: true }) }
  useEffect(() => {
    if (!openId) return undefined
    const onKey = (e) => { if (e.key === 'Escape' && !document.documentElement.classList.contains('vp-full')) close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])
  // Phone: pulling the panel down by its handle closes it.
  const drag = useRef(null)
  const onGrabStart = (e) => { drag.current = { y: e.touches[0].clientY, dy: 0 } }
  const onGrabMove = (e) => { if (!drag.current) return; drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y); panelRef.current.querySelector('.wh-vs-panel').style.transform = `translateY(${drag.current.dy}px)` }
  const onGrabEnd = () => { const d = drag.current; drag.current = null; panelRef.current.querySelector('.wh-vs-panel').style.transform = ''; if (d && d.dy > 90) close() }
  if (!items.length) return null
  // Shown at once (before React re-renders), so YouTube is visible when the tap starts it.
  const open = (v, e) => {
    returnRef.current = e?.currentTarget || returnRef.current
    if (panelRef.current) { panelRef.current.classList.add('on'); panelRef.current.inert = false }
    playerRef.current?.play(v.id)
    setOpenId(v.id)
  }
  const current = items.find((v) => v.id === openId) || items[0]
  const cur = splitVideoTitle(current.title)
  const curLabel = cur.title || `Talweeh Academy lesson ${current.i + 1}`
  return (
    <>
      <div className={`wh-watch is-${items.length}`} data-r ref={gridRef}>
        {items.map((v) => {
          const { title, teacher } = splitVideoTitle(v.title)
          const label = title || `Talweeh Academy lesson ${v.i + 1}`
          return (
            <article key={v.id} className="wh-watch-c">
              <button type="button" className="wh-watch-t" onClick={(e) => open(v, e)} aria-label={`Play ${label}`}>
                <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
                <span className="wh-watch-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" /></svg></span>
              </button>
              {title && <h4>{title}</h4>}
              {teacher && <span>{teacher}</span>}
            </article>
          )
        })}
      </div>
      {host && createPortal(<div className={`wh-vs${openId ? ' on' : ''}`} ref={panelRef} aria-hidden={!openId}>
        <div className="wh-vs-dim" onClick={close} />
        <div className="wh-vs-panel" role="dialog" aria-modal="true" aria-label={curLabel}>
          <div className="wh-vs-head">
            <div className="wh-vs-grab" onTouchStart={onGrabStart} onTouchMove={onGrabMove} onTouchEnd={onGrabEnd}><span /></div>
            <button type="button" className="wh-vs-x" onClick={close} aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
          </div>
          <WahaVideoPlayer ref={playerRef} videoId={current.id} title={curLabel} kicker="Talweeh Media" warmOnView={false} />
          <div className="wh-vs-meta">
            <div><h3>{curLabel}</h3>{cur.teacher && <span>{cur.teacher}</span>}</div>
            <Link to="/media" className="wh-vs-more" onClick={close}>More lessons in Media →</Link>
          </div>
          {items.length > 1 && (
            <div className="wh-vs-list">
              <b>More lessons</b>
              {items.filter((v) => v.id !== current.id).map((v) => {
                const { title, teacher } = splitVideoTitle(v.title)
                return (
                  <button type="button" key={v.id} className="wh-vs-row" onClick={() => open(v)}>
                    <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
                    <span><strong>{title || `Talweeh Academy lesson ${v.i + 1}`}</strong>{teacher && <small>{teacher}</small>}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>, host)}
    </>
  )
}

// ── Begin today: three free first steps (the Society card keeps its text and link from the portal) ──
function BeginToday({ society }) {
  const Icon = ({ d }) => <span className="wh-bt-ic" aria-hidden="true"><svg viewBox="0 0 24 24">{d}</svg></span>
  return (
    <div className="wh-bt wh-glass" data-r="scale">
      <div className="wh-ar" aria-hidden="true">رَبِّ زِدْنِي عِلْمًا</div>
      <h2 id="wh-begin-heading">Begin <em>today.</em></h2>
      <p className="wh-bt-lead">Three free ways to take your first step, whichever path you choose.</p>
      <div className="wh-bt-ways">
        <div className="wh-bt-w">
          <Icon d={<><path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" /><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" /></>} />
          <small>Free course</small><h3>Arabic Crash Course</h3>
          <p>Nine short lessons that give you a clear overview of the Arabic language.</p>
          <Link className="wh-btn wh-btn-g" to="/courses/arabic-crash-course">Start the course →</Link>
        </div>
        <div className="wh-bt-w">
          <Icon d={<><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>} />
          <small>Free assessment</small><h3>Find your Arabic level</h3>
          <p>A short test that shows where to start in the Arabic Program.</p>
          <Link className="wh-btn wh-btn-glass" to="/arabic/assessment">Take the assessment →</Link>
        </div>
        <div className="wh-bt-w">
          <Icon d={<><path d="m22 3-9.5 18-2.5-8-8-2.5z" /><path d="M22 3 10 13" /></>} />
          <small>Free community</small><h3>{society.heading || 'Talweeh Society'}</h3>
          <p>{society.text}</p>
          <SmartLink className="wh-btn wh-btn-glass" to={society.buttonHref}>{society.buttonLabel || 'Join us'} →</SmartLink>
        </div>
      </div>
    </div>
  )
}

function LandingPage() {
  const { content: c } = useContent('landing')
  const { content: g } = useContent('global')
  const rootRef = useRef(null)
  const latestArticles = ARTICLES.slice(0, 3)
  // From the portal (Admin → Website CMS → Home page) when published there, else the site's own defaults.
  const videos = HOME_FEED.videos.length
    ? HOME_FEED.videos.map((v) => ({ src: `https://www.youtube.com/embed/${v.youtubeId}`, title: v.title }))
    : (c.youtube.videos || []).filter(Boolean).map((src) => ({ src, title: '' }))
  // Then the parts of course reviews picked in the portal, with the course under the name.
  const testimonials = [...(HOME_FEED.testimonials.length ? HOME_FEED.testimonials : c.testimonials), ...(HOME_FEED.reviewQuotes || []).map((q) => ({ name: q.name, location: q.course, quote: q.quote }))]

  useWahaMotion(rootRef)

  return (
    <div className="wh-home" ref={rootRef}>
      <div className="wh-aurora" aria-hidden="true"><i /><i /></div>
      <WahaHeader social={g.footer.social} />

      <main>
        {/* ── Hero: the promise, two free ways in, and the two ways to study ── */}
        <Editable page="landing" sectionKey="hero">
          <section className="wh-hero" id="hero">
            <div className="wh-wrap">
              <div className="wh-ar" data-r>{c.hero?.arabic || 'رَبِّ زِدْنِي عِلْمًا'}</div>
              <h1>Classical Islamic scholarship, <em>taught with clarity.</em></h1>
              <p className="wh-lead" data-r>Study at your own pace, or live with qualified scholars. From your first Arabic lesson to specialist study.</p>
              <div className="wh-acts" data-r>
                <Link className="wh-btn wh-btn-g" to="/courses/arabic-crash-course" data-magnet>Start the free Arabic Crash Course →</Link>
                <Link className="wh-btn wh-btn-glass" to="/arabic/assessment">Take the free assessment</Link>
                <StartLink className="wh-btn wh-btn-glass wh-btn-start">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
                  Find your starting point
                </StartLink>
              </div>
              <div className="wh-ways" data-r>
                {/* The title link covers the card; each programme in the line under it is its own link above that. */}
                <div className="wh-way">
                  <img src="/brand/program-arabic-manuscript.webp" alt="" loading="eager" />
                  <div><span className="wh-way-tag">Self-paced</span><h3><Link className="wh-way-main" to="/courses">At your own pace</Link></h3>
                    <p className="wh-way-links"><Link to="/arabic">Arabic Program</Link><span aria-hidden="true">·</span><Link to="/courses">On-demand courses</Link></p></div>
                </div>
                <div className="wh-way">
                  <img src="/brand/program-alimiyyah.webp" alt="" loading="eager" />
                  <div><span className="wh-way-tag is-live">Live</span><h3><Link className="wh-way-main" to="/alimiyyah">Live with scholars</Link></h3>
                    <p className="wh-way-links"><Link to="/alimiyyah">ʿĀlimiyyah</Link><span aria-hidden="true">·</span><Link to="/hadith-specialization">Hadith</Link><span aria-hidden="true">·</span><Link to="/contact-us">Live courses</Link></p></div>
                </div>
              </div>
            </div>
          </section>
        </Editable>

        {/* ── Choose how you learn: self-paced or live ── */}
        <section className="wh-s" id="programs">
          <div className="wh-wrap">
            <SectionHeading title="Choose how you learn." text="Recorded lessons you take whenever suits you, or scheduled classes with our scholars." />
            <StudyRoutes />
          </div>
        </section>

        {/* ── Start with a course ─────────────────── */}
        <section className="wh-s" id="courses">
          <div className="wh-wrap wh-wrap-wide">
            <SectionHeading title="Start with a course." text="Recorded courses taught by our scholars. Pick a starting point." />
            <CourseShelf />
          </div>
        </section>

        {/* ── What our students say ───────────────── */}
        <Editable page="landing" sectionKey="testimonials">
          <section className="wh-s">
            <div className="wh-wrap">
              <SectionHeading title="What our students say." text="Reflections from learners studying with Talweeh Academy around the world." />
              <StudentReflections testimonials={testimonials} />
            </div>
          </section>
        </Editable>

        {/* ── Read & reflect (latest articles) ─────── */}
        {latestArticles.length > 0 && (
          <Editable page="landing" sectionKey="latestArticles">
            <section className="wh-s">
              <div className="wh-wrap">
                <SectionHeading title="Read & reflect." text="Short academic benefits and reflections to support your reading beyond the classroom." />
                <ReadReflect articles={latestArticles} />
                <div className="wh-center" data-r><Link className="wh-btn wh-btn-glass" to="/articles">All articles →</Link></div>
              </div>
            </section>
          </Editable>
        )}

        {/* ── Watch a lesson ───────────────────────── */}
        {videos.length > 0 && (
          <Editable page="landing" sectionKey="youtube">
            <section className="wh-s">
              <div className="wh-wrap">
                <SectionHeading title="Watch a lesson." text="Lessons, benefits and discussions from our YouTube channel." />
                <WatchLessons videos={videos} />
                <div className="wh-shelf-foot" data-r>
                  <Link className="wh-btn wh-btn-g" to="/media" data-magnet>All videos in Media →</Link>
                  <a className="wh-btn wh-btn-glass" href={c.youtube.url} target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4" /><path d="m10 9 5 3-5 3z" /></svg>
                    Subscribe on YouTube
                  </a>
                </div>
              </div>
            </section>
          </Editable>
        )}

        {/* ── Begin today ──────────────────────────── */}
        <Editable page="landing" sectionKey="joinSociety">
          <section className="wh-s" aria-labelledby="wh-begin-heading">
            <div className="wh-wrap">
              <BeginToday society={c.joinSociety} />
            </div>
          </section>
        </Editable>
      </main>

      <WahaFooter social={g.footer.social} copyright={g.footer.copyright} />
      <StudyListHost />
      <StartGuideHost />
    </div>
  )
}

// /quran is the Qurʾān home; /quran?surah=&ayah= is the reader. Links from the previous reader
// (?mode=read, ?quranMode=study / ?study=1) are sent to the dedicated Read Mode and Study pages.
function QuranRoute() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const at = new URLSearchParams()
  if (params.get('surah')) at.set('surah', params.get('surah'))
  if (params.get('ayah')) at.set('ayah', params.get('ayah'))
  if (params.get('mode') === 'read') return <Navigate replace to={`/quran/read?${at}`} />
  if (['study', 'sources'].includes(params.get('quranMode')) || params.get('study') === '1') return <Navigate replace to={`/quran/study?${at}`} />
  return params.has('surah') || params.has('ayah') ? <QuranReaderPage /> : <QuranHomePage />
}

function NotFoundPage() {
  return (
    <div className="page-shell">
      <main className="not-found-page">
        <h1>Page not found</h1>
        <p>The page you are looking for doesn&apos;t exist or has been moved.</p>
        <Link className="green-button" to="/">Back to Home</Link>
      </main>
    </div>
  )
}

// React Router keeps the previous page's scroll offset across navigations —
// without this, opening a page from a scrolled position lands mid-page.
// Hash links (#curriculum) are left alone so in-page anchors still work.
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

// Shown while a page's code loads (first visit, or opening a link in a new tab). It uses the Wāḥa
// header on an empty full-height page, so neither the old site's header/footer nor the footer
// jumping up into view flashes before the page arrives.
function RouteLoadingFallback() {
  return (
    <WahaPage className="wh-route-loading">
      <div className="wh-wrap wh-route-loading-body" role="status" aria-live="polite">
        <span className="wh-route-loading-mark" aria-hidden="true" />
        <span className="wh-visually-hidden">Loading…</span>
      </div>
    </WahaPage>
  )
}

function AppInner() {
  return (
    <EditModeProvider>
      <ScrollToTop />
      <EditModeToggle />
      <RouteMeta />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
        <Route path="/navigation-preview/Alimiyyah" element={<AlimiyyahPage />} />
        <Route path="/alimiyyah" element={<AlimiyyahPage />} />
        <Route path="/hadith-specialization" element={<HadithSpecializationPage />} />
        <Route path="/hadith-specialization/learning" element={<HadithLearningPage />} />
        <Route path="/hadith-specialization/enroll" element={<HadithEnrolPage />} />
        <Route path="/navigation-preview/Hadith%20Specialization" element={<HadithSpecializationPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/navigation-preview/:section" element={<NavigationPreviewPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/media/:slug" element={<MediaDetailPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage />} />
        <Route path="/about-us" element={<AboutWahaPage tab="talweeh" />} />
        <Route path="/instructors" element={<AboutWahaPage tab="instructors" />} />
        <Route path="/instructors/:slug" element={<AboutWahaPage tab="instructors" />} />
        <Route path="/contact-us" element={<AboutWahaPage tab="contact" />} />
        <Route path="/courses/roadmap" element={<RoadmapPage />} />
        <Route path="/start" element={<StartGuidePage />} />
        <Route path="/courses/:slug" element={<CourseLandingPage />} />
        <Route path="/cart" element={<CommerceCartPage />} />
        <Route path="/checkout" element={<CommerceCheckoutPage />} />
        <Route path="/quran" element={<QuranRoute />} />
        <Route path="/quran/read" element={<QuranReadPage />} />
        <Route path="/quran/study" element={<QuranStudyPage />} />
        <Route path="/quran/listen" element={<QuranListenPage />} />
        <Route path="/arabic" element={<ArabicPage />} />
        <Route path="/arabic/program" element={<ArabicProgramPage />} />
        <Route path="/arabic/learning" element={<ArabicLearningPage />} />
        <Route path="/arabic/enroll" element={<ArabicEnrolPage />} />
        <Route path="/arabic/assessment" element={<ArabicAssessmentPage />} />
        <Route path="/arabic/faq" element={<ArabicFaqPage />} />
        <Route path="/arabic/about" element={<ArabicAboutPage />} />
        <Route path="/p/terms-conditions" element={<AboutWahaPage tab="terms" />} />
        <Route path="/p/privacy-policy" element={<AboutWahaPage tab="privacy" />} />
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </EditModeProvider>
  )
}

function App() {
  return <AppInner />
}

export default App
