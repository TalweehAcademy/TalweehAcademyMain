/* eslint-disable react/prop-types */
import { lazy as talweehProgramLazy } from 'react'
import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import './App.css'
import './public-theme.css'
import './commerce-checkout.css'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RouteMeta } from './hooks/useDocumentMeta'
import { extractVideoId } from './utils/youtube'
import WahaVideoPlayer from './courses/WahaVideoPlayer'
import { LEGACY_PORTAL } from './constants/links'
import SwipeDots from './components/SwipeDots'
const CoursesPage = lazy(() => import('./pages/courses-waha'))
const ArticlesPage = lazy(() => import('./pages/articles-waha'))
import { ARTICLES } from './data/articles'
const MediaPage = lazy(() => import('./pages/media-waha'))
const MediaDetailPage = lazy(() => import('./pages/media-watch-waha'))
const ArticleDetailPage = lazy(() => import('./pages/article-waha'))
const AboutWahaPage = lazy(() => import('./pages/about-waha'))
const CourseLandingPage = lazy(() => import('./pages/course-waha'))
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
import { LOGO, SmartLink, WahaHeader, WahaFooter, WahaPage, prefersReducedMotion, useWahaMotion } from './components/WahaShell'
const HadithSpecializationPage = talweehProgramLazy(() => import('./pages/hadith-waha'))
const AlimiyyahPage = lazy(() => import('./pages/alimiyyah-waha'))
const NavigationPreviewPage = lazy(() => import('./pages/navigation-preview'))

// ═══ Homepage — Wāḥa Forest design (mockups/landing-waha-forest.html) ═══
// Styles live in home-waha-v1.css, every class prefixed `wh-`.

const PROGRAMS = [
  { to: '/arabic', image: '/brand/program-arabic-manuscript.webp', arabic: 'العربية', kicker: 'Language & understanding', title: 'Arabic', text: 'A step-by-step, two-year program designed to build lasting understanding of the Arabic language.' },
  { to: '/alimiyyah', image: '/brand/program-alimiyyah.webp', arabic: 'العالمية', kicker: 'Islamic scholarship', title: 'Alimiyyah', text: 'Explore a guided path through the Islamic sciences with structured progression and serious study.' },
  { to: '/hadith-specialization', image: '/brand/program-hadith-books.webp', arabic: 'الحديث', kicker: 'Specialized study', title: 'Hadith Specialization', text: 'Advance into focused study of Hadith through a dedicated pathway built for deeper engagement.' },
]

const FORMATS = [
  { arabic: 'مباشر', title: 'Live', text: 'Join guided classes with scheduled instruction.', to: '/alimiyyah' },
  { arabic: 'حسب الطلب', title: 'On Demand', text: 'Study structured lessons at your own pace.', to: '/courses' },
  { arabic: 'مجاني', title: 'Free', text: 'Begin with accessible courses and resources.', to: '/courses?free=1' },
  { arabic: 'تخصص', title: 'Specialization', text: 'Advance into focused study through dedicated specialist pathways.', to: '/hadith-specialization' },
]

function PeopleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="22" cy="24" r="8" />
      <path d="M8 52c0-9 6-14 14-14s14 5 14 14v2H8v-2z" />
      <circle cx="45" cy="22" r="6.5" />
      <path d="M40 37.5c1.6-.7 3.3-1 5-1 7 0 12 4.4 12 12.4V50H40.6a19 19 0 0 0-.6-12.5z" />
    </svg>
  )
}

function useNarrow(breakpoint = 700) {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return narrow
}

