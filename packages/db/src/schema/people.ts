import { sql } from 'drizzle-orm'
import { check, customType, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { gyms } from './gyms.ts'

/** Text compared without regard to case, so `WHERE email = ?` and the unique index both ignore case. */
const textNoCase = customType<{ data: string }>({
  dataType: () => 'text COLLATE NOCASE',
})

export const userRoles = ['owner', 'coach'] as const
export type UserRole = (typeof userRoles)[number]

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey(),
    gymId: integer('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    email: textNoCase('email').notNull().unique(),
    name: text('name').notNull(),
    role: text('role', { enum: userRoles }).notNull(),
    passwordHash: text('password_hash').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
  },
  (t) => [check('users_role_check', sql`${t.role} IN ('owner', 'coach')`)],
)

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
})

export const invites = sqliteTable('invites', {
  tokenHash: text('token_hash').primaryKey(),
  gymId: integer('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  role: text('role', { enum: userRoles }).notNull().default('coach'),
  name: text('name').notNull(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  usedAt: text('used_at'),
}, (t) => [check('invites_role_check', sql`${t.role} IN ('owner', 'coach')`)])
