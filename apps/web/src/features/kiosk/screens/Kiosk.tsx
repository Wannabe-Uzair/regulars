// /kiosk/:token (FR-KIOSK-01 to 08): the front-desk check-in, on a phone or a laptop's screen. No session and no
// live stream: the token in the path is the gym's secret. One centred column on the plain ground (kiosk-1): it starts on
// the keypad, a segmented choice switches to the name search, "Join the Gym" opens the join, and every check-in ends on
// the welcome, which counts back to the start.
import type { KioskGymResponse, KioskWelcome } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, ChoiceGroup, Spinner, Tag } from '@tenure/ui'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { ApiRequestError } from '../../../shared/api/client.ts'
import { usePageTitle } from '../../../shared/page/page.ts'
import { useCheckIn, useJoin, useKioskGym } from '../api.ts'
import { JoinForm } from '../components/JoinForm.tsx'
import { Keypad } from '../components/Keypad.tsx'
import { NameSearch } from '../components/NameSearch.tsx'
import { NumberSlots } from '../components/NumberSlots.tsx'
import { START_OVER_SECONDS, StillThere } from '../components/StillThere.tsx'
import { Welcome } from '../components/Welcome.tsx'
import { classes } from '../classes.ts'
import { canSubmit, type Key, keepFocus, press } from '../keypad.ts'
import styles from './Kiosk.module.css'

/** Without a touch or a key for this long mid-entry, the kiosk asks "Still there?" (FR-KIOSK-08). */
export const STILL_THERE_MS = 60_000
/** And with no answer for this long more, it starts over. */
export const START_OVER_MS = START_OVER_SECONDS * 1000

type Mode = 'phone' | 'search' | 'join' | 'welcome'

const codeOf = (error: unknown) => (error instanceof ApiRequestError ? error.code : null)

/**
 * A phone check-in's failure, as one sentence for the prompt's two-line slot: nobody has the number, or the server's
 * line (a number that can't be read gets err.phone, which already says how to type another country's).
 */
function phoneProblem(error: Error): string {
  return codeOf(error) === 'kioskNotFound' ? t('kiosk.notFound') : error.message
}

