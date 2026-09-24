import fs from 'node:fs/promises'
import path from 'node:path'

function readStoredZip(buffer) {
  const files = new Map()
  let offset = 0
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const flags = buffer.readUInt16LE(offset + 6)
    const method = buffer.readUInt16LE(offset + 8)
    const compressedSize = buffer.readUInt32LE(offset + 18)
    const uncompressedSize = buffer.readUInt32LE(offset + 22)
    const nameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLength + extraLength
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8')
    if (flags & 0x08) throw new Error(`Unsupported ZIP data-descriptor entry: ${name}`)
    if (method !== 0) throw new Error(`Unsupported compressed ZIP entry: ${name}. Re-create the snapshot with stored entries.`)
    const size = compressedSize || uncompressedSize
    files.set(name, buffer.subarray(dataStart, dataStart + size))
    offset = dataStart + size
  }
  return files
}

const rows = (value) => Array.isArray(value) ? value : []
const obj = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const clean = (value) => String(value ?? '').trim()
const pad3 = (value) => String(Number(value)).padStart(3, '0')
const clone = (value) => JSON.parse(JSON.stringify(value))

function jsonFrom(zip, name, required = true) {
  const raw = zip.get(name)
  if (!raw) {
    if (!required) return null
    throw new Error(`${name} was not found in this snapshot.`)
  }
  return JSON.parse(raw.toString('utf8'))
}

function verseKeyOf(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return clean(value.verseKey || value.targetKey)
  return ''
}

function isKeyInRange(key, surah, fromAyah, toAyah) {
  const [s, a] = clean(key).split(':').map(Number)
  return s === surah && Number.isInteger(a) && a >= fromAyah && a <= toAyah
}

function rowInRange(row, surah, fromAyah, toAyah) {
  const key = clean(row?.targetKey || row?.verseKey)
  if (key) return isKeyInRange(key, surah, fromAyah, toAyah)
  const s = Number(row?.surahNumber)
  const a = Number(row?.ayahNumber)
  return s === surah && Number.isInteger(a) && a >= fromAyah && a <= toAyah
}

function mergeById(currentRows, incomingRows) {
  const map = new Map()
  for (const row of rows(currentRows)) {
    const key = clean(row?.id || row?.slug || row?.rootArabic || JSON.stringify(row))
    map.set(key, row)
  }
  for (const row of rows(incomingRows)) {
    const key = clean(row?.id || row?.slug || row?.rootArabic || JSON.stringify(row))
    map.set(key, row)
  }
  return [...map.values()]
}

function emptyDraft() {
  return { translationId: '', rabt: [], translations: [], irab: [], vocab: [], fawaid: [] }
}

function mergePortal(currentRaw, incomingRaw, scope) {
  const current = clone(currentRaw || { schemaVersion: 3, surah: {}, verses: {}, words: {} })
  const incoming = clone(incomingRaw || {})
  const { surah, fromAyah, toAyah } = scope
  current.schemaVersion = 3

  // Surah-level study material is authoritative when the imported range begins at ayah 1.
  if (!current.surah || !Object.keys(current.surah).length || fromAyah === 1) {
    current.surah = incoming.surah || current.surah || { number: surah, legacy: null, sections: [] }
  }
  if (!current.surah?.number) current.surah = { ...obj(current.surah), number: surah }

  const currentVerses = obj(current.verses)
  const incomingVerses = obj(incoming.verses)
  const drafts = { ...obj(currentVerses.drafts) }
  for (let ayah = fromAyah; ayah <= toAyah; ayah += 1) delete drafts[`${surah}:${ayah}`]
  for (const [key, value] of Object.entries(obj(incomingVerses.drafts))) {
    if (isKeyInRange(key, surah, fromAyah, toAyah)) drafts[key] = value
  }
  // Snapshot coverage is explicit even when a particular ayah has no authored Study field yet.
  for (let ayah = fromAyah; ayah <= toAyah; ayah += 1) {
    const key = `${surah}:${ayah}`
    if (!Object.prototype.hasOwnProperty.call(drafts, key)) drafts[key] = emptyDraft()
  }

  const keepOutside = (list) => rows(list).filter((row) => !rowInRange(row, surah, fromAyah, toAyah))
  current.verses = {
    ...currentVerses,
    ...incomingVerses,
    drafts,
    sections: [...keepOutside(currentVerses.sections), ...rows(incomingVerses.sections).filter((row) => rowInRange(row, surah, fromAyah, toAyah))],
    sourceLinks: [...keepOutside(currentVerses.sourceLinks), ...rows(incomingVerses.sourceLinks).filter((row) => rowInRange(row, surah, fromAyah, toAyah))],
  }

  const currentWords = obj(current.words)
  const incomingWords = obj(incoming.words)
  current.words = {
    ...currentWords,
    ...incomingWords,
    mappings: [...keepOutside(currentWords.mappings), ...rows(incomingWords.mappings).filter((row) => rowInRange(row, surah, fromAyah, toAyah))],
    irabRecords: [...keepOutside(currentWords.irabRecords), ...rows(incomingWords.irabRecords).filter((row) => rowInRange(row, surah, fromAyah, toAyah))],
    roots: mergeById(currentWords.roots, incomingWords.roots),
    dictionaries: mergeById(currentWords.dictionaries, incomingWords.dictionaries),
    lemmas: mergeById(currentWords.lemmas, incomingWords.lemmas),
    entries: mergeById(currentWords.entries, incomingWords.entries),
    irabTerms: mergeById(currentWords.irabTerms, incomingWords.irabTerms),
  }
  return current
}

