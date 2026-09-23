/* eslint-disable react/prop-types */
// The About menu's four pages as tabs of one house — "Dār" (mockups/about-waha-dar.html):
// What is Talweeh (/about-us), Instructors (/instructors, /instructors/:slug), Contact (/contact-us)
// and Terms & Conditions (/p/terms-conditions). Each tab is its own route. Content stays where the CMS
// edits it: useContent('about'), useContent('contact'), data/instructors.js; terms from data/termsContent.js.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useContent } from '../hooks/useContent'
import { absoluteUrl, useDocumentMeta } from '../hooks/useDocumentMeta'
import { INSTRUCTORS } from '../data/instructors'
import { TERMS } from '../data/termsContent'
import '../about-waha-v1.css'

const TABS = [
  { k: 'talweeh', to: '/about-us', label: 'What is Talweeh', title: 'About Talweeh Academy', sub: 'An institution dedicated to reviving Islamic academia in the West.' },
  { k: 'instructors', to: '/instructors', label: 'Instructors', title: 'Our Instructors', sub: 'Qualified scholars holding ijāzāt, teaching with clarity, depth and relevance.' },
  { k: 'contact', to: '/contact-us', label: 'Contact', title: 'Contact Us', sub: 'Reach Talweeh Academy on Telegram or by email.' },
  { k: 'terms', to: '/p/terms-conditions', label: 'Terms & Conditions', title: 'Terms & Conditions', sub: 'How access to and use of Talweeh Academy’s courses, services and content is governed.' },
]
const SEAL = '/brand/talweeh-seal-gold.png'
const ICONS = [
  <svg key="a" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>,
  <svg key="b" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="13" rx="2" /><path d="m10 9 5 2.5-5 2.5z" /></svg>,
  <svg key="c" viewBox="0 0 24 24"><circle cx="8" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M2.5 20c.5-3.5 2.8-5.5 5.5-5.5s5 2 5.5 5.5M14 15.2c3.2-.8 6.5.6 7.5 4.8" /></svg>,
  <svg key="d" viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
]
const TG = <svg viewBox="0 0 24 24"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.1l-4.8-1.5c-1-.3-1.1-1 .2-1.6L20.5 2.8c.9-.3 1.7.2 1.4 1.5z" /></svg>
const MAIL = <svg viewBox="0 0 24 24"><path d="M2 5h20v14H2V5zm2 2.4V17h16V7.4l-8 5.3-8-5.3zM19.2 7H4.8L12 11.8 19.2 7z" /></svg>
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const roleShort = (r = '') => r.replace(/^Instructor · /, '')
// A biography's first section is headed with the instructor's own name; it reads as their early studies.
const secTitle = (s, i) => (i === 0 ? 'Early life & study' : s.title)

function Talweeh({ a, instructors }) {
  return (
    <>
      <section className="aw-intro">
        <div><span className="cw-kicker">Talweeh Academy</span><h2>{a.intro.heading}</h2><p>{a.intro.para1}</p><p>{a.intro.para2}</p></div>
        {a.intro.imageUrl && <figure className="aw-frame"><img src={a.intro.imageUrl} alt="" loading="lazy" /><figcaption><b>Talweeh Academy</b>Reviving Islamic academia in the West</figcaption></figure>}
      </section>
      <section className="aw-blk">
        <div className="aw-sec-h"><div><span className="cw-kicker">Our curriculum</span><h2>The sciences we teach</h2></div><p>A carefully designed syllabus of robust, content-rich courses across every Islamic science.</p></div>
        <div className="aw-sciences">
          {a.subjects.map((s, i) => { const [name, rest] = s.split(' ('); return <div className="aw-sci" key={s}><span className="n">{String(i + 1).padStart(2, '0')}</span><strong>{name}</strong>{rest && <small>{rest.replace(/\)$/, '')}</small>}</div> })}
        </div>
      </section>
      <section className="aw-blk">
        <div className="aw-sec-h"><div><span className="cw-kicker">{a.proud.subheading}</span><h2>{a.proud.heading}</h2></div></div>
        <div className="aw-proud">{a.highlights.map((h, i) => <article className="wh-glass" key={h.title}><span className="ic">{ICONS[i % ICONS.length]}</span><h3>{h.title}</h3><p>{h.description}</p></article>)}</div>
      </section>
      <section className="aw-blk aw-pillars">
        <article className="hi"><h3>{a.vision.heading}</h3><span className="s">Our vision</span><p>{a.vision.text}</p></article>
        <article><h3>{a.guidance.heading}</h3><span className="s">{a.guidance.subheading}</span><p>{a.guidance.text}</p></article>
      </section>
      <section className="aw-blk">
        <div className="aw-sec-h"><div><span className="cw-kicker">Qualified guidance</span><h2>Meet the instructors</h2></div><Link className="wh-btn wh-btn-glass aw-btn-sm" to="/instructors">All instructors →</Link></div>
        <div className="aw-meet">{instructors.map((x) => <Link className="aw-mini" key={x.slug} to={`/instructors/${x.slug}`}><img src={x.image} alt={x.name} loading="lazy" style={{ objectPosition: x.imagePosition || 'center' }} /><span><strong>{x.name}</strong><small>{roleShort(x.role)}</small></span></Link>)}</div>
      </section>
      <section className="aw-blk aw-ends">
        <div className="aw-invite"><span className="cw-kicker">{a.invitation.heading}</span><h2>Raise the bar for Islamic education with us.</h2><p>{a.invitation.text}</p><div className="acts"><Link className="wh-btn wh-btn-g" to="/courses">Browse courses →</Link><Link className="wh-btn wh-btn-glass" to="/contact-us">Contact us</Link></div></div>
        <Link className="aw-tcard" to="/p/terms-conditions"><div><span className="sym">§</span><span className="cw-kicker">Policies</span><h3>{a.terms.heading}</h3><p>Registration, course content, conduct, payments and refunds, and your privacy — effective {TERMS.effective}.</p></div><span className="wh-btn aw-btn-line aw-btn-sm">{a.terms.buttonLabel} →</span></Link>
      </section>
    </>
  )
}

