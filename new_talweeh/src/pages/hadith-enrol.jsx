// /hadith-specialization/enroll — the Hadith Specialization's payment options (ProgramEnrolPage).
import ProgramEnrolPage from '../components/ProgramEnrolPage'

const INCLUDED = [
  'The whole programme, month by month, in My Learning',
  'Every recorded lesson of its courses: Uṣūl al-Ḥadīth, Nukhbat al-Fikar, Tadrīb al-Rāwī and the companion courses',
  'Lesson quizzes, notes and saved progress',
  'Guided by Sheikh Omer Khurshid and Mufti Daud Khurshid',
]

export default function HadithEnrolPage() {
  return <ProgramEnrolPage programKey="hadith" title="Hadith Specialization" kicker="Hadith Specialization · Enrollment" lead="Pay in full or in monthly installments. Your lessons open in the Student Portal as soon as payment is confirmed." included={INCLUDED} backHref="/hadith-specialization" backLabel="About the Hadith Specialization" learningHref="/hadith-specialization/learning" />
}
