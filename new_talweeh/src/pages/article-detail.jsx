import { Link, useParams } from 'react-router-dom'
import { PageFooter, PageHeader } from './_shared'
import { extractVideoId } from '../utils/youtube'
import { getArticleBySlug } from '../data/articles'

function formatArticleDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getArticleEmbedUrl(url) {
  const videoId = extractVideoId(url)
  if (!videoId) return null

  const params = new URLSearchParams({
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
  })

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export default function ArticleDetailPage() {
  const { slug } = useParams()
  const article = getArticleBySlug(slug)
  const embedUrl = getArticleEmbedUrl(article?.youtubeUrl)

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        {!article && (
          <section className="article-detail-shell">
            <p className="courses-status courses-error">Article not found</p>
            <p><Link to="/articles">Back to Articles</Link></p>
          </section>
        )}

        {article && (
          <article className="article-detail-shell">
            <nav className="article-breadcrumb">
              <Link to="/">Home</Link>
              <span>|</span>
              <Link to="/articles">Articles</Link>
              {article.category && <><span>|</span><span>{article.category}</span></>}
            </nav>

            <header className="article-detail-header">
              <h1>{article.title}</h1>
              {(article.publishedAt || article.readTime) && (
                <div className="article-meta">
                  {article.publishedAt && <span>{formatArticleDate(article.publishedAt)}</span>}
                  {article.readTime && <span>{article.readTime}</span>}
                </div>
              )}
            </header>

            {article.imageUrl && (
              <img className="article-detail-image" src={article.imageUrl} alt={article.title} />
            )}

            {embedUrl && (
              <div className="article-video-wrapper">
                <iframe
                  src={embedUrl}
                  title={article.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}

            <div className="article-detail-content">
              {article.content?.map((block, index) => {
                const key = `${block.type}-${index}`
                if (block.type === 'heading') return <h2 key={key}>{block.text}</h2>
                if (block.type === 'subheading') return <h3 key={key}>{block.text}</h3>
                if (block.type === 'video') {
                  const blockEmbedUrl = getArticleEmbedUrl(block.url)
                  if (!blockEmbedUrl) return null
                  return (
                    <div className="article-video-wrapper inline" key={key}>
                      <iframe
                        src={blockEmbedUrl}
                        title={block.title || article.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  )
                }
                return <p key={key}>{block.text}</p>
              })}
            </div>
          </article>
        )}
      </main>
      <PageFooter />
    </div>
  )
}
