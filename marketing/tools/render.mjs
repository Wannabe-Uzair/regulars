// Shared renderer for the Tenure pieces: headless Chrome turns an HTML page into a print PDF or a PNG.
//   node tools/render.mjs pdf  <page.html> <out.pdf>                        page size from the page's CSS @page rule
//   node tools/render.mjs png  <page.html> <out.png> <width> <height> [scale] screenshot of the viewport
//   node tools/render.mjs svg  <file.svg>  <out.png> <width> [scale]          an SVG on a transparent page, with the brand fonts loaded
// The page may set window.READY = false and flip it to true once it has drawn; the renderer waits for it (and for fonts).
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
const puppeteer = createRequire(import.meta.url)('puppeteer-core')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const here = path.dirname(new URL(import.meta.url).pathname)

const [mode, input, output, a, b, c] = process.argv.slice(2)
if (!mode || !input || !output) { console.error('usage: render.mjs pdf|png|svg <in> <out> [...]'); process.exit(2) }
const abs = (p) => path.resolve(process.cwd(), p)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] })
const page = await browser.newPage()
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.error('[page]', m.text()) })
page.on('pageerror', (e) => console.error('[page error]', e.message))

async function ready() {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction('window.READY === undefined || window.READY === true', { timeout: 60000 })
}

if (mode === 'pdf') {
  await page.goto('file://' + abs(input), { waitUntil: 'networkidle0' })
  await ready()
  await page.pdf({ path: abs(output), preferCSSPageSize: true, printBackground: true })
} else if (mode === 'png') {
  const w = +a || 1920, h = +b || 1080, s = +c || 1
  await page.setViewport({ width: w, height: h, deviceScaleFactor: s })
  await page.goto('file://' + abs(input), { waitUntil: 'networkidle0' })
  await ready()
  await page.screenshot({ path: abs(output), omitBackground: false })
} else if (mode === 'svg') {
  const w = +a || 2000, s = +b || 1
  const svg = fs.readFileSync(abs(input), 'utf8')
  const tokens = 'file://' + path.join(here, '..', 'brand', 'tokens.css')
  await page.setViewport({ width: w, height: 100, deviceScaleFactor: s })
  await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${tokens}"><style>html,body{background:transparent}svg{display:block;width:${w}px;height:auto}</style></head><body>${svg}</body></html>`, { waitUntil: 'networkidle0' })
  await ready()
  const el = await page.$('svg')
  await el.screenshot({ path: abs(output), omitBackground: true })
} else { console.error('unknown mode', mode); process.exit(2) }

await browser.close()
console.log('wrote', output)
