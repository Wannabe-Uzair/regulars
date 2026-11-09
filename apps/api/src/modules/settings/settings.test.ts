import { type LiveEvent, MeResponse, SettingsResponse, SignupResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { call, cookieOf, HOST } from '../../test/http.ts'
import { makeWorld, PASSWORD } from '../../test/world.ts'

const err = (code: string) => ({ error: { code, message: t(`api.${code}` as never) } })
const qr = (text: string) => `/api/qr?text=${encodeURIComponent(text)}`

describe('GET and PATCH /api/settings', () => {
  // Ported from legacy/app/server/test/gym.test.mjs:34, with the country added.
  test('FR-GYM-03 settings: kiosk URL, phone URLs, and PATCH name and timezone', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const r = await call(w.app, 'GET', '/api/settings', { cookie })
    expect(r.status).toBe(200)
    const body = SettingsResponse.strict().parse(r.body)
    // The kiosk link is for a tablet on the network: the LAN address, not the origin the laptop used.
    expect(body.kioskUrl).toBe('http://192.168.137.1:5175/kiosk/kiosk-token-1')
    expect(body.kioskUrls).toEqual(['http://192.168.137.1:5175/kiosk/kiosk-token-1'])
    expect(body.phoneUrls).toEqual(['http://192.168.137.1:5175'])
    expect(body.kioskPath).toBe('/kiosk/kiosk-token-1')
    expect(body.gym).toMatchObject({ id: w.gym.id, name: 'Northside Strength', timezone: 'America/Chicago', country: 'US' })
    expect(body.gym).not.toHaveProperty('kioskToken')
    const p = await call(w.app, 'PATCH', '/api/settings', {
      cookie,
      body: { name: 'Northside Strength & Conditioning', timezone: 'America/New_York' },
    })
    expect(p.status).toBe(200)
    const patched = SettingsResponse.strict().parse(p.body)
    expect(patched.gym.name).toBe('Northside Strength & Conditioning')
    expect(patched.gym.timezone).toBe('America/New_York')
    expect(patched.kioskUrl).toBe(body.kioskUrl)
    const bad = await call(w.app, 'PATCH', '/api/settings', { cookie, body: { timezone: 'Mars/Olympus' } })
    expect([bad.status, bad.body]).toEqual([400, err('timezone')])
  })

  test('FR-GYM-01 an owner changes the country to another of the five, and only the fields sent change', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const moved = await call(w.app, 'PATCH', '/api/settings', { cookie, body: { country: 'GB', timezone: 'Europe/London' } })
    expect(SettingsResponse.parse(moved.body).gym).toMatchObject({ name: 'Northside Strength', country: 'GB', timezone: 'Europe/London' })
    const renamed = await call(w.app, 'PATCH', '/api/settings', { cookie, body: { name: '  Northside Leeds  ' } })
    expect(SettingsResponse.parse(renamed.body).gym).toMatchObject({ name: 'Northside Leeds', country: 'GB', timezone: 'Europe/London' })
    const same = await call(w.app, 'PATCH', '/api/settings', { cookie, body: {} })
    expect([same.status, SettingsResponse.parse(same.body).gym]).toEqual([200, SettingsResponse.parse(renamed.body).gym])
    expect(await w.ctx.repos.gyms.findById(w.gym.id)).toMatchObject({ name: 'Northside Leeds', country: 'GB', timezone: 'Europe/London' })
  })

  test("FR-GYM-01 a Country change moves the zone to the country's own unless the zone is in the new country", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const save = async (body: object) =>
      SettingsResponse.parse((await call(w.app, 'PATCH', '/api/settings', { cookie, body })).body).gym
    // Chicago isn't in Pakistan: the gym takes Karachi.
    expect(await save({ country: 'PK' })).toMatchObject({ country: 'PK', timezone: 'Asia/Karachi' })
    // A zone sent with the country that is in it stays: the owner can pick another of the country's zones.
    expect(await save({ country: 'CA', timezone: 'America/Vancouver' })).toMatchObject({ country: 'CA', timezone: 'America/Vancouver' })
    // A zone sent with the country that isn't in it moves too.
    expect(await save({ country: 'GB', timezone: 'America/Vancouver' })).toMatchObject({ country: 'GB', timezone: 'Europe/London' })
    expect(await save({ country: 'CA' })).toMatchObject({ country: 'CA', timezone: 'America/Toronto' })
    expect(await save({ country: 'US' })).toMatchObject({ country: 'US', timezone: 'America/New_York' })
    // The same country again is no change: the zone sent is kept.
    expect(await save({ country: 'US', timezone: 'America/Denver' })).toMatchObject({ country: 'US', timezone: 'America/Denver' })
    expect(await w.ctx.repos.gyms.findById(w.gym.id)).toMatchObject({ country: 'US', timezone: 'America/Denver' })
  })

  test.each([
    // With a good name beside it, so a refusal is seen to keep the good field out too.
    ['a country outside the five', { name: 'Renamed', country: 'IN' }, 'country'],
    ['a code that is no country', { name: 'Renamed', country: 'ZZ' }, 'country'],
    ['the market as a word', { name: 'Renamed', country: 'UK' }, 'country'],
    ['no country, as null', { name: 'Renamed', country: null }, 'country'],
    ['a blank name', { name: '   ', country: 'GB' }, 'gymName'],
    ['a name over 80', { name: 'x'.repeat(81) }, 'gymName'],
    ['a name that is not text', { name: 7 }, 'gymName'],
    ['an unknown time zone', { name: 'Renamed', timezone: 'Mars/Olympus' }, 'timezone'],
    ['a list, not an object', [{ name: 'Renamed' }], 'generic'],
  ])('FR-GYM-01 a PATCH with %s is refused with its code, and changes nothing', async (_, body, code) => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const events: LiveEvent[] = []
    w.ctx.bus.subscribe((e) => events.push(e))
    const r = await call(w.app, 'PATCH', '/api/settings', { cookie, body })
    expect([r.status, r.body]).toEqual([400, err(code)])
    expect(await w.ctx.repos.gyms.findById(w.gym.id)).toEqual(w.gym)
    expect(events).toEqual([])
  })

  test('FR-GYM-01 settings are for owners: a coach gets 403 role, and signed out 401 signIn', async () => {
    const w = await makeWorld()
    const coach = await w.login(w.coach.email)
    for (const method of ['GET', 'PATCH'] as const) {
      const body = method === 'PATCH' ? { name: 'Coach Gym' } : undefined
      const asCoach = await call(w.app, method, '/api/settings', { cookie: coach, body })
      expect([asCoach.status, asCoach.body], method).toEqual([403, err('role')])
      const signedOut = await call(w.app, method, '/api/settings', { body })
      expect([signedOut.status, signedOut.body], method).toEqual([401, err('signIn')])
    }
    expect((await w.ctx.repos.gyms.findById(w.gym.id))?.name).toBe('Northside Strength')
  })

  test("FR-PRIV-02 each owner sees and changes only their own gym's settings", async () => {
    const w = await makeWorld()
    const signup = await call(w.app, 'POST', '/api/auth/signup', {
      body: { gymName: 'Southside Iron', name: 'Ana Ruiz', email: 'ana@southside.test', password: PASSWORD, country: 'CA', timezone: 'America/Toronto' },
    })
    const other = SignupResponse.parse(signup.body).gym
    const cookie = cookieOf(signup.res)
    const mine = SettingsResponse.parse((await call(w.app, 'GET', '/api/settings', { cookie })).body)
    expect(mine.gym).toMatchObject({ id: other.id, name: 'Southside Iron', country: 'CA' })
    expect(mine.kioskPath).not.toBe('/kiosk/kiosk-token-1')
    await call(w.app, 'PATCH', '/api/settings', { cookie, body: { name: 'Southside Strength', country: 'US' } })
    expect(await w.ctx.repos.gyms.findById(w.gym.id)).toEqual(w.gym)
    expect((await w.ctx.repos.gyms.findById(other.id))?.name).toBe('Southside Strength')
  })

  test('FR-GYM-01 saving updates the signed-in gym everywhere: every session of the gym answers the new gym', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const coach = await w.login(w.coach.email)
    const p = await call(w.app, 'PATCH', '/api/settings', {
      cookie: owner,
      body: { name: 'Karachi Strength', country: 'PK', timezone: 'Asia/Karachi' },
    })
    const saved = SettingsResponse.parse(p.body).gym
    for (const cookie of [owner, coach]) {
      const me = MeResponse.parse((await call(w.app, 'GET', '/api/auth/me', { cookie })).body)
      expect(me.gym).toEqual(saved)
    }
    expect(saved).toMatchObject({ name: 'Karachi Strength', country: 'PK', timezone: 'Asia/Karachi' })
  })

  test('FR-GYM-05 a saved change publishes settings.updated for the gym, after the write', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const seen: { event: LiveEvent; name: string | undefined }[] = []
    w.ctx.bus.subscribe((event) => {
      // Read from the handler: the write is already there when the event goes out.
      void w.ctx.repos.gyms.findById(w.gym.id).then((g) => seen.push({ event, name: g?.name }))
    })
    await call(w.app, 'PATCH', '/api/settings', { cookie, body: { name: 'Northside Two' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(seen).toEqual([{ event: { type: 'settings.updated', gymId: w.gym.id }, name: 'Northside Two' }])
  })
})

