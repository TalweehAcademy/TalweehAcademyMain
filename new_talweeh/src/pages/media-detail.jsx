import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import { getMediaItem, mediaCategoryLabel, MEDIA_ITEMS } from '../data/mediaCatalog'
import TalweehMediaPlayer from '../components/TalweehMediaPlayer'
import { absoluteUrl, useDocumentMeta } from '../hooks/useDocumentMeta'
import '../media-v17.css'

const TALWEEH_YOUTUBE_SUBSCRIBE =
  'https://www.youtube.com/@Talweeh.Academy?sub_confirmation=1'

function SubscribeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.1 7.2a2.8 2.8 0 0 0-2-2C16.3 4.7 12 4.7 12 4.7s-4.3 0-6.1.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 3.4 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.8.5 6.1.5 6.1.5s4.3 0 6.1-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-4.8 29 29 0 0 0-.5-4.8ZM10.2 15.4V8.6l5.8 3.4-5.8 3.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function MediaDetailPage() {
  const { slug } = useParams()
  const item = getMediaItem(slug)
  // Called before the not-found early return so the hook order stays stable.
  useDocumentMeta({ title: item?.title, description: item?.shortOverview, image: absoluteUrl(item?.thumbnail) })

  if (!item) {
    return (
      <div className="academy-media-page">
        <PageHeader />
        <main className="academy-media-shell academy-media-not-found">
          <p className="academy-media-kicker">Talweeh Academy Media</p>
          <h1>Video not found</h1>
          <Link className="academy-media-watch-link" to="/media">
            Return to Media
          </Link>
        </main>
        <PageFooter />
      </div>
    )
  }

  const related = MEDIA_ITEMS
    .filter(
      (candidate) =>
        candidate.slug !== item.slug &&
        candidate.categories.some((category) =>
          item.categories.includes(category),
        ),
    )
    .slice(0, 3)

  return (
    <div className="academy-media-page academy-media-detail-page">
      <PageHeader />

      <main>
        <section className="academy-media-detail-head">
          <div className="academy-media-detail-head-inner">
            <Link
              className="academy-media-back"
              to={`/media?category=${item.categories[0]}`}
            >
              ← Back to Media
            </Link>

            <p className="academy-media-kicker">
              {mediaCategoryLabel(item.categories[0])}
            </p>

            <h1>{item.title}</h1>
          </div>
        </section>

        <section className="academy-media-detail-shell">
          <TalweehMediaPlayer
            videoId={item.youtubeId}
            title={item.title}
            thumbnail={item.thumbnail}
          />

          <div className="academy-media-overview-card academy-media-overview-card-v12">
            <div className="academy-media-overview-heading">
              <div>
                <p className="academy-media-kicker">Overview</p>
                <h2>About this video</h2>
              </div>

              <a
                className="tmx-v17-subscribe"
                href={TALWEEH_YOUTUBE_SUBSCRIBE}
                target="_blank"
                rel="noreferrer"
              >
                <SubscribeIcon />
                <span>
                  <strong>Subscribe</strong>
                  <small>Talweeh Academy</small>
                </span>
              </a>
            </div>

            <div className="academy-media-overview">
              {item.overview
                .split(/\n\n+/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </div>

          {related.length > 0 && (
            <section className="academy-media-related">
              <div className="academy-media-library-heading">
                <div>
                  <p className="academy-media-kicker">Continue watching</p>
                  <h2>Related videos</h2>
                </div>
              </div>

              <div className="academy-media-related-grid">
                {related.map((video) => (
                  <Link
                    to={`/media/${video.slug}`}
                    key={video.slug}
                    className="academy-media-related-card"
                  >
                    <img src={video.thumbnail} alt="" loading="lazy" />
                    <span>{video.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>
      </main>

      <PageFooter />
    </div>
  )
}
