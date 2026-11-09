// Renderer for the Regulars print pieces: headless Chrome turns an HTML page into a print PDF or a PNG.
// It drives the installed Google Chrome through playwright-core, which the repository already installs at its root
// (Node finds it by walking up from here), so the pieces build without marketing/tools' own npm install.
//   node tools/render-regulars.mjs pdf <page.html[?query]> <out.pdf>                       page size from the page's @page rule
//   node tools/render-regulars.mjs png <page.html[?query]> <out.png> <width> <height> [scale] screenshot of the viewport
// The page sets window.READY = false and flips it to true once it has drawn; the renderer waits for it and the fonts.
// Any page error or console error fails the render (the pages report their layout checks as console errors).
import { chromium } from 'playwright-core'
import path from 'node:path'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const [mode, input, output, a, b, c] = process.argv.slice(2)
if (!['pdf', 'png'].includes(mode) || !input || !output) {
  console.error('usage: render-regulars.mjs pdf|png <in.html[?query]> <out> [width height scale]')
  process.exit(2)
}
const [file, query = ''] = input.split('?')
const url = 'file://' + path.resolve(process.cwd(), file) + (query ? '?' + query : '')

const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] })
const errors = []
const page = await browser.newPage(mode === 'png' ? { viewport: { width: +a, height: +b }, deviceScaleFactor: +c || 1 } : {})
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(url, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForFunction('window.READY === true', null, { timeout: 60000 })
if (mode === 'pdf') await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true })
else await page.screenshot({ path: output })
await browser.close()
if (errors.length) { console.error(errors.map((e) => '[page] ' + e).join('\n')); process.exit(1) }
console.log('wrote', output)
