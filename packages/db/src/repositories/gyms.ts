import { asc, desc, eq } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { gyms, templates, users } from '../schema/index.ts'
import { guardDuplicates } from './errors.ts'
import type { Gym, User } from './records.ts'

export interface NewGymWithOwner {
  gym: {
    name: string
    /** The slug to try first. If a gym already has it, the gym gets `slug-2`, then `slug-3`, and so on. */
    slug: string
    timezone: string
    /** ISO 3166-1 alpha-2, such as `PK`. Left out, the gym gets the column default, `US`. */
    country?: string
    /** `YYYY-MM-DD`. */
    pilotStartedOn: string
    kioskToken: string
  }
  owner: { email: string; name: string; passwordHash: string }
  /** The gym's starting templates, in order. Each gets `sort` 1, 2, 3… */
  templates: readonly { name: string; body: string }[]
  /** UTC ISO timestamp: the gym's and owner's `createdAt` and the templates' `updatedAt`. */
  createdAt: string
}

export function gymsRepository(db: Db) {
  return {
    async findById(id: number): Promise<Gym | undefined> {
      return db.select().from(gyms).where(eq(gyms.id, id)).get()
    },

    async findByKioskToken(kioskToken: string): Promise<Gym | undefined> {
      return db.select().from(gyms).where(eq(gyms.kioskToken, kioskToken)).get()
    },

    /** The gym a single-gym install shows at start-up: the demo gym if there is one, else the oldest. */
    async findDefault(): Promise<Gym | undefined> {
      return db.select().from(gyms).orderBy(desc(gyms.isDemo), asc(gyms.id)).limit(1).get()
    },

    /**
     * Sign-up: the gym (on the pilot plan, not a demo), its active owner and its templates, in one transaction.
     * Throws DuplicateError('email') when the owner's email is taken, and leaves nothing behind.
     */
    async createWithOwner(input: NewGymWithOwner): Promise<{ gym: Gym; owner: User }> {
      const { createdAt } = input
      return guardDuplicates(() =>
        db.transaction((tx) => {
          const taken = (slug: string) => tx.select({ id: gyms.id }).from(gyms).where(eq(gyms.slug, slug)).get()
          let slug = input.gym.slug
          for (let i = 2; taken(slug); i++) slug = `${input.gym.slug}-${i}`
          const gym = tx
            .insert(gyms)
            .values({ ...input.gym, slug, isDemo: false, plan: 'pilot', createdAt })
            .returning()
            .get()
          const owner = tx
            .insert(users)
            .values({ ...input.owner, gymId: gym.id, role: 'owner', active: true, createdAt })
            .returning()
            .get()
          if (input.templates.length > 0) {
            tx.insert(templates)
              .values(input.templates.map((t, i) => ({ gymId: gym.id, name: t.name, body: t.body, sort: i + 1, updatedAt: createdAt })))
              .run()
          }
          return { gym, owner }
        }),
      )
    },

    /**
     * Set the gym's name, time zone and country (ISO 3166-1 alpha-2), each only when given: a field left out keeps its
     * value, so two saves of different fields don't undo each other. The gym after the write; undefined when there is
     * no such gym.
     */
    async updateSettings(
      id: number,
      settings: { name?: string; timezone?: string; country?: string },
    ): Promise<Gym | undefined> {
      const given = Object.fromEntries(Object.entries(settings).filter(([, v]) => v !== undefined))
      if (Object.keys(given).length === 0) return db.select().from(gyms).where(eq(gyms.id, id)).get()
      return db.update(gyms).set(given).where(eq(gyms.id, id)).returning().get()
    },
  }
}

export type GymsRepository = ReturnType<typeof gymsRepository>
