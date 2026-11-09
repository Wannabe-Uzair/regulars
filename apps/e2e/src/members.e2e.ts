// Target sizes on Members and the member page (NFR-USE-03): each card's or row's member link, the member page's way
// back, and the owner's Change, Save and Cancel, measured as each project lays them out. Nothing is saved.
import type { Locator } from '@playwright/test'
import { t } from '@tenure/copy'
import { demo, expect, signIn, test } from './fixtures.ts'

const TOUCH_TARGET_PX = 44

/** The rendered height of every element `targets` matches, in one round trip. */
const heights = (targets: Locator) => targets.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))

test('NFR-USE-03 every member link on Members, and the owner’s Change, Save and Cancel, are at least 44 px tall', async ({
  page,
}) => {
  await signIn(page, demo.owner)
  await page.goto('/app/members')
  await expect(page.getByRole('heading', { level: 1, name: t('members.title') })).toBeVisible()

  // The name is each row's (or card's) one link to a member page, with no Open.
  const links = page.getByRole('main').locator('a[href^="/app/members/"]')
  const first = (await links.first().textContent()) ?? ''
  expect(first).not.toBe(t('common.open'))
  expect(first).toMatch(/^\p{L}/u)
  const linkHeights = await heights(links)
  expect(linkHeights.length).toBeGreaterThan(0)
  for (const height of linkHeights) expect(height).toBeGreaterThanOrEqual(TOUCH_TARGET_PX)

  await links.first().click()
  await expect(page).toHaveURL(/\/app\/members\/\d+$/)
  await expect(page.getByRole('heading', { level: 1, name: first })).toBeVisible()
  // The way back names Members, which the member was opened from.
  const back = page.getByRole('link', { name: t('a11y.backTo', { page: t('member.back.members') }) })
  expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(TOUCH_TARGET_PX)
  const changes = (['member.edit.name', 'member.edit.coach', 'member.edit.phone'] as const).map((id) =>
    page.getByRole('button', { name: t(id) }),
  )
  for (const change of changes) {
    await expect(change).toBeVisible()
    expect((await change.boundingBox())?.height).toBeGreaterThanOrEqual(TOUCH_TARGET_PX)
  }

  await page.getByRole('button', { name: t('member.edit.phone') }).click()
  const save = page.getByRole('button', { name: t('common.save') })
  const cancel = page.getByRole('button', { name: t('common.cancel') })
  for (const button of [save, cancel]) {
    await expect(button).toBeVisible()
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(TOUCH_TARGET_PX)
  }
  await cancel.click()
  await expect(page.getByRole('button', { name: t('member.edit.phone') })).toBeFocused()
})

test("FR-MEM-02 the search shows its placeholder whole, on the board and on Members, at a laptop's 1280 px too", async ({
  page,
}) => {
  await signIn(page, demo.owner)
  for (const [path, title] of [
    ['/app/board', t('board.title')],
    ['/app/members', t('members.title')],
  ] as const) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // The placeholder typed in, in the field's own font and beside the browser's clear button (which Chrome and Safari
    // keep room for even while the field is empty), must not scroll the field.
    const search = page.getByRole('searchbox', { name: t('common.search') })
    await search.evaluate((input) => input.ownerDocument.fonts.ready)
    await search.fill((await search.getAttribute('placeholder')) ?? '')
    const { scroll, client } = await search.evaluate((input) => ({
      scroll: input.scrollWidth,
      client: input.clientWidth,
    }))
    expect(scroll, path).toBeLessThanOrEqual(client)
  }
})

test('FR-MEM-02 the Week and Pace columns sit flush right, header and figures alike', async ({ page }, info) => {
  test.skip(info.project.name.endsWith('phone'), 'a phone shows cards, not the table')
  await signIn(page, demo.owner)
  await page.goto('/app/members')
  const table = page.getByRole('region', { name: t('members.title') }).getByRole('table')
  for (const col of [t('members.col.week'), t('members.col.pace')]) {
    const header = table.getByRole('columnheader', { name: col })
    const index = await header.evaluate((th) => Array.from(th.parentElement?.children ?? []).indexOf(th))
    expect(await header.evaluate((el) => el.ownerDocument.defaultView?.getComputedStyle(el).textAlign), col).toBe('end')
    expect(
      await table
        .locator('tbody tr')
        .first()
        .locator('td, th')
        .nth(index)
        .evaluate((el) => el.ownerDocument.defaultView?.getComputedStyle(el).textAlign),
      col,
    ).toBe('end')
  }
})

test('FR-MEM-01 the three views stay one row of segments, on a 390 px phone too', async ({ page }) => {
  // The narrowest phone the stall shows (390 x 844), narrower than the projects' own phones.
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, demo.owner)
  await page.goto('/app/members')
  const views = page.getByRole('radiogroup', { name: t('members.view') }).getByRole('radio')
  await expect(views).toHaveCount(3)
  // Each radio is hidden inside its segment's label, so the label's box is the segment.
  const tops = await views.evaluateAll((els) =>
    els.map((el) => Math.round(el.closest('label')!.getBoundingClientRect().top)),
  )
  expect(new Set(tops).size).toBe(1)
})

test('FR-MEM-03 a tap anywhere on a member card opens the member, not only on the name', async ({ page }) => {
  await signIn(page, demo.owner)
  await page.goto('/app/members')
  // The cards are the phone's layout; a laptop shows the table, whose rows are tested above.
  const cards = page.getByRole('list', { name: t('members.title') })
  await expect(page.getByRole('heading', { level: 1, name: t('members.title') })).toBeVisible()
  test.skip(!(await cards.isVisible()), 'the cards show on the phone projects only')
  const card = cards.getByRole('listitem').first()
  const box = await card.boundingBox()
  if (!box) throw new Error('no card')
  // The card's bottom-right corner, well clear of the name, on the link's ::after cover.
  await card.click({ position: { x: box.width - 6, y: box.height - 6 } })
  await expect(page).toHaveURL(/\/app\/members\/\d+$/)
})