// 3D carousel layout: side items rotate back, blur and fade; items two or more away are hidden.
function carouselStyle(index, current, count, { spread, rot, depth, side, sideFilter }) {
  let offset = index - current
  if (offset > count / 2) offset -= count
  if (offset < -count / 2) offset += count
  const distance = Math.abs(offset)
  return {
    transform: `translateX(${offset * spread}px) translateZ(${-distance * depth}px) rotateY(${-offset * rot}deg)`,
    opacity: distance > 1 ? 0 : distance ? side : 1,
    filter: distance ? sideFilter : 'none',
    zIndex: 10 - distance,
    pointerEvents: distance > 1 ? 'none' : undefined,
  }
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

function ProgramCoverflow() {
  const [current, setCurrent] = useState(0)
  const narrow = useNarrow()
  const layout = { spread: narrow ? 60 : 300, rot: 30, depth: 180, side: .3, sideFilter: 'blur(5px) saturate(.5)' }
  const go = (step) => setCurrent((c) => (c + step + PROGRAMS.length) % PROGRAMS.length)
  const rowRef = useRef(null)

  // Phones: a flat row of cards you swipe through, with dots instead of arrows.
  if (narrow) {
    return (
      <>
        <div className="wh-swipe wh-swipe-cv" ref={rowRef}>
          {PROGRAMS.map((program, i) => (
            <article key={program.title} className="wh-cv flat">
              <div className="wh-img" style={{ backgroundImage: `url('${program.image}')` }} />
              <span className="wh-n wh-glass">{String(i + 1).padStart(2, '0')}</span>
              <div className="wh-bd">
                <div className="wh-ar">{program.arabic}</div>
                <small>{program.kicker}</small>
                <h3>{program.title}</h3>
                <p>{program.text}</p>
                <Link className="wh-btn wh-btn-cream" to={program.to}>Explore the program →</Link>
              </div>
            </article>
          ))}
        </div>
        <SwipeDots targetRef={rowRef} count={PROGRAMS.length} />
      </>
    )
  }

  return (
    <>
      <div className="wh-cover" data-r="blur">
        {PROGRAMS.map((program, i) => (
          <article key={program.title} className={`wh-cv${i === current ? ' on' : ''}`}
            style={carouselStyle(i, current, PROGRAMS.length, layout)}
            onClick={() => { if (i !== current) setCurrent(i) }}>
            <div className="wh-img" style={{ backgroundImage: `url('${program.image}')` }} />
            <span className="wh-n wh-glass">{String(i + 1).padStart(2, '0')}</span>
            <div className="wh-bd">
              <div className="wh-ar">{program.arabic}</div>
              <small>{program.kicker}</small>
              <h3>{program.title}</h3>
              <p>{program.text}</p>
              <Link className="wh-btn wh-btn-cream" to={program.to} tabIndex={i === current ? 0 : -1}
                onClick={(event) => { if (i !== current) event.preventDefault() }}>
                Explore the program →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="wh-cv-ctl">
        <button type="button" className="wh-glass" aria-label="Previous program" onClick={() => go(-1)}>‹</button>
        <button type="button" className="wh-glass" aria-label="Next program" onClick={() => go(1)}>›</button>
      </div>
    </>
  )
}

function TestimonialCarousel({ testimonials }) {
  const [current, setCurrent] = useState(0)
  const narrow = useNarrow()
  const count = testimonials.length
  const layout = { spread: narrow ? 40 : 360, rot: 0, depth: 120, side: .6, sideFilter: 'blur(3px) saturate(.7)' }
  const go = (step) => setCurrent((c) => (c + step + count) % count)
  const rowRef = useRef(null)

  useEffect(() => {
    if (narrow || count < 2 || prefersReducedMotion()) return undefined
    const timer = window.setTimeout(() => setCurrent((c) => (c + 1) % count), 6500)
    return () => window.clearTimeout(timer)
  }, [current, count])

  if (!count) return null
  const cardBody = (item) => {
    const initials = item.name.split(/\s+/).filter(Boolean)
    return <>
      <div className="wh-q">“</div>
      <p>{item.quote}</p>
      <div className="wh-who">
        <span className="wh-av">{(initials[0]?.[0] || '') + (initials.length > 1 ? initials[initials.length - 1][0] : '')}</span>
        <div><h4>{item.name}</h4><small>{item.location}</small></div>
      </div>
    </>
  }
  // Phones: swipe through the testimonials; no arrows, no auto-advance.
  if (narrow) {
    return (
      <>
        <div className="wh-swipe wh-swipe-tc" ref={rowRef}>
          {testimonials.map((item) => <article key={item.name} className="wh-tc wh-glass flat">{cardBody(item)}</article>)}
        </div>
        <SwipeDots targetRef={rowRef} count={count} />
      </>
    )
  }
  return (
    <>
      <div className="wh-tcar" data-r>
        {testimonials.map((item, i) => {
          const initials = item.name.split(/\s+/).filter(Boolean)
          return (
            <article key={item.name} className="wh-tc wh-glass" style={carouselStyle(i, current, count, layout)}
              onClick={() => { if (i !== current) setCurrent(i) }}>
              <div className="wh-q">“</div>
              <p>{item.quote}</p>
              <div className="wh-who">
                <span className="wh-av">{(initials[0]?.[0] || '') + (initials.length > 1 ? initials[initials.length - 1][0] : '')}</span>
                <div><h4>{item.name}</h4><small>{item.location}</small></div>
              </div>
            </article>
          )
        })}
      </div>
      <div className="wh-tcar-ctl">
        <button type="button" className="wh-glass" aria-label="Previous testimonial" onClick={() => go(-1)}>‹</button>
        <button type="button" className="wh-glass" aria-label="Next testimonial" onClick={() => go(1)}>›</button>
      </div>
    </>
  )
}

function VideoCard({ src, index }) {
  const id = extractVideoId(src)
  if (!id) return null
  return (
    <article className="wh-vid">
      <WahaVideoPlayer videoId={id} title={`Talweeh Academy featured lecture ${index + 1}`} kicker="Talweeh Media" />
    </article>
  )
}

function formatLandingDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function LandingPage() {
  const { content: c } = useContent('landing')
  const { content: g } = useContent('global')
  const [slide, setSlide] = useState(0)
  const rootRef = useRef(null)
  const artsRef = useRef(null)
  const vidsRef = useRef(null)
  const latestArticles = ARTICLES.slice(0, 3)
  const videos = (c.youtube.videos || []).filter(Boolean).slice(0, 6)

  const heroSlides = c.heroSlides
  const currentSlide = heroSlides[slide % heroSlides.length] || heroSlides[0]

  useWahaMotion(rootRef)

  // Restarts on every change, so a manual pick gets a full 5s before auto-advancing.
  useEffect(() => {
    if (heroSlides.length < 2 || prefersReducedMotion()) return undefined
    const t = setTimeout(() => setSlide((s) => (s + 1) % heroSlides.length), 5000)
    return () => clearTimeout(t)
  }, [slide, heroSlides.length])

  return (
    <div className="wh-home" ref={rootRef}>
      <div className="wh-aurora" aria-hidden="true"><i /><i /></div>
      <WahaHeader social={g.footer.social} />

      <main>
        {/* ── Hero ─────────────────────────────────── */}
        <Editable page="landing" sectionKey="heroSlides">
          <section className="wh-hero" id="hero">
            <div className="wh-wrap">
              <div className="wh-ar" data-r>{c.hero?.arabic || 'رَبِّ زِدْنِي عِلْمًا'}</div>
              <h1 key={slide}>{currentSlide.heading}</h1>
              <p className="wh-lead" data-r>Explore the Islamic sciences through structured programs, guided study, and beneficial knowledge for every stage of your journey.</p>
              <div className="wh-acts" data-r>
                <SmartLink className="wh-btn wh-btn-g" to={currentSlide.ctaHref && currentSlide.ctaHref !== '#' ? currentSlide.ctaHref : '/arabic'} data-magnet>
                  <span>{currentSlide.cta}</span> →
                </SmartLink>
                <a className="wh-btn wh-btn-glass" href="#programs">Explore our programs</a>
              </div>
              <div className="wh-feats" data-r><span>Structured curricula</span><span>Traditional texts</span><span>Live &amp; on-demand study</span></div>
              {heroSlides.length > 1 && (
                <div data-r>
                  <div className="wh-ctl wh-glass">
                    <button type="button" className="wh-a" aria-label="Previous slide" onClick={() => setSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length)}>‹</button>
                    <div className="wh-dots">
                      {heroSlides.map((_, i) => (
                        <button key={i} type="button" className={`wh-dot${i === slide ? ' active' : ''}`} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)} />
                      ))}
                    </div>
                    <button type="button" className="wh-a" aria-label="Next slide" onClick={() => setSlide((s) => (s + 1) % heroSlides.length)}>›</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </Editable>

        {/* ── Programs ─────────────────────────────── */}
        <section className="wh-s" id="programs">
          <div className="wh-wrap">
            <SectionHeading title="Find your next chapter." text="Build your foundations. Deepen your study. Choose a program that meets your goals." />
            <ProgramCoverflow />
          </div>
        </section>

        {/* ── Flexible Studies ─────────────────────── */}
        <Editable page="landing" sectionKey="featured">
          <section className="wh-s">
            <div className="wh-wrap">
              <SectionHeading title="Flexible Studies" text="Choose the format and subject that best fits your current stage of learning." />
              <div className="wh-formats wh-glass" data-r>
                {FORMATS.map((format) => (
                  <Link key={format.title} className="wh-fmt" to={format.to}>
                    <div className="wh-ar">{format.arabic}</div>
                    <span className="wh-rule" />
                    <h3>{format.title}</h3>
                    <p>{format.text}</p>
                    <span className="wh-go">View courses →</span>
                  </Link>
                ))}
              </div>
              <div className="wh-center" data-r><Link className="wh-btn wh-btn-g" to="/courses" data-magnet>{c.featured.buttonLabel} →</Link></div>
            </div>
          </section>
        </Editable>

        {/* ── Latest Articles ──────────────────────── */}
        {latestArticles.length > 0 && (
          <Editable page="landing" sectionKey="latestArticles">
            <section className="wh-s">
              <div className="wh-wrap">
                <SectionHeading title={c.latestArticles.heading} text="Short academic benefits and reflections to support continued reading beyond the classroom." />
                <div className="wh-arts wh-swipe-m" data-stagger ref={artsRef}>
                  {latestArticles.map((article) => (
                    <article key={article.id} className="wh-art wh-glass">
                      <div className="wh-meta">
                        <span>{formatLandingDate(article.publishedAt)}</span>
                        {article.readTime && <span>{article.readTime}</span>}
                      </div>
                      <h3>{article.title}</h3>
                      {article.excerpt && <p>{article.excerpt}</p>}
                      <Link className="wh-more" to={`/articles/${article.slug}`}>Read More..... <i aria-hidden="true">→</i></Link>
                    </article>
                  ))}
                </div>
                <div className="wh-dots-m"><SwipeDots targetRef={artsRef} count={latestArticles.length} /></div>
                <div className="wh-center" data-r><Link className="wh-btn wh-btn-glass" to="/articles">{c.latestArticles.buttonLabel} →</Link></div>
              </div>
            </section>
          </Editable>
        )}

        {/* ── About + Why ──────────────────────────── */}
        <Editable page="landing" sectionKey="aboutWhy">
          <section className="wh-s">
            <div className="wh-wrap wh-aw">
              <div className="wh-about" data-r="left">
                <span className="wh-pill">Why Talweeh</span>
                <h2>{c.aboutWhy.aboutHeading}</h2>
                <p>{c.aboutWhy.aboutText}</p>
                <Link className="wh-btn wh-btn-g" to="/about-us">{c.aboutWhy.aboutButtonLabel} →</Link>
              </div>
              <div className="wh-why wh-glass" data-r="right">
                <h3>{c.aboutWhy.whyHeading}</h3>
                <p>{c.aboutWhy.whyText}</p>
                <div className="wh-pts"><span>Structured progression</span><span>Qualified instruction</span><span>Purposeful learning</span></div>
                <SmartLink className="wh-btn wh-btn-g" to={c.aboutWhy.whyButtonHref}>{c.aboutWhy.whyButtonLabel} →</SmartLink>
              </div>
            </div>
          </section>
        </Editable>

        {/* ── YouTube ──────────────────────────────── */}
        {videos.length > 0 && (
          <Editable page="landing" sectionKey="youtube">
            <section className="wh-s">
              <div className="wh-wrap">
                <SectionHeading title={c.youtube.heading} text="Selected lessons, academic benefits, and discussions from Talweeh Academy." />
                <div className="wh-vg wh-swipe-m" data-stagger ref={vidsRef}>
                  {videos.map((src, i) => <VideoCard key={`${src}-${i}`} src={src} index={i} />)}
                </div>
                <div className="wh-dots-m"><SwipeDots targetRef={vidsRef} count={videos.length} /></div>
                <div className="wh-center" data-r>
                  <a className="wh-btn wh-btn-glass" href={c.youtube.url} target="_blank" rel="noreferrer">{c.youtube.buttonLabel}</a>
                </div>
              </div>
            </section>
          </Editable>
        )}

        {/* ── Join Talweeh Society ─────────────────── */}
        <Editable page="landing" sectionKey="joinSociety">
          <section className="wh-s">
            <div className="wh-wrap">
              <div className="wh-society" data-r="scale">
                <div>
                  <div className="wh-ic"><PeopleIcon className="wh-ico" /></div>
                  <span className="wh-pill wh-glass">Community · continued learning</span>
                  <h3>{c.joinSociety.heading}</h3>
                  <p>{c.joinSociety.text}</p>
                </div>
                <SmartLink className="wh-btn wh-btn-g" to={c.joinSociety.buttonHref} data-magnet>{c.joinSociety.buttonLabel} →</SmartLink>
              </div>
            </div>
          </section>
        </Editable>

        {/* ── Final call to action ─────────────────── */}
        <section className="wh-s" aria-labelledby="wh-final-heading">
          <div className="wh-wrap">
            <div className="wh-final wh-glass" data-r="scale">
              <div className="wh-fimg" aria-hidden="true"><i /><i /></div>
              <span className="wh-pill">Begin your next chapter</span>
              <h2 id="wh-final-heading">Study with clarity, structure, and <em>purpose.</em></h2>
              <p>Explore Talweeh Academy&apos;s programs and courses, then continue your learning through your student portal.</p>
              <div className="wh-acts">
                <Link className="wh-btn wh-btn-g" to="/courses" data-magnet>Explore courses →</Link>
                <a className="wh-btn wh-btn-glass" href={LEGACY_PORTAL}>Legacy Portal</a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────── */}
        <Editable page="landing" sectionKey="testimonials">
          <section className="wh-s">
            <div className="wh-wrap">
              <SectionHeading title="What our students say" text="Reflections from learners studying with Talweeh Academy around the world." />
              <TestimonialCarousel testimonials={c.testimonials} />
            </div>
          </section>
        </Editable>
      </main>

      <WahaFooter social={g.footer.social} copyright={g.footer.copyright} />
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
        <Route path="/courses/:slug" element={<CourseLandingPage />} />
        <Route path="/cart" element={<CommerceCartPage />} />
        <Route path="/checkout" element={<CommerceCheckoutPage />} />
        <Route path="/quran" element={<QuranRoute />} />
        <Route path="/quran/read" element={<QuranReadPage />} />
        <Route path="/quran/study" element={<QuranStudyPage />} />
        <Route path="/quran/listen" element={<QuranListenPage />} />
        <Route path="/arabic" element={<ArabicPage />} />
        <Route path="/arabic/program" element={<ArabicProgramPage />} />
        <Route path="/arabic/faq" element={<ArabicFaqPage />} />
        <Route path="/arabic/about" element={<ArabicAboutPage />} />
        <Route path="/p/terms-conditions" element={<AboutWahaPage tab="terms" />} />
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
