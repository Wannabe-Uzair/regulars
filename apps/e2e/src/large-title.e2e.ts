// The phone's large title tucking into the top bar (ARCHITECTURE §2, "App shell"): below 48rem the page's h1 is the
// 34 px large title, and once it scrolls under the bar the bar's small centred title fades in. Laptops keep their
// titles as they are. Read only: nothing here writes to the demo gym.
import type { Page } from '@playwright/test'
import { t } from '@tenure/copy'
import { buildNorthside } from '@tenure/db/seed'
import { DEFAULT_TEMPLATES } from '@tenure/domain'
import { demo, expect, signIn, test } from './fixtures.ts'
import { E2E_TZ } from './servers.ts'

const title = t('today.owner.title')
// The gym's name comes from the seed, the way kiosk.e2e.ts builds it; the date doesn't change the name.
const gymName = buildNorthside({ today: '2026-01-01', timezone: E2E_TZ, templates: DEFAULT_TEMPLATES }).gym.name
const bar = (page: Page) => page.getByRole('banner')
/** The bar's copy of the title, hidden from assistive tech. */
const barTitle = (page: Page) => bar(page).locator('[aria-hidden="true"]').filter({ hasText: title })
const scrollTo = (page: Page, y: number) =>
  page
    .locator('html')
    .evaluate((root, top) => root.ownerDocument.defaultView?.scrollTo({ top, behavior: 'instant' }), y)

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'the large title tucks below 48rem')

  test('FR-SHELL-01 the large title tucks into the bar as it scrolls under it, and comes back out', async ({
    page,
  }) => {
    await signIn(page, demo.owner)
    const heading = page.getByRole('heading', { level: 1, name: title })
    await expect(heading).toHaveCSS('font-size', '34px')
    await expect(bar(page)).not.toHaveAttribute('data-tucked')
    await expect(barTitle(page)).toHaveCSS('opacity', '0')
    await scrollTo(page, 400)
    await expect(bar(page)).toHaveAttribute('data-tucked', '')
    await expect(barTitle(page)).toHaveCSS('opacity', '1')
    await expect(bar(page).getByText(gymName)).toHaveCSS('opacity', '0')
    // The large title is still the page's one h1, for assistive tech and for focus after a navigation.
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await scrollTo(page, 0)
    await expect(bar(page)).not.toHaveAttribute('data-tucked')
    await expect(barTitle(page)).toHaveCSS('opacity', '0')
  })

  test("FR-SHELL-01 a scroll that stops part-way shows one title: the large one at 24 px, the bar's at 48 px (audit B2-05)", async ({
    page,
  }) => {
    await signIn(page, demo.owner)
    const heading = page.getByRole('heading', { level: 1, name: title })
    await expect(heading).toBeVisible()
    const barBottom = async () => {
      const box = (await bar(page).boundingBox())!
      return box.y + box.height
    }
    // 24 px up: over half the large title is still in view below the bar, so the bar does not carry it as well.
    await scrollTo(page, 24)
    await expect(bar(page)).not.toHaveAttribute('data-tucked')
    await expect(barTitle(page)).toHaveCSS('opacity', '0')
    const box = (await heading.boundingBox())!
    expect(box.y + box.height / 2).toBeGreaterThan(await barBottom())
    // 48 px up: half of it has passed under the bar, and the bar's title takes over.
    await scrollTo(page, 48)
    await expect(bar(page)).toHaveAttribute('data-tucked', '')
    await expect(barTitle(page)).toHaveCSS('opacity', '1')
  })

  test('ARCHITECTURE §2 the tucked bar centres the title and keeps the Sample data tag at its trailing edge (audit B2-20)', async ({
    page,
  }) => {
    await signIn(page, demo.owner)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await scrollTo(page, 400)
    await expect(barTitle(page)).toHaveCSS('opacity', '1')
    const width = page.viewportSize()!.width
    const text = (await barTitle(page).getByText(title, { exact: true }).boundingBox())!
    const tag = (await barTitle(page).getByText(t('tag.sample'), { exact: true }).boundingBox())!
    expect(Math.abs(text.x + text.width / 2 - width / 2)).toBeLessThanOrEqual(1)
    expect(tag.x).toBeGreaterThan(text.x + text.width)
    // At the bar's 16 px gutter, within the tag's own edge.
    expect(Math.abs(tag.x + tag.width - (width - 16))).toBeLessThanOrEqual(2)
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('NFR-USE-04 the titles swap with no animation', async ({ page }) => {
      await signIn(page, demo.owner)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
      await scrollTo(page, 400)
      await expect(bar(page)).toHaveAttribute('data-tucked', '')
      // No transition to wait for: the copy is already all there the moment the bar is tucked.
      const style = await barTitle(page).evaluate((el) => {
        const s = el.ownerDocument.defaultView!.getComputedStyle(el)
        return { opacity: s.opacity, duration: s.transitionDuration, delay: s.transitionDelay }
      })
      expect(style).toEqual({ opacity: '1', duration: '0s', delay: '0s' })
    })
  })
})

test.describe('laptops', () => {
  test.skip(({ isMobile }) => isMobile, 'the sidebar shows from 1024 px')

  test('FR-SHELL-02 the title stays in the content: nothing tucks and the bar has no copy', async ({ page }) => {
    await signIn(page, demo.owner)
    const heading = page.getByRole('heading', { level: 1, name: title })
    await expect(heading).toHaveCSS('font-size', '32px')
    await scrollTo(page, 400)
    await expect(heading).toHaveCSS('font-size', '32px')
    await expect(barTitle(page)).toHaveCount(0)
    await expect(bar(page)).not.toHaveAttribute('data-tucked')
  })
})
