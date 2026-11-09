import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { Button, type ButtonVariant } from './Button.tsx'

describe('Button', () => {
  test('is a native button named by its children, type="button" unless told otherwise', () => {
    render(
      <>
        <Button>Save</Button>
        <Button type="submit">Send</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit')
  })

  test.each<ButtonVariant>(['primary', 'secondary', 'quiet', 'plain', 'tinted', 'danger', 'destructive', 'attention'])(
    'renders the %s variant',
    (v) => {
      render(
        <Button variant={v} size="sm">
          Go
        </Button>,
      )
      expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled()
    },
  )

  test('fires onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('disabled: no click fires', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('loading: keeps its name and focus, sets aria-busy, shows a decorative spinner and blocks clicks', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(button.querySelector('svg')).not.toBeNull()
    expect(screen.queryByRole('status')).toBeNull()

    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    expect(button).toHaveFocus()
  })

  test('loading: a submit button does not submit its form', async () => {
    const onSubmit = vi.fn((e: SubmitEvent) => e.preventDefault())
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button type="submit" loading>
          Send
        </Button>
      </form>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('without loading it sets neither aria-busy nor aria-disabled', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button).not.toHaveAttribute('aria-disabled')
  })

  test('FR-TODAY-02 a done Button shows its check before the words and stays enabled', async () => {
    const onClick = vi.fn()
    render(
      <Button done aria-label="Nudged Dana" onClick={onClick}>
        Nudged
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Nudged Dana' })
    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(button).not.toHaveAttribute('aria-busy')
    // The check comes first, hidden: the words carry the meaning.
    const content = button.firstElementChild
    const check = content?.firstChild
    expect(check?.nodeName.toLowerCase()).toBe('svg')
    expect(check).toHaveAttribute('aria-hidden', 'true')
    expect(content?.lastChild?.textContent).toBe('Nudged')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('shows no check until it is done', () => {
    render(<Button>Nudge</Button>)
    expect(screen.getByRole('button', { name: 'Nudge' }).querySelector('svg')).toBeNull()
  })
})
