// The Northside Strength demo gym (SPEC §8), written into an empty database in one transaction, or put back in place
// by the demo reset.
import { asc, eq } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { checkins, gyms, invites, members, nudges, templates, users } from '../schema/index.ts'
import type { UserRole } from '../schema/index.ts'
import { buildNorthside, DEMO_PASSWORD, type NorthsideData, type SeedTemplateInput } from './northside.ts'
import { localDate } from './rules.ts'

export const SEED_TIMEZONE = 'America/Chicago'

export interface SeedNorthsideOptions {
  /** IANA time zone for the gym. Default America/Chicago. */
  timezone?: string
  /** The gym's country, ISO 3166-1 alpha-2. Default `US`. The sample phones stay +1 whatever it is. */
  country?: string
  /** Every row's created_at / updated_at. Default the current time. */
  now?: Date
  /** `YYYY-MM-DD`: the day the data is laid out around. Default `now`'s date in `timezone`. */
  today?: string
  /** The API's password hasher; called once per user with the demo password. */
  hashPassword: (password: string) => string | Promise<string>
  /** The API's token maker; called once, for the kiosk token. */
  newToken: () => string
  /** The gym's nudge templates, in order (the API passes the domain's DEFAULT_TEMPLATES). At least three. */
  templates: readonly SeedTemplateInput[]
}

/** What the demo reset needs: the seed's options, less the token maker, since the kiosk token is kept. */
export type ResetNorthsideOptions = Omit<SeedNorthsideOptions, 'newToken'>

export interface SeededUser {
  id: number
  key: string
  email: string
  name: string
  role: UserRole
}

export interface SeededNorthside {
  gymId: number
  kioskToken: string
  users: SeededUser[]
  /** Member key (`m01`...) to member id. */
  ids: Map<string, number>
  data: NorthsideData
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** The day's data and the demo users' password hashes, made before the transaction opens. */
async function prepare(options: ResetNorthsideOptions) {
  const { timezone = SEED_TIMEZONE, country = 'US', now = new Date(), hashPassword } = options
  const today = options.today ?? localDate(now, timezone)
  const data = buildNorthside({ today, timezone, country, templates: options.templates })
  const hashes = await Promise.all(data.users.map(() => hashPassword(DEMO_PASSWORD)))
  return { data, hashes, t: now.toISOString() }
}

/** Everything that hangs off the gym, written for `gymId`: users, templates, members, check-ins and nudges. */
function writeNorthside(tx: Tx, gymId: number, data: NorthsideData, hashes: readonly string[], t: string) {
  const userIds = new Map<string, number>()
  const seededUsers = data.users.map((u, i): SeededUser => {
    const id = tx
      .insert(users)
      .values({ gymId, email: u.email, name: u.name, role: u.role, passwordHash: hashes[i]!, active: true, createdAt: t })
      .returning({ id: users.id })
      .get().id
    userIds.set(u.key, id)
    return { id, key: u.key, email: u.email, name: u.name, role: u.role }
  })
  const templateIds = data.templates.map(
    (tp) =>
      tx.insert(templates).values({ gymId, name: tp.name, body: tp.body, sort: tp.sort, updatedAt: t }).returning({ id: templates.id }).get().id,
  )
  const ids = new Map<string, number>()
  for (const m of data.members) {
    const id = tx
      .insert(members)
      .values({
        gymId, firstName: m.firstName, lastName: m.lastName, phone: m.phone || null, email: m.email || null,
        joinedOn: m.joinedOn, coachId: userIds.get(m.coachKey) ?? null, externalId: m.externalId, source: 'seed', createdAt: t,
      })
      .returning({ id: members.id })
      .get().id
    ids.set(m.key, id)
  }
  for (const c of data.checkins) {
    tx.insert(checkins).values({ gymId, memberId: ids.get(c.memberKey)!, at: c.at, source: 'seed' }).run()
  }
  for (const n of data.nudges) {
    tx.insert(nudges)
      .values({
        gymId, memberId: ids.get(n.memberKey)!, userId: userIds.get(n.userKey)!, templateId: templateIds[n.templateIndex] ?? null,
        body: n.body, channel: n.channel, sentAt: n.sentAt,
      })
      .run()
  }
  return { users: seededUsers, ids }
}

/**
 * Insert Northside into an empty database: the gym (is_demo), users, templates, members, check-ins and nudges, in one
 * transaction. Members and check-ins have source 'seed'. Into a database that already holds Northside it throws (the
 * slug, emails and phones are unique) and writes nothing.
 */
export async function seedNorthside(db: Db, options: SeedNorthsideOptions): Promise<SeededNorthside> {
  const { data, hashes, t } = await prepare(options)
  const kioskToken = options.newToken()
  return db.transaction((tx) => {
    const g = data.gym
    const gymId = tx
      .insert(gyms)
      .values({ name: g.name, slug: g.slug, timezone: g.timezone, country: g.country, isDemo: true, pilotStartedOn: g.pilotStartedOn, plan: 'pilot', kioskToken, createdAt: t })
      .returning({ id: gyms.id })
      .get().id
    return { gymId, kioskToken, ...writeNorthside(tx, gymId, data, hashes, t), data }
  })
}

/**
 * The demo reset (FR-OPS-03): put the demo gym back as `seedNorthside` lays it out for the day, in place, in one
 * transaction. The gym row stays, with its id, slug and kiosk token, so the kiosk link keeps working; its name, time
 * zone, country and pilot go back to the seed's. Everything that hangs off it is deleted and written again: members
 * (visitors' joins and phones go), check-ins, nudges, invites, templates, and the staff, all active again, whose
 * sessions cascade away, which signs every demo device out. Other gyms are left alone. With no demo gym in the database
 * it writes nothing and answers undefined.
 */
export async function resetNorthside(db: Db, options: ResetNorthsideOptions): Promise<SeededNorthside | undefined> {
  const { data, hashes, t } = await prepare(options)
  return db.transaction((tx) => {
    const demo = tx
      .select({ id: gyms.id, kioskToken: gyms.kioskToken })
      .from(gyms)
      .where(eq(gyms.isDemo, true))
      .orderBy(asc(gyms.id))
      .limit(1)
      .get()
    if (!demo) return undefined
    const gymId = demo.id
    // Children first: nudges name members, staff and templates, and invites name the owner who made them.
    tx.delete(nudges).where(eq(nudges.gymId, gymId)).run()
    tx.delete(checkins).where(eq(checkins.gymId, gymId)).run()
    tx.delete(invites).where(eq(invites.gymId, gymId)).run()
    tx.delete(members).where(eq(members.gymId, gymId)).run()
    tx.delete(templates).where(eq(templates.gymId, gymId)).run()
    tx.delete(users).where(eq(users.gymId, gymId)).run()
    const g = data.gym
    tx.update(gyms)
      .set({ name: g.name, timezone: g.timezone, country: g.country, pilotStartedOn: g.pilotStartedOn, plan: 'pilot' })
      .where(eq(gyms.id, gymId))
      .run()
    return { gymId, kioskToken: demo.kioskToken, ...writeNorthside(tx, gymId, data, hashes, t), data }
  })
}
