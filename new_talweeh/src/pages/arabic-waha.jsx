/* eslint-disable react/prop-types */
// /arabic — "Iʿrāb" (mockups/arabic-waha-irab-refined.html). The hero parses the Basmalah word by word
// in the three lenses the program trains (tarkīb, iʿrāb, ṣarf). Then what students will be able to do
// (the sciences beside the program video), the curriculum as a ladder — tracks (Naḥw, Ṣarf, Adab,
// Qurʾān) against the five modules, where any text opens what the module does with it — six FAQs
// and the closing call.
import { Fragment, useRef, useState } from 'react'
import { WahaPage } from '../components/WahaShell'
import WahaVideoPlayer from '../courses/WahaVideoPlayer'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { youTubeId } from '../courses/courseKit'
import { ARB as R } from '../data/arabicWaha'
import '../arabic-waha-v1.css'

// The Basmalah, parsed three ways (standard analysis). `bi` marks the prefixed particle.
const WORDS = [
  { q: 'سْمِ', bi: 'بِـ', tarkib: ['Ḥarf + majrūr', 'Muḍāf'], irab: ['Jārr + majrūr'], sarf: ['Root س م و'],
    lens: { tarkib: ['Ḥarf al-jarr + majrūr noun', 'The particle bi- with the noun ism: a “ḥarf + majrūr” phrase, and ism is also the first half (muḍāf) of a construct with the next word.'],
      irab: ['Jārr wa majrūr', 'Bi- is a preposition; ism is majrūr by it, the sign being the kasrah. The phrase attaches to an omitted verb or noun — “(I begin) with the name…”.'],
      sarf: ['Ism · root s-m-w', 'Ism (name) goes back to the root س م و; its initial hamzat al-waṣl drops in writing here, after the bāʾ.'] } },
  { q: 'اللَّهِ', tarkib: ['Muḍāf ilayh'], irab: ['Majrūr'], sarf: ['Proper name'],
    lens: { tarkib: ['Muḍāf ilayh', 'Completes the construct: “the name of Allah” — a muḍāf–muḍāf ilayh phrase.'],
      irab: ['Muḍāf ilayh, majrūr', 'The Divine Name is majrūr as the muḍāf ilayh, the sign being the kasrah.'],
      sarf: ['Ism ʿalam', 'The proper name of the Divine, which takes no dual or plural.'] } },
  { q: 'الرَّحْمَٰنِ', tarkib: ['Mawṣūf–ṣifah'], irab: ['Naʿt · majrūr'], sarf: ['فَعْلَان'],
    lens: { tarkib: ['Ṣifah', 'An adjective describing the Divine Name: a mawṣūf–ṣifah phrase.'],
      irab: ['Naʿt (first), majrūr', 'An adjective following the word it describes, so it too is majrūr, the sign being the kasrah.'],
      sarf: ['Pattern faʿlān · root r-ḥ-m', 'From ر ح م on the pattern فَعْلَان, a form that conveys fullness and abundance of the quality.'] } },
  { q: 'الرَّحِيمِ', tarkib: ['Ṣifah'], irab: ['Naʿt · majrūr'], sarf: ['فَعِيل'],
    lens: { tarkib: ['Second ṣifah', 'A second adjective for the same Name.'],
      irab: ['Naʿt (second), majrūr', 'A second adjective, majrūr, the sign being the kasrah.'],
      sarf: ['Pattern faʿīl · root r-ḥ-m', 'From the same root on the pattern فَعِيل, a form that conveys a lasting, constant quality.'] } },
]
const LENSES = [['tarkib', 'Tarkīb'], ['irab', 'Iʿrāb'], ['sarf', 'Ṣarf']]
// FAQ: questions 1–5 and 8 of the program's list.
const FAQ = [...R.FAQ.slice(0, 5), R.FAQ[7]]
const TRACKS = R.TRACKS.filter((t) => t.k !== 'found')
const VIDEO_ID = youTubeId(R.HERO.video.src)

