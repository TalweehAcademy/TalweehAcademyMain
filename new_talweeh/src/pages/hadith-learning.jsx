// /hadith-specialization/learning — the Hadith Specialization's "My Learning", previewed: year by year and month
// by month, four classes a week (one muṣṭalaḥ lesson and one lesson of a companion course in turn), every
// lesson locked until enrolment (ProgramLearningPreview).
import ProgramLearningPreview from '../components/ProgramLearningPreview'
import { HADITH_PLAN } from '../data/programLearningPlans'
import { HADITH_PROGRAM_ENROL } from '../constants/links'

const classes = HADITH_PLAN.years.reduce((s, y) => s + y.months.reduce((t, m) => t + m.weeks.reduce((u, w) => u + w.classes.length, 0), 0), 0)

const periods = HADITH_PLAN.years.map((y) => {
  const count = y.months.reduce((t, m) => t + m.weeks.reduce((u, w) => u + w.classes.length, 0), 0)
  return {
    key: `y${y.year}`,
    label: `Year ${y.year}`,
    title: y.year === 1 ? '1st Year' : y.year === 2 ? '2nd Year' : `Year ${y.year}`,
    sub: count ? `${count} lessons` : 'Coming soon',
    months: y.months.map((m) => ({
      key: `y${y.year}-${m.month}`,
      label: `Month ${m.month}`,
      sub: '',
      weeks: m.weeks.map((w) => ({ week: w.week, items: w.classes.map((c) => ({ title: c.title, course: c.course, accent: c.strand, number: c.n, ready: c.ready })) })),
    })),
  }
})

export default function HadithLearningPage() {
  return (
    <ProgramLearningPreview
      meta={{ title: 'My Learning · Hadith Specialization', description: 'The Hadith Specialization year by year and month by month.' }}
      kicker="Hadith Specialization · My Learning"
      title="The programme, month by month"
      lead="Twelve months a year, four classes a week: the Introduction to Uṣūl al-Ḥadīth first, then one muṣṭalaḥ lesson (Nukhbat al-Fikar, then Tadrīb al-Rāwī) and one lesson of a companion course in turn. This is the plan enrolled students follow in My Learning."
      periodLabel="Year"
      periods={periods}
      enrolHref={HADITH_PROGRAM_ENROL}
      backHref="/hadith-specialization"
      backLabel="About the Hadith Specialization"
      stats={[['Duration', '2 years'], ['Each week', '4 classes'], ['Lessons so far', String(classes)]]}
    />
  )
}
