// Builds src/copy.generated.json from ../COPY.md, so every string on screen comes from the copy deck.
// Table rows "| some.id | Text | ... |" become { "some.id": "Text" }; in tables whose header has a "definition"
// column, the third cell becomes "some.id.def". Lines "`some.id` — "Text" (note)" are read too.
// Runs before `npm run dev` and `npm run build`; edit COPY.md, never the JSON.
import fs from 'node:fs'
import path from 'node:path'
const here = path.dirname(new URL(import.meta.url).pathname)
const md = fs.readFileSync(path.join(here, '../../COPY.md'), 'utf8')
const ID = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_{}-]+)+$/
const clean = (s) => s.trim().replace(/^`(.*)`$/, '$1').replace(/^"(.*)"$/, '$1').replace(/\\\|/g, '|').trim()
const out = {}
let defCol = -1
for (const line of md.split('\n')) {
  const inline = line.match(/^`([a-z][\w.{}-]+)`\s+—\s+"(.*?)"/)
  if (inline && ID.test(inline[1])) { out[inline[1]] = inline[2]; continue }
  if (!line.trim().startsWith('|')) { defCol = -1; continue }
  const cells = line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim())
  if (cells.every((c) => /^-+$/.test(c.replace(/:/g, '')))) continue
  const id = clean(cells[0])
  if (!ID.test(id)) { defCol = cells.findIndex((c) => /definition/i.test(c)); continue }   // a header row
  if (cells.length > 1) out[id] = clean(cells[1])
  if (defCol > 1 && cells[defCol]) out[id + '.def'] = clean(cells[defCol])
}
fs.writeFileSync(path.join(here, '../src/copy.generated.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`copy: ${Object.keys(out).length} strings from COPY.md`)
