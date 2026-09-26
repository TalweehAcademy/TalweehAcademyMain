// /arabic/learning — the Two-Year Arabic Program's "My Learning", previewed: all five modules, month by month,
// every lesson locked until enrolment (ProgramLearningPreview).
import ProgramLearningPreview from '../components/ProgramLearningPreview'
import { ARABIC_PLAN } from '../data/programLearningPlans'
import { ARABIC_PROGRAM_ENROL } from '../constants/links'

const lessons = ARABIC_PLAN.modules.reduce((s, mo) => s + mo.months.reduce((t, m) => t + m.weeks.reduce((u, w) => u + w.items.filter((i) => i.kind === 'lesson').length, 0), 0), 0)

const periods = ARABIC_PLAN.modules.map((mo) => ({
  key: `m${mo.n}`,
  label: `Module ${mo.n}`,
  title: mo.title,
  sub: mo.duration,
  months: mo.months.map((m) => ({
    key: `m${mo.n}-${m.month}`,
    label: `Month ${m.month}`,
    sub: `Programme month ${m.programmeMonth}`,
    weeks: m.weeks.map((w) => ({ week: w.week, items: w.items.map((i) => (i.kind === 'note' ? { note: true, title: i.title } : { title: i.title, ready: i.ready })) })),
  })),
}))

export default function ArabicLearningPage() {
  return (
    <ProgramLearningPreview
      meta={{ title: 'My Learning · Two-Year Arabic Program', description: 'The whole Two-Year Arabic Program, module by module and month by month.' }}
      kicker="Two-Year Arabic Program · My Learning"
      title="The whole programme, month by month"
      lead="Five modules over two years, from your first Arabic sentence to linguistic tafsīr. This is the plan enrolled students follow in My Learning: each week’s lessons, with quizzes, worksheets and saved progress in the Student Portal."
      periodLabel="Module"
      periods={periods}
      enrolHref={ARABIC_PROGRAM_ENROL}
      backHref="/arabic"
      backLabel="About the Arabic Program"
      stats={[['Modules', '5'], ['Duration', '24 months'], ['Lessons', String(lessons)]]}
    />
  )
}
