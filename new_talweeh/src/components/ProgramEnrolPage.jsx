/* eslint-disable react/prop-types */
// /arabic/enroll and /hadith-specialization/enroll: a programme's payment options (pay in full, monthly) from
// the live Commerce catalog (its `programs` list). Each option opens this site's checkout with that option,
// the same checkout a paid course uses: it asks for the email, says if it is already enrolled, and finishes
// the account and payment. Styles: program-learning-v1.css (pe-*).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from './WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { fetchLiveCommerceCatalog, peekLiveCommerceCatalog } from '../data/liveCommerceCatalog'
import { warmProgramCheckout } from '../data/programEnrol'
import { money, optionBillingLabel } from '../data/commerceCheckout'
import '../program-learning-v1.css'

function optionsFrom(payload, programKey) {
  if (!payload) return null
  const program = (Array.isArray(payload.programs) ? payload.programs : []).find((p) => p.program_key === programKey)
  return Array.isArray(program?.purchase_options) ? program.purchase_options : []
}

export default function ProgramEnrolPage({ programKey, title, kicker, lead, included, backHref, backLabel, learningHref }) {
  useDocumentMeta({ title: `Enroll · ${title}`, description: lead })
  // A catalog already fetched on the programme page paints the options at once; a fresh copy follows.
  const [state, setState] = useState(() => {
    const cached = optionsFrom(peekLiveCommerceCatalog(), programKey)
    return cached ? { loading: false, options: cached, error: '' } : { loading: true, options: [], error: '' }
  })
  useEffect(() => {
    let active = true
    warmProgramCheckout()
    fetchLiveCommerceCatalog()
      .then((payload) => { if (active) setState({ loading: false, options: optionsFrom(payload, programKey) || [], error: '' }) })
      .catch(() => { if (active) setState((current) => (current.options.length ? current : { loading: false, options: [], error: 'Enrollment options could not be loaded. Please refresh and try again.' })) })
    return () => { active = false }
  }, [programKey])

  return (
    <WahaPage className="cw pl">
      <div className="wh-wrap">
        <section className="pl-hero">
          <Link className="pl-back" to={backHref}>← {backLabel}</Link>
          <span className="cw-kicker">{kicker}</span>
          <h1>Enroll in the {title}</h1>
          <p className="lead">{lead}</p>
        </section>

        <section className="pe-offers" aria-busy={state.loading}>
          {state.loading ? <p className="cw-empty">Loading enrollment options…</p>
            : state.error ? <p className="cw-empty">{state.error}</p>
            : state.options.length ? state.options.map((option) => {
              const full = option.billing_type === 'one_time'
              return (
                <article key={option.id} className={`pe-offer cw-card${full ? ' is-full' : ''}`}>
                  <header><span className="cw-kicker">{option.display_name || (full ? 'Pay in full' : 'Monthly')}</span>{full ? <span className="pe-badge">Best value</span> : null}</header>
                  <div className="pe-price"><b>{money(option.amount_cents, option.currency)}</b><small>{full ? 'one payment' : `/ ${option.billing_interval || 'month'}`}</small></div>
                  <p className="pe-sub">{option.display_subtitle || optionBillingLabel(option)}</p>
                  <ul className="pe-list">{included.map((line) => <li key={line}>{line}</li>)}</ul>
                  <Link className={`wh-btn ${full ? 'wh-btn-g' : 'wh-btn-glass'} pe-cta`} to={`/checkout?options=${encodeURIComponent(option.id)}`}>{full ? 'Pay in full' : 'Pay monthly'} →</Link>
                </article>
              )
            }) : <p className="cw-empty">Online enrollment for this programme opens soon. For enrollment now, contact info@talweehacademy.com.</p>}
        </section>

        <p className="pe-note">Payment is handled securely by Stripe. At checkout, enter your email: if you already have a Talweeh account the programme is added to it, otherwise your account is created. Lessons open in the Student Portal as soon as payment is confirmed.{learningHref ? <> <Link to={learningHref}>See the whole plan month by month →</Link></> : null}</p>
      </div>
    </WahaPage>
  )
}
