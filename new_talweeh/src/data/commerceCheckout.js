import { commercePortalBase, fetchLiveCommerceCatalog, peekLiveCommerceCatalog } from './liveCommerceCatalog'

function categoryKeys(categories = []) {
  return (Array.isArray(categories) ? categories : [])
    .map((category) => String(category?.slug || category?.name || category || '').trim())
    .filter(Boolean)
}

export function money(cents, currency = 'USD') {
  const amount = Number(cents || 0) / 100
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: String(currency || 'USD').toUpperCase(),
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function duration(value, unit) {
  const count = Number(value || 0)
  if (!count || !unit) return ''
  const normalized = String(unit).replace(/s$/, '')
  return `${count} ${count === 1 ? normalized : `${normalized}s`}`
}

export function optionBillingLabel(option = {}) {
  if (option.billing_type === 'one_time') {
    if (option.access_type === 'permanent') return 'One-time · Permanent access'
    const access = duration(option.access_duration_value, option.access_duration_unit)
    return access ? `One-time · ${access} access` : 'One-time payment'
  }

  const count = Number(option.billing_interval_count || 1)
  const interval = String(option.billing_interval || 'month')
  const cadence = count === 1 ? `Every ${interval}` : `Every ${count} ${interval}s`
  const access = duration(option.access_duration_value, option.access_duration_unit)
  if (access) {
    return option.subscription_completion_access === 'permanent'
      ? `${cadence} · ${access} total · Permanent afterward`
      : `${cadence} · ${access} total`
  }
  return `${cadence} · Access while subscribed`
}

export async function fetchCheckoutCatalog({ signal } = {}) {
  // A catalog fetched in the last minute is reused (the server re-validates every option and price).
  const payload = peekLiveCommerceCatalog(60000) || await fetchLiveCommerceCatalog({ force: true, signal })
  // Programmes (Two-Year Arabic Program, Hadith Specialization) come apart from the course list so they can be
  // bought here without being listed among the courses.
  const programs = (Array.isArray(payload?.programs) ? payload.programs : []).map((program) => ({ ...program, program: true }))
  return [...(Array.isArray(payload?.courses) ? payload.courses : []), ...programs]
    .filter((course) => !course?.free && course?.checkout_available !== false)
    .map((course) => ({
      ...course,
      options: Array.isArray(course.purchase_options) ? course.purchase_options : [],
      categories: categoryKeys(course.categories),
    }))
    .filter((course) => course.options.length > 0)
}

async function postCommerce(path, body) {
  const response = await fetch(`${commercePortalBase()}${path}`, {
    method: 'POST',
    credentials: 'omit',
    mode: 'cors',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

export async function requestCommerceQuote({ optionIds, email = '', couponCode = '', handoff = '' }) {
  const { response, payload } = await postCommerce('/api/commerce/public-quote', {
    option_ids: optionIds,
    email,
    coupon_code: couponCode,
    handoff,
  })
  if (!response.ok || payload?.valid !== true) {
    throw new Error(payload?.error || 'Savings could not be checked.')
  }
  return payload
}

export async function requestCommerceCheckout({ optionIds, email = '', couponCode = '', handoff = '' }) {
  const { response, payload } = await postCommerce('/api/commerce/public-checkout', {
    option_ids: optionIds,
    student_email: email,
    coupon_code: couponCode,
    handoff,
  })
  if (!response.ok || !payload?.clientSecret) {
    throw new Error(payload?.error || 'Secure payment could not be loaded.')
  }
  return payload
}
