import type { CheckinToday } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { buttonClass, popClass } from '@tenure/ui'
import { render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, test } from 'vitest'
import { BoardLegend } from './BoardLegend.tsx'
import { freshCheckins, useFreshCheckins } from './fresh.ts'
import { OpenMember } from './OpenMember.tsx'
import { Pace } from './Pace.tsx'
import { paceText } from './pace-text.ts'
import { StatusText } from './StatusText.tsx'
import { WeekRow } from './WeekRow.tsx'

const sam = { week: 9, weeks: [3, 3, 2, 3, 1, 1, 0, 1, 0, 1], status: 'slipping' } as const
const marks = () => screen.getAllByRole('img')
const popped = () => marks().flatMap((m, w) => (m.className.split(' ').includes(popClass) ? [w] : []))

describe('the board row pieces', () => {
  test("FR-BOARD-01 WeekRow draws a member's 13 labelled marks", () => {
    render(<WeekRow member={sam} label="Sam O." />)
    expect(screen.getByRole('group', { name: 'Sam O.' })).toBeInTheDocument()
    expect(marks()).toHaveLength(13)
    expect(marks()[0]).toHaveAccessibleName(t('a11y.cell.visits', { n: 1, v: 3 }))
    expect(marks()[9]).toHaveAccessibleName(t('a11y.cell.nowOne', { n: 10 }))
    expect(marks()[9]).toHaveAttribute('data-mark', 'outline')
    expect(marks().filter((m) => m.hasAttribute('data-flag'))).toEqual([marks()[7], marks()[8]])
  })

  test("FR-BOARD-03 a check-in pops the week in progress's mark, and pops it again for the next one", () => {
    const { rerender } = render(<WeekRow member={sam} />)
    expect(popped()).toEqual([])
    rerender(<WeekRow member={sam} fresh="12@2026-11-07T17:42:00.000Z" />)
    expect(popped()).toEqual([9])
    const first = marks()[9]
    rerender(<WeekRow member={sam} fresh="12@2026-11-07T18:10:00.000Z" />)
    expect(popped()).toEqual([9])
    // A new element: the pop is an animation on mount, so it plays again.
    expect(marks()[9]).not.toBe(first)
    rerender(<WeekRow member={sam} />)
    expect(popped()).toEqual([])
  })

  test('FR-BOARD-01 pace is visits a week to one decimal, and the empty mark before the first finished week', () => {
    expect(paceText(1.25)).toBe(t('board.pace', { x: '1.3' }))
    expect(paceText(3)).toBe(t('board.pace', { x: '3.0' }))
    expect(paceText(null)).toBe(t('common.none'))
    render(<Pace pace={0.3} />)
    expect(screen.getByText(t('board.pace', { x: '0.3' }))).toBeInTheDocument()
  })

  test('FR-BOARD-01 the status shows as words with its tag', () => {
    render(<StatusText status="slipping" />)
    expect(screen.getByText(t('status.slipping')).closest('[data-status]')).toHaveAttribute('data-status', 'slipping')
  })

  test("FR-BOARD-01 the compact legend is Today's one line of marks, hidden from assistive technology", () => {
    const { container } = render(<BoardLegend />)
    const items = [...container.querySelectorAll('li')]
    expect(items.map((li) => li.textContent)).toEqual([
      t('board.legend.3'),
      t('board.legend.low'),
      t('board.legend.none'),
      t('status.slipping'),
      t('board.legend.week'),
    ])
    expect(items.map((li) => li.firstElementChild?.getAttribute('data-mark'))).toEqual(['full', 'some', 'none', 'some', 'outline'])
    expect(items[3]?.firstElementChild).toHaveAttribute('data-flag')
    expect(container.querySelector('ul')).toHaveAttribute('aria-hidden', 'true')
  })

  test("FR-BOARD-01 the board's full legend names every mark in words, then says what counts", () => {
    const { container } = render(<BoardLegend look="full" />)
    const items = [...container.querySelectorAll('li')]
    expect(items.map((li) => li.textContent)).toEqual([
      t('board.legend.3'),
      t('board.legend.12'),
      t('board.legend.0'),
      t('status.slipping'),
      t('board.legend.now'),
      t('board.legend.future'),
    ])
    expect(items.map((li) => li.firstElementChild?.getAttribute('data-mark'))).toEqual([
      'full',
      'some',
      'none',
      'some',
      'outline',
      'future',
    ])
    expect(screen.getByText(t('status.note'))).toBeVisible()
  })

  test('FR-BOARD-02 Open links to the member page, says Open and is named with the member', () => {
    render(
      <MemoryRouter>
        <OpenMember id={12} name="Sam O." />
      </MemoryRouter>,
    )
    const open = screen.getByRole('link', { name: t('a11y.openMember', { name: 'Sam O.' }) })
    expect(open).toHaveAttribute('href', '/app/members/12')
    expect(open).toHaveTextContent(t('common.open'))
    expect(open).toHaveClass(...buttonClass({ variant: 'quiet', size: 'sm' }).split(' '))
  })

  test("NFR-USE-03 F33 Open is ui's small quiet button alone: sm is 44 px itself, so no rule of its own", () => {
    render(
      <MemoryRouter>
        <OpenMember id={12} name="Sam O." />
      </MemoryRouter>,
    )
    const open = screen.getByRole('link', { name: t('a11y.openMember', { name: 'Sam O.' }) })
    expect(open.className).toBe(buttonClass({ variant: 'quiet', size: 'sm' }))
  })
})

describe('fresh check-ins', () => {
  const at = (memberId: number, time: string): CheckinToday => ({ memberId, name: 'x', at: `2026-11-07T${time}:00.000Z` })
  const morning = [at(30, '14:05')]
  const evening = [at(12, '18:10'), at(31, '17:50'), at(12, '17:42'), ...morning]

  test("FR-BOARD-03 the check-ins new data brings are fresh, each member's newest once; the first load has none", () => {
    expect(freshCheckins(null, morning).size).toBe(0)
    const fresh = freshCheckins(new Set([`30@${morning[0]?.at}`]), evening)
    expect([...fresh]).toEqual([
      [12, '12@2026-11-07T18:10:00.000Z'],
      [31, '31@2026-11-07T17:50:00.000Z'],
    ])
  })

  test('FR-BOARD-03 useFreshCheckins: nothing on the first load, the new ones after a refetch, none once it settles', () => {
    const { result, rerender } = renderHook(({ list }) => useFreshCheckins(list), {
      initialProps: { list: undefined as readonly CheckinToday[] | undefined },
    })
    expect(result.current.size).toBe(0)
    rerender({ list: morning })
    expect(result.current.size).toBe(0)
    const later = [at(31, '17:50'), ...morning]
    rerender({ list: later })
    expect([...result.current]).toEqual([[31, '31@2026-11-07T17:50:00.000Z']])
    // A re-render with the same data keeps it, so a mark doesn't mount again and pop twice.
    const same = result.current
    rerender({ list: later })
    expect(result.current).toBe(same)
    // A refetch that brings nothing new: nothing is fresh.
    rerender({ list: [...later] })
    expect(result.current.size).toBe(0)
  })
})
