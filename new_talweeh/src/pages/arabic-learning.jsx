// /arabic/learning — the Two-Year Arabic Program's "My Learning", previewed: all five modules, month by month,
// every lesson locked until enrolment (ProgramLearningPreview).
import ProgramLearningPreview from '../components/ProgramLearningPreview'
import { ARABIC_PLAN } from '../data/programLearningPlans'
import { ARABIC_PROGRAM_ENROL } from '../constants/links'

const lessons = ARABIC_PLAN.modules.reduce((s, mo) => s + mo.months.reduce((t, m) => t + m.weeks.reduce((u, w) => u + w.items.filter((i) => i.kind === 'lesson').length, 0), 0), 0)

// Each lesson as the portal shows it: the book above ("Arabic 101") and the topic as the title. The exported titles
// mix several shapes ("Module 2:9 | Book | Lesson 3: Topic", "Book Lesson 14: Topic", "Book | Lesson 2 | Teacher").
const NOISE = /^(module\s*\d+\s*:\s*\d+|talweeh academy|mufti\b.*|sh\.\s.*|lines?\b.*|verses?\b.*)$/i
function splitTitle(raw) {
  const kept = raw.split('|').map((s) => s.trim()).filter((s) => s && !NOISE.test(s)).join(' | ')
  const m = kept.match(/^(.*?)[\s|]*(?:\(bonus\)\s*)?(?:lesson|chapter)\s*([\d-]+)(?:\s*part\s*\d+)?\s*[:\\]?\s*(?:\|\s*)?(.*)$/i)
  if (!m) return { book: null, topic: raw }
  const book = m[1].replace(/[\s|:]+$/, '').trim() || null
  const topic = m[3].replace(/^[\s:|]+/, '').replace(/\s+(mon|tue|wed|thu|fri|sat|sun)$/i, '').replace(/^\[(.*)\]$/, '$1').trim()
  return { book, topic: topic || `Lesson ${m[2]}` }
}
const bookKey = (book) => book.normalize('NFD').replace(/[\u0300-\u036f'’‘ʿʾ`]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const POSTERS = [
  ['arabic 101', 'arabic-101'], ['sarf', 'arabic-sarf-101'], ['shadharah', 'arabic-al-shadharah-al-dhahabiyyah'], ['qasas', 'arabic-qasas-al-nabiyyin'],
  ['mutammimah', 'mutammimah-al-ajurrumiyyah'], ['qawaid al i', 'al-irab-an-qawaid-al-irab'], ['qawai d al i', 'al-irab-an-qawaid-al-irab'], ['lamiy', 'lamiyyat-abi-talib'], ['laamiy', 'lamiyyat-abi-talib'],
  ['min adab', 'min-adab-al-islam'], ['tuhfat', 'al-tuhfat-al-saniyyah'], ['ilbiri', 'taiyyah-of-al-ilbiri'], ['ilbeeri', 'taiyyah-of-al-ilbiri'],
]
const posterOf = (book) => { const key = book ? bookKey(book) : ''; const hit = key && POSTERS.find(([k]) => key.includes(k)); return hit ? `/catalog-posters/${hit[1]}.webp` : null }

const periods = ARABIC_PLAN.modules.map((mo) => ({
  key: `m${mo.n}`,
  label: `Module ${mo.n}`,
  title: mo.title,
  sub: mo.duration,
  months: mo.months.map((m) => ({
    key: `m${mo.n}-${m.month}`,
    label: `Month ${m.month}`,
    sub: `Programme month ${m.programmeMonth}`,
    weeks: m.weeks.map((w) => ({ week: w.week, items: w.items.map((i) => {
      if (i.kind === 'note') return { note: true, title: i.title }
      const { book, topic } = splitTitle(i.title)
      return { title: topic, course: book ?? mo.title, book, poster: posterOf(book), ready: i.ready }
    }) })),
  })),
}))

export default function ArabicLearningPage() {
  return (
    <ProgramLearningPreview
      programKey="arabic"
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
