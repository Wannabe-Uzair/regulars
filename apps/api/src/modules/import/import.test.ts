// The import's routes. Ported from legacy/app/server/test/import.test.mjs (both) and security.test.mjs's "fix 2"
// route part, then the first version's rules: the plan in the preview, the date order, restores, the gym's scope and
// one live event per commit.
import type { ImportCommitResponse, ImportPreviewResponse, LiveEvent } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { DEFAULT_TEMPLATES, SAMPLE_CHECKINS_CSV, SAMPLE_MEMBERS_CSV } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { call } from '../../test/http.ts'
import { makeWorld, type World } from '../../test/world.ts'

const preview = async (w: World, cookie: string, body: unknown) => {
  const r = await call(w.app, 'POST', '/api/import/preview', { cookie, body })
  return { status: r.status, body: r.body as ImportPreviewResponse }
}
const commit = async (w: World, cookie: string, body: unknown) => {
  const r = await call(w.app, 'POST', '/api/import/commit', { cookie, body })
  return { status: r.status, body: r.body as ImportCommitResponse }
}

const csvMembers = async (w: World) => (await w.ctx.repos.members.listByGym(w.gym.id)).filter((m) => m.source === 'csv')
const csvCheckins = async (w: World) =>
  (await w.ctx.repos.checkins.listByGym(w.gym.id)).filter((c) => c.source === 'csv')

/** The live events the commit publishes. */
function listen(w: World) {
  const seen: LiveEvent[] = []
  w.ctx.bus.subscribe((e) => seen.push(e))
  return seen
}

const lines = (...rows: string[]) => rows.join('\n')

