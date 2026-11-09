// The two list orders shared by the API and the web app (SPEC §6).
import type { MemberSummary } from './metrics.ts'

export type BoardRow = Pick<MemberSummary, 'id' | 'status' | 'joinedOn'>
export type SlippingRow = Pick<MemberSummary, 'id' | 'daysSinceJoin' | 'daysSinceLastVisit'>

/** Board order: slipping first, then newest joiners first, then by id. A comparator for Array.prototype.sort. */
export function boardOrder(a: BoardRow, b: BoardRow): number {
  const sa = a.status === 'slipping' ? 0 : 1
  const sb = b.status === 'slipping' ? 0 : 1
  return sa - sb || (a.joinedOn < b.joinedOn ? 1 : a.joinedOn > b.joinedOn ? -1 : a.id - b.id)
}

/** Slipping list order: most days since last visit first (never visited counts as the most), then by id. */
export function slippingOrder(a: SlippingRow, b: SlippingRow): number {
  const da = a.daysSinceLastVisit ?? a.daysSinceJoin + 1
  const db = b.daysSinceLastVisit ?? b.daysSinceJoin + 1
  return db - da || a.id - b.id
}
