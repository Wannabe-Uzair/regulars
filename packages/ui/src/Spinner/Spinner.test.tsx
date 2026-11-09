import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Spinner } from './Spinner.tsx'

describe('Spinner', () => {
  test('with a label it is a status that screen readers read', () => {
    render(<Spinner label="Loading members" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading members')
  })

  test('without a label it is decorative', () => {
    const { container } = render(<Spinner />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  test('NFR-USE-04 waits the busy delay by default, and takes its own delay in ms when given one', () => {
    const { container, rerender } = render(<Spinner />)
    const spinner = container.firstElementChild as HTMLElement
    // No delay of its own: the CSS falls back to --delay-busy (400 ms).
    expect(spinner.style.getPropertyValue('--spinner-delay')).toBe('')
    rerender(<Spinner delay={0} />)
    expect(spinner.style.getPropertyValue('--spinner-delay')).toBe('0ms')
    rerender(<Spinner label="Loading members" delay={1000} />)
    expect(screen.getByRole('status').style.getPropertyValue('--spinner-delay')).toBe('1000ms')
  })
})
