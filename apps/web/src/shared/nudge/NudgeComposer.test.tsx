import { focusManager, QueryClientProvider } from '@tanstack/react-query'
import { t } from '@tenure/copy'
import { smsUrl, whatsappUrl } from '@tenure/domain'
import { buttonClass, type ButtonSize, sheetMediaQuery, ToastProvider } from '@tenure/ui'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createQueryClient } from '../../app/query-client.ts'
import { json, me } from '../../test/fakes.ts'
import { NudgeButton, type NudgeTarget } from './NudgeButton.tsx'

const sam: NudgeTarget = { id: 12, firstName: 'Sam', phone: '+13125550142', daysSinceLastVisit: 9 }
const noPhone: NudgeTarget = { ...sam, phone: null }

const templates = [
  { id: 3, name: 'We missed you', body: 'Hey {first}, we missed you.' },
  { id: 4, name: 'One visit', body: "It's been {days} days, {first}." },
]
const renderedFor = (templateId: unknown) => `Message ${String(templateId)} for Sam`

type Call = { method: string; path: string; body: unknown }
let calls: Call[]
/** Answers POST /api/nudges; a test swaps it for a failure, or holds it back. */
let recordAnswer: () => Response | Promise<Response>
/** Holds back a template's render until the test lets it go. */
let renderGate: Map<unknown, Promise<void>>

function stubApi() {
  calls = []
  renderGate = new Map()
  recordAnswer = () => json(201, recorded('whatsapp'))
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const path = String(input)
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ method, path, body })
      if (path === '/api/auth/me') return json(200, me('coach'))
      if (path === '/api/templates') return json(200, templates)
      if (path === '/api/templates/render') {
        const { templateId } = body as { templateId: unknown }
        await renderGate.get(templateId)
        return json(200, { body: renderedFor(templateId) })
      }
      if (path === '/api/nudges') return recordAnswer()
      return json(404, { error: { code: 'notFound', message: 'Not found.' } })
    }),
  )
}

const recorded = (channel: string) => ({
  nudge: { id: 1, memberId: 12, templateId: 3, at: '2026-11-07T15:00:00.000Z', body: 'x', channel },
  smsUrl: null,
  whatsappUrl: null,
})

const records = () => calls.filter((c) => c.method === 'POST' && c.path === '/api/nudges').map((c) => c.body)

/** Holds POST /api/nudges until the returned function lets it answer. */
function holdRecord(channel: string) {
  let release = () => {}
  const gate = new Promise<void>((resolve) => (release = resolve))
  recordAnswer = async () => {
    await gate
    return json(201, recorded(channel))
  }
  return () => release()
}

/** jsdom has no matchMedia: phone width is the sheet's query matching. Without it the computer variant shows. */
function width(phone: boolean) {
  const matchMedia = (query: string) =>
    ({
      media: query,
      matches: phone && query === sheetMediaQuery,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia })
}

/**
 * Records whether each click on a link reached the document with its default intact (the browser would follow it),
 * then stops it there, as jsdom can't navigate.
 */
function watchLinks() {
  const followed: { href: string; prevented: boolean }[] = []
  const listener = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null
    if (!link) return
    followed.push({ href: link.getAttribute('href') ?? '', prevented: event.defaultPrevented })
    event.preventDefault()
  }
  document.addEventListener('click', listener)
  cleanups.push(() => document.removeEventListener('click', listener))
  return followed
}

let cleanups: (() => void)[] = []

function renderButton(member: NudgeTarget = sam, size?: ButtonSize) {
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <ToastProvider dismissLabel={t('toast.dismiss')}>
        <NudgeButton member={member} size={size} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return client
}

async function openComposer(member: NudgeTarget = sam) {
  const user = userEvent.setup()
  renderButton(member)
  await user.click(screen.getByRole('button', { name: t('a11y.nudgeMember', { name: member.firstName }) }))
  const dialog = await screen.findByRole('dialog', { name: t('nudge.title', { first: member.firstName }) })
  const message = within(dialog).getByLabelText(t('nudge.text'))
  // user-event puts its own clipboard on navigator; the copy tests watch this one.
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  if (member.phone !== null) await waitFor(() => expect(message).toHaveValue(renderedFor(3)))
  return { user, dialog, message }
}

