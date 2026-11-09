import { and, asc, desc, eq, gt, gte, isNull, lte } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { checkins, members } from '../schema/index.ts'
import type { Checkin, CheckinWithName, Scope } from './records.ts'
import { memberInScope } from './scope.ts'

export interface KioskCheckin {
  gymId: number
  memberId: number
  /** UTC ISO timestamp. */
  at: string
  /**
   * UTC ISO timestamp: if the member already has a check-in after this and at or before `at`, nothing is stored.
   * The kiosk passes `at` minus one hour.
   */
  unlessSince: string
}

export function checkinsRepository(db: Db) {
  return {
    /**
     * A kiosk check-in (source 'kiosk'). Nothing is stored and the result is undefined when the member isn't the
     * gym's, is archived, or already checked in since `unlessSince`. The checks and the insert are one transaction,
     * so an archive at the same moment can't slip a check-in in.
     */
    async recordAtKiosk(input: KioskCheckin): Promise<Checkin | undefined> {
      const { gymId, memberId, at } = input
      return db.transaction((tx) => {
        const member = tx
          .select({ id: members.id })
          .from(members)
          .where(and(eq(members.id, memberId), eq(members.gymId, gymId), isNull(members.archivedAt)))
          .get()
        if (!member) return undefined
        const recent = tx
          .select({ id: checkins.id })
          .from(checkins)
          .where(and(eq(checkins.memberId, memberId), gt(checkins.at, input.unlessSince), lte(checkins.at, at)))
          .limit(1)
          .get()
        if (recent) return undefined
        return tx.insert(checkins).values({ gymId, memberId, at, source: 'kiosk' }).returning().get()
      })
    },

    /** One member's check-ins, newest first; none when the member is not in scope (the member page, the kiosk). */
    async listByMember(scope: Scope, memberId: number): Promise<Checkin[]> {
      return db
        .select({ id: checkins.id, gymId: checkins.gymId, memberId: checkins.memberId, at: checkins.at, source: checkins.source })
        .from(checkins)
        .innerJoin(members, eq(members.id, checkins.memberId))
        .where(and(eq(checkins.memberId, memberId), memberInScope(scope)))
        .orderBy(desc(checkins.at), desc(checkins.id))
        .all()
    },

    /**
     * The scope's check-ins at or after `since`, newest first, with the member's name. Today passes now minus 36
     * hours and keeps those whose gym-local date is today.
     */
    async listSince(scope: Scope, since: string): Promise<CheckinWithName[]> {
      return db
        .select({ memberId: checkins.memberId, at: checkins.at, firstName: members.firstName, lastName: members.lastName })
        .from(checkins)
        .innerJoin(members, eq(members.id, checkins.memberId))
        .where(and(memberInScope(scope), gte(checkins.at, since)))
        .orderBy(desc(checkins.at), desc(checkins.id))
        .all()
    },

    /** Every check-in of the gym, oldest first (the reports and the import planner's duplicate check). */
    async listByGym(gymId: number): Promise<Checkin[]> {
      return db.select().from(checkins).where(eq(checkins.gymId, gymId)).orderBy(asc(checkins.at), asc(checkins.id)).all()
    },
  }
}

export type CheckinsRepository = ReturnType<typeof checkinsRepository>
