import type { CheckinToday } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { useToast } from '@tenure/ui'
import { useEffect, useRef } from 'react'

const keyOf = (c: CheckinToday) => `${c.memberId}@${c.at}`

/**
 * Shows the check-in toast for each check-in that appears in today's list after the first load (FR-TODAY-04). A
 * 'checkin.recorded' event invalidates the screen's query (each feature declares it in its index.ts); the refetched
 * list then carries the new check-in and its short name. The tab keeps one EventSource, in shared/live, so the screen
 * reads the event through its data. Today and the board both use it.
 */
export function useCheckinToasts(checkins: readonly CheckinToday[] | undefined) {
  const toast = useToast()
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!checkins) return
    const before = seen.current
    seen.current = new Set(checkins.map(keyOf))
    if (!before) return
    // The list is newest first; announce in the order they happened.
    for (const c of [...checkins].reverse()) {
      if (!before.has(keyOf(c))) toast.show({ message: t('toast.checkin', { name: c.name }) })
    }
  }, [checkins, toast])
}