// Answer text: blank lines, "- " bullets and **sub-heads**, as the program content is written.
function Rich({ text }) {
  const blocks = []
  let list = null
  const bold = (s) => s.split(/\*\*([^*]+)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))
  String(text || '').split('\n').forEach((raw, i) => {
    const line = raw.trim()
    if (line.startsWith('- ')) { if (!list) { list = []; blocks.push(<ul key={`u${i}`}>{list}</ul>) } list.push(<li key={i}>{bold(line.slice(2))}</li>); return }
    list = null
    if (!line) return
    if (/^\*\*[^*]+\*\*$/.test(line)) blocks.push(<h5 key={i}>{line.slice(2, -2)}</h5>)
    else blocks.push(<p key={i}>{bold(line)}</p>)
  })
  return <>{blocks}</>
}

function Accordion({ items, initial = 0 }) {
  const [open, setOpen] = useState(initial)
  return (
    <div className="ai-acc">
      {items.map((it, i) => (
        <div key={it.title || it.q} className={`ai-acc-i${open === i ? ' open' : ''}`}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span>{it.title || it.q}</span><i aria-hidden="true" /></button>
          <div className="ai-acc-a"><div><Rich text={it.text || it.a} /></div></div>
        </div>
      ))}
    </div>
  )
}

function Hero() {
  const [lens, setLens] = useState('irab')
  const [word, setWord] = useState(0)
  const [head, body] = WORDS[word].lens[lens]
  const seeTexts = (e) => { e.preventDefault(); document.getElementById('ladder')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <section className="ai-hero">
      <div className="top">
        <div><span className="cw-kicker">Talweeh Arabic · 2-Year Program</span><h1>Unlock the Language of the Qur’an Beyond Translation</h1></div>
        <div className="ai-seg" role="group" aria-label="Way of reading">
          {LENSES.map(([k, l]) => <button key={k} type="button" className={lens === k ? 'on' : ''} aria-pressed={lens === k} onClick={() => setLens(k)}>{l}</button>)}
        </div>
      </div>
      <div className="ai-verse" lang="ar">
        {WORDS.map((w, i) => (
          <button key={i} type="button" className={`w${i === word ? ' on' : ''}`} onClick={() => setWord(i)} onMouseEnter={() => setWord(i)}>
            <span className="q">{w.bi && <b>{w.bi}</b>}{w.q}</span>
            <span className="tags" lang="en">{w[lens].map((t, j) => <span key={t} className={`tag${j ? ' alt' : ''}`}>{t}</span>)}</span>
          </button>
        ))}
      </div>
      <div className="ai-explain" aria-live="polite"><small>{LENSES.find((l) => l[0] === lens)[1]} · word {word + 1} of {WORDS.length}</small><strong>{head}</strong><p>{body}</p></div>
      <div className="foot">
        <p>Don’t just Recite the Qur’an — Understand it! In just 6 hours per week over two years, students confidently understand Qur’anic passages, navigate Arabic dictionaries, and read unvowelized texts.</p>
        <div className="acts"><a className="wh-btn wh-btn-g" href={R.LINKS.membership} target="_blank" rel="noreferrer">Become a Member →</a><a className="wh-btn wh-btn-glass" href="#ladder" onClick={seeTexts}>See the texts</a></div>
      </div>
    </section>
  )
}

