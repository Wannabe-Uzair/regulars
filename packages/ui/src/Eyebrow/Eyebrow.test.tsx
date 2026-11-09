import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Eyebrow } from './Eyebrow.tsx'

describe('Eyebrow', () => {
  test('is a paragraph by default and keeps the text in sentence case', () => {
    render(<Eyebrow>This week</Eyebrow>)
    const el = screen.getByText('This week')
    expect(el.tagName).toBe('P')
    expect(el.textContent).toBe('This week')
  })

  test.each(['span', 'div'] as const)('renders as a %s on request', (as) => {
    render(<Eyebrow as={as}>Members</Eyebrow>)
    expect(screen.getByText('Members').tagName).toBe(as.toUpperCase())
  })
})
