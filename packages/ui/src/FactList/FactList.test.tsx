import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button } from '../Button/Button.tsx'
import { FactList } from './FactList.tsx'

describe('FactList', () => {
  test('FR-MEMBER-01 FR-ME-01 shows each fact as a term and its value, in order, with an optional action', () => {
    const { container } = render(
      <FactList
        items={[
          { label: 'Coach', value: 'Dana K.', action: <Button size="sm">Change coach</Button> },
          { label: 'Phone', value: '(312) 555-0142' },
        ]}
      />,
    )
    const terms = screen.getAllByRole('term')
    expect(terms.map((t) => t.textContent)).toEqual(['Coach', 'Phone'])
    const values = screen.getAllByRole('definition')
    expect(values[0]).toHaveTextContent('Dana K.')
    expect(values[1]).toHaveTextContent('(312) 555-0142')
    expect(screen.getByRole('button', { name: 'Change coach' }).closest('dd')).toBe(values[0])
    expect(values[1]?.querySelector('button')).toBeNull()
    // Each name keeps its own words in the DOM, shown as written.
    expect(container.querySelector('dl')).not.toBeNull()
  })
})
