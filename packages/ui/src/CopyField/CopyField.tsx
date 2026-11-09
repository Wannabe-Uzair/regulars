import clsx from 'clsx'
import { useRef, useState } from 'react'
import { Button } from '../Button/Button.tsx'
import { FormError } from '../FormError/FormError.tsx'
import { copyText } from './copy-text.ts'
import styles from './CopyField.module.css'

export type CopyFieldProps = {
  /** What to copy, shown in full: a link, say. */
  value: string
  /** Names the field and its button as a group, e.g. "Invite link". */
  label?: string
  /** The button's words, e.g. "Copy link". */
  copyLabel: string
  /** Shown as an alert when the copy fails, e.g. asking to copy the selected link by hand. */
  failedMessage: string
  /** After a copy that worked, e.g. to show "Invite link copied". */
  onCopied?: () => void
  className?: string
}

/**
 * A value to copy, in a box that selects all of it on a click, beside a Copy button. If the copy fails, the value is
 * selected for copying by hand and the failure message shows.
 */
export function CopyField({ value, label, copyLabel, failedMessage, onCopied, className }: CopyFieldProps) {
  const box = useRef<HTMLSpanElement>(null)
  const [failures, setFailures] = useState(0)
  const [failed, setFailed] = useState(false)

  async function copy() {
    if (await copyText(value)) {
      setFailed(false)
      onCopied?.()
      return
    }
    setFailed(true)
    setFailures((n) => n + 1)
    if (box.current) window.getSelection()?.selectAllChildren(box.current)
  }

  return (
    <div
      className={clsx(styles.field, className)}
      {...(label === undefined ? {} : { role: 'group', 'aria-label': label })}
    >
      <div className={styles.row}>
        <span ref={box} className={styles.value}>
          {value}
        </span>
        <Button className={styles.copy} onClick={copy}>
          {copyLabel}
        </Button>
      </div>
      <FormError message={failed ? failedMessage : undefined} submittedAt={failures} />
    </div>
  )
}
