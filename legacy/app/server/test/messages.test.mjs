import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { MSG } from '../messages.mjs'

test('the API sentences COPY.md §16 defines are verbatim in messages.mjs', () => {
  const copy = readFileSync(new URL('../../COPY.md', import.meta.url), 'utf8')
  const api = copy.slice(copy.indexOf('### From the API'), copy.indexOf('### Client validation'))
  const sentences = [...api.matchAll(/^\| [^|]+ \| (.+?) \|$/gm)].map((m) => m[1]).filter((s) => s !== 'Text' && !s.startsWith('---'))
  assert.equal(sentences.length, 8)
  for (const s of sentences) assert.ok(Object.values(MSG).includes(s), s)
})

test('routes take every user-facing sentence from messages.mjs', () => {
  const dir = new URL('../routes/', import.meta.url)
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8')
    assert.doesNotMatch(src, /fail\(\d+, ['"`]|message: ['"`]|error: ['"`]/, f)
  }
})
