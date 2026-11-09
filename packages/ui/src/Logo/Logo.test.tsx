import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Logo } from './Logo.tsx'

describe('Logo', () => {
  test('standing alone with a label, the mark is an image with that name', () => {
    render(<Logo label="Regulars" />)
    expect(screen.getByRole('img', { name: 'Regulars' })).toBeInTheDocument()
  })

  test('with a wordmark, the text is the name and the mark is hidden', () => {
    const { container } = render(<Logo name="Regulars" size={40} />)
    expect(screen.getByText('Regulars')).toBeVisible()
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('width', '40')
  })

  test('without a name or label it is decorative', () => {
    const { container } = render(
      <a href="/">
        <Logo />
      </a>,
    )
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  test('name and label are one or the other; passed both anyway, the wordmark names it', () => {
    // @ts-expect-error -- the types allow `name` or `label`, not both.
    const { container } = render(<Logo name="Regulars" label="Regulars home" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByLabelText('Regulars home')).toBeNull()
    expect(container).toHaveTextContent('Regulars')
  })


  test('NFR-USE-01 the square stands apart: the quarter is one baked path with an L-shaped gap round it, no mask', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg?.querySelector('mask, [mask]')).toBeNull()
    // The quarter circle of r 15.2 about (19.6, 19.6), with its bottom-left corner cut away up to y 13.3 and x 10.7.
    const quarter = svg?.querySelector(':scope > path')
    expect(quarter?.getAttribute('d')).toBe('M4.4 13.3V4.4A15.2 15.2 0 0 1 19.6 19.6H10.7V13.3Z')
    // The square sits in the cut, x 4.4–9.4 and y 14.6–19.6.
    const square = svg?.querySelector(':scope > rect')
    expect(square).toHaveAttribute('x', '4.4')
    expect(square).toHaveAttribute('y', '14.6')
    expect(square).toHaveAttribute('width', '5')
    expect(square).toHaveAttribute('height', '5')
    expect(square).toHaveAttribute('rx', '1.3')
    // The gap is read off the drawing: from the cut's edges to the square's, above it and to its right.
    const [, cutX, cutY] = /H([\d.]+)V([\d.]+)Z$/.exec(quarter?.getAttribute('d') ?? '') ?? []
    const at = (name: string) => Number(square?.getAttribute(name))
    expect(at('y') - Number(cutY)).toBeCloseTo(1.3, 5)
    expect(Number(cutX) - (at('x') + at('width'))).toBeCloseTo(1.3, 5)
    expect(svg?.children).toHaveLength(2)
  })
})
