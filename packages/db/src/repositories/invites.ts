import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { invites, users } from '../schema/index.ts'
import { guardDuplicates } from './errors.ts'
import type { UserRole } from '../schema/index.ts'
import type { Invite, User } from './records.ts'

export interface NewInvite {
  tokenHash: string
  gymId: number
  /** The role the invitee joins with. Default `coach`. */
  role?: UserRole
  /**
   * The invitee's email, which the account the invite makes takes. The 0000 table has no email column, so the email
   * is kept in `name` until one is added (the draft spec's open item OI-15); invites take no name meanwhile.
   */
  name: string
  createdBy: number
  createdAt: string
}

export interface AcceptInvite {
  tokenHash: string
  /** As for `findLive`: an invite created at or before this UTC ISO timestamp has expired. */
  liveSince: string
  /** UTC ISO timestamp: the invite's `usedAt` and the new user's `createdAt`. */
  acceptedAt: string
  user: { email: string; name: string; passwordHash: string }
}

/** Unused, and created after `liveSince`. */
const live = (tokenHash: string, liveSince: string) =>
  and(eq(invites.tokenHash, tokenHash), isNull(invites.usedAt), gt(invites.createdAt, liveSince))

export function invitesRepository(db: Db) {
  return {
    /**
     * An invite to join as a coach or, with `role: 'owner'`, as an owner. Throws DuplicateError('tokenHash') if an
     * invite already has this token hash.
     */
    async create(invite: NewInvite): Promise<Invite> {
      const { role = 'coach', ...rest } = invite
      return guardDuplicates(() => db.insert(invites).values({ ...rest, role }).returning().get())
    },

    /**
     * The invite with this token hash if it can still be used: not used yet, and created after `liveSince` (a UTC
     * ISO timestamp; the caller passes now minus the invite lifetime).
     */
    async findLive(tokenHash: string, liveSince: string): Promise<Invite | undefined> {
      return db.select().from(invites).where(live(tokenHash, liveSince)).get()
    },

    /**
     * Use a live invite: mark it used and create its active user in the invite's gym with the invite's role, in one
     * transaction. Undefined (and nothing written) when the invite is not live. Throws DuplicateError('email') when
     * the email is taken, leaving the invite unused.
     */
    async accept(input: AcceptInvite): Promise<User | undefined> {
      return guardDuplicates(() =>
        db.transaction((tx) => {
          const invite = tx
            .update(invites)
            .set({ usedAt: input.acceptedAt })
            .where(live(input.tokenHash, input.liveSince))
            .returning()
            .get()
          if (!invite) return undefined
          return tx
            .insert(users)
            .values({ ...input.user, gymId: invite.gymId, role: invite.role, active: true, createdAt: input.acceptedAt })
            .returning()
            .get()
        }),
      )
    },
  }
}

export type InvitesRepository = ReturnType<typeof invitesRepository>
