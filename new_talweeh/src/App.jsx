/* eslint-disable react/prop-types */
import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import './App.css'
import './public-theme.css'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import CourseCard from './components/CourseCard'
import VideoFacade from './components/VideoFacade'
const CoursesPage = lazy(() => import('./pages/courses'))
const ArticlesPage = lazy(() => import('./pages/articles'))
import { ARTICLES } from './data/articles'
const MediaPage = lazy(() => import('./pages/media'))
const MediaDetailPage = lazy(() => import('./pages/media-detail'))
const ArticleDetailPage = lazy(() => import('./pages/article-detail'))
const AboutUsPage = lazy(() => import('./pages/about-us'))
const TermsConditionsPage = lazy(() => import('./pages/terms-conditions'))
const ContactUsPage = lazy(() => import('./pages/contact-us'))
const CourseLandingPage = lazy(() => import('./pages/course-landing'))
const QuranPage = lazy(() => import('./pages/quran'))
const ArabicPage = lazy(() => import('./pages/arabic'))
const ArabicProgramPage = lazy(() => import('./pages/arabic-program'))
const ArabicFaqPage = lazy(() => import('./pages/arabic-faq'))
const ArabicAboutPage = lazy(() => import('./pages/arabic-about'))
import { PageHeader, PageFooter } from './pages/_shared'
import { useContent } from './hooks/useContent'
import { EditModeProvider, EditModeToggle, Editable } from './components/ContentEditor'
import PublicCorePageRefinement from './components/PublicCorePageRefinement'
const InstructorsV2Page = lazy(() => import('./pages/instructors-v2'))
const InstructorDetailV2Page = lazy(() => import('./pages/instructor-detail-v2'))
const AlimiyyahPage = lazy(() => import('./pages/alimiyyah'))
const NavigationPreviewPage = lazy(() => import('./pages/navigation-preview'))

// Red section icons (match the WP site's Elementor icon widgets).
function MasjidIcon() {
  return (
    <svg className="hl-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6c1 6-6 9-6 16h12c0-7-7-10-6-16z" />
      <rect x="10" y="34" width="6" height="22" rx="1" />
      <rect x="48" y="34" width="6" height="22" rx="1" />
      <path d="M13 24c.5 4-3 5-3 8h6c0-3-3.5-4-3-8zM51 24c.5 4-3 5-3 8h6c0-3-3.5-4-3-8z" />
      <path d="M18 40c0-8 8-10 14-16 6 6 14 8 14 16v16H36v-8a4 4 0 0 0-8 0v8H18V40z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg className="hl-icon" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="22" cy="24" r="8" />
      <path d="M8 52c0-9 6-14 14-14s14 5 14 14v2H8v-2z" />
      <circle cx="45" cy="22" r="6.5" />
      <path d="M40 37.5c1.6-.7 3.3-1 5-1 7 0 12 4.4 12 12.4V50H40.6a19 19 0 0 0-.6-12.5z" />
    </svg>
  )
}

function BookButtonIcon() {
  return (
    <svg className="academy-button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 5.5c2.7-.7 5-.2 7.5 1.4v11.6c-2.5-1.6-4.8-2.1-7.5-1.4V5.5Zm15 0c-2.7-.7-5-.2-7.5 1.4v11.6c2.5-1.6 4.8-2.1 7.5-1.4V5.5Z" />
    </svg>
  )
}

function ProgramsButtonIcon() {
  return (
    <svg className="academy-button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </svg>
  )
}

// One row of 4 cards that auto-scrolls through all courses; pauses while the
// user hovers or touches it.
function FeaturedCourseCarousel({ courses }) {
  const trackRef = useRef(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    if (courses.length <= 4) return
    const timer = setInterval(() => {
      const track = trackRef.current
      if (!track || pausedRef.current) return
      const card = track.querySelector('.course-card')
      if (!card) return
      const step = card.offsetWidth + 22
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - step / 2
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: 'smooth' })
    }, 3500)
    return () => clearInterval(timer)
  }, [courses.length])

  return (
    <div
      className="landing-featured-carousel"
      ref={trackRef}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      onTouchStart={() => { pausedRef.current = true }}
      onTouchEnd={() => { pausedRef.current = false }}
    >
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} showCategory />
      ))}
    </div>
  )
}

