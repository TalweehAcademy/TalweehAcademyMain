// TALWEEH_PROGRAM_PAGES_V1_3_1: balanced ten-year selector + enrollment link
import { useState } from 'react'
import { PageHeader, PageFooter } from './_shared'
import './alimiyyah.css'
const APPLY = 'https://forms.gle/cLhxh5YUck96fCPc6'
const years = {
// TALWEEH_ALIMIYYAH_CURRICULUM_10Y_V1_1_FIX
  1: {
    label: "1st Year",
    subtitle: "Foundations in Arabic & Islamic Studies",
    intro: "A foundational year in Arabic, Qurʾān recitation, creed, fiqh, adab, and essential Islamic studies.",
subjects: [
      ["Overview of The Arabic Language", "Foundational overview of Arabic language study", "Arabic"],
      ["Al-Shadharah al-Dhahabiyyah", "Arabic language foundations", "Arabic"],
      ["Al-Mumti’ fi Sharh al-Ajurrumiyyah", "Study of al-Ajurrumiyyah through al-Mumti’", "Nahw"],
      ["Madina Book Series", "Applied Arabic language study", "Arabic"],
      ["Qasas al-Nabiyeen", "Story of Ibrahim and Yusuf ‘alayhima al-salam", "Reading"],
      ["Contemporary Ideologies and Movements: An Islamic Perspective", "Contemporary ideologies and movements from an Islamic perspective", "Islamic Studies"],
      ["Ascent to Felicity", "Foundational study of worship and practice", "Fiqh"],
      ["Nubdhah min Fada’il Talab al-‘Ilm wa Adab hamileeh", "The Garden Of The Gnostics (Bustan Al-’Arifin of al-Nawawi)", "Adab"],
      ["Tajweed 101 + Reading", "Qira’at 1", "Qira’at"],
      ["‘Aqīdah", "Foundational creed", "‘Aqīdah"],
      ["Introduction to Fiqh", "Introduction to the study of fiqh", "Fiqh"],
    ],
  },
  2: {
    label: "2nd Year",
    subtitle: "Developing Arabic & Core Islamic Sciences",
    intro: "A second-year curriculum strengthening Arabic tools while expanding fiqh, hadith, tajweed, creed, seerah, and the Islamic sciences.",
    subjects: [
      ["Al-Tuhfah al-Saniyyah", "Mutammimah al-Ajurrumiyyah", "Nahw"],
      ["Tasreef al-‘Izzi", "Sawati’ al-Juman", "Sarf"],
      ["Introduction to Fiqh and the Hanafi School of Thought", "Nur al-Idah", "Fiqh"],
      ["Min Adab al-Islam", "Reading practice · Ta’iyyah + Lamiyyah", "Adab"],
      ["Zad al-Talibeen", "Hadith 1", "Hadith"],
      ["Qawaid al-Tajweed", "Qira’at 2", "Qira’at"],
      ["Introduction to the Islamic Sciences", "Introduction to the major Islamic disciplines", "Islamic Studies"],
      ["‘Aqeedah Ahl Al-Sunnah", "Creed of Ahl al-Sunnah", "‘Aqeedah"],
      ["Seerah and Fadha’il al-Sahabah", "Basic level", "Seerah"],
    ],
  },
  3: {
    label: "3rd Year",
    subtitle: "Intermediate Classical Studies",
    intro: "An intermediate year centered on sustained classical texts across fiqh, tafsir, hadith, usul, Arabic sciences, qira’at, and spiritual development.",
subjects: [
      ["Mukhtaṣar al-Qudūrī", "Full year · Recorded classes · Live 2 hrs/week", "Fiqh"],
      ["Al-Tafsīr al-Bayānī — Last 5 ajzāʾ", "Full year · Live classes 2 hrs/week", "Tafsir"],
      ["Riyāḍ al-Ṣāliḥīn", "Full year · Live classes", "Hadith 2"],
      ["Revised Uṣūl al-Fiqh + Uṣūl al-Shāshī", "Full year", "Usul al-Fiqh"],
      ["Sharḥ Qaṭr al-Nadā", "Full year · Recorded classes", "Nahw"],
      ["Al-Tamhīd fī Uṣūl al-Dīn", "Recorded classes", "‘Aqeedah"],
      ["Al-Bayqūniyyah", "Al-Nawawiyyah · Recorded classes", "Mustalah + Hadith"],
      ["Miʾat al-Maʿānī wa al-Bayān", "Live classes · 1 hr/week", "Balaghah"],
      ["Manṭiq 101", "Recorded classes", "Mantiq"],
      ["Marāḥ al-Arwāḥ", "Live classes · 1 hr/week", "Sarf"],
      ["Sīrah", "Live classes · 1 hr/week", "Seerah"],
      ["Al-Tibyān lil-Nawawī", "Reading practice · Live classes + Al-da wal-dawa li ibn al-Qayyim · 1 hr/week", "Reading"],
      ["Al-Jazariyyah", "Qira’at", "Qira’at"],
    ],
  },
  4: {
    label: "4th Year",
    subtitle: "Classical Texts & Scholarly Method",
    intro: "A broad classical curriculum spanning tafsir, hadith, fiqh, usul, Arabic grammar and morphology, creed, logic, rhetoric, literature, qira’at, and history.",
subjects: [
      ["Tafsir al-Jalalyn: 21–25", "", "Tafsir"],
      ["Al-Mu’tasar 1: Qism al-‘Ibadat", "", "Hadith"],
      ["Tuhfah al-Fuqaha or Multaqa al-Abhur", "", "Fiqh"],
      ["Usul al-Bazdawi or a commentary on Manar", "", "Usul al-Fiqh"],
      ["Al-Kafiyah + Alfiyyah", "", "Nahw"],
      ["Al-Shafiyah + Lamiyyah", "", "Sarf"],
      ["Al-‘Umdah", "", "‘Aqeedah"],
      ["Nukhbah al-Fikar", "", "Mustalah"],
      ["Isaghoji with a commentary", "Mir or Mughni", "Mantiq"],
      ["Tayseer al-Balaghah", "al-Samarqandiyyah", "Balaghah"],
      ["Al-Mu’allaqat al-Sab’", "", "Adab"],
      ["Muqaddimat Al-Shatibiyyah", "", "Qira’at"],
      ["Tarikh 1", "", "History"],
    ],
  },
  5: {
    label: "5th Year",
    subtitle: "Advanced Fiqh, Tafsir & Qira’at",
    intro: "Advanced study in tafsir, hadith, Hanafi fiqh, qira’at, rhetoric, adab, usul al-fiqh, logic, history, and creed.",
subjects: [
      ["Tafsir al-Nasafi: 16–20", "", "Tafsir"],
      ["Al-Mu’tasar 2: Nikah – Waqf", "", "Hadith"],
      ["Hidayah 1", "", "Fiqh"],
      ["Al-Shatibiyyah (furush) + al-Kashf li Makki ibn Abi Talib", "", "Qira’at"],
      ["Mukhtasar al-Ma’ani", "", "Balaghah"],
      ["Insha", "", "Adab"],
      ["Al Tawdeeh ‘ala-Tanqeeh or al-Mirqah ‘ala al-Mir’ah 1", "", "Usul al-Fiqh"],
      ["al-Mirqah", "Al-Kubra", "Mantiq"],
      ["Tarikh 2", "", "History"],
      ["Al-Khamseen + Masa’il al-Ikhtilaf", "", "‘Aqeedah"],
    ],
  },
  6: {
    label: "6th Year",
    subtitle: "Advanced Legal & Theological Study",
    intro: "Higher-level study in tafsir, hadith, fiqh, hadith methodology, usul al-fiqh, logic, history, and creed.",
subjects: [
      ["Tafsir Abi Su’ood: 11–15", "", "Tafsir"],
      ["Al-Mu’tasar 3: Buyu’ – Hiyal", "", "Hadith"],
      ["Hidayah 2", "", "Fiqh"],
      ["Muqaddimah Ibn al-Salah", "", "Mustalah"],
      ["Al Tawdeeh or al-Mirqah ‘ala al-Mir’ah 2", "", "Usul al-Fiqh"],
      ["Badee’ al-Mizan", "", "Mantiq"],
      ["Tarikh 3", "", "History"],
      ["al-Iqtisad", "", "‘Aqeedah"],
    ],
  },
  7: {
    label: "7th Year",
    subtitle: "Higher Tafsir, Hadith & Fiqh",
    intro: "Senior-level study emphasizing tafsir, hadith, fiqh, legal maxims, logic, creed, and Islamic history.",
subjects: [
      ["al-Kashshaf: 6–10", "", "Tafsir"],
      ["Mishkat 1", "", "Hadith"],
      ["Hidayah 3", "", "Fiqh"],
      ["Al-Qawa’id al-Fiqhiyyah 2", "", "Fiqh"],
      ["Badee’ al-Mizan", "", "Mantiq"],
      ["Sharh al-‘Aqa’id", "", "‘Aqeedah"],
      ["Tarikh 4", "", "History"],
    ],
  },
  8: {
    label: "8th Year",
    subtitle: "Advanced Hadith & Comparative Theology",
    intro: "An advanced year focused on tafsir, fiqh, hadith texts and traditions, and comparative theological study.",
subjects: [
      ["Tafsir al-Baydhawi: 1–5", "", "Tafsir"],
      ["Mishkat 2", "", "Hadith"],
      ["Hidayah 4", "", "Fiqh"],
      ["al-Muwatta min riwayat Yahya", "", "Hadith"],
      ["al-Muwatta min riwayat Muhammad", "", "Hadith"],
      ["Sharh Ma’ani al-Athar 1", "", "Hadith"],
      ["Comparative Religion", "", "‘Aqeedah"],
    ],
  },
  9: {
    label: "9th Year",
    subtitle: "Senior Hadith Studies",
    intro: "A hadith-intensive senior year with continued study of Mishkat, Sharh Ma’ani al-Athar, the Sunan collections, al-Shama’il, and contemporary theological questions.",
subjects: [
      ["Mishkat 3", "", "Hadith"],
      ["Mishkat 4", "", "Hadith"],
      ["Sharh Ma’ani al-Athar 2", "", "Hadith"],
      ["Jami’ al-Tirmidhi", "", "Hadith"],
      ["Sunan Abi Dawud", "", "Hadith"],
      ["Al-Shama’il", "", "Hadith"],
      ["Contemporary Isms", "", "‘Aqeedah"],
    ],
  },
  10: {
    label: "10th Year",
    subtitle: "Culminating Hadith & Sacred Law",
    intro: "The culminating year centers on the major hadith collections alongside Sharh Ma’ani al-Athar, Al-Shifa, and Al-Siyasah al-Shar’iyyah.",
subjects: [
      ["Saheeh al-Bukhari", "", "Hadith"],
      ["Saheeh Muslim", "", "Hadith"],
      ["Sunan al-Nasa’i", "", "Hadith"],
      ["Sunan Ibn Majah", "", "Hadith"],
      ["Sharh Ma’ani al-Athar 3", "", "Hadith"],
      ["Al-Shifa", "", "Hadith"],
      ["Al-Siyasah al-Shar’iyyah", "", "Siyasah Shar’iyyah"],
    ],
  },
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
          <div className="alim-actions"><a className="alim-button" href={APPLY} target="_blank" rel="noreferrer">Apply to the seminary</a><a className="alim-text-link" href="#alim-curriculum">Explore the curriculum</a><a className="alim-button alim-button-enrollment" href="mailto:info@talweehacademy.com?subject=Alimiyyah%20Enrollment">For enrollment</a></div>
          <span className="alim-open">Applications are open</span>
        </div>
        <aside className="alim-program-card" aria-label="Program details">
          <div className="alim-card-mark" aria-hidden="true">علم</div>
          <span className="alim-eyebrow">Your next chapter in learning</span>
          <h2>The ʿĀlimiyyah<br/>Seminary</h2>
          <dl><div><dt>Duration</dt><dd>Full year</dd></div><div><dt>Format</dt><dd>Online · Part-time</dd></div><div><dt>Learning</dt><dd>Live + recorded lessons</dd></div></dl>
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
        <div className="alim-section-heading"><div><span className="alim-eyebrow">A structured journey through the Islamic sciences</span><h2>Explore your curriculum</h2></div><p>Explore the texts and subjects across Talweeh Academy’s ten-year part-time ʿĀlimiyyah curriculum.</p></div>
        <div className="alim-year-tabs alim-year-selector-grid" role="tablist" aria-label="Curriculum year">{Object.keys(years).map(Number).map(n=><button key={n} id={`alim-tab-${n}`} role="tab" aria-selected={year===n} aria-controls="alim-year-panel" tabIndex={year===n?0:-1} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault(); const next=e.key==='Home'?1:e.key==='End'?3:year===1?3:1;setYear(next);document.getElementById(`alim-tab-${next}`)?.focus()}}} onClick={()=>setYear(n)}>{years[n].label}<span>{years[n].subjects.length} subjects</span></button>)}</div>
        <div id="alim-year-panel" role="tabpanel" aria-labelledby={`alim-tab-${year}`}>
          <div className="alim-year-intro"><h3>{selected.subtitle}</h3><p>{selected.intro}</p></div>
          <ol className="alim-subjects">{selected.subjects.map(([title,detail,mode])=><li key={title}><div><h4>{title}</h4>{detail&&<p>{detail}</p>}{mode&&<span className={`alim-mode ${mode==='Live'?'alim-mode-live':''}`}>{mode}</span>}</div></li>)}</ol>
        </div>
      </section>

{/* TALWEEH_ALIMIYYAH_NO_TIMINGS_V1_2: weekly class times intentionally omitted */}
      <section className="alim-apply"><span className="alim-eyebrow">Begin with intention</span><h2>Your path to knowledge<br/>starts with a first step.</h2><p>Applications are now open. Explore the curriculum and complete the application form to learn more about joining the seminary.</p><a className="alim-button" href={APPLY} target="_blank" rel="noreferrer">Apply to Talweeh Academy</a></section>
    </main>
    <PageFooter />
  </div>
}
