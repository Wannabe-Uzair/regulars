import { render, screen, within, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Button } from '../Button/Button.tsx'
import { buttonClass } from '../Button/button-class.ts'
import { ConfirmDialog, type ConfirmTone } from './ConfirmDialog.tsx'

const words = {
  title: 'Archive this member?',
  body: 'They leave every list and the kiosk search. Their history is kept.',
  confirmLabel: 'Archive member',
  cancelLabel: 'Cancel',
}

/** A confirm whose work the test settles by hand: `finish(error?)`. */
function Archive({ tone, onConfirm }: { tone?: ConfirmTone; onConfirm: (finish: (error?: string) => void) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [open, setOpen] = useState(false)
  return (
    <ConfirmDialog
      {...words}
      tone={tone}
      busy={busy}
      error={error}
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Archive</Button>}
      onConfirm={() => {
        setBusy(true)
        onConfirm((failure) => {
          setBusy(false)
          setError(failure)
          if (failure === undefined) setOpen(false)
        })
      }}
    />
  )
}

describe('ConfirmDialog', () => {
  test('FR-MEMBER-05 asks its question with the body as its description, a cancel and the confirm', async () => {
    render(<Archive tone="danger" onConfirm={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('dialog', { name: words.title })
    expect(dialog).toHaveAccessibleDescription(words.body)
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Archive member' })).toBeEnabled()
    expect(within(dialog).queryByRole('alert')).toBeNull()
  })

  test('one alert style: no corner X, Cancel the quiet button, the confirm filled red when destructive', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Archive tone="danger" onConfirm={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    let dialog = screen.getByRole('dialog', { name: words.title })
    // With no X, Cancel is Radix's first tabbable and takes focus: a stray Enter cancels, never confirms.
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    // Two buttons only: Cancel, Escape and the scrim close it, as an Apple alert, so there is no close box.
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Cancel', 'Archive member'])
    expect(within(dialog).getByRole('button', { name: 'Cancel' }).className).toBe(buttonClass({ variant: 'quiet' }))
    expect(within(dialog).getByRole('button', { name: 'Archive member' }).className).toBe(
      buttonClass({ variant: 'destructive' }),
    )
    unmount()

    // The same alert for an action that destroys nothing: the confirm takes the tint's fill.
    render(<Archive tone="primary" onConfirm={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    dialog = screen.getByRole('dialog', { name: words.title })
    expect(within(dialog).getAllByRole('button')).toHaveLength(2)
    expect(within(dialog).getByRole('button', { name: 'Cancel' }).className).toBe(buttonClass({ variant: 'quiet' }))
    expect(within(dialog).getByRole('button', { name: 'Archive member' }).className).toBe(
      buttonClass({ variant: 'primary' }),
    )
  })

  test('FR-MEMBER-05 Cancel closes it without confirming, and focus goes back to the trigger', async () => {
    const onConfirm = vi.fn()
    render(<Archive onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Archive' })).toHaveFocus()
  })

  test('FR-MEMBER-07 the confirm shows loading while busy, and the dialog stays open until the work is done', async () => {
    const user = userEvent.setup()
    let finish: (error?: string) => void = () => {}
    render(<Archive tone="danger" onConfirm={(f) => (finish = f)} />)
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    const confirm = screen.getByRole('button', { name: 'Archive member' })
    await user.click(confirm)

    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: words.title })).toBeInTheDocument()

    await user.click(confirm)
    // A click while busy does not confirm twice.
    expect(confirm).toHaveAttribute('aria-busy', 'true')

    finish()
    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('FR-MEMBER-07 a failed confirm shows its error as an alert, read again after another try', async () => {
    const user = userEvent.setup()
    let finish: (error?: string) => void = () => {}
    render(<Archive tone="danger" onConfirm={(f) => (finish = f)} />)
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    await user.click(screen.getByRole('button', { name: 'Archive member' }))
    finish("That didn't work. Try again.")

    const dialog = await screen.findByRole('dialog', { name: words.title })
    const first = await within(dialog).findByRole('alert')
    expect(first).toHaveTextContent("That didn't work. Try again.")
    expect(within(dialog).getByRole('button', { name: 'Archive member' })).not.toHaveAttribute('aria-busy')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled()

    await user.click(within(dialog).getByRole('button', { name: 'Archive member' }))
    finish("That didn't work. Try again.")
    const again = await within(dialog).findByRole('alert')
    expect(again).not.toBe(first)
  })

  test('FR-MEMBER-05 confirms through onConfirm once per click', async () => {
    const onConfirm = vi.fn((finish: (error?: string) => void) => finish())
    render(<Archive tone="primary" onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('FR-STAFF-05 opens from its trigger without being controlled', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...words} onConfirm={onConfirm} trigger={<Button>Deactivate</Button>} />)
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('FR-STAFF-05 uncontrolled, it closes once an async confirm resolves and stays open if it rejects', async () => {
    let settle!: (ok: boolean) => void
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve, reject) => (settle = (ok) => (ok ? resolve() : reject(new Error('no'))))),
    )
    render(<ConfirmDialog {...words} onConfirm={onConfirm} trigger={<Button>Deactivate</Button>} />)
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async () => settle(false))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    await act(async () => settle(true))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('FR-STAFF-05 uncontrolled, a second click while the promise is pending does not confirm twice, and the confirm shows loading', async () => {
    let settle!: () => void
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (settle = resolve)))
    render(<ConfirmDialog {...words} onConfirm={onConfirm} trigger={<Button>Deactivate</Button>} />)
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    const confirm = screen.getByRole('button', { name: 'Archive member' })
    await userEvent.click(confirm)
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async () => settle())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test("FR-STAFF-05 uncontrolled, a failed promise leaves it open with the caller's error and lets the next click try again", async () => {
    const onConfirm = vi.fn(() => Promise.reject(new Error('no')))
    function Reset() {
      const [error, setError] = useState<string>()
      return (
        <ConfirmDialog
          {...words}
          error={error}
          trigger={<Button>Reset</Button>}
          onConfirm={() =>
            onConfirm().catch((e: unknown) => {
              setError("That didn't work.")
              throw e
            })
          }
        />
      )
    }
    render(<Reset />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("That didn't work.")
    expect(screen.getByRole('button', { name: 'Archive member' })).not.toHaveAttribute('aria-busy')
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })

  test('FR-OPS-03 uncontrolled, a confirm that resolves while still busy closes once busy drops (preflight F1)', async () => {
    // As a mutation does: mutateAsync resolves, and isPending drops a render later (TanStack Query notifies on a timer).
    let settle!: () => void
    function Reset() {
      const [busy, setBusy] = useState(false)
      return (
        <ConfirmDialog
          {...words}
          busy={busy}
          trigger={<Button>Reset</Button>}
          onConfirm={() => {
            setBusy(true)
            return new Promise<void>((resolve) => {
              settle = () => {
                resolve()
                setTimeout(() => setBusy(false), 20)
              }
            })
          }}
        />
      )
    }
    render(<Reset />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    expect(screen.getByRole('button', { name: 'Archive member' })).toHaveAttribute('aria-busy', 'true')
    await act(async () => settle())
    // The promise has resolved but the caller is still busy: open, still working.
    expect(screen.getByRole('dialog')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveFocus()
  })

  test('FR-STAFF-05 uncontrolled, it stays open while busy, even when onConfirm returns at once', async () => {
    function Working() {
      const [busy, setBusy] = useState(false)
      return (
        <ConfirmDialog
          {...words}
          busy={busy}
          trigger={<Button>Reset</Button>}
          onConfirm={() => {
            setBusy(true)
          }}
        />
      )
    }
    render(<Working />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await userEvent.click(screen.getByRole('button', { name: 'Archive member' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Archive member' })).toHaveAttribute('aria-busy', 'true')
  })
})
