import type { QueryClient } from '@tanstack/react-query'
import type { MemberSummary, MeResponse, Role, TodayResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { buttonClass, popClass } from '@tenure/ui'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import { buildRoutes } from '../../../app/router.tsx'
import boardStyles from '../../../shared/board/BoardTable.module.css'
import pageTitleStyles from '../../../shared/page/PageTitle.module.css'
import { FakeEventSource, json, me, mockFetch } from '../../../test/fakes.ts'
import todayStyles from './Today.module.css'

const member = (over: Partial<MemberSummary> & Pick<MemberSummary, 'id' | 'name' | 'week' | 'weeks' | 'status'>) => ({
  firstName: over.name.split(' ')[0] ?? '',
  lastName: 'X',
  phone: null,
  coachId: 2,
  coachName: 'Priya S.',
  joinedOn: '2026-09-01',
  daysSinceJoin: over.week * 7 + 2,
  pace: 1,
  lastVisitOn: '2026-11-01',
  daysSinceLastVisit: 5,
  lastNudgeAt: null,
  ...over,
})

// Slipping in API order: Zoe (the viewer's own) before Sam, though Sam joined earlier and sorts first by name.
const zoe = member({ id: 21, name: 'Zoe K.', week: 3, weeks: [1, 0, 1, 1], status: 'slipping', daysSinceLastVisit: null, coachName: null })
const sam = member({ id: 12, name: 'Sam O.', week: 9, weeks: [3, 3, 2, 3, 1, 1, 0, 1, 0, 0], status: 'slipping', daysSinceLastVisit: 9 })
const ana = member({ id: 30, name: 'Ana B.', week: 1, weeks: [2, 1], status: 'new', daysSinceLastVisit: 1 })
const lee = member({ id: 31, name: 'Lee P.', week: 4, weeks: [3, 4, 3, 3, 3], status: 'on', daysSinceLastVisit: 0 })

const fixture: TodayResponse = {
  kpis: { newMembers: 4, onTheLinePct: 25, slipping: 2, nudgedThisWeek: 3 },
  slipping: [zoe, sam],
  checkinsToday: [
    { memberId: 31, name: 'Lee P.', at: '2026-11-06T23:42:00.000Z' },
    { memberId: 30, name: 'Ana B.', at: '2026-11-06T14:05:00.000Z' },
  ],
  board: [zoe, sam, ana, lee],
  hasMembers: true,
}
const emptyGym: TodayResponse = {
  kpis: { newMembers: 0, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 },
  slipping: [],
  checkinsToday: [],
  board: [],
  hasMembers: false,
}

let client: QueryClient
let todayAnswer: () => Response | Promise<Response>

/** GET /api/settings, which the empty gym reads for the kiosk's path ("Open the kiosk"). */
const settings = {
  gym: me('owner').gym,
  kioskPath: '/kiosk/k10sk-token',
  kioskUrl: 'http://192.168.1.20:5175/kiosk/k10sk-token',
  kioskUrls: ['http://192.168.1.20:5175/kiosk/k10sk-token'],
  phoneUrls: [],
}

function renderToday(role: Role, gym: Partial<MeResponse['gym']> = {}) {
  const session = me(role)
  const fetch = mockFetch((_method, path) => {
    if (path === '/api/auth/me') return json(200, { ...session, gym: { ...session.gym, ...gym } })
    if (path === '/api/today') return todayAnswer()
    if (path === '/api/settings') return json(200, settings)
    return json(404, { error: { code: 'notApi', message: "That isn't part of the Regulars API." } })
  })
  client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: ['/app'] })
  render(<App client={client} router={router} />)
  const calls = (path: string) => fetch.mock.calls.filter(([url]) => String(url) === path).length
  return { router, todayCalls: () => calls('/api/today'), settingsCalls: () => calls('/api/settings') }
}

/** The board's table, inside the scroll region that names it. */
// The coach after the last " · " takes no-break spaces, so a narrow row wraps before "Coach Priya S." and not inside it.
const sam9 = `${t('member.lastVisit', { n: 9 })} · Coach\u00A0Priya\u00A0S.`

const findBoard = async () => within(await screen.findByRole('region', { name: t('board.aria') })).getByRole('table')
// A Panel isn't a landmark: find it from its heading (the heading sits in the Panel's header row).
const section = (name: string) => screen.getByRole('heading', { level: 2, name }).parentElement!.parentElement!
const rowNames = (list: HTMLElement) => within(list).getAllByRole('listitem').map((li) => li.textContent)
/** Each check-in row's words in order, as "time | name" (the row's link holds them, then its chevron). */
const checkinRows = () =>
  within(section(t('today.checkins.title')))
    .getAllByRole('listitem')
    .map((li) =>
      [...within(li).getByRole('link').children]
        .filter((part) => part.tagName.toLowerCase() !== 'svg')
        .map((part) => part.textContent)
        .join(' | '),
    )