describe('the samples, as the old server imported them', () => {
  test('FR-IMPORT-10 the sample CSVs preview with a full mapping and commit 12 members and their check-ins, once', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const seen = listen(w)

    const pm = await preview(w, cookie, { kind: 'members', csv: SAMPLE_MEMBERS_CSV })
    expect(pm.status).toBe(200)
    expect(pm.body.rowCount).toBe(12)
    expect(pm.body.problems).toEqual([])
    expect(pm.body.sample).toHaveLength(10)
    expect(pm.body.columns).toHaveLength(7)
    // Every field but Full name (the sample has first and last names) has its column.
    for (const [field, col] of Object.entries(pm.body.mapping)) {
      if (field !== 'full_name') expect(typeof col, field).toBe('number')
    }

    const pc = await preview(w, cookie, { kind: 'checkins', csv: SAMPLE_CHECKINS_CSV })
    expect(pc.status).toBe(200)
    expect(pc.body.problems.filter((p) => p.row === null)).toEqual([])
    expect(typeof pc.body.mapping.external_id).toBe('number')
    expect(typeof pc.body.mapping.checked_in_at).toBe('number')

    const cm = await commit(w, cookie, { kind: 'members', csv: SAMPLE_MEMBERS_CSV, mapping: pm.body.mapping })
    expect(cm.status).toBe(200)
    expect(cm.body.created).toBe(12)
    const members = await csvMembers(w)
    expect(members).toHaveLength(12)
    expect(members.filter((m) => m.coachId !== null && m.phone?.startsWith('+1773555'))).toHaveLength(12)
    const cc = await commit(w, cookie, { kind: 'checkins', csv: SAMPLE_CHECKINS_CSV, mapping: pc.body.mapping })
    expect(cc.status).toBe(200)
    expect(cc.body.created).toBe(pc.body.rowCount - cc.body.skipped)
    expect(cc.body.created).toBeGreaterThan(100)
    expect(await csvCheckins(w)).toHaveLength(cc.body.created)
    // One event per commit, however many rows (FR-LIVE-03).
    expect(seen).toEqual([
      { type: 'import.committed', gymId: w.gym.id },
      { type: 'import.committed', gymId: w.gym.id },
    ])

    // The same files again: nothing new. Column names work as a mapping too.
    const names = Object.fromEntries(
      Object.entries(pm.body.mapping).map(([f, i]) => [f, i == null ? null : pm.body.columns[i]]),
    )
    const again = await commit(w, cookie, { kind: 'members', csv: SAMPLE_MEMBERS_CSV, mapping: names })
    expect(again.status).toBe(200)
    expect([again.body.created, again.body.updated, again.body.skipped]).toEqual([0, 0, 12])
    const againC = await commit(w, cookie, { kind: 'checkins', csv: SAMPLE_CHECKINS_CSV, mapping: pc.body.mapping })
    expect(againC.body.created).toBe(0)
    expect(await w.ctx.repos.members.listByGym(w.gym.id)).toHaveLength(12)
    expect(await csvCheckins(w)).toHaveLength(cc.body.created)
    expect(seen).toHaveLength(2)
  })

  test('FR-IMPORT-01 import is owner only, and a CSV over 2 MB is refused with a sentence', async () => {
    const w = await makeWorld()
    const coach = await w.login(w.coach.email)
    const csv = SAMPLE_MEMBERS_CSV
    expect((await preview(w, coach, { kind: 'members', csv })).status).toBe(403)
    expect((await commit(w, coach, { kind: 'members', csv, mapping: {} })).status).toBe(403)
    expect((await preview(w, '', { kind: 'members', csv })).status).toBe(401)
    expect((await commit(w, '', { kind: 'members', csv })).status).toBe(401)
    const owner = await w.login(w.owner.email)
    const big = await call(w.app, 'POST', '/api/import/preview', {
      cookie: owner,
      body: { kind: 'members', csv: 'a'.repeat(2 * 1024 * 1024 + 1) },
    })
    expect([big.status, big.body]).toEqual([400, { error: { code: 'importTooBig', message: t('api.importTooBig') } }])
    expect((await preview(w, owner, { kind: 'nope', csv })).status).toBe(400)
    expect(await w.ctx.repos.members.listByGym(w.gym.id)).toEqual([])
  })

  test('NFR-SEC-05 an import may be up to 4 MB; over that is 413', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const csv = `first_name,last_name,phone\n${'Ana,Ruiz,+13125550100\n'.repeat(5000)}` // about 110 KB
    const ok = await preview(w, owner, { kind: 'members', csv })
    expect(ok.status, JSON.stringify(ok.body).slice(0, 200)).toBe(200)
    const huge = JSON.stringify({ kind: 'members', csv: 'a'.repeat(4 * 1024 * 1024 + 1) })
    const over = await call(w.app, 'POST', '/api/import/commit', {
      cookie: owner,
      body: huge,
      headers: { 'content-length': String(huge.length) },
    })
    expect([over.status, over.body]).toEqual([413, { error: { code: 'importTooBig', message: t('api.importTooBig') } }])
  })
})

