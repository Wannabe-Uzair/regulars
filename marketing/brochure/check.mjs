// Brochure self-check (not part of the build): smallest text size, ink inside the 8 mm safe areas, yellow share.
//   node brochure/check.mjs        (run after build.sh; reads exports/Tenure-brochure-A4-trifold-print.pdf)
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const here = path.dirname(new URL(import.meta.url).pathname)
const root = path.dirname(here)
const puppeteer = createRequire(path.join(root, 'tools/package.json'))('puppeteer-core')

// 1. smallest text, in pt, over HTML text and SVG <text>
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] })
const page = await browser.newPage()
await page.goto('file://' + path.join(here, 'brochure.html'), { waitUntil: 'networkidle0' })
await page.waitForFunction('window.READY === true')
const sizes = await page.evaluate(() => {
  const out = []
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walk.nextNode()) {
    const n = walk.currentNode, el = n.parentElement
    if (!n.textContent.trim() || el.closest('script,style')) continue
    let px = parseFloat(getComputedStyle(el).fontSize)
    const svg = el.closest('svg')
    if (svg) { const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width; px = parseFloat(el.closest('text').getAttribute('font-size')) * k }
    out.push([+(px * 0.75).toFixed(2), n.textContent.trim().slice(0, 30)])
  }
  return out.sort((a, b) => a[0] - b[0])
})
await browser.close()
console.log('smallest text (pt):', sizes.slice(0, 4).map((s) => `${s[0]} "${s[1]}"`).join(' | '))

// 2. ink in the margins, 3. yellow share. 100 dpi render of the print PDF, bleed included (3 mm = 11.8 px).
const dpi = 100, mm = dpi / 25.4, b = 3 * mm
const tmp = path.join(root, 'build/brochure/check')
fs.mkdirSync(path.dirname(tmp), { recursive: true })
execFileSync('pdftoppm', ['-r', String(dpi), path.join(root, 'exports/Tenure-brochure-A4-trifold-print.pdf'), tmp])
const panels = [
  [['inside flap', 0, 97, 'rubber'], ['back cover', 97, 197, 'yellow'], ['front cover', 197, 297, 'rubber', 6, 0]],
  [['panel 1', 0, 100, 'rubber'], ['panel 2', 100, 200, 'rubber'], ['panel 3', 200, 297, 'rubber', 0, 203.7]],
]
const G = { rubber: [0x14, 0x14, 0x14], yellow: [0xff, 0xd6, 0x0a] }
for (let p = 0; p < 2; p++) {
  const buf = fs.readFileSync(`${tmp}-${p + 1}.ppm`)
  const hdr = buf.toString('latin1', 0, 20).split(/\s+/), W = +hdr[1], H = +hdr[2]
  const off = buf.length - W * H * 3
  const px = (x, y) => { const i = off + (y * W + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]] }
  const far = (c, g) => Math.abs(c[0] - g[0]) + Math.abs(c[1] - g[1]) + Math.abs(c[2] - g[2]) > 60
  let side = 0, sideN = 0
  for (const [name, a, z, ground, band = 0, bandBottom = 999] of panels[p]) {
    let bad = 0, yel = 0, n = 0
    for (let y = Math.ceil(b); y < b + 210 * mm - 1; y++) for (let x = Math.ceil(b + a * mm); x < b + z * mm - 1; x++) {
      const c = px(x, y), X = (x - b) / mm, Y = (y - b) / mm
      n++
      if (c[0] > 200 && c[1] > 170 && c[2] < 90) yel++
      if (Y < band || Y >= bandBottom) continue
      const t = 0.3 // one pixel of anti-aliasing at 100 dpi
      const inSafe = X >= a + 8 - t && X <= z - 8 + t && Y >= 8 - t && Y <= 202 + t
      if (!inSafe && far(c, G[ground])) { bad++; if (process.env.DEBUG && bad < 8) console.log("   at", X.toFixed(1), Y.toFixed(1), c.join(",")) }
    }
    side += yel; sideN += n
    console.log(`page ${p + 1} ${name.padEnd(12)} ink outside safe area: ${bad} px · yellow ${(100 * yel / n).toFixed(1)}%`)
  }
  console.log(`page ${p + 1} yellow share of the whole side: ${(100 * side / sideN).toFixed(1)}%`)
}