function targetInRange(target, scope) {
  return isKeyInRange(verseKeyOf(target), scope.surah, scope.fromAyah, scope.toAyah)
}

function targetIdentity(target) {
  if (typeof target === 'string') return `s:${target}`
  return `o:${clean(target?.verseKey)}:${Number(target?.wordNumber || 0)}:${clean(target?.rootId)}:${clean(target?.wordArabic)}`
}

function mergeTargets(a, b) {
  const out = [], seen = new Set()
  for (const target of [...rows(a), ...rows(b)]) {
    const key = targetIdentity(target)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(target)
  }
  return out
}

function stripRangeFromSource(currentRaw, scope) {
  if (!currentRaw) return null
  const current = clone(currentRaw)
  current.entries = rows(current.entries).map((entry) => {
    const targets = rows(entry.targets)
    if (!targets.length) return entry
    const kept = targets.filter((target) => !targetInRange(target, scope))
    if (!kept.length) return null
    return { ...entry, targets: kept }
  }).filter(Boolean)
  return current
}

function mergeSourceBook(currentRaw, incomingRaw, scope) {
  const stripped = stripRangeFromSource(currentRaw, scope) || { schemaVersion: 3, source: incomingRaw?.source || {}, entries: [] }
  const incoming = clone(incomingRaw || { entries: [] })
  const map = new Map(rows(stripped.entries).map((entry) => [String(entry.id), entry]))
  for (const entry of rows(incoming.entries)) {
    const prior = map.get(String(entry.id))
    map.set(String(entry.id), prior ? { ...prior, ...entry, targets: mergeTargets(prior.targets, entry.targets) } : entry)
  }
  return {
    ...stripped,
    ...incoming,
    schemaVersion: 3,
    source: { ...obj(stripped.source), ...obj(incoming.source) },
    entries: [...map.values()],
  }
}

