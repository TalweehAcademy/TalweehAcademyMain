import { Link } from 'react-router-dom'
// The PageHeader-era styles, split out of the global App.css / public-theme.css (only these pages use them).
import '../App-legacy-pages.css'
import '../public-theme-legacy-pages.css'
import { PageHeader, PageFooter } from './_shared'
import { ASSET } from '../constants/assets'
import { ARABIC_LINKS, ABOUT_SECTIONS, PROUD_CARDS } from '../content/arabicProgram'

export default function ArabicAboutPage() {
  return (
    <div className="page-shell arb-shell">
      <PageHeader />
      <main>
        <section className="arb-hero arb-hero-compact">
          <h1>About Talweeh Arabic</h1>
          <div className="arb-hero-actions">
            <Link className="arb-btn-primary" to="/arabic/program">Explore Arabic Program</Link>
            <a className="arb-btn-secondary" href={ARABIC_LINKS.membership} target="_blank" rel="noreferrer">Become a Member</a>
          </div>
        </section>

        {ABOUT_SECTIONS.map((section, i) => (
          <section key={section.title} className={`arb-about-section${i % 2 ? ' alt' : ''}`}>
            <h2>{section.title}</h2>
            <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
            {section.paragraphs.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
          </section>
        ))}

        <section className="arb-curriculum">
          <h2>Things that make us proud</h2>
          <img className="section-divider" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <div className="arb-proud-grid">
            {PROUD_CARDS.map((card) => {
              const external = /^https?:\/\//.test(card.href)
              const body = (
                <>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </>
              )
              return external ? (
                <a key={card.title} className="arb-proud-card" href={card.href} target="_blank" rel="noreferrer">{body}</a>
              ) : (
                <Link key={card.title} className="arb-proud-card" to={card.href}>{body}</Link>
              )
            })}
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
