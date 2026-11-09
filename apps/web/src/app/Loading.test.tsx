import { t } from '@tenure/copy'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Loading } from './Loading.tsx'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

test('FR-SHELL-05 the shell shows no spinner for 400 ms, then the screens\' spinner with "Loading"', () => {
  render(<Loading />)
  act(() => vi.advanceTimersByTime(399))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByRole('status')).toHaveTextContent(t('common.loading'))
  // The timer is the one wait: the Spinner shows at once rather than wait its own 400 ms on top.
  expect(screen.getByRole('status').style.getPropertyValue('--spinner-delay')).toBe('0ms')
})
