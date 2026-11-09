import { and, eq } from 'drizzle-orm'
import { members } from '../schema/index.ts'
import type { Scope } from './records.ts'

/** The members `scope` may see: the gym's, and with a coachId only that coach's (the old memberScope). */
export const memberInScope = (scope: Scope) =>
  scope.coachId === undefined
    ? eq(members.gymId, scope.gymId)
    : and(eq(members.gymId, scope.gymId), eq(members.coachId, scope.coachId))

/** Blank text is stored as null, so a phone or external id is never ''. */
export const orNull = (value: string | null | undefined): string | null => (value ? value : null)