function Instructors({ a, instructors }) {
  return (
    <>
      <div className="aw-sec-h"><div><span className="cw-kicker">Qualified guidance · {a.guidance.subheading}</span><h2>Learn from scholars trained in the tradition</h2></div><p>{a.guidance.text.split('. ')[0]}.</p></div>
      <div className="aw-ilist">{instructors.map((x) => (
        <Link className="aw-icard" key={x.slug} to={`/instructors/${x.slug}`}>
          <span className="ph"><img src={x.image} alt={x.name} loading="lazy" style={{ objectPosition: x.imagePosition || 'center' }} /></span>
          <span className="bd"><span className="role">{x.role}</span><h3>{x.name}</h3><p>{x.summary}</p><span className="go">Read full biography →</span></span>
        </Link>
      ))}</div>
    </>
  )
}

function Bio({ x, instructors }) {
  const k = instructors.indexOf(x), prev = instructors[k - 1], next = instructors[k + 1]
  return (
    <>
      <Link className="aw-back" to="/instructors">← All instructors</Link>
      <div className="aw-bio">
        <aside>
          <div className="port"><img src={x.image} alt={x.name} style={{ objectPosition: x.imagePosition || 'center' }} /></div>
          <nav className="toc wh-glass" aria-label="Biography sections"><span className="cw-kicker">In this biography</span>
            {x.sections.map((s, i) => <button type="button" key={s.title} onClick={() => scrollTo(`bio-${i}`)}><b>{i + 1}</b>{secTitle(s, i)}</button>)}</nav>
        </aside>
        <article>
          <span className="role">{x.role}</span><h2>{x.name}</h2><p className="sum">{x.summary}</p>
          {x.sections.map((s, i) => <section id={`bio-${i}`} key={s.title}><h3><b>{String(i + 1).padStart(2, '0')}</b>{secTitle(s, i)}</h3><p>{s.body}</p></section>)}
          <div className="bnav">{prev ? <Link className="wh-btn wh-btn-glass aw-btn-sm" to={`/instructors/${prev.slug}`}>‹ {prev.name}</Link> : <span />}{next && <Link className="wh-btn wh-btn-g aw-btn-sm" to={`/instructors/${next.slug}`}>{next.name} ›</Link>}</div>
        </article>
      </div>
    </>
  )
}

