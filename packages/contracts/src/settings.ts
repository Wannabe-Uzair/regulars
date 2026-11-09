// Settings (owner only): the gym's name, country and time zone, and the kiosk and phone links (FR-GYM-01 to 03). Every
// validation issue's message is an ErrorCode.
import { isValidTimeZone } from '@tenure/domain'
import { z } from 'zod'
import { AuthGym, MarketCountry } from './auth.ts'
import { withCode } from './errors.ts'

/**
 * GET /api/settings, and the answer to a PATCH. In stall mode the links use this computer's LAN addresses, so a phone
 * or the kiosk tablet on the same network can open them; otherwise the address the request came to.
 */
export const SettingsResponse = z.object({
  /** The gym as the session now answers it (`GET /api/auth/me`). */
  gym: AuthGym,
  /** `/kiosk/<token>`: the kiosk on the address this browser already uses, for "Open the kiosk". */
  kioskPath: z.string(),
  /** The kiosk link to show, copy and put in a QR code: the first of `kioskUrls`. */
  kioskUrl: z.string(),
  /** One kiosk link per LAN address, or the request's own origin when there is none. Never empty. */
  kioskUrls: z.array(z.string()).min(1),
  /** The app's address on each LAN address, for "Open on a phone". Empty when the server isn't on the network. */
  phoneUrls: z.array(z.string()),
})
export type SettingsResponse = z.infer<typeof SettingsResponse>

/**
 * PATCH /api/settings: each field only when it changes; one left out keeps its value. The name is trimmed, 1 to 80
 * characters; the country is one of the five markets; the time zone is any IANA name.
 */
export const SettingsPatch = z.object(
  {
    name: z.string(withCode('gymName')).trim().min(1, withCode('gymName')).max(80, withCode('gymName')).optional(),
    country: MarketCountry.optional(),
    timezone: z.string(withCode('timezone')).refine(isValidTimeZone, withCode('timezone')).optional(),
  },
  withCode('generic'),
)
export type SettingsPatch = z.infer<typeof SettingsPatch>

/**
 * GET /api/qr?text=<link>: an SVG QR code, for any signed-in user, of one of this gym's phone or kiosk links only
 * (anything else is 400 `qrLink`), so it can't be used to make codes for other addresses.
 */
export const QrQuery = z.object({ text: z.string(withCode('qrLink')) }, withCode('qrLink'))
export type QrQuery = z.infer<typeof QrQuery>
