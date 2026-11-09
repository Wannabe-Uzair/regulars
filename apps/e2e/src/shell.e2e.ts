// The app's frame (TC-46, TC-47): the phone's tab bar and title bar below 1024 px, the sidebar from 1024 px, and the
// one light theme. Read only except the stall test, which signs in and presses Try the Demo.
import type { Locator, Page } from '@playwright/test'
import { t } from '@tenure/copy'
import { demo, expect, signIn, test } from './fixtures.ts'

const TARGET = 44

async function expectTarget(locator: Locator, name: string): Promise<void> {
  const box = await locator.boundingBox()
  expect(box, name).not.toBeNull()
  expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(TARGET)
  expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(TARGET)
}

const tabBar = (page: Page) => page.getByRole('navigation', { name: t('a11y.tabbar') })

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'the tab bar shows below 1024 px')

  test('FR-SHELL-01 NFR-USE-03 the tabs are marked and at least 44 px', async ({ page }) => {
    await signIn(page, demo.owner)
    const tabs = tabBar(page)
    await expect(tabs).toBeVisible()
    const links = tabs.getByRole('link')
    await expect(links).toHaveText([
      t('tab.owner.today'),
      t('tab.owner.board'),
      t('tab.owner.members'),
      t('tab.owner.reports'),
      t('tab.owner.settings'),
    ])
    await expect(tabs.getByRole('button')).toHaveCount(0)
    for (const link of await links.all()) await expectTarget(link, (await link.textContent()) ?? '')
    await expect(tabs.getByRole('link', { name: t('tab.owner.today') })).toHaveAttribute('aria-current', 'page')

    // The header holds the gym name, with no logo and no Log Out for an owner (Settings' Account group has it).
    const header = page.getByRole('banner')
    await expect(header.getByRole('link', { name: t('brand.name') })).toBeHidden()
    await expect(header.getByRole('button', { name: t('nav.logout') })).toBeHidden()

    await tabs.getByRole('link', { name: t('tab.owner.settings') }).click()
    await expect(page).toHaveURL(/\/app\/settings$/)
    await expect(tabs.getByRole('link', { name: t('tab.owner.settings') })).toHaveAttribute('aria-current', 'page')
    await expect(tabs.getByRole('link', { name: t('tab.owner.today') })).not.toHaveAttribute('aria-current')

    // A page under Settings keeps its tab marked.
    await page.goto('/app/settings/import')
    await expect(page.getByRole('heading', { level: 1, name: t('import.title') })).toBeVisible()
    await expect(tabs.getByRole('link', { name: t('tab.owner.settings') })).toHaveAttribute('aria-current', 'page')
  })

  test("FR-SHELL-01 NFR-USE-03 a coach's three tabs and the header's Log Out are at least 44 px", async ({ page }) => {
    await signIn(page, demo.coach)
    const links = tabBar(page).getByRole('link')
    await expect(links).toHaveText([t('tab.coach.today'), t('tab.coach.board'), t('tab.coach.members')])
    for (const link of await links.all()) await expectTarget(link, (await link.textContent()) ?? '')
    const logout = page.getByRole('banner').getByRole('button', { name: t('nav.logout') })
    await expect(logout).toBeVisible()
    await expectTarget(logout, t('nav.logout'))
  })

  test('FR-SHELL-01 the tab bar is a glass capsule inset from the edges', async ({ page }) => {
    await signIn(page, demo.owner)
    const bar = await tabBar(page).boundingBox()
    const viewport = page.viewportSize()
    expect(bar).not.toBeNull()
    // Inset from the sides and the bottom: a capsule, not a docked bar.
    expect(bar!.x).toBeGreaterThan(0)
    expect(bar!.y + bar!.height).toBeLessThan(viewport!.height)
    await expect(tabBar(page)).not.toHaveCSS('backdrop-filter', 'none')
    await expect(tabBar(page)).not.toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test.describe('with more contrast', () => {
    test.use({ contrast: 'more' })

    test('NFR-USE-06 more contrast makes the tab bar opaque', async ({ page }) => {
      await signIn(page, demo.owner)
      await expect(tabBar(page)).toBeVisible()
      await expect(tabBar(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      await expect(tabBar(page)).toHaveCSS('backdrop-filter', 'none')
    })
  })
})

test.describe('laptops', () => {
  test.skip(({ isMobile }) => isMobile, 'the sidebar shows from 1024 px')

  test("FR-SHELL-02 NFR-USE-03 the sidebar's links and Log Out are at least 44 px", async ({ page }) => {
    await signIn(page, demo.owner)
    const sidebar = page.getByRole('navigation', { name: t('a11y.tabs') })
    const links = sidebar.getByRole('link')
    await expect(links).toHaveText([
      t('nav.owner.today'),
      t('nav.owner.board'),
      t('nav.owner.members'),
      t('nav.owner.reports'),
      t('nav.owner.settings'),
    ])
    for (const link of await links.all()) await expectTarget(link, (await link.textContent()) ?? '')
    await expect(sidebar.getByRole('link', { name: t('nav.owner.today') })).toHaveAttribute('aria-current', 'page')
    const logout = page.getByRole('banner').getByRole('button', { name: t('nav.logout') })
    await expect(logout).toBeVisible()
    await expectTarget(logout, t('nav.logout'))
    await expect(tabBar(page)).toBeHidden()
  })

  test("NFR-USE-03 the sidebar's Regulars link home is at least 44 px (audit A19)", async ({ page }) => {
    await signIn(page, demo.owner)
    const home = page.getByRole('banner').getByRole('link', { name: t('brand.name'), exact: true })
    await expect(home).toBeVisible()
    await expectTarget(home, t('brand.name'))
  })

  test("FR-SHELL-03 the sidebar holds the pilot day's line while billing loads, so the nav doesn't move (audit B2-06)", async ({
    page,
  }) => {
    await signIn(page, demo.owner)
    let answer = () => {}
    const held = new Promise<void>((ok) => (answer = ok))
    await page.route('**/api/billing', async (route) => {
      await held
      await route.continue()
    })
    await page.reload()
    const nav = page.getByRole('navigation', { name: t('a11y.tabs') })
    await expect(nav).toBeVisible()
    const before = (await nav.boundingBox())!.y
    answer()
    await expect(page.getByRole('banner').getByText(/Pilot day/)).toBeVisible()
    expect((await nav.boundingBox())!.y).toBe(before)
  })

  test('FR-SHELL-06 the first Tab reaches Skip to Content, which takes focus past the sidebar to the title (audit B2-23)', async ({
    page,
    browserName,
  }) => {
    // Safari's Tab skips links unless the reader turns on "Press Tab to highlight each item"; Option-Tab reaches them.
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab'
    await signIn(page, demo.owner)
    await page.goto('/app/board')
    const title = page.getByRole('heading', { level: 1 })
    await expect(title).toBeVisible()
    await page.keyboard.press(tab)
    const skip = page.getByRole('link', { name: t('shell.skip') })
    await expect(skip).toBeFocused()
    await expectTarget(skip, t('shell.skip'))
    await page.keyboard.press('Enter')
    await expect(title).toBeFocused()
    // The next stop is in the page, not the sidebar.
    await page.keyboard.press(tab)
    await expect(page.getByRole('main').locator(':focus')).toHaveCount(1)
  })
})

test.describe('on a device in dark mode', () => {
  test.use({ colorScheme: 'dark' })

  test('FR-SHELL-07 a dark device still gets the light page', async ({ page }) => {
    // The ground, #F2F2F7, which base.css paints on :root.
    const ground = 'rgb(242, 242, 247)'
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('html')).toHaveCSS('background-color', ground)
    await signIn(page, demo.owner)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('today.owner.title'))
    await expect(page.locator('html')).toHaveCSS('background-color', ground)
    // tokens.css writes `only light`; browsers give the computed value in their canonical order.
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'light only')
  })
})

test.describe('at the stall', () => {
  test('FR-WEB-04 after Log Out, Log In offers Try the Demo in place of the sign-up', async ({ page }) => {
    await signIn(page, demo.coach)
    await page
      .getByRole('button', { name: t('nav.logout') })
      .locator('visible=true')
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('link', { name: t('login.toSignup.link') })).toHaveCount(0)
    await page.getByRole('button', { name: t('demo.try') }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('today.owner.title'))
  })

  test('FR-WEB-04 /signup sends a signed-out visitor to the home page', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/$/)
  })
})
