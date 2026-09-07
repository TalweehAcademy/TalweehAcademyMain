import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import { getInstructor } from '../data/instructors'
import '../instructors-v2.css'

export default function InstructorDetailV2Page() {
  const { slug } = useParams()
  const instructor = getInstructor(slug)

  if (!instructor) {
    return (
      <div className="academy-instructors-v2-page">
        <PageHeader />
        <main className="instructor-v2-not-found">
          <p className="instructors-v2-kicker">Talweeh Academy Faculty</p>
          <h1>Instructor not found</h1>
          <Link to="/instructors">Return to instructors</Link>
        </main>
        <PageFooter />
      </div>
    )
  }

  return (
    <div className="academy-instructors-v2-page">
      <PageHeader />

      <main>
        <section className="instructor-v2-hero">
          <div className="instructor-v2-hero-copy">
            <Link className="instructor-v2-back" to="/instructors">
              Faculty
            </Link>
            <p className="instructors-v2-kicker">{instructor.role}</p>
            <h1>{instructor.name}</h1>
            <p>{instructor.summary}</p>
          </div>

          <div className="instructor-v2-hero-photo">
            <img
              src={instructor.image}
              alt={instructor.name}
              style={{ objectPosition: instructor.imagePosition }}
            />
          </div>
        </section>

        <section className="instructor-v2-profile">
          <aside className="instructor-v2-aside">
            <div className="instructor-v2-portrait">
              <img
                src={instructor.image}
                alt=""
                style={{ objectPosition: instructor.imagePosition }}
              />
            </div>

            <div className="instructor-v2-aside-copy">
              <span>Talweeh Academy</span>
              <strong>{instructor.name}</strong>
              <small>{instructor.role}</small>
            </div>
          </aside>

          <article className="instructor-v2-biography">
            {instructor.sections.map((section, index) => (
              <section className="instructor-v2-section" key={section.title}>
                <span className="instructor-v2-section-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </div>
              </section>
            ))}
          </article>
        </section>
      </main>

      <PageFooter />
    </div>
  )
}