function YouTubeCarousel({ videos }) {
  const trackRef = useRef(null)
  const pausedRef = useRef(false)

  const move = (direction = 1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector('.academy-video-card')
    if (!card) return
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '18') || 18
    const step = card.getBoundingClientRect().width + gap
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
    const next = track.scrollLeft + (step * direction)

    if (direction > 0 && next >= maxScroll - step * .3) {
      track.scrollTo({ left: maxScroll <= step ? maxScroll : next, behavior: 'smooth' })
      if (track.scrollLeft >= maxScroll - step * .6) {
        window.setTimeout(() => track.scrollTo({ left: 0, behavior: 'smooth' }), 700)
      }
      return
    }
    if (direction < 0 && next <= 0) {
      track.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }
    track.scrollTo({ left: Math.max(0, Math.min(maxScroll, next)), behavior: 'smooth' })
  }

  useEffect(() => {
    if (!videos || videos.length <= 3) return undefined
    const timer = window.setInterval(() => {
      if (!pausedRef.current) move(1)
    }, 4800)
    return () => window.clearInterval(timer)
  }, [videos?.length])

  if (!videos?.length) return null

  return (
    <div className="academy-youtube-carousel">
      <button type="button" className="academy-media-arrow academy-media-arrow-prev" aria-label="Previous videos" onClick={() => move(-1)}>‹</button>
      <div
        className="youtube-row"
        ref={trackRef}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
        onTouchStart={() => { pausedRef.current = true }}
        onTouchEnd={() => { pausedRef.current = false }}
      >
        {videos.map((src, index) => (
          <article className="academy-video-card" key={`${src}-${index}`}>
            <VideoFacade src={src} title={`Talweeh Academy featured lecture ${index + 1}`} />
            <div className="academy-video-card-meta">
              <div>
                <span>Featured lecture</span>
                <small>Talweeh Academy Media</small>
              </div>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="academy-media-arrow academy-media-arrow-next" aria-label="Next videos" onClick={() => move(1)}>›</button>
    </div>
  )
}

function formatLandingDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function LandingPage() {
  const { content: c } = useContent('landing')
  const [slide, setSlide] = useState(0)
  const [testimonialPage, setTestimonialPage] = useState(0)
  const [courses, setCourses] = useState([])
  const latestArticles = ARTICLES.slice(0, 3)

  const heroSlides = c.heroSlides
  const currentSlide = heroSlides[slide % heroSlides.length] || heroSlides[0]
  const TESTIMONIALS_PER_PAGE = 3
  const testimonialPages = Math.max(1, Math.ceil(c.testimonials.length / TESTIMONIALS_PER_PAGE))
  const visibleTestimonials = c.testimonials.slice(
    (testimonialPage % testimonialPages) * TESTIMONIALS_PER_PAGE,
    (testimonialPage % testimonialPages) * TESTIMONIALS_PER_PAGE + TESTIMONIALS_PER_PAGE
  )

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5000)
    return () => clearInterval(t)
  }, [heroSlides.length])

  useEffect(() => {
  }, [])

  return (
    <div className="landing-shell academy-home">
      <PageHeader />

      <main>
        {/* ── Hero Carousel ─────────────────────────── */}
        <Editable page="landing" sectionKey="heroSlides">
          <section
            className="landing-hero"
            style={currentSlide.imageUrl ? {
              backgroundImage: `linear-gradient(170deg, rgba(14, 24, 17, 0.72) 0%, rgba(30, 50, 36, 0.62) 100%), url("${currentSlide.imageUrl.startsWith('/wp-content/') ? '/brand/dashboard-books.webp' : currentSlide.imageUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            <div className="landing-hero-inner">
              <p className="academy-eyebrow">Talweeh Academy · Learn with purpose</p>
              <h1 key={slide} className="hero-heading">
                {currentSlide.heading}
              </h1>
              <p className="academy-hero-description">Explore the Islamic sciences through structured programs, guided study, and beneficial knowledge for every stage of your journey.</p>
              <div className="academy-hero-actions">
                <a className="hero-cta-btn" href={currentSlide.ctaHref && currentSlide.ctaHref !== '#' ? currentSlide.ctaHref : '/arabic'}>
                  <BookButtonIcon />
                  <span>{currentSlide.cta}</span>
                </a>
                <a className="academy-secondary-button" href="#academy-programs">
                  <ProgramsButtonIcon />
                  <span>Explore our programs</span>
                </a>
              </div>
              <div className="academy-hero-proof" aria-label="Talweeh study features">
                <span>Structured curricula</span>
                <span>Traditional texts</span>
                <span>Live &amp; on-demand study</span>
              </div>
            </div>
            <button
              type="button"
              className="hero-arrow hero-arrow-prev"
              aria-label="Previous slide"
              onClick={() => setSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length)}
            >
              ‹
            </button>
            <button
              type="button"
              className="hero-arrow hero-arrow-next"
              aria-label="Next slide"
              onClick={() => setSlide((s) => (s + 1) % heroSlides.length)}
            >
              ›
            </button>
            <div className="hero-dots">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`hero-dot${i === slide ? ' active' : ''}`}
                  onClick={() => setSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </section>
        </Editable>

        {/* ── Feature Highlights ───────────────────── */}
        <Editable page="landing" sectionKey="highlights">
          <section className="landing-highlights">
            {c.highlights.map((h, i) => {
              const icon = i === 0 ? <span className="hl-icon hl-icon-arabic" title="Arabic language" aria-label="Arabic language">ض</span> : i === 1 ? <MasjidIcon /> : <PeopleIcon />
              const body = (
                <>
                  {icon}
                  <h3>{h.title}</h3>
                  <p>{h.text}</p>
                </>
              )
              const href = h.href || '#'
              const isExternal = /^https?:\/\//.test(href)
              return (
                <article key={h.title}>
                  {isExternal
                    ? <a className="highlight-link" href={href} target="_blank" rel="noreferrer">{body}</a>
                    : <Link className="highlight-link" to={href}>{body}</Link>}
                </article>
              )
            })}
          </section>
        </Editable>

        <section className="academy-programs" id="academy-programs">
          <div className="academy-section-heading"><div><p className="academy-eyebrow">A path to deeper understanding</p><h2>Find your next chapter.</h2></div><p>Build your foundations. Deepen your study.<br />Choose a program that meets your goals.</p></div>
          <div className="academy-program-grid">
            <Link to="/arabic" className="academy-program-card academy-program-arabic">
              <div className="academy-program-media" aria-hidden="true"><span>01</span></div>
              <div className="academy-program-copy"><span className="academy-program-number">Language &amp; understanding</span><h3>Arabic</h3><p>A step-by-step, two-year program designed to build lasting understanding of the Arabic language.</p><span className="academy-card-link">Explore the program <span aria-hidden="true">→</span></span></div>
            </Link>
            <Link to="/navigation-preview/Alimiyyah" className="academy-program-card academy-program-alimiyyah">
              <div className="academy-program-media" aria-hidden="true"><span>02</span></div>
              <div className="academy-program-copy"><span className="academy-program-number">Islamic scholarship</span><h3>Alimiyyah</h3><p>Explore a guided path through the Islamic sciences with structured progression and serious study.</p><span className="academy-card-link">Explore the program <span aria-hidden="true">→</span></span></div>
            </Link>
            <Link to="/navigation-preview/Hadith%20Specialization" className="academy-program-card academy-program-hadith">
              <div className="academy-program-media" aria-hidden="true"><span>03</span></div>
              <div className="academy-program-copy"><span className="academy-program-number">Specialized study</span><h3>Hadith Specialization</h3><p>Advance into focused study of Hadith through a dedicated pathway built for deeper engagement.</p><span className="academy-card-link">Explore the program <span aria-hidden="true">→</span></span></div>
            </Link>
          </div>
        </section>

        {/* ── Featured Courses ─────────────────────── */}
        <Editable page="landing" sectionKey="featured">
          <section className="landing-featured">
            <div className="academy-home-section-intro">
              <div><p className="academy-eyebrow">Continue your study</p><h2>{c.featured.heading}</h2></div>
              <p>Choose the format and subject that best fits your current stage of learning.</p>
            </div>
            <span className="academy-divider" aria-hidden="true" />
            {courses.length > 0 ? <FeaturedCourseCarousel courses={courses} /> : (
              <div className="academy-course-paths">
                {[
                  ['Live', 'Join guided classes with scheduled instruction', '/alimiyyah'],
                  ['On Demand', 'Study structured lessons at your own pace', '/courses'],
                  ['Free', 'Begin with accessible courses and resources', '/courses?free=1'],
                  ['Specialization', 'Advance into focused study through dedicated specialist pathways', '/navigation-preview/Hadith%20Specialization'],
                ].map(([label, text, destination], index) => (
                  <Link key={label} to={destination}>
                    <span className="academy-path-index">0{index + 1}</span>
                    <strong>{label}</strong>
                    <small>{text}</small>
                  </Link>
                ))}
              </div>
            )}
            <Link className="green-button" to="/courses">
              {c.featured.buttonLabel}
            </Link>
          </section>
        </Editable>

        {/* ── Latest Articles ──────────────────────── */}
        <Editable page="landing" sectionKey="latestArticles">
        <section className="landing-articles">
          <div className="academy-home-section-intro">
            <div><p className="academy-eyebrow">From the Talweeh library</p><h2>{c.latestArticles.heading}</h2></div>
            <p>Short academic benefits and reflections to support continued reading beyond the classroom.</p>
          </div>
          <span className="academy-divider" aria-hidden="true" />
          {latestArticles.length === 0 && (
            <div className="academy-empty-editorial">
              <span className="academy-editorial-kicker">From the Talweeh library</span>
              <h3>Study notes, reflections, and academic benefits.</h3>
              <p>Explore concise writing designed to support serious students of the Islamic sciences and connect classroom study with continued reading.</p>
              <div className="academy-editorial-topics" aria-label="Article topics">
                <span>Fiqh</span><span>Hadith</span><span>Arabic</span><span>Student Benefits</span>
              </div>
            </div>
          )}
          <div className="landing-article-grid">
            {latestArticles.map((article) => (
              <article key={article.id}>
                {article.imageUrl && (
                  <Link className="landing-article-thumb" to={`/articles/${article.slug}`}>
                    <img src={article.imageUrl} alt="" loading="lazy" />
                  </Link>
                )}
                <div className="landing-article-body">
                  <h3>{article.title}</h3>
                  <div className="article-meta">
                    <span>{formatLandingDate(article.publishedAt)}</span>
                    <span>{article.readTime}</span>
                  </div>
                  {article.excerpt && <p>{article.excerpt}</p>}
                  <Link to={`/articles/${article.slug}`}>Read More.....</Link>
                </div>
              </article>
            ))}
          </div>
          <Link className="green-button" to="/articles">
            {c.latestArticles.buttonLabel}
          </Link>
        </section>
        </Editable>

        {/* ── About + Why ──────────────────────────── */}
        <Editable page="landing" sectionKey="aboutWhy">
          <section className="landing-about-why academy-purpose-section">
            <div className="academy-purpose-lead">
              <p className="academy-eyebrow">Why Talweeh</p>
              <h2>{c.aboutWhy.aboutHeading}</h2>
              <p>{c.aboutWhy.aboutText}</p>
              <Link className="academy-purpose-link" to="/about-us">{c.aboutWhy.aboutButtonLabel} <span aria-hidden="true">→</span></Link>
            </div>
            <div className="academy-purpose-panel">
              <h3>{c.aboutWhy.whyHeading}</h3>
              <p>{c.aboutWhy.whyText}</p>
              <a className="academy-purpose-link" href={c.aboutWhy.whyButtonHref || '#'}>{c.aboutWhy.whyButtonLabel} <span aria-hidden="true">→</span></a>
              <div className="academy-purpose-points" aria-label="Talweeh study approach">
                <span>Structured progression</span><span>Qualified instruction</span><span>Purposeful learning</span>
              </div>
            </div>
          </section>
        </Editable>

        {/* ── YouTube ──────────────────────────────── */}
        <Editable page="landing" sectionKey="youtube">
          <section className="landing-youtube">
            <div className="academy-youtube-heading">
              <p className="academy-eyebrow">Talweeh Media</p>
              <h2>{c.youtube.heading}</h2>
              <span className="academy-divider" aria-hidden="true" />
              <p>Selected lessons, academic benefits, and discussions from Talweeh Academy.</p>
            </div>
            <YouTubeCarousel videos={c.youtube.videos || []} />
            <a className="youtube-btn" href={c.youtube.url} target="_blank" rel="noreferrer">
              {c.youtube.buttonLabel}
            </a>
          </section>
        </Editable>

        {/* ── Join Talweeh Society ─────────────────── */}
        <Editable page="landing" sectionKey="joinSociety">
          <section className="landing-join-society">
            <div className="join-society-inner">
              <PeopleIcon />
              <div className="join-society-text">
                <span className="academy-society-kicker">Community · continued learning</span>
                <h3>{c.joinSociety.heading}</h3>
                <p>{c.joinSociety.text}</p>
              </div>
              <a className="red-button" href={c.joinSociety.buttonHref || '#'}>
                {c.joinSociety.buttonLabel}
              </a>
            </div>
          </section>
        </Editable>

        {/* ── Gift Sections ────────────────────────── */}
        <Editable page="landing" sectionKey="gifts">
          <section className="gift-section">
            {c.gifts.map((gift) => (
              <div className="gift-card" key={gift.title}>
                <h3>{gift.title}</h3>
                <span className="academy-divider" aria-hidden="true" />
                <p>{gift.text}</p>
                <a className="red-button" href={gift.href || '#'}>
                  {gift.buttonLabel}
                </a>
              </div>
            ))}
          </section>
        </Editable>

        <section className="academy-final-cta" aria-labelledby="academy-final-cta-heading">
          <div>
            <p className="academy-eyebrow">Begin your next chapter</p>
            <h2 id="academy-final-cta-heading">Study with clarity, structure, and purpose.</h2>
            <p>Explore Talweeh Academy&apos;s programs and courses, then continue your learning through your student portal.</p>
          </div>
          <div className="academy-final-cta-actions">
            <Link className="hero-cta-btn" to="/courses">Explore courses <span aria-hidden="true">→</span></Link>
            <Link className="academy-secondary-button" to="/navigation-preview/Student%20Portal">Student Portal</Link>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────── */}
        <Editable page="landing" sectionKey="testimonials">
          <section className="landing-testimonials">
            <div className="academy-testimonial-heading">
              <p className="academy-eyebrow">Student experiences</p>
              <h2>What our students say</h2>
              <p>Reflections from learners studying with Talweeh Academy around the world.</p>
            </div>
            <span className="academy-divider" aria-hidden="true" />
            <div className="testimonial-carousel">
              <button
                type="button"
                className="testimonial-arrow"
                aria-label="Previous testimonials"
                onClick={() => setTestimonialPage((p) => (p - 1 + testimonialPages) % testimonialPages)}
              >
                ‹
              </button>
              <div className="landing-testimonial-grid">
                {visibleTestimonials.map((item) => (
                  <article key={item.name}>
                    <p>&ldquo;{item.quote}&rdquo;</p>
                    <h4>{item.name}</h4>
                    <span>{item.location}</span>
                  </article>
                ))}
              </div>
              <button
                type="button"
                className="testimonial-arrow"
                aria-label="Next testimonials"
                onClick={() => setTestimonialPage((p) => (p + 1) % testimonialPages)}
              >
                ›
              </button>
            </div>
          </section>
        </Editable>
      </main>

      <PageFooter />
    </div>
  )
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

function RouteLoadingFallback() {
  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <p className="courses-status">Loading…</p>
      </main>
      <PageFooter />
    </div>
  )
}

function AppInner() {
  return (
    <EditModeProvider>
      <ScrollToTop />
      <PublicCorePageRefinement />
      <EditModeToggle />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
        <Route path="/navigation-preview/Alimiyyah" element={<AlimiyyahPage />} />
        <Route path="/alimiyyah" element={<AlimiyyahPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/navigation-preview/:section" element={<NavigationPreviewPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/media/:slug" element={<MediaDetailPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage />} />
        <Route path="/about-us" element={<AboutUsPage />} />
        <Route path="/instructors" element={<InstructorsV2Page />} />
        <Route path="/instructors/:slug" element={<InstructorDetailV2Page />} />
        <Route path="/contact-us" element={<ContactUsPage />} />
        <Route path="/courses/:slug" element={<CourseLandingPage />} />
        <Route path="/quran" element={<QuranPage />} />
        <Route path="/arabic" element={<ArabicPage />} />
        <Route path="/arabic/program" element={<ArabicProgramPage />} />
        <Route path="/arabic/faq" element={<ArabicFaqPage />} />
        <Route path="/arabic/about" element={<ArabicAboutPage />} />
        <Route path="/p/terms-conditions" element={<TermsConditionsPage />} />
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
