// Draft stills: one browser, many seeks. usage: node reel/stills.mjs <outdir> t1 t2 ...   (writes <outdir>/t<t>.png)
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
const puppeteer = createRequire(import.meta.url)('../tools/node_modules/puppeteer-core')
const here = path.dirname(new URL(import.meta.url).pathname)
const [out, ...ts] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] })
const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.error('[page error]', e.message)); page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()) })
await page.goto('file://' + path.join(here, 'reel.html'), { waitUntil: 'networkidle0' })
await page.waitForFunction('window.READY === true', { timeout: 30000 })
for (const t of ts) { await page.evaluate((t) => window.seek(t), +t); await page.screenshot({ path: path.join(out, `t${(+t).toFixed(2)}.png`) }) }
await browser.close(); console.log('stills:', ts.length)
