import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { popClass } from '../motion/pop.ts'
import { DaysGrid, Mark, MarkLegend, WeekMarks, type DayKind, type WeekMark } from './Marks.tsx'

describe('Mark', () => {
  test('FR-BOARD-01 is an image named by its label, carrying its kind and flag', () => {
    render(<Mark kind="some" label="Week 3: 2 visits" flag />)
    const mark = screen.getByRole('img', { name: 'Week 3: 2 visits' })
    expect(mark).toHaveAttribute('data-mark', 'some')
    expect(mark).toHaveAttribute('data-flag', '')
  })

  test('FR-BOARD-01 without a flag it carries none, and without a label it is hidden as decoration', () => {
    const { container } = render(
      <>
        <Mark kind="full" label="Week 1: 3 visits" />
        <Mark kind="future" />
      </>,
    )
    expect(screen.getByRole('img', { name: 'Week 1: 3 visits' })).not.toHaveAttribute('data-flag')
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(container.querySelector('[data-mark="future"]')).toHaveAttribute('aria-hidden', 'true')
  })

  test('FR-BOARD-03 a fresh mark takes the pop, and others do not', () => {
    render(
      <>
        <Mark kind="full" label="This week: 3 visits" fresh />
        <Mark kind="full" label="Week 2: 3 visits" />
      </>,
    )
    expect(screen.getByRole('img', { name: 'This week: 3 visits' }).className).toContain(popClass)
    expect(screen.getByRole('img', { name: 'Week 2: 3 visits' }).className).not.toContain(popClass)
  })
})

describe('WeekMarks', () => {
  test('FR-BOARD-01 shows one labelled mark per week, in order, as a named group', () => {
    const cells: WeekMark[] = [
      { kind: 'full', label: 'Week 1: 3 visits' },
      { kind: 'none', label: 'Week 2: no visits', flag: true },
      { kind: 'outline', label: 'Week 3, this week: 1 visit', fresh: true },
      { kind: 'future', label: 'Week 4: not yet' },
    ]
    render(<WeekMarks cells={cells} label="Sam O.'s weeks" />)
    const group = screen.getByRole('group', { name: "Sam O.'s weeks" })
    const marks = within(group).getAllByRole('img')
    expect(marks.map((m) => m.getAttribute('aria-label'))).toEqual(cells.map((c) => c.label))
    expect(marks.map((m) => m.getAttribute('data-mark'))).toEqual(['full', 'none', 'outline', 'future'])
    expect(marks[1]).toHaveAttribute('data-flag', '')
    expect(marks[2]?.className).toContain(popClass)
  })
})

describe('MarkLegend', () => {
  test('FR-BOARD-01 shows each mark beside its words, all hidden from assistive technology', () => {
    const { container } = render(
      <MarkLegend
        items={[
          { kind: 'full', label: '3+ visits' },
          { kind: 'some', label: 'Slipping', flag: true },
        ]}
      />,
    )
    const list = container.querySelector('ul')
    expect(list).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    const items = [...(list?.querySelectorAll('li') ?? [])]
    expect(items.map((li) => li.textContent)).toEqual(['3+ visits', 'Slipping'])
    expect(items[1]?.querySelector('[data-mark="some"]')).toHaveAttribute('data-flag', '')
  })
})

