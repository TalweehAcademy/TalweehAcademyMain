import fs from 'node:fs'
import path from 'node:path'

const VIRTUAL_ID = 'virtual:talweeh-cms-snapshot'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

function scanMatch(source, start, open, close) {
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i], next = source[i + 1]
    if (lineComment) { if (ch === '\n') lineComment = false; continue }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1 }; continue }
    if (quote) {
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

function relativeImport(id, root) {
  const bridge = path.join(root, 'src', 'data', 'cmsBridge.js')
  let rel = path.relative(path.dirname(id.split('?')[0]), bridge).replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = './' + rel
  return rel
}

function wrapFirstInitializer(code, pattern, wrapper, importPath, validator = null) {
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
  const re = new RegExp(pattern.source, flags)
  let match
  while ((match = re.exec(code))) {
    const eqEnd = match.index + match[0].length
    let start = eqEnd
    while (/\s/.test(code[start] || '')) start += 1
    const open = code[start]
    if (open !== '[' && open !== '{') continue
    const close = open === '[' ? ']' : '}'
    const end = scanMatch(code, start, open, close)
    if (end < 0) continue
    const initializer = code.slice(start, end + 1)
    if (validator && !validator(initializer)) continue
    let next = code.slice(0, start) + `${wrapper}(${initializer})` + code.slice(end + 1)
    next = `import { ${wrapper} } from ${JSON.stringify(importPath)};\n` + next
    return next
  }
  return null
}

function wrapMediaInitializer(code, wrapper, importPath) {
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*/g
  let m
  while ((m = re.exec(code))) {
    let start = m.index + m[0].length
    while (/\s/.test(code[start] || '')) start += 1
    if (code[start] !== '[') continue
    const end = scanMatch(code, start, '[', ']')
    if (end < 0) continue
    const init = code.slice(start, end + 1)
    if (!/\bslug\s*:/.test(init) || !/\btitle\s*:/.test(init) || !/(youtube|video|youtu\.be|youtube\.com)/i.test(init)) continue
    let next = code.slice(0, start) + `${wrapper}(${init})` + code.slice(end + 1)
    return `import { ${wrapper} } from ${JSON.stringify(importPath)};\n` + next
  }
  return null
}

export function talweehCmsPlugin() {
  let root = process.cwd()
  return {
    name: 'talweeh-cms-static-bridge',
    enforce: 'pre',
    configResolved(config) { root = config.root || root },
    resolveId(id) { if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null
      const file = path.join(root, '.talweeh-cms', 'snapshot.json')
      let value = '{}'
      try { value = fs.readFileSync(file, 'utf8') } catch {}
      try { JSON.parse(value) } catch { value = '{}' }
      return `export default ${value.trim() || '{}'};`
    },
    transform(code, id) {
      const clean = id.split('?')[0].replace(/\\/g, '/')
      const rel = path.relative(root, clean).replace(/\\/g, '/')
      const imp = relativeImport(clean, root)
      if (rel === 'src/data/articles.js') {
        return wrapFirstInitializer(code, /export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*/, 'mergeCmsArticles', imp, (x) => /\btitle\s*:/.test(x))
      }
      if (rel === 'src/data/instructors.js') {
        return wrapFirstInitializer(code, /export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*/, 'mergeCmsInstructors', imp, (x) => /\b(name|title)\s*:/.test(x))
      }
      if (rel === 'src/content/siteContent.js') {
        return wrapFirstInitializer(code, /export\s+const\s+CONTENT_DEFAULTS\s*=\s*/, 'mergeCmsContentDefaults', imp)
      }
      if (rel === 'src/data/publicCourseCatalog.js') {
        return wrapFirstInitializer(code, /export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*/, 'mergeCmsCourses', imp, (x) => /\bslug\s*:/.test(x) && /\btitle\s*:/.test(x))
      }
      if (rel === 'src/pages/media.jsx') {
        return wrapMediaInitializer(code, 'mergeCmsMedia', imp)
      }
      return null
    },
  }
}
