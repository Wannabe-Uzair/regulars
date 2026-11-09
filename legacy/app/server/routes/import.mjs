// POST /api/import/preview and /api/import/commit (owner): CSV text in JSON, planned by import/, written in one transaction.
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { requireOwner } from '../auth.mjs'
import { readJson, fail } from '../http.mjs'
import { tx } from '../db.mjs'
import { shortName } from '../metrics.mjs'
import { MSG } from '../messages.mjs'
import { parseCsv } from '../import/csv.mjs'
import { guessMapping } from '../import/mapping.mjs'
import { planMembers, planCheckins } from '../import/plan.mjs'

export const MAX_CSV_BYTES = 2 * 1024 * 1024
const KINDS = ['members', 'checkins']
const COLUMN = { firstName: 'first_name', lastName: 'last_name', phone: 'phone', email: 'email', joinedOn: 'joined_on', coachId: 'coach_id', externalId: 'external_id' }

async function readImport(c) {
  const b = await readJson(c)
  if (!KINDS.includes(b.kind) || typeof b.csv !== 'string') fail(400, MSG.generic)
  if (Buffer.byteLength(b.csv) > MAX_CSV_BYTES) fail(400, MSG.importTooBig)
  return { ...b, parsed: parseCsv(b.csv) }
}

/** The client's mapping {field: columnIndex | columnName | null} as indexes; only the kind's known fields. */
function mappingOf(kind, header, given) {
  if (!given || typeof given !== 'object' || Array.isArray(given)) fail(400, MSG.generic)
  const out = {}
  for (const field of Object.keys(guessMapping(kind, []).mapping)) {
    const v = given[field]
    if (v === null || v === undefined || v === '') out[field] = null
    else if (Number.isInteger(v) && v >= 0 && v < header.length) out[field] = v
    else if (typeof v === 'string' && header.includes(v)) out[field] = header.indexOf(v)
    else fail(400, MSG.generic)
  }
  return out
}

export function importRoutes({ db, now, events }) {
  const r = new Hono()
  r.use('/import/*', requireOwner)
  r.use('/import/*', bodyLimit({ maxSize: 2 * MAX_CSV_BYTES, onError: (c) => c.json({ error: MSG.importTooBig }, 400) }))

  r.post('/import/preview', async (c) => {
    const { kind, parsed } = await readImport(c)
    const guess = guessMapping(kind, parsed.header)
    return c.json({
      columns: parsed.header, sample: parsed.rows.slice(0, 10), mapping: guess.mapping, rowCount: parsed.rows.length,
      problems: [...parsed.problems, ...guess.problems],
    })
  })

  r.post('/import/commit', async (c) => {
    const gym = c.get('gym')
    const b = await readImport(c)
    const { header, rows, rowNumbers } = b.parsed
    const mapping = mappingOf(b.kind, header, b.mapping)
    const t = now().toISOString()
    const emitted = []
    const result = tx(db, () => {
      if (b.kind === 'members') {
        const existing = db.prepare('SELECT * FROM members WHERE gym_id = ?').all(gym.id).map((m) => ({
          id: m.id, externalId: m.external_id, phone: m.phone, firstName: m.first_name, lastName: m.last_name ?? '',
          email: m.email, joinedOn: m.joined_on, coachId: m.coach_id,
        }))
        const coaches = db.prepare('SELECT id, email FROM users WHERE gym_id = ? AND active = 1').all(gym.id)
        const plan = planMembers({ rows, mapping, existing, coaches, rowNumbers })
        const add = db.prepare(
          `INSERT INTO members (gym_id, first_name, last_name, phone, email, joined_on, coach_id, external_id, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'csv', ?)`,
        )
        for (const m of plan.creates) {
          const id = Number(add.run(gym.id, m.firstName, m.lastName || null, m.phone, m.email, m.joinedOn, m.coachId, m.externalId, t).lastInsertRowid)
          emitted.push(['member', { memberId: id }])
        }
        for (const u of plan.updates) {
          const cols = Object.keys(u.changes)
          db.prepare(`UPDATE members SET ${cols.map((k) => `${COLUMN[k]} = ?`).join(', ')} WHERE id = ? AND gym_id = ?`)
            .run(...cols.map((k) => u.changes[k]), u.id, gym.id)
          emitted.push(['member', { memberId: u.id }])
        }
        return { created: plan.creates.length, updated: plan.updates.length, skipped: plan.skipped.length, problems: [...plan.problems, ...plan.skipped.map((s) => s.reason)] }
      }
      const memberRows = db.prepare('SELECT id, external_id, phone, joined_on, first_name, last_name FROM members WHERE gym_id = ?').all(gym.id)
      const byId = new Map(memberRows.map((m) => [m.id, m]))
      const members = memberRows.map((m) => ({ id: m.id, externalId: m.external_id, phone: m.phone, joinedOn: m.joined_on }))
      const existing = db.prepare('SELECT member_id AS memberId, at FROM checkins WHERE gym_id = ?').all(gym.id)
      const plan = planCheckins({ rows, mapping, timezone: gym.timezone, members, existing, now: now(), rowNumbers })
      const add = db.prepare(`INSERT INTO checkins (gym_id, member_id, at, source) VALUES (?, ?, ?, 'csv')`)
      for (const ch of plan.creates) {
        const at = new Date(ch.at).toISOString()
        add.run(gym.id, ch.memberId, at)
        const m = byId.get(ch.memberId)
        emitted.push(['checkin', { memberId: ch.memberId, name: shortName(m.first_name, m.last_name), at }])
      }
      return { created: plan.creates.length, updated: 0, skipped: plan.skipped.length, problems: [...plan.problems, ...plan.skipped.map((s) => s.reason)] }
    })
    for (const [type, data] of emitted) events.emit(gym.id, type, data)
    return c.json({ ...result, problems: [...b.parsed.problems, ...result.problems] })
  })
  return r
}