describe('the kiosk and phone links, and GET /api/qr', () => {
  // Ported from legacy/app/server/test/gym.test.mjs:50.
  test('FR-GYM-03 settings: one kiosk URL per LAN address, the first as kioskUrl; the request origin when there is none', async () => {
    const two = await makeWorld({ lan: () => ['192.168.137.1', '10.0.0.7'] })
    const r = SettingsResponse.parse((await call(two.app, 'GET', '/api/settings', { cookie: await two.login(two.owner.email) })).body)
    expect(r.kioskUrl).toBe('http://192.168.137.1:5175/kiosk/kiosk-token-1')
    expect(r.kioskUrls).toEqual(['http://192.168.137.1:5175/kiosk/kiosk-token-1', 'http://10.0.0.7:5175/kiosk/kiosk-token-1'])
    expect(r.phoneUrls).toEqual(['http://192.168.137.1:5175', 'http://10.0.0.7:5175'])
    const cookie = await two.login(two.coach.email)
    for (const u of [...r.kioskUrls, ...r.phoneUrls]) expect((await call(two.app, 'GET', qr(u), { cookie })).status, u).toBe(200)
    const none = await makeWorld({ lan: () => [] })
    const n = SettingsResponse.parse((await call(none.app, 'GET', '/api/settings', { cookie: await none.login(none.owner.email) })).body)
    expect(n.kioskUrl).toBe(`http://${HOST}/kiosk/kiosk-token-1`)
    expect(n.kioskUrls).toEqual([n.kioskUrl])
    expect(n.phoneUrls).toEqual([])
    const q = await call(none.app, 'GET', qr(n.kioskUrl), { cookie: await none.login(none.coach.email) })
    expect(q.status).toBe(200)
  })

  // Ported from legacy/app/server/test/gym.test.mjs:66.
  test("FR-GYM-03 qr: an SVG for this gym's phone and kiosk URLs only, for any signed-in user", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.coach.email)
    const phone = await call(w.app, 'GET', qr('http://192.168.137.1:5175'), { cookie })
    expect(phone.status).toBe(200)
    expect(phone.res.headers.get('content-type')).toBe('image/svg+xml')
    expect(phone.res.headers.get('cache-control')).toBe('private, max-age=300')
    expect(phone.body).toMatch(/^<svg/)
    const kiosk = await call(w.app, 'GET', qr('http://192.168.137.1:5175/kiosk/kiosk-token-1'), { cookie })
    expect(kiosk.status).toBe(200)
    const other = await call(w.app, 'GET', qr('https://evil.example'), { cookie })
    expect([other.status, other.body]).toEqual([400, err('qrLink')])
    expect((await call(w.app, 'GET', '/api/qr?text=x')).status).toBe(401)
  })

  test("FR-GYM-03 qr: no text, or another gym's kiosk link, is refused with 400 qrLink", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const none = await call(w.app, 'GET', '/api/qr', { cookie })
    expect([none.status, none.body]).toEqual([400, err('qrLink')])
    const signup = await call(w.app, 'POST', '/api/auth/signup', {
      body: { gymName: 'Southside Iron', name: 'Ana Ruiz', email: 'ana@southside.test', password: PASSWORD, country: 'US' },
    })
    const theirs = SettingsResponse.parse((await call(w.app, 'GET', '/api/settings', { cookie: cookieOf(signup.res) })).body)
    const r = await call(w.app, 'GET', qr(theirs.kioskUrl), { cookie })
    expect([r.status, r.body]).toEqual([400, err('qrLink')])
  })

  test('FR-GYM-03 the QR code carries its own white quiet zone of 4 modules', async () => {
    const w = await makeWorld()
    const r = await call(w.app, 'GET', qr('http://192.168.137.1:5175'), { cookie: await w.login(w.owner.email) })
    const svg = String(r.body)
    const [, size] = /viewBox="0 0 (\d+) \1"/.exec(svg) ?? []
    // A version-2 code is 25 modules; with a margin of 4 on each side the image is 33.
    expect(Number(size)).toBe(33)
    expect(svg).toMatch(/<path fill="#ffffff" d="M0 0h33v33H0z"\/>/)
  })
})
