// The old messages.test.mjs, ported: the API's sentences are COPY.md's, and no module writes a sentence of its own
// (ARCHITECTURE §5 and §10: errors carry a code, and their message comes from copy).
import { catalogue, has } from '@tenure/copy'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { ERROR_COPY } from '../../platform/http/errors.ts'

const copyMd = fileURLToPath(new URL('../../../../../packages/copy/COPY.md', import.meta.url))
const modulesDir = fileURLToPath(new URL('..', import.meta.url))

test('NFR-COPY-01 the API sentences COPY.md defines are the ones the API sends, verbatim', () => {
  const copy = readFileSync(copyMd, 'utf8')
  // §16's "From the API" and "Also from the API" tables.
  const errors = copy.slice(copy.indexOf('## 16. Errors'))
  const api = errors.slice(0, errors.indexOf('### Pages that'))
  const rows = [...api.matchAll(/^\| (api\.\w+) \| (.+?) \| .*\|$/gm)].map((m) => [m[1] ?? '', m[2]] as const)
  expect(rows.length).toBeGreaterThan(40)
  for (const [id, sentence] of rows) {
    expect(has(id), id).toBe(true)
    if (has(id)) expect(catalogue[id], id).toBe(sentence)
  }
  const defined = new Set<string>(rows.map(([id]) => id))
  for (const id of Object.values(ERROR_COPY)) if (id.startsWith('api.')) expect(defined, id).toContain(id)
})

/** Every non-test .ts file under the API's modules. */
function moduleSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return moduleSources(path)
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') ? [path] : []
  })
}

test('NFR-COPY-01 routes take every user-facing sentence from copy', () => {
  const files = moduleSources(modulesDir)
  expect(files.length).toBeGreaterThan(17)
  for (const file of files) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(/message: ['"`]|error: ['"`]|c\.(json|text)\(\s*['"`]/)
  }
})