describe('the preview', () => {
  test('FR-IMPORT-08 the preview plans the file and saves nothing', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const seen = listen(w)
    const r = await preview(w, owner, {
      kind: 'members',
      csv: lines('Name,Joined,Mobile', 'Maria Lopez,09/14/2026,312 555 0142', 'Cher,09/15/2026,12', ',09/15/2026,'),
    })
    expect(r.status).toBe(200)
    expect(r.body.counts).toEqual({ created: 2, updated: 0, restored: 0, skipped: 1 })
    expect(r.body.missing).toEqual([])
    expect(r.body.sample).toEqual([
      { row: 2, cells: ['Maria Lopez', '09/14/2026', '312 555 0142'] },
      { row: 3, cells: ['Cher', '09/15/2026', '12'] },
      { row: 4, cells: ['', '09/15/2026', ''] },
    ])
    expect(r.body.problems).toEqual([
      {
        code: 'badPhone',
        row: 3,
        message: t('import.problem', { n: 3, problem: t('import.problem.badPhone', { value: '12' }) }),
      },
      { code: 'noName', row: 4, message: t('import.problem', { n: 4, problem: t('import.problem.noName') }) },
    ])
    expect(await w.ctx.repos.members.listByGym(w.gym.id)).toEqual([])
    expect(seen).toEqual([])
  })

  test('FR-IMPORT-02 a mapping that lacks a required field names it, plans nothing, and the request can fill it', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const csv = lines('Given,Surname,Started', 'Ana,Ruiz,2026-09-01')
    const r = await preview(w, owner, { kind: 'members', csv })
    expect(r.body.missing).toEqual(['name', 'joinedOn'])
    expect(r.body.counts).toBeNull()
    expect(r.body.problems.map((p) => [p.code, p.message])).toEqual([
      ['findName', t('import.problem.findName')],
      ['findJoinDate', t('import.problem.findJoinDate')],
    ])
    const mapped = await preview(w, owner, {
      kind: 'members',
      csv,
      mapping: { first_name: 0, last_name: 1, joined_on: 'Started' },
    })
    expect(mapped.body.missing).toEqual([])
    expect(mapped.body.mapping).toMatchObject({ first_name: 0, last_name: 1, joined_on: 2, phone: null })
    expect(mapped.body.counts).toEqual({ created: 1, updated: 0, restored: 0, skipped: 0 })
    // A column the file doesn't have is refused.
    expect((await preview(w, owner, { kind: 'members', csv, mapping: { first_name: 3 } })).status).toBe(400)
    expect((await commit(w, owner, { kind: 'members', csv, mapping: { first_name: 'Name' } })).status).toBe(400)
    // A commit without the columns writes nothing and says why.
    const none = await commit(w, owner, { kind: 'members', csv })
    expect(none.body).toEqual({
      created: 0,
      updated: 0,
      restored: 0,
      skipped: 0,
      problems: [
        { code: 'noNameColumn', row: null, message: t('import.problem.noNameColumn') },
        { code: 'noJoinDateColumn', row: null, message: t('import.problem.noJoinDateColumn') },
      ],
    })
  })
})

describe('dates and phones in the gym country', () => {
  test('FR-IMPORT-04 a UK gym reads dates day first, says so, shows the first rows as read, and can flip', async () => {
    const w = await makeWorld()
    await w.ctx.repos.gyms.updateSettings(w.gym.id, { name: w.gym.name, timezone: 'Europe/London', country: 'GB' })
    const owner = await w.login(w.owner.email)
    const csv = lines('First Name,Join Date,Mobile', 'Ana,03/04/2026,020 7946 0958', 'Ben,05/06/2026,')
    const r = await preview(w, owner, { kind: 'members', csv })
    expect(r.body.dates).toEqual({
      order: 'dmy',
      source: 'country',
      file: null,
      country: 'dmy',
      rows: [
        { row: 2, raw: '03/04/2026', date: '2026-04-03', at: null },
        { row: 3, raw: '05/06/2026', date: '2026-06-05', at: null },
      ],
    })
    const flipped = await preview(w, owner, { kind: 'members', csv, dateOrder: 'mdy' })
    expect(flipped.body.dates).toMatchObject({
      order: 'mdy',
      source: 'request',
      rows: [{ date: '2026-03-04' }, { date: '2026-05-06' }],
    })
    expect((await commit(w, owner, { kind: 'members', csv })).body.created).toBe(2)
    const [ana] = await w.ctx.repos.members.listByGym(w.gym.id)
    expect(ana).toMatchObject({ firstName: 'Ana', joinedOn: '2026-04-03', phone: '+442079460958' })
  })

  test("FR-IMPORT-04 a file's own dates settle the order at a US gym", async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const r = await preview(w, owner, {
      kind: 'members',
      csv: lines('First Name,Join Date', 'Ana,03/04/2026', 'Ben,25/04/2026'),
    })
    expect(r.body.dates).toMatchObject({ order: 'dmy', source: 'file', file: 'dmy', country: 'mdy' })
    expect(r.body.counts).toMatchObject({ created: 2, skipped: 0 })
  })

  test('FR-IMPORT-07 a check-in within an hour of a kiosk check-in is skipped; one before the member joined too', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    await commit(w, owner, { kind: 'members', csv: lines('Member ID,First Name,Join Date', 'M1,Ana,2026-11-01') })
    const [ana] = await w.ctx.repos.members.listByGym(w.gym.id)
    if (!ana) throw new Error('no member')
    // 11:00 in Chicago today.
    await w.ctx.repos.checkins.recordAtKiosk({
      gymId: w.gym.id,
      memberId: ana.id,
      at: '2026-11-06T17:00:00.000Z',
      unlessSince: '2026-11-06T16:00:00.000Z',
    })
    const csv = lines('Member ID,Check-in Time', 'M1,2026-11-06 11:30', 'M1,2026-11-05 18:00', 'M1,2026-10-31 18:00')
    const r = await commit(w, owner, { kind: 'checkins', csv })
    expect(r.body).toMatchObject({ created: 1, skipped: 2 })
    expect(r.body.problems.map((p) => [p.row, p.code])).toEqual([
      [2, 'withinHour'],
      [4, 'beforeJoined'],
    ])
    expect(r.body.problems[1]?.message).toBe(
      t('import.problem', { n: 4, problem: t('import.problem.beforeJoined', { date: 'Nov 1, 2026' }) }),
    )
    expect(await csvCheckins(w)).toMatchObject([{ memberId: ana.id, at: '2026-11-06T00:00:00.000Z' }])
  })
})

