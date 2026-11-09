// SQLite via Node's built-in node:sqlite. Schema = SPEC §3; creating it is idempotent.
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_DB_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'tenure.db')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS gyms (
  id INTEGER PRIMARY KEY, name TEXT, slug TEXT UNIQUE, timezone TEXT DEFAULT 'America/Chicago',
  is_demo INTEGER DEFAULT 0, pilot_started_on TEXT, plan TEXT DEFAULT 'pilot', kiosk_token TEXT UNIQUE, created_at TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, gym_id INTEGER REFERENCES gyms, email TEXT UNIQUE COLLATE NOCASE, name TEXT, role TEXT,
  password_hash TEXT, active INTEGER DEFAULT 1, created_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER REFERENCES users, created_at TEXT, expires_at TEXT
);
CREATE TABLE IF NOT EXISTS invites (
  token_hash TEXT PRIMARY KEY, gym_id INTEGER, role TEXT DEFAULT 'coach', name TEXT, created_by INTEGER, created_at TEXT, used_at TEXT
);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY, gym_id INTEGER, first_name TEXT, last_name TEXT, phone TEXT, email TEXT, joined_on TEXT,
  coach_id INTEGER REFERENCES users, external_id TEXT, source TEXT, created_at TEXT, UNIQUE(gym_id, external_id)
);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY, gym_id INTEGER, member_id INTEGER REFERENCES members, at TEXT, source TEXT
);
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY, gym_id INTEGER, name TEXT, body TEXT, sort INTEGER, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS nudges (
  id INTEGER PRIMARY KEY, gym_id INTEGER, member_id INTEGER, user_id INTEGER, template_id INTEGER NULL, body TEXT,
  channel TEXT DEFAULT 'own-phone', sent_at TEXT
);
CREATE INDEX IF NOT EXISTS checkins_member_at ON checkins(member_id, at);
CREATE INDEX IF NOT EXISTS members_gym_coach ON members(gym_id, coach_id);
CREATE INDEX IF NOT EXISTS nudges_member_sent ON nudges(member_id, sent_at);
`

/** Open (and create if needed) the database. `file` is a path or ':memory:'. */
export function openDb(file = DEFAULT_DB_FILE) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;')
  db.exec(SCHEMA)
  return db
}

/** Run fn inside a transaction; rolls back if it throws. Not re-entrant. */
export function tx(db, fn) {
  db.exec('BEGIN')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
