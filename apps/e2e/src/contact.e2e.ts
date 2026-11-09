// Contacting a slipping member from their page on a phone (FR-NUDGE-01 to 05): the composer, a template, then the
// channels stacked under the message (WhatsApp and Copy Message here), and the no-phone variant's Record Nudge. Each
// records the nudge with its channel; Tenure sends nothing itself, and the WhatsApp hand-off is stopped at wa.me.
import type { Page } from '@playwright/test'
import { t } from '@tenure/copy'
import { DEFAULT_TEMPLATES } from '@tenure/domain'
import { demo, expect, signIn, test } from './fixtures.ts'

type Member = { id: number; firstName: string; phone: string | null }

test.beforeEach(() => {
  test.skip(!test.info().project.name.endsWith('-phone'), 'The Contact flow runs on the phone projects.')
})

/** A member of the demo gym with a phone on file, from the API the screens use. */
async function memberWithPhone(page: Page): Promise<Member> {
  const answer = (await (await page.request.get('/api/members')).json()) as { members: Member[] }
  const member = answer.members.find((m) => m.phone !== null)
  if (!member) throw new Error('The demo gym has no member with a phone')
  return member
}

async function openComposer(page: Page, member: Member) {
  await page.goto(`/app/members/${member.id}`)
  await page.getByRole('button', { name: t('a11y.nudgeMember', { name: member.firstName }) }).click()
  const dialog = page.getByRole('dialog', { name: t('nudge.title', { first: member.firstName }) })
  await expect(dialog).toBeVisible()
  return dialog
}

/** What the next POST /api/nudges that the API accepted carried. */
function nextRecord(page: Page): Promise<{ channel: unknown; body: unknown }> {
  return page
    .waitForResponse((r) => r.url().endsWith('/api/nudges') && r.request().method() === 'POST' && r.ok())
    .then((r) => r.request().postDataJSON() as { channel: unknown; body: unknown })
}

test('FR-NUDGE-01 FR-NUDGE-03 a coach picks a template and sends it on WhatsApp, recorded as whatsapp', async ({
  page,
  context,
}) => {
  // The hand-off stops at wa.me: nothing leaves the stall.
  await context.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: '' }))
  await signIn(page, demo.coach)
  const member = await memberWithPhone(page)
  const dialog = await openComposer(page, member)

  const template = DEFAULT_TEMPLATES[1]!
  await dialog.getByLabel(t('nudge.template')).selectOption({ label: template.name })
  const message = dialog.getByLabel(t('nudge.text'))
  await expect(message).toHaveValue(new RegExp(`^Hi ${member.firstName}, it's .+ from .+\\.`))
  const body = await message.inputValue()

  // The channels sit in the sheet itself, with no menu: Text Message shows on phones, over WhatsApp and Copy Message.
  await expect(dialog.getByRole('button', { name: t('nudge.contact', { first: member.firstName }) })).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: t('nudge.contact.text') })).toBeVisible()
  await expect(dialog.getByRole('button', { name: t('nudge.copy') })).toBeVisible()
  const whatsapp = dialog.getByRole('link', { name: t('nudge.contact.whatsapp') })
  await expect(whatsapp).toHaveAttribute('href', `https://wa.me/${member.phone!.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`)

  const recorded = nextRecord(page)
  const popup = page.waitForEvent('popup')
  await whatsapp.click()
  // WhatsApp opens in a new tab, so Tenure stays where it was.
  const opened = await popup
  await expect(opened).toHaveURL(/^https:\/\/wa\.me\//)
  await opened.close()
  expect(await recorded).toMatchObject({ channel: 'whatsapp', body })
  await expect(page.getByText(t('toast.nudge', { first: member.firstName }))).toBeVisible()
  await expect(dialog).toBeHidden()
  // The Nudge that opened it now reads Nudged, with its check (FR-TODAY-02).
  await expect(page.getByRole('button', { name: t('a11y.nudgedMember', { name: member.firstName }) })).toHaveText(
    t('nudge.done'),
  )
})

