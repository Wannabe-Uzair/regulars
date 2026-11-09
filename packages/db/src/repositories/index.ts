import type { Db } from '../client.ts'
import { checkinsRepository } from './checkins.ts'
import { gymsRepository } from './gyms.ts'
import { invitesRepository } from './invites.ts'
import { membersRepository } from './members.ts'
import { nudgesRepository } from './nudges.ts'
import { sessionsRepository } from './sessions.ts'
import { templatesRepository } from './templates.ts'
import { usersRepository } from './users.ts'

/** Every repository over one database. Each method is async, so another driver can replace better-sqlite3. */
export function createRepositories(db: Db) {
  return {
    gyms: gymsRepository(db),
    users: usersRepository(db),
    sessions: sessionsRepository(db),
    invites: invitesRepository(db),
    members: membersRepository(db),
    checkins: checkinsRepository(db),
    templates: templatesRepository(db),
    nudges: nudgesRepository(db),
  }
}

export type Repositories = ReturnType<typeof createRepositories>

export { DuplicateError } from './errors.ts'
export type { CheckinsRepository, KioskCheckin } from './checkins.ts'
export type { GymsRepository, NewGymWithOwner } from './gyms.ts'
export type { AcceptInvite, InvitesRepository, NewInvite } from './invites.ts'
export type {
  ImportCommit,
  ImportedMember,
  ImportResult,
  KioskJoin,
  MemberChanges,
  MemberPatch,
  MembersRepository,
  NewMember,
  SummaryFilter,
} from './members.ts'
export type { NewNudge, NudgeHistory, NudgesRepository } from './nudges.ts'
export type {
  Checkin,
  CheckinAt,
  CheckinWithName,
  Gym,
  Invite,
  LiveSession,
  Member,
  Nudge,
  NudgeAt,
  NudgeWithNames,
  NudgeWithSender,
  Scope,
  Session,
  SummaryInputs,
  Template,
  User,
  UserName,
} from './records.ts'
export type { SessionsRepository } from './sessions.ts'
export type { NewTemplate, TemplateEdit, TemplatesRepository } from './templates.ts'
export type { UsersRepository } from './users.ts'
