import fs from 'node:fs'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:talweeh-cms-snapshot'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

// Every source export this plugin overlays, and the wrapper it applies.
//
// This table is a contract. Rename a file or an export without updating it and
// the binding stops applying: CMS content silently goes stale while the build
// stays green. The buildEnd assertion below turns that into a build failure.
//
// Courses are deliberately absent. The course pages read the generated
// publicCourseIndex.js / publicCourseDetails.js, which are produced outside
// Vite, so courses are merged in scripts/lib/load-public-courses.mjs instead.
const BINDINGS = [
  { file: 'src/data/articles.js', exportName: 'ARTICLES', wrapper: 'mergeCmsArticles' },
  { file: 'src/data/instructors.js', exportName: 'INSTRUCTORS', wrapper: 'mergeCmsInstructors' },
  { file: 'src/content/siteContent.js', exportName: 'CONTENT_DEFAULTS', wrapper: 'mergeCmsContentDefaults' },
  { file: 'src/data/mediaCatalog.js', exportName: 'MEDIA_ITEMS', wrapper: 'mergeCmsMedia' },
  { file: 'src/data/mediaCatalog.js', exportName: 'MEDIA_CATEGORIES', wrapper: 'mergeCmsMediaCategories' },
]

function relativeImport(id, root) {
  const bridge = path.join(root, 'src', 'data', 'cmsBridge.js')
  let rel = path.relative(path.dirname(id.split('?')[0]), bridge).replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = './' + rel
  return rel
}

// Rewrites `export const X = <expr>` into
//   const __talweehSource_X = <expr>
//   ...
//   export const X = wrapper(__talweehSource_X)
//
// Renaming the declaration and re-exporting a wrapped value at the end of the
// module means the initializer can be any expression. The previous approach
// brace-scanned an object or array literal, which silently did nothing for
// `CONTENT_DEFAULTS = Object.fromEntries(...)` — it starts with an identifier,
// not a brace, so site content was never actually overlaid.
//
// Same-module references (getMediaItem, mediaCategoryLabel, getArticleBySlug,
// getInstructor) all live inside function bodies, so they resolve to the
// wrapped export at call time. Verified: none of these modules reference the
// export at module scope, which would hit the temporal dead zone.
function wrapExport(code, { exportName, wrapper }, importPath) {
  const declaration = new RegExp(`export\\s+const\\s+${exportName}\\s*=`)
  const match = declaration.exec(code)
  if (!match) return null

  const alias = `__talweehSource_${exportName}`
  return (
    `import { ${wrapper} } from ${JSON.stringify(importPath)};\n` +
    code.slice(0, match.index) +
    `const ${alias} =` +
    code.slice(match.index + match[0].length) +
    `\nexport const ${exportName} = ${wrapper}(${alias});\n`
  )
}

export function talweehCmsPlugin() {
  let root = process.cwd()
  let isBuild = false
  const applied = new Set()

  return {
    name: 'talweeh-cms-static-bridge',
    enforce: 'pre',

    configResolved(config) {
      root = config.root || root
      isBuild = config.command === 'build'
    },

    resolveId(id) { if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID },

    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null
      const file = path.join(root, '.talweeh-cms', 'snapshot.json')
      let value = '{}'
      try { value = fs.readFileSync(file, 'utf8') } catch { /* no snapshot: committed content is used */ }
      try { JSON.parse(value) } catch { value = '{}' }
      return `export default ${value.trim() || '{}'};`
    },

    transform(code, id) {
      const clean = id.split('?')[0].replace(/\\/g, '/')
      const rel = path.relative(root, clean).replace(/\\/g, '/')
      const bindings = BINDINGS.filter((binding) => binding.file === rel)
      if (!bindings.length) return null

      const importPath = relativeImport(clean, root)
      let output = code
      for (const binding of bindings) {
        const next = wrapExport(output, binding, importPath)
        if (next) {
          output = next
          applied.add(`${binding.file}:${binding.wrapper}`)
        }
      }
      return output === code ? null : output
    },

    // A binding that stops matching is invisible at runtime: the page just
    // renders committed content forever. Make it a build failure instead.
    // Build only — in dev, modules are transformed lazily on request, so an
    // untouched file proves nothing.
    buildEnd(error) {
      if (error || !isBuild) return
      const missing = BINDINGS
        .filter((binding) => !applied.has(`${binding.file}:${binding.wrapper}`))
        .map((binding) => `  - ${binding.wrapper} did not apply to ${binding.file} ` +
          `(expected "export const ${binding.exportName} = ...")`)

      if (missing.length) {
        this.error(
          'CMS binding failure — the snapshot overlay would silently not apply:\n' +
          missing.join('\n') +
          '\n\nThe file was renamed, the export was renamed, or it is no longer a top-level ' +
          '`export const`. Update the BINDINGS table in scripts/vite-cms-plugin.mjs to match.'
        )
      }
    },
  }
}
