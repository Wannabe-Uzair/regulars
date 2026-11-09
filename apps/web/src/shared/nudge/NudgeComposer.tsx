// The composer inside "Nudge {first}" (FR-NUDGE-01 to 05): a template or the coach's own words, then the channels
// stacked under the message (flow-3A): Text Message (phones only) and WhatsApp open the coach's own app with the message,
// Copy Message copies it, and each records the nudge with its channel. Tenure sends nothing itself.
import { MESSAGE_MAX, type NudgeChannel } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { smsUrl, whatsappUrl } from '@tenure/domain'
import {
  Button,
  buttonClass,
  copyText,
  Field,
  FormError,
  Select,
  sheetMediaQuery,
  Textarea,
  useMediaQuery,
  useToast,
} from '@tenure/ui'
import { type MouseEvent, useRef, useState } from 'react'
import { useGymFormat } from '../format/useGymFormat.ts'
import { useRecordNudge, useRenderedTemplate, useTemplates } from './api.ts'
import type { NudgeTarget } from './NudgeButton.tsx'
import styles from './NudgeComposer.module.css'

/** The template select's value: a template's id, or '' for "Write My Own". */
type Choice = number | ''

const MESSAGE_ROWS = 5

export type NudgeComposerProps = {
  member: NudgeTarget
  /** Runs once the nudge is recorded: the opener closes the dialog and shows "Nudged". */
  onDone: () => void
}

export function NudgeComposer({ member, onDone }: NudgeComposerProps) {
  const toast = useToast()
  const format = useGymFormat()
  // The width that makes the dialog a sheet is the phone: only there does Text Message show.
  const onPhone = useMediaQuery(sheetMediaQuery)
  const templates = useTemplates()

  // Until the coach picks, the first template (or Write My Own when the gym has none) once the list is in.
  const [picked, setPicked] = useState<Choice | null>(null)
  const choice: Choice | null = picked ?? (templates.data ? (templates.data[0]?.id ?? '') : null)
  const templateId = typeof choice === 'number' ? choice : null
  const rendered = useRenderedTemplate(member.id, templateId)

  // The coach's own words, kept for the choice they were typed under; a new choice starts from its render.
  const [edit, setEdit] = useState<{ choice: Choice | null; text: string } | null>(null)
  const message = edit && edit.choice === choice ? edit.text : choice === '' ? '' : (rendered.data?.body ?? '')
  const blank = message.trim() === ''

  // The channel pressed, from the tap until the record fails (on success the sheet closes). The ref answers a second
  // tap in the same frame, before the state has rendered: every channel ignores it, so one nudge is recorded.
  const [pressed, setPressed] = useState<NudgeChannel | null>(null)
  const busy = useRef(false)

  const [error, setError] = useState<string>()
  // One tap, one toast (audit B2-03): Copy Message says both what it copied and what it recorded, in one line.
  const record = useRecordNudge(member.id, ({ channel }) => {
    const first = member.firstName
    toast.show({ message: channel === 'copy' ? t('nudge.copied', { first }) : t('toast.nudge', { first }) })
    onDone()
  })

  function release(message?: string) {
    busy.current = false
    setPressed(null)
    setError(message)
  }

  /** Starts a press, or says no when one is already working or there are no words to send. */
  function claim(channel: NudgeChannel): boolean {
    if (busy.current || blank) return false
    busy.current = true
    setPressed(channel)
    setError(undefined)
    return true
  }

  function send(channel: NudgeChannel) {
    record.mutate({ body: message, templateId, channel }, { onError: (failure) => release(failure.message) })
  }

  /** Text Message and WhatsApp: the browser follows the link in this same tap (iOS opens WhatsApp only from the tap). */
  function follow(event: MouseEvent<HTMLAnchorElement>, channel: NudgeChannel) {
    if (!claim(channel)) {
      event.preventDefault()
      return
    }
    send(channel)
  }

  function copy() {
    if (!claim('copy')) return
    // The copy starts inside the tap: browsers write the clipboard only there. The record follows a copy that worked.
    void copyInsideTraps(message).then((copied) => {
      if (!copied) {
        release(t('nudge.copyFailed'))
        return
      }
      send('copy')
    })
  }

  const loadError = templates.error ?? rendered.error
  const shownError = error ?? loadError?.message
  const first = member.firstName
  const phone = member.phone
  // A link can't be disabled: while it waits for words or for a record it says so, and a tap on it does nothing.
  const linkWaits = blank || pressed !== null
  const tinted = buttonClass({ variant: 'tinted' })
  const channelClass = blank ? `${tinted} ${styles.waiting}` : tinted

  return (
    <div className={styles.composer}>
      <Field label={t('nudge.template')}>
        <Select
          value={choice ?? ''}
          disabled={!templates.data}
          onChange={(event) => {
            setPicked(event.target.value === '' ? '' : Number(event.target.value))
            setEdit(null)
            setError(undefined)
          }}
        >
          <option value="">{t('nudge.templateNone')}</option>
          {templates.data?.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t('nudge.text')}>
        <Textarea
          className={styles.message}
          rows={MESSAGE_ROWS}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(event) => {
            // Typing settles the choice, so a refetched template list can't move it.
            setPicked(choice)
            setEdit({ choice, text: event.target.value })
          }}
        />
      </Field>

      {phone === null ? (
        <div className={styles.noPhone}>
          <h3 className={styles.noPhoneTitle}>{t('nudge.noPhoneTitle')}</h3>
          <p className={styles.help}>{t('nudge.noPhoneBody', { first })}</p>
        </div>
      ) : (
        <p className={styles.help}>
          {onPhone ? t('nudge.howTo') : t('nudge.helpDesktop', { phone: format.phone(phone) })}
        </p>
      )}

      <FormError message={shownError} />

      <div className={styles.actions}>
        {phone === null ? (
          <Button
            variant="primary"
            disabled={blank}
            loading={pressed === 'in-person'}
            onClick={() => {
              if (claim('in-person')) send('in-person')
            }}
          >
            {t('nudge.noPhoneAction')}
          </Button>
        ) : (
          <>
            {onPhone && (
              <a
                className={channelClass}
                href={smsUrl(phone, message.trim()) ?? ''}
                aria-disabled={linkWaits || undefined}
                onClick={(event) => follow(event, 'text')}
              >
                {t('nudge.contact.text')}
              </a>
            )}
            <a
              className={channelClass}
              href={whatsappUrl(phone, message.trim()) ?? ''}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={linkWaits || undefined}
              onClick={(event) => follow(event, 'whatsapp')}
            >
              {t('nudge.contact.whatsapp')}
            </a>
            <Button variant="tinted" disabled={blank} loading={pressed === 'copy'} onClick={copy}>
              {t('nudge.copy')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * ui's copyText, with the dialog's focus trap held back while it runs. On plain http (the stall's LAN address) it
 * copies from a textarea it adds to <body> and focuses; the trap would pull focus straight back into the dialog,
 * leaving nothing selected, and the copy would report success with the clipboard unchanged.
 */
function copyInsideTraps(text: string): Promise<boolean> {
  const hold = (event: FocusEvent) => event.stopImmediatePropagation()
  window.addEventListener('focusin', hold, true)
  window.addEventListener('focusout', hold, true)
  return copyText(text).finally(() => {
    window.removeEventListener('focusin', hold, true)
    window.removeEventListener('focusout', hold, true)
  })
}
