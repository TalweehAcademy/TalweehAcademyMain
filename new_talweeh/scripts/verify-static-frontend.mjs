#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const failures = []

async function exists(relativePath) {
  try {
    await fs.access(path.join(root, relativePath))
    return true
  } catch {
    return false
  }
}

async function walk(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!(await exists(relativePath))) return []
  const files = []
  for (const entry of await fs.readdir(absolute, { withFileTypes: true })) {
    const child = path.join(relativePath, entry.name)
    if (entry.isDirectory()) files.push(...await walk(child))
    else if (entry.isFile()) files.push(child)
  }
  return files
}

for (const forbiddenDirectory of ['server', 'api', 'netlify/functions', 'functions', 'supabase', 'prisma']) {
  if (await exists(forbiddenDirectory)) failures.push(`forbidden backend directory: ${forbiddenDirectory}`)
}

const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) }
for (const dependency of Object.keys(dependencies)) {
  if (/^(?:@supabase\/|firebase(?:-|$)|mysql2?$|pg$|@prisma\/|prisma$|express$|stripe$)/i.test(dependency)) {
    failures.push(`forbidden backend dependency: ${dependency}`)
  }
}

const runtimeFiles = [
  ...await walk('src'),
  ...await walk('dist'),
  'index.html',
].filter((file, index, all) => all.indexOf(file) === index && /\.(?:html?|m?js|jsx|cjs|json|css)$/i.test(file))

const forbiddenContent = [
  { label: 'Supabase host', pattern: /[a-z0-9-]+\.supabase\.co/i },
  { label: 'Supabase client', pattern: /@supabase\/|createBrowserClient\s*\(|createClient\s*\([^)]*SUPABASE/i },
  { label: 'privileged database key', pattern: /SUPABASE_SERVICE_ROLE_KEY|service[_-]?role[_-]?key/i },
  { label: 'public-site backend environment variable', pattern: /(?:VITE|NEXT_PUBLIC)_[A-Z0-9_]*(?:DATABASE|SUPABASE|BACKEND|API_KEY)/i },
  { label: 'Netlify serverless function', pattern: /\/\.netlify\/functions\//i },
  { label: 'Talweeh runtime API call', pattern: /fetch\s*\(\s*[`'"]https?:\/\/(?:portal|alimiyyah)\.talweehacademy\.com\/api\//i },
  { label: 'relative runtime API call', pattern: /fetch\s*\(\s*[`'"]\/?api\//i },
]

for (const relativePath of runtimeFiles) {
  let source
  try { source = await fs.readFile(path.join(root, relativePath), 'utf8') } catch { continue }
  for (const check of forbiddenContent) {
    if (check.pattern.test(source)) failures.push(`${check.label}: ${relativePath}`)
  }
}

if (failures.length) {
  console.error('STATIC FRONTEND VERIFICATION FAILED')
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Static frontend verification passed: no Talweeh runtime backend or database client detected.')
