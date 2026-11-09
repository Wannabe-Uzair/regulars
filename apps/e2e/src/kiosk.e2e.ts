// The kiosk flow (UC-02), on a laptop's Chrome, an Android phone and an iPhone: the stall has no tablet. Each project
// checks in members of its own, since the two Chrome projects share one server and its database.
import { type APIRequestContext, type Locator, type Page, type TestInfo } from '@playwright/test'
import { t } from '@tenure/copy'
import { buildNorthside } from '@tenure/db/seed'
import { DEFAULT_TEMPLATES, localDate } from '@tenure/domain'
import { demo, expect, test } from './fixtures.ts'
import { E2E_TZ } from './servers.ts'

const CHECKIN_BUDGET_MS = 1000

// Names, phones and who checks in on the seeded day don't depend on the date, so any date gives the seeded ones.
const SEED_DAY = '2026-01-01'
const seed = buildNorthside({ today: SEED_DAY, timezone: E2E_TZ, templates: DEFAULT_TEMPLATES })
const seeded = seed.members
const shortName = (m: (typeof seeded)[number]) => `${m.firstName} ${m.lastName}`
/** Members the seed checks in today: a check-in within the hour of theirs isn't stored (FR-KIOSK-03). */
const inToday = new Set(seed.checkins.filter((c) => localDate(c.at, E2E_TZ) === SEED_DAY).map((c) => c.memberKey))
/**
 * Members no other member shares a "First L." with, so the name search shows them once, and with no seeded check-in
 * today, so their next check-in is stored at any time of day.
 */
const unique = seeded.filter(
  (m) => !inToday.has(m.key) && seeded.filter((o) => shortName(o) === shortName(m)).length === 1,
)

const PROJECTS = ['chrome-desktop', 'chrome-phone', 'webkit-phone']
const PER_PROJECT = 4

/** This project's own members, from the end of the list, and names for its walk-ins. */
function mine(info: TestInfo) {
  const slot = PROJECTS.indexOf(info.project.name)
  if (slot < 0) throw new Error(`The kiosk flow doesn't run on ${info.project.name}`)
  const own = unique.slice(-(slot + 1) * PER_PROJECT, unique.length - slot * PER_PROJECT)
  const [byPhone, byName, twice, timed] = own
  if (!byPhone || !byName || !twice || !timed) throw new Error('The seed has too few members for the kiosk flow')
  return {
    byPhone,
    byName,
    twice,
    timed,
    walkIn: ['Wren', 'Juno', 'Ines'][slot] ?? 'Wren',
    visitor: ['Orla', 'Pax', 'Quin'][slot] ?? 'Orla',
  }
}

/** The owner, signed in through the API: the kiosk's path from Settings, and a member's stored check-ins. */
async function asOwner(request: APIRequestContext) {
  const login = await request.post('/api/auth/login', {
    data: { email: demo.owner.email, password: demo.owner.password },
  })
  expect(login.ok()).toBe(true)
  const settings = (await (await request.get('/api/settings')).json()) as { kioskPath: string }
  return {
    kioskPath: settings.kioskPath,
    async visits(member: (typeof seeded)[number]): Promise<number> {
      const list = (await (await request.get('/api/members?view=everyone')).json()) as {
        members: { id: number; firstName: string; lastName: string }[]
      }
      const found = list.members.find((m) => m.firstName === member.firstName && m.lastName === member.lastName)
      if (!found) throw new Error(`No member ${shortName(member)}`)
      const detail = (await (await request.get(`/api/members/${found.id}`)).json()) as { checkins: unknown[] }
      return detail.checkins.length
    },
  }
}

const keypad = (page: Page) => page.getByRole('group', { name: t('kiosk.keypad.label') })

async function openKiosk(page: Page, path: string) {
  await page.goto(path)
  await expect(keypad(page)).toBeVisible()
}

/** Type the member's own number on the keypad, as the gym's country writes it (the demo gym is a US one). */
async function typeNumber(page: Page, phone: string) {
  for (const digit of phone.replace(/^\+1/, ''))
    await keypad(page).getByRole('button', { name: digit, exact: true }).click()
}

/** The segmented choice's "Name" (FR-KIOSK-02): a tap on its words, as a finger lands on the segment. */
const chooseName = (page: Page) =>
  page
    .getByRole('radiogroup', { name: t('kiosk.mode.label') })
    .getByText(t('kiosk.mode.name'), { exact: true })
    .click()

