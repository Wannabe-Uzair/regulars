import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** One row per gym: the tenant every other table hangs off. */
export const gyms = sqliteTable('gyms', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  timezone: text('timezone').notNull().default('America/Chicago'),
  /** ISO 3166-1 alpha-2, such as `US`: the country phones and dates are read in. */
  country: text('country').notNull().default('US'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  /** `YYYY-MM-DD`. */
  pilotStartedOn: text('pilot_started_on').notNull(),
  plan: text('plan').notNull().default('pilot'),
  kioskToken: text('kiosk_token').notNull().unique(),
  /** UTC ISO timestamp. */
  createdAt: text('created_at').notNull(),
})
