/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  fetchCheckoutCatalog,
  money,
  optionBillingLabel,
  requestCommerceCheckout,
  requestCommerceQuote,
} from '../data/commerceCheckout'

const publishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim()
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

function firstCompatibleOption(course, currency, hasSubscription) {
  const options = Array.isArray(course?.options) ? course.options : []
  const candidates = options.filter((option) => {
    if (String(option.currency || 'USD').toUpperCase() !== currency) return false
    if (hasSubscription && option.billing_type === 'subscription') return false
    return true
  })
  return candidates.find((option) => option.billing_type === 'one_time') || candidates[0] || null
}

function overlap(left = [], right = []) {
  const set = new Set(left.map((item) => String(item).toLowerCase()))
  return right.reduce((count, item) => count + Number(set.has(String(item).toLowerCase())), 0)
}

function recommendationScore(course, selectedCourses) {
  let score = Number(course.featured ? 2 : 0)
  for (const selected of selectedCourses) {
    score += overlap(course.categories || [], selected.categories || []) * 8
    if (course.instructor_name && course.instructor_name === selected.instructor_name) score += 5
    if (course.level && course.level === selected.level) score += 3
    if (course.language && course.language === selected.language) score += 1
  }
  score += Math.min(3, Math.log10(Math.max(1, Number(course.learner_count || 0) + 1)))
  return score
}

function CourseThumb({ course }) {
  const poster = String(course?.poster_url || '')
  return (
    <div className="checkout-course-thumb">
      {poster
        ? <img src={poster} alt="" loading="lazy" decoding="async" />
        : <span aria-hidden="true">ت</span>}
    </div>
  )
}

