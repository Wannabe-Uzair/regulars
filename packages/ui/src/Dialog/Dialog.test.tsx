import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { Button } from '../Button/Button.tsx'
import { Menu, MenuItem } from '../Menu/Menu.tsx'
import { installFakeMedia, type FakeMedia } from '../theme/fake-media.ts'
import { Dialog, DialogClose, sheetMediaQuery, type DialogPresentation } from './Dialog.tsx'

let media: FakeMedia | undefined

afterEach(() => {
  media?.restore()
  media = undefined
})

function NudgeDialog({ presentation }: { presentation?: DialogPresentation }) {
  return (
    <Dialog
      title="Nudge Dana"
      description="She hasn't been in for 12 days."
      closeLabel="Close"
      trigger={<Button>Nudge</Button>}
      presentation={presentation}
      footer={
        <>
          <DialogClose>
            <Button>Cancel</Button>
          </DialogClose>
          <Button variant="attention">Send</Button>
        </>
      }
    >
      <p>Message body</p>
    </Dialog>
  )
}

const presentationOf = () => screen.getByRole('dialog').getAttribute('data-presentation')

describe('Dialog', () => {
  test('is named by its title, described by its description, and holds the body and footer', async () => {
    const user = userEvent.setup()
    render(<NudgeDialog />)
    await user.click(screen.getByRole('button', { name: 'Nudge' }))

    const dialog = screen.getByRole('dialog', { name: 'Nudge Dana' })
    expect(dialog).toHaveAccessibleDescription("She hasn't been in for 12 days.")
    expect(dialog).toHaveTextContent('Message body')
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  test('moves focus in, keeps Tab inside, and Escape closes it and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<NudgeDialog />)
    const trigger = screen.getByRole('button', { name: 'Nudge' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    for (let i = 0; i < 5; i += 1) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('the close button, named from props, and a DialogClose both close it', async () => {
    const user = userEvent.setup()
    render(<NudgeDialog />)
    const trigger = screen.getByRole('button', { name: 'Nudge' })

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closeDisabled greys out the close button in the corner, and the dialog stays open', async () => {
    const user = userEvent.setup()
    render(<Dialog title="Nudge Dana" closeLabel="Close" closeDisabled defaultOpen />)
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close).toBeDisabled()
    await user.click(close)
    expect(screen.getByRole('dialog', { name: 'Nudge Dana' })).toBeInTheDocument()
  })

  test('with neither closeLabel nor cancelLabel the header is the title alone, as an alert, and Escape still closes it', async () => {
    const user = userEvent.setup()
    render(
      <Dialog
        title="Archive Kyle Parker?"
        defaultOpen
        footer={
          <DialogClose>
            <Button>Cancel</Button>
          </DialogClose>
        }
      />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Archive Kyle Parker?' })
    expect(within(dialog).getAllByRole('button').map((b) => b.textContent)).toEqual(['Cancel'])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('FR-NUDGE-01 a sheet with cancelLabel shows Cancel at the leading edge, closes on it, and has no corner close', async () => {
    const user = userEvent.setup()
    render(
      <Dialog
        title="Nudge Dana"
        cancelLabel="Cancel"
        presentation="sheet"
        trigger={<Button>Nudge</Button>}
        footer={<Button variant="tinted">WhatsApp</Button>}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Nudge' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Nudge Dana' })
    const heading = within(dialog).getByRole('heading', { name: 'Nudge Dana' })
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    // Cancel comes before the title, in the same header, and the sheet's only other button is the footer's.
    expect(cancel.parentElement).toBe(heading.parentElement)
    expect(cancel.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(dialog).getAllByRole('button')).toEqual([
      cancel,
      within(dialog).getByRole('button', { name: 'WhatsApp' }),
    ])
    expect(cancel.querySelector('svg')).toBeNull()

    await user.click(cancel)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('closeDisabled greys out the Cancel too, and the sheet stays open', async () => {
    const user = userEvent.setup()
    render(<Dialog title="Nudge Dana" cancelLabel="Cancel" closeDisabled defaultOpen />)
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(cancel).toBeDisabled()
    await user.click(cancel)
    expect(screen.getByRole('dialog', { name: 'Nudge Dana' })).toBeInTheDocument()
  })

  test('opened from state with no trigger, it returns focus to what had it before', async () => {
    const user = userEvent.setup()
    function FromState() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open from a row</Button>
          <Dialog title="Edit member" closeLabel="Close" open={open} onOpenChange={setOpen}>
            Body
          </Dialog>
        </>
      )
    }
    render(<FromState />)
    const opener = screen.getByRole('button', { name: 'Open from a row' })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'Edit member' })).not.toHaveAttribute('aria-describedby')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  // The row-menu pattern: the item that had focus unmounts with the menu, so it can't take focus back.
  function RowMenuDialog({ withReturnRef }: { withReturnRef: boolean }) {
    const [open, setOpen] = useState(false)
    const menuTrigger = useRef<HTMLButtonElement>(null)
    return (
      <>
        <Menu trigger={<Button ref={menuTrigger}>More for Dana</Button>}>
          <MenuItem onSelect={() => setOpen(true)}>Remove member</MenuItem>
        </Menu>
        <Dialog
          title="Remove Dana?"
          closeLabel="Close"
          open={open}
          onOpenChange={setOpen}
          {...(withReturnRef ? { returnFocusTo: menuTrigger } : {})}
        >
          Body
        </Dialog>
      </>
    )
  }

  test.each([
    ['returnFocusTo', true],
    ['the aria-controls of what held focus', false],
  ])('opened from a menu item, it returns focus to the menu trigger, found by %s', async (_how, withReturnRef) => {
    const user = userEvent.setup()
    render(<RowMenuDialog withReturnRef={withReturnRef} />)
    const menuTrigger = screen.getByRole('button', { name: 'More for Dana' })
    await user.click(menuTrigger)
    await user.click(screen.getByRole('menuitem', { name: 'Remove member' }))
    expect(screen.getByRole('dialog', { name: 'Remove Dana?' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(menuTrigger).toHaveFocus()
  })

  test('returnFocusTo is only a fallback: focus goes back to the opener while it is still there', async () => {
    const user = userEvent.setup()
    function WithFallback() {
      const [open, setOpen] = useState(false)
      const fallback = useRef<HTMLButtonElement>(null)
      return (
        <>
          <Button ref={fallback}>Fallback</Button>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <Dialog title="Edit" closeLabel="Close" open={open} onOpenChange={setOpen} returnFocusTo={fallback}>
            Body
          </Dialog>
        </>
      )
    }
    render(<WithFallback />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus()
  })

  test.each<[DialogPresentation, RegExp]>([
    ['sheet', /_md_/],
    ['dialog', /_sm_/],
  ])('as a %s, the close button has the matching size', async (presentation, size) => {
    const user = userEvent.setup()
    render(<NudgeDialog presentation={presentation} />)
    await user.click(screen.getByRole('button', { name: 'Nudge' }))
    expect(screen.getByRole('button', { name: 'Close' }).className).toMatch(size)
  })

  test.each([
    [true, 'sheet'],
    [false, 'dialog'],
  ])('auto, where the narrow-screen query matches is %s, shows a %s', async (narrow, expected) => {
    media = installFakeMedia({ [sheetMediaQuery]: narrow })
    const user = userEvent.setup()
    render(<NudgeDialog />)
    await user.click(screen.getByRole('button', { name: 'Nudge' }))
    expect(presentationOf()).toBe(expected)
  })

  test('auto follows the screen as it changes width while open', async () => {
    media = installFakeMedia({ [sheetMediaQuery]: false })
    const user = userEvent.setup()
    render(<NudgeDialog />)
    await user.click(screen.getByRole('button', { name: 'Nudge' }))
    expect(presentationOf()).toBe('dialog')

    act(() => media?.set(sheetMediaQuery, true))
    expect(presentationOf()).toBe('sheet')
  })

  test.each<[DialogPresentation, boolean]>([
    ['dialog', true],
    ['sheet', false],
  ])('presentation="%s" holds whatever the width (narrow: %s)', async (presentation, narrow) => {
    media = installFakeMedia({ [sheetMediaQuery]: narrow })
    const user = userEvent.setup()
    render(<NudgeDialog presentation={presentation} />)
    await user.click(screen.getByRole('button', { name: 'Nudge' }))
    expect(presentationOf()).toBe(presentation)
  })

  test('without matchMedia, auto falls back to the centred dialog', async () => {
    const user = userEvent.setup()
    render(<NudgeDialog />)
    await user.click(screen.getByRole('button', { name: 'Nudge' }))
    expect(presentationOf()).toBe('dialog')
  })
})
