import { Link } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import PreservedArabicPage from './arabic-preserved'
import '../arabic-redesign-v1.css'
import ArabicIntroVideo from '../components/ArabicIntroVideo'
import ArabicLegacyEnhancer from '../components/ArabicLegacyEnhancer'

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 5.4c2.7-.7 5-.2 7.5 1.4v11.6c-2.5-1.6-4.8-2.1-7.5-1.4V5.4Zm15 0c-2.7-.7-5-.2-7.5 1.4v11.6c2.5-1.6 4.8-2.1 7.5-1.4V5.4Z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.6 6.7v10.6l8.5-5.3-8.5-5.3Z" fill="currentColor" />
    </svg>
  )
}

export default function ArabicPage() {
  return (
    <div className="academy-arabic-v2">
      <PageHeader />

      <main>
        <section className="arabic-v2-hero">
          <div className="arabic-v2-hero-copy">
            <p className="arabic-v2-eyebrow">Talweeh Academy · Arabic Studies</p>

            <h1>
              Build a lasting relationship
              <span>with the Arabic language.</span>
            </h1>

            <p className="arabic-v2-intro">
              A structured, step-by-step pathway for students who want to move beyond
              isolated rules and develop a clear framework for understanding Arabic.
            </p>

            <div className="arabic-v2-actions">
              <Link className="arabic-v2-primary" to="/arabic-program">
                <BookIcon />
                Explore the Program
              </Link>

              <a className="arabic-v2-secondary" href="#arabic-introduction">
                <PlayIcon />
                Watch Introduction
              </a>
            </div>
          </div>

          <div className="arabic-v2-script" aria-hidden="true">
            <span>العَرَبِيَّة</span>
            <small>لغة القرآن</small>
          </div>
        </section>

        <nav className="arabic-v2-quicknav" aria-label="Arabic program navigation">
          <Link to="/arabic-program">
            <span>01</span>
            <strong>Program</strong>
            <small>Explore the structured pathway</small>
          </Link>
          <Link to="/arabic-about">
            <span>02</span>
            <strong>About</strong>
            <small>Understand the approach</small>
          </Link>
          <Link to="/arabic-faq">
            <span>03</span>
            <strong>FAQ</strong>
            <small>Answers for prospective students</small>
          </Link>
        </nav>

        <section className="arabic-v2-video-section" id="arabic-introduction">
          <div className="arabic-v2-section-heading">
            <div>
              <p className="arabic-v2-kicker">Discover the language</p>
              <h2>Why study Arabic?</h2>
            </div>
            <p>
              Begin with an introduction to the vision behind Arabic study at Talweeh
              Academy, then continue through the complete program information below.
            </p>
          </div>

          <div className="arabic-v2-video-frame">
            <ArabicIntroVideo />
          </div>
        </section>

        <section className="arabic-v2-preserved-section" id="arabic-program-content">
          <header className="arabic-v2-section-heading arabic-v2-section-heading--content">
            <div>
              <p className="arabic-v2-kicker">Program details</p>
              <h2>Everything about the Arabic Program</h2>
            </div>
            <p>
              The complete information from the existing Arabic page is retained below,
              presented inside the refreshed Talweeh visual system.
            </p>
          </header>

          <div className="arabic-v2-legacy">
            <ArabicLegacyEnhancer />
            <PreservedArabicPage />
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  )
}