/** The live sentence over the figures: the first h2, above the panels. */
const headline = () => screen.getAllByRole('heading', { level: 2 })[0]!
/** Stubs matchMedia so the phone's width query matches (jsdom has none). */
function stubPhone() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('48rem'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  FakeEventSource.install()
  todayAnswer = () => json(200, fixture)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Today', () => {
  test('an owner sees the figures, Slipping Now, Checked In Today and the board, in the order given', async () => {
    renderToday('owner')
    expect(await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })).toBeInTheDocument()
    await findBoard()

    const kpi = (label: string) => screen.getByRole('group', { name: label }).textContent
    expect(kpi(t('today.kpi.new'))).toContain('4')
    expect(kpi(t('today.kpi.onLine'))).toContain('25%')
    expect(kpi(t('today.kpi.slipping'))).toContain('2')
    expect(kpi(t('today.kpi.nudged'))).toContain('3')

    const slipping = rowNames(section(t('today.slipping.title')))
    // No status tag on the rows: the panel's title says it (J2). The name, the last visit, then Nudge; no Open.
    const end = t('today.slipping.nudge')
    expect(slipping).toEqual([
      `Zoe K.${t('member.lastVisit.never')}${end}`,
      `Sam O.${sam9}${end}`,
    ])

    // Gym time (America/Chicago), newest first as given.
    const checkins = checkinRows()
    expect(checkins).toHaveLength(2)
    expect(checkins[0]).toMatch(/^5:42\sPM \| Lee P\.$/)
    expect(checkins[1]).toMatch(/^8:05\sAM \| Ana B\.$/)

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      `Zoe K.${t('a11y.slipping')}`,
      `Sam O.${t('a11y.slipping')}`,
      'Ana B.',
      'Lee P.',
    ])
    // The status is always there as a mark and its words, not only as a colour.
    const statuses = ['slipping', 'slipping', 'new', 'on'] as const
    expect(rows.map((r) => r.querySelector('[data-status]')?.getAttribute('data-status'))).toEqual([...statuses])
    for (const [i, status] of statuses.entries()) {
      expect(within(rows[i]!).getByText(t(`status.${status}`))).toBeInTheDocument()
    }
  })

  test("FR-TODAY-01 H2 the Slipping figure's label starts with the slipping dot, as the status tags do; no other has one", async () => {
    renderToday('owner')
    await findBoard()
    const slipping = screen.getByRole('group', { name: t('today.kpi.slipping') })
    const dots = slipping.querySelectorAll('[data-status]')
    expect(dots).toHaveLength(1)
    expect(dots[0]).toHaveAttribute('data-status', 'slipping')
    expect(dots[0]).toHaveAttribute('aria-hidden', 'true')
    // The dot comes first, then the word.
    expect(dots[0]?.previousSibling).toBeNull()
    expect(dots[0]?.nextSibling?.textContent).toBe(t('today.kpi.slipping'))
    for (const label of [t('today.kpi.new'), t('today.kpi.onLine'), t('today.kpi.nudged')]) {
      expect(screen.getByRole('group', { name: label }).querySelector('[data-status]'), label).toBeNull()
    }
  })

  test("F29 Today's h1 is the shared page title, as every screen's", async () => {
    renderToday('owner')
    const h1 = await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
    expect(h1).toHaveClass(pageTitleStyles.title!)
  })

  test("FR-TODAY-01 D2 a coach sees the same screen, titled Today as the owner's", async () => {
    renderToday('coach')
    expect(t('today.coach.title')).toBe(t('today.owner.title'))
    expect(await screen.findByRole('heading', { level: 1, name: t('today.coach.title') })).toBeInTheDocument()
    await findBoard()
    expect(section(t('today.slipping.title'))).toBeInTheDocument()
    expect(section(t('today.checkins.title'))).toBeInTheDocument()
    expect(section(t('today.board.title'))).toBeInTheDocument()
  })

  test('each week cell carries its mark, its label and the slipping accent', async () => {
    renderToday('owner')
    const table = await findBoard()
    const cells = (name: string) => {
      const row = within(table).getByText(name).closest('tr')!
      return within(row).getAllByRole('img')
    }
    const marks = (name: string) => cells(name).map((c) => c.dataset.mark)

    const sams = cells('Sam O.')
    expect(sams).toHaveLength(13)
    expect(marks('Sam O.')).toEqual([
      'full', 'full', 'some', 'full', 'some', 'some', 'none', 'some', 'none', 'outline', 'future', 'future', 'future',
    ])
    // Only the last two finished weeks of a slipping member take the accent.
    expect(sams.map((c, i) => (c.hasAttribute('data-flag') ? i : null)).filter((i) => i !== null)).toEqual([7, 8])
    expect(sams[2]).toHaveAccessibleName(t('a11y.cell.visits', { n: 3, v: 2 }))
    expect(sams[4]).toHaveAccessibleName(t('a11y.cell.one', { n: 5 }))
    expect(sams[6]).toHaveAccessibleName(t('a11y.cell.none', { n: 7 }))
    expect(sams[9]).toHaveAccessibleName(t('a11y.cell.now', { n: 10, v: 0 }))
    expect(sams[10]).toHaveAccessibleName(t('a11y.cell.future', { n: 11 }))

    // A week in progress with 3 visits is already full; with 1 it is an outline.
    expect(marks('Lee P.').slice(0, 6)).toEqual(['full', 'full', 'full', 'full', 'full', 'future'])
    expect(marks('Ana B.').slice(0, 3)).toEqual(['some', 'outline', 'future'])
    expect(cells('Ana B.')[1]).toHaveAccessibleName(t('a11y.cell.nowOne', { n: 2 }))
    expect(cells('Lee P.').some((c) => c.hasAttribute('data-flag'))).toBe(false)
  })

  test('the board is named once, by its scroll region, and a slipping name says so to screen readers', async () => {
    renderToday('owner')
    const table = await findBoard()
    expect(table).not.toHaveAttribute('aria-label')
    expect(screen.getAllByLabelText(t('board.aria'))).toHaveLength(1)
    expect(within(table).getByRole('rowheader', { name: `Sam O.${t('a11y.slipping')}` })).toBeInTheDocument()
    expect(within(table).getByRole('rowheader', { name: 'Lee P.' })).toBeInTheDocument()
    // Zoe and Sam, the two slipping rows.
    expect(within(table).getAllByText(t('a11y.slipping'), { selector: 'th span' })).toHaveLength(2)
  })

  test('Today shows the first 12 rows of the board, in the order given', async () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      member({ id: 100 + i, name: `M${i} X.`, week: 2, weeks: [3, 3, 1], status: 'on' }),
    )
    todayAnswer = () => json(200, { ...fixture, board: many })
    renderToday('owner')
    const rows = within(await findBoard()).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(many.slice(0, 12).map((m) => m.name))
  })

  test('the tab title is the page title, then the brand', async () => {
    renderToday('coach')
    await screen.findByRole('heading', { level: 1, name: t('today.coach.title') })
    expect(document.title).toBe(`${t('today.coach.title')} · ${t('brand.name')}`)
  })

  test('a gym with members but no one in their first 90 days and no check-ins today sees Today, not the empty state', async () => {
    todayAnswer = () => json(200, { ...emptyGym, hasMembers: true })
    renderToday('owner')
    expect(await findBoard()).toBeInTheDocument()
    expect(screen.queryByText(t('today.empty.title'))).not.toBeInTheDocument()
    expect(section(t('today.slipping.title'))).toBeInTheDocument()
  })

  test("FR-TODAY-03 an owner's empty gym offers Open the Kiosk, to the kiosk's path, and no import", async () => {
    todayAnswer = () => json(200, emptyGym)
    renderToday('owner')
    const title = await screen.findByRole('heading', { name: t('today.empty.title') })
    // The user-plus symbol above the title, hidden from screen readers.
    expect(title.previousElementSibling).toHaveAttribute('aria-hidden', 'true')
    expect(title.previousElementSibling?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText(t('today.empty.kioskBody'))).toBeInTheDocument()
    const kiosk = await screen.findByRole('link', { name: t('today.empty.kiosk') })
    expect(kiosk).toHaveAttribute('href', '/kiosk/k10sk-token')
    expect(kiosk).toHaveClass(...buttonClass({ variant: 'secondary' }).split(' '))
    expect(screen.queryByRole('link', { name: t('today.empty.import') })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  test('FR-TODAY-03 a coach with no members sees their sentence, with no buttons and no Settings request', async () => {
    todayAnswer = () => json(200, emptyGym)
    const { settingsCalls } = renderToday('coach')
    const title = await screen.findByRole('heading', { name: t('today.empty.coachTitle') })
    expect(title.previousElementSibling?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText(t('today.empty.coach'))).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: t('today.empty.kiosk') })).not.toBeInTheDocument()
    expect(settingsCalls()).toBe(0)
  })

  test('FR-TODAY-03 a gym with members and check-ins today never asks for the kiosk link', async () => {
    const { settingsCalls } = renderToday('owner')
    await findBoard()
    expect(settingsCalls()).toBe(0)
  })

  test('FR-TODAY-02 J2 each Slipping Now row is one link and the small tinted Nudge for that member, with no tag', async () => {
    renderToday('owner')
    await findBoard()
    const rows = within(section(t('today.slipping.title'))).getAllByRole('listitem')
    for (const [row, m] of [
      [rows[0]!, zoe],
      [rows[1]!, sam],
    ] as const) {
      const nudge = within(row).getByRole('button', { name: t('a11y.nudgeMember', { name: m.firstName }) })
      expect(nudge).toHaveAttribute('data-member', String(m.id))
      expect(nudge).toHaveTextContent(t('today.slipping.nudge'))
      expect(nudge).toHaveClass(...buttonClass({ variant: 'tinted', size: 'sm' }).split(' '))
      const links = within(row).getAllByRole('link')
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAttribute('href', `/app/members/${m.id}`)
      // The Nudge sits beside the link, never inside it.
      expect(links[0]!.contains(nudge)).toBe(false)
      expect(within(row).queryByText(t('status.slipping'))).not.toBeInTheDocument()
    }
  })

  test('FR-TODAY-01 K2 Checked In Today reads like a sign-in sheet: the time, then the name, in one link', async () => {
    renderToday('owner')
    await findBoard()
    const rows = within(section(t('today.checkins.title'))).getAllByRole('listitem')
    for (const [row, c] of rows.map((r, i) => [r, fixture.checkinsToday[i]!] as const)) {
      const link = within(row).getByRole('link')
      const [time, name] = [...link.children]
      expect(time?.tagName).toBe('TIME')
      expect(time).toHaveAttribute('datetime', c.at)
      expect(name).toHaveTextContent(c.name)
      expect(link).toHaveAttribute('href', `/app/members/${c.memberId}`)
    }
  })

  test('FR-TODAY-02 a slipping member without a coach shows the last-visit words alone', async () => {
    const coachless = (id: number, daysSinceLastVisit: number | null) =>
      member({ id, name: `C${id} X.`, week: 3, weeks: [1, 0, 1, 0], status: 'slipping', coachId: null, coachName: null, daysSinceLastVisit })
    const list = [coachless(41, null), coachless(42, 0), coachless(43, 1), coachless(44, 9), sam]
    todayAnswer = () => json(200, { ...fixture, slipping: list, board: list })
    renderToday('owner')
    await findBoard()
    const metas = within(section(t('today.slipping.title')))
      .getAllByRole('listitem')
      .map((li) => within(li).getByRole('link').lastElementChild?.textContent)
    expect(metas).toEqual([
      t('member.lastVisit.never'),
      t('member.lastVisit.today'),
      t('member.lastVisit.yesterday'),
      t('member.lastVisit', { n: 9 }),
      sam9,
    ])
  })

  test("FR-TODAY-05 Today's board panel links to the board, as a secondary button", async () => {
    renderToday('owner')
    await findBoard()
    const link = within(section(t('today.board.title'))).getByRole('link', { name: t('today.board.open') })
    expect(link).toHaveAttribute('href', '/app/board')
    expect(link).toHaveClass(...buttonClass({ variant: 'secondary' }).split(' '))
  })

  test("FR-BOARD-02 each row of Today's board opens its member from the name, with no Open and no Nudge; Slipping Now has a Nudge for each slipping member", async () => {
    todayAnswer = () => json(200, { ...fixture, board: [ana, zoe, sam, lee] })
    renderToday('owner')
    const board = await findBoard()
    const rows = within(board).getAllByRole('row').slice(1)
    for (const [i, m] of [ana, zoe, sam, lee].entries()) {
      const links = within(rows[i]!).getAllByRole('link')
      expect(links).toHaveLength(1)
      // A slipping member's link says so (VoiceOver's links list reads "Sam O., slipping").
      expect(links[0]).toHaveAccessibleName(m.status === 'slipping' ? `${m.name}${t('a11y.slipping')}` : m.name)
      expect(links[0]).toHaveAttribute('href', `/app/members/${m.id}`)
      expect(within(rows[i]!).queryAllByRole('button')).toEqual([])
      expect(within(board).queryByRole('button', { name: t('a11y.nudgeMember', { name: m.firstName }) })).toBeNull()
    }
    // Zoe and Sam keep their Nudge in Slipping Now.
    const slipping = section(t('today.slipping.title'))
    for (const m of [zoe, sam]) {
      expect(within(slipping).getByRole('button', { name: t('a11y.nudgeMember', { name: m.firstName }) })).toBeInTheDocument()
    }
  })

  test('while Today loads, its skeleton stands in the loaded layout and says Loading once, until Today lands', async () => {
    const pending = Promise.withResolvers<Response>()
    todayAnswer = () => pending.promise
    renderToday('owner')
    // The screen's own status, under its title (the shell shows one too while the session loads).
    await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(t('common.loading'))
    // One busy region round placeholder content that is inert and hidden from screen readers.
    const region = status.parentElement as HTMLElement
    expect(region).toHaveAttribute('aria-busy', 'true')
    const shapes = region.querySelector('[inert]') as HTMLElement
    expect(shapes).toHaveAttribute('aria-hidden', 'true')
    // Today's own platter, figure slots, panels and rows, so each placeholder keeps the real one's height (a row's
    // 44 px link block among them): the figures' labels and the section titles are there in words already.
    expect(shapes.querySelector(`.${todayStyles.summary} .${todayStyles.headline}`)).not.toBeNull()
    expect(shapes.querySelectorAll(`.${todayStyles.kpis} > .${todayStyles.figure}`)).toHaveLength(4)
    expect(within(shapes).getByText(t('today.kpi.onLine.hint'))).toBeInTheDocument()
    for (const title of ['today.slipping.title', 'today.checkins.title', 'today.board.title'] as const) {
      expect(within(shapes).getByText(t(title))).toBeInTheDocument()
    }
    expect(shapes.querySelectorAll(`.${todayStyles.row} > .${todayStyles.rowLink}`).length).toBeGreaterThanOrEqual(6)
    expect(shapes.querySelectorAll(`.${boardStyles.link}`).length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)

    await act(async () => pending.resolve(json(200, fixture)))
    expect(await findBoard()).toBeInTheDocument()
    expect(screen.queryByText(t('common.loading'))).not.toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  test('a failed fetch shows the error and Try again loads it', async () => {
    todayAnswer = () => Promise.reject(new TypeError('Failed to fetch'))
    const { todayCalls } = renderToday('owner')
    expect(await screen.findByRole('alert')).toHaveTextContent(t('err.network'))
    todayAnswer = () => json(200, fixture)
    await userEvent.click(screen.getByRole('button', { name: t('today.retry') }))
    expect(await findBoard()).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(todayCalls()).toBe(2)
  })
})