/** The plain ground and the one main landmark, with the gym's name and the demo's Sample data tag on top, always. */
function Frame({ gym, children }: { gym?: KioskGymResponse; children: ReactNode }) {
  return (
    <div className={styles.ground}>
      <main className={styles.page}>
        {gym && (
          <div className={styles.top}>
            <p className={styles.gym}>{gym.gymName}</p>
            {gym.isDemo && <Tag className={styles.sample}>{t('tag.sample')}</Tag>}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

export default function Kiosk() {
  const { token = '' } = useParams()
  const gym = useKioskGym(token)
  // The link stopped working mid-use (a 404 linkInvalid).
  const [lost, setLost] = useState(false)
  const markLost = useCallback(() => setLost(true), [])
  // A link that doesn't work, from the start or mid-use, says so in its title, the tab's and a sentence, with no Try
  // Again; any other failure keeps the kiosk's title over the server's sentence, with Try Again.
  const bad = lost || (gym.error instanceof ApiRequestError && gym.error.status === 404)
  usePageTitle(bad ? t('kiosk.bad.title') : t('kiosk.idle.title'))

  if (lost || gym.isError) {
    return (
      <Frame>
        <div className={classes(styles.column, styles.fatal)}>
          <h1 className={styles.title}>{bad ? t('kiosk.bad.title') : t('kiosk.idle.title')}</h1>
          <p className={styles.fatalText} role="alert">
            {bad ? t('kiosk.bad') : gym.error?.message}
          </p>
          {!bad && (
            <Button size="lg" onClick={() => void gym.refetch()}>
              {t('kiosk.retry')}
            </Button>
          )}
        </div>
      </Frame>
    )
  }
  if (gym.isPending) {
    return (
      <Frame>
        <h1 className={styles.hidden}>{t('kiosk.idle.title')}</h1>
        <div className={classes(styles.column, styles.fatal)}>
          <Spinner label={t('kiosk.loading')} />
        </div>
      </Frame>
    )
  }
  return (
    <Frame gym={gym.data}>
      <Ready token={token} gym={gym.data} onLost={markLost} />
    </Frame>
  )
}

function Ready({ token, gym, onLost }: { token: string; gym: KioskGymResponse; onLost: () => void }) {
  const [mode, setMode] = useState<Mode>('phone')
  const [typed, setTyped] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [welcome, setWelcome] = useState<{ answer: KioskWelcome; count: number } | null>(null)
  const [joinTries, setJoinTries] = useState(0)
  // "Still there?": whether it is up, and how many times it has asked, so each ask's countdown starts at 20.
  const [asking, setAsking] = useState(false)
  const [asks, setAsks] = useState(0)
  const checkIn = useCheckIn(token)
  const join = useJoin(token)
  const { reset: resetCheckIn } = checkIn
  const { reset: resetJoin } = join

  const reset = useCallback(() => {
    setMode('phone')
    setTyped('')
    setProblem(null)
    setWelcome(null)
    setAsking(false)
    resetCheckIn()
    resetJoin()
  }, [resetCheckIn, resetJoin])

  const go = (next: Mode) => {
    setProblem(null)
    resetCheckIn()
    resetJoin()
    setMode(next)
  }

  const showWelcome = useCallback((answer: KioskWelcome) => {
    setWelcome((last) => ({ answer, count: (last?.count ?? 0) + 1 }))
    setMode('welcome')
    setTyped('')
    setProblem(null)
  }, [])

  /** True when the link stopped working, which ends the kiosk on its load-error screen. */
  const linkLost = useCallback(
    (error: Error) => {
      if (codeOf(error) !== 'linkInvalid') return false
      onLost()
      return true
    },
    [onLost],
  )

  const { mutate: mutateCheckIn, isPending: checkingIn } = checkIn
  const submitPhone = useCallback(() => {
    if (checkingIn || !canSubmit(typed)) return
    mutateCheckIn(
      { phone: typed },
      { onSuccess: showWelcome, onError: (error) => void (linkLost(error) || setProblem(phoneProblem(error))) },
    )
  }, [checkingIn, typed, mutateCheckIn, showWelcome, linkLost])

  const pick = (memberId: number) =>
    mutateCheckIn({ memberId }, { onSuccess: showWelcome, onError: (error) => void linkLost(error) })

  const onKey = useCallback((key: Key) => {
    setProblem(null)
    setTyped((value) => press(value, key))
  }, [])

  // A hardware keyboard (FR-KIOSK-08): digits, + and Backspace type on the keypad and Enter checks in; Escape leaves
  // the search, the join and the welcome; a digit on the welcome starts the next number. Typing in a field, and keys
  // with a modifier, are left alone.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const tag = target?.tagName
      if (event.key === 'Escape' && mode !== 'phone') {
        event.preventDefault()
        reset()
        return
      }
      // The segmented choice's radios are inputs too, but they take no text: the keypad's keys still type.
      const typing = tag === 'INPUT' && (target as HTMLInputElement).type !== 'radio'
      if (typing || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (mode === 'welcome' && /^\d$/.test(event.key)) {
        event.preventDefault()
        reset()
        setTyped(event.key)
        return
      }
      if (mode !== 'phone') return
      if (/^\d$/.test(event.key) || event.key === '+') {
        event.preventDefault()
        onKey(event.key as Key)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        onKey('back')
      } else if (event.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A') {
        event.preventDefault()
        submitPhone()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, reset, onKey, submitPhone])

  // Mid-entry (a typed number, the name search, the join), a minute without a touch, a key or typing asks "Still
  // there?", and 20 s more without an answer starts over. While it asks, any key or tap answers it and does nothing
  // else. No timer on the empty start, nor on the welcome, which counts back by itself.
  const idle = mode === 'welcome' || (mode === 'phone' && typed === '' && problem === null)
  useEffect(() => {
    if (idle) return
    if (asking) {
      const id = setTimeout(reset, START_OVER_MS)
      const answer = (event: Event) => {
        if (event.type === 'keydown') {
          event.preventDefault()
          event.stopPropagation()
        }
        setAsking(false)
      }
      window.addEventListener('keydown', answer, true)
      window.addEventListener('click', answer, true)
      return () => {
        clearTimeout(id)
        window.removeEventListener('keydown', answer, true)
        window.removeEventListener('click', answer, true)
      }
    }
    const ask = () => {
      setAsks((n) => n + 1)
      setAsking(true)
    }
    let id = setTimeout(ask, STILL_THERE_MS)
    const poke = () => {
      clearTimeout(id)
      id = setTimeout(ask, STILL_THERE_MS)
    }
    const events = ['pointerdown', 'keydown', 'input'] as const
    for (const name of events) window.addEventListener(name, poke, true)
    return () => {
      clearTimeout(id)
      for (const name of events) window.removeEventListener(name, poke, true)
    }
  }, [idle, mode, asking, reset])

  if (mode === 'welcome' && welcome) {
    return <Welcome key={welcome.count} welcome={welcome.answer} onDone={reset} />
  }

  const stillThere = <StillThere key={asks} open={asking} onKeepGoing={() => setAsking(false)} />

  // Check In, then Phone Number | Name (FR-KIOSK-02): the title and the choice head the column on the keypad and the
  // name search alike, so neither moves when the choice changes. The join has its own title, and Cancel.
  const title = <h1 className={styles.title}>{t('kiosk.idle.title')}</h1>
  const choice = (
    <ChoiceGroup
      className={styles.mode}
      label={t('kiosk.mode.label')}
      hideLabel
      size="lg"
      stretch
      options={[
        { value: 'phone', label: t('kiosk.mode.phone') },
        { value: 'name', label: t('kiosk.mode.name') },
      ]}
      value={mode === 'search' ? 'name' : 'phone'}
      onChange={(next) => go(next === 'name' ? 'search' : 'phone')}
    />
  )

  if (mode === 'search') {
    const pickError = checkIn.error && codeOf(checkIn.error) !== 'linkInvalid' ? checkIn.error.message : undefined
    return (
      <div className={styles.column}>
        {title}
        {choice}
        <NameSearch
          token={token}
          picking={checkIn.isPending}
          pickError={pickError}
          onPick={pick}
          onJoin={() => go('join')}
        />
        {stillThere}
      </div>
    )
  }

  if (mode === 'join') {
    return (
      <div className={styles.column}>
        <JoinForm
          typed={typed}
          askPhone={!gym.isDemo}
          pending={join.isPending}
          error={join.error && codeOf(join.error) !== 'linkInvalid' ? join.error : null}
          submittedAt={joinTries}
          onJoin={(body) => {
            setJoinTries((n) => n + 1)
            join.mutate(body, { onSuccess: showWelcome, onError: (error) => void linkLost(error) })
          }}
          onCancel={() => go('phone')}
        />
        {stillThere}
      </div>
    )
  }

  return (
    <div className={classes(styles.column, styles.keypadColumn)}>
      {title}
      {choice}
      {/* One slot of fixed height: the prompt, or the problem in its place, so the keypad never moves. */}
      <div className={styles.slot}>
        {!problem && <p className={styles.prompt}>{t('kiosk.idle.prompt')}</p>}
        {/* Always there, so the screen reader hears a problem the moment it lands; the prompt stays outside it. */}
        <div aria-live="assertive" className={styles.alert}>
          {problem && <p className={styles.problemText}>{problem}</p>}
        </div>
      </div>
      <output className={styles.display} aria-live="polite" aria-label={t('kiosk.display.label')}>
        <NumberSlots value={typed} country={gym.country} />
      </output>
      <Keypad value={typed} onKey={onKey} />
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          disabled={!canSubmit(typed)}
          loading={checkIn.isPending}
          onMouseDown={keepFocus}
          onClick={submitPhone}
        >
          {t('kiosk.keypad.submit')}
        </Button>
        <Button variant="plain" size="lg" onClick={() => go('join')}>
          {t('kiosk.join')}
        </Button>
      </div>
      {stillThere}
    </div>
  )
}
