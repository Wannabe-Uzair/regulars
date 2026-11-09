import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { FormError } from './FormError.tsx'

describe('FormError', () => {
  test('NFR-USE-01 shows its message as an alert', () => {
    render(<FormError message="That didn't work. Try again." submittedAt={1} />)
    expect(screen.getByRole('alert')).toHaveTextContent("That didn't work. Try again.")
  })

  test('NFR-USE-01 shows nothing without a message', () => {
    const { container } = render(<FormError submittedAt={1} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('NFR-USE-02 a new submit with the same message puts a new alert in, so it is read again', () => {
    const { rerender } = render(<FormError message="Try again." submittedAt={1} />)
    const first = screen.getByRole('alert')
    rerender(<FormError message="Try again." submittedAt={1} />)
    expect(screen.getByRole('alert')).toBe(first)
    rerender(<FormError message="Try again." submittedAt={2} />)
    expect(screen.getByRole('alert')).not.toBe(first)
  })
})
