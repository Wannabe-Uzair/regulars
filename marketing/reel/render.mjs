// Deterministic frame renderer for the Tenure reel (adapted from pitch/reel-source/render16.mjs).
// Seeks reel.html per frame in headless Chrome, averages sub-frames at 16 bits (180° shutter, ffmpeg tmix)
// and writes a lossless FFV1 intermediate.   usage: node reel/render.mjs <fps> <subframes> <out.mkv> [start] [end]
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
const here = path.dirname(new URL(import.meta.url).pathname)
const puppeteer = createRequire(import.meta.url)(path.join(here, '../tools/node_modules/puppeteer-core'))
const CUES = createRequire(import.meta.url)('./cues.js')
const a = process.argv.slice(2)
const fps = +(a[0] ?? CUES.FPS), sub = +(a[1] ?? 4), out = path.resolve(a[2] ?? path.join(here, '../build/reel/reel.mkv'))
const t0 = +(a[3] ?? 0), t1 = +(a[4] ?? CUES.DUR)
const rate = fps * sub, total = Math.round((t1 - t0) * rate), SH = 0.5     // SH 0.5 = 180° shutter
fs.mkdirSync(path.dirname(out), { recursive: true })
const vf = ['format=rgb48le', ...(sub > 1 ? [`tmix=frames=${sub}`, `select='not(mod(n+1\\,${sub}))'`, `setpts=N/(${fps}*TB)`] : []), 'format=gbrp16le'].join(',')
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(rate), '-i', '-',
  '-vf', vf, '-r', String(fps), '-c:v', 'ffv1', '-level', '3', '-slices', '16', '-g', '1', out], { stdio: ['pipe', 'inherit', 'inherit'] })
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] })
const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
page.on('pageerror', (e) => { console.error('[page error]', e.message); process.exitCode = 1 })
await page.goto('file://' + path.join(here, 'reel.html'), { waitUntil: 'networkidle0' })
await page.waitForFunction('window.READY === true', { timeout: 30000 })
const cdp = await page.createCDPSession()
const start = Date.now()
for (let i = 0; i < total; i++) {
  // sub-frames span half the frame interval, centred on the frame time, so the blur is symmetric
  const k = Math.floor(i / sub), j = i % sub
  const t = Math.min(CUES.DUR - 1e-4, Math.max(0, t0 + k / fps + (sub > 1 ? ((j + 0.5 - sub / 2) / rate) * SH : 0)))
  await page.evaluate((t) => window.seek(t), t)
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })
  if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r))
  if (i % Math.round(rate) === 0) process.stdout.write(`\r${(i / rate + t0).toFixed(1)}s  ${((Date.now() - start) / (i + 1)).toFixed(0)} ms/frame   `)
}
ff.stdin.end(); const code = await new Promise((r) => ff.on('close', r)); await browser.close()
console.log(`\ndone: ${total / sub} frames (${total} captures) in ${((Date.now() - start) / 1000).toFixed(0)}s -> ${out}`)
process.exit(code || process.exitCode || 0)
