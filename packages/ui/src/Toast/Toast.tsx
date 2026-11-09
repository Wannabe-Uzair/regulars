import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../Button/Button.tsx'
import { IconButton } from '../IconButton/IconButton.tsx'
import { XIcon } from '../icons/XIcon.tsx'
import { maxToasts, ToastContext, toastDuration, type ToastOptions } from './context.ts'
import { notePlaces, slideFrom, type Places } from './slide.ts'
import styles from './Toast.module.css'

type Entry = ToastOptions & { id: number; leaving: boolean }

/** The key that moves focus to the newest toast, as in Radix. */
const toastHotkey = 'F8'

export type ToastProviderProps = {
  /** The accessible name of each toast's dismiss button, e.g. "Dismiss". */
  dismissLabel: string
  children: ReactNode
}

/**
 * Owns the toasts for the app and gives `useToast()` to everything inside. Toasts stack at the bottom of the screen in
 * a polite live region, newest at the bottom; while a sheet is open they move to the top edge, newest on top, clear of
 * its actions. When one arrives or goes, the others slide to their new places, and a dismissed toast fades before its
 * gap closes (pick G2). An `attention` toast is also an alert, so it is read at once. While the pointer is over the stack or
 * focus is in it, every toast's clock stops, so nothing moves under the person reading it. A toast with an action has
 * no clock: it stays until it is dismissed or acted on.
 *
 * Keyboard: F8 moves focus to the newest toast, and Tab then reaches its buttons. Escape inside the stack sends focus
 * back to where it was before it entered. When the toast holding focus goes (dismissed, acted on, or pushed out by a
 * newer one past the cap), focus moves to the next toast, or back to where it was when none is left.
 */
export function ToastProvider({ dismissLabel, children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Entry[]>([])
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const nextId = useRef(0)
  const stackRef = useRef<HTMLOListElement>(null)
  // Where focus was before it entered the stack, to go back to.
  const returnTo = useRef<HTMLElement | null>(null)
  // Where each toast stood before the stack's last change, so the ones making room can slide from there.
  const places = useRef<Places>(new Map())

  const show = useCallback((toast: ToastOptions) => {
    notePlaces(stackRef.current, places.current)
    nextId.current += 1
    const added: Entry = { ...toast, id: nextId.current, leaving: false }
    setToasts((current) => {
      // Past the cap, the oldest staying toasts start leaving.
      let staying = current.filter((t) => !t.leaving).length + 1
      const kept = current.map((t) => {
        if (t.leaving || staying <= maxToasts) return t
        staying -= 1
        return { ...t, leaving: true }
      })
      return [...kept, added]
    })
  }, [])

  const leave = useCallback((id: number) => {
    setToasts((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
  }, [])

  // A leaving toast has faded by now; its gap closes as the others slide into it.
  const remove = useCallback((id: number) => {
    notePlaces(stackRef.current, places.current)
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  // After a change lands, the toasts that moved slide from where they stood.
  useLayoutEffect(() => {
    slideFrom(stackRef.current, places.current)
  }, [toasts])

  const toastElement = (id: number) => stackRef.current?.querySelector<HTMLElement>(`[data-toast-id="${id}"]`)

  // Focus goes back to where it was, or nowhere. Either way it leaves the stack, and onBlur restarts the clocks.
  function leaveStack() {
    const target = returnTo.current
    returnTo.current = null
    if (target?.isConnected) target.focus()
    else if (stackRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
  }

  // The toast holding focus has started to leave, by any path: focus goes to the next one, or out of the stack.
  useLayoutEffect(() => {
    const index = toasts.findIndex((t) => t.leaving && toastElement(t.id)?.contains(document.activeElement))
    if (index === -1) return
    const next = toasts.slice(index + 1).find((t) => !t.leaving) ?? toasts.slice(0, index).findLast((t) => !t.leaving)
    const element = next && toastElement(next.id)
    if (element) element.focus()
    else leaveStack()
  })

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== toastHotkey || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const newest = stackRef.current?.querySelectorAll<HTMLElement>('[data-state="open"]')
      const target = newest?.[newest.length - 1]
      if (!target) return
      event.preventDefault()
      const from = document.activeElement
      const outside = from instanceof HTMLElement && from !== document.body && !stackRef.current?.contains(from)
      target.focus()
      if (outside) returnTo.current = from
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function onFocus(event: FocusEvent<HTMLOListElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      returnTo.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null
    }
    setFocused(true)
  }

  // Focus leaving the stack resumes the clocks; focus moving between toasts doesn't.
  function onBlur(event: FocusEvent<HTMLOListElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  function onKeyDownInStack(event: KeyboardEvent<HTMLOListElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    leaveStack()
  }

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext value={api}>
      {children}
      {createPortal(
        // Always mounted, so screen readers are already watching it when the first toast arrives.
        <ol
          ref={stackRef}
          className={styles.stack}
          aria-live="polite"
          aria-relevant="additions text"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDownInStack}
        >
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              paused={hovered || focused}
              dismissLabel={dismissLabel}
              onLeave={leave}
              onRemove={remove}
            />
          ))}
        </ol>,
        document.body,
      )}
    </ToastContext>
  )
}

type ToastItemProps = {
  toast: Entry
  paused: boolean
  dismissLabel: string
  onLeave: (id: number) => void
  onRemove: (id: number) => void
}

function ToastItem({ toast, paused, dismissLabel, onLeave, onRemove }: ToastItemProps) {
  const { id, message, tone = 'neutral', action, leaving } = toast
  const ref = useRef<HTMLLIElement>(null)
  const remaining = useRef(toastDuration)
  const timed = action === undefined

  // The clock runs only while nothing pauses it, and keeps what is left across pauses. A toast with an action has none.
  useEffect(() => {
    if (!timed || paused || leaving) return
    const started = Date.now()
    const timer = setTimeout(() => onLeave(id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [timed, paused, leaving, id, onLeave])

  // With no exit animation (reduced motion), it goes at once; otherwise when the animation ends.
  useEffect(() => {
    const element = ref.current
    if (!leaving || !element) return
    const animation = getComputedStyle(element).animationName
    if (!animation || animation === 'none') {
      onRemove(id)
      return
    }
    const done = (event: AnimationEvent) => {
      if (event.target === element) onRemove(id)
    }
    element.addEventListener('animationend', done)
    element.addEventListener('animationcancel', done)
    return () => {
      element.removeEventListener('animationend', done)
      element.removeEventListener('animationcancel', done)
    }
  }, [leaving, id, onRemove])

  return (
    <li
      ref={ref}
      className={styles.toast}
      data-toast-id={id}
      data-tone={tone}
      data-state={leaving ? 'closed' : 'open'}
      // Focusable from the hotkey, so the message is read; Tab doesn't stop on it.
      tabIndex={-1}
      inert={leaving}
    >
      <p className={styles.message} role={tone === 'attention' ? 'alert' : undefined}>
        {message}
      </p>
      {action && (
        <Button
          variant="quiet"
          className={styles.action}
          onClick={() => {
            action.onSelect()
            onLeave(id)
          }}
        >
          {action.label}
        </Button>
      )}
      <IconButton label={dismissLabel} onClick={() => onLeave(id)}>
        <XIcon />
      </IconButton>
    </li>
  )
}
