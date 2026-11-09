// The planners, ported from legacy/app/server/import/plan.mjs: parsed rows in, the creates, updates, restores and
// skips out, each with its row's problems. Pure: the API reads the gym's snapshot, plans, and writes the plan in one
// transaction. Phones are read in the gym's country (FR-GLOBAL-02).
import type { Country } from '../country.ts'
import { localDate } from '../dates.ts'
import { normalizePhone } from '../phone.ts'
import type { DateOrder } from './dates.ts'
import { parseDate, parseLocalDateTime } from './dates.ts'
import { type ImportField, type ImportMapping, missingFields } from './mapping.ts'
import { cleanEmail, cleanName, isRewrittenNumber, splitFullName } from './normalize.ts'
import type { ImportProblem } from './problems.ts'

const HOUR_MS = 3_600_000

/** A member of the gym as the planner sees them, archived ones included. A db Member is one. */
export interface ImportExistingMember {
  id: number
  externalId: string | null
  phone: string | null
  firstName: string
  lastName: string | null
  email: string | null
  joinedOn: string
  coachId: number | null
  archivedAt: string | null
}

/** Someone a row's coach email can name: the gym's active staff. */
export interface ImportStaff {
  id: number
  email: string
}

export interface PlannedMember {
  row: number
  externalId: string | null
  firstName: string
  lastName: string | null
  phone: string | null
  email: string | null
  joinedOn: string
  coachId: number | null
}

export type PlannedChanges = Partial<
  Pick<PlannedMember, 'firstName' | 'lastName' | 'phone' | 'email' | 'joinedOn' | 'coachId' | 'externalId'>
>

/** An existing member's changes; `restore` brings an archived member back (FR-IMPORT-09). */
export interface PlannedUpdate {
  row: number
  id: number
  changes: PlannedChanges
  restore: boolean
}

export interface MemberPlan {
  creates: PlannedMember[]
  updates: PlannedUpdate[]
  /** One line per skipped row, saying why. */
  skipped: ImportProblem[]
  /** The rest: the columns the mapping lacks, and kept rows' problems and restores. */
  problems: ImportProblem[]
}

export interface PlannedCheckin {
  row: number
  memberId: number
  at: string
}

export interface CheckinPlan {
  creates: PlannedCheckin[]
  /** Archived members a check-in row brings back, each once, at the first row that does. */
  restores: { row: number; id: number }[]
  skipped: ImportProblem[]
  problems: ImportProblem[]
}

interface PlanRows {
  rows: readonly (readonly string[])[]
  mapping: ImportMapping
  /** parseCsv's rowNumbers; without them, row i is spreadsheet row i + 2. */
  rowNumbers?: readonly number[]
  country: Country
  dateOrder: DateOrder
}

const cell = (row: readonly string[], mapping: ImportMapping, field: ImportField): string => {
  const i = mapping[field]
  return i == null ? '' : (row[i] ?? '').trim()
}

/** A phone cell as E.164, or null; a spreadsheet's scientific notation is never read as a number. */
const phoneOf = (raw: string, country: Country) =>
  raw && !isRewrittenNumber(raw) ? normalizePhone(raw, country) : null

/** An ID cell, or null; an ID a spreadsheet rewrote ("2E+12") is treated as missing. */
const idOf = (raw: string) => (raw && !isRewrittenNumber(raw) ? raw : null)

