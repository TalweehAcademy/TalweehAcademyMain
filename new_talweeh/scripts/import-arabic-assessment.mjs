// Builds src/data/arabicAssessmentBank.js from a CSV of the Arabic assessment's questions.
//
//   npm run assessment:import -- ./arabic-assessment-questions.csv
//
// The CSV comes from Legacy (talweeh-academic-system: `node --env-file=.env.local
// scripts/export-arabic-assessment.mjs`), where teachers edit the bank; its columns are id, module, topic,
// question, arabic, source, correct, wrong1–wrong4, explanation, mandatory, active (others are ignored).
// The site stays static: the bank ships in the bundle, so re-import and redeploy after the questions change.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const input = process.argv[2]
if (!input) { console.error('Usage: npm run assessment:import -- <questions.csv>'); process.exit(1) }

// CSV or TSV: quoted fields, escaped quotes, line breaks inside quotes, BOM, CRLF (as Legacy's csv.ts).
function parseDelimited(source) {
  const text = source.replace(/^﻿/, '')
  const delimiter = (text.split(/\r?\n/, 1)[0] ?? '').includes('\t') ? '\t' : ','
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1 } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"' && field === '') quoted = true
    else if (char === delimiter) { row.push(field); field = '' } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field); rows.push(row); row = []; field = ''
    } else field += char
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.filter((cells) => cells.some((cell) => cell.trim()))
}

const TOPICS = new Set(['parts', 'roles', 'sentences', 'sciences', 'concepts', 'conjugation', 'voice', 'patterns', 'tarkib', 'reading', 'irab', 'signs', 'mansubat', 'vocalisation', 'definitions', 'nuhat', 'sarf', 'weak', 'advanced', 'passage', 'vocabulary', 'quran-irab', 'balaghah'])
const rows = parseDelimited(fs.readFileSync(input, 'utf8'))
const header = rows[0].map((cell) => cell.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
const col = (name) => header.indexOf(name)
for (const name of ['id', 'module', 'question', 'correct', 'wrong1']) if (col(name) < 0) { console.error(`Missing column: ${name}`); process.exit(1) }

const stages = [[], [], [], [], []]
const problems = []
const seen = new Set()
rows.slice(1).forEach((cells, index) => {
  const get = (name) => (col(name) >= 0 ? (cells[col(name)] ?? '').trim() : '')
  const line = index + 2
  if (/^(no|n|false|0)$/i.test(get('active'))) return
  const id = get('id'), stage = Number(get('module')), topic = get('topic') || 'concepts'
  const options = [get('correct'), ...['wrong1', 'wrong2', 'wrong3', 'wrong4'].map(get).filter(Boolean)]
  const problem = !id ? 'no id' : seen.has(id) ? 'duplicate id'
    : !(stage >= 1 && stage <= 5) ? `module “${get('module')}” is not 1–5`
    : !get('question') ? 'empty question' : !options[0] ? 'empty correct answer' : options.length < 2 ? 'no wrong answer'
    : new Set(options).size !== options.length ? 'two answers are the same'
    : !TOPICS.has(topic) ? `unknown topic “${topic}”` : null
  if (problem) { problems.push(`Row ${line}: ${problem}.`); return }
  seen.add(id)
  const question = { id, t: topic, p: get('question'), o: options, e: get('explanation') }
  if (get('arabic')) question.a = get('arabic')
  if (get('source')) question.s = get('source')
  if (/^(yes|y|true|1|mandatory)$/i.test(get('mandatory'))) question.m = 1
  stages[stage - 1].push(question)
})
if (problems.length) { console.error(`Not imported; fix these rows first:\n${problems.join('\n')}`); process.exit(1) }
const empty = stages.flatMap((questions, i) => (questions.length ? [] : [i + 1]))
if (empty.length) { console.error(`Module ${empty.join(', ')} has no active questions.`); process.exit(1) }

const out = path.join(root, 'src/data/arabicAssessmentBank.js')
fs.writeFileSync(out, `// AUTO-GENERATED — DO NOT EDIT BY HAND. Built by scripts/import-arabic-assessment.mjs from ${path.basename(input)}.
// The Arabic assessment's question bank, one array per stage (module 1–5). Each question: id, t topic, p prompt,
// a Arabic (optional), s source (optional), o options (the correct one first), e explanation, m mandatory.
export const ARABIC_ASSESSMENT_BANK = ${JSON.stringify(stages)}
`)
console.log(`Wrote ${stages.flat().length} questions (${stages.map((q, i) => `module ${i + 1}: ${q.length}`).join(', ')}) to ${path.relative(root, out)}.`)
