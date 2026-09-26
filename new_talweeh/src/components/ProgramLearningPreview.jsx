/* eslint-disable react/prop-types */
// "My Learning" preview for a programme (/arabic/learning, /hadith-specialization/learning): the whole plan as
// students see it in the Legacy portal (periods > months > weeks), with every lesson locked like a paid
// course's curriculum: titles only, no video links. Data: src/data/programLearningPlans.js (exported from
// Legacy). Styles: program-learning-v1.css, on top of the Wāḥa shell and courses-waha-v1.css (.cw-lc cards).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from './WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { LEGACY_PORTAL } from '../constants/links'
import '../program-learning-v1.css'

/**
 * periods: [{ key, label, sub, months: [{ key, label, sub, weeks: [{ week, items: [{ title, sub?, tag?, note? }] }] }] }]
 */
export default function ProgramLearningPreview({ meta, kicker, title, lead, periodLabel, periods, enrolHref, backHref, backLabel, stats }) {
  useDocumentMeta(meta)
  const [p, setP] = useState(0)
  const [m, setM] = useState(0)
  const period = periods[p]
  const month = period?.months[Math.min(m, period.months.length - 1)]
  const count = (items) => items.filter((i) => !i.note).length
  const lessonsIn = (mo) => mo.weeks.reduce((s, w) => s + count(w.items), 0)
  let n = 0
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
            <a className="wh-btn wh-btn-g" href={enrolHref}>Enroll now →</a>
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

          <div className="pl-month-h"><h2>{month.label}</h2>{month.sub ? <small>{month.sub}</small> : null}</div>
          {lessonsIn(month) ? (
            <div className="pl-weeks">
              {month.weeks.map((w) => (
                <div key={w.week} className="pl-week">
                  <div className="pl-week-h"><b>Week {w.week}</b><small>{count(w.items)} {count(w.items) === 1 ? 'lesson' : 'lessons'}</small></div>
                  {w.items.length ? w.items.map((item, i) => {
                    if (item.note) return <p key={i} className="pl-note">{item.title}</p>
                    n += 1
                    return (
                      <div key={i} className={`cw-lc cw-card${item.accent ? ` s-${item.accent}` : ''}`}>
                        <span className="n"><b>{item.number ?? n}</b></span>
                        <span>
                          {item.course ? <span className="pl-course">{item.course}</span> : null}
                          <strong>{item.title}</strong>
                          <span className="tag">{item.ready ? '🔒 Student Portal' : 'Coming soon'}</span>
                        </span>
                      </div>
                    )
                  }) : <p className="pl-note">No lessons this week</p>}
                </div>
              ))}
            </div>
          ) : <p className="cw-empty">This month’s lessons have not been scheduled yet.</p>}
        </section>

        <section className="pl-cta">
          <span className="cw-kicker">Enrollment</span>
          <h2>Ready to begin?</h2>
          <p>Pay in full or month by month. Your lessons, quizzes, notes and progress open in the Student Portal as soon as payment is confirmed.</p>
          <div className="acts"><a className="wh-btn wh-btn-g" href={enrolHref}>Enroll now →</a><Link className="wh-btn wh-btn-glass" to={backHref}>{backLabel}</Link></div>
        </section>
      </div>
    </WahaPage>
  )
}
