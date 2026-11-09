import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Button, type ButtonSize, type ButtonVariant } from './Button.tsx'
import { buttonClass } from './button-class.ts'

// The real helper, watched, so the test sees that Button asks it for its look rather than building the same list.
vi.mock(import('./button-class.ts'), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, buttonClass: vi.fn(actual.buttonClass) }
})

const variants: ButtonVariant[] = ['primary', 'secondary', 'quiet', 'plain', 'tinted', 'danger', 'destructive', 'attention']
const sizes: ButtonSize[] = ['lg', 'md', 'sm']
const pairs = variants.flatMap((variant) => sizes.map((size) => ({ variant, size })))

describe('buttonClass', () => {
  test.each(pairs)(
    'Button takes its $variant $size look from it, so the two give the same classes',
    ({ variant, size }) => {
      vi.mocked(buttonClass).mockClear()
      render(
        <Button variant={variant} size={size}>
          Go
        </Button>,
      )
      expect(buttonClass).toHaveBeenCalledWith({ variant, size })
      expect(screen.getByRole('button', { name: 'Go' }).className).toBe(buttonClass({ variant, size }))
    },
  )

  test("the deprecated attention variant gives tinted's look, so the Nudge stays a tinted capsule until it switches", () => {
    for (const size of sizes)
      expect(buttonClass({ variant: 'attention', size })).toBe(buttonClass({ variant: 'tinted', size }))
    expect(buttonClass({ variant: 'tinted' })).not.toBe(buttonClass({ variant: 'plain' }))
  })

  test('defaults to the secondary variant at md, as Button does', () => {
    render(<Button>Go</Button>)
    expect(buttonClass()).toBe(buttonClass({ variant: 'secondary', size: 'md' }))
    expect(screen.getByRole('button', { name: 'Go' }).className).toBe(buttonClass())
  })

  test('a link with the look keeps the link role and its href', () => {
    render(
      <a className={buttonClass({ size: 'sm' })} href="/signup">
        Create your account
      </a>,
    )
    const link = screen.getByRole('link', { name: 'Create your account' })
    expect(link).toHaveAttribute('href', '/signup')
    expect(link.className).toBe(buttonClass({ variant: 'secondary', size: 'sm' }))
  })
})
