// Screenshot a page of the client at a given viewport and log every page error and console error.
//   node scripts/shoot.mjs <url> <width>x<height> <out.png> [--full] [--wait=ms]
// Exits 1 when the page threw or logged an error. Output PNGs go to tenure/build/app/ (git-ignored) by default.
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
const require = createRequire('/Users/apple/myo-app/tenure/tools/node_modules/')
const puppeteer = require('puppeteer-core')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../build/app')

const [url, size = '1440x900', outArg, ...flags] = process.argv.slice(2)
if (!url) { console.error('usage: shoot.mjs <url> <w>x<h> [out.png] [--full] [--wait=ms] [--js=code]'); process.exit(2) }
const [width, height] = size.split('x').map(Number)
const full = flags.includes('--full')
const wait = Number((flags.find((f) => f.startsWith('--wait=')) || '--wait=300').slice(7))
const js = (flags.find((f) => f.startsWith('--js=')) || '').slice(5)
const out = outArg ? (path.isAbsolute(outArg) ? outArg : path.join(OUT_DIR, outArg)) : path.join(OUT_DIR, `shot-${width}.png`)
fs.mkdirSync(path.dirname(out), { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--no-default-browser-check'] })
const errors = []
try {
  const page = await browser.newPage()
  const mobile = width < 760
  await page.setViewport({ width, height, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  if (js) { await page.evaluate(js); await new Promise((r) => setTimeout(r, 300)) }
  await new Promise((r) => setTimeout(r, wait))
  await page.screenshot({ path: out, fullPage: full })
  console.log(`saved ${out}`)
} finally {
  await browser.close()
}
console.log(`page errors: ${errors.length}`)
for (const e of errors) console.log('  ' + e)
process.exit(errors.length ? 1 : 0)
