// Regulars brochure self-check (after regulars-build.sh): reads exports/Regulars-brochure-A4-trifold-print.pdf.
//   node brochure/regulars-check.mjs
// Fails (exit 1) unless: 2 pages of 303 x 216 mm; every font in the PDF is Inter; no text under 6.5 pt; no ink outside
// the 8 mm safe areas (the paper is white, so any ink there counts); the tint stays a small share of each side; the
// status marks are the four shapes with only Slipping in red, and no green or amber ink anywhere; the status key's
// hairlines start where its words start; the payback line is Uzair's; the print-safe backups (two 300 dpi JPGs and a
// 600 dpi image-only PDF) match the print PDF's size.
import { chromium } from 'playwright-core'
import { readPpm, greenAmberPixels, statusMarkProblems } from '../tools/regulars-check-lib.mjs'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const here = path.dirname(new URL(import.meta.url).pathname)
const root = path.dirname(here)
const PDF = path.join(root, 'exports/Regulars-brochure-A4-trifold-print.pdf')
const fails = []
const check = (ok, line) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`); if (!ok) fails.push(line) }

// 1. pages and size
const info = execFileSync('pdfinfo', [PDF], { encoding: 'utf8' })
const pages = +info.match(/^Pages:\s+(\d+)/m)[1]
const [pw, ph] = info.match(/^Page size:\s+([\d.]+) x ([\d.]+)/m).slice(1).map((v) => (+v * 25.4) / 72)
check(pages === 2 && Math.abs(pw - 303) < 0.2 && Math.abs(ph - 216) < 0.2, `pages ${pages}, ${pw.toFixed(1)} x ${ph.toFixed(1)} mm (want 2 at 303 x 216)`)

// 2. fonts: Inter only, embedded
const fonts = execFileSync('pdffonts', [PDF], { encoding: 'utf8' }).split('\n').slice(2).filter(Boolean)
const names = [...new Set(fonts.map((l) => l.split(/\s+/)[0].replace(/^[A-Z]{6}\+/, '')))]
check(fonts.length > 0 && names.every((n) => /^Inter/.test(n)) && fonts.every((l) => / yes /.test(l)), `fonts: ${names.join(', ')} (embedded: ${fonts.every((l) => / yes /.test(l))})`)

// 3. smallest text, in pt
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage()
await page.goto('file://' + path.join(here, 'regulars.html'))
await page.waitForFunction('window.READY === true')
const sizes = await page.evaluate(() => {
  const out = [], walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walk.nextNode()) {
    const n = walk.currentNode, el = n.parentElement
    if (!n.textContent.trim() || el.closest('script,style,.guides')) continue
    out.push([+(parseFloat(getComputedStyle(el).fontSize) * 0.75).toFixed(2), n.textContent.trim().slice(0, 30)])
  }
  return out.sort((a, b) => a[0] - b[0])
})
const marks = await statusMarkProblems(page)
// the status key: each hairline starts at the words (its status word and its definition), not under the mark
const key = await page.evaluate(() => [...document.querySelectorAll('.key-row + .key-row')].map((row) => {
  const MM = 25.4 / 96, left = row.getBoundingClientRect().left
  const text = (el) => { const t = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()), r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect().left }
  return [parseFloat(getComputedStyle(row, '::before').left) * MM, (text(row.querySelector('.rg-status')) - left) * MM, (text(row.querySelector('.def')) - left) * MM]
}))
const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
await browser.close()
check(!marks.length, `status marks: ${marks.length ? marks.join('; ') : 'dot, half ring, falling triangle; only Slipping red'}`)
check(key.length === 2 && key.every(([h, w, d]) => h > 4 && Math.abs(h - w) < 0.3 && Math.abs(h - d) < 0.3),
  `status key hairlines inset ${key.map(([h, w, d]) => `${h.toFixed(2)} mm (words at ${w.toFixed(2)}, ${d.toFixed(2)})`).join(', ')} (want at the words)`)
const PAYBACK = 'Keep 2 members a month, and from the second month it pays for itself.'
check(bodyText.includes(PAYBACK), `payback line: "${PAYBACK}"`)
check(sizes[0][0] >= 6.5, `smallest text ${sizes[0][0]} pt "${sizes[0][1]}" (want 6.5 or more)`)

// 4. ink outside the safe areas, 5. the tint's share. 100 dpi render, bleed included (3 mm = 11.8 px).
const dpi = 100, mm = dpi / 25.4, b = 3 * mm
const tmp = path.join(root, 'build/brochure/regulars-check')
fs.mkdirSync(path.dirname(tmp), { recursive: true })
execFileSync('pdftoppm', ['-q', '-r', String(dpi), PDF, tmp])
const panels = [
  [['inside flap', 0, 97], ['back cover', 97, 197], ['front cover', 197, 297]],
  [['panel 1', 0, 100], ['panel 2', 100, 200], ['panel 3', 200, 297]],
]
const near = (c, h, d) => Math.abs(c[0] - h[0]) + Math.abs(c[1] - h[1]) + Math.abs(c[2] - h[2]) < d
for (let p = 0; p < 2; p++) {
  const file = fs.readdirSync(path.dirname(tmp)).find((f) => f.startsWith('regulars-check-') && f.endsWith(`${p + 1}.ppm`))
  const img = readPpm(path.join(path.dirname(tmp), file)), { W, H, px } = img
  // ink in the bleed, on every edge of the sheet
  let bleedInk = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x >= b && x < W - b && y >= b && y < H - b) continue
    if (!near(px(x, y), [255, 255, 255], 30)) bleedInk++
  }
  let tint = 0, all = 0
  for (const [name, a, z] of panels[p]) {
    let bad = 0
    for (let y = Math.ceil(b); y < b + 210 * mm - 1; y++) for (let x = Math.ceil(b + a * mm); x < b + z * mm - 1; x++) {
      const c = px(x, y), X = (x - b) / mm, Y = (y - b) / mm
      all++
      if (near(c, [0x54, 0x44, 0xe4], 90) || near(c, [0xea, 0xe9, 0xfc], 12)) tint++
      const t = 0.3 // one pixel of anti-aliasing at 100 dpi
      const inSafe = X >= a + 8 - t && X <= z - 8 + t && Y >= 8 - t && Y <= 202 + t
      if (!inSafe && !near(c, [255, 255, 255], 30)) bad++
    }
    check(bad === 0, `page ${p + 1} ${name.padEnd(12)} ink outside the safe area: ${bad} px`)
  }
  check(bleedInk === 0, `page ${p + 1} ink in the bleed: ${bleedInk} px (the design keeps the paper white to the trim)`)
  check(tint / all < 0.02, `page ${p + 1} tint share ${((100 * tint) / all).toFixed(2)}% (want under 2%: the tint is for what you can act on)`)
  const ga = greenAmberPixels(img)
  check(ga === 0, `page ${p + 1} green or amber ink: ${ga} px (want none: only Slipping is coloured)`)
}

// 6. the print-safe backups (Chrome embeds the variable font as Type 3, which some preflights refuse)
const EX = path.join(root, 'exports')
const pxAt = (mm, dpi) => Math.round((mm / 25.4) * dpi)
for (const side of [1, 2]) {
  const f = path.join(EX, `Regulars-brochure-A4-trifold-side${side}-300dpi.jpg`)
  if (!fs.existsSync(f)) { check(false, `side ${side} JPG missing: ${path.basename(f)}`); continue }
  const g = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'dpiWidth', f], { encoding: 'utf8' })
  const [w, h, d] = ['pixelWidth', 'pixelHeight', 'dpiWidth'].map((k) => +g.match(new RegExp(k + ': ([\\d.]+)'))[1])
  check(Math.abs(w - pxAt(pw, 300)) <= 1 && Math.abs(h - pxAt(ph, 300)) <= 1 && d === 300, `side ${side} JPG: ${w} x ${h} px at ${d} dpi (want the print PDF's ${pxAt(pw, 300)} x ${pxAt(ph, 300)} at 300)`)
}
const IMG = path.join(EX, 'Regulars-brochure-A4-trifold-print-600dpi-images.pdf')
if (!fs.existsSync(IMG)) check(false, `image PDF missing: ${path.basename(IMG)}`)
else {
  const ii = execFileSync('pdfinfo', [IMG], { encoding: 'utf8' })
  const [iw, ih] = ii.match(/^Page size:\s+([\d.]+) x ([\d.]+)/m).slice(1).map((v) => (+v * 25.4) / 72)
  const ifonts = execFileSync('pdffonts', [IMG], { encoding: 'utf8' }).split('\n').slice(2).filter(Boolean)
  const imgs = execFileSync('pdfimages', ['-list', IMG], { encoding: 'utf8' }).split('\n').slice(2).filter(Boolean).map((l) => l.trim().split(/\s+/))
  const ppi = imgs.map((c) => Math.min(+c[12], +c[13]))
  check(+ii.match(/^Pages:\s+(\d+)/m)[1] === 2 && Math.abs(iw - 303) < 0.2 && Math.abs(ih - 216) < 0.2 && !ifonts.length && imgs.length === 2 && ppi.every((v) => v >= 599),
    `image PDF: ${ii.match(/^Pages:\s+(\d+)/m)[1]} pages, ${iw.toFixed(1)} x ${ih.toFixed(1)} mm, ${ifonts.length} fonts, ${imgs.length} images at ${ppi.join(', ')} ppi (want 2 at 303 x 216, no fonts, 600 ppi)`)
}
console.log(fails.length ? `brochure check: FAIL (${fails.length})` : 'brochure check: pass')
process.exit(fails.length ? 1 : 0)
