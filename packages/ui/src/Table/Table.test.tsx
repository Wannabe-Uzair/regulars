import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { Table } from './Table.tsx'

function Members({ sticky }: { sticky?: boolean }) {
  return (
    <Table label="Members" stickyFirstColumn={sticky}>
      <thead>
        <tr>
          <th scope="col">Member</th>
          <th scope="col" data-numeric>
            Visits
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Sam O.</th>
          <td data-numeric>12</td>
        </tr>
      </tbody>
    </Table>
  )
}

describe('Table', () => {
  test('FR-MEM-03 is one named scroll region holding the caller’s table, its headers and rows intact', () => {
    render(<Members />)
    const region = screen.getByRole('region', { name: 'Members' })
    const table = within(region).getByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Member', 'Visits'])
    expect(within(table).getByRole('rowheader', { name: 'Sam O.' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: '12' })).toHaveAttribute('data-numeric')
  })

  test('NFR-USE-02 the region is focusable, so it scrolls sideways from the keyboard', async () => {
    render(<Members />)
    await userEvent.tab()
    expect(screen.getByRole('region', { name: 'Members' })).toHaveFocus()
  })

  test('FR-MEM-03 a sticky first column is a class on the table, off by default; the ground defaults to surface', () => {
    const { rerender } = render(<Members />)
    const plain = screen.getByRole('table').className
    expect(screen.getByRole('region')).toHaveAttribute('data-ground', 'surface')
    rerender(<Members sticky />)
    expect(screen.getByRole('table').className).not.toBe(plain)
  })
})