export function planMembers({
  rows,
  mapping,
  rowNumbers,
  country,
  dateOrder,
  existing,
  staff,
}: PlanRows & { existing: readonly ImportExistingMember[]; staff: readonly ImportStaff[] }): MemberPlan {
  const plan: MemberPlan = { creates: [], updates: [], skipped: [], problems: [] }
  const missing = missingFields('members', mapping)
  if (missing.includes('name')) plan.problems.push({ code: 'noNameColumn', row: null })
  if (missing.includes('joinedOn')) plan.problems.push({ code: 'noJoinDateColumn', row: null })
  if (plan.problems.length) return plan

  const byExt = new Map<string, ImportExistingMember>()
  const byPhone = new Map<string, ImportExistingMember>()
  // Who each phone belongs to once the plan is written: existing members keep theirs in the snapshot (so a create,
  // written first, never takes one), and each planned create or update claims its new one. No write can clash.
  const phoneOwner = new Map<string, string>()
  for (const m of existing) {
    if (m.externalId) byExt.set(m.externalId, m)
    if (m.phone) {
      byPhone.set(m.phone, m)
      phoneOwner.set(m.phone, `member ${m.id}`)
    }
  }
  const coachByEmail = new Map(staff.map((s) => [s.email.toLowerCase(), s.id]))
  const seenIds = new Set<number>() // existing members this file already touched
  const seenExt = new Set<string>() // IDs this file already planned
  const seenPhone = new Map<string, string | null>() // phones of members this file creates, with the ID that claimed each

  rows.forEach((row, i) => {
    const n = rowNumbers?.[i] ?? i + 2
    const skip = (p: Omit<ImportProblem, 'row'>) => void plan.skipped.push({ ...p, row: n })
    const notes: ImportProblem[] = []
    const note = (p: Omit<ImportProblem, 'row'>) => void notes.push({ ...p, row: n })

    let firstName = cleanName(cell(row, mapping, 'first_name'))
    let lastName = cleanName(cell(row, mapping, 'last_name'))
    if (!firstName) {
      const split = splitFullName(cell(row, mapping, 'full_name'))
      if (split) {
        firstName = split.firstName
        lastName = split.lastName ?? lastName
      }
    }
    if (!firstName) return skip({ code: mapping.full_name != null ? 'noName' : 'noFirstName' })
    const joinedRaw = cell(row, mapping, 'joined_on')
    const joinedOn = parseDate(joinedRaw, dateOrder)
    if (!joinedOn) return skip(joinedRaw ? { code: 'badJoinDate', value: joinedRaw } : { code: 'noJoinDate' })

    const externalId = idOf(cell(row, mapping, 'external_id'))
    const phoneRaw = cell(row, mapping, 'phone')
    const phone = phoneOf(phoneRaw, country)
    if (phoneRaw && !phone) note({ code: 'badPhone', value: phoneRaw })
    const emailRaw = cell(row, mapping, 'email')
    const email = cleanEmail(emailRaw)
    if (emailRaw && !email) note({ code: 'badEmail', value: emailRaw })
    const coachRaw = cell(row, mapping, 'coach_email')
    let coachId: number | null = null
    if (coachRaw) {
      coachId = coachByEmail.get(coachRaw.toLowerCase()) ?? null
      if (coachId == null) note({ code: 'unknownCoach', value: coachRaw })
    }

    // An ID match beats a phone match. A phone match is the same person only when the row or the member has no ID:
    // two different IDs on one phone are two people (a family's shared phone, or a recycled number).
    let match: ImportExistingMember | undefined
    if (externalId) match = byExt.get(externalId)
    if (!match && phone) {
      const byNumber = byPhone.get(phone)
      if (byNumber && !(externalId && byNumber.externalId && byNumber.externalId !== externalId)) match = byNumber
    }

    if (match) {
      if (externalId && !match.externalId && seenExt.has(externalId)) {
        return skip({ code: 'idUsedEarlier', value: externalId })
      }
      if (seenIds.has(match.id)) return skip({ code: 'repeated' })
      seenIds.add(match.id)
      const self = `member ${match.id}`
      const changes: PlannedChanges = {}
      if (firstName !== match.firstName) changes.firstName = firstName
      if (lastName && lastName !== match.lastName) changes.lastName = lastName
      if (phone && phone !== match.phone) {
        const owner = phoneOwner.get(phone)
        if (owner && owner !== self) note({ code: 'phoneTaken', value: phoneRaw })
        else {
          changes.phone = phone
          phoneOwner.set(phone, self)
        }
      }
      if (email && email !== match.email) changes.email = email
      if (joinedOn !== match.joinedOn) changes.joinedOn = joinedOn
      if (coachId != null && coachId !== match.coachId) changes.coachId = coachId
      if (externalId && !match.externalId) {
        changes.externalId = externalId
        seenExt.add(externalId)
      }
      const restore = match.archivedAt != null
      if (restore) note({ code: 'restored' })
      if (restore || Object.keys(changes).length) plan.updates.push({ id: match.id, row: n, changes, restore })
      else skip({ code: 'upToDate' })
      plan.problems.push(...notes)
      return
    }

    if (externalId && seenExt.has(externalId)) return skip({ code: 'repeated' })
    // As for an existing member: a phone an earlier new row claimed is the same person only when one of the two rows
    // has no ID. Two different IDs are two people, and the later one is created without the phone.
    if (phone && seenPhone.has(phone)) {
      const earlierId = seenPhone.get(phone)
      if (!externalId || !earlierId) return skip({ code: 'repeated' })
    }
    let newPhone = phone
    if (newPhone && phoneOwner.has(newPhone)) {
      note({ code: 'phoneTaken', value: phoneRaw })
      newPhone = null
    }
    if (externalId) seenExt.add(externalId)
    if (phone && !seenPhone.has(phone)) seenPhone.set(phone, externalId)
    if (newPhone) phoneOwner.set(newPhone, `row ${n}`)
    plan.creates.push({ row: n, externalId, firstName, lastName, phone: newPhone, email, joinedOn, coachId })
    plan.problems.push(...notes)
  })
  return plan
}

