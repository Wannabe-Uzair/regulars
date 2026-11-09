// The CSV import's use cases (FR-IMPORT-01 to 10). The preview reads, maps and plans a file against the gym as it is
// now, and saves nothing. The commit reads the same input the same way, plans again inside the write's own
// transaction, writes everything at once, then publishes one import.committed however many rows came in (FR-LIVE-03).
import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportProblem as WireProblem,
  ImportRequest,
} from '@tenure/contracts'
import { t } from '@tenure/copy'
import { DuplicateError, type Gym } from '@tenure/db'
import {
  type ImportGym,
  type ImportPlan,
  type ImportProblem,
  type ImportProblemCode,
  type ReadImport,
  importCounts,
  importProblems,
  isOpenMarket,
  isRowProblem,
  localeFor,
  planImport,
  readImport,
} from '@tenure/domain'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'

/** How many parsed rows the preview's sample shows. */
const SAMPLE_ROWS = 10

/** The gym's country (the US outside the open markets, as the demo falls back) and time zone. */
const importGym = (gym: Gym): ImportGym => ({
  country: isOpenMarket(gym.country) ? gym.country : 'US',
  timeZone: gym.timezone,
})

/** The file read and mapped; a mapping that names a column the file doesn't have is `generic`. */
function read(input: ImportRequest, gym: ImportGym): ReadImport {
  const result = readImport(input, gym)
  if (!result) throw new ApiError('generic')
  return result
}

/** A join date as the gym writes dates: "3 Apr 2026" in the UK, "Apr 3, 2026" in the US. */
function gymDate(date: string, gym: ImportGym): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(localeFor(gym.country), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1))
}

type Sentence = (p: ImportProblem, gym: ImportGym) => string

const value = (p: ImportProblem) => p.value ?? ''

// Each problem's sentence. A switch on the code would do too; a table keeps t()'s ids literal and is checked whole.
const SENTENCES: Record<ImportProblemCode, Sentence> = {
  unclosedQuote: () => t('import.problem.unclosedQuote'),
  extraColumns: (p) =>
    t('import.problem.extraColumns', { n: p.row ?? 0, count: p.count ?? 0, columns: p.columns ?? 0 }),
  missingColumns: (p) =>
    t('import.problem.missingColumns', { n: p.row ?? 0, count: p.count ?? 0, columns: p.columns ?? 0 }),
  findName: () => t('import.problem.findName'),
  findJoinDate: () => t('import.problem.findJoinDate'),
  findCheckinTime: () => t('import.problem.findCheckinTime'),
  findMatch: () => t('import.problem.findMatch'),
  noNameColumn: () => t('import.problem.noNameColumn'),
  noJoinDateColumn: () => t('import.problem.noJoinDateColumn'),
  noCheckinTimeColumn: () => t('import.problem.noCheckinTimeColumn'),
  noMatchColumn: () => t('import.problem.noMatchColumn'),
  noFirstName: () => t('import.problem.noFirstName'),
  noName: () => t('import.problem.noName'),
  noJoinDate: () => t('import.problem.noJoinDate'),
  badJoinDate: (p) => t('import.problem.badJoinDate', { value: value(p) }),
  badPhone: (p) => t('import.problem.badPhone', { value: value(p) }),
  phoneTaken: (p) => t('import.problem.phoneTaken', { value: value(p) }),
  badEmail: (p) => t('import.problem.badEmail', { value: value(p) }),
  unknownCoach: (p) => t('import.problem.unknownCoach', { value: value(p) }),
  idUsedEarlier: (p) => t('import.problem.idUsedEarlier', { value: value(p) }),
  repeated: () => t('import.problem.repeated'),
  upToDate: () => t('import.problem.upToDate'),
  restored: () => t('import.problem.restored'),
  noMemberId: (p) => t('import.problem.noMemberId', { value: value(p) }),
  noMemberPhone: (p) => t('import.problem.noMemberPhone', { value: value(p) }),
  noMemberKey: () => t('import.problem.noMemberKey'),
  noCheckinTime: () => t('import.problem.noCheckinTime'),
  badCheckinTime: (p) => t('import.problem.badCheckinTime', { value: value(p) }),
  future: () => t('import.problem.future'),
  beforeJoined: (p, gym) => t('import.problem.beforeJoined', { date: p.date ? gymDate(p.date, gym) : '' }),
  withinHour: () => t('import.problem.withinHour'),
}

