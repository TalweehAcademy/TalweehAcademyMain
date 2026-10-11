// Lesson titles and lesson write-ups for the free-course lesson page (/courses/:slug).
//
// Titles in the portal follow "Topic | Course Lesson N" (older ones "Lesson N: Topic"); the page shows the topic as
// the heading and "Lesson N of M" above it, so only the topic is kept here.
//
// Write-ups are plain text (courseKit plainText) laid out as "Summary", "Key terms" (• Term (عربي) — meaning) and
// "Lesson notes" (short heading lines, paragraphs and • points). Text without those headings is all summary.

export function cleanLessonTitle(raw = '') {
  let title = String(raw || '').trim()
  const parts = title.split('|').map((p) => p.trim()).filter(Boolean)
  if (parts.length > 1 && /lesson\s*\d+\s*$/i.test(parts[parts.length - 1])) title = parts.slice(0, -1).join(' | ')
  else if (parts.length > 1 && /^lesson\s*\d+$/i.test(parts[0])) title = parts.slice(1).join(' | ')
  // "Al-Tuḥfat al-Saniyyah Lesson 3" (no topic): the course name is already on the page.
  const bare = parts.length === 1 && title.match(/\blesson\s*(\d+)\s*$/i)
  if (bare) return `Lesson ${bare[1]}`
  return title.replace(/^lesson\s*\d+\s*[:.–—-]\s*/i, '').trim() || String(raw || '').trim()
}

// Lines carried over from the YouTube descriptions: links, "like, share and subscribe", "Access the full … course 📚 /
// Click the link below to enroll" (pointing at the old WordPress pages), sign-up, live-stream and social media notices.
const PROMO = [
  /https?:\/\/|www\.\w/i,
  /like,? share,? (and|&) subscribe/i,
  /access the full .*course/i,
  /click the link below/i,
  /^(for (more|further)\b.*(content|courses)|sign up for the entire course|for the full course,? sign up|to enroll in our|don['’]t (forget|miss out)|see you in class|for a full 2.year arabic program)/i,
  /^join (us|our)\b.*(live|course|class|telegram|whatsapp)/i,
  /(to|join) .*(attend|access) (our|the) live|telegram group|streamed live every|live stream\s*\|/i,
  /^(telegram|twitter|x|instagram|youtube|facebook|website|whatsapp)\s*:/i,
  /^#\S+(\s+#\S+)*$/,
]
export const isPromoLine = (line) => PROMO.some((re) => re.test(line))
// Lines that open a block of such text (a list of related courses, YouTube chapter times, social links): everything
// after them is left out up to the next heading.
const PROMO_BLOCK = /related courses at talweeh|^chapters:?$|stay connected with us|^follow us\b/i

// "Allāh ﷺ" in the write-ups: ﷺ is the ṣalawāt for the Prophet ﷺ; after Allāh the glorification ﷻ is meant.
const fixHonorifics = (text) => text.replace(/(All[aā]h)\s*ﷺ/g, '$1 ﷻ')

const HEADINGS = { summary: /^summary$/i, terms: /^key\s*terms$/i, notes: /^(lesson\s*notes|takeaways:?)$/i }
const BULLET = /^[•·▪*-]\s+/
const TERM = /^(.+?)\s*\(([^)]*[؀-ۿ][^)]*)\)\s*[—–-]\s*(.+)$/

export function parseLessonOverview(text = '') {
  const lines = fixHonorifics(String(text || '')).split('\n').map((l) => l.trim())
  const out = { summary: [], terms: [], notes: [] }
  let section = 'summary'
  let skipping = false
  for (const line of lines) {
    if (!line) continue
    const heading = Object.keys(HEADINGS).find((k) => HEADINGS[k].test(line))
    if (heading) { section = heading; skipping = false; continue }
    if (skipping || PROMO_BLOCK.test(line)) { skipping = true; continue }
    if (isPromoLine(line)) continue
    if (section === 'terms' && BULLET.test(line)) {
      const body = line.replace(BULLET, '')
      const m = body.match(TERM)
      if (m) out.terms.push({ term: m[1].trim(), arabic: m[2].trim(), meaning: m[3].trim() })
      else { const [term, ...rest] = body.split(/\s+[—–-]\s+/); out.terms.push({ term: term.trim(), arabic: '', meaning: rest.join(' — ').trim() }) }
      continue
    }
    if (section === 'notes') {
      if (BULLET.test(line)) { out.notes.push({ type: 'point', text: line.replace(BULLET, '') }); continue }
      // A short line with no closing punctuation is a sub-heading ("The Objectives and Path of Arabic Study").
      if (line.length <= 90 && !/[.:;!?،)"”]$/.test(line)) { out.notes.push({ type: 'heading', text: line }); continue }
      out.notes.push({ type: 'para', text: line })
      continue
    }
    out[section].push(section === 'terms' ? { term: line, arabic: '', meaning: '' } : line)
  }
  return out
}

// One line for a lesson card in the course's lesson list: the summary (without its "Summary" heading), else the
// first paragraph of the notes.
export function lessonCardText(text = '') {
  const { summary, notes } = parseLessonOverview(text)
  return (summary.length ? summary.join(' ') : notes.find((n) => n.type === 'para')?.text || '').trim()
}
