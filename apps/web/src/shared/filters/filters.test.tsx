import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, useLocation } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, test } from 'vitest'
import { me } from '../../test/fakes.ts'
import { sessionKey } from '../session/session.ts'
import { FilterBar } from './FilterBar.tsx'
import { type FilterRow, useMemberFilters } from './useMemberFilters.ts'

type Row = FilterRow & { id: number; name: string }

const row = (id: number, name: string, over: Partial<Row> = {}): Row => {
  const [firstName = '', lastName = ''] = name.split(' ')
  return { id, name, firstName, lastName, phone: null, status: 'on', coachId: 2, coachName: 'Priya S.', ...over }
}

// In the list's own order (the board's), which the filter keeps.
const members: Row[] = [
  row(1, 'Sam Ortiz', { status: 'slipping' }),
  row(2, 'Ana Bell', { status: 'new', coachId: 3, coachName: 'Mike T.' }),
  row(3, 'Zoë King', { status: 'slipping', coachId: null, coachName: null }),
  row(4, 'Ayesha Khan', { status: 'below', phone: '+923001234567', coachId: 5, coachName: 'Ángel R.' }),
]

function Harness() {
  const filters = useMemberFilters(members)
  const location = useLocation()
  return (
    <>
      <FilterBar bar={filters.bar} searchPlaceholder={t('board.search')} />
      <ul aria-label="rows">
        {filters.rows.map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
      <p data-testid="search">{location.search}</p>
      <p data-testid="filtered">{String(filters.filtered)}</p>
      <button type="button" onClick={filters.clear}>
        clear
      </button>
    </>
  )
}

function renderBar(path: string, role: Role = 'owner') {
  const client = new QueryClient()
  client.setQueryData(sessionKey, me(role))
  const router = createMemoryRouter([{ path: '/x', element: <Harness /> }], { initialEntries: [path] })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const names = () => within(screen.getByRole('list', { name: 'rows' })).queryAllByRole('listitem').map((li) => li.textContent)
const search = () => new URLSearchParams(screen.getByTestId('search').textContent ?? '')
const box = () => screen.getByRole('searchbox', { name: t('common.search') })
const coachSelect = () => screen.getByRole('combobox', { name: t('board.filter.coach') })

/** Whether `el` is drawn as the 1 px clipped box that keeps a label for assistive technology only. */
const visuallyHidden = (el: Element | null | undefined) => /hidden/.test(el?.className ?? '')

const css = readFileSync(path.join(import.meta.dirname, 'FilterBar.module.css'), 'utf8')
/** The declarations of a rule, matched at the start of a line (indented inside a media query). */
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\n *${escaped} \\{\\n([^}]*)\\}`).exec(css)?.[1] ?? ''
}

describe('the filter bar', () => {
  test('FR-MEM-02 the status chips are All and the four statuses, each status with its dot', async () => {
    renderBar('/x')
    const chips = within(screen.getByRole('radiogroup', { name: t('board.filter.status') })).getAllByRole('radio')
    const labels = [t('board.filter.all'), t('status.slipping'), t('status.new'), t('status.on'), t('status.below')]
    expect(chips.map((chip) => chip.closest('label')?.textContent)).toEqual(labels)
    const dots = chips.map((chip) => chip.closest('label')?.querySelector('[data-status]')?.getAttribute('data-status'))
    expect(dots).toEqual([undefined, 'slipping', 'new', 'on', 'below'])
    expect(screen.getByRole('radio', { name: t('board.filter.all') })).toBeChecked()
    // The group's label names it, but isn't shown: the chips say what they are.
    expect(visuallyHidden(screen.getByText(t('board.filter.status')))).toBe(true)
  })

  test("FR-MEM-02 the search's label is hidden yet names it, and the chips keep to one line", () => {
    renderBar('/x')
    expect(box()).toHaveAccessibleName(t('common.search'))
    expect(visuallyHidden(screen.getByText(t('common.search')))).toBe(true)
    expect(coachSelect()).toHaveAccessibleName(t('board.filter.coach'))
    expect(visuallyHidden(screen.getByText(t('board.filter.coach')))).toBe(true)
    // One line of chips that scrolls sideways, with room round it for a chip's focus ring.
    const group = screen.getByRole('radiogroup', { name: t('board.filter.status') })
    expect(group.className).toMatch(/statusLine/)
    expect(rule('.statusLine')).toContain('overflow-x: auto;')
    // Positioned, so the chips' hidden radios are clipped with it and don't widen the page past a phone's edge.
    expect(rule('.statusLine')).toContain('position: relative;')
    expect(rule('.statusLine')).toContain('padding: var(--focus-room);')
    expect(rule(".statusLine [data-look='chips']")).toContain('flex-wrap: nowrap;')
    // From 48rem the whole bar is one line.
    expect(css).toMatch(/@media \(width >= 48rem\) \{\n {2}\.bar \{\n {4}flex-direction: row;/)
  })

  test('FR-MEM-02 a status chip filters and writes ?status=, keeping other parameters; All removes it', async () => {
    renderBar('/x?view=archived')
    await userEvent.click(screen.getByRole('radio', { name: t('status.slipping') }))
    expect(names()).toEqual(['Sam Ortiz', 'Zoë King'])
    expect(search().get('status')).toBe('slipping')
    expect(search().get('view')).toBe('archived')
    expect(screen.getByTestId('filtered')).toHaveTextContent('true')

    await userEvent.click(screen.getByRole('radio', { name: t('board.filter.all') }))
    expect(names()).toHaveLength(4)
    expect(search().has('status')).toBe(false)
    expect(search().get('view')).toBe('archived')
    expect(screen.getByTestId('filtered')).toHaveTextContent('false')
  })

  test('FR-MEM-02 the filters are read from the URL, and an unknown status reads as All', () => {
    renderBar('/x?status=new')
    expect(screen.getByRole('radio', { name: t('status.new') })).toBeChecked()
    expect(names()).toEqual(['Ana Bell'])
  })

  test('FR-MEM-02 an unknown ?status= reads as All', () => {
    renderBar('/x?status=archived')
    expect(screen.getByRole('radio', { name: t('board.filter.all') })).toBeChecked()
    expect(names()).toHaveLength(4)
  })

  test('FR-MEM-02 the search keeps every letter typed, filters as it goes and writes ?q=, keeping other parameters', async () => {
    renderBar('/x?view=everyone')
    expect(box()).toHaveAttribute('placeholder', t('board.search'))
    await userEvent.type(box(), 'zoe')
    expect(box()).toHaveValue('zoe')
    expect(names()).toEqual(['Zoë King']) // accents folded
    expect(search().get('q')).toBe('zoe')
    expect(search().get('view')).toBe('everyone')

    await userEvent.clear(box())
    await userEvent.type(box(), '0300 123')
    expect(box()).toHaveValue('0300 123')
    expect(names()).toEqual(['Ayesha Khan']) // the leading zero dropped, inside +923001234567
    expect(search().get('q')).toBe('0300 123')

    await userEvent.clear(box())
    expect(search().has('q')).toBe(false)
    expect(names()).toHaveLength(4)
  })

  test('FR-MEM-02 a search changed from outside, by Back or a link, shows in the box', async () => {
    const router = renderBar('/x?q=sam')
    expect(box()).toHaveValue('sam')
    expect(names()).toEqual(['Sam Ortiz'])
    await act(() => router.navigate('/x?q=ana'))
    expect(box()).toHaveValue('ana')
    expect(names()).toEqual(['Ana Bell'])
    await userEvent.type(box(), 'x')
    expect(box()).toHaveValue('anax')
    await act(() => router.navigate(-1))
    expect(box()).toHaveValue('sam')
  })

  test("FR-MEM-02 the owner's coach filter offers all coaches, the coaches on screen by name, then no coach", async () => {
    renderBar('/x?view=archived')
    const options = within(coachSelect()).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual([t('board.filter.allCoaches'), 'Ángel R.', 'Mike T.', 'Priya S.', t('member.coach.none')])

    await userEvent.selectOptions(coachSelect(), 'Mike T.')
    expect(names()).toEqual(['Ana Bell'])
    expect(search().get('coach')).toBe('3')
    expect(search().get('view')).toBe('archived')

    await userEvent.selectOptions(coachSelect(), t('member.coach.none'))
    expect(names()).toEqual(['Zoë King'])
    expect(search().get('coach')).toBe('none')

    await userEvent.selectOptions(coachSelect(), t('board.filter.allCoaches'))
    expect(names()).toHaveLength(4)
    expect(search().has('coach')).toBe(false)
  })

  test('FR-MEM-02 a coach filter naming no coach on screen reads as all coaches', () => {
    renderBar('/x?coach=99')
    expect(coachSelect()).toHaveValue('')
    expect(names()).toHaveLength(4)
  })

  test('FR-MEM-02 a coach sees no coach filter, and ?coach= changes nothing for them', () => {
    renderBar('/x?coach=3', 'coach')
    expect(screen.queryByRole('combobox', { name: t('board.filter.coach') })).not.toBeInTheDocument()
    expect(names()).toHaveLength(4)
  })

  test('FR-MEM-02 the status, the coach and the search apply together', () => {
    renderBar('/x?status=slipping&coach=2&q=sam')
    expect(names()).toEqual(['Sam Ortiz'])
  })

  test('FR-MEM-02 clearing removes the search, the status and the coach, and keeps other parameters', async () => {
    renderBar('/x?view=archived&status=slipping&coach=none&q=zo')
    expect(names()).toEqual(['Zoë King'])
    await userEvent.click(screen.getByRole('button', { name: 'clear' }))
    expect(box()).toHaveValue('')
    expect(names()).toHaveLength(4)
    expect([...search().keys()]).toEqual(['view'])
    expect(screen.getByTestId('filtered')).toHaveTextContent('false')
  })
})
