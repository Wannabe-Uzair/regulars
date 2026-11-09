// The member page's facts (FR-MEMBER-01) and the owner's edits (FR-MEMBER-02): the name, the coach and the phone,
// each with its own Change button and form, which sends only its own field and shows the server's error under it.
import type { MemberDetail, MemberPatchRequest } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, FactList, Field, FormError, Input, Select } from '@tenure/ui'
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client.ts'
import { useGymFormat } from '../../../shared/format/useGymFormat.ts'
import { useCoachChoices, useUpdateMember } from '../api.ts'
import { fullName } from '../text.ts'
import styles from './Facts.module.css'

type Editable = 'name' | 'coach' | 'phone'

const changeLabel = {
  name: 'member.edit.name',
  coach: 'member.edit.coach',
  phone: 'member.edit.phone',
} as const

/** Whether a calendar date falls in the gym's current year, so the year can be left out. */
function sameYear(date: string, timeZone: string): boolean {
  const year = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(new Date())
  return date.slice(0, 4) === year
}

export type FactsProps = {
  member: MemberDetail
  /** Owners change the name, the coach and the phone; coaches only read them. */
  canEdit: boolean
}

/** Name, coach, phone and the joined date. One form is open at a time; closing it returns focus to its Change. */
export function Facts({ member, canEdit }: FactsProps) {
  const format = useGymFormat()
  const [editing, setEditing] = useState<Editable | null>(null)
  const [closed, setClosed] = useState<Editable | null>(null)
  const changeButtons = useRef<Partial<Record<Editable, HTMLButtonElement | null>>>({})

  useEffect(() => {
    if (closed) changeButtons.current[closed]?.focus()
  }, [closed])

  const close = () => {
    setClosed(editing)
    setEditing(null)
  }

  const change = (field: Editable): ReactNode =>
    canEdit && editing !== field ? (
      <Button
        ref={(button) => {
          changeButtons.current[field] = button
        }}
        variant="plain"
        size="sm"
        className={styles.change}
        aria-label={t(changeLabel[field])}
        onClick={() => {
          setClosed(null)
          setEditing(field)
        }}
      >
        {t('member.edit')}
      </Button>
    ) : undefined

  const phone = member.phone === null ? t('member.phone.none') : format.phone(member.phone)

  return (
    <FactList
      className={styles.facts}
      items={[
        {
          label: t('member.name'),
          value: editing === 'name' ? <NameForm member={member} onDone={close} /> : fullName(member),
          action: change('name'),
        },
        {
          label: t('member.coach'),
          value:
            editing === 'coach' ? (
              <CoachForm member={member} onDone={close} />
            ) : (
              (member.coachName ?? t('member.coach.none'))
            ),
          action: change('coach'),
        },
        {
          label: t('member.phone'),
          value:
            editing === 'phone' ? (
              <PhoneForm member={member} shown={member.phone === null ? '' : phone} onDone={close} />
            ) : member.phone === null ? (
              <span className={styles.soft}>{phone}</span>
            ) : (
              <span className={styles.numbers}>{phone}</span>
            ),
          action: change('phone'),
        },
        {
          label: t('member.joinedOn'),
          value: format.date(member.joinedOn, { year: !sameYear(member.joinedOn, format.timeZone) }),
        },
      ]}
    />
  )
}

type FormProps = { member: MemberDetail; onDone: () => void }

/** The server's sentence for a failed save; a network failure is a sentence too. */
const messageOf = (error: Error | null): string | undefined => error?.message

/** Save and Cancel under a form, at the size that keeps the 44 px touch target (NFR-USE-03). */
function Actions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className={styles.actions}>
      <Button type="submit" variant="primary" size="md" loading={pending}>
        {t('common.save')}
      </Button>
      <Button type="button" variant="quiet" size="md" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
    </div>
  )
}

/** Sends the change, or closes straight away when nothing changed. */
function useSave(member: MemberDetail, onDone: () => void) {
  const update = useUpdateMember(member.id)
  const save = (event: FormEvent, change: MemberPatchRequest) => {
    event.preventDefault()
    if (Object.keys(change).length === 0) return onDone()
    update.mutate(change, { onSuccess: onDone })
  }
  return { update, save }
}

/** First name (required, as the server checks) and an optional last name; blank is none. */
function NameForm({ member, onDone }: FormProps) {
  const [first, setFirst] = useState(member.firstName)
  const [last, setLast] = useState(member.lastName)
  const { update, save } = useSave(member, onDone)
  const error = update.error
  const onFirst = error instanceof ApiRequestError && error.code === 'memberFirstName'

  const submit = (event: FormEvent) => {
    const change: MemberPatchRequest = {}
    if (first !== member.firstName) change.firstName = first
    if (last !== member.lastName) change.lastName = last
    save(event, change)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t('member.firstName')} error={onFirst ? messageOf(error) : undefined}>
        <Input value={first} autoComplete="off" autoFocus onChange={(e) => setFirst(e.target.value)} />
      </Field>
      <Field
        label={
          <span className={styles.optionalLabel}>
            {t('member.lastName')}
            <span className={styles.optional}>{t('member.optional')}</span>
          </span>
        }
      >
        <Input value={last} autoComplete="off" onChange={(e) => setLast(e.target.value)} />
      </Field>
      <FormError message={onFirst ? undefined : messageOf(error)} submittedAt={update.submittedAt} />
      <Actions pending={update.isPending} onCancel={onDone} />
    </form>
  )
}

/** "No coach" first, then the gym's active staff by name; the current coach stays a choice. */
function CoachForm({ member, onDone }: FormProps) {
  const staff = useCoachChoices(true)
  const [value, setValue] = useState(member.coachId === null ? '' : String(member.coachId))
  const { update, save } = useSave(member, onDone)

  const choices = staff.data ?? []
  const current =
    member.coachId !== null && !choices.some((s) => s.id === member.coachId)
      ? [{ id: member.coachId, name: member.coachName ?? t('common.none') }]
      : []

  const submit = (event: FormEvent) => {
    const coachId = value === '' ? null : Number(value)
    save(event, coachId === member.coachId ? {} : { coachId })
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field
        label={<span className={styles.hidden}>{t('member.coach')}</span>}
        error={messageOf(update.error) ?? messageOf(staff.error)}
      >
        <Select value={value} autoFocus onChange={(e) => setValue(e.target.value)}>
          <option value="">{t('member.coach.none')}</option>
          {[...current, ...choices].map((person) => (
            <option key={person.id} value={String(person.id)}>
              {person.name}
            </option>
          ))}
        </Select>
      </Field>
      <Actions pending={update.isPending} onCancel={onDone} />
    </form>
  )
}

/** As typed, read in the gym's country by the server (FR-MEMBER-02); blank clears it. */
function PhoneForm({ member, shown, onDone }: FormProps & { shown: string }) {
  const [text, setText] = useState(shown)
  const { update, save } = useSave(member, onDone)

  const submit = (event: FormEvent) => {
    const typed = text.trim()
    save(event, typed === shown.trim() ? {} : { phone: typed === '' ? null : typed })
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={<span className={styles.hidden}>{t('member.phone')}</span>} error={messageOf(update.error)}>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <Actions pending={update.isPending} onCancel={onDone} />
    </form>
  )
}
