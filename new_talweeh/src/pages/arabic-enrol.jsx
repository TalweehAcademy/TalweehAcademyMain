// /arabic/enroll — the Two-Year Arabic Program's payment options (ProgramEnrolPage).
import ProgramEnrolPage from '../components/ProgramEnrolPage'

const INCLUDED = [
  'All five modules, from your first Arabic sentence to linguistic tafsīr',
  'Recorded lessons with quizzes, worksheets and saved progress',
  'The study roadmap and module assessments',
  'Resources and notes for every lesson',
]

export default function ArabicEnrolPage() {
  return <ProgramEnrolPage programKey="arabic" title="Two-Year Arabic Program" kicker="Talweeh Arabic · Enrollment" lead="Choose how you would like to pay. Your lessons, quizzes, notes and progress open in the Student Portal as soon as payment is confirmed." included={INCLUDED} backHref="/arabic" backLabel="About the Arabic Program" learningHref="/arabic/learning" />
}
