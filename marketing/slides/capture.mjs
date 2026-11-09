// The slides' pictures: the app's real screens, captured at 2x from a running stall server through a write guard, so
// the shared demo never changes. playwright-core and the installed Google Chrome, as tools/render-regulars.mjs drives
// them (Node finds playwright-core by walking up to the repository's own node_modules).
//   node slides/capture.mjs <server url> <out dir>     e.g. node marketing/slides/capture.mjs http://127.0.0.1:5341 marketing/slides/shots
// The guard: every GET goes through, and the POSTs /api/demo/try and /api/templates/render; a kiosk check-in or join is
// answered here with a fixed welcome; every other write is refused with a 409 and counted. It signs in with Try the
// Demo. Reduced motion is on, so every screen is captured finished and still. Prints "refused <n>" and "wrote <n>",
// and exits 1 unless it refused nothing and wrote all seven.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const [base, outArg] = process.argv.slice(2)
if (!base || !outArg) {
  console.error('usage: capture.mjs <server url> <out dir>')
  process.exit(2)
}
const out = path.resolve(outArg)
fs.mkdirSync(out, { recursive: true })

// What the kiosk's welcome shows (FR-KIOSK-05's KioskWelcome): Sam, back in week 4, two visits this week.
const WELCOME = { firstName: 'Sam', greeting: 'back', week: 3, weekNumber: 4, day: 24, visitsThisWeek: 2, visitsLine: 'visits', status: 'slipping' }
const PASS = [/\/api\/demo\/try$/, /\/api\/templates\/render$/]
const KIOSK = /\/api\/kiosk\/[^/]+\/(checkin|join)$/

let refused = 0
let wrote = 0
const guard = async (route) => {
  const req = route.request()
  const url = new URL(req.url())
  if (req.method() === 'GET' || req.method() === 'HEAD') return route.continue()
  if (req.method() === 'POST' && PASS.some((re) => re.test(url.pathname))) return route.continue()
  if (req.method() === 'POST' && KIOSK.test(url.pathname)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(WELCOME) })
  }
  refused++
  console.error(`refused ${req.method()} ${url.pathname}`)
  return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'capture: writes are refused' }) })
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] })
const errors = []
const open = async (viewport, extra = {}) => {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce', colorScheme: 'light',
    locale: 'en-US', timezoneId: 'America/Chicago', ...extra })
  await context.route('**/api/**', guard)
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  return { context, page }
}
// Fonts loaded, then two frames and a short rest, so the last data paints before the picture.
const settle = async (page) => {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.waitForTimeout(600)
}
const shot = async (page, name) => {
  await settle(page)
  await page.screenshot({ path: path.join(out, name) })
  wrote++
  console.log(`  ${name}`)
}
const heading = (page, name) => page.getByRole('heading', { name, exact: true }).first().waitFor({ timeout: 20000 })

try {
  // The laptop: Try the Demo on the home page signs in as the demo gym's owner and opens Today.
  const laptop = await open({ width: 1280, height: 800 })
  let page = laptop.page
  await page.goto(base + '/', { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Try the Demo' }).first().click()
  await page.waitForURL(/\/app$/, { timeout: 20000 })
  await heading(page, 'Slipping Now')
  await shot(page, 'today-laptop.png')

  await page.goto(base + '/app/board', { waitUntil: 'load' })
  await heading(page, 'Board')
  await shot(page, 'board-laptop.png')

  await page.goto(base + '/app/reports', { waitUntil: 'load' })
  await heading(page, 'Reports')
  await page.getByText('Sample data', { exact: true }).first().waitFor({ timeout: 20000 })
  await shot(page, 'reports-laptop.png')

  const kioskPath = await page.evaluate(async () => (await (await fetch('/api/settings')).json()).kioskPath)
  const session = await laptop.context.storageState()
  await laptop.context.close()

  // The phone, with the same session: the kiosk, then Today and the Nudge sheet.
  const phone = await open({ width: 390, height: 844 }, { storageState: session, isMobile: true, hasTouch: true })
  page = phone.page
  await page.goto(base + kioskPath, { waitUntil: 'load' })
  await heading(page, 'Check In')
  await shot(page, 'kiosk-start-phone.png')

  // A hardware keyboard types on the kiosk's keypad and Enter checks in; the guard answers with the welcome.
  await page.keyboard.type('3125550142')
  await page.keyboard.press('Enter')
  await page.getByRole('status').filter({ hasText: 'Sam' }).waitFor({ timeout: 10000 })
  await shot(page, 'kiosk-welcome-phone.png')

  await page.goto(base + '/app', { waitUntil: 'load' })
  await heading(page, 'Slipping Now')
  await shot(page, 'today-phone.png')

  // Open the sheet, capture, then Cancel: a channel press would record a nudge.
  await page.getByRole('button', { name: /^Nudge / }).first().click()
  const sheet = page.getByRole('dialog')
  await sheet.waitFor({ timeout: 10000 })
  await page.waitForTimeout(400)
  await shot(page, 'nudge-sheet-phone.png')
  // Cancel at the sheet's leading edge (native-2); a build without it yet closes on Escape, which records nothing too.
  const cancel = sheet.getByRole('button', { name: 'Cancel', exact: true })
  if (await cancel.count()) await cancel.click()
  else await page.keyboard.press('Escape')
  await sheet.waitFor({ state: 'hidden', timeout: 10000 })
  await phone.context.close()
} finally {
  await browser.close()
}

console.log(`refused ${refused}`)
console.log(`wrote ${wrote}`)
if (errors.length) console.error(errors.map((e) => '[page] ' + e).join('\n'))
process.exit(refused === 0 && wrote === 7 && !errors.length ? 0 : 1)