/** Where an element's top sits on the page, whatever the scroll. */
const pageTop = (locator: Locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + (el.ownerDocument.defaultView?.scrollY ?? 0))

const welcomeHeading = (page: Page, first: string) =>
  page.getByRole('heading', { level: 1, name: new RegExp(`^Welcome( back)?, ${first}\\.`) })

test('FR-KIOSK-02 a member checks in with their phone number, is welcomed, and the kiosk counts back to its start', async ({
  page,
  request,
}, info) => {
  const { byPhone } = mine(info)
  const owner = await asOwner(request)
  await openKiosk(page, owner.kioskPath)
  await expect(page.getByText(t('tag.sample'))).toBeVisible()
  await typeNumber(page, byPhone.phone)
  await expect(page.getByRole('status', { name: t('kiosk.display.label') })).toContainText(byPhone.phone.slice(-4))
  await page.getByRole('button', { name: t('kiosk.keypad.submit') }).click()
  await expect(welcomeHeading(page, byPhone.firstName)).toBeVisible()
  await expect(page.getByText(t('kiosk.reset', { n: 5 }))).toBeVisible()
  await expect(keypad(page)).toBeVisible({ timeout: 8000 })
})

test('FR-KIOSK-02 a member checks in by name', async ({ page, request }, info) => {
  const { byName } = mine(info)
  const owner = await asOwner(request)
  const before = await owner.visits(byName)
  await openKiosk(page, owner.kioskPath)
  await chooseName(page)
  await page.getByLabel(t('kiosk.search.label')).fill(byName.firstName)
  await page
    .getByRole('list', { name: t('kiosk.search.results') })
    .getByRole('button', { name: shortName(byName) })
    .click()
  await expect(welcomeHeading(page, byName.firstName)).toBeVisible()
  expect(await owner.visits(byName)).toBe(before + 1)
})

test('FR-KIOSK-04 a visitor joins with a first name, is welcomed on day 1, and is then found by name', async ({
  page,
  request,
}, info) => {
  const { walkIn } = mine(info)
  const owner = await asOwner(request)
  await openKiosk(page, owner.kioskPath)
  await page.getByRole('button', { name: t('kiosk.join') }).click()
  await page.getByLabel(t('kiosk.join.first')).fill(walkIn)
  await page.getByRole('button', { name: t('kiosk.join.submit') }).click()
  await expect(page.getByRole('heading', { level: 1, name: t('kiosk.welcome.first', { first: walkIn }) })).toBeVisible()
  await page.getByRole('heading', { level: 1 }).click()
  await chooseName(page)
  await page.getByLabel(t('kiosk.search.label')).fill(walkIn)
  await expect(page.getByRole('button', { name: walkIn, exact: true })).toBeVisible()
})

test('FR-KIOSK-03 a second check-in within the hour is welcomed but not stored', async ({ page, request }, info) => {
  const { twice } = mine(info)
  const owner = await asOwner(request)
  const before = await owner.visits(twice)
  await openKiosk(page, owner.kioskPath)
  for (let time = 1; time <= 2; time++) {
    await typeNumber(page, twice.phone)
    await page.getByRole('button', { name: t('kiosk.keypad.submit') }).click()
    await expect(welcomeHeading(page, twice.firstName)).toBeVisible()
    await page.getByRole('heading', { level: 1 }).click()
    await expect(keypad(page)).toBeVisible()
  }
  expect(await owner.visits(twice)).toBe(before + 1)
})

test('FR-KIOSK-04 the demo gym joins by name only: no phone field, and a number sent anyway is not stored', async ({
  page,
  request,
}, info) => {
  const { visitor } = mine(info)
  const owner = await asOwner(request)
  await openKiosk(page, owner.kioskPath)
  await page.getByRole('button', { name: t('kiosk.join') }).click()
  await expect(page.getByLabel(t('kiosk.join.first'))).toBeVisible()
  await expect(page.getByText(t('kiosk.join.promptName'))).toBeVisible()
  await expect(page.getByLabel(new RegExp(`^${t('kiosk.join.phone')}`))).toHaveCount(0)
  await page.getByLabel(t('kiosk.join.first')).fill(visitor)
  await page.getByRole('button', { name: t('kiosk.join.submit') }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: t('kiosk.welcome.first', { first: visitor }) }),
  ).toBeVisible()

  const api = owner.kioskPath.replace('/kiosk/', '/api/kiosk/')
  const phone = `+1312555${String(9000 + PROJECTS.indexOf(info.project.name))}`
  expect((await request.post(`${api}/join`, { data: { firstName: `${visitor}x`, phone } })).ok()).toBe(true)
  expect((await request.post(`${api}/checkin`, { data: { phone } })).status()).toBe(404)
})

