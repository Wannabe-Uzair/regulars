import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { IconButton } from '../IconButton/IconButton.tsx'
import { Tooltip, TooltipProvider } from './Tooltip.tsx'

const glyph = <svg />

describe('Tooltip', () => {
  test('shows on keyboard focus, describes its trigger, and Escape hides it', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Visits this week">
        <IconButton label="Visits">{glyph}</IconButton>
      </Tooltip>,
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.tab()
    const trigger = screen.getByRole('button', { name: 'Visits' })
    expect(trigger).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Visits this week')
    expect(trigger).toHaveAccessibleDescription('Visits this week')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  test('works the same under one shared provider', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <Tooltip content="First hint">
          <IconButton label="First">{glyph}</IconButton>
        </Tooltip>
        <Tooltip content="Second hint" side="bottom">
          <IconButton label="Second">{glyph}</IconButton>
        </Tooltip>
      </TooltipProvider>,
    )
    await user.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent('First hint')
    await user.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Second hint')
  })
})
