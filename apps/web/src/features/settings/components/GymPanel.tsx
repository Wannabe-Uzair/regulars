import { type AuthGym, type ErrorCode, SettingsPatch } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { isOpenMarket, marketOptions, type OpenMarket, zoneCity, zoneForCountry, zonesFor } from '@tenure/domain'
import { Button, Field, FormError, Input, Panel, Select, useToast } from '@tenure/ui'
import { type FormEvent, useRef, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client.ts'
import { useSaveSettings } from '../api.ts'
import styles from './settings.module.css'

/** What the owner has changed and not saved yet; a field left out shows the gym's saved value. */
type Edits = { name?: string; country?: OpenMarket; timezone?: string }

/** Shown for a gym whose stored country isn't one of the five (none should be); saving then sets it. */
const FALLBACK_COUNTRY: OpenMarket = 'US'

/**
 * The gym form (FR-GYM-01, 02): the name, the Country (one of the five) and the time zone from `zonesFor`, each named
 * by its city. Saving sends only what changed, puts the answer's gym into the session and toasts.
 */
export function GymPanel({ gym }: { gym: AuthGym }) {
  const [edits, setEdits] = useState<Edits>({})
  // The client's own line for a blank name; the server's answers come from the mutation.
  const [nameError, setNameError] = useState<string>()
  const [tries, setTries] = useState(0)
  const nameRef = useRef<HTMLInputElement>(null)
  const save = useSaveSettings()
  const toast = useToast()

  const name = edits.name ?? gym.name
  const country = edits.country ?? (isOpenMarket(gym.country) ? gym.country : FALLBACK_COUNTRY)
  const timezone = edits.timezone ?? gym.timezone
  // The current zone is always listed, so the select shows it and never quietly saves another.
  const zones = zonesFor(country, timezone)

  // A Country change moves the zone to the country's own unless the current one is in it (answers.md, 7 Nov).
  const onCountry = (next: OpenMarket) =>
    setEdits({ ...edits, country: next, timezone: zoneForCountry(next, timezone) })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTries((n) => n + 1)
    const body: SettingsPatch = {}
    if (name.trim() !== gym.name) body.name = name.trim()
    if (country !== gym.country) body.country = country
    if (timezone !== gym.timezone) body.timezone = timezone
    const code = SettingsPatch.safeParse(body).error?.issues[0]?.message as ErrorCode | undefined
    if (code === 'gymName') {
      save.reset()
      setNameError(t('api.gymName'))
      nameRef.current?.focus()
      return
    }
    save.mutate(body, {
      onSuccess: () => {
        setEdits({})
        toast.show({ message: t('settings.saved') })
      },
    })
  }

  const failure = save.error
  const nameFailed = failure instanceof ApiRequestError && failure.code === 'gymName'

  return (
    <Panel heading={t('settings.gym.title')}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <Field label={t('settings.gym.name')} error={nameError ?? (nameFailed ? failure.message : undefined)}>
          <Input
            ref={nameRef}
            name="name"
            autoComplete="organization"
            maxLength={80}
            value={name}
            onChange={(e) => {
              setNameError(undefined)
              setEdits({ ...edits, name: e.target.value })
            }}
          />
        </Field>
        <Field label={t('settings.gym.country')}>
          <Select name="country" value={country} onChange={(e) => onCountry(e.target.value as OpenMarket)}>
            {marketOptions().map((m) => (
              <option key={m.country} value={m.country}>
                {t(`country.${m.country}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('settings.gym.tz')}>
          <Select name="timezone" value={timezone} onChange={(e) => setEdits({ ...edits, timezone: e.target.value })}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zoneCity(zone)}
              </option>
            ))}
          </Select>
        </Field>
        <FormError message={failure && !nameFailed ? failure.message : undefined} submittedAt={tries} />
        <Button className={styles.save} type="submit" variant="primary" loading={save.isPending}>
          {t('common.save')}
        </Button>
      </form>
    </Panel>
  )
}
