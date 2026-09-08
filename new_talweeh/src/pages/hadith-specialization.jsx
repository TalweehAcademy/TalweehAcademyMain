import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageFooter, PageHeader } from './_shared'
import { PUBLIC_COURSES } from '../data/publicCourseIndex'
import { loadPublicCourse } from '../data/publicCourseDetails'
import './hadith-specialization.css'

const ENROLLMENT_EMAIL = 'info@talweehacademy.com'
const ENROLLMENT_HREF = `mailto:${ENROLLMENT_EMAIL}?subject=${encodeURIComponent('Hadith Specialization Enrollment')}`

const TADRIB_OVERVIEW = 'This course provides an in-depth study of al-Suyūṭī’s extensive masterpiece Tadrīb al-Rāwī, one of the most comprehensive works on ḥadīth nomenclature. Building upon foundational principles, students explore the full spectrum of terminology, classifications, and technical discussions governing the authentication, transmission, and preservation of ḥadīth. The course emphasizes advanced applications through classical case studies and prepares students for higher-level ḥadīth research with methodological precision.'
const TADRIB_OUTCOMES = [
  'Master advanced ḥadīth terminology as presented in Tadrīb al-Rāwī.',
  'Apply principles of ḥadīth classification to complex scholarly examples.',
  'Analyze and reconcile differences in terminology usage among classical scholars.',
  'Prepare for specialized research in the sciences of ḥadīth.',
]

