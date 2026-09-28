/* eslint-disable react/prop-types */
// /arabic/assessment — "Where should you start?": the Arabic Program's placement assessment, as in the Student
// Portal (Legacy: components/student/ArabicAssessment.tsx). Five stages, one per module; a run draws
// QUESTIONS_PER_STAGE at random from each stage (mandatory ones always) and shuffles the options. Missing
// MISSES_TO_ADVISE in one stage stops the run and suggests that stage's module; finishing every stage → Module 5.
// It runs entirely in the browser; answers stay in localStorage. The bank is src/data/arabicAssessmentBank.js,
// generated from Legacy's question bank (npm run assessment:import). Styles: arabic-assessment-v1.css (aas-*).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WahaPage } from '../components/WahaShell'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { ARABIC_PROGRAM_ENROL } from '../constants/links'
import { ARB } from '../data/arabicWaha'
import { ARABIC_ASSESSMENT_BANK } from '../data/arabicAssessmentBank'
import '../arabic-assessment-v1.css'

const QUESTIONS_PER_STAGE = 10
const MISSES_TO_ADVISE = 3
const KEY = 'talweeh:arabic-assessment:public:v1'

const STAGE_INFO = [
  { title: 'First principles', summary: 'The three kinds of word, doer and object, the nominal sentence, ṣarf and naḥw, and first concepts like the ḥāl.' },
  { title: 'Verbs and structure', summary: 'Tense and conjugation, the passive, the mazīd fīhi patterns, tarkīb, and reading narrative sentences.' },
  { title: 'Iʿrāb and the ḥarakāt', summary: 'Full iʿrāb with its signs, ḥāl, tamyīz and the other manṣūbāt, and vowelling unvowelled sentences.' },
  { title: 'Grammarians, ṣarf and texts', summary: 'Baṣran and Kūfan positions, iʿlāl and ibdāl, weak verbs, advanced naḥw, short texts and vocabulary.' },
  { title: 'The Qurʾān', summary: 'Iʿrāb and balāghah of āyāt from Juzʾ ʿAmma, centred on Sūrat al-Takwīr.' },
]

const TOPIC_LABELS = {
  parts: 'Ism, fiʿl and ḥarf', roles: 'Fāʿil and mafʿūl', sentences: 'Nominal and verbal sentences', sciences: 'Ṣarf and naḥw',
  concepts: 'Basic concepts (ḥāl, naʿt, number, gender)', conjugation: 'Verb tense and conjugation', voice: 'Active and passive (maʿlūm / majhūl)',
  patterns: 'Mazīd fīhi verb patterns', tarkib: 'Tarkīb (sentence structure)', reading: 'Reading comprehension', irab: 'Full iʿrāb',
  signs: 'Signs of iʿrāb (ʿalāmāt)', mansubat: 'Ḥāl, tamyīz and the manṣūbāt', vocalisation: 'Adding the ḥarakāt', definitions: 'Naḥw and ṣarf in detail',
  nuhat: 'Views of the grammarians', sarf: 'Advanced ṣarf (iʿlāl, ibdāl, derived forms)', weak: 'Weak verbs', advanced: 'Advanced naḥw',
  passage: 'Passage iʿrāb', vocabulary: 'Vocabulary', 'quran-irab': 'Iʿrāb of Qurʾānic āyāt', balaghah: 'Balāghah (rhetoric)',
}

// After passing every stage: the next texts in the public catalogue.
const NEXT_STEPS = [
  { slug: 'sharh-qatr-al-nada-wa-ball-al-sada', title: 'Sharḥ Qaṭr al-Nadā wa-Ball al-Ṣadā', why: 'The next step in naḥw: Ibn Hishām’s text, bringing in the differences between the grammarians.' },
  { slug: 'introduction-to-hanafi-fiqh', title: 'Introduction to Ḥanafī Fiqh', why: 'Begin fiqh with the foundations of the Ḥanafī school.' },
  { slug: 'nur-al-idah', title: 'Nūr al-Īḍāḥ', why: 'Al-Shurunbulālī’s classic Ḥanafī primer on the fiqh of worship.' },
  { slug: 'nukhbat-al-fikr', title: 'Nukhbat al-Fikar', why: 'Ibn Ḥajar’s concise text on uṣūl al-ḥadīth.' },
]

