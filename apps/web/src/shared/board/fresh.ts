// Which members just checked in, so their week mark pops (FR-BOARD-03). A 'checkin.recorded' event refetches the
// screen's data; the check-ins the new data brings are the fresh ones.
import type { CheckinToday } from '@tenure/contracts'
import { useState } from 'react'

/** Member id → a key naming their newest fresh check-in, for weekCells' and WeekRow's `fresh`. */
export type FreshCheckins = ReadonlyMap<number, string>

const keyOf = (c: CheckinToday) => `${c.memberId}@${c.at}`

const none: FreshCheckins = new Map()

/**
 * The check-ins in `after` that `before` didn't have, as each member's newest one. The list is newest first, as
 * TodayResponse sends it. Nothing is fresh on the first load (`before` null).
 */
export function freshCheckins(before: ReadonlySet<string> | null, after: readonly CheckinToday[]): FreshCheckins {
  if (!before) return none
  const fresh = new Map<number, string>()
  for (const c of after) {
    if (!before.has(keyOf(c)) && !fresh.has(c.memberId)) fresh.set(c.memberId, keyOf(c))
  }
  return fresh.size === 0 ? none : fresh
}

type Seen = { list: readonly CheckinToday[] | undefined; keys: ReadonlySet<string> | null; fresh: FreshCheckins }

/**
 * The fresh check-ins of the latest data: empty on the first load, and again when new data brings none. `checkins` is
 * today's list (undefined while it loads); pass the same array until the data changes, as TanStack Query does.
 */
export function useFreshCheckins(checkins: readonly CheckinToday[] | undefined): FreshCheckins {
  const [seen, setSeen] = useState<Seen>({ list: undefined, keys: null, fresh: none })
  if (checkins === seen.list) return seen.fresh
  const next: Seen = checkins
    ? { list: checkins, keys: new Set(checkins.map(keyOf)), fresh: freshCheckins(seen.keys, checkins) }
    : { ...seen, list: checkins }
  setSeen(next)
  return next.fresh
}

/**
 * Each member's newest fresh check-in this screen has seen (FR-BOARD-03), so a refetch with no news, or another
 * member's check-in, doesn't cut a row's tint and pop short: the row keeps its key and its class, and the animations,
 * run once, finish. A member's next check-in changes their key, so the board draws their row afresh and both replay.
 */
export function useLastingFresh(fresh: FreshCheckins | undefined): FreshCheckins {
  const [seen, setSeen] = useState<{ from: FreshCheckins | undefined; lasting: FreshCheckins }>({
    from: fresh,
    lasting: fresh ?? none,
  })
  if (fresh === seen.from) return seen.lasting
  const lasting = fresh && fresh.size > 0 ? new Map([...seen.lasting, ...fresh]) : seen.lasting
  setSeen({ from: fresh, lasting })
  return lasting
}