const CURRICULUM = {
  1: [
    {
      title: 'Tadwīn al-Sunnah',
      subtitle: 'Compilation of the Sunnah',
      catalogSlug: 'tadwin-al-sunnah',
      overview: 'This course presents a detailed historical study of ḥadīth in light of its codification, beginning from the Prophetic era through the earliest generations. Students examine the socio-historical context, motivations, and methodological developments that shaped the preservation of the Sunnah, together with the major genres of ḥadīth compilations and later literary contributions.',
      outcomes: [
        'Trace the historical progression of ḥadīth codification from the Prophetic era to the fifth century.',
        'Differentiate between the major genres of ḥadīth compilations and their distinctive features.',
        'Identify leading works within each genre and their respective authors.',
        'Appreciate the scholarly motivations and methodological considerations in the compilation process.',
      ],
    },
    {
      title: 'Makānat al-Sunnah',
      subtitle: 'The Status of the Sunnah',
      catalogSlug: 'makanat-al-sunnah',
      overview: 'This course examines the authoritative position of the Sunnah in Islam and its role alongside the Qurʾān. It addresses the theological foundation for the infallibility of the Prophets, the binding nature and legislative authority of Prophetic narrations, and scholarly responses to early and contemporary challenges to the Sunnah.',
      outcomes: [
        'Explain the theological and legal basis for the authority of the Sunnah.',
        'Analyze arguments of early ḥadīth rejectors and formulate scholarly responses.',
        'Assess the nature and categories of Prophetic narrations.',
        'Identify and evaluate classical works defending the Sunnah.',
      ],
    },
    {
      title: 'Ruwāt al-Ḥadīth — Part 1',
      subtitle: 'Narrators of Hadith',
      overview: 'This course covers selected sections from Dr. ʿAwwād ibn Ḥumayd al-Ruwayshī’s Ruwāt al-Ḥadīth. Students examine the status of the Ṣaḥābah, classical biographical works, the genre of Ṭabaqāt literature, and historical works documenting notable scholars and events across different lands.',
      outcomes: [
        'Recognize the unique status of the Ṣaḥābah and subsequent generations.',
        'Identify principal Ṭabaqāt works and understand their methodological frameworks.',
        'Locate and utilize historical sources on notable scholars from different regions.',
      ],
    },
    {
      title: 'Takwīn al-Isnād',
      subtitle: 'Formation of Chains of Transmission',
      catalogSlug: 'takwin-al-asanid',
      overview: 'This course explains how the isnād developed from the Prophetic era through the generations of the Ṣaḥābah, their successors, and later scholars, culminating in the major ḥadīth compilations. Students learn methods for identifying prominent narrators and apply the Madār method in tracing transmission chains.',
      outcomes: [
        'Outline the historical development of the isnād from the Prophetic era to the codification period.',
        'Apply the Madār method in tracing transmission chains.',
        'Identify key narrators leading up to the six canonical collections.',
        'Understand the relationship between isnād development and the emergence of ḥadīth compilations.',
      ],
    },
    {
      title: 'Al-Jarḥ wa al-Taʿdīl',
      subtitle: 'Criticism and Accreditation of Narrators',
      catalogSlug: 'al-jarh-wa-l-tadil',
      overview: 'This course offers an in-depth study of the principles and application of narrator criticism. Students examine the nature of narrator evaluation, the interaction between jarḥ and taʿdīl, the terminology of the classical critics, and the external factors that influence narrator assessment.',
      outcomes: [
        'Understand the foundational principles governing narrator evaluation.',
        'Differentiate between various types and levels of jarḥ and taʿdīl.',
        'Interpret terminology used by classical critics in narrator assessment.',
        'Apply principles of fair judgment when reconciling conflicting evaluations.',
      ],
    },
    {
      title: 'Manāhij al-Muḥaddithīn',
      subtitle: 'Methodologies of the Hadith Scholars',
      overview: 'This course examines the methodologies employed by the authors of major ḥadīth compilations, including Mālik, Aḥmad, al-Bukhārī, Muslim, Abū Dāwūd, al-Tirmidhī, Ibn Mājah, al-Nasāʾī, al-Dārimī, al-Ṭaḥāwī, and others. Attention is given to selection, narration, organization, subtle indications of ʿilal, jurisprudential leanings, and chapter headings.',
      outcomes: [
        'Describe the methodologies of major ḥadīth compilers.',
        'Analyze how compilers selected, structured, and transmitted narrations.',
        'Identify indications of ʿilal and juristic opinions within compilations.',
        'Evaluate the role of chapter headings in conveying scholarly perspectives.',
      ],
    },
    {
      title: 'Takhrīj',
      subtitle: 'Referencing Hadiths in Primary Sources',
      catalogSlug: 'takhri-j-al-h-adi-th-q2zxxj',
      overview: 'This course trains students in sourcing ḥadīth back to their original references. Students learn to locate narrations by isnād, matn, topical keywords, or thematic subject, use classical and modern research tools, properly format a takhrīj, and create visual charts of transmission routes.',
      outcomes: [
        'Locate narrations using isnād, matn, or topical references.',
        'Utilize classical and modern takhrīj resources effectively.',
        'Properly format a takhrīj entry.',
        'Construct isnād charts showing multiple routes of transmission.',
      ],
    },
    {
      title: 'Dirāsat al-Asānīd',
      subtitle: 'Analysis of Chains of Transmission',
      overview: 'After completing studies in takhrīj, al-Jarḥ wa al-Taʿdīl, and muṣṭalaḥ, students learn how to apply rulings to specific isnāds. This capstone application integrates methodologies from earlier courses so that narrations can be critically evaluated by chain structure, narrator reliability, and transmission context.',
      outcomes: [
        'Apply cumulative knowledge to assess the strength of a given isnād.',
        'Integrate principles from muṣṭalaḥ, takhrīj, and al-Jarḥ wa al-Taʿdīl.',
        'Formulate a reasoned grading for narrations based on chain analysis.',
      ],
    },
    {
      title: 'Al-Athbāt wa al-Fahāris',
      subtitle: 'Indexes and Referential Works',
      catalogSlug: 'al-athbat-wal-faharis',
      overview: 'This course examines the athbāt, fahāris, and maʿājim of later-era narrators. Students learn how to locate the maqrūʾāt and masmūʿāt of a narrator with their teachers in the post-classical period, with special attention to historically significant high chains and verifiable samāʿ.',
      outcomes: [
        'Navigate and interpret later-era athbāt and fahāris.',
        'Identify maqrūʾāt and masmūʿāt in later isnāds.',
        'Trace historically significant high chains with authenticated samāʿ.',
      ],
    },
    {
      title: 'Ruwāt al-Ḥadīth — Part 2',
      subtitle: 'Advanced Narrator Studies',
      overview: 'This course examines early and later works of al-Jarḥ wa al-Taʿdīl together with reference works on personal names, kunā, alqāb, and ansāb. Students develop familiarity with the literature needed to identify narrators accurately and compare the methodologies of prominent critics across the centuries.',
      outcomes: [
        'Identify and describe major early and later works in al-Jarḥ wa al-Taʿdīl.',
        'Utilize name, title, and lineage references for narrator identification.',
        'Accurately read and vocalize narrator names.',
        'Compare methodological approaches of prominent critics across centuries.',
      ],
    },
    {
      title: 'Tadrīb al-Rāwī 1',
      subtitle: 'Advanced Hadith Nomenclature — Part 1',
      catalogSlug: 'tadrib-al-rawi',
      overview: TADRIB_OVERVIEW,
      outcomes: TADRIB_OUTCOMES,
      note: 'The supplied course notes describe Tadrīb al-Rāwī as one continuous advanced Muṣṭalaḥ course. This overview is shared across Parts 1 and 2 of the two-year sequence.',
    },
  ],
  2: [
    {
      title: 'Tadrīb al-Rāwī 2',
      subtitle: 'Advanced Hadith Nomenclature — Part 2',
      catalogSlug: 'tadrib-al-rawi',
      overview: TADRIB_OVERVIEW,
      outcomes: TADRIB_OUTCOMES,
      note: 'The supplied course notes describe Tadrīb al-Rāwī as one continuous advanced Muṣṭalaḥ course. This overview is shared across Parts 1 and 2 of the two-year sequence.',
    },
    {
      title: 'Al-Nushakh wal-Taqyeed',
      subtitle: 'Manuscripts and Annotation',
      overview: 'A second-year module in manuscript studies and annotation, listed in the supplied two-year Hadith Specialization curriculum as Al-Nushakh wal-Taqyeed.',
      outcomes: [],
    },
    {
      title: 'Orientalist Critique',
      subtitle: 'Orientalists and Modern Hadith Criticism',
      overview: 'This course critically examines doubts raised by Orientalists regarding the preservation of ḥadīth and the methodological assumptions that shaped their conclusions. Students study the intellectual roots of modern ḥadīth rejection and evaluate contemporary academic approaches alongside scholarly responses.',
      outcomes: [
        'Identify major Orientalist claims about ḥadīth preservation.',
        'Analyze the historical and ideological contexts behind these critiques.',
        'Evaluate modern scholarly methods in light of traditional ḥadīth sciences.',
      ],
    },
    {
      title: 'ʿIlal al-Ḥadīth',
      subtitle: 'Hidden Defects in Hadith',
      overview: 'This course addresses one of the most intricate disciplines in ḥadīth studies: the science of hidden defects. Students learn the principles, terminology, and investigative methods used to identify subtle flaws in isnād and matn, while engaging with major classical works of ʿilal.',
      outcomes: [
        'Define and categorize different types of ʿilal.',
        'Apply investigative methods to identify defects in narrations.',
        'Utilize classical ʿilal works for case analysis.',
      ],
    },
    {
      title: 'Ṣaḥīḥ al-Bukhārī',
      subtitle: 'Selected Readings and Detailed Analysis',
      overview: 'This course is a major applied component of the specialization. Through selected passages from Ṣaḥīḥ al-Bukhārī, students bring together their study of muṣṭalaḥ, al-Jarḥ wa al-Taʿdīl, Manāhij al-Muḥaddithīn, ʿilal, and narrator selection, applying the theory developed throughout the program to a foundational ḥadīth collection.',
      outcomes: [
        'Detect Imām al-Bukhārī’s subtle indications to hidden defects in narrations.',
        'Recognize his expertise in selecting specific transmission paths.',
        'Understand his conditions in choosing narrators and narrations.',
      ],
    },
    {
      title: 'Muwaṭṭaʾ Mālik',
      subtitle: 'Selected Readings and Detailed Analysis',
      overview: 'This course approaches the Muwaṭṭaʾ of Imām Mālik through a ḥadīth lens. Students study the chains leading to the Muwaṭṭaʾ, its different riwāyāt, Imām Mālik’s selection of narrators and narrations, munqaṭiʿ reports, and areas in which particular transmissions have been critically examined.',
      outcomes: [
        'Recognize Imām Mālik’s expertise in selecting narrators and narrations.',
        'Study how to find connected paths for munqaṭiʿ narrations in the Muwaṭṭaʾ.',
        'Research areas where Imām Mālik has been said to err.',
        'Analyze differences among transmissions and recensions of the Muwaṭṭaʾ.',
      ],
    },
  ],
}

