import type { MemberSummary, Role, TodayResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { popClass } from '@tenure/ui'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import { buildRoutes } from '../../../app/router.tsx'
import tableStyles from '../../../shared/board/BoardTable.module.css'
import { FakeEventSource, json, me, mockFetch } from '../../../test/fakes.ts'

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

// Board order, as the server sends it: the slipping first, then the newest.
const sam = member({
  id: 12,
  name: 'Sam O.',
  week: 9,
  weeks: [3, 3, 2, 3, 1, 1, 0, 1, 0, 0],
  status: 'slipping',
  pace: 1.444,
})
const zoe = member({
  id: 21,
  name: 'Zoe K.',
  week: 3,
  weeks: [1, 0, 1, 1],
  status: 'slipping',
  coachId: 3,
  coachName: 'Mike T.',
})
const ana = member({
  id: 30,
  name: 'Ana B.',
  week: 0,
  weeks: [1],
  status: 'new',
  pace: null,
  coachId: 3,
  coachName: 'Mike T.',
})
const lee = member({ id: 31, name: 'Lee P.', week: 4, weeks: [3, 4, 3, 3, 3], status: 'on', pace: 3.25 })

const fixture: TodayResponse = {
  kpis: { newMembers: 4, onTheLinePct: 25, slipping: 2, nudgedThisWeek: 3 },
  slipping: [zoe, sam],
  checkinsToday: [{ memberId: 31, name: 'Lee P.', at: '2026-11-06T23:42:00.000Z' }],
  board: [sam, zoe, ana, lee],
  hasMembers: true,
}
const emptyGym: TodayResponse = {
  kpis: { newMembers: 0, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 },
  slipping: [],
  checkinsToday: [],
  board: [],
  hasMembers: false,
}

let answer: () => Response | Promise<Response>

function renderBoard(role: Role, path = '/app/board') {
  const fetch = mockFetch((_method, url) => {
    if (url === '/api/auth/me') return json(200, me(role))
    if (url === '/api/today') return answer()
    return json(404, { error: { code: 'notApi', message: "That isn't part of the Regulars API." } })
  })
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [path] })
  render(<App client={client} router={router} />)
  return {
    router,
    search: () => new URLSearchParams(router.state.location.search),
    calls: () => fetch.mock.calls.filter(([url]) => String(url) === '/api/today').length,
  }
}

const findTable = async () => within(await screen.findByRole('region', { name: t('board.aria') })).getByRole('table')
const rowsOf = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)
/** Each row's name: the link to the member's own text, before its hidden slipping suffix. */
const names = (table: HTMLElement) => rowsOf(table).map((r) => within(r).getByRole('link').firstChild?.textContent)
/**
 * jsdom has no AnimationEvent, so the animation's name rides on a plain event that bubbles as the real one does; and
 * React, finding no AnimationEvent, listens for the prefixed name, so the event goes out under both.
 */
const animationEnd = (el: Element, animationName: string) =>
  act(() => {
    for (const type of ['animationend', 'webkitAnimationEnd']) {
      const event = new Event(type, { bubbles: true })
      Object.defineProperty(event, 'animationName', { value: animationName })
      el.dispatchEvent(event)
    }
  })
const shown = () => names(within(screen.getByRole('region', { name: t('board.aria') })).getByRole('table'))

