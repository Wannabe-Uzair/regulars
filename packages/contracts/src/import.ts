// The CSV import (owner only): POST /api/import/preview reads and plans a file and saves nothing; POST
// /api/import/commit plans the same input again and writes it in one transaction (FR-IMPORT-01 to 10). Both take the
// same request, so the commit does exactly what the preview showed. Every validation issue's message is an ErrorCode.
import {
  CHECKIN_IMPORT_FIELDS,
  DATE_ORDERS,
  IMPORT_KINDS,
  IMPORT_PROBLEM_CODES,
  MEMBER_IMPORT_FIELDS,
  MISSING_FIELDS,
} from '@tenure/domain'
import { z } from 'zod'
import { withCode } from './errors.ts'
import { IsoDate, IsoInstant } from './wire.ts'

/** The most CSV text an import takes, in UTF-8 bytes (FR-IMPORT-01). The whole request may be up to 4 MB. */
export const MAX_CSV_BYTES = 2 * 1024 * 1024

/** The size of `text` in UTF-8 bytes, the measure MAX_CSV_BYTES is in. */
export const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length

export const ImportKind = z.enum(IMPORT_KINDS)
export type ImportKind = z.infer<typeof ImportKind>

/** 'mdy' reads 03/04/2026 as 4 March, 'dmy' as 3 April. */
export const DateOrder = z.enum(DATE_ORDERS)
export type DateOrder = z.infer<typeof DateOrder>

/** Every field either kind maps; members use MEMBER_IMPORT_FIELDS and check-ins CHECKIN_IMPORT_FIELDS (domain). */
export const ImportField = z.enum([...new Set([...MEMBER_IMPORT_FIELDS, ...CHECKIN_IMPORT_FIELDS])])
export type ImportField = z.infer<typeof ImportField>

const generic = withCode('generic')

export const ImportRequest = z.object(
  {
    kind: z.enum(IMPORT_KINDS, generic),
    /** The file's text, or the pasted text: at most MAX_CSV_BYTES. */
    csv: z.string(generic).refine((csv) => utf8Bytes(csv) <= MAX_CSV_BYTES, withCode('importTooBig')),
    /**
     * Each field to a column index, a header name, or null (or '') for none; other fields are ignored, and a field
     * left out is none. A value naming no column is refused (`generic`). Absent: the suggestion from the headers.
     */
    mapping: z.record(z.string(generic), z.union([z.number(), z.string(), z.null()], generic), generic).optional(),
    /** The owner's switch. Absent: the order the file's dates settle, else the gym country's. */
    dateOrder: z.enum(DATE_ORDERS, generic).optional(),
  },
  withCode('generic'),
)
export type ImportRequest = z.infer<typeof ImportRequest>

export const ImportPreviewRequest = ImportRequest
export type ImportPreviewRequest = ImportRequest
export const ImportCommitRequest = ImportRequest
export type ImportCommitRequest = ImportRequest

/** Each of the kind's fields, to a column index or null. */
export const ImportMapping = z.partialRecord(ImportField, z.int().nonnegative().nullable())
export type ImportMapping = z.infer<typeof ImportMapping>

/**
 * One line of the problems (FR-IMPORT-05): `message` is the sentence to show, "Row {n}: …" for a row's own problem.
 * `row` is the spreadsheet row (the header is row 1), or null for the whole file.
 */
export const ImportProblem = z.object({
  code: z.enum(IMPORT_PROBLEM_CODES),
  row: z.int().positive().nullable(),
  message: z.string(),
})
export type ImportProblem = z.infer<typeof ImportProblem>

/** A row's date as read: `date` for a join date; for a check-in, `at` and its gym-local `date`. Null: unreadable. */
export const DateReading = z.object({
  row: z.int().positive(),
  raw: z.string(),
  date: IsoDate.nullable(),
  at: IsoInstant.nullable(),
})
export type DateReading = z.infer<typeof DateReading>

/**
 * How the dates are read (FR-IMPORT-04): the order used, and where it came from, the owner's switch ('request'), the
 * file's own dates ('file') or the gym's country ('country'); the order the file settles (null when none does), the
 * country's order, and the first rows as read in the order used.
 */
export const ImportDates = z.object({
  order: DateOrder,
  source: z.enum(['request', 'file', 'country']),
  file: DateOrder.nullable(),
  country: DateOrder,
  rows: z.array(DateReading),
})
export type ImportDates = z.infer<typeof ImportDates>

/**
 * What the import does: new members (or new check-ins), members updated (restores included), of those the archived
 * members restored (FR-IMPORT-09), and rows skipped.
 */
export const ImportCounts = z.object({
  created: z.int().nonnegative(),
  updated: z.int().nonnegative(),
  restored: z.int().nonnegative(),
  skipped: z.int().nonnegative(),
})
export type ImportCounts = z.infer<typeof ImportCounts>

/** The required fields the mapping lacks: a name (first or full) and a join date; a check-in time and an ID or phone. */
export const MissingField = z.enum(MISSING_FIELDS)
export type MissingField = z.infer<typeof MissingField>

export const ImportPreviewResponse = z.object({
  kind: ImportKind,
  /** The header row's names, in order. */
  columns: z.array(z.string()),
  /** The first 10 rows as parsed, with their spreadsheet row numbers. */
  sample: z.array(z.object({ row: z.int().positive(), cells: z.array(z.string()) })),
  rowCount: z.int().nonnegative(),
  mapping: ImportMapping,
  missing: z.array(MissingField),
  dates: ImportDates,
  /** What the commit would do now; null while a required field is missing, as nothing can be planned. */
  counts: ImportCounts.nullable(),
  problems: z.array(ImportProblem),
})
export type ImportPreviewResponse = z.infer<typeof ImportPreviewResponse>

/** What the commit did (FR-IMPORT-10), with the same lines the preview showed. */
export const ImportCommitResponse = ImportCounts.extend({ problems: z.array(ImportProblem) })
export type ImportCommitResponse = z.infer<typeof ImportCommitResponse>
