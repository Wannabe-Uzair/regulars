import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { expect, test } from 'vitest'

const notes = sqliteTable('notes', {
  id: integer('id').primaryKey(),
  body: text('body').notNull(),
})

test('better-sqlite3 and drizzle read back a row from an in-memory database', () => {
  const sqlite = new Database(':memory:')
  try {
    sqlite.exec('create table notes (id integer primary key, body text not null)')
    const db = drizzle({ client: sqlite })
    db.insert(notes).values({ body: 'hello' }).run()
    expect(db.select().from(notes).all()).toEqual([{ id: 1, body: 'hello' }])
  } finally {
    sqlite.close()
  }
})
