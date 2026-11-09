// What the flows share: the demo logins, read from the seed (never typed into a test), and signing in through the
// real login form.
import { expect, type Page } from '@playwright/test'
import { t } from '@tenure/copy'
import { buildNorthside, DEMO_PASSWORD, type NorthsideUser } from '@tenure/db/seed'
import { DEFAULT_TEMPLATES } from '@tenure/domain'
import { E2E_TZ } from './servers.ts'

export { expect, test } from '@playwright/test'

export type DemoLogin = NorthsideUser & { password: string }

// The users, and the members' names and coaches, don't depend on the day, so any date gives the seeded ones.
const { users, members } = buildNorthside({ today: '2026-01-01', timezone: E2E_TZ, templates: DEFAULT_TEMPLATES })

function login(role: NorthsideUser['role']): DemoLogin {
  const user = users.find((u) => u.role === role)
  if (!user) throw new Error(`The seed has no ${role}`)
  return { ...user, password: DEMO_PASSWORD }
}

/** The demo gym's owner and its first coach, its staff and its members (each with its coach's key). */
export const demo = { owner: login('owner'), coach: login('coach'), users, members }

/** Sign in at /login with the form, and wait until the app has taken over from the login page. */
export async function signIn(page: Page, user: DemoLogin): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(t('login.email')).fill(user.email)
  await page.getByLabel(t('login.password')).fill(user.password)
  await page.getByRole('button', { name: t('login.submit') }).click()
  await expect(page).toHaveURL(/\/app(\/|$)/)
}

/**
 * Waits until the rolling figures have stopped, then asserts every one draws its own digit. The DOM's text is the final
 * value whatever the screen shows, since a digit is drawn only in CSS (generated content moved by the column's
 * transform); so this reads the column's computed translateY, which must stand one line (the window's height) up per
 * step of the digit, within 1 px. (The line is measured fractionally: offsetHeight rounds it, and that error grows with the digit.)
 */
export async function expectFiguresRolledTo(page: Page): Promise<void> {
  await page.waitForFunction('document.getAnimations().length === 0')
  const digits = page.locator('[data-digit]')
  await expect(digits.first()).toBeAttached()
  // A string, run in the page: this project's TypeScript has no DOM types.
  const drawn = (await page.evaluate(`[...document.querySelectorAll('[data-digit]')].map((el) => ({
    digit: Number(el.dataset.digit),
    line: el.getBoundingClientRect().height,
    y: new DOMMatrix(getComputedStyle(el, '::after').transform).m42,
  }))`)) as { digit: number; line: number; y: number }[]
  expect(drawn.length).toBeGreaterThan(0)
  for (const d of drawn) {
    expect(d.line).toBeGreaterThan(0)
    expect(Math.abs(d.y - -d.digit * d.line)).toBeLessThanOrEqual(1)
  }
}