test('FR-NUDGE-03 Copy Message copies the message and records the nudge as copy', async ({ page }) => {
  await signIn(page, demo.owner)
  const member = await memberWithPhone(page)
  const dialog = await openComposer(page, member)
  await expect(dialog.getByLabel(t('nudge.text'))).not.toHaveValue('')

  const recorded = nextRecord(page)
  await dialog.getByRole('button', { name: t('nudge.copy') }).click()
  expect(await recorded).toMatchObject({ channel: 'copy' })
  // One tap, one toast, saying both (audit B2-03).
  await expect(page.getByText(t('nudge.copied', { first: member.firstName }))).toBeVisible()
  await expect(page.getByText(t('toast.nudge', { first: member.firstName }))).toHaveCount(0)
  await expect(dialog).toBeHidden()
})

test("FR-TODAY-02 Copy Message's one toast leaves the nudged row in sight, even a row just above the tab bar (audit B2-03)", async ({
  page,
}) => {
  await signIn(page, demo.owner)
  await page.goto('/app')
  const bar = (await page.getByRole('navigation', { name: t('a11y.tabbar') }).boundingBox())!
  // A Nudge whose middle sits 40 px above the tab bar, where a toast rises: the first row below that line, scrolled up to it.
  const line = bar.y - 40
  const rows = page.getByRole('heading', { name: t('today.slipping.title') }).locator('xpath=following::ul[1]/li')
  const nudges = rows.locator('button[data-member]')
  // The rows are measured once Today has loaded: its placeholder has the same heading and list, with no Nudge in it.
  await expect(nudges.first()).toBeVisible()
  const middles = await nudges.evaluateAll((buttons) =>
    buttons.map((b) => {
      const box = b.getBoundingClientRect()
      return box.top + box.height / 2
    }),
  )
  const index = middles.findIndex((middle) => middle > line + 1)
  expect(index).toBeGreaterThanOrEqual(0)
  const nudge = nudges.nth(index)
  await nudge.evaluate((button, by) => button.ownerDocument.defaultView?.scrollBy(0, by), middles[index]! - line)
  const before = (await nudge.boundingBox())!
  expect(Math.abs(before.y + before.height / 2 - line)).toBeLessThan(2)

  await nudge.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel(t('nudge.text'))).not.toHaveValue('')
  await dialog.getByRole('button', { name: t('nudge.copy') }).click()
  await expect(dialog).toBeHidden()
  const toasts = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: t('toast.dismiss') }) })
  await expect(toasts).toHaveCount(1)
  const toast = (await toasts.boundingBox())!
  const nudged = page.locator(`button[data-member="${await nudge.getAttribute('data-member')}"]`)
  await expect(nudged).toHaveText(t('nudge.done'))
  // The whole row that changed stays in sight above the toast, with 8 px of air, not only its Nudged.
  const row = (await rows.filter({ has: nudged }).boundingBox())!
  expect(row.y + row.height + 8).toBeLessThanOrEqual(toast.y)
})

test('FR-NUDGE-04 a member with no phone gets Record Nudge, recorded in person', async ({ page }) => {
  await signIn(page, demo.owner)
  const member = await memberWithPhone(page)
  // The demo's members all have phones: this page is shown one without, and the database is left as it is.
  await page.route(`**/api/members/${member.id}`, async (route) => {
    const response = await route.fetch()
    const answer = (await response.json()) as { member: Member }
    await route.fulfill({ response, json: { ...answer, member: { ...answer.member, phone: null } } })
  })
  const dialog = await openComposer(page, member)
  await expect(dialog.getByRole('heading', { name: t('nudge.noPhoneTitle') })).toBeVisible()
  // No channel without a phone: Record Nudge is the one action.
  await expect(dialog.getByRole('link')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: t('nudge.copy') })).toHaveCount(0)
  await expect(dialog.getByLabel(t('nudge.text'))).not.toHaveValue('')

  const recorded = nextRecord(page)
  await dialog.getByRole('button', { name: t('nudge.noPhoneAction') }).click()
  expect(await recorded).toMatchObject({ channel: 'in-person' })
  await expect(page.getByText(t('toast.nudge', { first: member.firstName }))).toBeVisible()
  await expect(dialog).toBeHidden()
})