/** The composer's channels, by name. Text Message is null where it doesn't show (a computer, or no phone). */
function channels(dialog: HTMLElement) {
  return {
    text: within(dialog).queryByRole('link', { name: t('nudge.contact.text') }),
    whatsapp: within(dialog).queryByRole('link', { name: t('nudge.contact.whatsapp') }),
    copy: within(dialog).queryByRole('button', { name: t('nudge.copy') }),
  }
}

let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>
let execCommand: ReturnType<typeof vi.fn<(command: string) => boolean>>

beforeEach(() => {
  stubApi()
  width(false)
  writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  execCommand = vi.fn<(command: string) => boolean>(() => true)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
  // jsdom has no scrollIntoView: a no-op, so a record's scroll never throws (the scroll test records it itself).
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value() {} })
})

afterEach(() => {
  for (const cleanup of cleanups) cleanup()
  cleanups = []
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  Reflect.deleteProperty(window, 'matchMedia')
  focusManager.setFocused(undefined)
})

describe('NudgeButton', () => {
  test('FR-NUDGE-01 the Nudge button is named for the member and wears the tinted look', () => {
    renderButton()
    const button = screen.getByRole('button', { name: t('a11y.nudgeMember', { name: 'Sam' }) })
    expect(button).toHaveTextContent(t('member.nudge'))
    expect(button).toHaveClass(...buttonClass({ variant: 'tinted' }).split(' '))
  })

  test('NFR-USE-03 F37 a row asks for the small Nudge; the member page keeps md', () => {
    renderButton(sam, 'sm')
    const button = screen.getByRole('button', { name: t('a11y.nudgeMember', { name: 'Sam' }) })
    expect(button).toHaveClass(...buttonClass({ variant: 'tinted', size: 'sm' }).split(' '))
  })

  test('FR-NUDGE-01 Cancel at the leading edge closes the composer, with no corner close', async () => {
    const { user, dialog } = await openComposer()
    const cancel = within(dialog).getByRole('button', { name: t('common.cancel') })
    // Leading: the first control in the sheet, before the title and the template.
    expect(within(dialog).getAllByRole('button')[0]).toBe(cancel)
    expect(cancel.compareDocumentPosition(within(dialog).getByRole('heading')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: t('common.close') })).toBeNull()

    await user.click(cancel)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(records()).toEqual([])
    expect(screen.getByRole('button', { name: t('a11y.nudgeMember', { name: 'Sam' }) })).toHaveFocus()
  })

  test('FR-TODAY-02 once a nudge is recorded, Nudge reads Nudged with its check and still opens the composer', async () => {
    watchLinks()
    const { user, dialog } = await openComposer()
    await user.click(channels(dialog).whatsapp!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const done = screen.getByRole('button', { name: t('a11y.nudgedMember', { name: 'Sam' }) })
    expect(done).toHaveTextContent(t('nudge.done'))
    expect(done.querySelector('svg')).not.toBeNull()
    expect(done).toHaveClass(...buttonClass({ variant: 'quiet' }).split(' '))
    expect(screen.queryByRole('button', { name: t('a11y.nudgeMember', { name: 'Sam' }) })).toBeNull()

    await user.click(done)
    expect(await screen.findByRole('dialog', { name: t('nudge.title', { first: 'Sam' }) })).toBeInTheDocument()
  })
})

