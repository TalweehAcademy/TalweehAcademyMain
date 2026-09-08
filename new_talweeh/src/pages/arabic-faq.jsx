import { Link } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import { ASSET } from '../constants/assets'
import { ARABIC_LINKS, FAQ_ITEMS } from '../content/arabicProgram'
import { Accordion } from './arabic-program'

export default function ArabicFaqPage() {
  return (
    <div className="page-shell arb-shell">
      <PageHeader />
      <main>
        <section className="arb-hero arb-hero-compact">
          <h1>Frequently Asked Questions</h1>
          <p className="arb-hero-sub">Everything you need to know about joining the 2-Year Arabic Program.</p>
        </section>

        <section className="arb-curriculum">
          <div className="arb-panel-left">
            <Accordion items={FAQ_ITEMS} />
          </div>
          <img className="section-divider arb-divider-spaced" src={`${ASSET}/2024/08/border3.svg`} alt="" />
          <p className="arb-curriculum-intro">
            If you have any further questions, please feel free to <Link to="/contact-us">contact us</Link>.
          </p>
          <div className="arb-hero-actions">
            <a className="arb-btn-primary" href={ARABIC_LINKS.membership} target="_blank" rel="noreferrer">Become a Member</a>
            <a className="arb-btn-outline" href="/arabic#arabic-program-content">View the Full Program</a>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
