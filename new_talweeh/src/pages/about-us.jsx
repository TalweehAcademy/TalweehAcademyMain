import { Link } from 'react-router-dom'
import { PageHeader, PageHero, PageFooter } from './_shared'
import { ASSET } from '../constants/assets'
import { useContent } from '../hooks/useContent'
import { Editable } from '../components/ContentEditor'

export default function AboutUsPage() {
  const { content: c } = useContent('about')

  return (
    <div className="page-shell about-page-shell">
      <PageHeader />
      <main>
        <PageHero title="About Us" />

        {/* What is Talweeh Academy */}
        <Editable page="about" sectionKey="intro">
          <section className="about-intro-section">
            <div className="about-intro-grid">
              <div className="about-intro-content">
                <h2>{c.intro.heading}</h2>
                <p>{c.intro.para1}</p>
                <p>{c.intro.para2}</p>
                <Editable page="about" sectionKey="subjects">
                  <ol className="about-subjects-list">
                    {c.subjects.map((s) => (
                      <li key={s}><strong>{s.split(' (')[0]}</strong>{s.includes('(') ? ` (${s.split('(')[1]}` : ''}</li>
                    ))}
                  </ol>
                </Editable>
              </div>
              {c.intro.imageUrl && (
                <img className="about-intro-image" src={c.intro.imageUrl} alt="" loading="lazy" />
              )}
            </div>
          </section>
        </Editable>

        {/* Things that make us proud */}
        <Editable page="about" sectionKey="proud">
          <section className="about-proud-section">
            <div className="about-proud-inner">
              <h2>{c.proud.heading}</h2>
              <h3>{c.proud.subheading}</h3>
              <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
              <Editable page="about" sectionKey="highlights">
                <div className="about-highlights-grid">
                  {c.highlights.map((h) => (
                    <div key={h.title} className="about-highlight-card">
                      <h4>{h.title}</h4>
                      <p>{h.description}</p>
                    </div>
                  ))}
                </div>
              </Editable>
            </div>
          </section>
        </Editable>

        {/* The Vision */}
        <Editable page="about" sectionKey="vision">
          <section className="about-text-section">
            <div className="about-text-inner">
              <h2>{c.vision.heading}</h2>
              <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
              <p>{c.vision.text}</p>
            </div>
          </section>
        </Editable>

        {/* Qualified Guidance */}
        <Editable page="about" sectionKey="guidance">
          <section className="about-text-section">
            <div className="about-text-inner">
              <h2>{c.guidance.heading}</h2>
              <h3>{c.guidance.subheading}</h3>
              <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
              <p>{c.guidance.text}</p>
            </div>
          </section>
        </Editable>

        {/* Invitation to Join */}
        <Editable page="about" sectionKey="invitation">
          <section className="about-text-section">
            <div className="about-text-inner">
              <h2>{c.invitation.heading}</h2>
              <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
              <p>{c.invitation.text}</p>
            </div>
          </section>
        </Editable>

        {/* Terms & Conditions */}
        <Editable page="about" sectionKey="terms">
          <section className="about-text-section about-terms-section">
            <div className="about-text-inner">
              <h2>{c.terms.heading}</h2>
              <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
              <Link className="about-terms-button" to="/p/terms-conditions">
                {c.terms.buttonLabel} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </Editable>
      </main>
      <PageFooter />
    </div>
  )
}
