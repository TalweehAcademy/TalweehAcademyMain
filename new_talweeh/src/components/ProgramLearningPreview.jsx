/* eslint-disable react/prop-types */
// "My Learning" preview for a programme (/arabic/learning, /hadith-specialization/learning): the whole plan as
// students see it in the Legacy portal (periods > months > weeks), with every lesson locked like a paid
// course's curriculum: titles only, no video links. Each month is drawn like the portal's: a row per week, the
// lessons as stops on a gold path. Data: src/data/programLearningPlans.js (exported from
// Legacy). Styles: program-learning-v1.css, on top of the Wāḥa shell and courses-waha-v1.css (.cw-lc cards).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from './WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { LEGACY_PORTAL } from '../constants/links'
import { warmProgramEnrol } from '../data/programEnrol'
import '../program-learning-v1.css'

// The mark on the gold path, as in the portal's My Learning. This page is a guide to every class in the programme,
// so all stops look the same: a padlock (lessons open in the Student Portal once enrolled), never "coming soon".
const LOCK = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>

/**
 * periods: [{ key, label, sub, months: [{ key, label, sub, weeks: [{ week, items: [{ title, course?, book?, poster?, accent?, ready?, note? }] }] }] }]
 */
export default function ProgramLearningPreview({ programKey, meta, kicker, title, lead, periodLabel, periods, enrolHref, backHref, backLabel, stats }) {
  useDocumentMeta(meta)
  useEffect(() => { const t = setTimeout(() => warmProgramEnrol(programKey), 800); return () => clearTimeout(t) }, [programKey])
  const [p, setP] = useState(0)
  const [m, setM] = useState(0)
  const period = periods[p]
  const month = period?.months[Math.min(m, period.months.length - 1)]
  const count = (items) => items.filter((i) => !i.note).length
  const lessonsIn = (mo) => mo.weeks.reduce((s, w) => s + count(w.items), 0)
  // The books a month covers, for its header ("12 lessons · Arabic 101"); only items that name a book.
  const booksIn = (mo) => [...new Set(mo.weeks.flatMap((w) => w.items.map((i) => i.book)).filter(Boolean))]
  return (
    <WahaPage className="cw pl">
      <div className="wh-wrap">
        <section className="pl-hero">
          <Link className="pl-back" to={backHref}>← {backLabel}</Link>
          <span className="cw-kicker">{kicker}</span>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
          {stats?.length ? <div className="pl-stats">{stats.map(([k, v]) => <span key={k}><b>{v}</b><small>{k}</small></span>)}</div> : null}
          <div className="acts">
            <Link className="wh-btn wh-btn-g" to={enrolHref}>Enroll now →</Link>
            <a className="wh-btn wh-btn-glass" href={`${LEGACY_PORTAL}/auth/login`}>Already enrolled? Sign in</a>
          </div>
          <p className="pl-lock">🔒 Lessons play in the Talweeh Student Portal once you enroll. This page shows the whole plan so you can see what each month holds.</p>
        </section>

        <section className="pl-board">
          <nav className="pl-periods" role="tablist" aria-label={periodLabel}>
            {periods.map((item, i) => (
              <button key={item.key} type="button" role="tab" aria-selected={i === p} className={i === p ? 'on' : ''} onClick={() => { setP(i); setM(0) }}>
                <span>{item.label}</span><strong>{item.title}</strong><small>{item.sub}</small>
              </button>
            ))}
          </nav>
          <nav className="pl-months" aria-label="Month">
            {period.months.map((item, i) => {
              const total = lessonsIn(item)
              return (
                <button key={item.key} type="button" className={`${i === m ? 'on' : ''}${total ? '' : ' empty'}`} onClick={() => setM(i)} aria-pressed={i === m}>
                  <b>{item.label}</b><small>{total ? `${total} lessons` : item.sub || 'Coming soon'}</small>
                </button>
              )
            })}
          </nav>

          <section className="pl-month" aria-label={month.label}>
            <header className="pl-month-h">
              <h2>{month.label}</h2>
              <span>{[lessonsIn(month) ? `${lessonsIn(month)} lessons` : '', ...booksIn(month)].filter(Boolean).join(' · ')}</span>
            </header>
            {lessonsIn(month) ? month.weeks.map((w) => {
              const stops = w.items.filter((i) => !i.note)
              const notes = w.items.filter((i) => i.note)
              return (
                <div key={w.week} className="pl-week">
                  <div className="pl-week-h"><b>Week {w.week}</b></div>
                  {stops.length ? (
                    <ol className="pl-path" style={{ '--n': stops.length > 4 ? Math.ceil(stops.length / 2) : Math.max(3, stops.length) }}>
                      {stops.map((item, i) => (
                        <li key={i} className={`pl-stop${item.accent ? ` s-${item.accent}` : ''}`}>
                          <span className="pl-mark" aria-label="Opens in the Student Portal once you enroll">{LOCK}</span>
                          <div className="pl-card">
                            {item.poster ? <img className="pl-poster" src={item.poster} alt="" width={40} height={52} loading="lazy" decoding="async" /> : <span className="pl-poster is-blank" aria-hidden="true">ع</span>}
                            <span className="pl-copy">
                              {item.course ? <span className="pl-course">{item.course}</span> : null}
                              <strong>{item.title}</strong>
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {notes.length ? <p className="pl-note">{notes.map((i) => i.title).join(' · ')}</p> : null}
                  {!w.items.length ? <p className="pl-note">No lessons this week</p> : null}
                </div>
              )
            }) : <p className="cw-empty">This month’s lessons have not been scheduled yet.</p>}
          </section>
        </section>

        <section className="pl-cta">
          <span className="cw-kicker">Enrollment</span>
          <h2>Ready to begin?</h2>
          <p>Pay in full or month by month. Your lessons, quizzes, notes and progress open in the Student Portal as soon as payment is confirmed.</p>
          <div className="acts"><Link className="wh-btn wh-btn-g" to={enrolHref}>Enroll now →</Link><Link className="wh-btn wh-btn-glass" to={backHref}>{backLabel}</Link></div>
        </section>
      </div>
    </WahaPage>
  )
}