// Arabic options (Arabic letters, no Latin) are set right-to-left in the Arabic face.
const isArabic = (text) => /[؀-ۿ]/.test(text) && !/[A-Za-z]/.test(text)
const STAGES = ARABIC_ASSESSMENT_BANK.map((questions, i) => ({ number: i + 1, module: i + 1, ...STAGE_INFO[i], questions }))
const BY_ID = new Map(STAGES.flatMap((stage) => stage.questions.map((question) => [question.id, { question, stage }])))
const BANK_SIZE = BY_ID.size

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function drawRun() {
  const ids = STAGES.flatMap((stage) => {
    const mandatory = stage.questions.filter((question) => question.m)
    const rest = shuffle(stage.questions.filter((question) => !question.m))
    return shuffle([...mandatory, ...rest.slice(0, Math.max(0, QUESTIONS_PER_STAGE - mandatory.length))]).map((question) => question.id)
  })
  const order = Object.fromEntries(ids.map((id) => [id, shuffle(BY_ID.get(id).question.o.map((_, index) => index))]))
  return { ids, order }
}

function weakestTopics(topics, limit = 3) {
  const counts = new Map()
  for (const topic of topics) counts.set(topic, (counts.get(topic) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([topic, count]) => ({ topic, label: TOPIC_LABELS[topic] || topic, count }))
}

const EMPTY = { started: false, run: null, index: 0, answers: {}, stop: null, explore: false, done: false }
function load() {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const saved = { ...EMPTY, ...JSON.parse(raw) }
    // A run whose questions are no longer in the bank (edited or removed by teachers) starts fresh.
    return saved.run && saved.run.ids.every((id) => BY_ID.has(id)) ? saved : EMPTY
  } catch { return EMPTY }
}
// The correct option is always the first in the bank (index 0); the page shows a shuffled order.
const isRight = (id, answers) => answers[id] === 0
const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

function Intro({ answeredCount, start }) {
  return (
    <section className="aas-intro cw-card">
      <div className="aas-intro-copy">
        <span className="cw-kicker">{STAGES.length * QUESTIONS_PER_STAGE}+ questions · about 15–25 minutes</span>
        <h2>One question at a time, from first principles to Sūrat al-Takwīr</h2>
        <p>You get {QUESTIONS_PER_STAGE} questions from each of five stages, drawn at random from a bank of {BANK_SIZE}, so every attempt is different. You’ll see straight away whether each answer is right, and why. If you miss {MISSES_TO_ADVISE} in one stage, we’ll suggest the module to start with. You can always keep going to see the rest.</p>
        <div className="aas-acts">
          <button type="button" className="wh-btn wh-btn-g" onClick={() => start(false)}>{answeredCount ? 'Continue the assessment' : 'Start the assessment'} →</button>
          {answeredCount ? <button type="button" className="wh-btn wh-btn-glass" onClick={() => start(true)}>New set of questions</button> : null}
        </div>
        <small>Nothing is graded or shared, and you don’t need an account. Your answers stay in this browser.</small>
      </div>
      <ol className="aas-stages">
        {STAGES.map((stage) => <li key={stage.number}><span>{stage.number}</span><div><strong>{stage.title}</strong><small>{stage.summary}</small></div></li>)}
      </ol>
    </section>
  )
}