function formatCatalogPrice(course) {
  if (!course) return ''
  if (course.free) return 'Free'
  const cents = Number(course.priceCents)
  if (!Number.isFinite(cents) || cents <= 0) return ''
  try {
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: course.currency || 'USD',
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)
    return `${amount} ${course.currency || 'USD'}`
  } catch {
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)} ${course.currency || 'USD'}`
  }
}

function CourseDetails({ course }) {
  const [isOpen, setIsOpen] = useState(false)
  const [catalogCourse, setCatalogCourse] = useState(null)
  const [catalogLoading, setCatalogLoading] = useState(false)

  const catalogMeta = useMemo(
    () => course.catalogSlug ? PUBLIC_COURSES.find((item) => item.slug === course.catalogSlug) : null,
    [course.catalogSlug],
  )

  useEffect(() => {
    if (!isOpen || !course.catalogSlug || catalogCourse) return undefined
    let active = true
    setCatalogLoading(true)
    loadPublicCourse(course.catalogSlug)
      .then((result) => {
        if (active) setCatalogCourse(result)
      })
      .finally(() => {
        if (active) setCatalogLoading(false)
      })
    return () => { active = false }
  }, [isOpen, course.catalogSlug, catalogCourse])

  const lessons = catalogCourse?.lessons || []

  return (
    <details className="hadith-course-card" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span className="hadith-course-heading">
          <strong>{course.title}</strong>
          <small>{course.subtitle}</small>
          {catalogMeta && (
            <span className="hadith-public-course-badge">
              View course details{catalogMeta.lessonCount ? ` · ${catalogMeta.lessonCount} lessons` : ''}
            </span>
          )}
        </span>
        <span className="hadith-course-toggle" aria-hidden="true">+</span>
      </summary>
      <div className="hadith-course-details">
        <div className="hadith-course-overview">
          <span>Course overview</span>
          <p>{course.overview}</p>
          {course.note && <p className="hadith-course-note">{course.note}</p>}
        </div>
        {course.outcomes?.length > 0 && (
          <div className="hadith-course-outcomes">
            <span>Learning outcomes</span>
            <ul>{course.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
          </div>
        )}

        {catalogMeta && (
          <section className="hadith-catalog-panel" aria-label={`${course.title} standalone course details`}>
            <div className="hadith-catalog-panel-head">
              <div>
                <span>Standalone Talweeh course</span>
                <h3>{catalogMeta.title}</h3>
                <p>{catalogMeta.instructor}</p>
              </div>
              <Link className="hadith-catalog-link" to={`/courses/${catalogMeta.slug}`}>
                <span>Enroll in standalone course</span>
                {formatCatalogPrice(catalogMeta) && <small>{formatCatalogPrice(catalogMeta)}</small>}
                <b aria-hidden="true">→</b>
              </Link>
            </div>

            <div className="hadith-catalog-summary">
              {catalogMeta.poster && <img src={catalogMeta.poster} alt="" loading="lazy" />}
              <div>
                <span>Course overview</span>
                <p>{catalogCourse?.description || catalogMeta.description || 'Course overview available on the standalone course page.'}</p>
              </div>
            </div>

            {catalogLoading && <p className="hadith-catalog-loading">Loading lesson list…</p>}

            {!catalogLoading && catalogCourse && (
              <div className="hadith-catalog-lessons">
                <div className="hadith-catalog-lessons-head">
                  <span>Course lessons</span>
                  <small>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</small>
                </div>
                {lessons.length > 0 ? (
                  <ol>
                    {lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.portalId || `${lesson.title}-${lessonIndex}`}>
                        {lesson.overview ? (
                          <details className="hadith-catalog-lesson">
                            <summary>
                              <span>{String(lessonIndex + 1).padStart(2, '0')}</span>
                              <strong>{lesson.title}</strong>
                              <i aria-hidden="true">+</i>
                            </summary>
                            <p>{lesson.overview}</p>
                          </details>
                        ) : (
                          <div className="hadith-catalog-lesson-static">
                            <span>{String(lessonIndex + 1).padStart(2, '0')}</span>
                            <strong>{lesson.title}</strong>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="hadith-catalog-empty">This standalone course is available, but its lesson list has not been published yet.</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </details>
  )
}

export default function HadithSpecializationPage() {
  const [year, setYear] = useState(1)
  const courses = CURRICULUM[year]

  return (
    <div className="page-shell hadith-page">
      <PageHeader />
      <main>
        <section className="hadith-hero">
          <div className="hadith-hero-ornament" aria-hidden="true"><span>حديث</span></div>
          <div className="hadith-hero-copy">
            <span className="hadith-eyebrow">Two-year advanced program</span>
            <h1>Hadith <em>Specialization</em></h1>
            <p className="hadith-program-name">Takhaṣṣuṣ fī al-Ḥadīth</p>
            <p className="hadith-lead">A comprehensive two-year program for students seeking an in-depth understanding of the sciences of Hadith. The program moves from the historical development and preservation of the Sunnah into advanced study of Muṣṭalaḥ al-Ḥadīth, narrator evaluation, isnād analysis, hidden defects, and applied study of major Hadith collections.</p>
            <div className="hadith-facts" aria-label="Program facts">
              <span><small>Duration</small><strong>2 years</strong></span>
              <span><small>Curriculum</small><strong>17 courses</strong></span>
              <span><small>Level</small><strong>Advanced</strong></span>
            </div>
            <div className="hadith-actions">
              <a className="hadith-button" href="#hadith-curriculum">Explore curriculum</a>
              <a className="hadith-button hadith-button-secondary" href={ENROLLMENT_HREF}>For enrollment</a>
            </div>
            <small className="hadith-email-note">Enrollment inquiries: {ENROLLMENT_EMAIL}</small>
          </div>
          <figure className="hadith-manuscript">
            <div className="hadith-manuscript-frame">
              <img src="/brand/hadith-specialization-manuscript.webp" alt="Illuminated Arabic manuscript" />
            </div>
            <figcaption>
              <span>Text · transmission · verification</span>
              <strong>A tradition studied through its sources.</strong>
            </figcaption>
          </figure>
        </section>

        <section className="hadith-overview">
          <div className="hadith-section-heading">
            <span className="hadith-eyebrow">Program overview</span>
            <h2>From preservation to critical analysis.</h2>
          </div>
          <div className="hadith-overview-copy">
            <p>The introductory study traces Hadith from the time of the Prophet Muhammad ﷺ through the era of the noble Companions and their successors, establishing the historical foundation needed for detailed study of Hadith methodology.</p>
            <p>Students then progress through the disciplines of narrator criticism, transmission networks, takhrīj, chain analysis, scholarly indexes, hidden defects, modern critique, and applied readings. Each subject introduced in the early stages is revisited at greater depth so that theory and application develop together.</p>
          </div>
        </section>

        <section className="hadith-instructors">
          <div className="hadith-section-heading">
            <span className="hadith-eyebrow">Instructors</span>
            <h2>Guided by specialist study.</h2>
          </div>
          <div className="hadith-instructor-grid">
            <Link className="hadith-instructor-card" to="/instructors/sheikh-omer-khurshid">
              <span>01</span><div><h3>Sheikh Omer Khurshid</h3><p>B.A., Faculty of Hadith, Islamic University of Madinah</p><small>Read instructor bio <b aria-hidden="true">→</b></small></div>
            </Link>
            <Link className="hadith-instructor-card" to="/instructors/mufti-mohammad-daud-khurshid">
              <span>02</span><div><h3>Mufti Daud Khurshid</h3><p>Faculty of Islamic Law, Islamic University of Madinah</p><small>Read instructor bio <b aria-hidden="true">→</b></small></div>
            </Link>
          </div>
        </section>

        <section id="hadith-curriculum" className="hadith-curriculum">
          <div className="hadith-curriculum-head">
            <div className="hadith-section-heading">
              <span className="hadith-eyebrow">Hadith Specialization curriculum</span>
              <h2>Seventeen courses across two years.</h2>
            </div>
            <p>Select a year, then open any course to read its overview and learning outcomes.</p>
          </div>
          <div className="hadith-year-switcher" role="tablist" aria-label="Hadith Specialization year">
            {[1, 2].map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={year === item}
                className={year === item ? 'active' : ''}
                onClick={() => setYear(item)}
              >
                <span>Year {item}</span>
                <strong>{item === 1 ? '1st Year' : '2nd Year'}</strong>
                <small>{CURRICULUM[item].length} courses</small>
              </button>
            ))}
          </div>
          <div className="hadith-course-list" role="tabpanel">
            {courses.map((course) => <CourseDetails key={course.title} course={course} />)}
          </div>
        </section>

        <section className="hadith-enrollment-cta">
          <div>
            <span className="hadith-eyebrow">Enrollment</span>
            <h2>Interested in the Hadith Specialization?</h2>
            <p>Contact Talweeh Academy for enrollment information and program inquiries.</p>
          </div>
          <a className="hadith-button" href={ENROLLMENT_HREF}>For enrollment</a>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
