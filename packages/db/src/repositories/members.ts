import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, max, sql, type SQL } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { checkins, members, nudges, users } from '../schema/index.ts'
import { guardDuplicates } from './errors.ts'
import type { Checkin, Member, Scope, SummaryInputs } from './records.ts'
import { memberInScope, orNull } from './scope.ts'

/** Which of a scope's members `summaryInputs` loads. With neither field, all of them. */
export interface SummaryFilter {
  /** Only members who joined on or between these `YYYY-MM-DD` dates (Today and the board pass the first 90 days). */
  joinedOn?: { from: string; to: string }
  /** Only these members (one member's summary passes its id). */
  ids?: readonly number[]
  /** true: only archived members; false: only the others (every list but Archived); left out: both. */
  archived?: boolean
}

/** The fields an owner can change on the member page. A field left out, or undefined, keeps its value. */
export interface MemberPatch {
  firstName?: string
  /** null or '' clears it. */
  lastName?: string | null
  coachId?: number | null
  /** E.164; null or '' clears it. */
  phone?: string | null
}

/** A member added by hand (source 'app'). The caller checks the coach is the gym's active staff. */
export interface NewMember {
  gymId: number
  firstName: string
  lastName: string | null
  /** E.164, or null. */
  phone: string | null
  /** The gym's local date. */
  joinedOn: string
  coachId: number | null
  /** UTC ISO timestamp. */
  createdAt: string
}

export interface KioskJoin {
  gymId: number
  firstName: string
  lastName: string | null
  /** E.164, or null. */
  phone: string | null
  /** The gym's local date. */
  joinedOn: string
  /** UTC ISO timestamp: the member's `createdAt` and their first check-in. */
  at: string
}

/** The fields a CSV import can set. Text left blank is stored as null. */
export type MemberChanges = Partial<
  Pick<Member, 'firstName' | 'lastName' | 'phone' | 'email' | 'joinedOn' | 'coachId' | 'externalId'>
>

export interface ImportedMember {
  firstName: string
  lastName: string | null
  phone: string | null
  email: string | null
  joinedOn: string
  coachId: number | null
  externalId: string | null
}

/** What an import writes: domain's planned creates and updates, or its check-ins. */
export interface ImportWrites {
  creates: readonly ImportedMember[]
  /** Updates to members of this gym; an id from another gym is left alone. `restore` un-archives the member. */
  updates: readonly { id: number; changes: MemberChanges; restore?: boolean }[]
  checkins: readonly { memberId: number; at: string }[]
}

/** The gym as an import plans against it, read in applyImport's transaction. */
export interface ImportSnapshot {
  /** Every member of the gym, archived ones included, by id. */
  members: Member[]
  /** The gym's active staff, by id: the coaches a row may name. */
  staff: { id: number; email: string }[]
  /** The gym's check-ins, oldest first, read when called: only a check-ins import needs them. */
  checkins: () => { memberId: number; at: string }[]
}

/**
 * A CSV import, written in one transaction: the writes themselves, or a `plan` that turns the gym's snapshot, read in
 * the same transaction, into them, so nothing can change between planning and writing.
 */
export type ImportCommit = {
  gymId: number
  /** UTC ISO timestamp: the new members' `createdAt`. */
  at: string
} & (ImportWrites | { plan: (snapshot: ImportSnapshot) => ImportWrites })

export interface ImportResult {
  created: Member[]
  updated: Member[]
  checkins: Checkin[]
}

const nullableText = ['lastName', 'phone', 'email', 'externalId'] as const

function blanksToNull(changes: MemberChanges): MemberChanges {
  const out: MemberChanges = { ...changes }
  for (const key of nullableText) if (key in out) out[key] = orNull(out[key])
  return out
}