/** A problem as the screen shows it: a row's own problem after "Row {n}: ". */
function toWire(p: ImportProblem, gym: ImportGym): WireProblem {
  const sentence = SENTENCES[p.code](p, gym)
  const message =
    isRowProblem(p.code) && p.row !== null ? t('import.problem', { n: p.row, problem: sentence }) : sentence
  return { code: p.code, row: p.row, message }
}

export async function previewImport(ctx: AppContext, gym: Gym, input: ImportRequest): Promise<ImportPreviewResponse> {
  const g = importGym(gym)
  const file = read(input, g)
  let planned: ImportPlan | null = null
  if (file.missing.length === 0) {
    const members = await ctx.repos.members.listByGym(gym.id)
    const staff = (await ctx.repos.users.listActiveByGym(gym.id)).map((u) => ({ id: u.id, email: u.email }))
    const checkins = input.kind === 'checkins' ? await ctx.repos.checkins.listByGym(gym.id) : []
    planned = planImport(file, { members, staff, checkins: () => checkins }, g, ctx.clock())
  }
  const { parsed } = file
  return {
    kind: file.kind,
    columns: parsed.header,
    sample: parsed.rows
      .slice(0, SAMPLE_ROWS)
      .map((cells, i) => ({ row: parsed.rowNumbers[i] ?? i + 2, cells: [...cells] })),
    rowCount: parsed.rows.length,
    mapping: file.mapping,
    missing: file.missing,
    dates: { ...file.dates, rows: file.readings },
    counts: planned ? importCounts(planned) : null,
    problems: importProblems(file, planned).map((p) => toWire(p, g)),
  }
}

/** The plan as applyImport's writes. */
function writesOf(planned: ImportPlan) {
  if (planned.kind === 'members') {
    const { creates, updates } = planned.plan
    return {
      creates: creates.map(({ externalId, firstName, lastName, phone, email, joinedOn, coachId }) => ({
        externalId,
        firstName,
        lastName,
        phone,
        email,
        joinedOn,
        coachId,
      })),
      updates: updates.map(({ id, changes, restore }) => ({ id, changes, restore })),
      checkins: [],
    }
  }
  const { creates, restores } = planned.plan
  return {
    creates: [],
    updates: restores.map(({ id }) => ({ id, changes: {}, restore: true })),
    checkins: creates.map(({ memberId, at }) => ({ memberId, at })),
  }
}

export async function commitImport(ctx: AppContext, gym: Gym, input: ImportRequest): Promise<ImportCommitResponse> {
  const g = importGym(gym)
  const file = read(input, g)
  const now = ctx.clock()
  let planned: ImportPlan | undefined
  try {
    await ctx.repos.members.applyImport({
      gymId: gym.id,
      at: now.toISOString(),
      plan: (snapshot) => {
        planned = planImport(file, snapshot, g, now)
        return writesOf(planned)
      },
    })
  } catch (err) {
    // The planner keeps every phone and ID to one member, so this is a write it didn't foresee: nothing was saved.
    if (err instanceof DuplicateError) throw new ApiError('duplicate')
    throw err
  }
  if (!planned) throw new Error('import: the commit was not planned')
  const counts = importCounts(planned)
  if (counts.created + counts.updated > 0) ctx.bus.publish({ type: 'import.committed', gymId: gym.id })
  return { ...counts, problems: importProblems(file, planned).map((p) => toWire(p, g)) }
}