export function planCheckins({
  rows,
  mapping,
  rowNumbers,
  country,
  dateOrder,
  members,
  existing,
  timeZone,
  now,
}: PlanRows & {
  members: readonly ImportExistingMember[]
  existing: readonly { memberId: number; at: string }[]
  timeZone: string
  now: Date
}): CheckinPlan {
  const plan: CheckinPlan = { creates: [], restores: [], skipped: [], problems: [] }
  const missing = missingFields('checkins', mapping)
  if (missing.includes('checkinTime')) plan.problems.push({ code: 'noCheckinTimeColumn', row: null })
  if (missing.includes('match')) plan.problems.push({ code: 'noMatchColumn', row: null })
  if (plan.problems.length) return plan

  const byExt = new Map<string, ImportExistingMember>()
  const byPhone = new Map<string, ImportExistingMember>()
  for (const m of members) {
    if (m.externalId) byExt.set(m.externalId, m)
    if (m.phone) byPhone.set(m.phone, m)
  }
  const nowMs = now.getTime()
  const times = new Map<number, number[]>()
  for (const e of existing) {
    const list = times.get(e.memberId) ?? []
    list.push(new Date(e.at).getTime())
    times.set(e.memberId, list)
  }
  const restored = new Set<number>()

  rows.forEach((row, i) => {
    const n = rowNumbers?.[i] ?? i + 2
    const skip = (p: Omit<ImportProblem, 'row'>) => void plan.skipped.push({ ...p, row: n })
    const extRaw = cell(row, mapping, 'external_id')
    const ext = idOf(extRaw)
    const phoneRaw = cell(row, mapping, 'phone')
    const phone = phoneOf(phoneRaw, country)
    // As in planMembers: a row with an ID takes a phone match only from a member with no ID or the same one.
    let member = ext ? byExt.get(ext) : undefined
    if (!member && phone) {
      const byNumber = byPhone.get(phone)
      if (byNumber && !(ext && byNumber.externalId && byNumber.externalId !== ext)) member = byNumber
    }
    if (!member) {
      if (extRaw) return skip({ code: 'noMemberId', value: extRaw })
      return skip(phoneRaw ? { code: 'noMemberPhone', value: phoneRaw } : { code: 'noMemberKey' })
    }

    const raw = cell(row, mapping, 'checked_in_at')
    const at = parseLocalDateTime(raw, timeZone, dateOrder)
    if (!at) return skip(raw ? { code: 'badCheckinTime', value: raw } : { code: 'noCheckinTime' })
    const ms = new Date(at).getTime()
    if (ms > nowMs) return skip({ code: 'future' })
    if (localDate(at, timeZone) < member.joinedOn) return skip({ code: 'beforeJoined', date: member.joinedOn })
    const list = times.get(member.id) ?? []
    if (list.some((t) => Math.abs(t - ms) < HOUR_MS)) return skip({ code: 'withinHour' })
    list.push(ms)
    times.set(member.id, list)
    plan.creates.push({ row: n, memberId: member.id, at })
    if (member.archivedAt != null && !restored.has(member.id)) {
      restored.add(member.id)
      plan.restores.push({ row: n, id: member.id })
      plan.problems.push({ code: 'restored', row: n })
    }
  })
  return plan
}
