// Figures check for the pitch PDF: every figure on the slides and its source are in the PDF's text exactly as the deck
// gives them, the figures the team's answers quote are in VISITOR-QA.md in the same words, and every page that shows a
// screen of the app (a picture from shots/) carries "Sample data". pdftotext -raw, whitespace removed on both sides, as
// stall/check.mjs reads its sheet. Prints one line per miss, then "figures: <n> missing"; exits 1 on any miss.
//   node slides/figures-check.mjs [pdf]      (default exports/Regulars-pitch.pdf)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const here = path.dirname(new URL(import.meta.url).pathname)
const root = path.dirname(here)
const pdf = process.argv[2] || path.join(root, 'exports/Regulars-pitch.pdf')
const squash = (s) => s.replace(/\s+/g, '')
const pageText = (n) => squash(execFileSync('pdftotext', ['-raw', '-f', String(n), '-l', String(n), pdf, '-'], { encoding: 'utf8' }))
// the answers quote the sources mid-sentence ("In a 2001 UK industry study"), so that comparison ignores case
const qa = squash(fs.readFileSync(path.join(root, 'VISITOR-QA.md'), 'utf8')).toLowerCase()

// [slide, what the slide says, also quoted in VISITOR-QA.md]
const FIGURES = [
  [2, '6 in 10', true], [2, 'Sperandei et al., 2016', true],
  [3, '78%', true], [3, '59%', true], [3, 'A 2001 UK industry study', true],
  [6, '$99 a month per gym', true], [6, 'under $50 a month', true], [6, 'Health & Fitness Association', true],
  [6, 'Health & Fitness Association, 2024'],
  [7, '55,294'], [7, '2024 U.S. Health & Fitness Consumer Report'], [7, '$99 × 12 = $1,188'], [7, '$657,000'],
  [7, '1% of US gyms ≈ 553 gyms'],
]

const pages = Number(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)[1])
const html = fs.readFileSync(path.join(here, 'slides.html'), 'utf8')
const sections = html.split('<section class="slide"').slice(1)
const missing = []
if (pages !== sections.length) missing.push(`the PDF has ${pages} pages, the deck ${sections.length} slides`)

for (const [slide, words, quoted] of FIGURES) {
  if (!pageText(slide).includes(squash(words))) missing.push(`slide ${slide}: "${words}" is not in the PDF`)
  if (quoted && !qa.includes(squash(words).toLowerCase())) missing.push(`slide ${slide}: "${words}" is not in VISITOR-QA.md`)
}
let screens = 0
sections.forEach((s, i) => {
  if (!/src="shots\//.test(s)) return
  screens++
  if (!pageText(i + 1).includes('Sampledata')) missing.push(`slide ${i + 1} shows the app without "Sample data"`)
})

for (const m of missing) console.log('  MISSING ' + m)
console.log(`figures: ${FIGURES.length} figures and sources, ${screens} pages with screens; ${pages} pages`)
console.log(`figures: ${missing.length} missing`)
process.exit(missing.length ? 1 : 0)
