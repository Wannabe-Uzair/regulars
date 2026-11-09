// Owner-only gym routes: /api/billing and /api/settings; /api/qr for any signed-in user.
import { Hono } from 'hono'
import os from 'node:os'
import QRCode from 'qrcode'
import { requireUser, requireOwner, gymJson } from '../auth.mjs'
import { readJson, text, fail, originOf } from '../http.mjs'
import { daysBetween, isValidTimeZone } from '../metrics.mjs'
import { gymToday } from '../queries.mjs'
import { MSG } from '../messages.mjs'

export const PILOT_DAYS = 90
export const PRICE_MONTHLY = 99

/** The machine's non-internal IPv4 addresses (what phones on the hotspot can reach). */
export function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((a) => a && (a.family === 'IPv4' || a.family === 4) && !a.internal)
    .map((a) => a.address)
}

export function gymRoutes(deps) {
  const { db, now, port, lan = lanAddresses } = deps
  const r = new Hono()
  r.use('/billing', requireOwner)
  r.use('/settings', requireOwner)
  r.use('/qr', requireUser)

  const phoneUrls = () => lan().map((ip) => `http://${ip}:${port}`)
  const kioskUrl = (origin, gym) => `${origin}/kiosk/${gym.kiosk_token}`
  // The kiosk is a tablet on the network, so its link uses the LAN addresses; the request origin (often
  // localhost on the laptop) only when there are none.
  const kioskUrls = (c, gym, phones) => (phones.length ? phones : [originOf(c)]).map((o) => kioskUrl(o, gym))
  const settings = (c, gym) => {
    const phones = phoneUrls()
    const kiosks = kioskUrls(c, gym, phones)
    return { gym: gymJson(gym), kioskUrl: kiosks[0], kioskUrls: kiosks, phoneUrls: phones }
  }

  r.get('/billing', (c) => {
    const gym = c.get('gym')
    const day = gym.pilot_started_on ? daysBetween(gym.pilot_started_on, gymToday(gym, now)) + 1 : 1
    const pilotDay = Math.min(Math.max(day, 1), PILOT_DAYS)
    return c.json({ plan: gym.plan, pilotStartedOn: gym.pilot_started_on, pilotDay, pilotDaysLeft: PILOT_DAYS - pilotDay, priceMonthly: PRICE_MONTHLY })
  })

  r.get('/settings', (c) => c.json(settings(c, c.get('gym'))))

  r.patch('/settings', async (c) => {
    const gym = c.get('gym')
    const b = await readJson(c)
    const name = b.name === undefined ? gym.name : text(b.name, { max: 80, message: MSG.gymName })
    let timezone = gym.timezone
    if (b.timezone !== undefined) {
      if (!isValidTimeZone(b.timezone)) fail(400, MSG.timezone)
      timezone = b.timezone
    }
    db.prepare('UPDATE gyms SET name = ?, timezone = ? WHERE id = ?').run(name, timezone, gym.id)
    return c.json(settings(c, db.prepare('SELECT * FROM gyms WHERE id = ?').get(gym.id)))
  })

  // Only this gym's phone and kiosk URLs, so the endpoint can't be used to mint arbitrary QR codes.
  r.get('/qr', async (c) => {
    const gym = c.get('gym')
    const want = c.req.query('text') ?? ''
    const phones = phoneUrls()
    const allowed = new Set([...phones, ...[originOf(c), ...phones].map((o) => kioskUrl(o, gym))])
    if (!allowed.has(want)) fail(400, MSG.qrLink)
    const svg = await QRCode.toString(want, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
    return c.body(svg, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=300' })
  })

  return r
}
