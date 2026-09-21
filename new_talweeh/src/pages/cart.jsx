import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageFooter, PageHeader } from './_shared'
import { fetchCheckoutCatalog, money, optionBillingLabel } from '../data/commerceCheckout'
import {
  clearCommerceCart,
  readCommerceCartItems,
  readCommerceHandoff,
  rememberCommerceHandoff,
  removeCommerceCartOption,
} from '../data/commerceCart'

export default function CommerceCartPage() {
  const [params] = useSearchParams()
  const [items, setItems] = useState(() => readCommerceCartItems())
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const queryHandoff = String(params.get('handoff') || '').trim()
  const handoff = queryHandoff || readCommerceHandoff()

  useEffect(() => {
    if (queryHandoff) rememberCommerceHandoff(queryHandoff)
  }, [queryHandoff])

  useEffect(() => {
    const controller = new AbortController()
    fetchCheckoutCatalog({ signal: controller.signal })
      .then(setCatalog)
      .catch((nextError) => {
        if (nextError?.name !== 'AbortError') setError(nextError instanceof Error ? nextError.message : 'Current course catalogue could not be loaded.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const optionMap = useMemo(() => {
    const map = new Map()
    for (const course of catalog) {
      for (const option of course.options || []) map.set(String(option.id), { course, option })
    }
    return map
  }, [catalog])

  const rows = useMemo(
    () => items.map((item) => optionMap.get(String(item.optionId))).filter(Boolean),
    [items, optionMap],
  )

  const subscriptions = rows.filter((row) => row.option.billing_type === 'subscription')
  const currency = String(rows[0]?.option?.currency || 'USD').toUpperCase()
  const total = rows.reduce((sum, row) => sum + Number(row.option.amount_cents || 0), 0)
  const checkoutQuery = new URLSearchParams()
  if (rows.length) checkoutQuery.set('options', rows.map((row) => row.option.id).join(','))
  if (handoff) checkoutQuery.set('handoff', handoff)
  const checkoutHref = `/checkout?${checkoutQuery.toString()}`

  function remove(optionId) {
    setItems(removeCommerceCartOption(optionId))
  }

  function clear() {
    clearCommerceCart()
    setItems([])
  }

  return (
    <div className="page-shell commerce-surface-shell">
      <PageHeader />
      <main className="commerce-cart-page">
        <div className="commerce-cart-head">
          <div><span>Enrollment cart</span><h1>Review your courses</h1></div>
          {rows.length > 0 && <button type="button" onClick={clear}>Clear cart</button>}
        </div>

        {loading
          ? <div className="checkout-loading-card">Loading your cart…</div>
          : error
            ? <div className="checkout-error-card"><h2>Cart unavailable</h2><p>{error}</p></div>
            : rows.length
              ? <div className="commerce-cart-layout">
                  <section className="commerce-cart-items">
                    {rows.map(({ course, option }) => (
                      <article className="commerce-cart-item" key={option.id}>
                        <div className="commerce-cart-poster">
                          {course.poster_url ? <img src={course.poster_url} alt="" /> : <span aria-hidden="true">ت</span>}
                        </div>
                        <div>
                          <span>Course</span>
                          <h2>{course.title}</h2>
                          <p>{option.display_name} · {optionBillingLabel(option)}</p>
                          <button type="button" onClick={() => remove(option.id)}>Remove</button>
                        </div>
                        <strong>{money(option.amount_cents, option.currency)}</strong>
                      </article>
                    ))}
                  </section>

                  <aside className="commerce-cart-summary">
                    <span>Order summary</span>
                    <div><small>Due today</small><strong>{money(total, currency)}</strong></div>
                    {subscriptions.length > 1 && <p className="commerce-cart-warning">Subscription courses must currently be checked out one at a time. Remove one subscription before continuing.</p>}
                    <Link className={`commerce-cart-checkout ${subscriptions.length > 1 ? 'disabled' : ''}`} aria-disabled={subscriptions.length > 1} to={subscriptions.length > 1 ? '/cart' : checkoutHref}>Proceed to secure checkout</Link>
                    <Link className="commerce-cart-continue" to="/courses">Continue browsing courses</Link>
                    <small>Payment is completed securely with Stripe. Course access is activated through the Talweeh Student Portal.</small>
                  </aside>
                </div>
              : <div className="checkout-error-card"><h2>Your cart is empty.</h2><p>Choose a paid course and add an enrollment option to continue.</p><Link to="/courses">Browse courses</Link></div>}
      </main>
      <PageFooter />
    </div>
  )
}
