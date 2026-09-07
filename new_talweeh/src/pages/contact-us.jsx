/* eslint-disable react/prop-types */
import { PageHeader, PageHero, PageFooter } from './_shared'
import { useContent } from '../hooks/useContent'
import { Editable } from '../components/ContentEditor'

function ContactIcon({ type }) {
  if (type === 'telegram') {
    return (
      <svg className="contact-card-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 3L2 10.5l5.5 2L9 19l3-3.5 5.5 4L22 3zM9.5 13.5L18 6l-7 8.5-.5 3-1-4z" />
      </svg>
    )
  }

  return (
    <svg className="contact-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 5h20v14H2V5zm2 2.4V17h16V7.4l-8 5.3-8-5.3zM19.2 7H4.8L12 11.8 19.2 7z" />
    </svg>
  )
}

export default function ContactUsPage() {
  const { content: c } = useContent('contact')

  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Contact Us" />

        <section className="contact-page">
          <div className="contact-info-cards">
            <Editable page="contact" sectionKey="telegram">
              <div className="contact-info-card">
                <ContactIcon type="telegram" />
                <h3>{c.telegram.heading}</h3>
                <p>
                  {c.telegram.prefix}{' '}
                  <a href={c.telegram.url} target="_blank" rel="noreferrer">
                    {c.telegram.url}
                  </a>{' '}
                  {c.telegram.suffix}
                </p>
              </div>
            </Editable>

            <Editable page="contact" sectionKey="email">
              <div className="contact-info-card">
                <ContactIcon type="email" />
                <h3>{c.email.heading}</h3>
                <p>
                  {c.email.prefix}{' '}
                  <a href={`mailto:${c.email.address}`}>{c.email.address}</a>{' '}
                  {c.email.suffix}
                </p>
              </div>
            </Editable>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
