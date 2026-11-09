// Settings' query key, GET and PATCH /api/settings, and the QR code address.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type MeResponse, type SettingsPatch, SettingsResponse } from '@tenure/contracts'
import { get, patch } from '../../shared/api/client.ts'
import { sessionKey } from '../../shared/session/session.ts'

export const settingsKeys = {
  all: ['settings'] as const,
}

/** The gym and its kiosk and phone links. settings.updated invalidates it (see index.ts). */
export function useSettings() {
  return useQuery({ queryKey: settingsKeys.all, queryFn: () => get('/api/settings', SettingsResponse) })
}

/** PATCH the changed fields. The answer's gym goes into the session, so every screen shows it at once (FR-GYM-01). */
export function useSaveSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: SettingsPatch) => patch('/api/settings', body, SettingsResponse),
    onSuccess: (saved) => {
      client.setQueryData(settingsKeys.all, saved)
      client.setQueryData<MeResponse | null>(sessionKey, (me) => (me ? { ...me, gym: saved.gym } : me))
    },
  })
}

/** The QR code of one of the gym's links, as an SVG image the API draws (FR-GYM-03). */
export const qrSrc = (link: string) => `/api/qr?text=${encodeURIComponent(link)}`
