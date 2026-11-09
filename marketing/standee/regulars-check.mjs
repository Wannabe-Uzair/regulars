// Regulars standee self-check (after regulars-build.sh). node standee/regulars-check.mjs
// Fails (exit 1) unless: the PDF is one 24 x 60 in page with Inter as its only font, embedded; the JPG is 3600 x 9000 px
// at 150 dpi; no text is under 48 pt; the headline's capitals are at least 25 mm tall and every other line's at least
// 10 mm (a sign-maker's rule for reading at 3 m); the page's own layout checks pass; the status marks are the four
// shapes with only Slipping in red, and no green or amber ink anywhere; "Track Flag Nudge" runs edge to edge with the
// board, evenly spaced. It prints the old Tenure standee's capital heights beside the new ones, for comparison.
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { readPpm, greenAmberPixels, statusMarkProblems } from '../tools/regulars-check-lib.mjs'
const here = path.dirname(new URL(import.meta.url).pathname)
const root = path.dirname(here)
const PDF = path.join(root, 'exports/Regulars-standee-2x5ft.pdf')
const JPG = path.join(root, 'exports/Regulars-standee-2x5ft-150dpi.jpg')
const fails = []
const check = (ok, line) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`); if (!ok) fails.push(line) }

const info = execFileSync('pdfinfo', [PDF], { encoding: 'utf8' })
const pages = +info.match(/^Pages:\s+(\d+)/m)[1]
const [pw, ph] = info.match(/^Page size:\s+([\d.]+) x ([\d.]+)/m).slice(1).map((v) => +v / 72)
check(pages === 1 && Math.abs(pw - 24) < 0.01 && Math.abs(ph - 60) < 0.01, `pdf: ${pages} page, ${pw.toFixed(2)} x ${ph.toFixed(2)} in (want 1 at 24 x 60)`)
const fonts = execFileSync('pdffonts', [PDF], { encoding: 'utf8' }).split('\n').slice(2).filter(Boolean)
const names = [...new Set(fonts.map((l) => l.split(/\s+/)[0].replace(/^[A-Z]{6}\+/, '')))]
check(fonts.length > 0 && names.every((n) => /^Inter/.test(n)) && fonts.every((l) => / yes /.test(l)), `fonts: ${names.join(', ')}, embedded`)
const sips = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'dpiWidth', JPG], { encoding: 'utf8' })
const [jw, jh, jd] = ['pixelWidth', 'pixelHeight', 'dpiWidth'].map((k) => +sips.match(new RegExp(k + ': ([\\d.]+)'))[1])
check(jw === 3600 && jh === 9000 && jd === 150, `jpg: ${jw} x ${jh} px at ${jd} dpi (want 3600 x 9000 at 150)`)

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] })
const errors = []
// capital height in mm of each text element: the ascent of "H" in its own font, at its own size
const capsOf = (sel) => (s) => {
  const ctx = document.createElement('canvas').getContext('2d')
  const cap = (el) => { const cs = getComputedStyle(el); ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return ctx.measureText('H').actualBoundingBoxAscent * 25.4 / 96 }
  return [...document.querySelectorAll(s)].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest('script,style,.guide'))
    .map((el) => [+cap(el).toFixed(1), +(parseFloat(getComputedStyle(el).fontSize) * 0.75).toFixed(1), el.textContent.trim().slice(0, 28)])
}
let page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto('file://' + path.join(here, 'regulars.html'))
await page.waitForFunction('window.READY === true')
const caps = (await page.evaluate(capsOf(), 'body *')).sort((a, b) => a[0] - b[0])
const head = (await page.evaluate(capsOf(), '#headline'))[0]
check(errors.length === 0, `layout: ${errors.length ? errors.join('; ') : 'safe area, low zone and spacing hold'}`)
check(caps[0][1] >= 48, `smallest text ${caps[0][1]} pt "${caps[0][2]}" (want 48 or more)`)
check(head[0] >= 25, `headline capitals ${head[0]} mm at ${head[1]} pt (want 25 mm or more)`)
check(caps[0][0] >= 10, `smallest capitals ${caps[0][0]} mm "${caps[0][2]}" (want 10 mm or more)`)
const marks = await statusMarkProblems(page)
check(!marks.length, `status marks: ${marks.length ? marks.join('; ') : 'dot, half ring, falling triangle; only Slipping red'}`)
// Track Flag Nudge: the words' boxes start at the board's left edge, end at its right edge, with equal gaps
const st = await page.evaluate(() => {
  const IN = 96, b = document.querySelector('#board .rg-screen').getBoundingClientRect()
  const w = [...document.querySelectorAll('#steps > div')].map((d) => { const r = document.createRange(); r.selectNodeContents(d); const q = r.getBoundingClientRect(); return [q.left / IN, q.right / IN] })
  return { l: b.left / IN, r: b.right / IN, w, gaps: w.slice(1).map((x, i) => x[0] - w[i][1]) }
})
check(st.w.length === 3 && Math.abs(st.w[0][0] - st.l) < 0.02 && Math.abs(st.w[2][1] - st.r) < 0.02 && Math.abs(st.gaps[0] - st.gaps[1]) < 0.02,
  `steps: ${st.w[0][0].toFixed(2)}-${st.w[2][1].toFixed(2)} in, gaps ${st.gaps.map((g) => g.toFixed(2)).join(' and ')} in (want ${st.l.toFixed(2)}-${st.r.toFixed(2)}, the board's edges, gaps equal)`)
const tmp = path.join(root, 'build/standee/regulars-check')
fs.mkdirSync(path.dirname(tmp), { recursive: true })
execFileSync('pdftoppm', ['-q', '-r', '30', '-singlefile', PDF, tmp])
const ga = greenAmberPixels(readPpm(tmp + '.ppm'))
check(ga === 0, `green or amber ink: ${ga} px at 30 dpi (want none: only Slipping is coloured)`)

// the old standee, for comparison (not a pass condition)
page = await browser.newPage()
await page.goto('file://' + path.join(here, 'standee.html'))
await page.evaluate(() => document.fonts.ready)
const old = await page.evaluate(capsOf(), '.hero, .h1, .h2, .source, .names')
console.log('     old Tenure standee capitals: ' + [...new Map(old.map((o) => [o[1], o])).values()].map((o) => `${o[0]} mm at ${o[1]} pt`).join(', '))
console.log('     new Regulars standee capitals: ' + [...new Map(caps.map((o) => [o[1], o])).values()].sort((a, b) => b[0] - a[0]).map((o) => `${o[0]} mm at ${o[1]} pt`).join(', '))
await browser.close()
console.log(fails.length ? `standee check: FAIL (${fails.length})` : 'standee check: pass')
process.exit(fails.length ? 1 : 0)
