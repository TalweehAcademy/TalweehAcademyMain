/* eslint-disable react/prop-types */
import { useState } from 'react'
import { PageHeader, PageFooter } from './_shared'
import VideoFacade from '../components/VideoFacade'
import './arabic-single-page.css'
import { ARABIC_PROGRAM_ENROL } from '../constants/links'
import {
  PROGRAM_HERO, LEARNING_OBJECTIVES_INTRO, LEARNING_OBJECTIVES,
  PROGRAM_MODULES,
} from '../content/arabicProgram'

function renderInlineBold(text) {
  return String(text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      : <span key={`${part}-${index}`}>{part}</span>
  )
}

function AccordionAnswer({ value }) {
  const lines = String(value || '').split('\n')
  return (
    <div className="arb-accordion-answer">
      {lines.map((raw, index) => {
        const line = raw.trim()
        if (!line) return <span className="arb-answer-space" aria-hidden="true" key={`space-${index}`} />
        if (line.startsWith('- ')) return <div className="arb-answer-bullet" key={`${line}-${index}`}><span aria-hidden="true">•</span><span>{renderInlineBold(line.slice(2))}</span></div>
        if (line.startsWith('**') && line.endsWith('**') && line.length > 4) return <strong className="arb-answer-subhead" key={`${line}-${index}`}>{line.slice(2, -2)}</strong>
        return <p key={`${line}-${index}`}>{renderInlineBold(line)}</p>
      })}
    </div>
  )
}

export function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0)
  return (
    <div className="arb-accordion">
      {items.map((item, i) => (
        <div key={item.title || item.q} className={`arb-accordion-item${openIndex === i ? ' open' : ''}`}>
          <button
            type="button"
            aria-expanded={openIndex === i}
            onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
          >
            <span>{item.title || item.q}</span>
            <span className="arb-accordion-caret" aria-hidden="true">{openIndex === i ? '−' : '+'}</span>
          </button>
          {openIndex === i && <AccordionAnswer value={item.text || item.a} />}
        </div>
      ))}
    </div>
  )
}

export default function ArabicProgramPage() {
  const [activeModule, setActiveModule] = useState(1)
  const current = PROGRAM_MODULES.find((m) => m.n === activeModule)

  return (
    <div className="page-shell arb-shell arb-single-page">
      <PageHeader />
      <main>
        {/* ── Hero ─────────────────────────────────── */}
        <section className="arb-hero">
          <img className="arb-hero-bismillah" src="/legacy-assets/talweeharabic/2025/12/bismilla-e1755384561119-300.webp" alt="Bismillah al-Rahman al-Rahim" />
          <h1>Unlock the Language of the Qur’an Beyond Translation</h1>
          <div className="arb-welcome-video">
            <VideoFacade src={PROGRAM_HERO.video.src} title="About the 2-Year Arabic Program" thumbnail={PROGRAM_HERO.video.thumbnail} />
          </div>
        </section>

        {/* ── Learning objectives ───────────────────── */}
        <section className="arb-curriculum">
          <h2>Learning Objectives</h2>
          <p className="arb-curriculum-intro">{LEARNING_OBJECTIVES_INTRO}</p>
          <div className="arb-panel-left">
            <Accordion items={LEARNING_OBJECTIVES} />
          </div>
        </section>

        {/* ── Module overviews ──────────────────────── */}
        <section className="arb-curriculum" id="modules">
          <h2>Module Overviews</h2>
          <p className="arb-curriculum-intro">
            At Talweeh Arabic, we have curated the most effective texts into a comprehensive two-year
            curriculum designed to guide you from beginner to advanced proficiency.
          </p>
          <div className="arb-module-tabs" role="tablist" aria-label="Curriculum modules">
            {PROGRAM_MODULES.map((m) => (
              <button
                key={m.n}
                type="button"
                role="tab"
                aria-selected={activeModule === m.n}
                className={activeModule === m.n ? 'active' : ''}
                onClick={() => setActiveModule(m.n)}
              >
                Module {m.n}
              </button>
            ))}
          </div>
          <div className="arb-module-panel">
            <div className="arb-module-panel-head">
              <span className="arb-module-num">{current.n}</span>
              <div>
                <strong>Module {current.n} — {current.name}</strong>
                <span className="arb-module-duration">{current.duration}</span>
              </div>
            </div>
            <p>{current.overview}</p>
            <div className="arb-module-texts">
              <span className="arb-module-texts-label">Texts studied</span>
              <ul>
                {current.texts.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <Accordion items={current.sections} />
          </div>
        </section>

        <section className="arb-membership-finish" aria-label="Join the Arabic program">
          <a className="arb-btn-primary" href={ARABIC_PROGRAM_ENROL}>Enroll now</a>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
