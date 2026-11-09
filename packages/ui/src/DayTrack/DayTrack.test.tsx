import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DayTrack } from './DayTrack.tsx'

const fillOf = (container: HTMLElement) =>
  (container.firstElementChild?.firstElementChild as HTMLElement).style.inlineSize

describe('DayTrack', () => {
  test('FR-BILL-01 is one bar, hidden from assistive technology, filled to the day of 90', () => {
    const { container } = render(<DayTrack day={24} />)
    const track = container.firstElementChild
    expect(track).toHaveAttribute('aria-hidden', 'true')
    expect(track?.children).toHaveLength(1)
    expect(fillOf(container)).toBe('26.67%')
  })

  test.each([
    [1, '1.11%'],
    [90, '100%'],
    [120, '100%'],
    [0, '0%'],
  ])('FR-BILL-01 day %d fills %s, never past the ends', (day, fill) => {
    const { container } = render(<DayTrack day={day} />)
    expect(fillOf(container)).toBe(fill)
  })

  test('FR-BILL-01 takes another length', () => {
    const { container } = render(<DayTrack day={15} of={30} />)
    expect(fillOf(container)).toBe('50%')
  })
})