describe('DaysGrid', () => {
  test('FR-MEMBER-01 is one image named by its label, a square per day, in 13 weeks of 7', () => {
    const kind = (i: number): DayKind => (i < 14 ? 'visited' : i < 30 ? (i % 2 ? 'visited' : 'missed') : 'ahead')
    const days = Array.from({ length: 90 }, (_, i) => kind(i))
    const { container } = render(<DaysGrid days={days} label="22 visits in the first 30 days" />)
    const grid = screen.getByRole('img', { name: '22 visits in the first 30 days' })
    const rects = [...container.querySelectorAll('rect')]
    expect(rects).toHaveLength(90)
    expect(rects.map((r) => r.getAttribute('data-day'))).toEqual(days)
    // Day 8 starts the second week: the next column, back at the top.
    expect(rects[7]?.getAttribute('y')).toBe(rects[0]?.getAttribute('y'))
    expect(Number(rects[7]?.getAttribute('x'))).toBeGreaterThan(Number(rects[0]?.getAttribute('x')))
    expect(Number(rects[1]?.getAttribute('y'))).toBeGreaterThan(Number(rects[0]?.getAttribute('y')))
    expect(grid.getAttribute('viewBox')).toBe('0 0 160 85')
  })

  test('FR-MEMBER-01 draws at most 90 days', () => {
    const { container } = render(<DaysGrid days={Array<DayKind>(95).fill('visited')} label="90 visits" />)
    expect(container.querySelectorAll('rect')).toHaveLength(90)
  })

  test('FR-MEMBER-01 DaysGrid numbers the 13 weeks, hidden, and rings the current week', () => {
    const days = Array<DayKind>(90).fill('ahead')
    const { container } = render(<DaysGrid days={days} label="No visits yet" weekNumbers currentWeek={4} />)
    const grid = screen.getByRole('img', { name: 'No visits yet' })
    // The numbers sit in one hidden group above the columns, each centred over its week.
    const numbers = [...container.querySelectorAll('text')]
    expect(numbers.map((t) => t.textContent)).toEqual(Array.from({ length: 13 }, (_, w) => String(w + 1)))
    expect(numbers[0]?.closest('g')).toHaveAttribute('aria-hidden', 'true')
    // 6.5 grid units draw at 12 px or more on a 390 px phone.
    expect(numbers[0]).toHaveAttribute('font-size', '6.5')
    // The ring's top edge clears the numbers' baseline, so the ringed week's number isn't struck through.
    const ringRect = container.querySelector('rect[data-current-week]')
    expect(Number(ringRect?.getAttribute('y'))).toBeGreaterThan(Number(numbers[3]?.getAttribute('y')) + 1)
    const days1 = container.querySelectorAll('rect[data-day]')
    expect(days1).toHaveLength(90)
    const day = (i: number) => days1[i] as SVGRectElement
    const centre = (r: SVGRectElement) => Number(r.getAttribute('x')) + Number(r.getAttribute('width')) / 2
    expect(Number(numbers[3]?.getAttribute('x'))).toBe(centre(day(21)))
    expect(Number(numbers[0]?.getAttribute('y'))).toBeLessThan(Number(day(0).getAttribute('y')))
    // Week 4's column (days 22 to 28) sits inside the ring, and its neighbours' don't.
    const ring = container.querySelector('rect[data-current-week]') as SVGRectElement
    expect(ring).toHaveAttribute('data-current-week', '4')
    const [left, right] = [
      Number(ring.getAttribute('x')),
      Number(ring.getAttribute('x')) + Number(ring.getAttribute('width')),
    ]
    const top = Number(ring.getAttribute('y'))
    const bottom = top + Number(ring.getAttribute('height'))
    for (const i of [21, 27]) {
      expect(Number(day(i).getAttribute('x'))).toBeGreaterThan(left)
      expect(Number(day(i).getAttribute('x')) + 10).toBeLessThan(right)
      expect(Number(day(i).getAttribute('y'))).toBeGreaterThan(top)
      expect(Number(day(i).getAttribute('y')) + 10).toBeLessThan(bottom)
    }
    expect(Number(day(20).getAttribute('x')) + 10).toBeLessThan(left)
    expect(Number(day(28).getAttribute('x'))).toBeGreaterThan(right)
    // The view grows to hold the numbers and the ring, so neither is clipped.
    const [x, y, w, h] = (grid.getAttribute('viewBox') ?? '').split(' ').map(Number)
    expect(x).toBeLessThanOrEqual(left - 0.5)
    expect(y).toBeLessThanOrEqual(Number(numbers[0]?.getAttribute('y')) - 6.5)
    expect((x ?? 0) + (w ?? 0)).toBeGreaterThan(160)
    expect((y ?? 0) + (h ?? 0)).toBeGreaterThanOrEqual(bottom + 0.5)
  })

  test('FR-MEMBER-01 without them, no numbers and no ring; a week outside 1 to 13 rings nothing', () => {
    const { container, rerender } = render(<DaysGrid days={[]} label="Not started" />)
    expect(container.querySelector('text')).toBeNull()
    expect(container.querySelector('rect[data-current-week]')).toBeNull()
    rerender(<DaysGrid days={[]} label="Not started" currentWeek={14} />)
    expect(container.querySelector('rect[data-current-week]')).toBeNull()
    expect(screen.getByRole('img').getAttribute('viewBox')).toBe('0 0 160 85')
  })
})