test('NFR-PERF-02 a kiosk check-in answers in under 1 s', async ({ page, request }, info) => {
  const { timed } = mine(info)
  const owner = await asOwner(request)
  await openKiosk(page, owner.kioskPath)
  await typeNumber(page, timed.phone)
  const started = Date.now()
  await page.getByRole('button', { name: t('kiosk.keypad.submit') }).click()
  await expect(welcomeHeading(page, timed.firstName)).toBeVisible()
  expect(Date.now() - started).toBeLessThan(CHECKIN_BUDGET_MS)
})

test("NFR-USE-03 FR-KIOSK-07 the keys are round and 64 to 76 px, every control is at least 64 px, and the keypad stays put when a number isn't on file", async ({
  page,
  request,
}) => {
  const owner = await asOwner(request)
  await openKiosk(page, owner.kioskPath)
  for (const key of await keypad(page).getByRole('button').all()) {
    const box = await key.boundingBox()
    if (!box) throw new Error('A key has no box')
    expect(box.width).toBeGreaterThanOrEqual(64)
    expect(box.width).toBeLessThanOrEqual(76.5)
    expect(Math.abs(box.height - box.width)).toBeLessThan(0.5)
    const radius = await key.evaluate((el) =>
      parseFloat(el.ownerDocument.defaultView?.getComputedStyle(el).borderTopLeftRadius ?? '0'),
    )
    expect(radius).toBeGreaterThanOrEqual(box.width / 2)
  }
  const join = page.getByRole('button', { name: t('kiosk.join') })
  const controls = [
    page.getByRole('button', { name: t('kiosk.keypad.submit') }),
    join,
    ...(await page
      .getByRole('radiogroup', { name: t('kiosk.mode.label') })
      .locator('label')
      .all()),
  ]
  expect(controls).toHaveLength(4)
  for (const control of controls) expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(64)

  // 202-555-0199 is no sample member's number (they're all 312-555): a 404, and nothing is stored. 555-000-0000 is no
  // US phone at all: a 400 'phone', whose one sentence (err.phone) takes the slot alone, with no hint under it (B2-02).
  const keypadTop = await pageTop(keypad(page))
  const joinTop = await pageTop(join)
  for (const [number, status, line] of [
    ['2025550199', 404, t('kiosk.notFound')],
    ['5550000000', 400, t('err.phone')],
  ] as const) {
    await openKiosk(page, owner.kioskPath)
    await typeNumber(page, number)
    const answer = page.waitForResponse((r) => r.url().endsWith('/checkin'))
    await page.getByRole('button', { name: t('kiosk.keypad.submit') }).click()
    expect((await answer).status()).toBe(status)
    const problem = page.getByText(line, { exact: true })
    await expect(problem).toBeVisible()
    await expect(page.getByText(t('kiosk.idle.prompt'))).toHaveCount(0)
    await expect(page.getByText(t('kiosk.phone.hint'))).toHaveCount(0)
    // Centred, as the prompt it replaces, and nothing under it moves or falls past the window.
    expect(await problem.evaluate((el) => el.ownerDocument.defaultView?.getComputedStyle(el).textAlign)).toBe('center')
    expect(await pageTop(keypad(page)), line).toBe(keypadTop)
    expect(await pageTop(join), line).toBe(joinTop)
    expect(await noScroll(page), line).toBe(true)
  }
})

/** True when the page is no taller than its window: nothing to scroll to. */
const noScroll = (page: Page) =>
  page.locator('html').evaluate((el) => el.scrollHeight <= (el.ownerDocument.defaultView?.innerHeight ?? 0))

test('B2-01 the whole keypad column fits a 375 x 667 window (an iPhone SE, or Safari with its bars) with no scroll', async ({
  page,
  request,
}) => {
  const owner = await asOwner(request)
  await page.setViewportSize({ width: 375, height: 667 })
  await openKiosk(page, owner.kioskPath)
  expect(await noScroll(page)).toBe(true)
  for (const name of [t('kiosk.keypad.submit'), t('kiosk.join')]) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox()
    if (!box) throw new Error(`No ${name}`)
    expect(box.y + box.height, name).toBeLessThanOrEqual(667)
    expect(box.height, name).toBeGreaterThanOrEqual(64)
  }
})

