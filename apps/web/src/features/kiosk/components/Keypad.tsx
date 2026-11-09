import { t } from '@tenure/copy'
import { BackspaceIcon } from '@tenure/ui'
import { classes } from '../classes.ts'
import { KEYS, type Key, keepFocus } from '../keypad.ts'
import styles from './Keypad.module.css'

/** The 3 by 4 phone keypad of round keys: 1 to 9, then +, 0 and delete. + is off once anything is typed. */
export function Keypad({ value, onKey }: { value: string; onKey: (key: Key) => void }) {
  return (
    <div className={styles.keypad} role="group" aria-label={t('kiosk.keypad.label')}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={classes(styles.key, (key === '+' || key === 'back') && styles.fn)}
          aria-label={
            key === 'back' ? t('kiosk.keypad.backLabel') : key === '+' ? t('kiosk.keypad.plusLabel') : undefined
          }
          disabled={key === '+' && value !== ''}
          onMouseDown={keepFocus}
          onClick={() => onKey(key)}
        >
          {key === 'back' ? <BackspaceIcon /> : key}
        </button>
      ))}
    </div>
  )
}