/** Archive members as staff do, through the members module's route (FR-MEMBER-05). */
async function archive(w: World, cookie: string, ids: readonly number[]) {
  for (const id of ids) {
    const r = await call(w.app, 'POST', `/api/members/${id}/archive`, { cookie })
    if (r.status !== 200) throw new Error(`archive ${id}: ${r.status} ${JSON.stringify(r.body)}`)
  }
}

describe('restores, the gym and the coach', () => {
  test('FR-IMPORT-09 a row that matches an archived member restores them, and the preview and the result say so', async () => {
    const base = await makeWorld()
    const owner = await base.login(base.owner.email)
    await commit(base, owner, {
      kind: 'members',
      csv: lines('Member ID,First Name,Join Date', 'M1,Lena,2026-09-01', 'M2,Omar,2026-09-01', 'M3,Sam,2026-09-01'),
    })
    const [lena, omar] = await base.ctx.repos.members.listByGym(base.gym.id)
    if (!lena || !omar) throw new Error('no members')
    await archive(base, owner, [lena.id, omar.id])
    const seen = listen(base)

    const members = {
      kind: 'members',
      csv: lines('Member ID,First Name,Join Date', 'M1,Lena,2026-09-01', 'M3,Sam,2026-09-01'),
    }
    const p = await preview(base, owner, members)
    expect(p.body.counts).toEqual({ created: 0, updated: 1, restored: 1, skipped: 1 })
    expect(p.body.problems.map((x) => [x.row, x.code, x.message])).toEqual([
      [2, 'restored', t('import.problem', { n: 2, problem: t('import.problem.restored') })],
      [3, 'upToDate', t('import.problem', { n: 3, problem: t('import.problem.upToDate') })],
    ])
    const c = await commit(base, owner, members)
    expect(c.body).toMatchObject({ created: 0, updated: 1, restored: 1, skipped: 1 })

    const visits = {
      kind: 'checkins',
      csv: lines('Member ID,Check-in Time', 'M2,2026-10-01 18:00', 'M2,2026-10-02 18:00'),
    }
    const pc = await preview(base, owner, visits)
    expect(pc.body.counts).toEqual({ created: 2, updated: 1, restored: 1, skipped: 0 })
    const cc = await commit(base, owner, visits)
    expect(cc.body).toMatchObject({ created: 2, updated: 1, restored: 1, skipped: 0 })
    expect(cc.body.problems.map((x) => x.code)).toEqual(['restored'])
    expect(seen).toEqual([
      { type: 'import.committed', gymId: base.gym.id },
      { type: 'import.committed', gymId: base.gym.id },
    ])
  })

  test("FR-PRIV-02 another gym's members and coaches are not found: a check-in for one is skipped, a coach is unknown", async () => {
    const w = await makeWorld()
    const other = await w.ctx.repos.gyms.createWithOwner({
      gym: {
        name: 'Eastside',
        slug: 'eastside',
        timezone: 'America/Chicago',
        pilotStartedOn: '2026-11-01',
        kioskToken: 'k-east',
      },
      owner: { email: 'eve@eastside.test', name: 'Eve', passwordHash: 'h' },
      templates: DEFAULT_TEMPLATES,
      createdAt: w.ctx.clock().toISOString(),
    })
    await w.ctx.repos.members.applyImport({
      gymId: other.gym.id,
      at: w.ctx.clock().toISOString(),
      creates: [
        {
          firstName: 'Far',
          lastName: null,
          phone: '+13125550190',
          email: null,
          joinedOn: '2026-09-01',
          coachId: null,
          externalId: 'X1',
        },
      ],
      updates: [],
      checkins: [],
    })
    const owner = await w.login(w.owner.email)
    const r = await commit(w, owner, {
      kind: 'members',
      csv: lines('Member ID,First Name,Join Date,Coach Email', 'X1,Near,2026-09-01,eve@eastside.test'),
    })
    expect(r.body).toMatchObject({ created: 1, updated: 0 })
    expect(r.body.problems.map((p) => p.code)).toEqual(['unknownCoach'])
    const [near] = await w.ctx.repos.members.listByGym(w.gym.id)
    expect(near).toMatchObject({ firstName: 'Near', coachId: null, externalId: 'X1' })
    // The other gym's member is untouched; a check-in by their phone matches no one here.
    const visit = await commit(w, owner, {
      kind: 'checkins',
      csv: lines('Phone,Check-in Time', '312 555 0190,2026-10-01 18:00'),
    })
    expect(visit.body).toMatchObject({ created: 0, skipped: 1 })
    expect(visit.body.problems.map((p) => p.code)).toEqual(['noMemberPhone'])
    expect(await w.ctx.repos.members.listByGym(other.gym.id)).toMatchObject([{ firstName: 'Far' }])
  })

  test("FR-IMPORT-08 a row's coach is the gym's: active staff by email, any case", async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    await w.ctx.repos.users.setActive(w.gym.id, w.coach2.id, false)
    const r = await commit(w, owner, {
      kind: 'members',
      csv: lines(
        'First Name,Join Date,Coach',
        'Ana,2026-09-01,PRIYA@northside.test',
        'Ben,2026-09-01,jordan@northside.test',
      ),
    })
    expect(r.body.problems.map((p) => [p.row, p.code])).toEqual([[3, 'unknownCoach']])
    expect((await w.ctx.repos.members.listByGym(w.gym.id)).map((m) => [m.firstName, m.coachId])).toEqual([
      ['Ana', w.coach.id],
      ['Ben', null],
    ])
  })

  test('FR-IMPORT-10 a commit that writes nothing publishes nothing', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const seen = listen(w)
    const r = await commit(w, owner, { kind: 'checkins', csv: lines('Member ID,Check-in Time', 'M9,2026-10-01 18:00') })
    expect(r.body).toMatchObject({ created: 0, updated: 0, skipped: 1 })
    expect(seen).toEqual([])
  })
})

describe('speed', () => {
  test("NFR-PERF-04 a 2,000-row file's check step takes the server well under a second", async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const rows = Array.from({ length: 2000 }, (_, i) => {
      const n = String(i).padStart(4, '0')
      const day = String((i % 28) + 1).padStart(2, '0')
      return `M-${n},First${i},Last${i},+1 312-555-${n},m${i}@example.test,09/${day}/2026,priya@northside.test`
    })
    const csv = lines('Member ID,First Name,Last Name,Mobile,Email,Member Since,Coach Email', ...rows)
    const started = performance.now()
    const r = await preview(w, owner, { kind: 'members', csv })
    const ms = performance.now() - started
    expect(r.status).toBe(200)
    expect(r.body.rowCount).toBe(2000)
    expect(r.body.counts).toMatchObject({ created: 2000, skipped: 0 })
    expect(ms).toBeLessThan(500)
  })
})