export function membersRepository(db: Db) {
  return {
    /** The member if `scope` may see them (a coach never learns of another coach's members). */
    async findInScope(scope: Scope, id: number): Promise<Member | undefined> {
      return db.select().from(members).where(and(eq(members.id, id), memberInScope(scope))).get()
    },

    /**
     * The kiosk's phone check-in: the gym's member with this E.164 phone (the newest, as the old query had it).
     * Archived members are found too, so the kiosk can send them to the front desk (FR-KIOSK-06).
     */
    async findByPhone(gymId: number, phone: string): Promise<Member | undefined> {
      return db
        .select()
        .from(members)
        .where(and(eq(members.gymId, gymId), eq(members.phone, phone)))
        .orderBy(desc(members.id))
        .limit(1)
        .get()
    },

    /** Every member of the gym, by id (the import planner and the reports). */
    async listByGym(gymId: number): Promise<Member[]> {
      return db.select().from(members).where(eq(members.gymId, gymId)).orderBy(asc(members.id)).all()
    },

    /**
     * Every member of the gym who isn't archived, by first name, then last name (no last name first), then id: the
     * list the kiosk search filters by name prefix and cuts to 6 (FR-KIOSK-02).
     */
    async listByName(gymId: number): Promise<Member[]> {
      return db
        .select()
        .from(members)
        .where(and(eq(members.gymId, gymId), isNull(members.archivedAt)))
        .orderBy(asc(members.firstName), asc(members.lastName), asc(members.id))
        .all()
    },

    /**
     * What domain's buildSummaries needs for the scope's members (the old loadSummaries), read in one transaction:
     * the members, their check-ins, the gym's users and each member's latest nudge.
     *
     * Only the check-ins a summary uses are read: those that may fall in the member's first 90 days in any time zone
     * (from the day before the join date to 91 days after it, in UTC), plus each member's latest. So a member with
     * years of visits costs no more than a new one, and the summaries come out as they would from every check-in.
     */
    async summaryInputs(scope: Scope, filter: SummaryFilter = {}): Promise<SummaryInputs> {
      if (filter.ids?.length === 0) return { members: [], checkins: [], users: [], lastNudges: [] }
      const conditions: (SQL | undefined)[] = [memberInScope(scope)]
      if (filter.joinedOn) {
        conditions.push(gte(members.joinedOn, filter.joinedOn.from), lte(members.joinedOn, filter.joinedOn.to))
      }
      if (filter.ids) conditions.push(inArray(members.id, [...filter.ids]))
      if (filter.archived !== undefined) {
        conditions.push(filter.archived ? isNotNull(members.archivedAt) : isNull(members.archivedAt))
      }
      const where = and(...conditions)
      return db.transaction((tx) => {
        const memberRows = tx.select().from(members).where(where).orderBy(asc(members.id)).all()
        const inWindow = tx
          .select({ memberId: checkins.memberId, at: checkins.at })
          .from(checkins)
          .innerJoin(members, eq(members.id, checkins.memberId))
          .where(
            and(
              where,
              gte(checkins.at, sql`date(${members.joinedOn}, '-1 day')`),
              lt(checkins.at, sql`date(${members.joinedOn}, '+91 days')`),
            ),
          )
          .orderBy(asc(checkins.at), asc(checkins.id))
          .all()
        const latest = tx
          .select({ memberId: checkins.memberId, at: max(checkins.at) })
          .from(checkins)
          .innerJoin(members, eq(members.id, checkins.memberId))
          .where(where)
          .groupBy(checkins.memberId)
          .all()
        const read = new Set(inWindow.map((c) => `${c.memberId} ${c.at}`))
        const outside = latest.flatMap((c) =>
          c.at === null || read.has(`${c.memberId} ${c.at}`) ? [] : [{ memberId: c.memberId, at: c.at }],
        )
        // Still oldest first: the latest visits outside a window go in by time.
        const checkinRows = outside.length === 0 ? inWindow : [...inWindow, ...outside].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
        const nudgeRows = tx
          .select({ memberId: nudges.memberId, sentAt: max(nudges.sentAt) })
          .from(nudges)
          .innerJoin(members, eq(members.id, nudges.memberId))
          .where(where)
          .groupBy(nudges.memberId)
          .orderBy(asc(nudges.memberId))
          .all()
        const userRows = tx
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.gymId, scope.gymId))
          .orderBy(asc(users.id))
          .all()
        return {
          members: memberRows,
          checkins: checkinRows,
          users: userRows,
          lastNudges: nudgeRows.flatMap((n) => (n.sentAt === null ? [] : [{ memberId: n.memberId, sentAt: n.sentAt }])),
        }
      })
    },

    /**
     * The member page's edit: the fields given, in one statement, so a phone clash (DuplicateError('phone')) leaves
     * the others unchanged too. A field left out or undefined keeps its value. Undefined when the member is not in
     * scope. The caller checks the coach is active staff.
     */
    async update(scope: Scope, id: number, patch: MemberPatch): Promise<Member | undefined> {
      const set: MemberPatch = {}
      if (patch.firstName !== undefined) set.firstName = patch.firstName
      if (patch.lastName !== undefined) set.lastName = orNull(patch.lastName)
      if (patch.coachId !== undefined) set.coachId = patch.coachId
      if (patch.phone !== undefined) set.phone = orNull(patch.phone)
      if (Object.keys(set).length === 0) {
        return db.select().from(members).where(and(eq(members.id, id), memberInScope(scope))).get()
      }
      return guardDuplicates(() =>
        db
          .update(members)
          .set(set)
          .where(and(eq(members.id, id), memberInScope(scope)))
          .returning()
          .get(),
      )
    },

    /** A member added by hand (source 'app'). Throws DuplicateError('phone') when the phone is taken. */
    async create(input: NewMember): Promise<Member> {
      return guardDuplicates(() =>
        db
          .insert(members)
          .values({
            gymId: input.gymId,
            firstName: input.firstName,
            lastName: orNull(input.lastName),
            phone: orNull(input.phone),
            joinedOn: input.joinedOn,
            coachId: input.coachId,
            source: 'app',
            createdAt: input.createdAt,
          })
          .returning()
          .get(),
      )
    },

    /**
     * Archive the member at `at` (a UTC ISO timestamp), or restore them with null. Only a change is written: an
     * archived member keeps the time they were first archived. The member as they are now, and whether this changed
     * them; undefined when the member is not in scope.
     */
    async setArchived(scope: Scope, id: number, at: string | null): Promise<{ member: Member; changed: boolean } | undefined> {
      return db.transaction((tx) => {
        const inScope = and(eq(members.id, id), memberInScope(scope))
        const changed = tx
          .update(members)
          .set({ archivedAt: at })
          .where(and(inScope, at === null ? isNotNull(members.archivedAt) : isNull(members.archivedAt)))
          .returning()
          .get()
        if (changed) return { member: changed, changed: true }
        const member = tx.select().from(members).where(inScope).get()
        return member && { member, changed: false }
      })
    },

    /**
     * Delete an archived member for good, with their check-ins and nudges (the foreign keys cascade). The member as
     * they were; undefined, deleting nothing, when they are not in scope or not archived.
     */
    async deleteArchived(scope: Scope, id: number): Promise<Member | undefined> {
      return db
        .delete(members)
        .where(and(eq(members.id, id), memberInScope(scope), isNotNull(members.archivedAt)))
        .returning()
        .get()
    },

    /**
     * A walk-in joining at the kiosk, in one transaction: the member (source 'kiosk'), their coach chosen
     * round-robin, and their first check-in. The coach is the active staff member, by id, after the coach of the
     * gym's newest member that has one; the first active one when that coach is gone, none when no one is active.
     * Throws DuplicateError('phone') when the phone is taken, an archived member's included, and leaves nothing
     * behind.
     */
    async joinAtKiosk(input: KioskJoin): Promise<{ member: Member; checkin: Checkin }> {
      const { gymId, at } = input
      return guardDuplicates(() =>
        db.transaction((tx) => {
          const staff = tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.gymId, gymId), eq(users.active, true)))
            .orderBy(asc(users.id))
            .all()
            .map((u) => u.id)
          const last = tx
            .select({ coachId: members.coachId })
            .from(members)
            .where(and(eq(members.gymId, gymId), isNotNull(members.coachId)))
            .orderBy(desc(members.id))
            .limit(1)
            .get()
          const coachId = staff[(staff.indexOf(last?.coachId ?? -1) + 1) % staff.length] ?? null
          const member = tx
            .insert(members)
            .values({
              gymId,
              firstName: input.firstName,
              lastName: orNull(input.lastName),
              phone: orNull(input.phone),
              joinedOn: input.joinedOn,
              coachId,
              source: 'kiosk',
              createdAt: at,
            })
            .returning()
            .get()
          const checkin = tx.insert(checkins).values({ gymId, memberId: member.id, at, source: 'kiosk' }).returning().get()
          return { member, checkin }
        }),
      )
    },

    /**
     * Write a CSV import in one immediate transaction: the new members (source 'csv'), the updates and restores, then
     * the check-ins (source 'csv'). With a `plan`, the gym's snapshot is read first, in the same transaction. A coach
     * from outside the gym, or a check-in for a member outside it, throws (FR-IMPORT-08). A clash on phone or external
     * id throws DuplicateError('phone' or 'externalId'). Any throw, the plan's own included, writes nothing.
     */
    async applyImport(input: ImportCommit): Promise<ImportResult> {
      const { gymId, at } = input
      return guardDuplicates(() =>
        db.transaction(
          (tx) => {
            const writes: ImportWrites =
              'plan' in input
                ? input.plan({
                    members: tx.select().from(members).where(eq(members.gymId, gymId)).orderBy(asc(members.id)).all(),
                    staff: tx
                      .select({ id: users.id, email: users.email })
                      .from(users)
                      .where(and(eq(users.gymId, gymId), eq(users.active, true)))
                      .orderBy(asc(users.id))
                      .all(),
                    checkins: () =>
                      tx
                        .select({ memberId: checkins.memberId, at: checkins.at })
                        .from(checkins)
                        .where(eq(checkins.gymId, gymId))
                        .orderBy(asc(checkins.at), asc(checkins.id))
                        .all(),
                  })
                : input
            const staff = new Set(
              tx
                .select({ id: users.id })
                .from(users)
                .where(eq(users.gymId, gymId))
                .all()
                .map((u) => u.id),
            )
            const checkCoach = (coachId: number | null | undefined) => {
              if (coachId != null && !staff.has(coachId)) throw new Error(`import: coach ${coachId} is not in gym ${gymId}`)
            }
            const created = writes.creates.map((m) => {
              checkCoach(m.coachId)
              return tx
                .insert(members)
                .values({
                  gymId,
                  firstName: m.firstName,
                  lastName: orNull(m.lastName),
                  phone: orNull(m.phone),
                  email: orNull(m.email),
                  joinedOn: m.joinedOn,
                  coachId: m.coachId,
                  externalId: orNull(m.externalId),
                  source: 'csv',
                  createdAt: at,
                })
                .returning()
                .get()
            })
            const updated: Member[] = []
            for (const u of writes.updates) {
              const set: MemberChanges & { archivedAt?: null } = blanksToNull(u.changes)
              if (u.restore) set.archivedAt = null
              if (Object.keys(set).length === 0) continue
              checkCoach(set.coachId)
              const row = tx
                .update(members)
                .set(set)
                .where(and(eq(members.id, u.id), eq(members.gymId, gymId)))
                .returning()
                .get()
              if (row) updated.push(row)
            }
            let added: Checkin[] = []
            if (writes.checkins.length > 0) {
              const inGym = new Set(
                tx
                  .select({ id: members.id })
                  .from(members)
                  .where(eq(members.gymId, gymId))
                  .all()
                  .map((m) => m.id),
              )
              for (const c of writes.checkins) {
                if (!inGym.has(c.memberId)) throw new Error(`import: member ${c.memberId} is not in gym ${gymId}`)
              }
              added = tx
                .insert(checkins)
                .values(writes.checkins.map((c) => ({ gymId, memberId: c.memberId, at: c.at, source: 'csv' })))
                .returning()
                .all()
            }
            return { created, updated, checkins: added }
          },
          { behavior: 'immediate' },
        ),
      )
    },
  }
}

export type MembersRepository = ReturnType<typeof membersRepository>
