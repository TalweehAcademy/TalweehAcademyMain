import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import { MEDIA_CATEGORIES, MEDIA_ITEMS, mediaCategoryLabel } from '../data/mediaCatalog'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7.6v8.8L16 12 9 7.6Z" fill="currentColor" />
    </svg>
  )
}

function MediaCard({ item }) {
  const primary = item.categories[0]
  return (
    <article className="academy-media-entry">
      <Link className="academy-media-thumb" to={`/media/${item.slug}`} aria-label={`Watch ${item.title}`}>
        <img src={item.thumbnail} alt="" loading="lazy" />
        <span className="academy-media-play" aria-hidden="true"><PlayIcon /></span>
      </Link>
      <div className="academy-media-entry-copy">
        <div className="academy-media-meta">{mediaCategoryLabel(primary)}</div>
        <h2><Link to={`/media/${item.slug}`}>{item.title}</Link></h2>
        <p>{item.shortOverview}</p>
        <Link className="academy-media-watch-link" to={`/media/${item.slug}`}>
          <span className="academy-media-watch-icon"><PlayIcon /></span>
          Watch free
        </Link>
      </div>
    </article>
  )
}

export default function MediaPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('category') || 'all'
  const active = MEDIA_CATEGORIES.some((c) => c.slug === requested) ? requested : 'all'
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return MEDIA_ITEMS.filter((item) => {
      const categoryMatch = active === 'all' || item.categories.includes(active)
      if (!categoryMatch) return false
      if (!needle) return true
      return `${item.title} ${item.shortOverview} ${item.collections.join(' ')}`.toLowerCase().includes(needle)
    })
  }, [active, query])

  function chooseCategory(slug) {
    if (slug === 'all') setParams({})
    else setParams({ category: slug })
  }

  return (
    <div className="academy-media-page">
      <PageHeader />
      <main>
        <section className="academy-media-hero">
          <div className="academy-media-hero-inner">
            <p className="academy-media-kicker">Talweeh Academy Media</p>
            <h1>Beneficial knowledge, freely accessible.</h1>
            <p>
              Watch selected academic excerpts, reminders, discussions, and short lessons from Talweeh Academy.
              Each video includes a concise overview so you can quickly find what is useful to you.
            </p>
          </div>
        </section>

        <section className="academy-media-shell">
          <header className="academy-media-library-heading">
            <div>
              <p className="academy-media-kicker">Media Library</p>
              <h2>{active === 'all' ? 'Latest videos' : mediaCategoryLabel(active)}</h2>
            </div>
            <div className="academy-media-count">{filtered.length} {filtered.length === 1 ? 'video' : 'videos'}</div>
          </header>

          <div className="academy-media-controls">
            <div className="academy-media-categories" aria-label="Media categories">
              {MEDIA_CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category.slug}
                  className={active === category.slug ? 'active' : ''}
                  onClick={() => chooseCategory(category.slug)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <label className="academy-media-search">
              <span>Search media</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles and topics" type="search" />
            </label>
          </div>

          <div className="academy-media-list">
            {filtered.length ? filtered.map((item) => <MediaCard item={item} key={item.slug} />) : (
              <div className="academy-media-empty">
                <h3>No videos here yet.</h3>
                <p>This section is ready for new Talweeh media as it is added.</p>
                <button type="button" onClick={() => { chooseCategory('all'); setQuery('') }}>Browse all media</button>
              </div>
            )}
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
