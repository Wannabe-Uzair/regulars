// Skeletons (Uzair's polish, 8 Nov): while a screen's query is held, its placeholder shapes stand where the content will,
// at the content's heights, so nothing jumps when it lands; under reduced motion they stay still. Nothing is saved.
import type { Locator, Page, Route } from '@playwright/test'
import { t } from '@tenure/copy'
import { demo, expect, signIn, test } from './fixtures.ts'

/** Holds the next request to `url` until the returned function lets it through. */
async function hold(page: Page, url: string): Promise<() => void> {
  let release = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(
    url,
    async (route: Route) => {
      await held
      await route.continue()
    },
    { times: 1 },
  )
  return release
}

/** The rounded heights of what `targets` matches, in one round trip. */
const heights = (targets: Locator) =>
  targets.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))

const busy = (page: Page) => page.locator('[aria-busy="true"]:has(> [inert])')

test("the board's placeholder rows and Today's figures are the loaded ones' heights", async ({ page }) => {
  await signIn(page, demo.owner)

  // The board: each placeholder row is as high as a member's row, on a laptop's compact table and a phone's cards.
  let release = await hold(page, '**/api/today')
  await page.goto('/app/board')
  await expect(busy(page)).toBeVisible()
  await expect(busy(page).getByRole('status')).toHaveText(t('common.loading'))
  const placeholders = await heights(busy(page).locator('tbody tr'))
  expect(placeholders.length).toBeGreaterThan(0)
  release()
  await expect(busy(page)).toHaveCount(0)
  const rows = await heights(page.getByRole('main').locator('tbody tr'))
  expect(rows.slice(0, placeholders.length)).toEqual(placeholders)

  // Today: the platter's four figures, and the summary card itself, keep their heights when the counts land.
  release = await hold(page, '**/api/today')
  await page.goto('/app')
  await expect(busy(page)).toBeVisible()
  const figures = await heights(busy(page).locator('[class*="kpis"] > *'))
  expect(figures).toHaveLength(4)
  release()
  await expect(busy(page)).toHaveCount(0)
  await expect(page.getByRole('main').getByRole('group', { name: t('today.kpi.new') })).toBeVisible()
  expect(await heights(page.getByRole('main').locator('[class*="kpis"] > *'))).toEqual(figures)
})

test("Members' and Reports' cohort placeholder rows are the loaded ones' heights", async ({ page }) => {
  await signIn(page, demo.owner)

  // Members: the table's rows on a laptop, the cards on a phone.
  let release = await hold(page, '**/api/members*')
  await page.goto('/app/members')
  await expect(busy(page)).toBeVisible()
  const rowsOf = (root: Locator) => root.locator('tbody tr, ul > li')
  const members = await heights(rowsOf(busy(page)))
  expect(members.length).toBeGreaterThan(0)
  release()
  await expect(busy(page)).toHaveCount(0)
  const loadedMembers = await heights(rowsOf(page.getByRole('main')))
  expect(loadedMembers.slice(0, members.length)).toEqual(members)

  // Reports' cohort table.
  release = await hold(page, '**/api/reports')
  await page.goto('/app/reports')
  await expect(busy(page)).toBeVisible()
  const cohorts = await heights(busy(page).locator('tbody tr'))
  expect(cohorts.length).toBeGreaterThan(0)
  release()
  await expect(busy(page)).toHaveCount(0)
  const loadedCohorts = await heights(page.getByRole('main').locator('tbody tr'))
  expect(loadedCohorts.slice(0, cohorts.length)).toEqual(cohorts)
})

test.describe('under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the placeholder shapes stay still at full fill', async ({ page }) => {
    await signIn(page, demo.owner)
    const release = await hold(page, '**/api/reports')
    await page.goto('/app/reports')
    await expect(busy(page)).toBeVisible()
    // Past --delay-busy, where the pulse would have begun.
    await page.waitForTimeout(1200)
    const fills = await busy(page)
      .locator('[aria-hidden="true"]')
      .evaluateAll((els) =>
        els.flatMap((el) => {
          const style = el.ownerDocument.defaultView?.getComputedStyle
          return style ? [style(el).opacity, style(el, '::before').opacity] : []
        }),
      )
    expect(fills.length).toBeGreaterThan(0)
    expect(new Set(fills)).toEqual(new Set(['1']))
    release()
    await expect(busy(page)).toHaveCount(0)
  })
})
