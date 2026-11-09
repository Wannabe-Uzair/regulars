// The import from text to plan, shared by the preview and the commit so both read a file the same way: parse, map
// (the owner's mapping, else the suggestion), settle the date order, then plan against the gym's snapshot.
import type { Country } from '../country.ts'
import { localDate } from '../dates.ts'
import { parseCsv, type ParsedCsv } from './csv.ts'
import { type DateOrder, dateOrderFor, detectDateOrder, parseDate, parseLocalDateTime } from './dates.ts'
import {
  guessMapping,
  type ImportKind,
  type ImportMapping,
  type MissingField,
  missingFields,
  resolveMapping,
} from './mapping.ts'
import {
  type CheckinPlan,
  type ImportExistingMember,
  type ImportStaff,
  type MemberPlan,
  planCheckins,
  planMembers,
} from './plan.ts'
import type { FileProblemCode, ImportProblem } from './problems.ts'

/** What the owner sends: the same for the preview and the commit, so the commit plans exactly what was previewed. */
export interface ImportInput {
  kind: ImportKind
  csv: string
  /** Each field to a column index, a header name, or null; when absent, the suggestion from the headers. */
  mapping?: Readonly<Record<string, number | string | null>>
  /** Flips the order the dates are read in; when absent, the file's own order, else the country's. */
  dateOrder?: DateOrder
}

export interface ImportGym {
  country: Country
  timeZone: string
}

/** Where the order came from: the owner's switch, the file's own dates, or the gym's country. */
export type DateOrderSource = 'request' | 'file' | 'country'

export interface DateOrderChoice {
  order: DateOrder
  source: DateOrderSource
  /** The order the file's dates settle, or null when none settles it or they disagree. */
  file: DateOrder | null
  /** The gym country's order. */
  country: DateOrder
}

/** A row's date as read: the join date for members; the check-in's instant, and its gym-local date, for check-ins. */
export interface DateReading {
  row: number
  raw: string
  date: string | null
  at: string | null
}

export interface ReadImport {
  kind: ImportKind
  parsed: ParsedCsv
  mapping: ImportMapping
  missing: MissingField[]
  dates: DateOrderChoice
  /** The first rows' dates, as read in `dates.order`. */
  readings: DateReading[]
}

/** How many rows' dates the preview shows as read. */
export const DATE_READINGS = 3

const DATE_FIELD = { members: 'joined_on', checkins: 'checked_in_at' } as const

/** The file read and mapped, or undefined when the owner's mapping names a column the file doesn't have. */
export function readImport(input: ImportInput, gym: ImportGym): ReadImport | undefined {
  const parsed = parseCsv(input.csv)
  const mapping = input.mapping
    ? resolveMapping(input.kind, parsed.header, input.mapping)
    : guessMapping(input.kind, parsed.header)
  if (!mapping) return undefined
  const column = mapping[DATE_FIELD[input.kind]]
  const cells: { row: number; raw: string }[] = []
  if (column != null) {
    parsed.rows.forEach((r, i) => {
      const raw = (r[column] ?? '').trim()
      if (raw) cells.push({ row: parsed.rowNumbers[i] ?? i + 2, raw })
    })
  }
  const file = detectDateOrder(cells.map((c) => c.raw))
  const country = dateOrderFor(gym.country)
  const order = input.dateOrder ?? file ?? country
  const source: DateOrderSource = input.dateOrder ? 'request' : file ? 'file' : 'country'
  const readings = cells.slice(0, DATE_READINGS).map(({ row, raw }): DateReading => {
    if (input.kind === 'members') return { row, raw, date: parseDate(raw, order), at: null }
    const at = parseLocalDateTime(raw, gym.timeZone, order)
    return { row, raw, date: at ? localDate(at, gym.timeZone) : null, at }
  })
  return {
    kind: input.kind,
    parsed,
    mapping,
    missing: missingFields(input.kind, mapping),
    dates: { order, source, file, country },
    readings,
  }
}

/** The gym as the planner needs it, read in the commit's transaction. Check-ins are read only for a check-ins file. */
export interface ImportSnapshot {
  members: readonly ImportExistingMember[]
  staff: readonly ImportStaff[]
  checkins: () => readonly { memberId: number; at: string }[]
}

export type ImportPlan = { kind: 'members'; plan: MemberPlan } | { kind: 'checkins'; plan: CheckinPlan }

export function planImport(read: ReadImport, snapshot: ImportSnapshot, gym: ImportGym, now: Date): ImportPlan {
  const rows = { rows: read.parsed.rows, rowNumbers: read.parsed.rowNumbers, mapping: read.mapping }
  const common = { ...rows, country: gym.country, dateOrder: read.dates.order }
  if (read.kind === 'members') {
    return {
      kind: 'members',
      plan: planMembers({ ...common, existing: snapshot.members, staff: snapshot.staff }),
    }
  }
  return {
    kind: 'checkins',
    plan: planCheckins({
      ...common,
      members: snapshot.members,
      existing: snapshot.checkins(),
      timeZone: gym.timeZone,
      now,
    }),
  }
}

export interface ImportCounts {
  /** New members, or new check-ins. */
  created: number
  /** Existing members changed, restores included. */
  updated: number
  /** Of those, the archived members brought back. */
  restored: number
  skipped: number
}

export function importCounts({ kind, plan }: ImportPlan): ImportCounts {
  if (kind === 'members') {
    return {
      created: plan.creates.length,
      updated: plan.updates.length,
      restored: plan.updates.filter((u) => u.restore).length,
      skipped: plan.skipped.length,
    }
  }
  return {
    created: plan.creates.length,
    updated: plan.restores.length,
    restored: plan.restores.length,
    skipped: plan.skipped.length,
  }
}

const FIND: Record<MissingField, FileProblemCode> = {
  name: 'findName',
  joinedOn: 'findJoinDate',
  checkinTime: 'findCheckinTime',
  match: 'findMatch',
}

/**
 * Every line, in order: reading the file; then, without a plan (the preview of a mapping that lacks a required field),
 * which columns to choose, else the plan's lines, the whole file's first and then row by row.
 */
export function importProblems(read: ReadImport, planned: ImportPlan | null): ImportProblem[] {
  const out = [...read.parsed.problems]
  if (!planned) {
    for (const field of read.missing) out.push({ code: FIND[field], row: null })
    return out
  }
  const lines = [...planned.plan.problems, ...planned.plan.skipped]
  const fileLines = lines.filter((p) => p.row === null)
  const rowLines = lines.filter((p) => p.row !== null).sort((a, b) => (a.row ?? 0) - (b.row ?? 0))
  return [...out, ...fileLines, ...rowLines]
}
