import clsx from 'clsx'
import type { ChangeEvent } from 'react'
import { buttonClass, type ButtonClassOptions } from '../Button/button-class.ts'
import styles from './FileButton.module.css'

export type FileButtonProps = ButtonClassOptions & {
  /** The button's words, e.g. "Choose CSV file". Also the file input's accessible name. */
  label: string
  /** The file types the picker offers, e.g. ".csv,text/csv". */
  accept?: string
  /** The picked file. Picking the same file again calls it again. */
  onFile: (file: File) => void
  /** The picked file's name, shown beside the button. */
  fileName?: string
  className?: string
}

/**
 * A file picker that looks like a button: a hidden file input inside a label in the button's look. Keyboard focus
 * lands on the input and shows its ring on the button.
 */
export function FileButton({ label, accept, onFile, fileName, variant, size, className }: FileButtonProps) {
  function pick(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    // Cleared, so choosing the same file again (after fixing it, say) is a change too.
    input.value = ''
    if (file) onFile(file)
  }

  return (
    <span className={clsx(styles.pick, className)}>
      <label className={clsx(buttonClass({ variant, size }), styles.button)}>
        <input className={styles.input} type="file" accept={accept} onChange={pick} />
        {label}
      </label>
      {fileName !== undefined && fileName !== '' && <span className={styles.name}>{fileName}</span>}
    </span>
  )
}
