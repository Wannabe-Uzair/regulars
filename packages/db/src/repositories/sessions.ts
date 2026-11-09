import { eq } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { gyms, sessions, users } from '../schema/index.ts'
import { guardDuplicates } from './errors.ts'
import type { LiveSession, Session } from './records.ts'

export function sessionsRepository(db: Db) {
  return {
    /** Throws DuplicateError('tokenHash') if a session already has this token hash. */
    async create(session: Session): Promise<Session> {
      return guardDuplicates(() => db.insert(sessions).values(session).returning().get())
    },

    /**
     * The session with this token hash, its user and their gym, if it has not expired by `now` (a UTC ISO timestamp)
     * and its user is active. A session found expired is deleted; one whose user is inactive is kept, so turning the
     * user back on restores it.
     */
    async findLive(tokenHash: string, now: string): Promise<LiveSession | undefined> {
      const row = db
        .select({ session: sessions, user: users, gym: gyms })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .innerJoin(gyms, eq(gyms.id, users.gymId))
        .where(eq(sessions.tokenHash, tokenHash))
        .get()
      if (!row) return undefined
      if (row.session.expiresAt <= now) {
        db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run()
        return undefined
      }
      return row.user.active ? row : undefined
    },

    /** Sign out: delete the session, if there is one. */
    async delete(tokenHash: string): Promise<void> {
      db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run()
    },
  }
}

export type SessionsRepository = ReturnType<typeof sessionsRepository>
