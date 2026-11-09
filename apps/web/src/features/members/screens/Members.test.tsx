import type { MemberSummary, MemberView } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { FakeEventSource, json } from '../../../test/fakes.ts'
import styles from '../components/members.module.css'
import { renderApp, resetScreen, setScreen, summary } from '../test-helpers.ts'

const sam = summary({ id: 12, firstName: 'Sam', lastName: 'Okafor', status: 'slipping', daysSinceLastVisit: 9 })
const leo = summary({ id: 14, firstName: 'Leo', lastName: '', coachId: null, coachName: null, status: 'new', week: 0 })
const ana = summary({
  id: 30,
  firstName: 'Ana',
  lastName: 'Bell',
  coachId: 3,
  coachName: 'Mike T.',
  daysSinceLastVisit: 0,
})
// Day 120: past the 90 days, so no status shows, though the summary still carries one.
const old = summary({
  id: 40,
  firstName: 'Omar',
  lastName: 'Haddad',
  status: 'slipping',
  daysSinceJoin: 120,
  week: 12,
  daysSinceLastVisit: null,
})

let lists: Partial<Record<MemberView, MemberSummary[]>>

function renderMembers(role: 'owner' | 'coach' = 'owner', path = '/app/members') {
  return renderApp(path, role, (method, url) => {
    const view = /^\/api\/members\?view=(\w+)$/.exec(url)?.[1] as MemberView | undefined
    if (method === 'GET' && view) return json(200, { members: lists[view] ?? [] })
    return undefined
  })
}

const table = async () => within(await screen.findByRole('region', { name: t('members.title') })).getByRole('table')
const bodyRows = (el: HTMLElement) => within(el).getAllByRole('row').slice(1)

beforeEach(() => {
  FakeEventSource.install()
  setScreen(true)
  lists = { first90: [leo, sam, ana], everyone: [ana, old, leo, sam], archived: [] }
})
afterEach(() => {
  vi.unstubAllGlobals()
  resetScreen()
})

