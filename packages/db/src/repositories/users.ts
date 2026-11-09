import { and, asc, desc, eq, ne, sql } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { sessions, users } from '../schema/index.ts'
import type { User } from './records.ts'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Turn the user on or off, ending all their sessions when turning off. Undefined when the user is not in the gym. */
function write(tx: Tx, gymId: number, userId: number, active: boolean): User | undefined {
  const user = tx
    .update(users)
    .set({ active })
    .where(and(eq(users.id, userId), eq(users.gymId, gymId)))
    .returning()
    .get()
  if (user && !active) tx.delete(sessions).where(eq(sessions.userId, user.id)).run()
  return user
}

export function usersRepository(db: Db) {
  return {
    async findById(id: number): Promise<User | undefined> {
      return db.select().from(users).where(eq(users.id, id)).get()
    },

    /** Any user with this email, active or not, ignoring case. Callers that need an active user check `active`. */
    async findByEmail(email: string): Promise<User | undefined> {
      return db.select().from(users).where(eq(users.email, email)).get()
    },

    /** The user, if they belong to this gym, active or not. */
    async findInGym(gymId: number, userId: number): Promise<User | undefined> {
      return db.select().from(users).where(and(eq(users.id, userId), eq(users.gymId, gymId))).get()
    },

    /** Everyone on the gym's staff, active or not: owners first, then by name, then by id. */
    async listByGym(gymId: number): Promise<User[]> {
      return db
        .select()
        .from(users)
        .where(eq(users.gymId, gymId))
        .orderBy(desc(sql`${users.role} = 'owner'`), asc(users.name), asc(users.id))
        .all()
    },

    /** The gym's active staff, by id (the order the kiosk's round-robin follows). */
    async listActiveByGym(gymId: number): Promise<User[]> {
      return db
        .select()
        .from(users)
        .where(and(eq(users.gymId, gymId), eq(users.active, true)))
        .orderBy(asc(users.id))
        .all()
    },

    /**
     * Turn a user of this gym on or off. Turning one off also ends all their sessions, in the same transaction.
     * Undefined when the user is not in this gym.
     */
    async setActive(gymId: number, userId: number, active: boolean): Promise<User | undefined> {
      return db.transaction((tx) => write(tx, gymId, userId, active))
    },

    /**
     * As setActive, except that it never turns off the gym's last active owner: then it writes nothing and answers
     * 'lastOwner'. The count and the write are one transaction, so two owners turning each other off at once leave
     * one of them active.
     */
    async setActiveKeepingAnOwner(gymId: number, userId: number, active: boolean): Promise<User | 'lastOwner' | undefined> {
      return db.transaction((tx) => {
        const user = tx.select().from(users).where(and(eq(users.id, userId), eq(users.gymId, gymId))).get()
        if (!user) return undefined
        if (!active && user.active && user.role === 'owner') {
          const otherOwner = tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.gymId, gymId), eq(users.role, 'owner'), eq(users.active, true), ne(users.id, userId)))
            .get()
          if (!otherOwner) return 'lastOwner'
        }
        return write(tx, gymId, userId, active)
      })
    },
  }
}

export type UsersRepository = ReturnType<typeof usersRepository>
