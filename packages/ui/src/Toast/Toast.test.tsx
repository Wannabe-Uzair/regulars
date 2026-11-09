import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useToast, type ToastApi } from './context.ts'
import { ToastProvider } from './Toast.tsx'

const grabbed: { api?: ToastApi } = {}

function Grab() {
  const api = useToast()
  useEffect(() => {
    grabbed.api = api
  }, [api])
  return null
}

// fireEvent rather than user-event here: Testing Library's async wrapper waits on a real setTimeout, which fake timers
// hold forever. React builds onPointerEnter/Leave from pointerover/pointerout, so those are what get fired.
function setup() {
  render(
    <ToastProvider dismissLabel="Dismiss">
      <Grab />
      <button type="button">Elsewhere</button>
    </ToastProvider>,
  )
}

const hover = (element: Element) => fireEvent.pointerOver(element)
const unhover = (element: Element) => fireEvent.pointerOut(element, { relatedTarget: document.body })

const show = (message: string, extra: Partial<Parameters<ToastApi['show']>[0]> = {}) =>
  act(() => grabbed.api?.show({ message, ...extra }))
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const toasts = () => screen.queryAllByRole('listitem')
const stack = () => screen.getByRole('list')
const toastOf = (message: string) => screen.getByText(message).closest('li')!
const elsewhere = () => screen.getByRole('button', { name: 'Elsewhere' })
const press = (key: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Toasts', () => {
  test('appear in a polite live region that is there before the first one', () => {
    setup()
    expect(stack()).toHaveAttribute('aria-live', 'polite')
    expect(stack()).toBeEmptyDOMElement()

    show('Nudge sent to Dana')
    expect(within(stack()).getByText('Nudge sent to Dana')).toBeVisible()
  })

  test('each lasts 4 s', () => {
    setup()
    show('Saved')
    advance(3999)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  test('the clock stops while the pointer is over the stack, and keeps what was left', () => {
    setup()
    show('Saved')
    advance(3000)
    hover(screen.getByText('Saved'))
    advance(10_000)
    expect(screen.getByText('Saved')).toBeInTheDocument()

    unhover(screen.getByText('Saved'))
    advance(999)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  test('the clock stops while focus is in the stack', () => {
    setup()
    show('Saved')
    advance(1000)
    act(() => screen.getByRole('button', { name: 'Dismiss' }).focus())
    advance(10_000)
    expect(screen.getByText('Saved')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    advance(2999)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  test('at most 3 show; a fourth pushes the oldest out', () => {
    setup()
    show('One')
    show('Two')
    show('Three')
    expect(toasts()).toHaveLength(3)

    show('Four')
    expect(toasts()).toHaveLength(3)
    expect(screen.queryByText('One')).not.toBeInTheDocument()
    expect(toasts().map((t) => t.textContent)).toEqual(['Two', 'Three', 'Four'])
  })

  test('the dismiss button, named from props, removes it, and the others keep their clocks', () => {
    setup()
    show('One')
    show('Two')
    const dismiss = within(toasts()[0]!).getByRole('button', { name: 'Dismiss' })
    hover(dismiss)
    act(() => dismiss.focus())
    fireEvent.click(dismiss)
    expect(screen.queryByText('One')).not.toBeInTheDocument()
    expect(toastOf('Two')).toHaveFocus()

    // Focus leaves the stack and the pointer leaves it: nothing holds the clock now.
    act(() => elsewhere().focus())
    unhover(screen.getByText('Two'))
    advance(4000)
    expect(screen.queryByText('Two')).not.toBeInTheDocument()
  })

  test('an action runs and then the toast goes; the attention tone is marked and read as an alert', () => {
    const onSelect = vi.fn()
    setup()
    show('Nudge failed to send', { tone: 'attention', action: { label: 'Retry', onSelect } })
    expect(toasts()[0]).toHaveAttribute('data-tone', 'attention')
    expect(screen.getByRole('alert')).toHaveTextContent('Nudge failed to send')

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.queryByText('Nudge failed to send')).not.toBeInTheDocument()
  })

  test('a neutral toast is only in the polite region, not an alert', () => {
    setup()
    show('Saved')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(stack()).toHaveAttribute('aria-live', 'polite')
  })

  test('a toast with an action has no clock: it stays until dismissed or acted on', () => {
    setup()
    show('Member removed', { action: { label: 'Undo', onSelect: () => {} } })
    advance(60_000)
    expect(screen.getByText('Member removed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Member removed')).not.toBeInTheDocument()
  })

  test('F8 moves focus to the newest toast, and Escape sends it back to where it was', () => {
    setup()
    show('One')
    show('Two', { action: { label: 'Undo', onSelect: () => {} } })
    act(() => elsewhere().focus())
    press('F8')
    expect(toastOf('Two')).toHaveFocus()

    press('Escape')
    expect(elsewhere()).toHaveFocus()
    advance(4000)
    expect(screen.queryByText('One')).not.toBeInTheDocument()
  })

  test('F8 with no toasts leaves focus where it is', () => {
    setup()
    act(() => elsewhere().focus())
    press('F8')
    expect(elsewhere()).toHaveFocus()
  })

  test('when the focused toast goes and none is left, focus returns to where it was before the stack', () => {
    setup()
    show('Saved')
    act(() => elsewhere().focus())
    press('F8')
    fireEvent.click(within(toastOf('Saved')).getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(elsewhere()).toHaveFocus()
  })

  test('acting on the focused toast moves focus to the next toast', () => {
    setup()
    show('One', { action: { label: 'Undo', onSelect: () => {} } })
    show('Two')
    act(() => elsewhere().focus())
    act(() => within(toastOf('One')).getByRole('button', { name: 'Undo' }).focus())
    fireEvent.click(within(toastOf('One')).getByRole('button', { name: 'Undo' }))
    expect(toastOf('Two')).toHaveFocus()
  })

  test('a focused toast pushed out by the cap hands focus on, and the clocks still run once focus leaves', () => {
    setup()
    show('One')
    show('Two')
    show('Three')
    act(() => elsewhere().focus())
    act(() => within(toastOf('One')).getByRole('button', { name: 'Dismiss' }).focus())
    show('Four')
    expect(screen.queryByText('One')).not.toBeInTheDocument()
    expect(toastOf('Two')).toHaveFocus()

    press('Escape')
    expect(elsewhere()).toHaveFocus()
    advance(4000)
    expect(toasts()).toHaveLength(0)
  })

  test('with an exit animation it stays, inert, until the animation ends; without one it goes at once', () => {
    setup()
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ animationName: 'toast-out' } as CSSStyleDeclaration)
    show('Saved')
    advance(4000)
    const leaving = toasts()[0]!
    expect(leaving).toHaveAttribute('data-state', 'closed')
    expect(leaving).toHaveAttribute('inert')

    fireEvent.animationEnd(leaving)
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  describe('making room (pick G2)', () => {
    // jsdom lays nothing out, so each toast stands as the bottom-anchored stack would put it: 70 px above the next one.
    const bottom = 500
    const slot = 70
    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        let below = 0
        for (let next = this.nextElementSibling; next; next = next.nextElementSibling) below += 1
        return { top: bottom - below * slot } as DOMRect
      })
    })

    /** Records each `translate` a toast is started from, as "words: value", in the order they are set. */
    function slides() {
      const set = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty')
      const words = new Map<CSSStyleDeclaration, string>()
      for (const toast of toasts()) words.set(toast.style, toast.querySelector('p')?.textContent ?? '')
      return () =>
        set.mock.calls.flatMap(([property, value], i) => {
          if (property !== 'translate') return []
          const style = set.mock.contexts[i] as CSSStyleDeclaration
          return [`${words.get(style) ?? '?'}: ${value}`]
        })
    }

    test('when one arrives, the others start where they stood and slide up; the newcomer only rises', () => {
      setup()
      show('One')
      show('Two')
      const started = slides()
      show('Three')
      // One and Two each move up a slot: they start a slot lower, and the CSS transition carries them home.
      expect(started()).toEqual([`One: 0 ${slot}px`, `Two: 0 ${slot}px`])
      // The start is handed back at once, so nothing is left translated or without its transition.
      for (const toast of toasts()) {
        expect(toast.style.getPropertyValue('translate')).toBe('')
        expect(toast.style.getPropertyValue('transition')).toBe('')
      }
    })

    test('a dismissed toast goes first; then the ones above it slide down into its gap', () => {
      setup()
      show('One')
      show('Two')
      show('Three')
      const started = slides()
      fireEvent.click(within(toastOf('Two')).getByRole('button', { name: 'Dismiss' }))
      // With no exit animation (as here) it goes at once. One drops a slot; Three, below the gap, stays put.
      expect(screen.queryByText('Two')).not.toBeInTheDocument()
      expect(started()).toEqual([`One: 0 -${slot}px`])
    })

    test('a toast fading out keeps its gap until it has gone', () => {
      setup()
      show('One')
      show('Two')
      const dismiss = within(toastOf('Two')).getByRole('button', { name: 'Dismiss' })
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ animationName: 'toast-out' } as CSSStyleDeclaration)
      const started = slides()
      fireEvent.click(dismiss)
      expect(toastOf('Two')).toHaveAttribute('data-state', 'closed')
      expect(started()).toEqual([])
      // Faded: now it goes, and One drops into its gap.
      fireEvent.animationEnd(toastOf('Two'))
      expect(screen.queryByText('Two')).not.toBeInTheDocument()
      expect(started()).toEqual([`One: 0 -${slot}px`])
    })
  })

  test('useToast outside a provider says what is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Grab />)).toThrow(/ToastProvider/)
  })
})
