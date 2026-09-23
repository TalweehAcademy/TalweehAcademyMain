// /checkout — "Secure checkout" (mockups/checkout-waha.html), step 2 of enrolment. The order on paper
// (courses, the multi-course saving from the Talweeh quote, a promo code with the optional student
// email, totals) beside the payment panel with Stripe's embedded checkout, then "Add courses & save".
// The commerce behaviour is the previous CheckoutExperience's, unchanged: the quote is re-checked on
// every change, and the Stripe session is created with the same option ids, email, code and handoff.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { fetchCheckoutCatalog, money, optionBillingLabel, requestCommerceCheckout, requestCommerceQuote } from '../data/commerceCheckout'
import { commerceCartOptionIds, readCommerceHandoff, rememberCommerceHandoff } from '../data/commerceCart'
import { Nudge, Recommendations, Steps, pct, posterOf, recommend } from '../commerce/commerceKit'
import '../commerce-waha-v1.css'

const publishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim()
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

const normalizeOptions = (value) => Array.from(new Set(String(value || '').split(',').map((x) => x.trim()).filter(Boolean))).slice(0, 20)
const identityFrom = (payload) => ({
  authenticated: Boolean(payload.checkout_identity.authenticated),
  email: String(payload.checkout_identity.email || ''),
  ownedCheckoutSlugs: Array.isArray(payload.checkout_identity.owned_checkout_slugs) ? payload.checkout_identity.owned_checkout_slugs.map(String) : [],
})