export default function ArabicAssessmentPage() {
  useDocumentMeta({ title: 'Arabic Assessment · Where should you start?', description: 'A free, question-by-question check of your Arabic, from recognising an ism to the iʿrāb and balāghah of Sūrat al-Takwīr. It tells you which module of the Two-Year Arabic Program to start with.' })
  const [state, setState] = useState(EMPTY)
  const [ready, setReady] = useState(false)
  useEffect(() => { setState(load()); setReady(true) }, [])
  useEffect(() => { if (ready) try { window.localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage unavailable */ } }, [state, ready])

  const items = useMemo(() => (state.run?.ids ?? []).map((id) => BY_ID.get(id)).filter(Boolean), [state.run])
  const total = items.length
  const current = items[Math.min(state.index, Math.max(0, total - 1))]
  const answeredCount = items.filter(({ question }) => state.answers[question.id] != null).length
  const correctCount = items.filter(({ question }) => isRight(question.id, state.answers)).length
  const showSummary = state.done || (state.stop != null && !state.explore && state.index === state.stop.at)

  const start = useCallback((fresh) => {
    setState((s) => (fresh || !s.run ? { ...EMPTY, started: true, run: drawRun() } : { ...s, started: true }))
    toTop()
  }, [])
  const choose = useCallback((original) => {
    setState((s) => {
      const id = s.run?.ids[s.index]
      return !id || s.answers[id] != null ? s : { ...s, answers: { ...s.answers, [id]: original } }
    })
  }, [])
  const next = useCallback(() => {
    setState((s) => {
      const ids = s.run?.ids ?? []
      const id = ids[s.index]
      if (!id || s.answers[id] == null) return s
      if (!s.explore && !s.stop) {
        const stage = BY_ID.get(id).stage.number
        const misses = ids.filter((other) => BY_ID.get(other).stage.number === stage && s.answers[other] != null && !isRight(other, s.answers)).length
        if (misses >= MISSES_TO_ADVISE) return { ...s, stop: { stage, at: s.index } }
      }
      return s.index >= ids.length - 1 ? { ...s, done: true } : { ...s, index: s.index + 1 }
    })
    toTop()
  }, [])
  const keepGoing = () => setState((s) => ({ ...s, explore: true, index: Math.min(total - 1, s.index + 1), done: s.index >= total - 1 }))

  // Keyboard: 1–4 (or A–D) to answer, Enter to go on.
  const shown = useMemo(() => (current && state.run ? state.run.order[current.question.id] ?? current.question.o.map((_, i) => i) : []), [current, state.run])
  const answered = current ? state.answers[current.question.id] != null : false
  useEffect(() => {
    if (!state.started || showSummary || !current) return undefined
    const onKey = (event) => {
      if (event.target?.closest?.('input, textarea, select')) return
      const position = '1234'.indexOf(event.key) + 1 || 'abcd'.indexOf(event.key.toLowerCase()) + 1
      if (position && !answered && position <= shown.length) { event.preventDefault(); choose(shown[position - 1]) } else if (event.key === 'Enter' && answered) { event.preventDefault(); next() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.started, showSummary, current, answered, shown, choose, next])

  const stageStarts = STAGES.map((stage) => items.findIndex((item) => item.stage.number === stage.number)).filter((i) => i >= 0)
  const bar = total ? (
    <div className="aas-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answeredCount} aria-label="Assessment progress">
      <div className="aas-bar-track"><i style={{ width: `${answeredCount / total * 100}%` }} />{stageStarts.slice(1).map((i) => <b key={i} style={{ left: `${i / total * 100}%` }} aria-hidden="true" />)}</div>
      <div className="aas-bar-meta"><span>{answeredCount} of {total} answered</span><span>{correctCount} correct</span></div>
    </div>
  ) : null

  let body
  if (!state.started || !state.run) body = <Intro answeredCount={answeredCount} start={start} />
  else if (showSummary) {
    const stop = state.stop
    const upTo = stop && !state.done ? stop.at : total - 1
    const attempted = items.slice(0, upTo + 1).filter(({ question }) => state.answers[question.id] != null)
    const missed = attempted.filter(({ question }) => !isRight(question.id, state.answers))
    const finishedAll = !stop && state.done
    const suggested = stop ? STAGES[stop.stage - 1].module : 5
    const stopStage = stop ? STAGES[stop.stage - 1] : null
    const moduleName = (n) => ARB.MODULES[n - 1]?.name
    const weak = weakestTopics(missed.map(({ question }) => question.t))
    body = (
      <>
        {bar}
        <section className={`aas-result${finishedAll ? ' is-top' : ''}`} aria-live="polite">
          <span className="cw-kicker">{finishedAll ? 'Assessment complete' : `${MISSES_TO_ADVISE} missed in “${stopStage?.title}”`}</span>
          <h2>{finishedAll ? 'You’re ready for Module 5, and perhaps beyond' : `We suggest starting with Module ${suggested}`}</h2>
          <p>{finishedAll
            ? `You worked through all ${total} questions, including the iʿrāb and balāghah of the Qurʾān, with ${correctCount} correct. Module 5, ${moduleName(5)}, will sharpen this further; ask the academy about advanced study too.`
            : `Module ${suggested}, ${moduleName(suggested)}. You answered ${attempted.length} questions and got ${attempted.length - missed.length} right. Stage ${stop?.stage}, ${stopStage?.title}, is where the gaps began, so Module ${suggested} is the place to start.`}</p>
          {weak.length ? <div className="aas-weak"><span>Most of your mistakes were in</span>{weak.map((row) => <b key={row.topic}>{row.label}<small>{row.count}</small></b>)}</div> : null}
          <div className="aas-acts">
            <Link className="wh-btn wh-btn-g" to={ARABIC_PROGRAM_ENROL}>Enroll now →</Link>
            <Link className="wh-btn wh-btn-glass" to="/arabic/learning">See Module {suggested}, month by month</Link>
            {!finishedAll && state.index < total - 1 ? <button type="button" className="wh-btn wh-btn-glass" onClick={keepGoing}>Keep going anyway</button> : null}
            <button type="button" className="wh-btn wh-btn-glass" onClick={() => start(true)}>Try a new set</button>
          </div>
        </section>
        {finishedAll ? (
          <section className="aas-next" aria-labelledby="aas-next-title">
            <span className="cw-kicker">Your next step</span>
            <h2 id="aas-next-title">Continue with the classical texts</h2>
            <p>You’ve shown the Arabic to go further. These self-paced courses build on it, beginning with Sharḥ Qaṭr al-Nadā, which brings in the differences between the grammarians.</p>
            <div className="aas-next-grid">
              {NEXT_STEPS.map((course) => (
                <Link key={course.slug} className="aas-next-card cw-card" to={`/courses/${course.slug}`}>
                  <img src={`/catalog-posters/${course.slug}.webp`} alt="" loading="lazy" />
                  <span><strong>{course.title}</strong><small>{course.why}</small><em>View course →</em></span>
                </Link>
              ))}
            </div>
            <Link className="wh-btn wh-btn-glass" to="/courses">Explore all courses</Link>
          </section>
        ) : null}
        {missed.length ? (
          <details className="aas-review cw-card" open>
            <summary><strong>Review your mistakes</strong><small>{missed.length} {missed.length === 1 ? 'question' : 'questions'}, with the right answers</small></summary>
            <ol>
              {missed.map(({ question, stage }) => {
                const chosen = question.o[state.answers[question.id]] ?? ''
                const right = question.o[0]
                return (
                  <li key={question.id}>
                    <span className="aas-review-stage">Stage {stage.number} · {stage.title}</span>
                    <strong>{question.p}</strong>
                    {question.a ? <div className="aas-review-ar" dir="rtl" lang="ar">{question.a}</div> : null}
                    <div className="aas-review-ans">
                      <span className="is-miss">✕ <em dir={isArabic(chosen) ? 'rtl' : undefined}>{chosen}</em></span>
                      <span className="is-right">✓ <em dir={isArabic(right) ? 'rtl' : undefined}>{right}</em></span>
                    </div>
                    {question.e ? <p>{question.e}</p> : null}
                  </li>
                )
              })}
            </ol>
          </details>
        ) : null}
      </>
    )
  } else {
    const { question, stage } = current
    const picked = state.answers[question.id]
    const right = answered && picked === 0
    const stageStart = items.findIndex((item) => item.stage.number === stage.number)
    const stageIds = items.filter((item) => item.stage.number === stage.number).map((item) => item.question.id)
    const stageMisses = stageIds.filter((id) => state.answers[id] != null && !isRight(id, state.answers)).length
    const newStage = state.index > 0 && state.index === stageStart && !answered
    const counting = !state.explore && !state.stop
    body = (
      <>
        {bar}
        {state.explore && state.stop ? <div className="aas-note">Exploring past your suggestion (Module {STAGES[state.stop.stage - 1].module}). These answers don’t change it.</div> : null}
        {newStage ? <div className="aas-toast">✓ <span><b>{STAGES[stage.number - 2]?.title}</b> complete. Now: <b>{stage.title}</b></span></div> : null}
        <section className="aas-card cw-card" key={question.id}>
          <header className="aas-card-head">
            <span className="aas-stage">Stage {stage.number} of {STAGES.length} · {stage.title}</span>
            <span className="aas-pos">
              Question {state.index - stageStart + 1} of {stageIds.length}
              {counting ? <span className="aas-lives" title={`${stageMisses} of ${MISSES_TO_ADVISE} misses in this stage`} aria-label={`${stageMisses} of ${MISSES_TO_ADVISE} misses in this stage`}>{Array.from({ length: MISSES_TO_ADVISE }, (_, i) => <i key={i} className={i < stageMisses ? 'is-miss' : ''} />)}</span> : null}
            </span>
          </header>
          <h2 className="aas-prompt">{question.p}</h2>
          {question.a ? <div className="aas-arabic" dir="rtl" lang="ar">{question.a}</div> : null}
          {question.s ? <small className="aas-source">{question.s}</small> : null}
          <div className="aas-options" role="radiogroup" aria-label="Answers">
            {shown.map((original, position) => {
              const text = question.o[original]
              const ar = isArabic(text)
              const isPicked = picked === original
              const isAnswer = answered && original === 0
              const cls = `aas-opt${ar ? ' is-ar' : ''}${isAnswer ? ' is-answer' : ''}${answered && isPicked && !right ? ' is-miss' : ''}${answered && !isPicked && !isAnswer ? ' is-dim' : ''}`
              return (
                <button key={original} type="button" role="radio" aria-checked={isPicked} disabled={answered} className={cls} onClick={() => choose(original)}>
                  <span className="aas-key" aria-hidden="true">{isAnswer ? '✓' : answered && isPicked ? '✕' : position + 1}</span>
                  <span className="aas-opt-text" dir={ar ? 'rtl' : undefined} lang={ar ? 'ar' : undefined}>{text}</span>
                </button>
              )
            })}
          </div>
          {answered ? (
            <div className={`aas-feedback${right ? ' is-right' : ' is-miss'}`} aria-live="polite">
              <div><strong>{right ? 'Correct' : 'Not quite'}</strong>{question.e ? <p>{question.e}</p> : null}</div>
              <button type="button" className="wh-btn wh-btn-g" onClick={next} autoFocus>{state.index >= total - 1 ? 'See my result' : 'Next question'} ↵</button>
            </div>
          ) : (
            <div className="aas-hint">
              {counting && stageMisses === MISSES_TO_ADVISE - 1
                ? <span className="aas-warn">{MISSES_TO_ADVISE - 1} missed in this stage. One more and we’ll suggest Module {stage.module}.</span>
                : <span>Choose an answer, or press 1–{shown.length}.</span>}
            </div>
          )}
        </section>
        <div className="aas-foot">
          <button type="button" className="aas-link" onClick={() => setState((s) => ({ ...s, started: false }))}>Pause</button>
          <button type="button" className="aas-link" onClick={() => start(true)}>↻ Start over with new questions</button>
        </div>
      </>
    )
  }

  return (
    <WahaPage className="cw aas-page">
      <div className="wh-wrap">
        <section className="aas-hero">
          <Link className="aas-back" to="/arabic">← About the Arabic Program</Link>
          <span className="cw-kicker">Talweeh Arabic · Assessment</span>
          <h1>Where should you start?</h1>
          <p className="lead">A question-by-question check of your Arabic, from recognising an ism to the iʿrāb and balāghah of Sūrat al-Takwīr. It tells you which module to start with.</p>
        </section>
        <div className="aas">{body}</div>
      </div>
    </WahaPage>
  )
}
