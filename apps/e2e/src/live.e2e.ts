// The live flow (NFR-PERF-03, FR-TODAY-04, FR-BOARD-03): with the owner's Today and board open, a check-in at the
// kiosk reaches Today with its toast in under 2 s, and the board fills that member's week mark with the pop and tints
// their row.
import type { Page } from '@playwright/test'
import { t } from '@tenure/copy'
import { demo, expect, expectFiguresRolledTo, signIn, test } from './fixtures.ts'

const LIVE_BUDGET_MS = 2000

/** The parts of GET /api/settings and GET /api/today the flow reads (their contracts are the web's and the API's). */
type BoardMember = { id: number; name: string; week: number; weeks: number[] }
type Today = { board: BoardMember[]; checkinsToday: { memberId: number }[] }

/** The flows of every project share their engine's server: each project checks in its own member. */
const PROJECTS = ['chrome-desktop', 'chrome-phone', 'webkit-desktop', 'webkit-phone']

/** Opens `path` and waits until its data is in and its live stream is open, so no event can be missed. */
async function openLive(page: Page, path: string): Promise<void> {
  const stream = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/events')
  await page.goto(path)
  await stream
  await expect(page.getByRole('region', { name: t('board.aria') })).toBeVisible()
}

/** What a screen reader hears for the week in progress with `visits` so far. */
const nowLabel = (week: number, visits: number) =>
  visits === 1 ? t('a11y.cell.nowOne', { n: week + 1 }) : t('a11y.cell.now', { n: week + 1, v: visits })

test('NFR-PERF-03 a kiosk check-in reaches the owner’s Today with its toast in under 2 s, and pops its mark and tints its row on the board', async ({
  page,
  request,
}, testInfo) => {
  await signIn(page, demo.owner)

  // The kiosk's token, and a member in their first 90 days who hasn't checked in today.
  const settings = (await (await page.request.get('/api/settings')).json()) as { kioskPath: string }
  const token = settings.kioskPath.split('/').pop()
  const today = (await (await page.request.get('/api/today')).json()) as Today
  const checkedIn = new Set(today.checkinsToday.map((c) => c.memberId))
  const candidates = today.board.filter((m) => !checkedIn.has(m.id))
  const member: BoardMember | undefined = candidates[Math.max(0, PROJECTS.indexOf(testInfo.project.name))]
  if (!member || !token) throw new Error('The seeded gym has no member left to check in today.')
  const visits = member.weeks[member.week] ?? 0

  // The owner's board in a second tab, then Today in front.
  const boardPage = await page.context().newPage()
  await openLive(boardPage, '/app/board')
  const row = boardPage.locator('tr', { has: boardPage.locator(`a[href="/app/members/${member.id}"]`) })
  await expect(row.getByRole('img', { name: nowLabel(member.week, visits) })).toBeVisible()
  await openLive(page, '/app')

  // The kiosk, with no session of its own.
  const started = Date.now()
  const checkin = await request.post(`/api/kiosk/${token}/checkin`, { data: { memberId: member.id } })
  expect(checkin.ok()).toBe(true)

  await expect(page.getByText(t('toast.checkin', { name: member.name }))).toBeVisible({ timeout: LIVE_BUDGET_MS })
  expect(Date.now() - started).toBeLessThan(LIVE_BUDGET_MS)
  const checkins = page.getByRole('heading', { name: t('today.checkins.title') }).locator('xpath=following::ul[1]')
  // Not in the list before: the seed's own check-ins of today can be later in the day than this one.
  await expect(checkins.getByRole('listitem').filter({ hasText: member.name })).toHaveCount(1)

  // The board's mark for the week in progress counts the visit, and pops.
  const mark = row.getByRole('img', { name: nowLabel(member.week, visits + 1) })
  await expect(mark).toBeVisible({ timeout: LIVE_BUDGET_MS })
  await expect(mark).toHaveCSS('animation-name', /pop/)
  // Its row takes the tint that fades (FR-BOARD-03): on a laptop each cell, from the name on; on a phone the card.
  const tinted = testInfo.project.name.endsWith('-phone') ? row : row.getByRole('rowheader')
  await expect(tinted).toHaveCSS('animation-name', /tint/)

  // Last, so the waiting doesn't outlast the board's pop and tint. The figures on Today settle on the new values: the text alone would pass even if the drawn digit were stale.
  await page.waitForTimeout(1000)
  await expectFiguresRolledTo(page)
})
