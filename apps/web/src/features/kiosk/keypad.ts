// The keypad's typed value (FR-KIOSK-02, FR-KIOSK-08): digits and a leading "+", as the old keypad kept it. The
// screen shows it through domain's formatPhoneAsTyped; the server reads it in the gym's country.
import { formatPhoneAsTyped, isOpenMarket, type OpenMarket } from '@tenure/domain'
import type { MouseEvent } from 'react'

/** The most digits a phone number has (E.164). */
export const MAX_DIGITS = 15

export type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '+' | 'back'

/** In the keypad's order: 1 to 9, then +, 0 and delete. */
export const KEYS: readonly Key[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', 'back']

/** The value after a key: delete drops the last character, + comes first only, and digits stop at 15. */
export function press(value: string, key: Key): string {
  if (key === 'back') return value.slice(0, -1)
  if (key === '+') return value === '' ? '+' : value
  return value.replace(/\D/g, '').length < MAX_DIGITS ? value + key : value
}

/** Something to look up: not nothing, and not "+" alone. */
export const canSubmit = (value: string) => value !== '' && value !== '+'

/** The gym's country as the keypad reads it: one of the five, or the US for any other. */
const marketOf = (country: string): OpenMarket => (isOpenMarket(country) ? country : 'US')

/** The typed value in the gym's own grouping, "(312) 555-0142" at a US gym. */
export function display(value: string, country: string): string {
  return formatPhoneAsTyped(value, marketOf(country))
}

/** How many digits a local number has in each market, so the empty slots show how long the number is (kiosk-1). */
export const USUAL_DIGITS: Readonly<Record<OpenMarket, number>> = { US: 10, CA: 10, GB: 11, PK: 11, AE: 10 }

/** One character of the shown number: a digit, which sits in a slot, or a separator ("(", " ", "-", "+"), bare. */
export type Slot = { char: string; digit: boolean }

/**
 * The number as slots (FR-KIOSK-02): each character of display() in order, then how many empty slots follow, up to
 * the market's usual length. None follow a leading "+", whose length depends on the country it names.
 */
export function numberSlots(value: string, country: string): { filled: Slot[]; empty: number } {
  const filled = [...display(value, country)].map((char) => ({ char, digit: /\d/.test(char) }))
  const digits = filled.filter((slot) => slot.digit).length
  const empty = value.startsWith('+') ? 0 : Math.max(0, USUAL_DIGITS[marketOf(country)] - digits)
  return { filled, empty }
}

/** A press on a key leaves focus where it was, so a hardware Enter still checks in (the old Keypad.jsx). */
export const keepFocus = (event: MouseEvent) => event.preventDefault()
