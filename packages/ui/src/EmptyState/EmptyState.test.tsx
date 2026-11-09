import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button } from '../Button/Button.tsx'
import { UserPlusIcon } from '../icons/UserPlusIcon.tsx'
import { EmptyState } from './EmptyState.tsx'

describe('EmptyState', () => {
  test('its symbol shows above the title, hidden from assistive technology', () => {
    const { container } = render(
      <EmptyState
        symbol={<UserPlusIcon />}
        title="No Members Yet"
        body="Add your first member to start the board."
        action={<Button variant="primary">Add Member</Button>}
      />,
    )
    const heading = screen.getByRole('heading', { level: 2, name: 'No Members Yet' })
    const symbol = container.querySelector('svg')?.parentElement
    expect(symbol).toHaveAttribute('aria-hidden', 'true')
    // First in the box, before the title.
    expect(symbol).toBe(heading.parentElement?.firstElementChild)
    expect(symbol?.compareDocumentPosition(heading) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByText('Add your first member to start the board.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add Member' })).toBeVisible()
  })

  test('without a symbol, the title comes first', () => {
    render(<EmptyState title="No Results" headingLevel={3} />)
    const heading = screen.getByRole('heading', { level: 3, name: 'No Results' })
    expect(heading.parentElement?.firstElementChild).toBe(heading)
  })
})
