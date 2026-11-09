// The owner's "Pilot day {n} of 90" by the gym name (FR-SHELL-03), read from GET /api/billing.
import { useQuery } from '@tanstack/react-query'
import { BillingResponse, type Role } from '@tenure/contracts'
import { get } from '../../shared/api/client.ts'

/** The billing answer's query key, for the Billing page to share. */
export const billingKey = ['billing'] as const

/** The pilot day to show: none for a coach, none from day 91 (the pilot has ended), and none until it loads. */
export function shownPilotDay(role: Role, billing: BillingResponse | undefined): number | null {
  if (role !== 'owner' || !billing || billing.ended) return null
  return billing.pilotDay
}

/**
 * Asks only for an owner: the route answers a coach 403. A failed load shows no line, as a coach sees. `pending` while
 * an owner's answer is on its way, so the sidebar can hold the line's place (audit B2-06).
 */
export function usePilotDay(role: Role): { day: number | null; pending: boolean } {
  const billing = useQuery({
    queryKey: billingKey,
    queryFn: () => get('/api/billing', BillingResponse),
    enabled: role === 'owner',
  })
  return { day: shownPilotDay(role, billing.data), pending: role === 'owner' && billing.isPending }
}
