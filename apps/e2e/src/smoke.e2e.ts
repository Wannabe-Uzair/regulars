// The smoke flow: the demo gym's staff sign in through the real form and land on Today.
import { t } from '@tenure/copy'
import { demo, expect, expectFiguresRolledTo, signIn, test } from './fixtures.ts'

const TODAY_BUDGET_MS = 2000

test('FR-AUTH-04 the owner logs in with email and password and sees Today', async ({ page }) => {
  await signIn(page, demo.owner)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('today.owner.title'))
  // The four figures and the headline's numbers draw their final digits, in this engine too.
  await expect(page.getByText(t('today.kpi.new'), { exact: true })).toBeVisible()
  await expectFiguresRolledTo(page)
})

test('FR-TODAY-01 a coach logs in and sees only their own members on Today', async ({ page }) => {
  await signIn(page, demo.coach)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('today.coach.title'))

  // Every "Slipping Now" row is one of the signed-in coach's own members, so no row names a coach, not even theirs
  // (FR-TODAY-02, audit B2-22).
  const rows = page.getByRole('heading', { name: t('today.slipping.title') }).locator('xpath=following::ul[1]/li')
  await expect(rows.first()).toBeVisible()
  const theirs = demo.members.filter((m) => m.coachKey === demo.coach.key).map((m) => `${m.firstName} ${m.lastName}`)
  for (const row of await rows.all()) {
    expect(theirs).toContain(await row.getByRole('link').locator('span').first().textContent())
    for (const user of demo.users) await expect(row).not.toContainText(user.name)
  }
})

test('NFR-PERF-01 Today loads in under 2 s', async ({ page }) => {
  await signIn(page, demo.owner)
  const started = Date.now()
  await page.goto('/app')
  // Loaded means the data is in: the KPIs and the board, not just the page's title. Exact, since the live sentence
  // over the figures ("12 of 60 new members are slipping") holds the label's words too.
  await expect(page.getByRole('main').getByRole('group', { name: t('today.kpi.new') })).toBeVisible()
  await expect(page.getByRole('heading', { name: t('today.board.title') })).toBeVisible()
  expect(Date.now() - started).toBeLessThan(TODAY_BUDGET_MS)
})
