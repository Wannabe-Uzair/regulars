import { t } from '../../copy.js'

// The front-desk phone keypad: 1–9, then + · 0 · ⌫ (DESIGN §12, kiosk). Keys are at least 64 px.
// A mouse or touch press doesn't move focus onto the key, so a hardware Enter right after still checks in;
// keyboard users can still Tab to every key.
export const MAX_DIGITS = 15 // E.164 allows 15 digits in all

/** value is what was typed: digits, optionally led by '+'. Returns the next value for a key, or the same value. */
export function press(value, key) {
  if (key === 'back') return value.slice(0, -1)
  const digits = value.replace(/\D/g, '').length
  if (key === '+') return value === '' ? '+' : value
  if (/^\d$/.test(key) && digits < MAX_DIGITS) return value + key
  return value
}

/** 3125550199 -> 312 555 0199, 13125550199 -> 1 312 555 0199; anything else (and + numbers) as typed. */
export function formatPhone(v) {
  if (v.startsWith('+')) return v
  if (v.length > 6 && v.length <= 10) return `${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6)}`
  if (v.length > 3 && v.length <= 6) return `${v.slice(0, 3)} ${v.slice(3)}`
  if (v.length === 11 && v[0] === '1') return `1 ${formatPhone(v.slice(1))}`
  return v
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', 'back']

export default function Keypad({ onKey, plusDisabled }) {
  const keep = (e) => e.preventDefault() // keep focus where it is on mouse/touch presses
  return (
    <div className="kiosk-keys" role="group" aria-label={t('kiosk.keypad.label', {}, 'Phone keypad')}>
      {KEYS.map((k) => {
        if (k === 'back') {
          return (
            <button key={k} type="button" className="kiosk-key kiosk-key-fn" onMouseDown={keep} onClick={() => onKey('back')}
              aria-label={t('kiosk.keypad.backLabel', {}, 'Delete last digit')}>
              <span aria-hidden="true">{t('kiosk.keypad.back')}</span>
            </button>
          )
        }
        if (k === '+') {
          return (
            <button key={k} type="button" className="kiosk-key kiosk-key-fn" onMouseDown={keep} onClick={() => onKey('+')}
              disabled={plusDisabled} aria-label={t('kiosk.keypad.plusLabel', {}, 'Plus, then the country code')}>
              <span aria-hidden="true">+</span>
            </button>
          )
        }
        return <button key={k} type="button" className="kiosk-key" onMouseDown={keep} onClick={() => onKey(k)}>{k}</button>
      })}
    </div>
  )
}