describe('Members, the list', () => {
  test('FR-MEM-03 FR-MEM-04 a table of full names in the order given, each name the link to its member, with no Open', async () => {
    renderMembers()
    const rows = bodyRows(await table())
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Leo', 'Sam Okafor', 'Ana Bell'])
    const name = within(within(rows[1]!).getByRole('rowheader')).getByRole('link', { name: 'Sam Okafor' })
    expect(name).toHaveAttribute('href', '/app/members/12')
    expect(within(rows[0]!).getByRole('link', { name: 'Leo' })).toHaveAttribute('href', '/app/members/14')
    // The name is each row's one link, and no row says Open.
    for (const row of rows) expect(within(row).getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByText(t('common.open'))).not.toBeInTheDocument()
    expect(screen.getByText(t('members.count', { n: 3 }))).toBeInTheDocument()
  })

  test('FR-MEM-03 the cells: status, coach, week, pace and the last visit; a slipping name is not red', async () => {
    renderMembers()
    const [leoRow, samRow, anaRow] = bodyRows(await table())
    expect(
      within(samRow!)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual([
      t('status.slipping'),
      'Priya S.',
      t('members.weekCell', { n: 6 }),
      // The pace as the board writes it (A11).
      t('board.pace', { x: '1.8' }),
      t('members.last.days', { n: 9 }),
    ])
    expect(within(leoRow!).getAllByRole('cell')[1]).toHaveTextContent(t('common.none'))
    expect(within(anaRow!).getAllByRole('cell')[4]).toHaveTextContent(t('members.last.today'))
    // Slipping shows by its triangle and word in the status cell, never by the name's colour.
    for (const row of [samRow!, anaRow!]) {
      const header = within(row).getByRole('rowheader')
      expect(header.className).toBe('')
      expect(within(header).getByRole('link').className).toBe(within(anaRow!).getByRole('link').className)
    }
  })

  test('FR-MEM-03 a coach sees no coach column and no coach filter', async () => {
    renderMembers('coach')
    const el = await table()
    expect(within(el).queryByRole('columnheader', { name: t('member.coach') })).not.toBeInTheDocument()
    expect(within(el).getAllByRole('columnheader')).toHaveLength(5)
    expect(screen.queryByLabelText(t('board.filter.coach'))).not.toBeInTheDocument()
  })

  test('FR-MEM-03 below 48 rem the members are cards, with the week, pace and last visit line, the name the link', async () => {
    setScreen(false)
    renderMembers()
    const cards = within(await screen.findByRole('list', { name: t('members.title') })).getAllByRole('listitem')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(cards).toHaveLength(3)
    const card = within(cards[1]!)
    expect(card.getByText('Sam Okafor')).toBeInTheDocument()
    expect(card.getByText(t('status.slipping'))).toBeInTheDocument()
    expect(
      card.getByText(
        t('members.card.meta', {
          week: t('member.week', { n: 6 }),
          pace: t('board.pace', { x: '1.8' }),
          last: t('members.last.days', { n: 9 }),
        }),
      ),
    ).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'Sam Okafor' })).toHaveAttribute('href', '/app/members/12')
  })

  test('FR-MEM-03 a member with no pace yet reads "Week 1 of 13 · Yesterday": the pace is left out, not a dash (B2-13)', async () => {
    setScreen(false)
    lists.first90 = [
      summary({ id: 50, firstName: 'Amara', lastName: 'Nwosu', week: 0, pace: null, daysSinceLastVisit: 1 }),
    ]
    renderMembers()
    const [row] = within(await screen.findByRole('list', { name: t('members.title') })).getAllByRole('listitem')
    const week = t('member.week', { n: 1 })
    const last = t('members.last.yesterday')
    expect(within(row!).getByText(t('members.card.metaNoPace', { week, last }))).toBeInTheDocument()
    expect(within(row!).getByText(`${week} · ${last}`)).toBeInTheDocument()
    expect(row).not.toHaveTextContent(t('common.none'))
  })

  test('FR-MEM-03 below 48 rem the members are rows of one inset grouped list, each row one link, its name (B2-12)', async () => {
    setScreen(false)
    renderMembers()
    const list = await screen.findByRole('list', { name: t('members.title') })
    const rows = within(list).getAllByRole('listitem')
    for (const [i, name] of ['Leo', 'Sam Okafor', 'Ana Bell'].entries()) {
      const row = rows[i]!
      // A row of the one list, not a card of its own.
      expect(row.className).toBe(styles.row)
      expect(row.parentElement).toBe(list)
      // One link in the row, nothing else to press, and the link's words are the member's name.
      expect(within(row).getAllByRole('link')).toHaveLength(1)
      expect(within(row).queryByRole('button')).not.toBeInTheDocument()
      const link = within(row).getByRole('link')
      expect(link).toHaveAccessibleName(name)
      // The cover (the link's ::after) is placed against the row, which holds it.
      expect(link.className).toContain(styles.rowLink)
      expect(link.closest(`.${styles.row}`)).toBe(row)
    }
    expect(list.className).toBe(styles.rows)
    expect(screen.queryByText(t('common.open'))).not.toBeInTheDocument()
  })

  test('FR-MEMBER-08 a member link carries Members, its view and filters, for the way back', async () => {
    const { router } = renderMembers('owner', '/app/members?view=everyone&q=sam')
    await userEvent.click(await screen.findByRole('link', { name: 'Sam Okafor' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/app/members/12'))
    expect(router.state.location.state).toEqual({ from: '/app/members?view=everyone&q=sam' })
  })
})

describe('Members, the views', () => {
  test('FR-MEM-01 First 90 days is the default; Everyone and Archived ask for their own view and stay in the URL', async () => {
    const { router, calls } = renderMembers()
    await table()
    const views = screen.getByRole('radiogroup', { name: t('members.view') })
    expect(within(views).getByRole('radio', { name: t('members.view.first90') })).toBeChecked()
    expect(calls('GET', '/api/members?view=first90')).toHaveLength(1)

    await userEvent.click(within(views).getByRole('radio', { name: t('members.view.everyone') }))
    expect(await screen.findByRole('rowheader', { name: 'Omar Haddad' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?view=everyone')
    expect(calls('GET', '/api/members?view=everyone')).toHaveLength(1)

    await userEvent.click(within(views).getByRole('radio', { name: t('members.view.archived') }))
    expect(await screen.findByRole('heading', { name: t('members.empty.archived') })).toBeInTheDocument()
    expect(screen.getByText(t('members.emptyArchived'))).toBeInTheDocument()
    expect(router.state.location.search).toBe('?view=archived')
  })

  test('FR-MEM-01 a link to ?view=everyone opens that view', async () => {
    const { calls } = renderMembers('owner', '/app/members?view=everyone')
    expect(await screen.findByRole('rowheader', { name: 'Omar Haddad' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: t('members.view.everyone') })).toBeChecked()
    expect(calls('GET', '/api/members?view=first90')).toHaveLength(0)
  })

  test('FR-MEM-02 from day 90 a member shows Past 90 days in place of a status, and a status chip leaves them out', async () => {
    renderMembers('owner', '/app/members?view=everyone')
    const omar = (await screen.findByRole('rowheader', { name: 'Omar Haddad' })).closest('tr')!
    expect(within(omar).getAllByRole('cell')[0]).toHaveTextContent(t('members.past90'))
    expect(within(omar).queryByText(t('status.slipping'))).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: t('status.slipping') }))
    expect(bodyRows(await table()).map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Sam Okafor'])
  })
})

describe('Members, the filter bar and the empty states', () => {
  test('FR-MEM-02 the search and the coach filter narrow the list and live in the URL, keeping the view', async () => {
    const { router } = renderMembers('owner', '/app/members?view=everyone')
    await screen.findByRole('rowheader', { name: 'Omar Haddad' })
    await userEvent.type(screen.getByRole('searchbox', { name: t('common.search') }), 'okaf')
    expect(bodyRows(await table()).map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Sam Okafor'])
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('okaf')
    expect(new URLSearchParams(router.state.location.search).get('view')).toBe('everyone')

    await userEvent.clear(screen.getByRole('searchbox', { name: t('common.search') }))
    await userEvent.selectOptions(screen.getByLabelText(t('board.filter.coach')), 'Mike T.')
    expect(bodyRows(await table()).map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Ana Bell'])
  })

  test("FR-MEM-06 a search that matches nothing names the search, and its button clears the filters", async () => {
    renderMembers('owner', '/app/members?q=zzz')
    expect(await screen.findByRole('heading', { name: t('board.empty.search', { query: 'zzz' }) })).toBeInTheDocument()
    expect(screen.getByText(t('board.empty.searchBody'))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t('board.emptyClear') }))
    expect(bodyRows(await table())).toHaveLength(3)
  })

  test("FR-MEM-06 status or coach filters that match nothing show the board's filtered empty state", async () => {
    lists.first90 = [ana]
    renderMembers('owner', '/app/members?status=slipping')
    expect(await screen.findByRole('heading', { name: t('board.empty') })).toBeInTheDocument()
    expect(screen.getByText(t('board.emptyBody'))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t('board.emptyClear') }))
    expect(bodyRows(await table())).toHaveLength(1)
  })

  test('FR-MEM-06 with no filter and no members, the list says how members arrive, with no button', async () => {
    lists.first90 = []
    renderMembers()
    expect(await screen.findByRole('heading', { name: t('members.empty') })).toBeInTheDocument()
    expect(screen.getByText(t('members.emptyNone'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('board.emptyClear') })).not.toBeInTheDocument()
  })

  test("FR-MEM-06 the Archived view's empty state has its own title, not No Members Yet", async () => {
    renderMembers('owner', '/app/members?view=archived')
    expect(await screen.findByRole('heading', { name: t('members.empty.archived') })).toBeInTheDocument()
    expect(screen.getByText(t('members.emptyArchived'))).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: t('members.empty') })).not.toBeInTheDocument()
    expect(screen.queryByText(t('members.emptyNone'))).not.toBeInTheDocument()
  })

  test("FR-MEM-03 the list that doesn't load says why and offers Try again", async () => {
    let fail = true
    renderApp('/app/members', 'owner', (method, url) =>
      url === '/api/members?view=first90'
        ? fail
          ? json(500, { error: { code: 'generic', message: 'Something went wrong. Try again.' } })
          : json(200, { members: [sam] })
        : undefined,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: t('common.retry') }))
    expect(await screen.findByRole('rowheader', { name: 'Sam Okafor' })).toBeInTheDocument()
  })
})

