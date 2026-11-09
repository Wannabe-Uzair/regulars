import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { gyms } from './gyms.ts'
import { members } from './members.ts'
import { users } from './people.ts'

/**
 * How a nudge left: `text`, `whatsapp`, `copy` (the message was copied) or `in-person`. `own-phone` marks the nudges
 * from before the first version, when one value covered all three. Type-only on SQLite: the column stays plain text.
 */
export const nudgeChannels = ['text', 'whatsapp', 'copy', 'in-person', 'own-phone'] as const
export type NudgeChannel = (typeof nudgeChannels)[number]

export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey(),
  gymId: integer('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  body: text('body').notNull(),
  sort: integer('sort').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const nudges = sqliteTable(
  'nudges',
  {
    id: integer('id').primaryKey(),
    gymId: integer('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    templateId: integer('template_id').references(() => templates.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    channel: text('channel', { enum: nudgeChannels }).notNull().default('own-phone'),
    /** UTC ISO timestamp. */
    sentAt: text('sent_at').notNull(),
  },
  (t) => [index('nudges_member_sent').on(t.memberId, t.sentAt)],
)
