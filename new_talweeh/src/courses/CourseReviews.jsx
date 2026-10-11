/* eslint-disable react/prop-types */
// "What students say": approved reviews of a course (course pages) or a programme (/hadith-specialization), newest
// first. They come from the portal with the course catalogue on each Publish (Admin → On-Demand → Reviews):
// course.reviews in publicCourseCatalog.js, programmes in src/data/programmeReviews.json. Styles: courses-waha-v1.css.
import { useState } from 'react'

const FIRST = 6
const LONG = 420

const monthYear = (date) => {
  const d = new Date(`${date}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function Stars({ rating, size = 15 }) {
  return (
    <span className="cw-rv-stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={n <= rating ? 'on' : ''}>
          <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
        </svg>
      ))}
    </span>
  )
}

function Review({ review }) {
  const [open, setOpen] = useState(false)
  const long = review.body.length > LONG
  return (
    <figure className="cw-rv wh-glass">
      <Stars rating={review.rating} />
      {/* Each line keeps its own direction: a review can open with an Arabic phrase and go on in English. */}
      <blockquote className={long && !open ? 'clip' : ''}>{review.body.split('\n').map((line, i) => line.trim() ? <span key={i} dir="auto">{line}</span> : <br key={i} />)}</blockquote>
      {long && <button type="button" className="cw-more" onClick={() => setOpen((v) => !v)}>{open ? 'Show less ▴' : 'Read more ▾'}</button>}
      <figcaption><b>{review.name}</b>{review.date && <span>{monthYear(review.date)}</span>}</figcaption>
    </figure>
  )
}

// bare: inside a tab (paid course page), without the section heading; the rating summary stays.
export default function CourseReviews({ reviews, title = 'What students say', kicker = 'Student reviews', bare = false }) {
  const [all, setAll] = useState(false)
  const list = Array.isArray(reviews) ? reviews : []
  if (!list.length) return null
  const average = Math.round((list.reduce((t, r) => t + Number(r.rating || 0), 0) / list.length) * 10) / 10
  const shown = all ? list : list.slice(0, FIRST)
  return (
    <section className={`cw-reviews${bare ? ' bare' : ''}`} id={bare ? undefined : 'reviews'} aria-labelledby={bare ? undefined : 'cw-reviews-h'} aria-label={bare ? 'Student reviews' : undefined}>
      <div className="cw-reviews-h">
        {bare ? <p className="cw-rv-lead">What students who took the course say.</p> : <div><span className="cw-kicker">{kicker}</span><h2 id="cw-reviews-h">{title}</h2></div>}
        <div className="cw-rv-sum"><b>{average.toFixed(1)}</b><Stars rating={Math.round(average)} size={17} /><span>{list.length} {list.length === 1 ? 'review' : 'reviews'}</span></div>
      </div>
      <div className={`cw-rv-grid${list.length < 3 ? ` n${list.length}` : ''}`}>{shown.map((r, i) => <Review key={`${r.name}-${r.date}-${i}`} review={r} />)}</div>
      {list.length > FIRST && !all && <div className="cw-showall"><button type="button" className="wh-btn wh-btn-glass" onClick={() => setAll(true)}>Show all {list.length} reviews</button></div>}
      <p className="cw-rv-note">Written by students enrolled in the course and checked before they appear. Students may be offered a discount on a later course for reviewing; it never depends on the rating they give.</p>
    </section>
  )
}