// The module section that covers a text, found by the text's first significant word.
const norm = (s) => s.replace(/[ʾʿ’']/g, '').toLowerCase()
function sectionFor(m, t) {
  const k = norm(t.t.replace(/^(Al-|Introduction to )/, '').split(/[\s—]/)[0]).slice(0, 6)
  const sections = m.sections.filter((s) => s.title !== 'Learning Objectives')
  return sections.find((s) => norm(s.title).includes(k)) || sections.find((s) => norm(s.text).includes(k)) || m.sections[0]
}

function Ladder() {
  const [sel, setSel] = useState(null)
  const detailRef = useRef(null)
  const pick = (key) => {
    const next = sel === key ? null : key
    setSel(next)
    if (next) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0)
  }
  const textButton = (m, i, t, found = false) => (
    <button key={i} type="button" className={`ai-text t-${found ? 'found' : t.track}${sel === `${m.n}:${i}` ? ' on' : ''}`} aria-pressed={sel === `${m.n}:${i}`} onClick={() => pick(`${m.n}:${i}`)}>
      <strong>{t.t}</strong>
      {found ? <em>Naḥw + Ṣarf foundations</em> : t.code && <em>{t.code}</em>}
      {t.note && <small>{t.note}</small>}
    </button>
  )

  let detail = null
  if (sel) {
    const [mn, ti] = sel.split(':').map(Number)
    const m = R.MODULES[mn - 1], t = m.texts[ti], s = sectionFor(m, t)
    detail = (
      <div className="ai-detail wh-glass" ref={detailRef}>
        <div>
          <span className="cw-kicker">Module {m.n} · {m.name}</span><h3>{t.t}</h3>
          <div className="meta">{t.code && <span>{t.code}</span>}<span>{m.duration}</span><span>{m.format}</span><span>{m.hours}</span></div>
          <p className="ov">{m.overview}</p>
        </div>
        <div className="body"><h4>{s.title}</h4><Rich text={s.text} /></div>
      </div>
    )
  }

  return (
    <section className="ai-blk" id="ladder">
      <div className="ai-sec-h"><div><span className="cw-kicker">Module overviews</span><h2>The ladder of texts</h2></div><p>At Talweeh Arabic, we have curated the most effective texts into a comprehensive two-year curriculum designed to guide you from beginner to advanced proficiency. Choose any text.</p></div>
      <div className="ai-ladder">
        <div className="corner" />
        {R.MODULES.map((m) => <div key={m.n} className="hd"><small>Module {m.n} · {m.duration}</small><strong>{m.name}</strong><span>{m.format}</span></div>)}
        {TRACKS.map((t, r) => (
          <Fragment key={t.k}>
            <div className={`rh t-${t.k}`}><span className="ar" lang="ar">{t.ar}</span><strong>{t.label}</strong></div>
            {R.MODULES.map((m) => {
              // Module 1 is one foundations text spanning every track (spacers keep the columns when it can't span).
              if (m.n === 1) return r === 0 ? <div key={m.n} className="cell found t-found">{textButton(m, 0, m.texts[0], true)}</div> : <div key={m.n} className="cell spacer" aria-hidden="true" />
              return (
                <div key={m.n} className="cell">
                  {m.texts.map((x, i) => (x.track === t.k ? textButton(m, i, x) : null))}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
      {detail}
    </section>
  )
}

export default function ArabicWahaPage() {
  useDocumentMeta({ title: 'Talweeh Arabic · 2-Year Program', description: 'Don’t just recite the Qur’an — understand it. A two-year Arabic program through the classical texts of Naḥw, Ṣarf, Adab and the Qur’anic sciences.' })
  return (
    <WahaPage className="cw ai">
      <div className="wh-wrap">
        <Hero />

        <section className="ai-blk" id="objectives">
          <span className="cw-kicker">Learning objectives</span><h2 className="ai-h2">What you will be able to do</h2>
          <div className="ai-objw">
            <div><Accordion items={R.OBJECTIVES} /></div>
            <div className="vid"><WahaVideoPlayer videoId={VIDEO_ID} title="About the 2-Year Arabic Program" kicker="Talweeh Arabic" /></div>
          </div>
        </section>

        <Ladder />

        <section className="ai-blk" id="faq">
          <div className="ai-sec-h"><div><span className="cw-kicker">Frequently asked questions</span><h2>Before you join</h2></div></div>
          <div className="ai-faq"><Accordion items={FAQ.slice(0, 3)} initial={-1} /><Accordion items={FAQ.slice(3)} initial={-1} /></div>
        </section>

        <section className="ai-cta">
          <h2>Unlock the Language of the Qur’an<br />Beyond Translation</h2>
          <p>{R.INVITATION}</p>
          <div className="acts">
            <a className="wh-btn wh-btn-g" href={R.LINKS.membership} target="_blank" rel="noreferrer">Become a Member →</a>
            <a className="wh-btn wh-btn-glass" href={R.LINKS.telegram} target="_blank" rel="noreferrer">Talweeh Society on Telegram</a>
          </div>
        </section>
      </div>
    </WahaPage>
  )
}