beforeEach(() => {
  FakeEventSource.install()
  answer = () => json(200, fixture)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the board', () => {
  test('FR-BOARD-01 lists every first-90-days member in board order, with 13 marks, pace, status and the full legend', async () => {
    renderBoard('owner')
    expect(await screen.findByRole('heading', { level: 1, name: t('board.title') })).toBeInTheDocument()
    const table = await findTable()
    expect(names(table)).toEqual(['Sam O.', 'Zoe K.', 'Ana B.', 'Lee P.'])
    for (const row of rowsOf(table)) expect(within(row).getAllByRole('img')).toHaveLength(13)
    expect(within(table).getByRole('columnheader', { name: t('members.col.pace') })).toBeInTheDocument()
    const paces = rowsOf(table).map((r) => r.querySelector('td:nth-last-child(2)')?.textContent)
    expect(paces).toEqual([
      t('board.pace', { x: '1.4' }),
      t('board.pace', { x: '1.0' }),
      t('common.none'),
      t('board.pace', { x: '3.3' }),
    ])
    // The status is the row's last cell.
    const statuses = rowsOf(table).map((r) => r.lastElementChild?.textContent)
    expect(statuses).toEqual([t('status.slipping'), t('status.slipping'), t('status.new'), t('status.on')])
    // The full legend: every mark in words, then what counts, which is read.
    expect(screen.getByText(t('board.legend.future'))).toBeInTheDocument()
    expect(screen.getByText(t('board.legend.12'))).toBeInTheDocument()
    expect(screen.getByText(t('status.note'))).toBeVisible()
  })

  test("FR-BOARD-02 each row's name links to the member, named for them, with no Open and no Nudge", async () => {
    const { router } = renderBoard('owner')
    const rows = rowsOf(await findTable())
    for (const [i, m] of [sam, zoe, ana, lee].entries()) {
      const links = within(rows[i]!).getAllByRole('link')
      expect(links).toHaveLength(1)
      // A slipping member's link says so (VoiceOver's links list reads "Sam O., slipping").
      expect(links[0]).toHaveAccessibleName(m.status === 'slipping' ? `${m.name}${t('a11y.slipping')}` : m.name)
      expect(links[0]).toHaveAttribute('href', `/app/members/${m.id}`)
      // The link is the rowheader's first child; the rowheader still says a slipping member is slipping.
      expect(within(rows[i]!).getByRole('rowheader').firstChild).toBe(links[0])
    }
    expect(within(rows[0]!).getByRole('rowheader')).toHaveAccessibleName(`Sam O.${t('a11y.slipping')}`)
    expect(within(rows[0]!).queryAllByRole('button')).toEqual([])
    // The member page's back link returns to the board as it was, filters and all.
    await userEvent.click(screen.getByRole('radio', { name: t('status.slipping') }))
    await userEvent.click(within(rowsOf(await findTable())[1]!).getByRole('link'))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/app/members/${zoe.id}`))
    expect(router.state.location.state).toEqual({ from: '/app/board?status=slipping' })
  })

  test('FR-BOARD-02 there is no Nudge and no Open anywhere on the board', async () => {
    renderBoard('owner')
    await findTable()
    expect(screen.queryByText(t('member.nudge'))).not.toBeInTheDocument()
    expect(screen.queryByText(t('common.open'))).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: t('a11y.openMember', { name: sam.name }) })).not.toBeInTheDocument()
  })

  test('FR-SHELL-02 the page’s title is the name its sidebar link and tab give it: Board (audit B2-21)', async () => {
    renderBoard('owner')
    const title = await screen.findByRole('heading', { level: 1 })
    for (const name of [t('nav.owner.board'), t('tab.owner.board'), t('nav.coach.board'), t('tab.coach.board')]) {
      expect(title).toHaveTextContent(new RegExp(`^${name}$`))
    }
    // The sidebar's link and the tab, each marked current, read the same.
    const current = screen.getAllByRole('link', { name: t('nav.owner.board') })
    expect(current).toHaveLength(2)
    for (const link of current) expect(link).toHaveAttribute('aria-current', 'page')
  })

  test('FR-BOARD-01 the board counts its rows and the slipping, over the table', async () => {
    renderBoard('owner')
    await findTable()
    expect(screen.getByText(t('board.count', { n: 4, s: 2 }))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: t('status.new') }))
    expect(screen.getByText(t('board.count.one', { s: 0 }))).toBeInTheDocument()
  })

  test('FR-BOARD-04 on first load the board’s own order shows its mark on Status: aria-sort and a shown caret (audit B2-19)', async () => {
    renderBoard('owner')
    const table = await findTable()
    const heads = within(table).getAllByRole('columnheader')
    const status = within(table).getByRole('columnheader', { name: t('today.board.head.status') })
    expect(heads.filter((h) => h.hasAttribute('aria-sort'))).toEqual([status])
    expect(status).toHaveAttribute('aria-sort', 'ascending')
    // Every head keeps its caret's room; only the sorted one shows it.
    const shown = heads.map((h) => !h.querySelector('svg')?.classList.contains(tableStyles.unsorted!))
    expect(shown).toEqual(heads.map((h) => h === status))
  })

  test("FR-BOARD-04 the headers sort by name, joined, pace and status, and a third press restores the board's order", async () => {
    renderBoard('owner')
    const table = await findTable()
    const header = (name: string) => within(table).getByRole('columnheader', { name })
    const press = (name: string) => userEvent.click(within(header(name)).getByRole('button', { name }))
    const board = ['Sam O.', 'Zoe K.', 'Ana B.', 'Lee P.']
    const status = t('today.board.head.status')
    const cases = [
      // Weeks sorts by joined: week 1 first when ascending. A pace not known yet goes last both ways; ties keep the
      // board's order (Sam before Zoe, both slipping).
      [t('board.head.member'), ['Ana B.', 'Lee P.', 'Sam O.', 'Zoe K.'], ['Zoe K.', 'Sam O.', 'Lee P.', 'Ana B.']],
      [t('today.board.head.weeks'), ['Ana B.', 'Zoe K.', 'Lee P.', 'Sam O.'], ['Sam O.', 'Lee P.', 'Zoe K.', 'Ana B.']],
      [t('members.col.pace'), ['Zoe K.', 'Sam O.', 'Lee P.', 'Ana B.'], ['Lee P.', 'Sam O.', 'Zoe K.', 'Ana B.']],
    ] as const
    for (const [name, ascending, descending] of cases) {
      // The board's own order is marked on Status, ascending (audit B2-19).
      expect(header(name)).not.toHaveAttribute('aria-sort')
      expect(header(status)).toHaveAttribute('aria-sort', 'ascending')
      await press(name)
      expect(names(table), `${name} ascending`).toEqual(ascending)
      expect(header(name)).toHaveAttribute('aria-sort', 'ascending')
      expect(header(status)).not.toHaveAttribute('aria-sort')
      await press(name)
      expect(names(table), `${name} descending`).toEqual(descending)
      expect(header(name)).toHaveAttribute('aria-sort', 'descending')
      await press(name)
      expect(names(table), `${name} restored`).toEqual(board)
      expect(header(name)).not.toHaveAttribute('aria-sort')
      expect(header(status)).toHaveAttribute('aria-sort', 'ascending')
    }
    // Status's ascending is the board's order, so its first press reverses it and its second restores it.
    await press(status)
    expect(names(table), 'status descending').toEqual(['Lee P.', 'Ana B.', 'Sam O.', 'Zoe K.'])
    expect(header(status)).toHaveAttribute('aria-sort', 'descending')
    await press(status)
    expect(names(table), 'status restored').toEqual(board)
    expect(header(status)).toHaveAttribute('aria-sort', 'ascending')
    // Another column starts ascending, and only the sorted column carries aria-sort.
    await press(t('board.head.member'))
    await press(t('members.col.pace'))
    expect(names(table)).toEqual(['Zoe K.', 'Sam O.', 'Lee P.', 'Ana B.'])
    expect(
      within(table)
        .getAllByRole('columnheader')
        .filter((h) => h.hasAttribute('aria-sort')),
    ).toEqual([header(t('members.col.pace'))])
  })

  test('FR-MEM-02 the status chips filter the rows and keep the filter in the URL', async () => {
    const { search } = renderBoard('owner')
    await findTable()
    await userEvent.click(screen.getByRole('radio', { name: t('status.slipping') }))
    expect(shown()).toEqual(['Sam O.', 'Zoe K.'])
    expect(search().get('status')).toBe('slipping')
  })

  test('FR-MEM-02 opening the board with ?status=new shows only the new members', async () => {
    renderBoard('owner', '/app/board?status=new')
    await findTable()
    expect(shown()).toEqual(['Ana B.'])
    expect(screen.getByRole('radio', { name: t('status.new') })).toBeChecked()
  })

  test("FR-MEM-02 an owner filters by the board's own coaches; a coach has no coach filter", async () => {
    const { search } = renderBoard('owner')
    await findTable()
    const select = screen.getByRole('combobox', { name: t('board.filter.coach') })
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([t('board.filter.allCoaches'), 'Mike T.', 'Priya S.'])
    await userEvent.selectOptions(select, 'Mike T.')
    expect(shown()).toEqual(['Zoe K.', 'Ana B.'])
    expect(search().get('coach')).toBe('3')
  })

  test('FR-MEM-02 a coach sees no coach filter', async () => {
    renderBoard('coach')
    await findTable()
    expect(screen.queryByRole('combobox', { name: t('board.filter.coach') })).not.toBeInTheDocument()
  })

  test('FR-MEM-02 the search filters as you type, keeps focus in the field and the text in the URL', async () => {
    const { search } = renderBoard('owner')
    await findTable()
    const box = screen.getByRole('searchbox', { name: t('common.search') })
    await userEvent.type(box, 'sam')
    expect(shown()).toEqual(['Sam O.'])
    expect(box).toHaveFocus()
    expect(search().get('q')).toBe('sam')
  })

  test('FR-MEM-02 with no match the empty state clears every filter and shows everyone again', async () => {
    const { search } = renderBoard('owner', '/app/board?status=on&coach=3')
    expect(await screen.findByRole('heading', { name: t('board.empty') })).toBeInTheDocument()
    expect(screen.getByText(t('board.emptyBody'))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t('board.emptyClear') }))
    expect(await findTable()).toBeInTheDocument()
    expect(shown()).toEqual(['Sam O.', 'Zoe K.', 'Ana B.', 'Lee P.'])
    expect([...search().keys()]).toEqual([])
  })

  test('FR-MEM-02 a search that matches nothing names the search, with a magnifying glass and Clear Filters', async () => {
    const { search } = renderBoard('owner', '/app/board?status=on&coach=3&q=zz')
    const title = await screen.findByRole('heading', { name: t('board.empty.search', { query: 'zz' }) })
    expect(screen.getByText(t('board.empty.searchBody'))).toBeInTheDocument()
    expect(title.previousElementSibling?.querySelector('svg')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: t('board.emptyClear') }))
    expect(await findTable()).toBeInTheDocument()
    expect(shown()).toEqual(['Sam O.', 'Zoe K.', 'Ana B.', 'Lee P.'])
    expect([...search().keys()]).toEqual([])
  })

  test.each([
    ['owner', 'today.empty.title', 'today.empty.kioskBody'],
    ['coach', 'today.empty.coachTitle', 'today.empty.coach'],
  ] as const)(
    "FR-BOARD-01 an empty gym shows Today's empty state for the %s, with a user-plus",
    async (role, title, body) => {
      answer = () => json(200, emptyGym)
      renderBoard(role)
      const heading = await screen.findByRole('heading', { name: t(title) })
      expect(heading.previousElementSibling?.querySelector('svg')).not.toBeNull()
      expect(screen.getByText(t(body))).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: t('board.emptyClear') })).not.toBeInTheDocument()
    },
  )

  test('FR-BOARD-01 a gym with nobody in their first 90 days says No New Members', async () => {
    answer = () => json(200, { ...emptyGym, hasMembers: true })
    renderBoard('owner')
    expect(await screen.findByRole('heading', { name: t('board.empty.none') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('board.emptyClear') })).not.toBeInTheDocument()
  })

  test('a failed load shows the error, and Try again loads it', async () => {
    answer = () => Promise.reject(new TypeError('Failed to fetch'))
    const { calls } = renderBoard('owner')
    expect(await screen.findByRole('alert')).toHaveTextContent(t('err.network'))
    answer = () => json(200, fixture)
    await userEvent.click(screen.getByRole('button', { name: t('common.retry') }))
    expect(await findTable()).toBeInTheDocument()
    expect(calls()).toBe(2)
  })
})

describe('the board, live', () => {
  const event = {
    type: 'checkin.recorded',
    gymId: 1,
    memberId: 12,
    coachId: 2,
    name: 'Sam O.',
    at: '2026-11-06T23:50:00.000Z',
  }

  test('FR-BOARD-03 a check-in refreshes the board, toasts it and pops only that week mark', async () => {
    const { calls } = renderBoard('owner')
    const table = await findTable()
    const popped = () =>
      within(table)
        .getAllByRole('img')
        .filter((m) => m.className.split(' ').includes(popClass))
    expect(popped()).toEqual([])

    // Sam's week in progress goes from 0 visits to 1.
    const after = { ...sam, weeks: [...sam.weeks.slice(0, 9), 1] }
    answer = () =>
      json(200, {
        ...fixture,
        board: [after, zoe, ana, lee],
        checkinsToday: [{ memberId: 12, name: 'Sam O.', at: event.at }, ...fixture.checkinsToday],
      })
    act(() => FakeEventSource.instances[0]!.emit(event))

    expect(await screen.findByText(t('toast.checkin', { name: 'Sam O.' }))).toBeInTheDocument()
    expect(calls()).toBe(2)
    const sams = within(rowsOf(table)[0]!).getAllByRole('img')
    expect(sams[9]).toHaveAccessibleName(t('a11y.cell.nowOne', { n: 10 }))
    expect(popped()).toEqual([sams[9]])
  })

  test('FR-BOARD-03 a check-in tints its row, and only its row', async () => {
    renderBoard('owner')
    const table = await findTable()
    const tinted = () => rowsOf(table).filter((r) => /fresh/.test(r.className))
    expect(tinted()).toEqual([])
    const after = { ...sam, weeks: [...sam.weeks.slice(0, 9), 1] }
    answer = () =>
      json(200, {
        ...fixture,
        board: [after, zoe, ana, lee],
        checkinsToday: [{ memberId: 12, name: 'Sam O.', at: event.at }, ...fixture.checkinsToday],
      })
    act(() => FakeEventSource.instances[0]!.emit(event))
    await vi.waitFor(() => expect(tinted()).toEqual([rowsOf(table)[0]]))
  })

  test("FR-BOARD-03 a refresh with no news doesn't cut the tint and the pop short, and the member's next check-in replays them", async () => {
    const { calls } = renderBoard('owner')
    const table = await findTable()
    const first = { memberId: 12, name: 'Sam O.', at: event.at }
    const once = { ...sam, weeks: [...sam.weeks.slice(0, 9), 1] }
    answer = () =>
      json(200, { ...fixture, board: [once, zoe, ana, lee], checkinsToday: [first, ...fixture.checkinsToday] })
    act(() => FakeEventSource.instances[0]!.emit(event))
    await vi.waitFor(() => expect(rowsOf(table)[0]).toHaveClass(/fresh/))
    const row = rowsOf(table)[0]!
    const mark = within(row).getAllByRole('img')[9]!
    expect(mark).toHaveClass(popClass)

    // Another event refetches the same check-ins: Sam's row and mark stay as they are, so their animations finish.
    act(() => FakeEventSource.instances[0]!.emit({ type: 'member.updated', gymId: 1, memberId: 21, coachId: 2 }))
    await vi.waitFor(() => expect(calls()).toBe(3))
    expect(rowsOf(table)[0]).toBe(row)
    expect(row).toHaveClass(/fresh/)
    expect(within(row).getAllByRole('img')[9]).toBe(mark)
    expect(mark).toHaveClass(popClass)

    // Sam checks in again: the board draws his row afresh, so the tint and the pop run again.
    const second = { ...first, at: '2026-11-06T23:55:00.000Z' }
    const twice = { ...sam, weeks: [...sam.weeks.slice(0, 9), 2] }
    answer = () =>
      json(200, { ...fixture, board: [twice, zoe, ana, lee], checkinsToday: [second, first, ...fixture.checkinsToday] })
    act(() => FakeEventSource.instances[0]!.emit({ ...event, at: second.at }))
    await vi.waitFor(() => expect(rowsOf(table)[0]).not.toBe(row))
    expect(rowsOf(table)[0]).toHaveClass(/fresh/)
    expect(within(rowsOf(table)[0]!).getAllByRole('img')[9]).toHaveClass(popClass)
  })

  test('FR-BOARD-03 once the tint has run out, a row that leaves and comes back through a filter does not replay it', async () => {
    renderBoard('owner')
    const table = await findTable()
    const first = { memberId: 12, name: 'Sam O.', at: event.at }
    const once = { ...sam, weeks: [...sam.weeks.slice(0, 9), 1] }
    answer = () =>
      json(200, { ...fixture, board: [once, zoe, ana, lee], checkinsToday: [first, ...fixture.checkinsToday] })
    act(() => FakeEventSource.instances[0]!.emit(event))
    await vi.waitFor(() => expect(rowsOf(table)[0]).toHaveClass(/fresh/))

    // The mark's pop ending is not the tint's end; the tint's is (it bubbles up from the cells).
    const sams = () => within(rowsOf(table)[0]!)
    animationEnd(sams().getAllByRole('img')[9]!, popClass)
    expect(rowsOf(table)[0]).toHaveClass(/fresh/)
    animationEnd(sams().getAllByRole('img')[0]!, 'tint')
    expect(rowsOf(table)[0]).not.toHaveClass(/fresh/)
    expect(sams().getAllByRole('img')[9]).not.toHaveClass(popClass)

    // Away through a status chip and back: the row is drawn again, still not fresh.
    await userEvent.click(screen.getByRole('radio', { name: t('status.new') }))
    await userEvent.click(screen.getByRole('radio', { name: t('board.filter.all') }))
    const back = rowsOf(await findTable()).find((r) => within(r).queryByRole('link', { name: /^Sam O\./ }))!
    expect(back).not.toHaveClass(/fresh/)
    expect(within(back).getAllByRole('img')[9]).not.toHaveClass(popClass)
  })

  const scope = { gymId: 1, memberId: 12, coachId: 2 }
  test.each([
    ['checkin.recorded', event],
    ['member.joined', { type: 'member.joined', ...scope }],
    ['member.updated', { type: 'member.updated', ...scope }],
    ['member.deleted', { type: 'member.deleted', ...scope }],
    ['nudge.recorded', { type: 'nudge.recorded', ...scope }],
    ['import.committed', { type: 'import.committed', gymId: 1 }],
  ])('FR-BOARD-01 a %s event refreshes the board', async (_type, body) => {
    const { calls } = renderBoard('owner')
    await findTable()
    expect(calls()).toBe(1)
    act(() => FakeEventSource.instances[0]!.emit(body))
    await vi.waitFor(() => expect(calls()).toBe(2))
  })
})

/** The loading region's placeholder content, once the screen shows it: busy, one Loading status, inert and hidden. */
async function findSkeleton(): Promise<HTMLElement> {
  const region = await waitFor(() => {
    const busy = document.querySelector<HTMLElement>('[aria-busy="true"]:has(> [inert])')
    expect(busy).not.toBeNull()
    return busy as HTMLElement
  })
  expect(within(region).getByRole('status')).toHaveTextContent(t('common.loading'))
  const shapes = region.querySelector<HTMLElement>(':scope > [inert]') as HTMLElement
  expect(shapes).toHaveAttribute('aria-hidden', 'true')
  return shapes
}

describe('the board, loading', () => {
  test("while the board loads, its card holds placeholder rows in the table's own cells, then the members", async () => {
    const pending = Promise.withResolvers<Response>()
    answer = () => pending.promise
    renderBoard('owner')
    const shapes = await findSkeleton()
    // BoardTable's head in words over placeholder rows: each name in the 44 px link block, 13 week cells, the pace, the
    // status, so a row is the real row's height.
    expect(within(shapes).getByText(t('board.head.member'))).toBeInTheDocument()
    const rows = shapes.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.querySelector(`th.${tableStyles.name} > .${tableStyles.link}`)).not.toBeNull()
      expect(row.querySelectorAll(`td.${tableStyles.cell}`)).toHaveLength(13)
      expect(row.querySelector(`td.${tableStyles.paceCell}`)).not.toBeNull()
    }

    await act(async () => pending.resolve(json(200, fixture)))
    expect(await screen.findByRole('link', { name: /Sam O\./ })).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
