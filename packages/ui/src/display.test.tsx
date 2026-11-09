import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button } from './Button/Button.tsx'
import { Card } from './Card/Card.tsx'
import { EmptyState } from './EmptyState/EmptyState.tsx'
import { Kpi } from './Kpi/Kpi.tsx'
import { Panel } from './Panel/Panel.tsx'
import { StatusDot } from './StatusDot/StatusDot.tsx'
import { StatusTag, type MemberStatus } from './StatusTag/StatusTag.tsx'
import { Tag } from './Tag/Tag.tsx'

describe('Card', () => {
  test('renders its children and passes attributes through', () => {
    render(
      <Card role="group" aria-label="This week">
        Nine visits
      </Card>,
    )
    expect(screen.getByRole('group', { name: 'This week' })).toHaveTextContent('Nine visits')
  })
})

describe('Panel', () => {
  test('with landmark, is a region named by its heading, with actions and a body', () => {
    render(
      <Panel heading="Slipping" headingLevel={3} landmark actions={<Button>Nudge all</Button>}>
        Three members
      </Panel>,
    )
    const region = screen.getByRole('region', { name: 'Slipping' })
    expect(within(region).getByRole('heading', { name: 'Slipping', level: 3 })).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Nudge all' })).toBeInTheDocument()
    expect(region).toHaveTextContent('Three members')
  })

  test('by default it keeps its heading, level 2, but is not a landmark', () => {
    render(<Panel heading="Members">List</Panel>)
    expect(screen.getByRole('heading', { name: 'Members', level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
  })
})

describe('Tag', () => {
  test('shows its label', () => {
    render(<Tag>Coach</Tag>)
    expect(screen.getByText('Coach')).toBeVisible()
  })
})

describe('StatusDot', () => {
  const mark = (status: MemberStatus) => {
    const { container } = render(<StatusDot status={status} />)
    const svg = container.querySelector('svg')
    if (svg === null) throw new Error('no mark')
    return svg
  }

  test.each<MemberStatus>(['on', 'below', 'new', 'slipping'])(
    'NFR-USE-01 %s is an inline SVG in currentColor, hidden from assistive technology',
    (status) => {
      const svg = mark(status)
      expect(svg).toHaveAttribute('data-status', status)
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveAttribute('focusable', 'false')
      for (const shape of svg.querySelectorAll('circle, path')) {
        expect([shape.getAttribute('fill'), shape.getAttribute('stroke')]).toContain('currentColor')
      }
    },
  )

  test('NFR-USE-01 draws four shapes: a filled dot, a half ring, an empty ring and a falling triangle', () => {
    const on = mark('on')
    expect(on.querySelectorAll('circle')).toHaveLength(1)
    expect(on.querySelector('circle')).toHaveAttribute('fill', 'currentColor')
    expect(on.querySelector('path')).toBeNull()

    // The half ring: a ring with its left half filled.
    const below = mark('below')
    expect(below.querySelector('circle')).toHaveAttribute('fill', 'none')
    expect(below.querySelector('circle')).toHaveAttribute('stroke', 'currentColor')
    expect(below.querySelector('path')).toHaveAttribute('d', 'M6 1A5 5 0 0 0 6 11Z')

    const ring = mark('new')
    expect(ring.querySelectorAll('circle')).toHaveLength(1)
    expect(ring.querySelector('circle')).toHaveAttribute('fill', 'none')
    expect(ring.querySelector('path')).toBeNull()

    // Point down: the flat edge on top, the point at the bottom.
    const slipping = mark('slipping')
    expect(slipping.querySelector('circle')).toBeNull()
    expect(slipping.querySelector('path')).toHaveAttribute('d', 'M1 1.7h10L6 10.3Z')
    // Round joins, as the reprinted brochure and standee draw it.
    expect(slipping.querySelector('path')).toHaveAttribute('stroke-linejoin', 'round')
  })
})

describe('StatusTag', () => {
  test.each<[MemberStatus, string]>([
    ['on', 'On pace'],
    ['below', 'Below pace'],
    ['slipping', 'Slipping'],
    ['new', 'New'],
  ])('%s shows its label, with the mark hidden from assistive technology', (status, label) => {
    render(<StatusTag status={status}>{label}</StatusTag>)
    const tag = screen.getByText(label)
    expect(tag).toBeVisible()
    expect(tag).toHaveAttribute('data-status', status)
    expect(tag.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(tag.textContent).toBe(label)
  })
})

describe('Kpi', () => {
  test('is a group named by its label, with the value in tabular numbers and a hint', () => {
    render(<Kpi label="Slipping" value={12} hint="Up 3 since last week" emphasis="attention" />)
    const kpi = screen.getByRole('group', { name: 'Slipping' })
    expect(within(kpi).getByText('12')).toHaveAttribute('data-numeric')
    expect(kpi).toHaveTextContent('Up 3 since last week')
  })

  test('the hint is optional', () => {
    render(<Kpi label="Members" value="248" />)
    expect(screen.getByRole('group', { name: 'Members' })).toHaveTextContent(/^Members248$/)
  })
})

describe('EmptyState', () => {
  test('has a title heading, a body and an action', () => {
    render(
      <EmptyState
        title="No members yet"
        headingLevel={3}
        body="Import your member list to fill the board."
        action={<Button variant="primary">Import members</Button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No members yet', level: 3 })).toBeInTheDocument()
    expect(screen.getByText('Import your member list to fill the board.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Import members' })).toBeInTheDocument()
  })
})
