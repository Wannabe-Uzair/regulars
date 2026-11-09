import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { Button } from '../Button/Button.tsx'
import { Menu, MenuItem, MenuSeparator } from './Menu.tsx'

function RowMenu({ onEdit = () => {}, onRemove = () => {} }: { onEdit?: () => void; onRemove?: () => void }) {
  return (
    <Menu trigger={<Button>More for Dana</Button>} align="end">
      <MenuItem onSelect={onEdit}>Edit</MenuItem>
      <MenuItem onSelect={() => {}}>Pause</MenuItem>
      <MenuSeparator />
      <MenuItem tone="danger" onSelect={onRemove}>
        Remove
      </MenuItem>
    </Menu>
  )
}

describe('Menu', () => {
  test('opens from the keyboard with focus on the first item', async () => {
    const user = userEvent.setup()
    render(<RowMenu />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'More for Dana' })).toHaveFocus()

    await user.keyboard('{Enter}')
    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  test('arrow keys move to an item, Enter chooses it, the menu closes and focus goes back to the trigger', async () => {
    const onRemove = vi.fn()
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(<RowMenu onEdit={onEdit} onRemove={onRemove} />)
    const trigger = screen.getByRole('button', { name: 'More for Dana' })
    await user.tab()
    await user.keyboard('{ArrowDown}')

    // The separator is skipped.
    await user.keyboard('{ArrowDown}{ArrowDown}')
    const remove = screen.getByRole('menuitem', { name: 'Remove' })
    expect(remove).toHaveFocus()
    expect(remove).toHaveAttribute('data-tone', 'danger')

    await user.keyboard('{Enter}')
    expect(onRemove).toHaveBeenCalledOnce()
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('Escape closes it without choosing', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(<RowMenu onEdit={onEdit} />)
    await user.tab()
    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onEdit).not.toHaveBeenCalled()
  })

  test('items are neutral unless marked danger', async () => {
    const user = userEvent.setup()
    render(<RowMenu />)
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('data-tone', 'neutral')
  })
})