describe('Today, the redesign', () => {
  test.each([
    ['many', { newMembers: 4, slipping: 2 }, t('today.headline', { n: 2, total: 4 })],
    ['one', { newMembers: 4, slipping: 1 }, t('today.headline.one', { total: 4 })],
    ['zero', { newMembers: 4, slipping: 0 }, t('today.headline.none', { total: 4 })],
    ['no new members', { newMembers: 0, slipping: 0 }, t('today.headline.empty')],
  ])('FR-TODAY-01 the live sentence says how many new members are slipping: the %s form', async (_form, kpis, words) => {
    todayAnswer = () => json(200, { ...fixture, kpis: { ...fixture.kpis, ...kpis } })
    renderToday('owner')
    await findBoard()
    expect(headline()).toHaveTextContent(new RegExp(`^${words}$`))
  })

  test('FR-TODAY-01 the figures share one surface; Slipping links to the board filtered to Slipping, Nudged this week to Reports', async () => {
    renderToday('owner')
    await findBoard()
    const figures = [t('today.kpi.new'), t('today.kpi.onLine'), t('today.kpi.slipping'), t('today.kpi.nudged')].map(
      (label) => screen.getByRole('group', { name: label }),
    )
    // One surface: the sentence and the four figures share the same card.
    const surface = headline().parentElement!
    for (const figure of figures) expect(surface.contains(figure)).toBe(true)
    // Each figure says what it means.
    for (const [i, hint] of (['new', 'onLine', 'slipping', 'nudged'] as const).entries()) {
      expect(figures[i]?.textContent).toContain(t(`today.kpi.${hint}.hint`))
    }
    const linkOf = (figure: HTMLElement) => figure.closest('a')
    expect(linkOf(figures[0]!)).toBeNull()
    expect(linkOf(figures[1]!)).toBeNull()
    expect(linkOf(figures[2]!)).toHaveAttribute('href', '/app/board?status=slipping')
    expect(linkOf(figures[3]!)).toHaveAttribute('href', '/app/reports')
    // A chevron after the label of each figure that opens a screen, and on no other.
    expect(figures.map((f) => f.querySelectorAll('svg:not([data-status])').length)).toEqual([0, 0, 1, 1])
  })

  test("FR-TODAY-01 a coach's Nudged this week stays plain: Reports is the owner's", async () => {
    renderToday('coach')
    await findBoard()
    expect(screen.getByRole('group', { name: t('today.kpi.nudged') }).closest('a')).toBeNull()
    expect(screen.getByRole('group', { name: t('today.kpi.slipping') }).closest('a')).toHaveAttribute(
      'href',
      '/app/board?status=slipping',
    )
  })

  test('FR-TODAY-02 each Slipping Now row is one link named with the member and their last visit, the Nudge beside it, no chevron', async () => {
    renderToday('owner')
    await findBoard()
    const list = section(t('today.slipping.title'))
    const zoes = within(list).getByRole('link', { name: `Zoe K.${t('member.lastVisit.never')}` })
    const sams = within(list).getByRole('link', { name: `Sam O.${sam9}` })
    expect(zoes).toHaveAttribute('href', '/app/members/21')
    expect(sams).toHaveAttribute('href', '/app/members/12')
    for (const row of within(list).getAllByRole('listitem')) {
      // The link and the Nudge are siblings in the row, and no chevron (no icon) is drawn in it.
      const [link, trailing] = [...row.children]
      expect(link?.tagName).toBe('A')
      expect(within(trailing as HTMLElement).getByRole('button')).toHaveTextContent(t('today.slipping.nudge'))
      expect(row.querySelector('svg')).toBeNull()
    }
    // The coach's name never splits across lines: its spaces are no-break spaces, the rest of the line's are not.
    const meta = within(list).getByRole('link', { name: /Sam O\./ }).lastElementChild?.textContent
    expect(meta).toBe(sam9)
  })

  test("FR-TODAY-02 a coach's own Slipping Now leaves out the coach on every row, since each member is theirs (audit B2-22)", async () => {
    renderToday('coach')
    await findBoard()
    const list = section(t('today.slipping.title'))
    const sams = within(list).getByRole('link', { name: `Sam O.${t('member.lastVisit', { n: 9 })}` })
    expect(sams).toHaveAttribute('href', '/app/members/12')
    for (const row of within(list).getAllByRole('listitem')) expect(row).not.toHaveTextContent(/Coach|Priya/)
  })

  test("FR-TODAY-01 the Slipping figure's hint holds each 2 to its word, so a phone never breaks “2 / weeks” (audit B2-14)", async () => {
    renderToday('owner')
    await findBoard()
    const figure = screen.getByRole('group', { name: t('today.kpi.slipping') })
    expect(figure.textContent).toContain('Under 2\u00a0visits, 2\u00a0weeks in a row')
  })

  test('FR-TODAY-02 a phone shows 5 rows and Show All {n} opens the rest', async () => {
    stubPhone()
    const many = Array.from({ length: 8 }, (_, i) =>
      member({ id: 200 + i, name: `S${i} X.`, week: 4, weeks: [1, 0, 1, 1, 0], status: 'slipping' }),
    )
    todayAnswer = () => json(200, { ...fixture, kpis: { ...fixture.kpis, slipping: 8 }, slipping: many })
    renderToday('owner')
    await findBoard()
    const list = section(t('today.slipping.title'))
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    const all = within(list).getByRole('button', { name: t('today.slipping.all', { n: 8 }) })
    expect(all).toHaveAttribute('aria-expanded', 'false')
    // After the list, never one of its rows.
    expect(all.closest('li')).toBeNull()
    await userEvent.click(all)
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map((li) => within(li).getByRole('link').firstElementChild?.textContent)).toEqual(many.map((m) => m.name))
    expect(within(list).queryByRole('button', { name: t('today.slipping.all', { n: 8 }) })).not.toBeInTheDocument()
    expect(within(rows[5]!).getByRole('link')).toHaveFocus()
  })

  test('FR-TODAY-02 a laptop shows every Slipping Now row with no Show All', async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      member({ id: 200 + i, name: `S${i} X.`, week: 4, weeks: [1, 0, 1, 1, 0], status: 'slipping' }),
    )
    todayAnswer = () => json(200, { ...fixture, slipping: many })
    renderToday('owner')
    await findBoard()
    const list = section(t('today.slipping.title'))
    expect(within(list).getAllByRole('listitem')).toHaveLength(8)
    expect(within(list).queryByRole('button', { name: t('today.slipping.all', { n: 8 }) })).not.toBeInTheDocument()
  })

  test('FR-TODAY-02 a phone shows the first 5 check-ins and Show All {n} opens the rest, as Slipping Now does (audit A17)', async () => {
    stubPhone()
    const many = Array.from({ length: 9 }, (_, i) => ({
      memberId: 300 + i,
      name: `C${i} X.`,
      at: `2026-11-06T${String(20 - i).padStart(2, '0')}:00:00.000Z`,
    }))
    todayAnswer = () => json(200, { ...fixture, checkinsToday: many })
    renderToday('owner')
    await findBoard()
    const list = section(t('today.checkins.title'))
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    const all = within(list).getByRole('button', { name: t('today.checkins.all', { n: 9 }) })
    expect(all).toHaveAttribute('aria-expanded', 'false')
    expect(all.closest('li')).toBeNull()
    await userEvent.click(all)
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map((li) => within(li).getByRole('link').getAttribute('href'))).toEqual(
      many.map((c) => `/app/members/${c.memberId}`),
    )
    expect(within(list).queryByRole('button', { name: t('today.checkins.all', { n: 9 }) })).not.toBeInTheDocument()
    expect(within(rows[5]!).getByRole('link')).toHaveFocus()
  })

  test('FR-TODAY-02 a laptop shows every check-in with no Show All', async () => {
    const at = fixture.checkinsToday[0]!.at
    const many = Array.from({ length: 9 }, (_, i) => ({ memberId: 300 + i, name: `C${i} X.`, at }))
    todayAnswer = () => json(200, { ...fixture, checkinsToday: many })
    renderToday('owner')
    await findBoard()
    const list = section(t('today.checkins.title'))
    expect(within(list).getAllByRole('listitem')).toHaveLength(9)
    expect(within(list).queryByRole('button', { name: t('today.checkins.all', { n: 9 }) })).not.toBeInTheDocument()
  })

  test('FR-TODAY-02 Checked In Today rows are links with a chevron and no Nudge', async () => {
    renderToday('owner')
    await findBoard()
    const list = section(t('today.checkins.title'))
    for (const [i, row] of within(list).getAllByRole('listitem').entries()) {
      const c = fixture.checkinsToday[i]!
      // The row is the link and nothing else.
      expect(row.children).toHaveLength(1)
      const link = within(row).getByRole('link')
      expect(row.firstElementChild).toBe(link)
      expect(link).toHaveAttribute('href', `/app/members/${c.memberId}`)
      expect(link.lastElementChild?.tagName.toLowerCase()).toBe('svg')
      expect(within(row).queryByRole('button')).not.toBeInTheDocument()
    }
  })

  test("FR-TODAY-02 a row link carries Today's path, for the member page's way back", async () => {
    const { router } = renderToday('owner')
    await findBoard()
    await userEvent.click(within(section(t('today.slipping.title'))).getAllByRole('link')[0]!)
    // The member screen loads lazily, so the navigation lands a moment later.
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/app/members/21'))
    expect(router.state.location.state).toEqual({ from: '/app' })
  })

  test("FR-TODAY-02 nobody slipping keeps the list's place with Nobody's Slipping", async () => {
    todayAnswer = () => json(200, { ...fixture, kpis: { ...fixture.kpis, slipping: 0 }, slipping: [] })
    renderToday('owner')
    await findBoard()
    const panel = section(t('today.slipping.title'))
    const title = within(panel).getByRole('heading', { level: 3, name: t('today.slipping.emptyTitle') })
    expect(title.previousElementSibling).toBeNull()
    expect(within(panel).getByText(t('today.slipping.empty'))).toBeInTheDocument()
    expect(within(panel).queryByRole('list')).not.toBeInTheDocument()
  })

  test('FR-TODAY-03 no check-ins yet: an owner gets Open the Kiosk in the list, a coach the words alone', async () => {
    todayAnswer = () => json(200, { ...fixture, checkinsToday: [] })
    const { settingsCalls } = renderToday('owner')
    await findBoard()
    const panel = section(t('today.checkins.title'))
    expect(within(panel).getByRole('heading', { level: 3, name: t('today.checkins.emptyTitle') })).toBeInTheDocument()
    expect(within(panel).getByText(t('today.checkins.empty'))).toBeInTheDocument()
    const kiosk = await within(panel).findByRole('link', { name: t('today.empty.kiosk') })
    expect(kiosk).toHaveAttribute('href', '/kiosk/k10sk-token')
    expect(settingsCalls()).toBe(1)
  })

  test('FR-TODAY-03 a coach with no check-ins yet sees the words, with no Kiosk and no Settings request', async () => {
    todayAnswer = () => json(200, { ...fixture, checkinsToday: [] })
    const { settingsCalls } = renderToday('coach')
    await findBoard()
    const panel = section(t('today.checkins.title'))
    expect(within(panel).getByRole('heading', { level: 3, name: t('today.checkins.emptyTitle') })).toBeInTheDocument()
    expect(within(panel).queryByRole('link')).not.toBeInTheDocument()
    expect(settingsCalls()).toBe(0)
  })
})

