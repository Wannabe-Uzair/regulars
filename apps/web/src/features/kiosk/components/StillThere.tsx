import { t } from '@tenure/copy'
import { Button, Dialog } from '@tenure/ui'
import { useEffect, useState } from 'react'
import styles from './StillThere.module.css'

/** How long "Still there?" waits for an answer before the kiosk starts over, in seconds. */
export const START_OVER_SECONDS = 20

/**
 * "Still there?" (kiosk-1's polish): ui's Dialog, a sheet on a phone and centred on a laptop, with the countdown under
 * its title and Keep Going as its one action. The kiosk owns the timers and starts over at 0; this only shows the
 * count. Mount it with a new key for each ask, so the count starts again at 20.
 */
export function StillThere({ open, onKeepGoing }: { open: boolean; onKeepGoing: () => void }) {
  const [left, setLeft] = useState(START_OVER_SECONDS)
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setLeft((n) => n - 1), 1000)
    return () => clearInterval(id)
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeepGoing()
      }}
      title={t('kiosk.idle.still')}
      description={t('kiosk.idle.startOver', { n: Math.max(left, 1) })}
      closeLabel={t('common.close')}
      footer={
        <Button variant="primary" size="lg" className={styles.keep} onClick={onKeepGoing}>
          {t('kiosk.idle.keepGoing')}
        </Button>
      }
    />
  )
}