export default function CheckoutWahaPage() {
  useDocumentMeta({ title: 'Secure checkout' })
  const [params] = useSearchParams()
  const queryHandoff = String(params.get('handoff') || '').trim().slice(0, 4096)
  const initialHandoff = queryHandoff || readCommerceHandoff()
  useEffect(() => { if (queryHandoff) rememberCommerceHandoff(queryHandoff) }, [queryHandoff])
  const initialOptionIds = useMemo(() => {
    const fromQuery = normalizeOptions(params.get('options'))
    return fromQuery.length ? fromQuery : commerceCartOptionIds()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [catalog, setCatalog] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => Array.from(new Set(initialOptionIds.map(String))))
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [promotion, setPromotion] = useState(null)
  const [promotionError, setPromotionError] = useState('')
  const [promotionLoading, setPromotionLoading] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [shown, setShown] = useState(3)
  const [identity, setIdentity] = useState(() => ({ authenticated: Boolean(initialHandoff), email: '', ownedCheckoutSlugs: [] }))
  const [ownershipResolved, setOwnershipResolved] = useState(() => !initialHandoff)

  useEffect(() => {
    const controller = new AbortController()
    fetchCheckoutCatalog({ signal: controller.signal })
      .then(setCatalog)
      .catch((e) => { if (e?.name !== 'AbortError') setCatalogError(e instanceof Error ? e.message : 'Current course catalogue could not be loaded.') })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const optionMap = useMemo(() => {
    const map = new Map()
    for (const course of catalog) for (const option of course.options || []) map.set(String(option.id), { course, option })
    return map
  }, [catalog])
  const rows = useMemo(() => selectedIds.map((id) => optionMap.get(String(id))).filter(Boolean), [selectedIds, optionMap])
  useEffect(() => {
    if (!loading && catalog.length && rows.length !== selectedIds.length) setSelectedIds(rows.map((r) => String(r.option.id)))
  }, [loading, catalog.length, rows, selectedIds.length])

  const selectedCourses = useMemo(() => rows.map((r) => r.course), [rows])
  const hasSubscription = rows.some((r) => r.option.billing_type === 'subscription')
  const currency = String(rows[0]?.option?.currency || 'USD').toUpperCase()
  const subtotal = rows.reduce((s, r) => s + Number(r.option.amount_cents || 0), 0)
  const selectionKey = selectedIds.join('|')

  const refreshPromotion = useCallback(async (email = studentEmail, code = couponCode) => {
    if (!selectedIds.length) return null
    setPromotionLoading(true)
    setPromotionError('')
    try {
      const payload = await requestCommerceQuote({ optionIds: selectedIds, email, couponCode: code, handoff: initialHandoff })
      setPromotion(payload)
      if (payload?.checkout_identity) { setIdentity(identityFrom(payload)); setOwnershipResolved(true) }
      return payload
    } catch (e) {
      setPromotionError(e instanceof Error ? e.message : 'Savings could not be checked.')
      return null
    } finally {
      setPromotionLoading(false)
    }
  }, [selectionKey, studentEmail, couponCode, initialHandoff]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (rows.length) refreshPromotion(studentEmail, couponCode) }, [selectionKey, initialHandoff]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedIds.length) return
    const q = new URLSearchParams()
    q.set('options', selectedIds.join(','))
    if (initialHandoff) q.set('handoff', initialHandoff)
    window.history.replaceState(window.history.state, '', `/checkout?${q.toString()}`)
  }, [selectionKey, initialHandoff]) // eslint-disable-line react-hooks/exhaustive-deps

  const percent = Number(promotion?.applied?.percent_off || 0)
  const savings = Math.round(subtotal * percent / 100)
  const total = Math.max(0, subtotal - savings)
  const sessionKey = `${selectionKey}|${studentEmail}|${couponCode}|${initialHandoff ? 'handoff' : 'guest'}`
  const ownedKey = (identity.ownedCheckoutSlugs || []).join('|')
  const sources = Array.isArray(promotion?.applied?.sources) ? promotion.applied.sources : []

  const pool = useMemo(() => {
    if (!rows.length || (initialHandoff && !ownershipResolved)) return []
    return recommend(catalog, selectedCourses, { currency, hasSubscription, owned: identity.ownedCheckoutSlugs })
  }, [catalog, rows.length, selectedCourses, currency, hasSubscription, initialHandoff, ownershipResolved, ownedKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setShown(3), [selectionKey, currency, hasSubscription])

  const fetchClientSecret = useCallback(async () => {
    setCheckoutError('')
    try {
      const payload = await requestCommerceCheckout({ optionIds: selectedIds, email: studentEmail, couponCode, handoff: initialHandoff })
      if (payload?.promotion?.valid) setPromotion(payload.promotion)
      if (payload?.checkout_identity) { setIdentity(identityFrom(payload)); setOwnershipResolved(true) }
      return payload.clientSecret
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Secure payment could not be loaded.')
      throw e
    }
  }, [sessionKey, initialHandoff]) // eslint-disable-line react-hooks/exhaustive-deps

  const addRecommendation = (entry) => setSelectedIds((cur) => Array.from(new Set([...cur, String(entry.option.id)])))
  const removeOption = (id) => setSelectedIds((cur) => cur.filter((x) => x !== String(id)))
  async function applyCoupon(event) {
    event.preventDefault()
    const code = couponInput.trim().toUpperCase()
    setCouponCode(code)
    await refreshPromotion(studentEmail.trim().toLowerCase(), code)
  }

  let body
  if (loading) body = <div className="ew-status">Preparing your Talweeh checkout…</div>
  else if (catalogError) body = <div className="ew-empty"><h2>Checkout unavailable</h2><p>{catalogError}</p><Link className="wh-btn wh-btn-g" to="/courses">Return to courses</Link></div>
  else if (!rows.length) body = <div className="ew-empty"><h2>No courses selected</h2><p>Choose a course or review your study list before opening checkout.</p><Link className="wh-btn wh-btn-g" to="/courses">Browse courses →</Link></div>
  else body = (
    <>
      <section className="ew-cgrid">
        <div className="ew-order">
          <div className="ph"><div><span className="cw-kicker">Your courses</span><h2>Order summary</h2></div><Link to="/cart">Edit study list</Link></div>
          {rows.map(({ course, option }) => {
            const poster = posterOf(course)
            return (
              <div className="ew-orow" key={option.id}>
                {poster ? <img src={poster} alt="" /> : <span className="ph0" aria-hidden="true">ت</span>}
                <div><strong>{course.title}</strong><small>{course.instructor_name || 'Talweeh Academy'} · {option.display_name} · {optionBillingLabel(option)}</small></div>
                <div className="end"><b>{money(option.amount_cents, option.currency)}</b>{rows.length > 1 && <button type="button" onClick={() => removeOption(option.id)}>Remove</button>}</div>
              </div>
            )
          })}
          <div className="ew-save">
            <Nudge promotion={promotion} count={rows.length} />
            <details className={`ew-promo${promotion?.coupon?.applied ? ' ok' : ''}`}>
              <summary>
                <div><small>Promo code</small><strong>{promotion?.coupon?.applied ? `${promotion.coupon.code} applied` : 'Have a promo code?'}</strong></div>
                <em>{promotion?.coupon?.applied ? `${pct(promotion.coupon.percent_off)}% off` : 'Add code ⌄'}</em>
              </summary>
              <p>{promotion?.coupon?.message || 'Enter a Talweeh promo code. Student-restricted codes may also need the matching account email.'}</p>
              <form onSubmit={applyCoupon}>
                <input className="ew-fld" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Student email (optional)" autoComplete="email" aria-label="Student email (optional)" />
                <input className="ew-fld" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Promo code" maxLength={40} aria-label="Promo code" />
                <button className="wh-btn wh-btn-g ew-btn-sm" type="submit">Apply</button>
              </form>
            </details>
            {promotionLoading && <p className="ew-checking">Checking savings…</p>}
            {promotionError && <div className="ew-error" role="alert">{promotionError}</div>}
          </div>
          <div className="ew-totals">
            <div><span>Subtotal</span><strong>{money(subtotal, currency)}</strong></div>
            {percent > 0 && <div className="sv"><span>{sources.includes('coupon') ? 'Promotion' : 'Multi-course saving'} · {pct(percent)}%</span><strong>−{money(savings, currency)}</strong></div>}
            <div className="tt"><span>Estimated total</span><strong>{money(total, currency)}</strong></div>
            <small>Stripe shows the final payment amount. Talweeh confirms your savings again when the payment session is created.</small>
          </div>
        </div>

        <aside className="ew-pay wh-glass" aria-label="Payment">
          <div><span className="cw-kicker">Payment</span><h2>Pay securely</h2></div>
          {!publishableKey
            ? <div className="ew-error" role="alert"><strong>Stripe publishable key is not configured.</strong> Add <code>VITE_STRIPE_PUBLISHABLE_KEY=pk_…</code> to the public-site <code>.env.local</code>, then restart Vite.</div>
            : <div className="ew-stripe" key={sessionKey}>
                {checkoutError && <div className="ew-error" role="alert">{checkoutError}</div>}
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>}
          <div className="ew-secure">
            <span><b>✓</b>Your card details go directly to Stripe; Talweeh never sees them.</span>
            <span><b>✓</b>{identity.authenticated
              ? `Your Talweeh portal account${identity.email ? ` (${identity.email})` : ''} is attached securely to this checkout.`
              : 'After payment, you continue to the Talweeh academic portal to activate access.'}</span>
          </div>
        </aside>
      </section>
      <Recommendations
        pool={pool} shown={shown} onMore={() => setShown((n) => Math.min(n + 3, pool.length))}
        kicker="Add courses & save"
        title={promotion?.bundle?.next_percent_off ? `Add another course and save ${pct(promotion.bundle.next_percent_off)}%` : promotion?.bundle?.eligible ? 'Add another course and keep saving' : 'Continue building your studies'}
        text="Enroll in related courses together and the multi-course saving is recalculated automatically."
        label="Add to checkout" isAdded={(e) => selectedIds.includes(String(e.option.id))} onAdd={addRecommendation}
      />
    </>
  )

  return (
    <WahaPage className="cw ew">
      <div className="wh-wrap">
        <p className="cw-crumbs"><Link to="/courses">Courses</Link> / <Link to="/cart">Study list</Link> / Secure checkout</p>
        <section className="ew-head">
          <div><span className="cw-kicker">Secure enrollment</span><h1>Complete your enrollment</h1><p>Course savings are calculated by Talweeh; your payment details go directly to Stripe.</p></div>
          <Steps at={1} />
        </section>
        {body}
      </div>
    </WahaPage>
  )
}
