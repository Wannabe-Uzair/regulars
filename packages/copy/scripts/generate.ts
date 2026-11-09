// Builds src/catalogue.generated.ts from ../COPY.md, so every string on screen comes from the copy deck.
// Table rows "| some.id | Text | ... |" become 'some.id': 'Text'; in tables whose header has a "definition"
// column, that cell becomes 'some.id.def'. Lines "`some.id` — "Text" (note)" are read too.
// Run it with `npm run generate`; edit COPY.md, never the generated file.
import fs from 'node:fs'
import path from 'node:path'

const ID = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_{}-]+)+$/
const clean = (s: string): string =>
  s.trim().replace(/^`(.*)`$/, '$1').replace(/^"(.*)"$/, '$1').replace(/\\\|/g, '|').trim()

export function parseCopy(md: string): Map<string, string> {
  const out = new Map<string, string>()
  const add = (id: string, text: string): void => {
    if (out.has(id)) throw new Error(`copy: duplicate id "${id}" in COPY.md`)
    out.set(id, text)
  }
  let defCol = -1
  for (const line of md.split('\n')) {
    const inline = line.match(/^`([a-z][\w.{}-]+)`\s+—\s+"(.*?)"/)
    if (inline?.[1] !== undefined && inline[2] !== undefined && ID.test(inline[1])) {
      add(inline[1], inline[2])
      continue
    }
    if (!line.trim().startsWith('|')) {
      defCol = -1
      continue
    }
    const cells = line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim())
    if (cells.every((c) => /^-+$/.test(c.replace(/:/g, '')))) continue
    const id = clean(cells[0] ?? '')
    if (!ID.test(id)) {
      defCol = cells.findIndex((c) => /definition/i.test(c)) // a header row
      continue
    }
    if (cells.length > 1) add(id, clean(cells[1] ?? ''))
    const def = cells[defCol]
    if (defCol > 1 && def) add(`${id}.def`, clean(def))
  }
  return out
}

const quote = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

export function renderCatalogue(md: string): string {
  const entries = [...parseCopy(md)].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const body = entries.map(([id, text]) => `  ${quote(id)}: ${quote(text)},`).join('\n')
  return `// Generated from COPY.md by scripts/generate.ts. Do not edit; edit COPY.md and run \`npm run generate\`.
export const catalogue = {
${body}
} as const
`
}

if (import.meta.main) {
  const here = path.dirname(new URL(import.meta.url).pathname)
  const md = fs.readFileSync(path.join(here, '../COPY.md'), 'utf8')
  try {
    const text = renderCatalogue(md)
    fs.writeFileSync(path.join(here, '../src/catalogue.generated.ts'), text)
    console.log(`copy: ${text.split('\n').filter((l) => l.startsWith("  '")).length} strings from COPY.md`)
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
}
