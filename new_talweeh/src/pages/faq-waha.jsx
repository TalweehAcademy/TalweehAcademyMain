// /faq: frequently asked questions, grouped by topic (data/faqContent.js), on the About band's look with the Arabic
// page's accordion. Topic chips jump to a group; links inside answers open in the app without a reload. A closed
// answer is inert (React 18 takes the attribute as a string), so its links can't be reached with Tab.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { FAQ_SECTIONS } from '../data/faqContent'
import '../about-waha-v1.css'
import '../arabic-waha-v1.css'
import '../faq-waha-v1.css'

const SEAL = '/brand/talweeh-seal-gold.webp'

function Group({ s }) {
  const [open, setOpen] = useState(-1)
  return (
    <section className="fq-group" id={s.k} aria-labelledby={`fq-${s.k}`}>
      <h2 id={`fq-${s.k}`}>{s.title}</h2>
      <div className="ai-acc">
        {s.items.map((it, i) => (
          <div key={it.q} className={`ai-acc-i${open === i ? ' open' : ''}`}>
            <button type="button" aria-expanded={open === i} aria-controls={`fq-${s.k}-${i}`} onClick={() => setOpen(open === i ? -1 : i)}><span>{it.q}</span><i aria-hidden="true" /></button>
            <div className="ai-acc-a" id={`fq-${s.k}-${i}`} role="region" aria-label={it.q} inert={open === i ? undefined : ''}><div dangerouslySetInnerHTML={{ __html: it.a }} /></div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function FaqPage() {
  const navigate = useNavigate()
  useDocumentMeta({ title: 'Frequently Asked Questions' })
  // Same-site links in the answers' HTML: open in the app (no reload); new tabs and other sites as usual.
  const onClick = (e) => {
    const a = e.target.closest?.('a[href^="/"]')
    if (!a || a.target || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(a.getAttribute('href'))
  }
  return (
    <WahaPage className="cw aw fq">
      <div className="wh-wrap">
        <section className="aw-band fq-band">
          <div className="top">
            <img className="seal" src={SEAL} alt="Talweeh Academy" />
            <div><span className="cw-kicker">Help</span><h1>Frequently Asked Questions</h1><p className="sub">Courses, programmes, the Student Portal, payments and live classes: the questions students ask us most.</p></div>
          </div>
          <nav className="fq-chips" aria-label="FAQ topics">
            {FAQ_SECTIONS.map((s) => <a key={s.k} href={`#${s.k}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.k)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{s.title}</a>)}
          </nav>
        </section>
        <div className="fq-body" onClick={onClick}>
          {FAQ_SECTIONS.map((s) => <Group key={s.k} s={s} />)}
          <div className="aw-ask fq-ask"><div><span className="cw-kicker">Still have a question?</span><h3>Contact Us</h3><p>Email <span className="fq-mail">info@talweehacademy.com</span> and we’ll get back to you.</p></div><Link className="wh-btn wh-btn-g aw-btn-sm" to="/contact-us">Contact Talweeh Academy →</Link></div>
        </div>
      </div>
    </WahaPage>
  )
}
