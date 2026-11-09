import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { IconButton } from './IconButton.tsx'

const icon = (
  <svg viewBox="0 0 16 16">
    <path d="M2 8h12" />
  </svg>
)

describe('IconButton', () => {
  test('its required label is the accessible name and the icon is hidden', () => {
    render(<IconButton label="Close">{icon}</IconButton>)
    const button = screen.getByRole('button', { name: 'Close' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  test('the label is required by its type', () => {
    // @ts-expect-error: an IconButton without a label does not compile.
    render(<IconButton>{icon}</IconButton>)
  })

  test('loading and disabled block clicks, like Button', async () => {
    const onClick = vi.fn()
    render(
      <>
        <IconButton label="Refresh" loading onClick={onClick}>
          {icon}
        </IconButton>
        <IconButton label="Remove" variant="danger" size="sm" disabled onClick={onClick}>
          {icon}
        </IconButton>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