test("B2-15 the join's first-name error fills a line kept for it, so nothing under it moves", async ({
  page,
  request,
}) => {
  const owner = await asOwner(request)
  await openKiosk(page, owner.kioskPath)
  await page.getByRole('button', { name: t('kiosk.join') }).click()
  const cancel = page.getByRole('button', { name: t('kiosk.join.cancel') })
  const before = await pageTop(cancel)
  await page.getByRole('button', { name: t('kiosk.join.submit') }).click()
  await expect(page.getByText(t('kiosk.join.firstRequired'))).toBeVisible()
  expect(await pageTop(cancel)).toBe(before)
})

test('FR-KIOSK-08 a minute without a touch mid-entry asks "Still there?" with one 64 px button, and 20 s more starts over', async ({
  page,
  request,
}) => {
  const owner = await asOwner(request)
  // Playwright's clock, installed before the page loads, so the kiosk's timers run on it.
  await page.clock.install()
  await openKiosk(page, owner.kioskPath)
  const display = page.getByRole('status', { name: t('kiosk.display.label') })
  await typeNumber(page, '312')
  await expect(display).toContainText('312')

  await page.clock.fastForward(60_000)
  const sheet = page.getByRole('dialog', { name: t('kiosk.idle.still') })
  await expect(sheet).toBeVisible()
  // ui's corner X is hidden for this sheet by a :has() rule; this is its real-browser check.
  await expect(sheet.getByRole('button', { name: t('common.close') })).toBeHidden()
  // The question in the kiosk's title style and the countdown under it, both centred (B2-16).
  const style = (locator: Locator) =>
    locator.evaluate((el) => {
      const { textAlign, fontSize } = el.ownerDocument.defaultView?.getComputedStyle(el) ?? {}
      return { textAlign, fontSize }
    })
  expect(await style(sheet.getByRole('heading', { name: t('kiosk.idle.still') }))).toEqual({
    textAlign: 'center',
    fontSize: '32px',
  })
  // The countdown, whatever second it is on: the sheet's one line that ends in a number.
  expect((await style(sheet.getByText(/\d+\.$/))).textAlign).toBe('center')
  const keepGoing = sheet.getByRole('button', { name: t('kiosk.idle.keepGoing') })
  // Polled: the sheet is still settling from its entrance when it first shows.
  await expect.poll(async () => (await keepGoing.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(64)

  // START_OVER_SECONDS in StillThere.tsx: no answer, and the kiosk is back at its start with the number cleared.
  await page.clock.fastForward(20_000)
  await expect(sheet).toBeHidden()
  await expect(display).toHaveText('')
})

test("TC-04 a link that doesn't work says so in its title and the tab's, with no Try Again", async ({ page }) => {
  await page.goto('/kiosk/not-a-real-kiosk-token')
  await expect(page.getByRole('heading', { level: 1, name: t('kiosk.bad.title') })).toBeVisible()
  await expect(page).toHaveTitle(t('brand.pageTitle', { page: t('kiosk.bad.title'), brand: t('brand.name') }))
  await expect(page.getByRole('button', { name: t('kiosk.retry') })).toHaveCount(0)
})

test("the column's title and the segments sit at the same height in Phone Number and Name, and the keypad's Join the Gym ends inside the column", async ({
  page,
  request,
}) => {
  const owner = await asOwner(request)
  const size = page.viewportSize()
  if (!size) throw new Error('The page has no viewport')
  await page.setViewportSize({ width: size.width, height: 1100 })
  await openKiosk(page, owner.kioskPath)
  const title = page.getByRole('heading', { level: 1 })
  const modes = page.getByRole('radiogroup', { name: t('kiosk.mode.label') })
  const top = async (locator: Locator) => {
    const box = await locator.boundingBox()
    if (!box) throw new Error('No box')
    return box
  }
  const phoneTitle = (await top(title)).y
  const phoneModes = (await top(modes)).y
  const join = await top(page.getByRole('button', { name: t('kiosk.join') }))
  const column = await top(keypad(page).locator('xpath=ancestor::*[contains(@class,"column")][1]'))
  expect(join.y + join.height).toBeLessThanOrEqual(column.y + column.height + 0.5)
  await chooseName(page)
  await expect(page.getByLabel(t('kiosk.search.label'))).toBeVisible()
  expect((await top(title)).y).toBeCloseTo(phoneTitle, 0)
  expect((await top(modes)).y).toBeCloseTo(phoneModes, 0)
})