async function readJsonIfExists(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const input = process.argv[2]
if (!input) {
  console.error('Usage: npm run quran-study:import -- /path/to/talweeh-quran-...-snapshot.zip')
  process.exit(1)
}

const inputPath = path.resolve(input)
const zip = readStoredZip(await fs.readFile(inputPath))
const manifest = jsonFrom(zip, 'snapshot-manifest.json')
if (Number(manifest.schemaVersion) !== 3 || manifest.packageType !== 'talweeh-quran-study') {
  throw new Error('Unsupported Qurʾān Study snapshot. Expected schemaVersion 3 and packageType talweeh-quran-study.')
}
if (manifest.mergeMode !== 'replace-selected-study-range') {
  throw new Error(`Unsupported snapshot mergeMode: ${manifest.mergeMode}`)
}
const scope = {
  surah: Number(manifest.scope?.surah),
  fromAyah: Number(manifest.scope?.fromAyah),
  toAyah: Number(manifest.scope?.toAyah),
}
if (!Number.isInteger(scope.surah) || scope.surah < 1 || scope.surah > 114 || !Number.isInteger(scope.fromAyah) || !Number.isInteger(scope.toAyah) || scope.fromAyah < 1 || scope.toAyah < scope.fromAyah) {
  throw new Error('The snapshot range is invalid.')
}
// The publication sync passes the range it expects (--expect-range=81:1-5); a ZIP whose own range differs is refused.
const expected = process.argv.slice(3).find((arg) => arg.startsWith('--expect-range='))
if (expected) {
  const want = /^--expect-range=(\d+):(\d+)-(\d+)$/.exec(expected)
  if (!want) throw new Error(`Invalid ${expected}`)
  if (Number(want[1]) !== scope.surah || Number(want[2]) !== scope.fromAyah || Number(want[3]) !== scope.toAyah) {
    throw new Error(`Snapshot covers ${scope.surah}:${scope.fromAyah}–${scope.toAyah} but was published as ${want[1]}:${want[2]}–${want[3]}.`)
  }
}

const dir = pad3(scope.surah)
const archiveBase = `surahs/${dir}`
const portalPath = `${archiveBase}/study/portal.json`
const englishPath = `${archiveBase}/study/english.json`
const arabicPath = `${archiveBase}/study/arabic.json`
const sourceManifestPath = `${archiveBase}/sources/manifest.json`
const incomingPortal = jsonFrom(zip, portalPath)
const incomingSourceManifest = jsonFrom(zip, sourceManifestPath)
if (Number(incomingPortal.schemaVersion) !== 3 || Number(incomingSourceManifest.schemaVersion) !== 3) throw new Error('Snapshot payload schema mismatch.')
if (Number(incomingPortal.surah?.number) !== scope.surah) throw new Error('Portal payload sūrah does not match snapshot scope.')

const outputDir = path.resolve('src/quran-study-static', dir)
const outputPortal = path.join(outputDir, 'portal.json')
const outputSources = path.join(outputDir, 'sources')
const currentPortal = await readJsonIfExists(outputPortal)
const mergedPortal = mergePortal(currentPortal, incomingPortal, scope)
await writeJson(outputPortal, mergedPortal)

// Preserve language exports for audit/debugging even though the public bridge reads portal.json.
const english = jsonFrom(zip, englishPath, false)
const arabic = jsonFrom(zip, arabicPath, false)
if (english) await writeJson(path.join(outputDir, 'study', 'english.json'), english)
if (arabic) await writeJson(path.join(outputDir, 'study', 'arabic.json'), arabic)

const currentManifest = await readJsonIfExists(path.join(outputSources, 'manifest.json'))
const currentBooks = new Map(rows(currentManifest?.books).map((book) => [String(book.id || book.slug), book]))
const importedSlugs = []
for (const book of rows(incomingSourceManifest.books)) {
  const archiveFile = `${archiveBase}/${book.path}`
  const incomingBook = jsonFrom(zip, archiveFile)
  const slug = clean(book.slug || incomingBook.source?.slug)
  if (!slug) throw new Error(`A source book is missing its slug: ${archiveFile}`)
  const outputFile = path.join(outputSources, `${slug}.json`)
  const currentBook = await readJsonIfExists(outputFile)
  const mergedBook = mergeSourceBook(currentBook, incomingBook, scope)
  await writeJson(outputFile, mergedBook)
  importedSlugs.push(slug)
  currentBooks.set(String(book.id || slug), { ...currentBooks.get(String(book.id || slug)), ...book, entryCount: rows(mergedBook.entries).length, path: `sources/${slug}.json` })
}

const mergedManifest = {
  ...(currentManifest || {}),
  ...incomingSourceManifest,
  schemaVersion: 3,
  scope: incomingSourceManifest.scope || manifest.scope,
  books: [...currentBooks.values()].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)),
}
await writeJson(path.join(outputSources, 'manifest.json'), mergedManifest)

const localMetaPath = path.join(outputDir, 'snapshot-manifest.json')
const priorMeta = await readJsonIfExists(localMetaPath)
const imports = [...rows(priorMeta?.imports), { snapshotId: manifest.snapshotId, importedAt: new Date().toISOString(), scope: manifest.scope }].slice(-100)
await writeJson(localMetaPath, { ...manifest, imports })

console.log(`Imported Qurʾān Study schema v3 snapshot ${manifest.snapshotId}.`)
console.log(`Coverage: ${scope.surah}:${scope.fromAyah}–${scope.toAyah}`)
console.log(`Study: ${path.relative(process.cwd(), outputPortal)}`)
console.log(`Sources: ${importedSlugs.length} book file(s) in ${path.relative(process.cwd(), outputSources)}`)
console.log('Reader/audio/reciter data was not modified.')
