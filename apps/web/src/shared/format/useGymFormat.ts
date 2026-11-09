// The signed-in gym's formatters, for every screen under /app (FR-GLOBAL-03, FR-MEMBER-03).
import { useMemo } from 'react'
import { useSession } from '../session/session.ts'
import { type GymFormat, gymFormat } from './format.ts'

/** Before the session loads (the shell waits for it, so a screen never sees this): a US gym on the device's clock. */
const deviceZone = () => new Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * The gym's dates, times, months and phones, in its locale (`localeFor` its country) and its time zone, whatever the
 * device's. The formatters are made once per country and zone, so a list can call them per row.
 */
export function useGymFormat(): GymFormat {
  const gym = useSession().data?.gym
  const country = gym?.country ?? 'US'
  const timezone = gym?.timezone ?? deviceZone()
  return useMemo(() => gymFormat({ country, timezone }), [country, timezone])
}
