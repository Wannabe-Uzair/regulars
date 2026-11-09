import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { RollingNumber } from './RollingNumber.tsx'

/** The digits the faces show, read from their columns. */
const shown = (root: Element) =>
  [...root.querySelectorAll<HTMLElement>('[data-digit]')].map((d) => d.dataset.digit).join('')

describe('RollingNumber', () => {
  test('its text is the final value alone: the face draws its digits in CSS, so it adds no text', () => {
    const { container } = render(<RollingNumber value={1204} />)
    expect(container.textContent).toBe('1204')
    expect(shown(container)).toBe('1204')
  })

  test('the moving digits are hidden from screen readers; the name is the final value', () => {
    render(
      <h2>
        <RollingNumber value="2 of 12 new members are slipping" />
      </h2>,
    )
    const heading = screen.getByRole('heading', { name: '2 of 12 new members are slipping' })
    expect(heading).toHaveTextContent(/^2 of 12 new members are slipping$/)
    const faces = heading.querySelectorAll('[aria-hidden="true"]')
    expect(faces).toHaveLength(2)
    for (const face of faces) {
      expect(face.textContent).toBe('')
      expect(face.querySelector('[data-digit]')).not.toBeNull()
    }
    // Every digit is in a face; the words around the figures stay plain text.
    expect(heading.querySelectorAll('[data-digit]')).toHaveLength(3)
  })

  test("each column stands at its digit, and a figure's other characters stay put", () => {
    const { container } = render(<RollingNumber value="25%" />)
    const digits = [...container.querySelectorAll<HTMLElement>('[data-digit]')]
    expect(digits.map((d) => d.style.getPropertyValue('--digit'))).toEqual(['2', '5'])
    expect(container.querySelector('[data-char]')).toHaveAttribute('data-char', '%')
    expect(container.textContent).toBe('25%')
  })

  test('a change rolls the same columns to the new digits, by place value, and adds the places it gains', () => {
    const { container, rerender } = render(<RollingNumber value={9} />)
    const ones = container.querySelector<HTMLElement>('[data-digit]')!
    expect(ones.style.getPropertyValue('--digit')).toBe('9')

    rerender(<RollingNumber value={12} />)
    const digits = [...container.querySelectorAll<HTMLElement>('[data-digit]')]
    expect(shown(container)).toBe('12')
    // The ones column is the same element, now at 2, so its transform transitions instead of starting over.
    expect(digits[1]).toBe(ones)
    expect(ones.style.getPropertyValue('--digit')).toBe('2')
    expect(container.textContent).toBe('12')
  })

  test("in a sentence each figure keeps its own columns when the sentence's words change", () => {
    const { container, rerender } = render(<RollingNumber value="1 of 12 new members is slipping" />)
    const [first, ...total] = container.querySelectorAll('[data-digit]')
    rerender(<RollingNumber value="3 of 12 new members are slipping" />)
    const after = [...container.querySelectorAll('[data-digit]')]
    expect(after[0]).toBe(first)
    expect(after.slice(1)).toEqual(total)
    expect(container.textContent).toBe('3 of 12 new members are slipping')
  })

  test("the total, last in the sentence, keeps its columns when a figure before it drops out ('None of the 61')", () => {
    const { container, rerender } = render(<RollingNumber value="1 of 61 new members is slipping" />)
    const total = [...container.querySelectorAll<HTMLElement>('[data-digit]')].slice(1)
    expect(total.map((d) => d.dataset.digit)).toEqual(['6', '1'])
    rerender(<RollingNumber value="None of the 61 new members are slipping" />)
    const after = [...container.querySelectorAll<HTMLElement>('[data-digit]')]
    expect(after).toHaveLength(2)
    expect(after[0]).toBe(total[0])
    expect(after[1]).toBe(total[1])
    expect(after.map((d) => d.dataset.digit)).toEqual(['6', '1'])
  })

  test('a value with no digits is plain text', () => {
    const { container } = render(<RollingNumber value="—" />)
    expect(container.textContent).toBe('—')
    expect(container.querySelector('[aria-hidden]')).toBeNull()
  })
})