describe('the composer', () => {
  test('FR-NUDGE-01 opening loads the templates, chooses the first and fills it in for Sam', async () => {
    const { dialog } = await openComposer()
    expect(within(dialog).getByLabelText(t('nudge.template'))).toHaveValue('3')
    expect(calls.find((c) => c.path === '/api/templates/render')?.body).toEqual({ memberId: 12, templateId: 3 })
  })

  test('FR-NUDGE-01 another template fills its own message; Write My Own empties it, and the channels wait for words', async () => {
    const followed = watchLinks()
    const { user, dialog, message } = await openComposer()
    const select = within(dialog).getByLabelText(t('nudge.template'))
    await user.selectOptions(select, '4')
    await waitFor(() => expect(message).toHaveValue(renderedFor(4)))

    await user.selectOptions(select, t('nudge.templateNone'))
    expect(message).toHaveValue('')
    const { whatsapp, copy } = channels(dialog)
    expect(whatsapp).toHaveAttribute('aria-disabled', 'true')
    expect(copy).toBeDisabled()
    await user.click(whatsapp!)
    expect(followed).toEqual([expect.objectContaining({ prevented: true })])
    expect(records()).toEqual([])

    await user.type(message, 'See you Thursday?')
    expect(whatsapp).not.toHaveAttribute('aria-disabled')
    expect(copy).toBeEnabled()
  })

  test('FR-NUDGE-01 the newest template choice wins when renders answer out of order', async () => {
    let release = () => {}
    renderGate.set(4, new Promise<void>((resolve) => (release = resolve)))
    const { user, dialog, message } = await openComposer()
    const select = within(dialog).getByLabelText(t('nudge.template'))
    await user.selectOptions(select, '4')
    await user.selectOptions(select, '3')
    expect(message).toHaveValue(renderedFor(3))
    release()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(message).toHaveValue(renderedFor(3))
  })

  test("FR-NUDGE-01 a refetch never replaces the coach's words", async () => {
    const { user, message } = await openComposer()
    await user.type(message, ' Thursday?')
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await waitFor(() => expect(calls.filter((c) => c.path === '/api/templates')).toHaveLength(2))
    expect(message).toHaveValue(`${renderedFor(3)} Thursday?`)
  })
})

