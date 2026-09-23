// /cart — "Your study list" (mockups/cart-waha.html), step 1 of enrolment. The enrolment cart
// (data/commerceCart.js, the same list the course pages' "Add to study list" fills) priced from the
// live Talweeh commerce catalog: each course with its enrolment option, remove with undo, a summary
// with the multi-course saving from the Talweeh quote, and related courses that can be added here.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { fetchCheckoutCatalog, money, optionBillingLabel, requestCommerceQuote } from '../data/commerceCheckout'
import { addCommerceCartOption, clearCommerceCart, readCommerceCartItems, readCommerceHandoff, rememberCommerceHandoff, removeCommerceCartOption, subscribeCommerceCart } from '../data/commerceCart'
import { Nudge, Recommendations, Steps, categoryLabel, courseUrl, lessonsOf, pct, posterOf, recommend } from '../commerce/commerceKit'
import '../commerce-waha-v1.css'

export default function CartWahaPage() {
  useDocumentMeta({ title: 'Your study list' })
  const [params] = useSearchParams()
  const [items, setItems] = useState(() => readCommerceCartItems())
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [promotion, setPromotion] = useState(null)
  const [shown, setShown] = useState(3)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const queryHandoff = String(params.get('handoff') || '').trim()
  const handoff = queryHandoff || readCommerceHandoff()
  useEffect(() => { if (queryHandoff) rememberCommerceHandoff(queryHandoff) }, [queryHandoff])
  useEffect(() => subscribeCommerceCart(setItems), [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    const controller = new AbortController()
    fetchCheckoutCatalog({ signal: controller.signal })
      .then(setCatalog)
      .catch((e) => { if (e?.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Current course catalogue could not be loaded.') })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const optionMap = useMemo(() => {
    const map = new Map()
    for (const course of catalog) for (const option of course.options || []) map.set(String(option.id), { course, option })
    return map
  }, [catalog])
  const rows = useMemo(() => items.map((item) => optionMap.get(String(item.optionId))).filter(Boolean), [items, optionMap])
  const optionIds = rows.map((r) => String(r.option.id))
  const idKey = optionIds.join('|')

  // Multi-course saving for the current list, from the same Talweeh quote the checkout uses.
  useEffect(() => {
    if (!optionIds.length) { setPromotion(null); return undefined }
    let active = true
    requestCommerceQuote({ optionIds, handoff }).then((p) => { if (active) setPromotion(p) }).catch(() => { if (active) setPromotion(null) })
    return () => { active = false }
  }, [idKey, handoff]) // eslint-disable-line react-hooks/exhaustive-deps

  const subscriptions = rows.filter((r) => r.option.billing_type === 'subscription')
  const currency = String(rows[0]?.option?.currency || 'USD').toUpperCase()
  const subtotal = rows.reduce((s, r) => s + Number(r.option.amount_cents || 0), 0)
  const percent = Number(promotion?.applied?.percent_off || 0)
  const savings = Math.round(subtotal * percent / 100)
  const blocked = subscriptions.length > 1
  const checkoutQuery = new URLSearchParams()
  if (rows.length) checkoutQuery.set('options', optionIds.join(','))
  if (handoff) checkoutQuery.set('handoff', handoff)

  const pool = useMemo(() => (rows.length ? recommend(catalog, rows.map((r) => r.course), { currency, hasSubscription: subscriptions.length > 0 }) : []), [catalog, idKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (message, restore) => {
    setToast({ message, restore })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }
  const remove = (row) => { setItems(removeCommerceCartOption(row.option.id)); flash(`Removed ${row.course.title}`, [row]) }
  const clear = () => { const was = rows; clearCommerceCart(); setItems([]); flash('Study list cleared', was) }
  const undo = () => { toast?.restore?.forEach((r) => addCommerceCartOption(r.option.id, r.course.checkout_slug)); setItems(readCommerceCartItems()); setToast(null) }
  const add = (entry) => { addCommerceCartOption(entry.option.id, entry.course.checkout_slug); setItems(readCommerceCartItems()) }

  let body
  if (loading) body = <div className="ew-status">Loading your study list…</div>
  else if (error) body = <div className="ew-empty"><h2>Study list unavailable</h2><p>{error}</p><Link className="wh-btn wh-btn-g" to="/courses">Browse courses</Link></div>
  else if (!rows.length) body = (
    <div className="ew-empty">
      <span className="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5C6.7 4.8 9 5.3 12 7v12c-3-1.7-5.3-2.2-8-1.5zM20 5.5c-2.7-.7-5-.2-8 1.5v12c3-1.7 5.3-2.2 8-1.5z" /></svg></span>
      <h2>Your study list is empty.</h2>
      <p>Choose a paid course and select “Add to study list” — it will wait here until you’re ready to enrol.</p>
      <Link className="wh-btn wh-btn-g" to="/courses">Browse courses →</Link>
    </div>
  )
  else body = (
    <>
      <section className="ew-lay">
        <div>
          <div className="ew-list-h"><span>{rows.length} course{rows.length === 1 ? '' : 's'} · {money(subtotal, currency)}</span><button type="button" onClick={clear}>Clear study list</button></div>
          <div className="ew-items">
            {rows.map((row) => {
              const { course, option } = row, poster = posterOf(course), lessons = lessonsOf(course)
              return (
                <article className="ew-item" key={option.id}>
                  <Link to={courseUrl(course)} className="ph">{poster ? <img src={poster} alt={`${course.title} course poster`} /> : <span aria-hidden="true">ت</span>}</Link>
                  <div>
                    <small>{categoryLabel(course) || 'Course'}</small>
                    <h3><Link to={courseUrl(course)}>{course.title}</Link></h3>
                    <span className="who">{course.instructor_name || 'Talweeh Academy'}{lessons ? ` · ${lessons} lessons` : ''}</span>
                    <span className="plan">{option.display_name || 'Enrollment'} <em>· {optionBillingLabel(option)}</em></span>
                  </div>
                  <div className="end"><strong>{money(option.amount_cents, option.currency)}</strong><button type="button" className="rm" onClick={() => remove(row)}>Remove</button></div>
                </article>
              )
            })}
          </div>
          <Nudge promotion={promotion} count={rows.length} />
        </div>
        <aside className="ew-sum wh-glass" aria-label="Order summary">
          <div><span className="cw-kicker">Order summary</span><h2>Due today</h2></div>
          <div className="lines">
            {rows.map(({ course, option }) => <div className="ln" key={option.id}><span>{course.title}</span><b>{money(option.amount_cents, option.currency)}</b></div>)}
            {percent > 0 && <div className="ln save"><span>Multi-course saving · {pct(percent)}%</span><b>−{money(savings, currency)}</b></div>}
          </div>
          <div className="due"><small>Estimated total</small><strong>{money(subtotal - savings, currency)}</strong></div>
          {blocked && <p className="warn">Subscription courses must currently be checked out one at a time. Remove one subscription before continuing.</p>}
          {blocked
            ? <span className="wh-btn wh-btn-g is-disabled" aria-disabled="true">Proceed to secure checkout →</span>
            : <Link className="wh-btn wh-btn-g" to={`/checkout?${checkoutQuery.toString()}`}>Proceed to secure checkout →</Link>}
          <Link className="wh-btn wh-btn-glass" to="/courses">Continue browsing courses</Link>
          <div className="trust"><span>🔒 Secure Stripe payment</span><span>✓ Savings applied automatically</span></div>
          <p className="note">Payment is completed securely with Stripe. Promo codes can be added at checkout. Course access is activated through your Talweeh portal account.</p>
        </aside>
      </section>
      <Recommendations
        pool={pool} shown={shown} onMore={() => setShown((n) => n + 3)}
        kicker="Add courses & save"
        title={bundleTitle(promotion, rows.length)}
        text="Chosen from the same subjects and teachers as your list. Add one here and it joins your study list."
        label="Add to study list" isAdded={() => false} onAdd={add}
      />
    </>
  )

  return (
    <WahaPage className="cw ew" overlays={
      <div className={`ew-toast${toast ? ' on' : ''}`} role="status" aria-live="polite"><span>{toast?.message}</span>{toast?.restore && <button type="button" onClick={undo}>Undo</button>}</div>
    }>
      <div className="wh-wrap">
        <p className="cw-crumbs"><Link to="/courses">Courses</Link> / Study list</p>
        <section className="ew-head">
          <div><span className="cw-kicker">Enrollment cart</span><h1>Your study list</h1><p>Review the courses you’ve chosen, then continue to secure checkout. You can keep adding courses — enrolling in several together saves more.</p></div>
          <Steps at={0} />
        </section>
        {body}
      </div>
    </WahaPage>
  )
}

function bundleTitle(promotion, count) {
  const next = promotion?.bundle?.next_percent_off
  return count && next ? `Often studied together — save ${pct(next)}%` : 'Often studied together'
}
