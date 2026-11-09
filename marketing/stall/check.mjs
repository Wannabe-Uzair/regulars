// Word check for the visitor-answers sheet: every question, answer, hint and fallback line of VISITOR-QA.md must appear
// verbatim in the PDF's text (pdftotext -raw, whitespace removed on both sides). Exits 1 on any miss.
//   node stall/check.mjs [pdf]      (default exports/Regulars-visitor-answers-A4.pdf)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const pdf = process.argv[2] || path.join(root, 'exports/Regulars-visitor-answers-A4.pdf')
const md = fs.readFileSync(path.join(root, 'VISITOR-QA.md'), 'utf8').split('\n')
const squash = (s) => s.replace(/\s+/g, '')
const text = squash(execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' }))

const want = []
let inIdk = false
for (const line of md) {
  let m
  if ((m = line.match(/^### \d+\. (.+)$/))) want.push(['question', m[1]])
  else if ((m = line.match(/^> (.+)$/))) want.push(['answer', m[1]])
  else if ((m = line.match(/^\*(.+)\*$/))) want.push(['hint', m[1]])
  else if (line.startsWith('## If you don')) inIdk = true
  else if (inIdk && (m = line.match(/^- (.+)$/))) want.push(['fallback', m[1]])
  else if (inIdk && line.trim()) want.push(['fallback', line.trim()])
}
const missing = want.filter(([, s]) => !text.includes(squash(s)))
const count = (k) => want.filter(([t]) => t === k).length
console.log(`check: ${count('question')} questions, ${count('answer')} answers, ${count('hint')} hints, ${count('fallback')} fallback lines; missing ${missing.length}`)
for (const [k, s] of missing) console.log(`  MISSING ${k}: ${s}`)
process.exit(missing.length ? 1 : 0)
