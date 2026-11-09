/**
 * The hero clip's words against packages/copy/COPY.md: each word in src/hero/words.ts must be its id's entry there
 * (every word lives in COPY.md). Run by build-hero.sh before it renders: `node check-hero.ts`. Exits 1 on a mismatch.
 */
import { readFileSync } from 'node:fs'
import { words } from './src/hero/words.ts'

const copy = readFileSync(new URL('../../packages/copy/COPY.md', import.meta.url), 'utf8')
const entries = new Map(
  copy
    .split('\n')
    .map((line) => /^\| ([a-z0-9.]+) \| ([^|]+?) \|/i.exec(line))
    .filter((m) => m !== null)
    .map((m) => [m[1]!, m[2]!] as const),
)
const problems = Object.entries(words)
  .filter(([id, word]) => entries.get(id) !== word)
  .map(([id, word]) => `${id}: the clip says "${word}", COPY.md says "${entries.get(id) ?? '(no entry)'}"`)
if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`check-hero: ${Object.keys(words).length} words match COPY.md`)
