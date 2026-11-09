import type { CoachesResponse, MemberDetailResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { buttonClass } from '@tenure/ui'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { FakeEventSource, json } from '../../../test/fakes.ts'
import factStyles from '../components/Facts.module.css'
import historyStyles from '../components/History.module.css'
import { detail, renderApp, resetScreen, setScreen, summary } from '../test-helpers.ts'
import styles from './Member.module.css'
import skeletonStyles from './MemberSkeleton.module.css'

const sam = summary({
  id: 12,
  firstName: 'Sam',
  lastName: 'Okafor',
  phone: '+13125550142',
  status: 'slipping',
  daysSinceJoin: 35,
  daysSinceLastVisit: 9,
})

const page: MemberDetailResponse = detail(sam, {
  checkins: [{ at: '2026-10-29T14:05:00.000Z', source: 'kiosk' }],
  nudges: [
    {
      id: 7,
      at: '2026-11-01T16:30:00.000Z',
      by: 'Priya S.',
      body: 'Hey Sam, we miss you.',
      channel: 'whatsapp',
      cameBack: true,
    },
    { id: 5, at: '2026-10-20T16:30:00.000Z', by: null, body: 'Old one.', channel: null, cameBack: false },
  ],
})

const staff: CoachesResponse = {
  staff: [
    { id: 1, name: 'Dana R.', email: 'dana@gym.com', role: 'owner', active: true, members: 0, slipping: 0 },
    { id: 2, name: 'Priya S.', email: 'priya@gym.com', role: 'coach', active: true, members: 4, slipping: 1 },
    { id: 9, name: 'Gone G.', email: 'gone@gym.com', role: 'coach', active: false, members: 0, slipping: 0 },
  ],
}

let answer: () => Response
let patchAnswer: (body: unknown) => Response
let archiveAnswer: (path: string) => Response
let deleteAnswer: () => Response

function renderMember(role: 'owner' | 'coach' = 'owner', path = '/app/members/12', gym = {}) {
  return renderApp(
    path,
    role,
    (method, url, body) => {
      if (url === '/api/members/12' && method === 'GET') return answer()
      if (url === '/api/members/12' && method === 'PATCH') return patchAnswer(body)
      if (url === '/api/members/12' && method === 'DELETE') return deleteAnswer()
      if (/^\/api\/members\/12\/(archive|restore)$/.test(url) && method === 'POST') return archiveAnswer(url)
      if (/^\/api\/members\?view=\w+$/.test(url)) return json(200, { members: [] })
      if (url === '/api/coaches') return json(200, staff)
      if (url.startsWith('/api/members/')) {
        return json(404, { error: { code: 'memberNotFound', message: "We couldn't find that member." } })
      }
      return undefined
    },
    gym,
  )
}

/** The value beside a fact's label. */
const fact = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement

beforeEach(() => {
  FakeEventSource.install()
  setScreen(true)
  answer = () => json(200, page)
  patchAnswer = () => json(200, page)
  archiveAnswer = (path) => json(200, detail(sam, { archivedAt: path.endsWith('/archive') ? '2026-11-07T15:00:00.000Z' : null }))
  deleteAnswer = () => json(200, { ok: true })
})
afterEach(() => {
  vi.unstubAllGlobals()
  resetScreen()
})

describe('the member page', () => {
  test('FR-MEMBER-01 a contact-card head: the name, then the status and last visit, then Nudge; then the facts', async () => {
    renderMember()
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    // In reading order: the title, one line with the status word and the last visit, then Nudge, all before the facts.
    const head = h1.parentElement!
    const [title, state, nudge] = [...head.children]
    expect(title).toBe(h1)
    expect(state).toHaveTextContent(`${t('status.slipping')}${t('member.lastVisit', { n: 9 })}`)
    expect(within(nudge as HTMLElement).getByRole('button')).toHaveAccessibleName(
      t('a11y.nudgeMember', { name: 'Sam' }),
    )
    expect(head.compareDocumentPosition(screen.getByText(t('member.name'), { selector: 'dt' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(fact(t('member.name'))).toHaveTextContent('Sam Okafor')
    expect(fact(t('member.coach'))).toHaveTextContent('Priya S.')
    expect(fact(t('member.joinedOn'))).toHaveTextContent(/^Oct 3$/)
    expect(screen.getByText(t('status.slipping'))).toBeInTheDocument()
    expect(screen.getByText(t('member.lastVisit', { n: 9 }))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('a11y.nudgeMember', { name: 'Sam' }) })).toHaveTextContent(
      t('member.nudge'),
    )
  })

  test('FR-MEMBER-03 the phone is national at a gym in its country, and international elsewhere', async () => {
    renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    expect(fact(t('member.phone'))).toHaveTextContent('(312) 555-0142')
  })

  test('FR-MEMBER-03 a US number at a UK gym shows in international format, and the joined year when not this one', async () => {
    answer = () => json(200, detail({ ...sam, joinedOn: '2025-12-30' }))
    renderMember('owner', '/app/members/12', { country: 'GB', timezone: 'Europe/London' })
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    expect(fact(t('member.phone'))).toHaveTextContent('+1 312 555 0142')
    expect(fact(t('member.joinedOn'))).toHaveTextContent('30 Dec 2025')
  })

  test('FR-MEMBER-01 no phone and no coach read as such, and a single name stands alone', async () => {
    answer = () =>
      json(200, detail({ ...sam, firstName: 'Leo', lastName: '', phone: null, coachId: null, coachName: null }))
    renderMember()
    expect(await screen.findByRole('heading', { level: 1, name: 'Leo' })).toBeInTheDocument()
    expect(fact(t('member.phone'))).toHaveTextContent(t('member.phone.none'))
    expect(fact(t('member.coach'))).toHaveTextContent(t('member.coach.none'))
  })

  test('FR-MEMBER-01 the 90 days on the days grid, named by the visits so far', async () => {
    renderMember()
    // Today is day 35; every third day before it (0, 3 … 33) is a visit: 12 visits in the first 36 days.
    const grid = await screen.findByRole('img', { name: t('a11y.days.many', { n: 12, d: 36 }) })
    const days = [...grid.querySelectorAll('rect[data-day]')].map((r) => (r as SVGRectElement).dataset.day)
    expect(days).toHaveLength(90)
    expect(days.slice(0, 4)).toEqual(['visited', 'missed', 'missed', 'visited'])
    expect(days[34]).toBe('missed')
    // Today, not visited yet, is still to come.
    expect(days[35]).toBe('ahead')
  })

  test('FR-MEMBER-01 the grid numbers the 13 weeks, hidden from screen readers, and rings the current one', async () => {
    renderMember()
    // Day 35 is in week 6 (member.week 5, counted from 0).
    const grid = await screen.findByRole('img', { name: t('a11y.days.many', { n: 12, d: 36 }) })
    const numbers = [...grid.querySelectorAll('text')]
    expect(numbers.map((n) => n.textContent)).toEqual(Array.from({ length: 13 }, (_, w) => String(w + 1)))
    expect(numbers[0]!.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(grid.querySelector('[data-current-week]')).toHaveAttribute('data-current-week', '6')
  })

  test('FR-MEMBER-01 from day 90 no week is ringed: none is in progress', async () => {
    answer = () => json(200, detail({ ...sam, daysSinceJoin: 95, week: 12 }))
    renderMember()
    const grid = await screen.findByRole('img', { name: /90 days/ })
    expect(grid.querySelectorAll('text')).toHaveLength(13)
    expect(grid.querySelector('[data-current-week]')).toBeNull()
  })

  test("FR-MEMBER-01 the check-ins and the nudges at the gym's times, each nudge with its channel words", async () => {
    renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    expect(screen.getByText('Oct 29, 9:05 AM')).toBeInTheDocument()
    const nudges = screen.getByRole('heading', { name: t('member.nudges.title') }).parentElement!.parentElement!
    const [latest, oldest] = within(nudges).getAllByRole('listitem')
    expect(latest).toHaveTextContent('Priya S.')
    expect(latest).toHaveTextContent(t('nudges.channel.whatsapp'))
    expect(latest).toHaveTextContent(t('member.nudges.cameBack'))
    expect(latest).toHaveTextContent('Hey Sam, we miss you.')
    for (const words of ['text', 'whatsapp', 'copy', 'inPerson'] as const) {
      expect(oldest).not.toHaveTextContent(t(`nudges.channel.${words}`))
    }
  })

  test('FR-MEMBER-01 empty check-ins and nudges say so', async () => {
    answer = () => json(200, detail(sam))
    renderMember()
    expect(await screen.findByText(t('member.checkins.empty'))).toBeInTheDocument()
    expect(screen.getByText(t('member.nudges.empty'))).toBeInTheDocument()
  })

  test('FR-MEMBER-01 from day 90 the head row shows Past 90 days instead of a status', async () => {
    answer = () => json(200, detail({ ...sam, daysSinceJoin: 95, week: 12 }))
    renderMember()
    expect(await screen.findByText(t('members.past90'))).toBeInTheDocument()
    expect(screen.queryByText(t('status.slipping'))).not.toBeInTheDocument()
  })

  test('FR-MEMBER-01 an unknown member shows the not-found view with the server sentence and a way back', async () => {
    renderMember('owner', '/app/members/99')
    expect(await screen.findByRole('heading', { level: 1, name: t('member.notFound.title') })).toBeInTheDocument()
    expect(screen.getByText("We couldn't find that member.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: t('member.notFound.back') })).toHaveAttribute('href', '/app/members')
  })

  test('FR-MEMBER-01 Member Not Found looks as Page Not Found does (B2-09)', async () => {
    renderMember('owner', '/app/members/99')
    const h1 = await screen.findByRole('heading', { level: 1, name: t('member.notFound.title') })
    // One tinted way back, not the filled main action, with the sentence under the title in one group, which keeps the
    // page's own top (no pull toward a back link that isn't there).
    const way = screen.getByRole('link', { name: t('member.notFound.back') })
    expect(way.className).toBe(buttonClass({ variant: 'tinted' }))
    const group = h1.parentElement!
    expect([...group.children]).toEqual([h1, screen.getByText("We couldn't find that member."), way])
    expect(group).toHaveClass(styles.head!, styles.missing!)
  })

  test('FR-MEMBER-01 an id that is not a number is not found without asking', async () => {
    const { calls } = renderMember('owner', '/app/members/abc')
    expect(await screen.findByRole('heading', { level: 1, name: t('member.notFound.title') })).toBeInTheDocument()
    expect(screen.getByText(t('api.memberNotFound'))).toBeInTheDocument()
    expect(calls('GET', '/api/members/abc')).toHaveLength(0)
  })
})

describe("the owner's edits", () => {
  test('FR-MEMBER-02 a coach sees no Change buttons', async () => {
    renderMember('coach')
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    expect(screen.queryByRole('button', { name: t('member.edit') })).not.toBeInTheDocument()
    for (const id of ['member.edit.name', 'member.edit.coach', 'member.edit.phone'] as const) {
      expect(screen.queryByRole('button', { name: t(id) })).not.toBeInTheDocument()
    }
  })

  test("NFR-USE-03 the owner's Change, Save and Cancel are 44 px touch targets", async () => {
    renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    for (const id of ['member.edit.name', 'member.edit.coach', 'member.edit.phone'] as const) {
      expect(screen.getByRole('button', { name: t(id) }), id).toHaveClass(factStyles.change!)
    }
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.phone') }))
    const md = (variant: 'primary' | 'quiet') => buttonClass({ variant, size: 'md' }).split(' ')
    expect(screen.getByRole('button', { name: t('common.save') })).toHaveClass(...md('primary'))
    expect(screen.getByRole('button', { name: t('common.cancel') })).toHaveClass(...md('quiet'))
  })

  test('FR-MEMBER-02 the phone edit sends only the phone, read in the gym country, and shows the answer', async () => {
    const { calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    patchAnswer = () => json(200, detail({ ...sam, phone: '+13125550199' }))
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.phone') }))
    const input = screen.getByRole('textbox', { name: t('member.phone') })
    expect(input).toHaveValue('(312) 555-0142')
    expect(input).toHaveAttribute('type', 'tel')
    await userEvent.clear(input)
    await userEvent.type(input, '312 555 0199{Enter}')
    expect(calls('PATCH', '/api/members/12')).toEqual([{ phone: '312 555 0199' }])
    expect(await screen.findByText('(312) 555-0199')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: t('member.phone') })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('member.edit.phone') })).toHaveFocus()
  })

  test("FR-MEMBER-02 a phone another member has is refused, with the server's sentence under the field", async () => {
    const message = 'Another member already has that phone number.'
    patchAnswer = () => json(409, { error: { code: 'duplicate', message } })
    renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.phone') }))
    const input = screen.getByRole('textbox', { name: t('member.phone') })
    await userEvent.clear(input)
    await userEvent.type(input, '312 555 0100')
    await userEvent.click(screen.getByRole('button', { name: t('common.save') }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription(message)
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  test('FR-MEMBER-02 clearing the phone sends null; an unchanged one sends nothing', async () => {
    const { calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.phone') }))
    await userEvent.click(screen.getByRole('button', { name: t('common.save') }))
    expect(calls('PATCH', '/api/members/12')).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.phone') }))
    await userEvent.clear(screen.getByRole('textbox', { name: t('member.phone') }))
    await userEvent.click(screen.getByRole('button', { name: t('common.save') }))
    expect(calls('PATCH', '/api/members/12')).toEqual([{ phone: null }])
  })

  test('FR-MEMBER-02 the name edit sends only the parts changed; a blank first name shows the server sentence under it', async () => {
    const { calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.name') }))
    const first = screen.getByRole('textbox', { name: t('member.firstName') })
    const last = screen.getByRole('textbox', { name: new RegExp(t('member.lastName')) })
    expect(first).toHaveValue('Sam')
    expect(last).toHaveValue('Okafor')

    const message = 'Enter a first name.'
    patchAnswer = () => json(400, { error: { code: 'memberFirstName', message } })
    await userEvent.clear(first)
    await userEvent.click(screen.getByRole('button', { name: t('common.save') }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(first).toHaveAccessibleDescription(message)

    patchAnswer = () => json(200, detail({ ...sam, lastName: '' }))
    await userEvent.type(first, 'Sam')
    await userEvent.clear(last)
    await userEvent.click(screen.getByRole('button', { name: t('common.save') }))
    expect(calls('PATCH', '/api/members/12')).toEqual([{ firstName: '' }, { lastName: '' }])
    expect(await screen.findByRole('heading', { level: 1, name: 'Sam' })).toBeInTheDocument()
  })

  test('FR-MEMBER-02 the coach edit offers No coach and the active staff, and sends only the coach', async () => {
    const { calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    patchAnswer = () => json(200, detail({ ...sam, coachId: null, coachName: null }))
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.coach') }))
    const select = screen.getByRole('combobox', { name: t('member.coach') })
    await vi.waitFor(() =>
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual([t('member.coach.none'), 'Dana R.', 'Priya S.']),
    )
    expect(select).toHaveValue('2')
    await userEvent.selectOptions(select, t('member.coach.none'))
    await userEvent.click(screen.getByRole('button', { name: t('common.save') }))
    expect(calls('PATCH', '/api/members/12')).toEqual([{ coachId: null }])
    await vi.waitFor(() => expect(fact(t('member.coach'))).toHaveTextContent(t('member.coach.none')))
  })

  test('FR-MEMBER-02 Cancel closes the form without saving', async () => {
    const { calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.edit.coach') }))
    await userEvent.click(screen.getByRole('button', { name: t('common.cancel') }))
    expect(screen.queryByRole('combobox', { name: t('member.coach') })).not.toBeInTheDocument()
    expect(calls('PATCH', '/api/members/12')).toEqual([])
  })
})

describe('the way back', () => {
  const back = (page: string) => screen.getByRole('link', { name: t('a11y.backTo', { page }) })

  test.each([
    ['/app', 'member.back.today'],
    ['/app/board?status=slipping', 'member.back.board'],
    ['/app/members?view=everyone&q=sam', 'member.back.members'],
  ] as const)(
    'FR-MEMBER-08 the back link names the page the member was opened from and returns to it, filters kept (%s)',
    async (from, word) => {
      const { router } = renderMember('owner', '/app/members')
      await act(() => router.navigate('/app/members/12', { state: { from } }))
      await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
      const link = back(t(word))
      expect(link).toHaveTextContent(t(word))
      // It comes first on the page, before the title.
      expect(link.compareDocumentPosition(screen.getByRole('heading', { level: 1 }))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
      await userEvent.click(link)
      await vi.waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe(from))
    },
  )

  /** The hrefs the sidebar and the tab bar mark, each as `aria-current="page"`. */
  const marked = () =>
    [t('a11y.tabs'), t('a11y.tabbar')].map((name) =>
      within(screen.getByRole('navigation', { name }))
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page')
        .map((link) => link.getAttribute('href')),
    )

  test.each([
    ['/app', '/app', 'member.back.today'],
    ['/app/board?status=slipping', '/app/board', 'member.back.board'],
    ['/app/members?view=everyone&q=sam', '/app/members', 'member.back.members'],
    [undefined, '/app/members', 'member.back.members'],
    ['/app/settings', '/app/members', 'member.back.members'],
  ] as const)(
    'the sidebar and the tab bar mark the page the back link names (opened from %s), as a pushed detail stays in its tab',
    async (from, page, word) => {
      const { router } = renderMember('owner', '/app/members')
      await act(() => router.navigate('/app/members/12', { state: from === undefined ? null : { from } }))
      await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
      expect(back(t(word))).toBeInTheDocument()
      expect(marked()).toEqual([[page], [page]])
    },
  )

  test('FR-MEMBER-08 with no page to go back to, the back link goes to Members', async () => {
    const { router } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    expect(back(t('member.back.members'))).toHaveAttribute('href', '/app/members')
    // A from that isn't Today, the board or Members goes to Members too.
    await act(() => router.navigate('/app/members/12', { state: { from: '/app/settings' } }))
    expect(back(t('member.back.members'))).toHaveAttribute('href', '/app/members')
    await act(() => router.navigate('/app/members/12', { state: { from: 'https://elsewhere.example/app' } }))
    expect(back(t('member.back.members'))).toHaveAttribute('href', '/app/members')
  })

  test('FR-MEMBER-08 the back link is there while the page loads, so the title does not move', async () => {
    answer = () => new Promise<Response>(() => {}) as unknown as Response
    renderMember()
    expect(await screen.findByRole('heading', { level: 1, name: t('common.loading') })).toBeInTheDocument()
    expect(back(t('member.back.members'))).toBeInTheDocument()
  })
})

describe('archive, restore and delete', () => {
  test('FR-MEMBER-05 on the demo gym the member page shows no Archive', async () => {
    renderMember('owner', '/app/members/12', { isDemo: true })
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    expect(screen.queryByRole('button', { name: t('member.archive') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('member.delete') })).not.toBeInTheDocument()
  })

  test('FR-MEMBER-05 Archive asks "Archive Sam Okafor?" with a one-word Archive, then archives and says so', async () => {
    const { calls } = renderMember('coach')
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.archive') }))
    const dialog = await screen.findByRole('dialog', { name: t('member.archive.ask', { name: 'Sam Okafor' }) })
    expect(dialog).toHaveAccessibleDescription(t('member.archive.says', { first: 'Sam' }))
    await userEvent.click(within(dialog).getByRole('button', { name: t('member.archiveConfirm') }))
    expect(calls('POST', '/api/members/12/archive')).toHaveLength(1)
    expect(await screen.findByText(t('member.archiveDone', { name: 'Sam O.' }))).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Archived: the tag in place of the status, no Nudge, and Restore where Archive was, with the focus on it.
    expect(screen.getByText(t('member.archived'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('a11y.nudgeMember', { name: 'Sam' }) })).not.toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByRole('button', { name: t('member.restore') })).toHaveFocus())
    // A coach may archive and restore, but not delete.
    expect(screen.queryByRole('button', { name: t('member.delete') })).not.toBeInTheDocument()
  })

  test('FR-MEMBER-05 Cancel leaves the member as they were', async () => {
    const { calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.archive') }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: t('common.cancel') }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls('POST', '/api/members/12/archive')).toHaveLength(0)
    expect(screen.getByRole('button', { name: t('member.archive') })).toBeInTheDocument()
  })

  test("FR-MEMBER-05 a refused archive keeps the confirm open with the server's sentence", async () => {
    const message = 'Something went wrong. Try again.'
    archiveAnswer = () => json(500, { error: { code: 'generic', message } })
    renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.archive') }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: t('member.archiveConfirm') }))
    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBe(dialog)
  })

  test('FR-MEMBER-06 an archived member is restored straight away, and the page says so', async () => {
    answer = () => json(200, detail(sam, { archivedAt: '2026-11-07T15:00:00.000Z' }))
    const { calls } = renderMember('coach')
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    expect(screen.queryByRole('button', { name: t('member.archive') })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t('member.restore') }))
    expect(calls('POST', '/api/members/12/restore')).toHaveLength(1)
    expect(await screen.findByText(t('member.restoreDone', { name: 'Sam O.' }))).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: t('member.archive') })).toBeInTheDocument()
  })

  test('FR-MEMBER-07 an owner deletes an archived member after "Delete Sam Okafor?" and its Delete, back on Members', async () => {
    answer = () => json(200, detail(sam, { archivedAt: '2026-11-07T15:00:00.000Z' }))
    const { router, calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    await userEvent.click(screen.getByRole('button', { name: t('member.delete') }))
    const dialog = await screen.findByRole('dialog', { name: t('member.delete.ask', { name: 'Sam Okafor' }) })
    expect(dialog).toHaveAccessibleDescription(t('member.deleteBody'))
    const confirm = within(dialog).getByRole('button', { name: t('member.deleteConfirm') })
    expect(confirm).toHaveClass(...buttonClass({ variant: 'destructive' }).split(' '))
    await userEvent.click(confirm)
    expect(calls('DELETE', '/api/members/12')).toHaveLength(1)
    expect(await screen.findByText(t('member.deleteDone', { name: 'Sam O.' }))).toBeInTheDocument()
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/app/members'))
  })
})

describe('the member page, live', () => {
  test('FR-LIVE-01 a nudge or check-in event refetches the page', async () => {
    const { calls } = renderMember()
    await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })
    answer = () => json(200, detail({ ...sam, daysSinceLastVisit: 0 }))
    act(() => FakeEventSource.instances[0]!.emit({ type: 'nudge.recorded', gymId: 1, memberId: 12, coachId: 2 }))
    expect(await screen.findByText(t('member.lastVisit.today'))).toBeInTheDocument()
    expect(calls('GET', '/api/members/12')).toHaveLength(2)
  })
})

/** The loading region's placeholder content, once the screen shows it: busy, inert and hidden (the h1 says Loading). */
async function findSkeleton(): Promise<HTMLElement> {
  const region = await waitFor(() => {
    const busy = document.querySelector<HTMLElement>('[aria-busy="true"]:has(> [inert])')
    expect(busy).not.toBeNull()
    return busy as HTMLElement
  })
  const shapes = region.querySelector<HTMLElement>(':scope > [inert]') as HTMLElement
  expect(shapes).toHaveAttribute('aria-hidden', 'true')
  return shapes
}

describe('the member page, loading', () => {
  test('while the page loads, the h1 says Loading to screen readers and the head and cards hold placeholders', async () => {
    const pending = Promise.withResolvers<Response>()
    answer = () => pending.promise as unknown as Response
    renderMember()
    const title = await screen.findByRole('heading', { level: 1, name: t('common.loading') })
    // The h1 is hidden from sight while a placeholder title stands where the name will be, and it stays the same
    // element, so the focus the router gave it stays when the member arrives.
    expect(title.parentElement).toHaveClass(skeletonStyles.loadingHead ?? '')
    expect(title.parentElement?.querySelector('[aria-hidden="true"]')).not.toBeNull()
    const shapes = await findSkeleton()
    expect(screen.queryByRole('status')).toBeNull()
    // The facts' labels in words; each fact with a Change keeps its 44 px room.
    for (const label of ['member.name', 'member.coach', 'member.phone', 'member.joinedOn'] as const) {
      expect(within(shapes).getByText(t(label), { selector: 'dt' })).toBeInTheDocument()
    }
    expect(shapes.querySelector(`.${factStyles.facts}`)?.querySelectorAll('dd')).toHaveLength(4)
    expect(shapes.querySelectorAll(`dd .${skeletonStyles.change}`)).toHaveLength(3)
    expect(shapes.querySelector(`.${skeletonStyles.days}`)).not.toBeNull()
    expect(shapes.querySelectorAll(`.${historyStyles.list} > .${historyStyles.checkin}`).length).toBeGreaterThan(0)
    expect(shapes.querySelectorAll(`.${historyStyles.list} > .${historyStyles.nudge}`).length).toBeGreaterThan(0)

    await act(async () => pending.resolve(json(200, page)))
    expect(await screen.findByRole('heading', { level: 1, name: 'Sam Okafor' })).toBe(title)
    expect(title.parentElement).not.toHaveClass(skeletonStyles.loadingHead ?? '')
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  test("a coach's facts keep no Change room", async () => {
    answer = () => new Promise<Response>(() => {}) as unknown as Response
    renderMember('coach')
    const shapes = await findSkeleton()
    expect(shapes.querySelectorAll(`dd .${skeletonStyles.change}`)).toHaveLength(0)
  })
})