function Contact({ ct, social }) {
  return (
    <>
      <div className="aw-cwrap">
        <article className="aw-ccard wh-glass"><span className="ic">{TG}</span><span className="cw-kicker">Telegram</span><h2>{ct.telegram.heading}</h2><p>{ct.telegram.prefix} <span className="v">{ct.telegram.url.replace(/^https?:\/\//, '')}</span> {ct.telegram.suffix}</p><a className="wh-btn wh-btn-g" href={ct.telegram.url} target="_blank" rel="noreferrer">Open Telegram →</a></article>
        <article className="aw-ccard wh-glass"><span className="ic">{MAIL}</span><span className="cw-kicker">Email</span><h2>{ct.email.heading}</h2><p>{ct.email.prefix} <span className="v">{ct.email.address}</span> {ct.email.suffix}</p><a className="wh-btn wh-btn-g" href={`mailto:${ct.email.address}`}>Write to us →</a></article>
      </div>
      <div className="aw-also">
        <Link to="/p/terms-conditions"><small>Before you register</small><strong>Terms &amp; Conditions</strong><span>Payments, refunds and policies</span></Link>
        <Link to="/instructors"><small>Who teaches</small><strong>Our instructors</strong><span>Biographies and ijāzāt</span></Link>
        <Link to="/about-us"><small>About us</small><strong>What is Talweeh</strong><span>Our mission and vision</span></Link>
      </div>
      <div className="aw-soc">{social.map((s) => (/^https?:/.test(s.href || '')
        ? <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
        : <span key={s.label} className="off">{s.label}</span>))}</div>
    </>
  )
}

function Terms() {
  const [on, setOn] = useState('t1')
  useEffect(() => {
    const els = [...document.querySelectorAll('.aw-doc section, #tq')]
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setOn(e.target.id) }), { rootMargin: '-30% 0px -60% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <div className="aw-legal">
      <nav className="wh-glass" aria-label="Terms and Conditions contents"><span className="cw-kicker">On this page</span>
        {TERMS.sections.map((s) => <button type="button" key={s.n} className={on === `t${s.n}` ? 'on' : ''} onClick={() => scrollTo(`t${s.n}`)}><b>{s.n}</b>{s.title}</button>)}
        <button type="button" className={on === 'tq' ? 'on' : ''} onClick={() => scrollTo('tq')}><b>?</b>Contact Us</button>
      </nav>
      <article className="aw-doc">
        <span className="eff">Effective Date · {TERMS.effective}</span>
        <div className="open">{TERMS.opening.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}</div>
        {TERMS.sections.map((s) => <section id={`t${s.n}`} key={s.n}><h2><b>{s.n}.</b>{s.title}</h2><div dangerouslySetInnerHTML={{ __html: s.html }} /></section>)}
        <div className="aw-ask" id="tq"><div><span className="cw-kicker">Questions about these terms?</span><h3>Contact Us</h3><p><span dangerouslySetInnerHTML={{ __html: TERMS.contact }} /> <a href={`mailto:${TERMS.email}`}>{TERMS.email}</a></p></div><Link className="wh-btn wh-btn-g aw-btn-sm" to="/contact-us">Contact Talweeh Academy →</Link></div>
      </article>
    </div>
  )
}

export default function AboutWahaPage({ tab = 'talweeh' }) {
  const { slug } = useParams()
  const { content: a } = useContent('about')
  const { content: ct } = useContent('contact')
  const { content: g } = useContent('global')
  const t = TABS.find((x) => x.k === tab) || TABS[0]
  const person = tab === 'instructors' && slug ? INSTRUCTORS.find((x) => x.slug === slug) : null
  const missing = tab === 'instructors' && slug && !person
  useDocumentMeta(person ? { title: person.name, description: person.summary, image: absoluteUrl(person.image) } : { title: t.title })

  let room
  if (missing) room = <div className="aw-missing"><h2>Instructor not found</h2><p>This instructor page is unavailable.</p><Link className="wh-btn wh-btn-g" to="/instructors">Return to instructors</Link></div>
  else if (tab === 'instructors') room = person ? <Bio x={person} instructors={INSTRUCTORS} /> : <Instructors a={a} instructors={INSTRUCTORS} />
  else if (tab === 'contact') room = <Contact ct={ct} social={g.footer.social} />
  else if (tab === 'terms') room = <Terms />
  else room = <Talweeh a={a} instructors={INSTRUCTORS} />

  return (
    <WahaPage className="cw aw">
      <div className="wh-wrap">
        <section className="aw-band">
          <div className="top">
            <img className="seal" src={SEAL} alt="Talweeh Academy" />
            <div><span className="cw-kicker">About Talweeh Academy</span><h1>{person ? person.name : t.title}</h1><p className="sub">{person ? person.role : t.sub}</p></div>
          </div>
          <nav className="aw-tabs" aria-label="About Talweeh Academy">
            {TABS.map((x) => <Link key={x.k} to={x.to} className={x.k === t.k ? 'on' : ''} aria-current={x.k === t.k ? 'page' : undefined}>{x.label}</Link>)}
          </nav>
        </section>
        <div className="aw-room" key={`${t.k}/${slug || ''}`}>{room}</div>
      </div>
    </WahaPage>
  )
}
