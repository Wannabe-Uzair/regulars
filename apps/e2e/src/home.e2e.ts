// The home page on the stall server (home-1): Try the Demo three times under one name, and Reset the Demo at the foot.
// Three buttons share "Try the Demo", so every locator is scoped to its landmark (Playwright's strict mode).
import type { Page, Route } from '@playwright/test'
import { t } from '@tenure/copy'
import { expect, test } from './fixtures.ts'

test('FR-WEB-04 the hero’s Try the Demo signs in to Today, and the page’s three share one name', async ({ page }) => {
  await page.goto('/')
  const name = { name: t('demo.try'), exact: true }
  const hero = page.getByRole('region', { name: t('home.title') })
  const close = page.getByRole('region', { name: t('home.close.title') })
  await expect(hero.getByRole('button', name)).toBeVisible()
  await expect(page.getByRole('banner').getByRole('button', name)).toBeVisible()
  await expect(close.getByRole('button', name)).toHaveCount(1)
  await expect(page.getByRole('button', name)).toHaveCount(3)
  // In stall mode there is no sign-up or log-in.
  await expect(page.getByRole('link', { name: t('home.start') })).toHaveCount(0)
  await expect(page.getByRole('link', { name: t('home.login') })).toHaveCount(0)

  await hero.getByRole('button', name).click()
  await expect(page).toHaveURL(/\/app(\/|$)/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('today.owner.title'))
})

test('FR-OPS-03 Reset the Demo is a quiet button at the foot of the page, behind its confirm', async ({ page }) => {
  await page.goto('/')
  const reset = page.getByRole('contentinfo').getByRole('button', { name: t('demo.reset'), exact: true })
  await expect(reset).toHaveCount(1)
  await reset.click()
  const dialog = page.getByRole('dialog', { name: t('demo.reset.title') })
  await expect(dialog).toBeVisible()
  // Cancel only: the stall server is shared by every flow in the run.
  await dialog.getByRole('button', { name: t('common.cancel') }).click()
  await expect(dialog).toBeHidden()
  await expect(reset).toBeFocused()
})

test('FR-OPS-03 once Reset the Demo is confirmed, its confirm closes and the toast says so (preflight F1)', async ({
  page,
}) => {
  // The server's answer is stood in for: a real reset would sign out every flow running beside this one on the
  // shared stall server. The client's side, where the confirm stayed open, is the real one.
  let resets = 0
  await page.route('**/api/demo/reset', async (route: Route) => {
    resets += 1
    await route.fulfill({ json: { ok: true } })
  })
  await page.goto('/')
  const reset = page.getByRole('contentinfo').getByRole('button', { name: t('demo.reset'), exact: true })
  await reset.click()
  const dialog = page.getByRole('dialog', { name: t('demo.reset.title') })
  await dialog.getByRole('button', { name: t('demo.reset'), exact: true }).click()
  await expect(page.getByText(t('demo.reset.done'))).toBeVisible()
  await expect(dialog).toBeHidden()
  expect(resets).toBe(1)
})

test('the hero’s board is a muted clip that plays inline in a loop, hidden from assistive technology', async ({
  page,
}) => {
  await page.goto('/')
  const video = page.getByRole('main').locator('video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('aria-hidden', 'true')
  await expect(video).toHaveAttribute('poster', /\/media\/hero-board-(wide|phone)\.webp$/)
  // It plays: muted, looping, and its time moves on. (Strings, since this project has no DOM types.)
  const playing = `(() => { const v = document.querySelector('main video'); return v.muted && v.loop && !v.paused })()`
  await expect.poll(() => page.evaluate(playing)).toBe(true)
  await expect.poll(() => page.evaluate(`document.querySelector('main video').currentTime`)).toBeGreaterThan(0.2)
})

test('NFR-USE-04 under reduced motion the board is the clip’s still, and nothing moves', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const still = page.getByRole('main').locator('img[src^="/media/hero-board-"]')
  await expect(still).toBeVisible()
  await expect(page.getByRole('img', { name: t('home.board.aria') })).toBeVisible()
  const width = `(() => { const img = document.querySelector('main img'); return img.complete ? img.naturalWidth : 0 })()`
  await expect.poll(() => page.evaluate(width)).toBeGreaterThan(0)
  await expect(page.locator('video')).toHaveCount(0)
  const running = await page.evaluate(
    `document.getAnimations().filter((animation) => animation.playState === 'running').length`,
  )
  expect(running).toBe(0)
})

test('NFR-USE-03 each figure’s footnote link takes a tap 44 px across, centred on its number (audit A19)', async ({
  page,
}) => {
  await page.goto('/')
  const figures = page.getByRole('region', { name: t('home.figures.title') })
  for (const n of [1, 2]) {
    const link = figures.getByRole('link', { name: t('a11y.footnote', { n }) }).first()
    await link.scrollIntoViewIfNeeded()
    // Points 21 px from the number's centre, each way, still land on the link (its hit area, not its glyph).
    const reached = await link.evaluate((a) => {
      const box = a.getBoundingClientRect()
      const [x, y] = [box.left + box.width / 2, box.top + box.height / 2]
      return [
        [x - 21, y],
        [x + 21, y],
        [x, y - 21],
        [x, y + 21],
      ].map(([px, py]) => a.ownerDocument.elementFromPoint(px!, py!)?.closest('a') === a)
    })
    expect(reached, `footnote ${n}`).toEqual([true, true, true, true])
  }
})

test('the three figures share one ink: none reads as a disabled tile (audit A23)', async ({ page }) => {
  await page.goto('/')
  const figures = page.getByRole('region', { name: t('home.figures.title') })
  const values = figures.getByRole('listitem').locator('p:first-child')
  await expect(values).toHaveCount(3)
  const inks = await values.evaluateAll((ps) => ps.map((p) => p.ownerDocument.defaultView?.getComputedStyle(p).color))
  const heading = figures.getByRole('heading', { name: t('home.figures.title') })
  const text = await heading.evaluate((h) => h.ownerDocument.defaultView?.getComputedStyle(h).color)
  expect(inks).toEqual([text, text, text])
})

/** Where the page's parts stand, rounded: the bar's height, then the tops of the logo, main and the close's offer. */
const layout = (page: Page) =>
  page.evaluate(`(() => {
    const top = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY)
    const bar = document.querySelector('header')
    const offers = document.querySelectorAll('main section p:last-child')
    return {
      bar: Math.round(bar.getBoundingClientRect().height),
      logo: top(bar.querySelector('svg')),
      main: top(document.querySelector('main')),
      closeOffer: top(offers[offers.length - 1]),
    }
  })()`)

test('B2-04 nothing moves when the stall question lands: the bar, the hero and the close keep their heights', async ({
  page,
}) => {
  let release = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(
    '**/api/demo',
    async (route: Route) => {
      await held
      await route.continue()
    },
    { times: 1 },
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: t('home.title') })).toBeVisible()
  const name = { name: t('demo.try'), exact: true }
  // While held, no way in shows, yet each place is held.
  await expect(page.getByRole('button', name)).toHaveCount(0)
  for (const place of [
    page.getByRole('banner'),
    page.getByRole('region', { name: t('home.title') }),
    page.getByRole('region', { name: t('home.close.title') }),
  ])
    await expect(place.getByText(t('demo.try'), { exact: true })).toBeHidden()
  await page.evaluate('document.fonts.ready.then(() => undefined)')
  const before = await layout(page)
  release()
  await expect(page.getByRole('button', name)).toHaveCount(3)
  await expect(page.getByRole('banner').getByRole('button', name)).toBeVisible()
  expect(await layout(page)).toEqual(before)
})
