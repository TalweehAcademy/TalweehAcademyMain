// Writes src/quran/dataVersion.js: a fingerprint of everything in public/quran-data/v1. quranData.js adds it to every
// data address (?v=…), so browsers, which keep these files for 30 days, fetch them again as soon as any file changes.
// Called at the end of build-quran-data.mjs and build-quran-layout.mjs.
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function writeDataVersion(root) {
  const dir = path.join(root, 'public', 'quran-data', 'v1')
  const files = (await readdir(dir, { recursive: true, withFileTypes: true })).filter((f) => f.isFile())
    .map((f) => path.join(f.parentPath ?? f.path, f.name)).sort()
  const hash = createHash('sha256')
  for (const f of files) { hash.update(path.relative(dir, f)); hash.update(await readFile(f)) }
  const version = hash.digest('hex').slice(0, 12)
  await writeFile(path.join(root, 'src', 'quran', 'dataVersion.js'), `// Written by scripts/quran-data-version.mjs: a fingerprint of public/quran-data/v1 (${files.length} files).\nexport const DATA_VERSION = '${version}'\n`)
  return version
}
