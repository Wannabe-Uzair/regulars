// Shared checks for the Regulars print pieces (brochure/regulars-check.mjs, standee/regulars-check.mjs).
import fs from 'node:fs'

// A binary PPM (pdftoppm's default output) as { W, H, px(x, y) -> [r, g, b] }.
export function readPpm(file) {
  const buf = fs.readFileSync(file)
  const hdr = buf.toString('latin1', 0, 20).split(/\s+/), W = +hdr[1], H = +hdr[2]
  const off = buf.length - W * H * 3
  return { W, H, px: (x, y) => { const i = off + (y * W + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]] } }
}

// Pixels whose hue is green or amber (25-170 degrees) and clearly coloured (channel spread over 40). The kit's only
// colours are the tint (about 246 degrees) and the slipping red (about 352), and anti-aliasing either one into white
// or grey keeps its hue, so any count here is green or amber ink.
export function greenAmberPixels({ W, H, px }) {
  let n = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, g, b] = px(x, y), max = Math.max(r, g, b), d = max - Math.min(r, g, b)
    if (d <= 40) continue
    const h = max === r ? (60 * ((g - b) / d) + 360) % 360 : max === g ? 60 * ((b - r) / d) + 120 : 60 * ((r - g) / d) + 240
    if (h >= 25 && h <= 170) n++
  }
  return n
}

// The status marks in a page (Uzair's pick, a11y-1): every status is a mark and a word; On the line a filled dot,
// Below the line a ring with its left half filled, New an empty ring, Slipping a falling triangle. Only Slipping is
// red (mark #E0102E, word #D40624); the rest are in the text colour (the empty ring in text-soft).
// Returns one line per mismatch, empty when every mark is right.
const TEXT = 'rgb(29, 29, 31)', SOFT = 'rgb(96, 96, 104)'
const WANT = {
  on: { word: TEXT, shape: [`circle fill ${TEXT} stroke none`] },
  below: { word: TEXT, shape: [`circle fill none stroke ${TEXT}`, `path fill ${TEXT} stroke none`] },
  new: { word: TEXT, shape: [`circle fill none stroke ${SOFT}`] },
  slip: { word: 'rgb(212, 6, 36)', shape: ['polygon fill rgb(224, 16, 46) stroke rgb(224, 16, 46)'] },
}
export async function statusMarkProblems(page) {
  const found = await page.evaluate(() => [...document.querySelectorAll('.rg-status')].map((s) => {
    const k = [...s.classList].find((c) => c.startsWith('st-'))?.slice(3)
    const svg = s.firstElementChild?.tagName === 'svg' ? s.firstElementChild : null
    const shape = svg ? [...svg.children].map((c) => { const cs = getComputedStyle(c); return `${c.tagName} fill ${cs.fill} stroke ${cs.stroke}` }) : []
    // a falling triangle: one vertex below the other two
    let falling = true
    const tri = svg?.querySelector('polygon')
    if (tri) { const ys = tri.getAttribute('points').trim().split(/[\s,]+/).filter((_, i) => i % 2).map(Number).sort((a, b) => a - b); falling = ys.length === 3 && ys[0] === ys[1] && ys[2] > ys[1] }
    return { k, word: s.textContent.trim(), color: getComputedStyle(s).color, shape, falling }
  }))
  const out = []
  if (!found.length) out.push('no status marks on the page')
  for (const f of found) {
    const w = WANT[f.k]
    if (!w) { out.push(`"${f.word}": unknown status ${f.k}`); continue }
    if (f.color !== w.word) out.push(`"${f.word}": word in ${f.color} (want ${w.word})`)
    if (f.shape.join(' | ') !== w.shape.join(' | ')) out.push(`"${f.word}": mark is [${f.shape.join(' | ') || 'no svg'}] (want [${w.shape.join(' | ')}])`)
    if (!f.falling) out.push(`"${f.word}": the triangle does not point down`)
  }
  return [...new Set(out)]
}