describe('Today, live', () => {
  const event = { type: 'checkin.recorded', gymId: 1, memberId: 12, coachId: 2, name: 'Sam O.', at: '2026-11-06T23:50:00.000Z' }
  const withSam: TodayResponse = {
    ...fixture,
    checkinsToday: [{ memberId: 12, name: 'Sam O.', at: event.at }, ...fixture.checkinsToday],
  }

  test("a 'checkin.recorded' event refetches Today and shows the check-in toast", async () => {
    const { todayCalls } = renderToday('owner')
    await findBoard()
    expect(todayCalls()).toBe(1)
    // The first load announces nothing.
    expect(screen.queryByText(t('toast.checkin', { name: 'Lee P.' }))).not.toBeInTheDocument()

    todayAnswer = () => json(200, withSam)
    act(() => FakeEventSource.instances[0]!.emit(event))

    expect(await screen.findByText(t('toast.checkin', { name: 'Sam O.' }))).toBeInTheDocument()
    expect(todayCalls()).toBe(2)
    expect(checkinRows()[0]).toMatch(/^5:50\sPM \| Sam O\.$/)
    expect(screen.getAllByRole('button', { name: t('toast.dismiss') })).toHaveLength(1)
  })

  test('FR-TODAY-01 a check-in that changes the figures rewrites the sentence', async () => {
    todayAnswer = () => json(200, { ...fixture, kpis: { ...fixture.kpis, slipping: 1 } })
    renderToday('owner')
    await findBoard()
    expect(headline()).toHaveTextContent(t('today.headline.one', { total: 4 }))

    // Sam's check-in takes him off the slipping list: nobody is slipping now.
    todayAnswer = () => json(200, { ...withSam, kpis: { ...fixture.kpis, slipping: 0 }, slipping: [] })
    act(() => FakeEventSource.instances[0]!.emit(event))
    await vi.waitFor(() => expect(headline()).toHaveTextContent(t('today.headline.none', { total: 4 })))
  })

  test("the figures and the sentence's numbers roll: a check-in moves the same digits, and the text is the final value", async () => {
    renderToday('owner')
    await findBoard()
    /** The digits a part draws in its aria-hidden faces (RollingNumber), in order. */
    const faces = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[aria-hidden="true"] [data-digit]')]
    const figure = (label: string) => screen.getByRole('group', { name: label })
    const drawn = (el: HTMLElement) => faces(el).map((d) => d.dataset['digit']).join('')
    expect(drawn(figure(t('today.kpi.new')))).toBe('4')
    expect(drawn(figure(t('today.kpi.onLine')))).toBe('25')
    expect(drawn(figure(t('today.kpi.nudged')))).toBe('3')
    expect(drawn(headline())).toBe('24')
    const [slippingDigit] = faces(figure(t('today.kpi.slipping')))
    expect(slippingDigit?.dataset['digit']).toBe('2')

    // Sam's check-in: one fewer slipping. The same column rolls to 1, and the sentence's text is only its final words.
    todayAnswer = () => json(200, { ...withSam, kpis: { ...fixture.kpis, slipping: 1 } })
    act(() => FakeEventSource.instances[0]!.emit(event))
    await vi.waitFor(() => expect(slippingDigit?.dataset['digit']).toBe('1'))
    expect(faces(figure(t('today.kpi.slipping')))).toEqual([slippingDigit])
    expect(headline()).toHaveTextContent(new RegExp(`^${t('today.headline.one', { total: 4 })}$`))
    expect(headline()).toHaveAccessibleName(t('today.headline.one', { total: 4 }))
  })

  test("FR-BOARD-03 the check-in pops Sam's week in progress on Today's board, and no other mark", async () => {
    renderToday('owner')
    const table = await findBoard()
    const popped = () => within(table).getAllByRole('img').filter((m) => m.className.split(' ').includes(popClass))
    expect(popped()).toEqual([])

    todayAnswer = () => json(200, withSam)
    act(() => FakeEventSource.instances[0]!.emit(event))

    await screen.findByText(t('toast.checkin', { name: 'Sam O.' }))
    const sams = within(within(table).getByText('Sam O.').closest('tr')!).getAllByRole('img')
    expect(popped()).toEqual([sams[9]])
  })

  const scope = { gymId: 1, memberId: 12, coachId: 2 }
  test.each([
    ['checkin.recorded', event],
    ['member.joined', { type: 'member.joined', ...scope }],
    ['member.updated', { type: 'member.updated', ...scope }],
    ['member.deleted', { type: 'member.deleted', ...scope }],
    ['nudge.recorded', { type: 'nudge.recorded', ...scope }],
    ['import.committed', { type: 'import.committed', gymId: 1 }],
  ])('FR-TODAY-04 a %s event refreshes Today', async (_type, body) => {
    const { todayCalls } = renderToday('owner')
    await findBoard()
    expect(todayCalls()).toBe(1)
    act(() => FakeEventSource.instances[0]!.emit(body))
    await vi.waitFor(() => expect(todayCalls()).toBe(2))
  })
})

describe("Today, in the gym's locale", () => {
  test("FR-GLOBAL-03 check-in times are the gym's: a UK gym's 24-hour clock in London", async () => {
    renderToday('owner', { country: 'GB', timezone: 'Europe/London' })
    await findBoard()
    // 23:42Z and 14:05Z on 6 Nov: London is on UTC in November.
    expect(checkinRows()).toEqual(['23:42 | Lee P.', '14:05 | Ana B.'])
  })

  test("FR-GLOBAL-03 check-in times are the gym's: a Pakistani gym's 12-hour clock in Karachi", async () => {
    renderToday('owner', { country: 'PK', timezone: 'Asia/Karachi' })
    await findBoard()
    // Karachi is UTC+5: the evening check-in falls in the small hours of the 7th. Browsers differ on 'am' and 'AM'.
    const checkins = checkinRows()
    expect(checkins[0]).toMatch(/^4:42\sam \| Lee P\.$/i)
    expect(checkins[1]).toMatch(/^7:05\spm \| Ana B\.$/i)
  })
})
