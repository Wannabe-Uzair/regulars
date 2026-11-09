// Settings: the gym's own fields, the kiosk and phone links, and their QR codes.
import type { SettingsPatch, SettingsResponse } from '@tenure/contracts'
import type { Gym } from '@tenure/db'
import { zoneForCountry } from '@tenure/domain'
import QRCode from 'qrcode'
import type { AppContext } from '../../platform/context.ts'
import { authGym } from '../auth/index.ts'

const kioskPathOf = (gym: Gym) => `/kiosk/${gym.kioskToken}`

/**
 * The phone and kiosk links. In stall mode (`ctx.lan` not empty) each LAN address on the server's port, since the
 * kiosk is a tablet and the phones are on the network; otherwise the kiosk on `origin`, the address the request came
 * to, and no phone links.
 */
function links(ctx: AppContext, gym: Gym, origin: string) {
  const phoneUrls = ctx.lan().map((ip) => `http://${ip}:${ctx.config.port}`)
  const kioskPath = kioskPathOf(gym)
  const kioskUrls = (phoneUrls.length > 0 ? phoneUrls : [origin]).map((o) => `${o}${kioskPath}`)
  return { kioskPath, kioskUrls, phoneUrls }
}

export function settingsView(ctx: AppContext, gym: Gym, origin: string): SettingsResponse {
  const { kioskPath, kioskUrls, phoneUrls } = links(ctx, gym, origin)
  return { gym: authGym(gym), kioskPath, kioskUrl: kioskUrls[0] ?? `${origin}${kioskPath}`, kioskUrls, phoneUrls }
}

/**
 * The fields to save. A Country change keeps the zone (the one sent, else the gym's) only when it is in the new country,
 * and otherwise moves it to the country's own (answers.md, 7 Nov), as the Settings form does.
 */
function fieldsOf(gym: Gym, patch: SettingsPatch): SettingsPatch {
  if (patch.country === undefined || patch.country === gym.country) return patch
  return { ...patch, timezone: zoneForCountry(patch.country, patch.timezone ?? gym.timezone) }
}

/** Save the fields given, then tell everyone in the gym (FR-GYM-05). */
export async function updateSettings(
  ctx: AppContext,
  gym: Gym,
  patch: SettingsPatch,
  origin: string,
): Promise<SettingsResponse> {
  const saved = await ctx.repos.gyms.updateSettings(gym.id, fieldsOf(gym, patch))
  if (!saved) throw new Error(`gym ${gym.id} is gone`)
  ctx.bus.publish({ type: 'settings.updated', gymId: saved.id })
  return settingsView(ctx, saved, origin)
}

/**
 * The QR code of `text`, as SVG, when it is one of the gym's phone or kiosk links (the kiosk on the request's origin
 * too, as the old server allowed); null for anything else. A 4-module margin keeps the white quiet zone a scanner
 * needs inside the image, so the code reads on the dark theme too.
 */
export async function qrSvg(ctx: AppContext, gym: Gym, origin: string, text: string): Promise<string | null> {
  const { kioskPath, phoneUrls } = links(ctx, gym, origin)
  const allowed = new Set([...phoneUrls, ...[origin, ...phoneUrls].map((o) => `${o}${kioskPath}`)])
  if (!allowed.has(text)) return null
  return QRCode.toString(text, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' })
}
