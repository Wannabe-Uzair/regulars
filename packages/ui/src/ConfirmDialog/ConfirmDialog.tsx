import { useEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import { Button } from '../Button/Button.tsx'
import { Dialog, DialogClose } from '../Dialog/Dialog.tsx'
import { FormError } from '../FormError/FormError.tsx'

/** `danger` for a destructive confirm (delete, archive, deactivate), `primary` for the rest. */
export type ConfirmTone = 'danger' | 'primary'

export type ConfirmDialogProps = {
  /** The question, e.g. "Archive this member?". The dialog's heading and accessible name. */
  title: string
  /** What happens, under the title. The dialog's accessible description. */
  body?: ReactNode
  /** The confirm button's words, e.g. "Archive member". */
  confirmLabel: string
  cancelLabel: string
  /**
   * Runs on confirm. Uncontrolled (no `open`), the dialog closes after it returns, or once the promise it returns
   * resolves (or, if the caller is still `busy` then, once `busy` drops); it stays open if that promise rejects, and
   * shows the `error` the caller passes. While the promise is pending the confirm shows loading and a second click
   * does nothing. An uncontrolled caller must return its promise for this to work: a call that starts its work and
   * returns nothing closes the dialog at once, so a failure's error is never seen. The dialog never closes while `busy` is true. Controlled, the parent closes it.
   */
  onConfirm: () => void | Promise<void>
  /** Defaults to `primary`. */
  tone?: ConfirmTone
  /** Working: the confirm shows its spinner, and the dialog stays open until the work is done. (A promise `onConfirm` returns counts as working, too.) */
  busy?: boolean
  /** Why the last confirm failed. Shown as an alert above the buttons, and read again after each try. */
  error?: string
  /** The element that opens it. Focus returns to it on close. */
  trigger?: ReactElement
  /** Where focus goes on close when what had it before is gone (see Dialog). */
  returnFocusTo?: RefObject<HTMLElement | null>
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Asks before an action, as an Apple alert: the title and what happens, no corner X (Cancel, Escape and the scrim close
 * it), Cancel the quiet button, and the confirm filled, red for a destructive action (`danger`) and the tint otherwise.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = 'primary',
  busy = false,
  error,
  trigger,
  returnFocusTo,
  open,
  defaultOpen = false,
  onOpenChange,
}: ConfirmDialogProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen)
  const [tries, setTries] = useState(0)
  // A returned promise that has not settled: the ref refuses a second click at once, the state shows it.
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  // What `busy` is as of the last commit: a caller that sets it in onConfirm is read after React has rendered that.
  const busyRef = useRef(busy)
  // A confirm whose promise resolved while `busy` was still true (a mutation's `isPending` drops a render after its
  // `mutateAsync` resolves): the dialog closes once `busy` drops.
  const closeWhenIdle = useRef(false)
  useEffect(() => {
    busyRef.current = busy
    if (busy || !closeWhenIdle.current) return
    closeWhenIdle.current = false
    close()
  })
  const shown = open ?? ownOpen
  const working = busy || pending

  function close() {
    setOwnOpen(false)
    onOpenChange?.(false)
  }
  // Uncontrolled, once the confirm is done: close unless the caller has gone busy meanwhile.
  const closeUnlessBusy = () => queueMicrotask(() => busyRef.current || close())
  // Uncontrolled, once the confirm's promise has resolved: close now, or once the caller's `busy` drops.
  const closeWhenDone = () =>
    queueMicrotask(() => {
      if (busyRef.current) closeWhenIdle.current = true
      else close()
    })

  function changeOpen(next: boolean) {
    // While the confirm is working, Escape, the backdrop and the buttons leave it open, so its result lands here.
    if (!next && working) return
    setOwnOpen(next)
    onOpenChange?.(next)
  }

  function confirm() {
    if (pendingRef.current) return
    setTries((n) => n + 1)
    const done = onConfirm()
    if (done instanceof Promise) {
      pendingRef.current = true
      setPending(true)
      const settle = (ok: boolean) => {
        pendingRef.current = false
        setPending(false)
        if (ok && open === undefined) closeWhenDone()
      }
      done.then(
        () => settle(true),
        () => settle(false),
      )
    } else if (open === undefined) closeUnlessBusy()
  }

  return (
    <Dialog
      title={title}
      description={body}
      trigger={trigger}
      returnFocusTo={returnFocusTo}
      presentation="auto"
      open={shown}
      onOpenChange={changeOpen}
      footer={
        <>
          <DialogClose>
            <Button variant="quiet" disabled={working}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button variant={tone === 'danger' ? 'destructive' : 'primary'} loading={working} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error === undefined ? undefined : <FormError message={error} submittedAt={tries} />}
    </Dialog>
  )
}
