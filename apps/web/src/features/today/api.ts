// Today's query keys, the GET /api/today hook, and the kiosk path for an empty gym's "Open the kiosk".
import { useQuery } from '@tanstack/react-query'
import { SettingsResponse, TodayResponse } from '@tenure/contracts'
import { get } from '../../shared/api/client.ts'

export const todayKeys = {
  all: ['today'] as const,
  /** Outside ['today'], so live events don't refetch it: the kiosk link doesn't change with check-ins. */
  kiosk: ['today-kiosk'] as const,
}

/** The Today read model, scoped by the server to the viewer. Live events invalidate it (see index.ts). */
export function useToday() {
  return useQuery({ queryKey: todayKeys.all, queryFn: () => get('/api/today', TodayResponse) })
}

/** The kiosk's path, from Settings (owners only), fetched only when `enabled`: an owner's empty gym (FR-TODAY-03). */
export function useKioskPath(enabled: boolean) {
  return useQuery({
    queryKey: todayKeys.kiosk,
    queryFn: () => get('/api/settings', SettingsResponse),
    select: (settings) => settings.kioskPath,
    enabled,
  })
}
