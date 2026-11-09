import type { KioskJoinBody } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, Field, FormError, Input } from '@tenure/ui'
import { type FormEvent, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client.ts'
import { classes } from '../classes.ts'
import styles from './Panel.module.css'

type Props = {
  /** The keypad's typed number, to start the phone field with. */
  typed: string
  /** False on the demo gym: it joins by name only, with no phone field (answers.md, 7 Nov). */
  askPhone: boolean
  pending: boolean
  /** The last join's failure. */
  error: Error | null
  /** Changes on every submit, so the same failure is read again. */
  submittedAt: number
  onJoin: (body: KioskJoinBody) => void
  onCancel: () => void
}

const textOf = (data: FormData, name: string) => {
  const value = data.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * "Join the Gym" (FR-KIOSK-04), in the kiosk's column: a first name, with the last name and phone optional. A blank first name is caught
 * here. The server's answers go on their field: a bad or taken phone on the phone, the rest (an archived member's
 * phone sends them to the front desk, FR-KIOSK-06) under the form.
 */
export function JoinForm({ typed, askPhone, pending, error, submittedAt, onJoin, onCancel }: Props) {
  const [firstMissing, setFirstMissing] = useState(false)
  const code = error instanceof ApiRequestError ? error.code : null
  const firstError = firstMissing
    ? t('kiosk.join.firstRequired')
    : code === 'kioskFirstName'
      ? error?.message
      : undefined
  // One sentence: err.phone already says how to type another country's number.
  const phoneError = code === 'phone' || code === 'duplicate' ? error?.message : undefined
  const formError = error && !firstError && !phoneError ? error.message : undefined

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const firstName = textOf(data, 'firstName')
    if (!firstName) {
      setFirstMissing(true)
      event.currentTarget.querySelector<HTMLInputElement>('input[name="firstName"]')?.focus()
      return
    }
    setFirstMissing(false)
    const lastName = textOf(data, 'lastName')
    const phone = askPhone ? textOf(data, 'phone') : ''
    onJoin({ firstName, ...(lastName && { lastName }), ...(phone && { phone }) })
  }

  const optional = (label: string) => (
    <>
      {label} <span className={styles.optional}>{t('kiosk.join.optional')}</span>
    </>
  )

  return (
    <form className={styles.panel} onSubmit={onSubmit} noValidate>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('kiosk.join.title')}</h1>
        <p className={styles.prompt}>{askPhone ? t('kiosk.join.prompt') : t('kiosk.join.promptName')}</p>
      </div>
      <Field className={classes(styles.field, styles.reserve)} label={t('kiosk.join.first')} error={firstError}>
        <Input
          className={styles.input}
          name="firstName"
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          maxLength={40}
          onChange={() => setFirstMissing(false)}
        />
      </Field>
      <Field className={styles.field} label={optional(t('kiosk.join.last'))}>
        <Input className={styles.input} name="lastName" autoComplete="off" autoCapitalize="words" maxLength={40} />
      </Field>
      {askPhone && (
        <Field className={styles.field} label={optional(t('kiosk.join.phone'))} error={phoneError}>
          <Input
            className={styles.input}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={20}
            defaultValue={typed}
          />
        </Field>
      )}
      <FormError message={formError} submittedAt={submittedAt} />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" loading={pending}>
          {t('kiosk.join.submit')}
        </Button>
        <Button variant="plain" size="lg" onClick={onCancel}>
          {t('kiosk.join.cancel')}
        </Button>
      </div>
    </form>
  )
}
