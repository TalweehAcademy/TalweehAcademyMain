/* eslint-disable react/prop-types */
// "Study list" — the enrolment cart, presented in study terms. Adding a paid course opens a
// confirmation pop-up with the whole list, then Proceed to enrolment (/checkout) or Keep browsing.
// Same storage as /cart and /checkout (data/commerceCart.js).
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addCommerceCartOption, removeCommerceCartOption } from '../data/commerceCart'
import { money, optionBillingLabel } from '../data/commerceCheckout'
import { resolveStudyList, useCourseCatalog, useStudyList } from './courseKit'

const OPEN_EVENT = 'talweeh-study-list-open'

// Add an option to the list and show the confirmation.
export function addToStudyList(course, option) {
  if (!option?.id) return
  addCommerceCartOption(option.id, course.checkoutSlug || course.slug)
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { added: course.slug, optionId: String(option.id) } }))
}
export const openStudyList = () => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: {} }))

const BookIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.7 4.8 9 5.3 12 7v12c-3-1.7-5.3-2.2-8-1.5zM20 5.5c-2.7-.7-5-.2-8 1.5v12c3-1.7 5.3-2.2 8-1.5z" /></svg>

export function StudyListButton({ className = '', onClick }) {
  const n = useStudyList().length
  return (
    <button type="button" className={`cw-sl-pill ${className}`.trim()} onClick={() => { onClick?.(); openStudyList() }} aria-label={`Study list, ${n} course${n === 1 ? '' : 's'}`}>
      <BookIcon /><span>Study list</span>{n > 0 && <b>{n}</b>}
    </button>
  )
}

function Dialog({ added, optionId, onClose }) {
  const items = useStudyList()
  const { courses } = useCourseCatalog()
  const rows = resolveStudyList(items, courses)
  const just = added && rows.find((r) => r.optionId === optionId)
  const currency = rows.find((r) => r.option)?.option.currency || 'USD'
  const total = rows.reduce((n, r) => n + Number(r.option?.amount_cents || 0), 0)
  const subscriptions = rows.filter((r) => r.option && r.option.billing_type !== 'one_time').length
  // Empty list: suggest three paid courses with posters, the fuller ones first.
  const suggestions = rows.length ? [] : courses.filter((c) => !c.free && c.poster).sort((a, b) => (b.lessonCount || 0) - (a.lessonCount || 0)).slice(0, 3)
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="cw-sl open">
      <div className="cw-sl-ov" onClick={onClose} aria-hidden="true" />
      <div className="cw-sl-box" role="dialog" aria-modal="true" aria-labelledby="cw-sl-h">
        <button type="button" className="cw-sl-x" onClick={onClose} aria-label="Close">✕</button>
        {just?.course
          ? <div className="cw-sl-added"><span className="cw-sl-tick">✓</span><div><span className="cw-kicker">Added to your study list</span><h3 id="cw-sl-h">{just.course.title}</h3><p>{just.course.instructor}{just.option ? ` · ${just.option.display_name || optionBillingLabel(just.option)} · ${money(just.option.amount_cents, just.option.currency)}` : ''}</p></div></div>
          : <><span className="cw-kicker">Your study list</span><h3 id="cw-sl-h">{rows.length ? `${rows.length} course${rows.length === 1 ? '' : 's'} ready to enrol` : 'Your study list is empty'}</h3></>}
        {rows.length > 0 ? <>
          <ul className="cw-sl-items">
            {rows.map((r) => (
              <li key={r.optionId}>
                {r.course?.poster ? <img src={r.course.poster} alt="" /> : <span className="ph" />}
                <span><strong>{r.course?.title || 'Course'}</strong><small>{r.option ? `${r.option.display_name || ''}${r.option.display_name ? ' · ' : ''}${optionBillingLabel(r.option)}` : 'Price shown at checkout'}</small></span>
                <b>{r.option ? money(r.option.amount_cents, r.option.currency) : ''}</b>
                <button type="button" onClick={() => removeCommerceCartOption(r.optionId)} aria-label={`Remove ${r.course?.title || 'course'}`}>✕</button>
              </li>
            ))}
          </ul>
          {total > 0 && <div className="cw-sl-total"><span>Due at enrolment</span><b>{money(total, currency)}</b></div>}
          {subscriptions > 1 && <p className="cw-sl-warn">Only one monthly plan can be checked out at a time — remove one, or finish them separately.</p>}
        </> : <>
          <p className="cw-sl-empty">Nothing here yet. Open any paid course and choose “Add to study list” — it will wait here until you’re ready to enrol.</p>
          {suggestions.length > 0 && <>
            <span className="cw-kicker cw-sl-sugk">A few courses to start with</span>
            <ul className="cw-sl-items cw-sl-sug">
              {suggestions.map((c) => (
                <li key={c.slug}>
                  <Link to={`/courses/${c.slug}`} onClick={onClose} className="cw-sl-sugl">
                    {c.poster ? <img src={c.poster} alt="" /> : <span className="ph" />}
                    <span><strong>{c.title}</strong><small>{c.instructor}{c.lessonCount ? ` · ${c.lessonCount} lessons` : ''}</small></span>
                    <b>{c.free ? 'Free' : c.priceCents ? money(c.priceCents, c.currency) : ''}</b>
                  </Link>
                </li>
              ))}
            </ul>
          </>}
        </>}
        <div className="cw-sl-acts">
          {rows.length > 0 && <Link className="wh-btn wh-btn-g" to="/cart" onClick={onClose}>Proceed to enrolment →</Link>}
          <Link className={`wh-btn ${rows.length ? 'wh-btn-glass' : 'wh-btn-g'}`} to="/courses" onClick={onClose}>{rows.length ? 'Keep browsing courses' : 'Browse all courses →'}</Link>
        </div>
        <p className="cw-sl-note">Enrolment completes at checkout; lessons open in your Student Portal.</p>
      </div>
    </div>
  )
}

// Mounted once by the page shell; renders only while open.
export function StudyListHost() {
  const [state, setState] = useState(null)
  useEffect(() => {
    const open = (e) => setState(e.detail || {})
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [])
  const close = useCallback(() => setState(null), [])
  return state ? <Dialog added={state.added} optionId={state.optionId} onClose={close} /> : null
}
