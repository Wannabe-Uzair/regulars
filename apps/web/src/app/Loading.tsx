import { t } from '@tenure/copy'
import { Spinner } from '@tenure/ui'
import { useEffect, useState } from 'react'
import styles from './Loading.module.css'

/** How long a wait goes unshown (pick F2, ARCHITECTURE §9 Motion), as ui's `--delay-busy`: a wait, not a move. */
const LOADING_DELAY_MS = 400

/**
 * The shell's wait: the router's fallback and the session check. It shows nothing for 400 ms, so an answer that lands
 * sooner shows no spinner at all, then ui's Spinner with "Loading", as the screens wait (F24). The timer is the one
 * wait, so the Spinner takes no delay of its own: with its default it would wait another 400 ms.
 */
export function Loading() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), LOADING_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])
  return <div className={styles.wait}>{shown && <Spinner label={t('common.loading')} delay={0} />}</div>
}
