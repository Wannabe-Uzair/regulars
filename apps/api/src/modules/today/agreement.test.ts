// The seed's independent status rules (the test oracle) against the Today read model built on the domain's rules,
// over the Northside demo seeded for several days. Replaces the old seed.test.mjs agreement test.
import { Actor, TodayResponse } from '@tenure/contracts'
import { createDb, createRepositories } from '@tenure/db'
import { oracle, SEED_TIMEZONE, seedNorthside } from '@tenure/db/seed'
import { DEFAULT_TEMPLATES } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { createTestContext } from '../../platform/context.ts'
import { todayView } from './service.ts'

const DAYS = [
  '2026-11-06', // TEST_NOW's day
  '2026-11-01', // US daylight saving time ends
  '2026-03-08', // US daylight saving time starts
  '2026-03-10', // the old test's March day
  '2027-01-02', // the old test's day across a new year
]

async function seeded(today: string) {
  const now = new Date(`${today}T18:00:00.000Z`)
  const { db } = createDb(':memory:')
  const seed = await seedNorthside(db, {
    timezone: SEED_TIMEZONE,
    now,
    today,
    hashPassword: (password) => `fake:${password}`,
    newToken: () => 'kiosk-token',
    templates: DEFAULT_TEMPLATES,
  })
  const ctx = createTestContext({ clock: () => new Date(now), repos: createRepositories(db) })
  const gym = await ctx.repos.gyms.findById(seed.gymId)
  const owner = seed.users.find((u) => u.role === 'owner')
  if (!gym || !owner) throw new Error('seed: no gym or owner')
  const actor = Actor.parse({ ...owner, gymId: gym.id })
  return { ctx, gym, actor, seed }
}

describe.each(DAYS)('Northside seeded for %s', (today) => {
  test("the Today read model agrees with the oracle on every in-window member's status, and on the KPIs", async () => {
    const { ctx, gym, actor, seed } = await seeded(today)
    const view = TodayResponse.parse(await todayView(ctx, actor, gym))
    const byId = new Map(view.board.map((s) => [s.id, s]))
    const analysis = oracle.analyze(seed.data, today)
    let checked = 0
    for (const [key, r] of analysis) {
      const s = byId.get(seed.ids.get(key) ?? -1)
      const who = `${r.member.firstName} ${r.member.lastName}`
      if (!r.inWindow) {
        expect(s, who).toBeUndefined()
        continue
      }
      expect(s && { status: s.status, weeks: s.weeks, pace: s.pace, daysSinceLastVisit: s.daysSinceLastVisit }, who).toEqual({
        status: r.status,
        weeks: r.weeks,
        pace: r.pace,
        daysSinceLastVisit: r.daysSinceLastVisit,
      })
      checked++
    }
    expect(checked).toBe(60)
    expect(view.board).toHaveLength(60)
    expect(view.kpis).toEqual(oracle.kpis(analysis.values(), seed.data.nudges, today, gym.timezone))
  })
})

test("the seeded templates are the domain's DEFAULT_TEMPLATES, by name and body, in order", async () => {
  const { ctx, gym } = await seeded('2026-11-06')
  const stored = await ctx.repos.templates.list(gym.id)
  expect(stored.map(({ name, body }) => ({ name, body }))).toEqual(DEFAULT_TEMPLATES.map(({ name, body }) => ({ name, body })))
})
