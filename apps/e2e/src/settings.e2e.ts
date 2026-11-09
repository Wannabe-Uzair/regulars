// Settings (the second audit, B2-07 and B2-17): it loads as a skeleton of its own panels at their loaded heights, and
// shows one Log Out on every screen: the Account group's below 1024 px, the sidebar's from there. Nothing is saved.
import type { Locator, Page } from '@playwright/test'
import { t } from '@tenure/copy'
import { demo, expect, signIn, test } from './fixtures.ts'

const busy = (page: Page) => page.locator('[aria-busy="true"]:has(> [inert])')

/** A panel by its title: the heading sits in the panel's header, which sits in the panel. */
const panel = (root: Locator, title: string) => root.locator('h2').filter({ hasText: title }).locator('xpath=../..')

const height = (target: Locator) => target.evaluate((el) => Math.round(el.getBoundingClientRect().height))

test("FR-GYM-01 Settings' placeholder panels are the loaded panels' heights (audit B2-07)", async ({ page }) => {
  await signIn(page, demo.owner)
  let release = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(
    '**/api/settings',
    async (route) => {
      await held
      await route.continue()
    },
    { times: 1 },
  )
  await page.goto('/app/settings')
  await expect(busy(page)).toBeVisible()
  await busy(page).evaluate((el) => el.ownerDocument.fonts.ready)
  await expect(busy(page).getByRole('status')).toHaveText(t('common.loading'))
  const titles = [t('kiosk.set.title'), t('settings.gym.title')]
  const placeholders = await Promise.all(titles.map((title) => height(panel(busy(page), title))))
  release()
  await expect(busy(page)).toHaveCount(0)
  const main = page.getByRole('main')
  await expect(main.getByLabel(t('settings.gym.name'))).toBeVisible()
  expect(await Promise.all(titles.map((title) => height(panel(main, title))))).toEqual(placeholders)
})

test("FR-SHELL-01 FR-SHELL-02 Settings shows one Log Out, the sidebar's from 1024 px and the Account group's below (audit B2-17)", async ({
  page,
}) => {
  await signIn(page, demo.owner)
  await page.goto('/app/settings')
  const main = page.getByRole('main')
  await expect(main.getByLabel(t('settings.gym.name'))).toBeVisible()
  const logout = page.getByRole('button', { name: t('nav.logout') }).locator('visible=true')
  await expect(logout).toHaveCount(1)
  const laptop = (page.viewportSize()?.width ?? 0) >= 1024
  const account = main.getByRole('heading', { name: t('settings.account.title') })
  if (laptop) {
    await expect(page.getByRole('banner').getByRole('button', { name: t('nav.logout') })).toBeVisible()
    await expect(account).toBeHidden()
  } else {
    await expect(main.getByRole('button', { name: t('nav.logout') })).toBeVisible()
    await expect(account).toBeVisible()
  }
})
