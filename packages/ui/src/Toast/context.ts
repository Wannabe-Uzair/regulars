import { createContext, use } from 'react'

/**
 * How long a toast without an action stays, in milliseconds, not counting time paused under the pointer or focus. One
 * with an action stays until it is dismissed or acted on, so a keyboard user has time to reach it.
 */
export const toastDuration = 4000

/** How many toasts show at once. A new one past this pushes the oldest out. */
export const maxToasts = 3

/** `attention` marks it with the attention colour and reads it at once as an alert, e.g. "Nudge failed to send". */
export type ToastTone = 'neutral' | 'attention'

export type ToastAction = {
  /** The button's text, e.g. "Undo". */
  label: string
  /** Runs when the button is pressed. The toast then goes; until then it stays, with no clock. */
  onSelect: () => void
}

export type ToastOptions = {
  message: string
  /** Defaults to `neutral`. */
  tone?: ToastTone
  action?: ToastAction
}

export type ToastApi = {
  /** Shows a toast for 4 s, or, with an action, until it is dismissed or acted on. */
  show: (toast: ToastOptions) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Shows toasts. Needs a ToastProvider above it. */
export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (!api) throw new Error('useToast() needs a <ToastProvider> above it.')
  return api
}
