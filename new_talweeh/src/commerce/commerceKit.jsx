/* eslint-disable react/prop-types */
// Shared pieces for the Wāḥa study list (/cart) and secure checkout (/checkout) — mockups/cart-waha.html
// and checkout-waha.html. Data comes from the live Talweeh commerce catalog (fetchCheckoutCatalog), with
// the bundled course index filling in lesson counts and posters when the catalog doesn't carry them.
import { Link } from 'react-router-dom'
import { PUBLIC_COURSES } from '../data/publicCourseIndex'
import { money, optionBillingLabel } from '../data/commerceCheckout'

const bundled = new Map(PUBLIC_COURSES.map((c) => [c.slug, c]))
export const publicSlug = (course) => String(course?.public_slug || course?.course_slug || course?.checkout_slug || '').trim()
export const bundledCourse = (course) => bundled.get(publicSlug(course)) || null
export const posterOf = (course) => String(course?.poster_url || bundledCourse(course)?.poster || '')
export const lessonsOf = (course) => Number(course?.lesson_count || bundledCourse(course)?.lessonCount || 0)
export const courseUrl = (course) => `/courses/${encodeURIComponent(publicSlug(course))}`
// The catalog carries category slugs; show the bundled course's category name, else a tidied slug.
export const categoryLabel = (course) => bundledCourse(course)?.categoryLabel
  || String(course?.categories?.[0] || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
export const pct = (value) => {
  const n = Number(value || 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// Catalog courses that go well with the chosen ones: shared categories, the same teacher, level
// and language, and a little for popularity — the scoring the live checkout already used.
function overlap(left = [], right = []) {
  const set = new Set(left.map((x) => String(x).toLowerCase()))
  return right.reduce((n, x) => n + Number(set.has(String(x).toLowerCase())), 0)
}
export function recommend(catalog, selected, { currency = 'USD', hasSubscription = false, owned = [] } = {}) {
  const chosen = new Set(selected.map((c) => c.checkout_slug)), ownedSet = new Set(owned)
  const firstOption = (course) => {
    const options = (course.options || []).filter((o) => String(o.currency || 'USD').toUpperCase() === currency && !(hasSubscription && o.billing_type === 'subscription'))
    return options.find((o) => o.billing_type === 'one_time') || options[0] || null
  }
  return catalog
    .filter((c) => !chosen.has(c.checkout_slug) && !ownedSet.has(c.checkout_slug))
    .map((course) => {
      let score = course.featured ? 2 : 0
      for (const s of selected) {
        score += overlap(course.categories || [], s.categories || []) * 8
        if (course.instructor_name && course.instructor_name === s.instructor_name) score += 5
        if (course.level && course.level === s.level) score += 3
        if (course.language && course.language === s.language) score += 1
      }
      score += Math.min(3, Math.log10(Math.max(1, Number(course.learner_count || 0) + 1)))
      return { course, option: firstOption(course), score }
    })
    .filter((e) => e.option && e.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.course.learner_count || 0) - Number(a.course.learner_count || 0))
}

export function Steps({ at }) {
  return (
    <ol className="ew-steps" aria-label="Enrolment steps">
      {['Study list', 'Secure checkout', 'Begin studying'].map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'on' : ''} aria-current={i === at ? 'step' : undefined}><b>{i < at ? '✓' : i + 1}</b><span>{s}</span></li>
      ))}
    </ol>
  )
}

// Multi-course savings from the Talweeh quote: what's applied now and what the next tier needs.
export function bundleInfo(promotion, count) {
  const next = promotion?.bundle?.next_course_count && promotion?.bundle?.next_percent_off
    ? { count: Number(promotion.bundle.next_course_count), pct: Number(promotion.bundle.next_percent_off) }
    : null
  return { eligible: Boolean(promotion?.bundle?.eligible), next, need: next ? Math.max(1, next.count - count) : 0 }
}

export function Nudge({ promotion, count, dark = false }) {
  const { eligible, next, need } = bundleInfo(promotion, count)
  const applied = Number(promotion?.applied?.percent_off || 0)
  const title = next
    ? `${eligible && applied ? `${pct(applied)}% multi-course saving applied — add` : 'Add'} ${need} more course${need === 1 ? '' : 's'} to save ${pct(next.pct)}%`
    : eligible ? 'Your multi-course saving is applied' : 'Enroll in several courses at once and save'
  const steps = next ? Math.max(next.count, count + 1) : 0
  return (
    <div className={`ew-nudge${dark ? ' dark' : ''}`}>
      <i aria-hidden="true">%</i>
      <div>
        <strong>{title}</strong>
        <span>Multi-course savings are applied automatically at checkout.</span>
        {steps > 0 && <div className="ew-meter" aria-hidden="true">{Array.from({ length: steps }, (_, k) => <b key={k} className={k < count ? 'on' : ''} />)}</div>}
      </div>
    </div>
  )
}

export function RecCard({ entry, label, added, onAdd }) {
  const { course, option } = entry
  const poster = posterOf(course), lessons = lessonsOf(course)
  return (
    <article className="ew-rec">
      <Link className="rp" to={courseUrl(course)}>{poster ? <img src={poster} alt={`${course.title} course poster`} loading="lazy" decoding="async" /> : <span aria-hidden="true">ت</span>}</Link>
      <div className="rb">
        <small>{course.instructor_name || 'Talweeh Academy'}</small>
        <strong>{course.title}</strong>
        <span>{categoryLabel(course) || 'Talweeh course'}{lessons ? ` · ${lessons} lessons` : ''}</span>
        <div className="rf">
          <b>{money(option.amount_cents, option.currency)}<small>{optionBillingLabel(option)}</small></b>
          <button type="button" className={`wh-btn ${added ? 'wh-btn-glass' : 'wh-btn-g'} ew-btn-sm`} disabled={added} onClick={onAdd}>{added ? '✓ Added' : label}</button>
        </div>
      </div>
    </article>
  )
}

export function Recommendations({ pool, shown, onMore, kicker, title, text, label, isAdded, onAdd }) {
  if (!pool.length) return null
  const list = pool.slice(0, shown)
  return (
    <section className="ew-recs" id="checkout-course-recommendations">
      <div className="ew-sec-h"><div><span className="cw-kicker">{kicker}</span><h2>{title}</h2></div><p>{text}</p></div>
      <div className="ew-rgrid">{list.map((e) => <RecCard key={e.course.checkout_slug} entry={e} label={label} added={isAdded(e)} onAdd={() => onAdd(e)} />)}</div>
      {shown < pool.length && (
        <div className="ew-more"><button type="button" className="wh-btn wh-btn-glass ew-btn-sm" onClick={onMore}>Load more courses</button><span>Showing {list.length} of {pool.length} recommended courses</span></div>
      )}
    </section>
  )
}
