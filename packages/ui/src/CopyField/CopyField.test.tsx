import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { copyText } from './copy-text.ts'
import { CopyField } from './CopyField.tsx'

const link = 'http://192.168.1.20:5173/invite/abc123'

// jsdom has neither the clipboard nor execCommand, and is not a secure context: each test sets up the path it takes.
let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>
let execCommand: ReturnType<typeof vi.fn<(command: string) => boolean>>

function secure(isSecure: boolean) {
  vi.stubGlobal('isSecureContext', isSecure)
}

beforeEach(() => {
  writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  execCommand = vi.fn<(command: string) => boolean>(() => true)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
})

describe('copyText', () => {
  test('FR-STAFF-03 uses the clipboard API in a secure context', async () => {
    secure(true)
    expect(await copyText(link)).toBe(true)
    expect(writeText).toHaveBeenCalledWith(link)
    expect(execCommand).not.toHaveBeenCalled()
  })

  test('FR-STAFF-03 on plain http it copies through a hidden textarea and execCommand, then removes it', async () => {
    secure(false)
    let copied = ''
    execCommand.mockImplementation((command) => {
      const area = document.querySelector('textarea')
      copied = area ? area.value.slice(area.selectionStart, area.selectionEnd) : ''
      return command === 'copy'
    })
    expect(await copyText(link)).toBe(true)
    expect(writeText).not.toHaveBeenCalled()
    expect(copied).toBe(link)
    expect(document.querySelector('textarea')).toBeNull()
  })

  test('FR-STAFF-03 falls back when the clipboard API refuses', async () => {
    secure(true)
    writeText.mockRejectedValue(new Error('NotAllowedError'))
    expect(await copyText(link)).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  test('FR-STAFF-03 says so when neither path copies', async () => {
    secure(false)
    execCommand.mockReturnValue(false)
    expect(await copyText(link)).toBe(false)
    execCommand.mockImplementation(() => {
      throw new Error('unsupported')
    })
    expect(await copyText(link)).toBe(false)
  })

  test('NFR-USE-02 the fallback gives focus back to what had it', async () => {
    secure(false)
    render(<button type="button">Copy link</button>)
    screen.getByRole('button').focus()
    await copyText(link)
    expect(screen.getByRole('button')).toHaveFocus()
  })
})

describe('CopyField', () => {
  test('FR-GYM-03 shows the whole value beside its button, as a named group', () => {
    render(<CopyField value={link} label="Invite link" copyLabel="Copy link" failedMessage="Copy failed" />)
    const group = screen.getByRole('group', { name: 'Invite link' })
    expect(group).toHaveTextContent(link)
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('FR-GYM-03 a copy that works calls onCopied and shows no failure', async () => {
    secure(true)
    const onCopied = vi.fn()
    render(<CopyField value={link} copyLabel="Copy link" failedMessage="Copy failed" onCopied={onCopied} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(link)
    expect(onCopied).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('FR-GYM-03 a failed copy shows the given message as an alert, and selects the value to copy by hand', async () => {
    secure(false)
    execCommand.mockReturnValue(false)
    const onCopied = vi.fn()
    const message = "Couldn't copy. The link is selected: copy it from there."
    render(<CopyField value={link} copyLabel="Copy link" failedMessage={message} onCopied={onCopied} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onCopied).not.toHaveBeenCalled()
    expect(window.getSelection()?.toString()).toBe(link)

    // A copy that then works clears the failure.
    execCommand.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onCopied).toHaveBeenCalledOnce()
  })
})
