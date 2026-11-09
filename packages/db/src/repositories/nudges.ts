import { and, asc, count, desc, eq, gt, gte, inArray } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { checkins, members, nudges, templates, users, type NudgeChannel } from '../schema/index.ts'
import type { CheckinAt, Nudge, NudgeWithNames, NudgeWithSender, Scope } from './records.ts'
import { memberInScope } from './scope.ts'

export interface NewNudge {
  gymId: number
  memberId: number
  /** The sender. */
  userId: number
  /** The template it started from, or null. The caller checks it is one of the gym's. */
  templateId: number | null
  body: string
  /** How it left. Left out, it is `own-phone`, the value of the nudges from before the first version (fixtures). */
  channel?: NudgeChannel
  /** UTC ISO timestamp. */
  sentAt: string
}

/** A nudge recorded from the first version on: always with how it left, never `own-phone`. */
export interface ScopedNudge {
  memberId: number
  /** The sender. */
  userId: number
  /** The template it started from, or null. */
  templateId: number | null
  body: string
  channel: Exclude<NudgeChannel, 'own-phone'>
  /** UTC ISO timestamp. */
  sentAt: string
}

/**
 * What recordInScope did: the nudge with the member's coach and phone (for the live event and the links), or which id
 * was not found, with nothing written.
 */
export type ScopedNudgeResult =
  | { nudge: Nudge; member: { coachId: number | null; phone: string | null } }
  | { missing: 'member' | 'template' }

export interface NudgeHistory {
  /** Newest first. */
  nudges: NudgeWithNames[]
  /** The nudged members' check-ins after `since`, oldest first: enough for domain's cameBack on every nudge. */
  checkins: CheckinAt[]
}

const withSender = {
  id: nudges.id,
  gymId: nudges.gymId,
  memberId: nudges.memberId,
  userId: nudges.userId,
  templateId: nudges.templateId,
  body: nudges.body,
  channel: nudges.channel,
  sentAt: nudges.sentAt,
  senderName: users.name,
}

export function nudgesRepository(db: Db) {
  return {
    /** A nudge, as given (channel 'own-phone' when none is). The caller checks the member is in scope. */
    async record(nudge: NewNudge): Promise<Nudge> {
      return db
        .insert(nudges)
        .values({ ...nudge, channel: nudge.channel ?? 'own-phone' })
        .returning()
        .get()
    },

    /**
     * The API's write: in one transaction, a nudge to a member `scope` may see (the gym's, and a coach's own) from a
     * template of the same gym, if any. Writes nothing and names the missing id otherwise, so another gym's member or
     * template, or another coach's member, is never nudged.
     */
    async recordInScope(scope: Scope, nudge: ScopedNudge): Promise<ScopedNudgeResult> {
      return db.transaction((tx) => {
        const member = tx
          .select({ coachId: members.coachId, phone: members.phone })
          .from(members)
          .where(and(eq(members.id, nudge.memberId), memberInScope(scope)))
          .get()
        if (!member) return { missing: 'member' as const }
        if (nudge.templateId !== null) {
          const template = tx
            .select({ id: templates.id })
            .from(templates)
            .where(and(eq(templates.id, nudge.templateId), eq(templates.gymId, scope.gymId)))
            .get()
          if (!template) return { missing: 'template' as const }
        }
        const row = tx
          .insert(nudges)
          .values({ ...nudge, gymId: scope.gymId })
          .returning()
          .get()
        return { nudge: row, member }
      })
    },

    /** Every nudge to one member, from anyone, newest first; none when the member is not in scope (the member page). */
    async listByMember(scope: Scope, memberId: number): Promise<NudgeWithSender[]> {
      return db
        .select(withSender)
        .from(nudges)
        .innerJoin(members, eq(members.id, nudges.memberId))
        .leftJoin(users, eq(users.id, nudges.userId))
        .where(and(eq(nudges.memberId, memberId), memberInScope(scope)))
        .orderBy(desc(nudges.sentAt), desc(nudges.id))
        .all()
    },

    /**
     * The nudge history: nudges sent at or after `since`, newest first (then by id, newest first). The whole gym's
     * for an owner; a coach sees only the nudges they sent to members who are still theirs.
     */
    async history(scope: Scope, since: string): Promise<NudgeHistory> {
      return db.transaction((tx) => {
        const rows = tx
          .select({ ...withSender, memberFirstName: members.firstName, memberLastName: members.lastName })
          .from(nudges)
          .innerJoin(members, eq(members.id, nudges.memberId))
          .leftJoin(users, eq(users.id, nudges.userId))
          .where(
            and(
              eq(nudges.gymId, scope.gymId),
              gte(nudges.sentAt, since),
              memberInScope(scope),
              scope.coachId === undefined ? undefined : eq(nudges.userId, scope.coachId),
            ),
          )
          .orderBy(desc(nudges.sentAt), desc(nudges.id))
          .all()
        const memberIds = [...new Set(rows.map((n) => n.memberId))]
        const after =
          memberIds.length === 0
            ? []
            : tx
                .select({ memberId: checkins.memberId, at: checkins.at })
                .from(checkins)
                .where(and(inArray(checkins.memberId, memberIds), gt(checkins.at, since)))
                .orderBy(asc(checkins.at), asc(checkins.id))
                .all()
        return { nudges: rows, checkins: after }
      })
    },

    /**
     * Today's "nudged this week": nudges sent at or after `since`. The whole gym's for an owner; for a coach, the
     * ones they sent, whoever's member it is now (as the old count had it).
     */
    async countSentSince(scope: Scope, since: string): Promise<number> {
      const row = db
        .select({ n: count() })
        .from(nudges)
        .where(
          and(
            eq(nudges.gymId, scope.gymId),
            gte(nudges.sentAt, since),
            scope.coachId === undefined ? undefined : eq(nudges.userId, scope.coachId),
          ),
        )
        .get()
      return row?.n ?? 0
    },

    /** Every nudge of the gym, oldest first (the reports). */
    async listByGym(gymId: number): Promise<Nudge[]> {
      return db.select().from(nudges).where(eq(nudges.gymId, gymId)).orderBy(asc(nudges.sentAt), asc(nudges.id)).all()
    },
  }
}

export type NudgesRepository = ReturnType<typeof nudgesRepository>