describe('the channels', () => {
  test('FR-NUDGE-02 on a phone, Text Message, WhatsApp and Copy Message stack under the line on how to send', async () => {
    width(true)
    const { dialog } = await openComposer()
    const help = within(dialog).getByText(t('nudge.howTo'))
    const { text, whatsapp, copy } = channels(dialog)
    const stack = [text!, whatsapp!, copy!]
    for (const [i, channel] of stack.entries()) {
      expect(help.compareDocumentPosition(channel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      if (i > 0) expect(stack[i - 1]!.compareDocumentPosition(channel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  test('FR-NUDGE-02 the channels stack as equal tinted buttons, with no menu', async () => {
    width(true)
    const { dialog } = await openComposer()
    const { text, whatsapp, copy } = channels(dialog)
    const tinted = buttonClass({ variant: 'tinted' })
    expect(text!.className).toBe(tinted)
    expect(whatsapp!.className).toBe(tinted)
    expect(copy!.className).toBe(tinted)
    // Siblings in one stack, none filled.
    expect(new Set([text!.parentElement, whatsapp!.parentElement, copy!.parentElement]).size).toBe(1)
    expect(within(dialog).queryByRole('button', { name: t('nudge.contact', { first: 'Sam' }) })).toBeNull()
    expect(dialog.querySelector('[aria-haspopup]')).toBeNull()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  test('FR-NUDGE-02 on a computer, WhatsApp and Copy Message stack under the number, with no Text Message', async () => {
    const { dialog } = await openComposer()
    expect(within(dialog).getByText(t('nudge.helpDesktop', { phone: '(312) 555-0142' }))).toBeInTheDocument()
    const { text, whatsapp, copy } = channels(dialog)
    expect(text).toBeNull()
    expect(whatsapp).toBeInTheDocument()
    expect(copy).toBeInTheDocument()
  })

  test("FR-NUDGE-03 Text Message is an sms: link with the message, and the tap records 'text' without being stopped", async () => {
    width(true)
    recordAnswer = () => json(201, recorded('text'))
    const followed = watchLinks()
    const { user, dialog } = await openComposer()
    const link = channels(dialog).text!
    const href = smsUrl(sam.phone, renderedFor(3))
    expect(link).toHaveAttribute('href', href)
    expect(link).not.toHaveAttribute('target')

    await user.click(link)
    expect(followed).toEqual([{ href, prevented: false }])
    await waitFor(() => expect(records()).toEqual([{ memberId: 12, templateId: 3, body: renderedFor(3), channel: 'text' }]))
  })

  test("FR-NUDGE-03 WhatsApp is a wa.me link in a new tab, and the tap records 'whatsapp' without being stopped", async () => {
    const followed = watchLinks()
    const { user, dialog } = await openComposer()
    const link = channels(dialog).whatsapp!
    const href = whatsappUrl(sam.phone, renderedFor(3))
    expect(link).toHaveAttribute('href', href)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    await user.click(link)
    expect(followed).toEqual([{ href, prevented: false }])
    await waitFor(() => expect(records()).toEqual([{ memberId: 12, templateId: 3, body: renderedFor(3), channel: 'whatsapp' }]))
  })

  test('FR-NUDGE-03 Tab to WhatsApp and Enter follows the link too, and records it once', async () => {
    const followed = watchLinks()
    const { user, dialog, message } = await openComposer()
    message.focus()
    await user.tab()
    expect(channels(dialog).whatsapp).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(followed).toEqual([{ href: whatsappUrl(sam.phone, renderedFor(3)), prevented: false }])
    await waitFor(() => expect(records()).toHaveLength(1))
    expect(records()[0]).toMatchObject({ channel: 'whatsapp' })
  })

  test('FR-NUDGE-03 a second tap while recording records nothing more', async () => {
    const release = holdRecord('whatsapp')
    const followed = watchLinks()
    const { user, dialog } = await openComposer()
    const { whatsapp, copy } = channels(dialog)
    await user.click(whatsapp!)
    await waitFor(() => expect(records()).toHaveLength(1))
    expect(whatsapp).toHaveAttribute('aria-disabled', 'true')

    await user.click(whatsapp!)
    await user.click(copy!)
    expect(followed.map((f) => f.prevented)).toEqual([false, true])
    expect(writeText).not.toHaveBeenCalled()
    expect(records()).toHaveLength(1)
    release()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(records()).toHaveLength(1)
  })

  test("FR-NUDGE-03 Copy Message copies the message, shows busy while it records, then records 'copy'", async () => {
    vi.stubGlobal('isSecureContext', true)
    const release = holdRecord('copy')
    const { user, dialog } = await openComposer()
    const copy = channels(dialog).copy!
    await user.click(copy)
    expect(writeText).toHaveBeenCalledWith(renderedFor(3))
    await waitFor(() => expect(records()).toEqual([{ memberId: 12, templateId: 3, body: renderedFor(3), channel: 'copy' }]))
    expect(copy).toHaveAttribute('aria-busy', 'true')
    release()
    expect(await screen.findByText(t('nudge.copied', { first: 'Sam' }))).toBeInTheDocument()
  })

  test('FR-NUDGE-02 Copy Message raises one toast that says both, not a toast for each (audit B2-03)', async () => {
    vi.stubGlobal('isSecureContext', true)
    recordAnswer = () => json(201, recorded('copy'))
    const { user, dialog } = await openComposer()
    await user.click(channels(dialog).copy!)
    const toast = await screen.findByText(t('nudge.copied', { first: 'Sam' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const stack = toast.closest('ol')!
    expect(within(stack).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText(t('toast.nudge', { first: 'Sam' }))).toBeNull()
  })

  test("FR-NUDGE-03 on the stall's plain http, Copy Message copies through execCommand and records 'copy'", async () => {
    vi.stubGlobal('isSecureContext', false)
    recordAnswer = () => json(201, recorded('copy'))
    // As a browser does, the command copies the focused element's selection: the dialog's focus trap must not have
    // pulled focus back from copyText's textarea.
    let copied = ''
    execCommand.mockImplementation(() => {
      const focused = document.activeElement
      copied = focused instanceof HTMLTextAreaElement ? focused.value.slice(focused.selectionStart, focused.selectionEnd) : ''
      return true
    })
    const { user, dialog } = await openComposer()
    await user.click(channels(dialog).copy!)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(copied).toBe(renderedFor(3))
    expect(writeText).not.toHaveBeenCalled()
    await waitFor(() => expect(records()).toEqual([expect.objectContaining({ channel: 'copy' })]))
  })

  test('FR-NUDGE-03 a copy that fails records nothing and says so, and the channels answer again', async () => {
    vi.stubGlobal('isSecureContext', false)
    execCommand.mockReturnValue(false)
    const { user, dialog } = await openComposer()
    const { whatsapp, copy } = channels(dialog)
    await user.click(copy!)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(t('nudge.copyFailed'))
    expect(records()).toEqual([])
    expect(copy).not.toHaveAttribute('aria-busy')
    expect(whatsapp).not.toHaveAttribute('aria-disabled')
  })
})

describe('recording', () => {
  test('FR-NUDGE-04 a member with no phone gets Record Nudge, recorded in person, and no channel', async () => {
    recordAnswer = () => json(201, recorded('in-person'))
    width(true)
    const { user, dialog, message } = await openComposer(noPhone)
    await waitFor(() => expect(message).toHaveValue(renderedFor(3)))
    expect(within(dialog).getByRole('heading', { name: t('nudge.noPhoneTitle') })).toBeInTheDocument()
    expect(within(dialog).getByText(t('nudge.noPhoneBody', { first: 'Sam' }))).toBeInTheDocument()
    expect(channels(dialog)).toEqual({ text: null, whatsapp: null, copy: null })
    expect(within(dialog).queryAllByRole('link')).toEqual([])

    await user.click(within(dialog).getByRole('button', { name: t('nudge.noPhoneAction') }))
    await waitFor(() => expect(records()).toEqual([{ memberId: 12, templateId: 3, body: renderedFor(3), channel: 'in-person' }]))
  })

  test('FR-NUDGE-05 after a record the toast shows, the composer closes and focus is back on the Nudge, now Nudged', async () => {
    const { user, dialog } = await openComposer()
    watchLinks()
    await user.click(channels(dialog).whatsapp!)
    expect(await screen.findByText(t('toast.nudge', { first: 'Sam' }))).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: t('a11y.nudgedMember', { name: 'Sam' }) })).toHaveFocus()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('FR-TODAY-02 once recorded, the Nudged button is scrolled just clear of the toast, only as far as needed (audit B2-03)', async () => {
    // jsdom lays nothing out and has no scrollIntoView: this records who asked to be shown, and how.
    const scrolled: { element: Element; options: unknown }[] = []
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value(this: Element, options: unknown) {
        scrolled.push({ element: this, options })
      },
    })
    const { user, dialog } = await openComposer()
    watchLinks()
    expect(scrolled).toEqual([])
    await user.click(channels(dialog).whatsapp!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const nudged = screen.getByRole('button', { name: t('a11y.nudgedMember', { name: 'Sam' }) })
    expect(scrolled).toEqual([{ element: nudged, options: { block: 'nearest', inline: 'nearest' } }])
  })

  test("FR-NUDGE-05 a record that fails shows the server's sentence and keeps the composer open with the message", async () => {
    recordAnswer = () => json(404, { error: { code: 'memberNotFound', message: 'That member is gone.' } })
    const { user, dialog, message } = await openComposer(noPhone)
    await waitFor(() => expect(message).toHaveValue(renderedFor(3)))
    const action = within(dialog).getByRole('button', { name: t('nudge.noPhoneAction') })
    await user.click(action)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That member is gone.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(message).toHaveValue(renderedFor(3))
    expect(action).not.toHaveAttribute('aria-busy')
  })
})
