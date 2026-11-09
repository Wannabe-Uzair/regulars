// Writes src/tokens.css from src/tokens.ts. Run with `npm run generate` (or `node scripts/generate.ts`).
import { writeFileSync } from 'node:fs'
import { renderTokensCss } from './tokens-css.ts'

const target = new URL('../src/tokens.css', import.meta.url)
writeFileSync(target, renderTokensCss())
console.log(`wrote ${target.pathname}`)