describe('Members, live', () => {
  test('FR-LIVE-01 a member, check-in or nudge event refetches the list', async () => {
    const { calls } = renderMembers()
    await table()
    expect(calls('GET', '/api/members?view=first90')).toHaveLength(1)
    lists.first90 = [leo, sam]
    act(() => FakeEventSource.instances[0]!.emit({ type: 'member.updated', gymId: 1, memberId: 30, coachId: 3 }))
    await vi.waitFor(() => expect(bodyRows(screen.getByRole('table'))).toHaveLength(2))
    act(() =>
      FakeEventSource.instances[0]!.emit({
        type: 'checkin.recorded',
        gymId: 1,
        memberId: 12,
        coachId: 2,
        name: 'Sam O.',
        at: '2026-11-07T15:00:00.000Z',
      }),
    )
    await vi.waitFor(() => expect(calls('GET', '/api/members?view=first90')).toHaveLength(3))
    act(() => FakeEventSource.instances[0]!.emit({ type: 'nudge.recorded', gymId: 1, memberId: 12, coachId: 2 }))
    await vi.waitFor(() => expect(calls('GET', '/api/members?view=first90')).toHaveLength(4))
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

describe('Members, loading', () => {
  test("from 48 rem the table's head stands over placeholder rows, each name in the 44 px link block", async () => {
    const pending = Promise.withResolvers<Response>()
    renderApp('/app/members', 'owner', (method, url) =>
      method === 'GET' && url.startsWith('/api/members?view=') ? pending.promise : undefined,
    )
    const shapes = await findSkeleton()
    expect(within(shapes).getByText(t('members.col.name'))).toBeInTheDocument()
    expect(within(shapes).getByText(t('member.coach'))).toBeInTheDocument()
    const rows = shapes.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.querySelector(`th > .${styles.nameLink}`)).not.toBeNull()

    await act(async () => pending.resolve(json(200, { members: lists.first90 })))
    expect(bodyRows(await table())).toHaveLength(3)
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  test("below 48 rem the list's rows stand in place, each with the name's 44 px block, the meta line and the weeks", async () => {
    setScreen(false)
    renderApp('/app/members', 'coach', (method, url) =>
      method === 'GET' && url.startsWith('/api/members?view=') ? new Promise<Response>(() => {}) : undefined,
    )
    const shapes = await findSkeleton()
    const rows = shapes.querySelectorAll(`.${styles.rows} > li.${styles.row}`)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.querySelector(`.${styles.rowHead} > .${styles.rowLink}`)).not.toBeNull()
      // A coach sees no coach line, so a row has the one meta line.
      expect(row.querySelectorAll(`.${styles.meta}`)).toHaveLength(1)
    }
  })
})
