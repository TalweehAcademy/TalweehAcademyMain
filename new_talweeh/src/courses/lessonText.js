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
  return title.replace(/^lesson\s*\d+\s*[:.–—-]\s*/i, '').trim() || String(raw || '').trim()
}

// "Allāh ﷺ" in the write-ups: ﷺ is the ṣalawāt for the Prophet ﷺ; after Allāh the glorification ﷻ is meant.
const fixHonorifics = (text) => text.replace(/(All[aā]h)\s*ﷺ/g, '$1 ﷻ')

const HEADINGS = { summary: /^summary$/i, terms: /^key\s*terms$/i, notes: /^lesson\s*notes$/i }
const BULLET = /^[•·▪*-]\s+/
const TERM = /^(.+?)\s*\(([^)]*[؀-ۿ][^)]*)\)\s*[—–-]\s*(.+)$/

export function parseLessonOverview(text = '') {
  const lines = fixHonorifics(String(text || '')).split('\n').map((l) => l.trim())
  const out = { summary: [], terms: [], notes: [] }
  let section = 'summary'
  for (const line of lines) {
    if (!line) continue
    const heading = Object.keys(HEADINGS).find((k) => HEADINGS[k].test(line))
    if (heading) { section = heading; continue }
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
