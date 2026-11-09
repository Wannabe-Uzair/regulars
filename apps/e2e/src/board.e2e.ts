// The board's page at a phone's width (skill checklist: no sideways page scroll): the page is as wide as the screen, so
// nothing past its edge (the filter line's chips, say) stretches the page or the fixed tab bar. On a laptop, it fits
// the window, so only the board's frame scrolls.
import { t } from '@tenure/copy'
import { demo, expect, signIn, test } from './fixtures.ts'

test('the board and Members do not scroll sideways: the page is as wide as the screen', async ({ page }) => {
  await signIn(page, demo.owner)
  for (const [path, title] of [
    ['/app/board', t('board.title')],
    ['/app/members', t('members.title')],
  ] as const) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: t('board.filter.status') })).toBeVisible()
    const { scroll, client } = await page
      .locator('html')
      .evaluate((root) => ({ scroll: root.scrollWidth, client: root.clientWidth }))
    expect(scroll, path).toBe(client)
  }
})

test('the status chips are never cut mid-word at the line’s end: it fades, and the last chip scrolls whole into view (audit A21)', async ({
  page,
}) => {
  await signIn(page, demo.owner)
  for (const [path, title] of [
    ['/app/board', t('board.title')],
    ['/app/members', t('members.title')],
  ] as const) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    const line = page.getByRole('radiogroup', { name: t('board.filter.status') })
    await expect(line.locator('label').last()).toHaveText(t('status.below'))
    const look = await line.evaluate((el) => {
      const last = el.querySelectorAll('label')[el.querySelectorAll('label').length - 1]!
      const overflows = el.scrollWidth > el.clientWidth
      const mask = el.ownerDocument.defaultView?.getComputedStyle(el).maskImage
      el.scrollLeft = el.scrollWidth
      // The room the last chip keeps from the line's edge once scrolled to the end.
      const room = el.getBoundingClientRect().right - last.getBoundingClientRect().right
      return {
        overflows,
        mask,
        room,
        width: el.ownerDocument.documentElement.clientWidth,
        right: last.getBoundingClientRect().right,
      }
    })
    // Every chip lies within the screen once scrolled to.
    expect(look.right, path).toBeLessThanOrEqual(look.width)
    if (look.overflows) {
      // A line that runs past the edge fades out there, and its last chip ends clear of the fade.
      expect(look.mask, path).toContain('linear-gradient')
      expect(look.room, path).toBeGreaterThanOrEqual(40)
    }
  }
})

test('on a laptop the board fits the window: the page doesn’t scroll, only the board’s frame does (audit B2-18)', async ({
  page,
}, info) => {
  test.skip(info.project.name.endsWith('phone'), 'a phone scrolls the page, with no frame of its own')
  await signIn(page, demo.owner)
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1024, height: 640 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/app/board')
    const frame = page.getByRole('region', { name: t('board.aria') })
    await expect(frame.getByRole('row').nth(20)).toBeAttached()
    const look = await frame.evaluate((el) => {
      const root = el.ownerDocument.documentElement
      return { page: root.scrollHeight, window: root.clientHeight, rows: el.scrollHeight, shown: el.clientHeight }
    })
    const size = `${viewport.width} x ${viewport.height}`
    expect(look.page, size).toBe(look.window)
    // The seeded board is longer than any of these windows, so its frame is what scrolls.
    expect(look.rows, size).toBeGreaterThan(look.shown)
  }
})
