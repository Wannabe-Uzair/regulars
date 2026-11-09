import * as RadixDialog from '@radix-ui/react-dialog'
import { useRef, type ReactElement, type ReactNode, type RefObject } from 'react'
import { Button } from '../Button/Button.tsx'
import { IconButton } from '../IconButton/IconButton.tsx'
import { XIcon } from '../icons/XIcon.tsx'
import styles from './Dialog.module.css'
import { useMediaQuery } from './use-media-query.ts'

/** `auto` is a centred dialog on wide screens and a bottom sheet on phones; the others force one. */
export type DialogPresentation = 'auto' | 'dialog' | 'sheet'

/**
 * Where `auto` turns into a sheet: 640 px (40 rem) wide and below. Phones in portrait and landscape get the sheet;
 * tablets and laptops get the centred dialog.
 */
export const sheetMediaQuery = '(max-width: 40rem)'

/**
 * How it is dismissed, one or none: the corner X named `closeLabel` ("Close"), or, as in an iOS sheet (the Nudge
 * sheet, flow-3A), a plain `cancelLabel` button ("Cancel") at the header's leading edge, the title centred, no corner X
 * and no grabber. With neither, the header is the title alone, as in an alert (ConfirmDialog): its footer carries the
 * Cancel, and Escape and the scrim still close it.
 */
export type DialogDismiss =
  | { closeLabel: string; cancelLabel?: never }
  | { cancelLabel: string; closeLabel?: never }
  | { closeLabel?: never; cancelLabel?: never }

export type DialogProps = DialogDismiss & {
  /** The heading, and the dialog's accessible name. */
  title: string
  /** A line under the title. When given, it is the dialog's accessible description. */
  description?: ReactNode
  /** Greys out the corner X or the Cancel, e.g. while a confirm is working and its Cancel is disabled too. */
  closeDisabled?: boolean
  /** The body. It scrolls when the dialog is taller than the screen. */
  children?: ReactNode
  /** Actions along the bottom, e.g. a cancel `<DialogClose>` and a primary button. */
  footer?: ReactNode
  /** The element that opens it, usually a Button. Focus returns to it on close. */
  trigger?: ReactElement
  /**
   * Where focus goes on close when what had it before opening is gone, e.g. a row menu's trigger when the dialog was
   * opened from one of its items, which unmounted with the menu.
   */
  returnFocusTo?: RefObject<HTMLElement | null>
  /** Defaults to `auto`. */
  presentation?: DialogPresentation
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * A modal dialog on Radix: focus moves in and stays in, Escape and the backdrop close it, and focus goes back to the
 * trigger. Opened from state, focus goes back to whatever had it before; if that is gone, to `returnFocusTo`; failing
 * that, to the control that opened what held it, found by its aria-controls (a menu's trigger, say).
 */
export function Dialog({
  title,
  description,
  closeLabel,
  cancelLabel,
  closeDisabled = false,
  children,
  footer,
  trigger,
  returnFocusTo,
  presentation = 'auto',
  open,
  defaultOpen,
  onOpenChange,
}: DialogProps) {
  const narrow = useMediaQuery(sheetMediaQuery)
  const shown = presentation === 'auto' ? (narrow ? 'sheet' : 'dialog') : presentation
  const opener = useRef<HTMLElement | null>(null)
  const controller = useRef<HTMLElement | null>(null)

  function rememberOpener() {
    const active = document.activeElement
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null
    controller.current = opener.current && controllerOf(opener.current)
  }

  function returnFocus(event: Event) {
    // Radix returns focus to its trigger; without one it would leave focus on <body>.
    if (trigger) return
    const target = [opener.current, returnFocusTo?.current, controller.current].find((el) => el?.isConnected)
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  return (
    <RadixDialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} data-presentation={shown} />
        <RadixDialog.Content
          className={styles.content}
          data-presentation={shown}
          onOpenAutoFocus={rememberOpener}
          onCloseAutoFocus={returnFocus}
          // Without a description there is nothing to point at, and Radix would warn.
          {...(description == null ? { 'aria-describedby': undefined } : {})}
        >
          {cancelLabel === undefined ? (
            <div className={styles.header}>
              <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
              {closeLabel !== undefined && (
                <RadixDialog.Close asChild>
                  <IconButton
                    label={closeLabel}
                    size={shown === 'sheet' ? 'md' : 'sm'}
                    disabled={closeDisabled}
                    className={styles.close}
                  >
                    <XIcon />
                  </IconButton>
                </RadixDialog.Close>
              )}
            </div>
          ) : (
            // Cancel, the centred title, and an empty end cell as wide as Cancel's, so the title stays centred.
            <div className={styles.header} data-dismiss="cancel">
              <RadixDialog.Close asChild>
                <Button variant="plain" disabled={closeDisabled} className={styles.cancel}>
                  {cancelLabel}
                </Button>
              </RadixDialog.Close>
              <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
              <span aria-hidden="true" />
            </div>
          )}
          {description != null && (
            <RadixDialog.Description className={styles.description}>{description}</RadixDialog.Description>
          )}
          {children != null && <div className={styles.body}>{children}</div>}
          {footer != null && <div className={styles.footer}>{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

/** The element whose aria-controls names `element` or a box around it, e.g. the trigger of the menu it sits in. */
function controllerOf(element: HTMLElement): HTMLElement | null {
  const controls = [...document.querySelectorAll<HTMLElement>('[aria-controls]')]
  for (let box: HTMLElement | null = element; box; box = box.parentElement) {
    const { id } = box
    const found = id && controls.find((el) => el.getAttribute('aria-controls')?.split(/\s+/).includes(id))
    if (found) return found
  }
  return null
}

export type DialogCloseProps = { children: ReactElement }

/** Makes its child, usually a Button, close the dialog it sits in. For cancel buttons in the footer. */
export function DialogClose({ children }: DialogCloseProps) {
  return <RadixDialog.Close asChild>{children}</RadixDialog.Close>
}
