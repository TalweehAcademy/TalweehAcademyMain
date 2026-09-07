import { Link } from 'react-router-dom'
import { PageHeader, PageFooter } from './_shared'
import { INSTRUCTORS } from '../data/instructors'
import '../instructors-v2.css'

export default function InstructorsV2Page() {
  return (
    <div className="academy-instructors-v2-page">
      <PageHeader />

      <main>
        <section className="instructors-v2-hero">
          <p className="instructors-v2-kicker">Talweeh Academy Faculty</p>
          <h1>Learn from scholars shaped by serious study.</h1>
          <p>
            Meet the instructors teaching across Talweeh Academy’s programs in
            Qurʾān, Arabic, Ḥadīth, Fiqh, Uṣūl and the wider Islamic sciences.
          </p>
        </section>

        <section className="instructors-v2-shell">
          <div className="instructors-v2-heading">
            <div>
              <p className="instructors-v2-kicker">Our instructors</p>
              <h2>Faculty</h2>
            </div>
            <p>
              Traditional training, continued scholarship and a commitment to
              teaching with clarity and structure.
            </p>
          </div>

          <div className="instructors-v2-grid">
            {INSTRUCTORS.map((instructor, index) => (
              <Link
                className="instructors-v2-card"
                to={`/instructors/${instructor.slug}`}
                key={instructor.slug}
              >
                <div className="instructors-v2-photo">
                  <img
                    src={instructor.image}
                    alt={instructor.name}
                    loading={index < 2 ? 'eager' : 'lazy'}
                    style={{ objectPosition: instructor.imagePosition }}
                  />
                  <span className="instructors-v2-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className="instructors-v2-card-body">
                  <p className="instructors-v2-role">{instructor.role}</p>
                  <h3>{instructor.name}</h3>
                  <p className="instructors-v2-summary">{instructor.summary}</p>
                  <span className="instructors-v2-read">Read profile</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <PageFooter />
    </div>
  )
}
