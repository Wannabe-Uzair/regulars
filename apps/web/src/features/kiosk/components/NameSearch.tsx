import { useQueryClient } from '@tanstack/react-query'
import { t } from '@tenure/copy'
import { Button, Field, Input } from '@tenure/ui'
import { type KeyboardEvent, useEffect, useState } from 'react'
import { forgetSearches, useKioskSearch } from '../api.ts'
import styles from './Panel.module.css'

/** The pause after typing before the search asks. */
export const SEARCH_PAUSE_MS = 300

/** A query as the server reads it: trimmed, lower-cased, each run of spaces as one. */
const queryOf = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

type Props = {
  token: string
  /** A check-in by pick is running. */
  picking: boolean
  /** The pick's failure, in words. */
  pickError: string | undefined
  onPick: (memberId: number) => void
  onJoin: () => void
}

/**
 * "Name" (FR-KIOSK-02): the start of a first name, then up to 6 names as "First L." to pick from, two to a row. It
 * asks 300 ms after typing stops, once per query; Enter picks a lone name. Leaving it drops its answers, so a member
 * who joined since is found next time. Join the Gym keeps its slot at the foot of the column, so results never move it.
 * The kiosk's title and choice sit above it.
 */
export function NameSearch({ token, picking, pickError, onPick, onJoin }: Props) {
  const client = useQueryClient()
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setQ(queryOf(text)), SEARCH_PAUSE_MS)
    return () => clearTimeout(id)
  }, [text])
  useEffect(() => () => forgetSearches(client, token), [client, token])

  const search = useKioskSearch(token, q)
  // Only the answer to what is typed now: a slower, older one never shows under a newer query.
  const current = q !== '' && q === queryOf(text)
  const hits = current ? search.data : undefined

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const [only, ...more] = hits ?? []
    if (only && more.length === 0 && !picking) onPick(only.memberId)
  }

  return (
    <div className={styles.panel}>
      <Field className={styles.field} label={t('kiosk.search.label')}>
        <Input
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={40}
        />
      </Field>
      {hits && hits.length > 0 && (
        <ul className={styles.hits} aria-label={t('kiosk.search.results')}>
          {hits.map((hit) => (
            <li key={hit.memberId}>
              <Button className={styles.hit} size="lg" disabled={picking} onClick={() => onPick(hit.memberId)}>
                {hit.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {hits?.length === 0 && (
        <p className={styles.note} role="status">
          {t('kiosk.search.noneFor', { query: text.trim() })}
        </p>
      )}
      {current && search.isError && (
        <p className={styles.problem} role="alert">
          {search.error.message}
        </p>
      )}
      {pickError !== undefined && (
        <p className={styles.problem} role="alert">
          {pickError}
        </p>
      )}
      <div className={styles.foot}>
        <Button variant="plain" size="lg" onClick={onJoin}>
          {t('kiosk.join')}
        </Button>
      </div>
    </div>
  )
}
