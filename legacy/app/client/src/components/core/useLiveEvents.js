import { useEffect, useRef, useState } from 'react'
import { useToast } from '../index.js'
import { t } from '../../copy.js'

/* useLiveEvents({ checkin, member, nudge }): one EventSource on /api/events (SPEC §6 Live) for the screen that uses it.
 * Handlers get the parsed data. The browser retries on its own while the stream is CONNECTING; if it gives up
 * (CLOSED, e.g. the server restarted), we open a new one after a growing delay (1 s, 2 s, 4 s … 30 s). */
export function useLiveEvents(handlers) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    if (typeof EventSource === 'undefined') return
    let es, timer, delay = 1000, stopped = false
    const open = () => {
      es = new EventSource('/api/events', { withCredentials: true })
      es.onopen = () => { delay = 1000 }
      for (const type of ['checkin', 'member', 'nudge']) {
        es.addEventListener(type, (e) => {
          let data = null
          try { data = JSON.parse(e.data) } catch { return }
          ref.current[type]?.(data)
        })
      }
      es.onerror = () => {
        if (es.readyState !== EventSource.CLOSED || stopped) return
        timer = setTimeout(open, delay)
        delay = Math.min(delay * 2, 30000)
      }
    }
    open()
    return () => { stopped = true; clearTimeout(timer); es?.close() }
  }, [])
}

/* The live wiring shared by Today, Board and Member: a check-in toasts, reloads and then slams that member's cell;
 * member and nudge events reload. `slam` is { memberId, key } for <Board slam> / <Cells slamKey>, set only once the
 * reloaded data has arrived so the cell animates with its new state. */
export function useLiveReload({ data, reload, match = () => true }) {
  const toast = useToast()
  const [slam, setSlam] = useState(null)
  const pending = useRef(null)
  useLiveEvents({
    checkin: (d) => {
      if (!match(d)) return
      toast(t('toast.checkin', { NAME: String(d.name ?? '').toUpperCase() }))
      pending.current = d.memberId
      reload()
    },
    member: (d) => { if (match(d)) reload() },
    nudge: (d) => { if (match(d)) reload() },
  })
  useEffect(() => {
    if (pending.current == null || data === undefined) return
    setSlam({ memberId: pending.current, key: Date.now() })
    pending.current = null
  }, [data])
  return slam
}
