import { useState } from 'react'
import { PageHeader, PageFooter } from './_shared'
import './alimiyyah.css'
const APPLY = 'https://forms.gle/cLhxh5YUck96fCPc6'
const years = {
  1: { label: 'First year', subtitle: 'Build your foundations', intro: 'Begin with Arabic, worship, Qurʾān recitation, and the cultivation of Islamic character.', weekdays: '8:00–10:00 pm', weekends: '10:00 am–1:00 pm', subjects: [
    ['Overview of the Arabic Language'], ['Arabic Tutor'], ['Al-Ājurrūmiyyah', 'Arabic Grammar'], ['Tashīl al-Ṣarf', 'Arabic Morphology'], ['Madina Book Series'], ['Qaṣaṣ al-Nabiyyīn', 'Stories of the Prophets'], ['Contemporary Ideologies and Movements', 'An Islamic Perspective'], ['Ascent to Felicity'], ['The Garden of the Gnostics', 'Bustān al-ʿĀrifīn by Imām al-Nawawī'], ['Tajweed 101 + Reading Practice'],
  ]},
  3: { label: 'Third year', subtitle: 'Deepen your study', intro: 'Study classical texts across fiqh, tafsīr, ḥadīth, theology, and the Arabic sciences.', weekdays: '3:30–4:30 pm', weekends: '9:30 am–1:30 pm', subjects: [
    ['Mukhtaṣar al-Qudūrī', '', 'Recorded + Live'], ['Qurʾān Translation & Linguistic Tafsīr', '5 ajzāʾ', 'Live'], ['Riyāḍ al-Ṣāliḥīn', 'Full year', 'Live'], ['Uṣūl al-Fiqh 101 + Uṣūl al-Shāshī', '', 'Recorded'], ['Sharḥ Qaṭr al-Nadā', 'Full year', 'Recorded + Live'], ['Al-Tamhīd fī Uṣūl al-Dīn', '', 'Recorded'], ['Al-Bayqūniyyah and Al-Nawawiyyah', '', 'Recorded'], ['Balāghah', 'Miʾat al-Maʿānī wa al-Bayān', 'Live'], ['Manṭiq 101', '', 'Recorded'], ['Mirāḥ al-Arwāḥ', '', 'Live'], ['Sīrah', '', 'Live'], ['Al-Tibyān lil-Nawawī & Al-Da wal-Dawa li Ibn al-Qayyim', 'Reading practice', 'Live'],
  ]},
}
const values = [['ʿIlm', 'Sound knowledge', 'Learn with depth, clarity, and a firm grounding in the Islamic tradition.'], ['ʿAmal', 'Righteous action', 'Bring what you learn into your worship and everyday life.'], ['Discipline', 'Consistent study', 'Develop the habits and commitment that serious learning requires.'], ['Tazkiyah', 'Self-purification', 'Nurture sincerity and spiritual growth alongside academic progress.'], ['Adab', 'Islamic etiquette', 'Cultivate the character to serve others with wisdom and integrity.']]
export default function AlimiyyahPage() {
  const [year, setYear] = useState(1)
  const selected = years[year]
  return <div className="page-shell alim-page">
    <PageHeader />
    <main>
      <section className="alim-hero">
        <div className="alim-hero-copy">
          <span className="alim-eyebrow">Talweeh Academy · Online Seminary</span>
          <h1>Rooted in tradition.<br/><em>Knowledge for a life of service.</em></h1>
          <p className="alim-program-name">Part-Time Online ʿĀlimiyyah Seminary</p>
          <p className="alim-lead">A comprehensive, structured path through traditional Islamic education—designed for students balancing work, family, and the pursuit of sacred knowledge.</p>
          <div className="alim-actions"><a className="alim-button" href={APPLY} target="_blank" rel="noreferrer">Apply to the seminary</a><a className="alim-text-link" href="#alim-curriculum">Explore the curriculum</a></div>
          <span className="alim-open">Applications are open</span>
        </div>
        <aside className="alim-program-card" aria-label="Program details">
          <div className="alim-card-mark" aria-hidden="true">علم</div>
          <span className="alim-eyebrow">Your next chapter in learning</span>
          <h2>The ʿĀlimiyyah<br/>Seminary</h2>
          <dl><div><dt>Start date</dt><dd>September 5, 2026</dd></div><div><dt>Duration</dt><dd>Full year</dd></div><div><dt>Format</dt><dd>Online · Part-time</dd></div><div><dt>Learning</dt><dd>Live + recorded lessons</dd></div></dl>
          <p>Traditional depth. A structured path. Space for your commitments.</p>
        </aside>
      </section>
      <section className="alim-benefits" aria-label="How you will learn">
        <article><span>01 / CONNECT</span><h2>Learn together, live</h2><p>Interactive classes connect you with real-time instruction and opportunities to engage with your learning.</p></article>
        <article><span>02 / REVISIT</span><h2>Make room for study</h2><p>High-quality recorded lessons support flexible learning at your own pace. Recordings are available for selected sessions.</p></article>
        <article><span>03 / SERVE</span><h2>Study with purpose</h2><p>Connect the depth of the traditional curriculum with practical, contemporary applications and the needs of Muslim communities in the West.</p></article>
      </section>
      <section className="alim-mission alim-section">
        <div><span className="alim-eyebrow">More than academic achievement</span><h2>Sound scholarship.<br/><em>Exemplary character.</em></h2></div>
        <div><p>Talweeh Academy’s seminary prepares students to grow as grounded scholars, educators, researchers, and community leaders—equipped to address the intellectual and spiritual needs of their communities.</p><p>Its vision brings knowledge and character together. True scholarship calls for sound knowledge, righteous action, discipline, self-purification, and refined Islamic etiquette.</p></div>
      </section>
      <section className="alim-values" aria-label="The five foundations of our approach">{values.map(([term,title,body],i)=><article key={term}><span className="alim-value-index">0{i+1}</span><p className="alim-value-term">{term}</p><h3>{title}</h3><p>{body}</p></article>)}</section>
      <section className="alim-section alim-curriculum" id="alim-curriculum">
        <div className="alim-section-heading"><div><span className="alim-eyebrow">A structured journey through the Islamic sciences</span><h2>Explore your curriculum</h2></div><p>Discover the texts and subjects offered in the first and third years.</p></div>
        <div className="alim-year-tabs" role="tablist" aria-label="Curriculum year">{[1,3].map(n=><button key={n} id={`alim-tab-${n}`} role="tab" aria-selected={year===n} aria-controls="alim-year-panel" tabIndex={year===n?0:-1} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault(); const next=e.key==='Home'?1:e.key==='End'?3:year===1?3:1;setYear(next);document.getElementById(`alim-tab-${next}`)?.focus()}}} onClick={()=>setYear(n)}>{years[n].label}<span>{years[n].subjects.length} subjects</span></button>)}</div>
        <div id="alim-year-panel" role="tabpanel" aria-labelledby={`alim-tab-${year}`}>
          <div className="alim-year-intro"><h3>{selected.subtitle}</h3><p>{selected.intro}</p></div>
          <ol className="alim-subjects">{selected.subjects.map(([title,detail,mode],i)=><li key={title}><span className="alim-subject-number">{String(i+1).padStart(2,'0')}</span><div><h4>{title}</h4>{detail&&<p>{detail}</p>}{mode&&<span className={`alim-mode ${mode==='Live'?'alim-mode-live':''}`}>{mode}</span>}</div></li>)}</ol>
        </div>
      </section>
      <section className="alim-section alim-schedule" id="alim-schedule">
        <div className="alim-section-heading"><div><span className="alim-eyebrow">Plan your week</span><h2>A rhythm for serious study</h2></div><p>Weekly class times · EST<br/>Online instruction, with recordings for selected sessions.</p></div>
        <div className="alim-schedule-grid">{[1,3].map(n=><article key={n}><div className="alim-schedule-title"><span>YEAR {n}</span><h3>{years[n].label}</h3></div><dl><div><dt>Tuesdays & Thursdays</dt><dd>{years[n].weekdays} <small>EST</small></dd></div><div><dt>Saturdays & Sundays</dt><dd>{years[n].weekends} <small>EST</small></dd></div></dl></article>)}</div>
      </section>
      <section className="alim-apply"><span className="alim-eyebrow">Begin with intention</span><h2>Your path to knowledge<br/>starts with a first step.</h2><p>Applications are now open. Explore the curriculum and complete the application form to learn more about joining the seminary.</p><a className="alim-button" href={APPLY} target="_blank" rel="noreferrer">Apply to Talweeh Academy</a></section>
    </main>
    <PageFooter />
  </div>
}
