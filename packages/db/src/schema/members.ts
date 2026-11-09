import { index, integer, sqliteTable, text, unique, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { gyms } from './gyms.ts'
import { users } from './people.ts'

export const members = sqliteTable(
  'members',
  {
    id: integer('id').primaryKey(),
    gymId: integer('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    /** E.164, or null. */
    phone: text('phone'),
    email: text('email'),
    /** `YYYY-MM-DD`. */
    joinedOn: text('joined_on').notNull(),
    coachId: integer('coach_id').references(() => users.id, { onDelete: 'set null' }),
    externalId: text('external_id'),
    source: text('source').notNull(),
    createdAt: text('created_at').notNull(),
    /** UTC ISO timestamp when the member was archived, or null while they are active. */
    archivedAt: text('archived_at'),
  },
  (t) => [
    unique('members_gym_external_id_unique').on(t.gymId, t.externalId),
    uniqueIndex('members_gym_phone_unique').on(t.gymId, t.phone),
    index('members_gym_coach').on(t.gymId, t.coachId),
  ],
)

export const checkins = sqliteTable(
  'checkins',
  {
    id: integer('id').primaryKey(),
    gymId: integer('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    /** UTC ISO timestamp. */
    at: text('at').notNull(),
    source: text('source').notNull(),
  },
  (t) => [index('checkins_member_at').on(t.memberId, t.at)],
)
