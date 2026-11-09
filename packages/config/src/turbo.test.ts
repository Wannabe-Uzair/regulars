import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

type Task = { inputs?: string[]; outputs?: string[] }
const turbo = JSON.parse(readFileSync(new URL('../../../turbo.json', import.meta.url), 'utf8')) as {
  tasks: Record<string, Task>
}

// The generators read more than their scripts: ui's reads src/tokens.ts. An input list that missed it gave a cache
// hit on `npm run build`, which replayed an old src/tokens.css over a freshly generated one.
test('generate hashes every file in its package apart from its own outputs', () => {
  const { inputs, outputs = [] } = turbo.tasks.generate ?? {}
  expect(outputs).toEqual(['src/catalogue.generated.ts', 'src/tokens.css'])
  expect(inputs).toEqual(['$TURBO_DEFAULT$', ...outputs.map((file) => `!${file}`)])
})
