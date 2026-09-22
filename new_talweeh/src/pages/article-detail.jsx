import { Link, useParams } from 'react-router-dom'
import { PageFooter, PageHeader } from './_shared'
import { extractVideoId } from '../utils/youtube'
import { getArticleBySlug } from '../data/articles'
import { absoluteUrl, useDocumentMeta } from '../hooks/useDocumentMeta'
import TalweehMediaPlayer from '../components/TalweehMediaPlayer'

function formatArticleDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ArticleDetailPage() {
  const { slug } = useParams()
  const article = getArticleBySlug(slug)
  const articleVideoId = extractVideoId(article?.youtubeUrl)

  useDocumentMeta({
    title: article?.title,
    description: article?.excerpt,
    image: absoluteUrl(article?.imageUrl),
  })

  return (
    <div className="page-shell">
      <PageHeader />

      <main>
        {!article && (
          <section className="article-detail-shell">
            <p className="courses-status courses-error">Article not found</p>
            <p>
              <Link to="/articles">Back to Articles</Link>
            </p>
          </section>
        )}

        {article && (
          <article className="article-detail-shell">
            <nav className="article-breadcrumb">
              <Link to="/">Home</Link>
              <span>|</span>
              <Link to="/articles">Articles</Link>

              {article.category && (
                <>
                  <span>|</span>
                  <span>{article.category}</span>
                </>
              )}
            </nav>

            <header className="article-detail-header">
              <h1>{article.title}</h1>

              {(article.publishedAt || article.readTime) && (
                <div className="article-meta">
                  {article.publishedAt && (
                    <span>{formatArticleDate(article.publishedAt)}</span>
                  )}

                  {article.readTime && (
                    <span>{article.readTime}</span>
                  )}
                </div>
              )}
            </header>

            {article.imageUrl && (
              <img
                className="article-detail-image"
                src={article.imageUrl}
                alt={article.title}
              />
            )}

            {articleVideoId && (
              <div className="article-video-wrapper">
                <TalweehMediaPlayer
                  videoId={articleVideoId}
                  title={article.title}
                  thumbnail={`https://i.ytimg.com/vi/${articleVideoId}/maxresdefault.jpg`}
                />
              </div>
            )}

            <div className="article-detail-content">
              {article.content?.map((block, index) => {
                const key = `${block.type}-${index}`

                if (block.type === 'heading') {
                  return <h2 key={key}>{block.text}</h2>
                }

                if (block.type === 'subheading') {
                  return <h3 key={key}>{block.text}</h3>
                }

                if (block.type === 'video') {
                  const blockVideoId = extractVideoId(block.url)

                  if (!blockVideoId) return null

                  return (
                    <div
                      className="article-video-wrapper inline"
                      key={key}
                    >
                      <TalweehMediaPlayer
                        videoId={blockVideoId}
                        title={block.title || article.title}
                        thumbnail={`https://i.ytimg.com/vi/${blockVideoId}/maxresdefault.jpg`}
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