function pct(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function coursePublicSlug(course) {
  return String(course?.public_slug || course?.course_slug || course?.checkout_slug || '').trim()
}

export default function CheckoutExperience({ initialOptionIds = [], initialHandoff = '' }) {
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
  const [visibleRecommendationCount, setVisibleRecommendationCount] = useState(3)
  const [checkoutIdentity, setCheckoutIdentity] = useState(() => ({
    authenticated: Boolean(initialHandoff),
    email: '',
    ownedCheckoutSlugs: [],
  }))
  const [ownershipResolved, setOwnershipResolved] = useState(() => !initialHandoff)

  useEffect(() => {
    const controller = new AbortController()
    fetchCheckoutCatalog({ signal: controller.signal })
      .then(setCatalog)
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setCatalogError(error instanceof Error ? error.message : 'Current course catalogue could not be loaded.')
        }
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const optionMap = useMemo(() => {
    const map = new Map()
    for (const course of catalog) {
      for (const option of course.options || []) {
        map.set(String(option.id), { course, option })
      }
    }
    return map
  }, [catalog])

  const rows = useMemo(
    () => selectedIds.map((id) => optionMap.get(String(id))).filter(Boolean),
    [selectedIds, optionMap],
  )

  useEffect(() => {
    if (!loading && catalog.length && rows.length !== selectedIds.length) {
      setSelectedIds(rows.map((row) => String(row.option.id)))
    }
  }, [loading, catalog.length, rows, selectedIds.length])

  const selectedCourses = useMemo(() => rows.map((row) => row.course), [rows])
  const hasSubscription = rows.some((row) => row.option.billing_type === 'subscription')
  const currency = String(rows[0]?.option?.currency || 'USD').toUpperCase()
  const subtotal = rows.reduce((sum, row) => sum + Number(row.option.amount_cents || 0), 0)
  const selectionKey = selectedIds.join('|')

  const refreshPromotion = useCallback(async (email = studentEmail, code = couponCode) => {
    if (!selectedIds.length) return null
    setPromotionLoading(true)
    setPromotionError('')
    try {
      const payload = await requestCommerceQuote({
        optionIds: selectedIds,
        email,
        couponCode: code,
        handoff: initialHandoff,
      })
      setPromotion(payload)
      if (payload?.checkout_identity) {
        setCheckoutIdentity({
          authenticated: Boolean(payload.checkout_identity.authenticated),
          email: String(payload.checkout_identity.email || ''),
          ownedCheckoutSlugs: Array.isArray(payload.checkout_identity.owned_checkout_slugs)
            ? payload.checkout_identity.owned_checkout_slugs.map(String)
            : [],
        })
        setOwnershipResolved(true)
      }
      return payload
    } catch (error) {
      setPromotionError(error instanceof Error ? error.message : 'Savings could not be checked.')
      return null
    } finally {
      setPromotionLoading(false)
    }
  }, [selectionKey, studentEmail, couponCode, initialHandoff])

  useEffect(() => {
    if (rows.length) refreshPromotion(studentEmail, couponCode)
  }, [selectionKey, initialHandoff])

  useEffect(() => {
    if (!selectedIds.length || typeof window === 'undefined') return
    const params = new URLSearchParams()
    params.set('options', selectedIds.join(','))
    if (initialHandoff) params.set('handoff', initialHandoff)
    window.history.replaceState(window.history.state, '', `/checkout?${params.toString()}`)
  }, [selectionKey, initialHandoff])

  const promotionPercent = Number(promotion?.applied?.percent_off || 0)
  const savings = Math.round(subtotal * promotionPercent / 100)
  const estimatedTotal = Math.max(0, subtotal - savings)
  const sessionKey = `${selectionKey}|${studentEmail}|${couponCode}|${initialHandoff ? 'handoff' : 'guest'}`

  const ownedSlugKey = (checkoutIdentity.ownedCheckoutSlugs || []).join('|')
  const recommendationPool = useMemo(() => {
    if (!rows.length) return []
    if (initialHandoff && !ownershipResolved) return []

    const selectedSlugs = new Set(selectedCourses.map((course) => course.checkout_slug))
    const ownedSlugs = new Set(checkoutIdentity.ownedCheckoutSlugs || [])
    return catalog
      .filter((course) => !course.program && !selectedSlugs.has(course.checkout_slug) && !ownedSlugs.has(course.checkout_slug))
      .map((course) => ({
        course,
        option: firstCompatibleOption(course, currency, hasSubscription),
        score: recommendationScore(course, selectedCourses),
      }))
      .filter((entry) => entry.option && entry.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.course.learner_count || 0) - Number(a.course.learner_count || 0))
  }, [catalog, rows.length, selectedCourses, currency, hasSubscription, initialHandoff, ownershipResolved, ownedSlugKey])

  useEffect(() => setVisibleRecommendationCount(3), [selectionKey, currency, hasSubscription])

  const recommendations = useMemo(
    () => recommendationPool.slice(0, visibleRecommendationCount),
    [recommendationPool, visibleRecommendationCount],
  )
  const hasMoreRecommendations = visibleRecommendationCount < recommendationPool.length

  const fetchClientSecret = useCallback(async () => {
    setCheckoutError('')
    try {
      const payload = await requestCommerceCheckout({
        optionIds: selectedIds,
        email: studentEmail,
        couponCode,
        handoff: initialHandoff,
      })
      if (payload?.promotion?.valid) setPromotion(payload.promotion)
      if (payload?.checkout_identity) {
        setCheckoutIdentity({
          authenticated: Boolean(payload.checkout_identity.authenticated),
          email: String(payload.checkout_identity.email || ''),
          ownedCheckoutSlugs: Array.isArray(payload.checkout_identity.owned_checkout_slugs)
            ? payload.checkout_identity.owned_checkout_slugs.map(String)
            : [],
        })
        setOwnershipResolved(true)
      }
      return payload.clientSecret
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Secure payment could not be loaded.'
      setCheckoutError(message)
      throw error
    }
  }, [sessionKey, initialHandoff])

  function addRecommendation(entry) {
    setSelectedIds((current) => Array.from(new Set([...current, String(entry.option.id)])))
  }

  function removeOption(optionId) {
    setSelectedIds((current) => current.filter((id) => id !== String(optionId)))
  }

  async function applyCoupon(event) {
    event.preventDefault()
    const code = couponInput.trim().toUpperCase()
    setCouponCode(code)
    await refreshPromotion(studentEmail.trim().toLowerCase(), code)
  }

  if (loading) {
    return <div className="checkout-loading-card">Preparing your Talweeh checkout…</div>
  }

  if (catalogError) {
    return <div className="checkout-error-card"><h1>Checkout unavailable</h1><p>{catalogError}</p><Link to="/courses">Return to courses</Link></div>
  }

  if (!rows.length) {
    return <div className="checkout-error-card"><h1>No courses selected</h1><p>Choose a course or review your cart before opening checkout.</p><Link to="/courses">Browse courses</Link></div>
  }

  const nextTier = promotion?.bundle?.next_course_count && promotion?.bundle?.next_percent_off
    ? { count: Number(promotion.bundle.next_course_count), percent: Number(promotion.bundle.next_percent_off) }
    : null
  const coursesToNext = nextTier ? Math.max(1, nextTier.count - rows.length) : 0
  const appliedSources = Array.isArray(promotion?.applied?.sources) ? promotion.applied.sources : []

  return (
    <div className="checkout-page-wrap">
      <nav className="checkout-breadcrumb" aria-label="Breadcrumb">
        <Link to="/courses">Courses</Link><span>›</span><Link to="/cart">Cart</Link><span>›</span><strong>Secure checkout</strong>
      </nav>

      <header className="checkout-page-heading">
        <div>
          <span className="checkout-kicker">Secure enrollment</span>
          <h1>Complete your Talweeh enrollment</h1>
          <p>Course savings are calculated by Talweeh; payment details continue to go directly to Stripe.</p>
        </div>
        <div className="checkout-trust-pill"><span>✓</span> Secure Stripe payment</div>
      </header>

      <section className="checkout-main-grid">
        <div className="checkout-order-panel">
          <div className="checkout-panel-head">
            <div><span className="checkout-kicker">Your courses</span><h2>Order summary</h2></div>
            <Link to="/cart">Edit cart</Link>
          </div>

          <div className="checkout-order-list">
            {rows.map(({ course, option }) => (
              <article className="checkout-order-row" key={option.id}>
                <CourseThumb course={course} />
                <div className="checkout-order-copy">
                  <h3>{course.title}</h3>
                  <p>{course.instructor_name || 'Talweeh Academy'}</p>
                  <span>{option.display_name} · {optionBillingLabel(option)}</span>
                  {rows.length > 1 && <button type="button" onClick={() => removeOption(option.id)}>Remove</button>}
                </div>
                <strong>{money(option.amount_cents, option.currency)}</strong>
              </article>
            ))}
          </div>

          <section className="checkout-savings-panel">
            <div className="checkout-savings-head">
              <div>
                <span className="checkout-kicker">Enrollment savings</span>
                <h3>Save on your enrollment</h3>
                <p>Multi-course savings and promo codes are recalculated automatically before Stripe creates the payment session.</p>
              </div>
              {promotionLoading
                ? <small>Checking savings…</small>
                : promotionPercent > 0
                  ? <strong>Save {money(savings, currency)}</strong>
                  : <small>Automatic savings</small>}
            </div>

            <article className={`checkout-bundle-promo ${promotion?.bundle?.eligible ? 'is-active' : ''}`}>
              <div className="checkout-bundle-icon" aria-hidden="true">+</div>
              <div>
                <span>Multi-course savings</span>
                <h4>{nextTier ? 'Add another course and save more' : promotion?.bundle?.eligible ? 'Add another course and keep saving' : 'Get a discount by enrolling in multiple courses at once'}</h4>
                <p>{nextTier
                  ? `Add ${coursesToNext} more eligible course${coursesToNext === 1 ? '' : 's'} to unlock the next ${pct(nextTier.percent)}% savings tier on this enrollment.`
                  : promotion?.bundle?.eligible
                    ? 'Your current bundle saving is already applied automatically.'
                    : 'Build a multi-course enrollment and Talweeh will automatically apply the best eligible bundle saving.'}</p>
              </div>
              <b>{nextTier ? `Next: ${pct(nextTier.percent)}% off` : promotion?.bundle?.eligible ? 'Savings active' : 'Automatic'}</b>
            </article>

            <details className={`checkout-coupon-disclosure ${promotion?.coupon?.applied ? 'is-active' : ''}`}>
              <summary>
                <div><span>Coupon code</span><strong>{promotion?.coupon?.applied ? `${promotion.coupon.code} applied` : 'Have a promo code?'}</strong></div>
                <div>{promotion?.coupon?.applied ? `${pct(promotion.coupon.percent_off)}% off` : 'Add code'} <span aria-hidden="true">⌄</span></div>
              </summary>
              <div className="checkout-coupon-body">
                <p>{promotion?.coupon?.message || 'Enter a Talweeh promo code. Student-restricted codes may also require the matching account email.'}</p>
                <form className="checkout-benefit-form" onSubmit={applyCoupon}>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(event) => setStudentEmail(event.target.value)}
                    placeholder="Student email (optional)"
                    autoComplete="email"
                  />
                  <input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder="Promo code"
                    maxLength={40}
                  />
                  <button type="submit">Apply</button>
                </form>
              </div>
            </details>

            {promotionError && <div className="checkout-inline-error" role="alert">{promotionError}</div>}
          </section>

          <div className="checkout-totals">
            <div><span>Subtotal</span><strong>{money(subtotal, currency)}</strong></div>
            {promotionPercent > 0 && <div className="checkout-discount-line"><span>{appliedSources.includes('coupon') ? 'Promotion' : 'Bundle saving'} · {pct(promotionPercent)}%</span><strong>−{money(savings, currency)}</strong></div>}
            <div className="checkout-total-line"><span>Estimated total</span><strong>{money(estimatedTotal, currency)}</strong></div>
            <small>Stripe shows the authoritative payment amount. Talweeh recalculates eligibility server-side when the payment session is created.</small>
          </div>
        </div>

        <aside className="checkout-payment-panel">
          <div className="checkout-panel-head payment-head"><div><span className="checkout-kicker">Payment</span><h2>Pay securely</h2></div></div>
          {!publishableKey
            ? <div className="checkout-key-missing" role="alert"><strong>Stripe publishable key is not configured.</strong><p>Add <code>VITE_STRIPE_PUBLISHABLE_KEY=pk_…</code> to the public-site <code>.env.local</code>, then restart Vite.</p></div>
            : <div className="stripe-embedded-shell" key={sessionKey}>
                {checkoutError && <div className="checkout-inline-error" role="alert">{checkoutError}</div>}
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>}
          <div className="checkout-security-copy">
            <span>🔒 Payment information goes directly to Stripe.</span>
            <span>{checkoutIdentity?.authenticated
              ? `Your Talweeh portal account${checkoutIdentity.email ? ` (${checkoutIdentity.email})` : ''} is attached securely to this checkout.`
              : 'After payment, you continue to the Talweeh academic portal to activate access.'}</span>
          </div>
        </aside>
      </section>

      {recommendationPool.length > 0 && (
        <section id="checkout-course-recommendations" className="checkout-related-section">
          <div className="checkout-related-head">
            <div>
              <span className="checkout-kicker">Add courses & save</span>
              <h2>{nextTier ? `Add another course and save ${pct(nextTier.percent)}%` : promotion?.bundle?.eligible ? 'Add another course and keep saving' : 'Continue building your studies'}</h2>
              <p>Enroll in related courses together and Talweeh will automatically check for multi-course savings.</p>
            </div>
          </div>

          <div className="checkout-related-grid">
            {recommendations.map((entry) => {
              const alreadyAdded = selectedIds.includes(String(entry.option.id))
              const slug = coursePublicSlug(entry.course)
              return (
                <article className="checkout-related-card" key={entry.course.checkout_slug}>
                  <Link to={`/courses/${encodeURIComponent(slug)}`} className="checkout-related-poster">
                    {entry.course.poster_url
                      ? <img src={entry.course.poster_url} alt={`${entry.course.title} course poster`} loading="lazy" decoding="async" />
                      : <span aria-hidden="true">ت</span>}
                  </Link>
                  <div className="checkout-related-body">
                    <span>{entry.course.instructor_name || 'Talweeh Academy'}</span>
                    <h3>{entry.course.title}</h3>
                    <p>{entry.course.categories?.slice(0, 2).join(' · ') || 'Talweeh course'}</p>
                    <div><strong>{money(entry.option.amount_cents, entry.option.currency)}</strong><small>{optionBillingLabel(entry.option)}</small></div>
                    <button type="button" disabled={alreadyAdded} onClick={() => addRecommendation(entry)}>{alreadyAdded ? 'Added' : 'Add to checkout'}</button>
                  </div>
                </article>
              )
            })}
          </div>

          {hasMoreRecommendations && (
            <div className="checkout-related-more">
              <button type="button" onClick={() => setVisibleRecommendationCount((count) => Math.min(count + 3, recommendationPool.length))}>Load more courses</button>
              <span>Showing {recommendations.length} of {recommendationPool.length} recommended courses</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
