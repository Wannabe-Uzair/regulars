// What the import says about a file and its rows. Domain can't read copy, so each problem is a code: the API turns
// it into the sentence `import.problem.<code>`, wrapping a row's own problem in "Row {n}: …" (FR-IMPORT-05).

/** Problems with the whole file: reading it, then its columns. Each is a sentence of its own. */
export const FILE_PROBLEM_CODES = [
  'unclosedQuote',
  'extraColumns',
  'missingColumns',
  'findName',
  'findJoinDate',
  'findCheckinTime',
  'findMatch',
  'noNameColumn',
  'noJoinDateColumn',
  'noCheckinTimeColumn',
  'noMatchColumn',
] as const

/** Problems with one row, each said after "Row {n}: ". */
export const ROW_PROBLEM_CODES = [
  'noFirstName',
  'noName',
  'noJoinDate',
  'badJoinDate',
  'badPhone',
  'phoneTaken',
  'badEmail',
  'unknownCoach',
  'idUsedEarlier',
  'repeated',
  'upToDate',
  'restored',
  'noMemberId',
  'noMemberPhone',
  'noMemberKey',
  'noCheckinTime',
  'badCheckinTime',
  'future',
  'beforeJoined',
  'withinHour',
] as const

export const IMPORT_PROBLEM_CODES = [...FILE_PROBLEM_CODES, ...ROW_PROBLEM_CODES] as const

export type FileProblemCode = (typeof FILE_PROBLEM_CODES)[number]
export type RowProblemCode = (typeof ROW_PROBLEM_CODES)[number]
export type ImportProblemCode = (typeof IMPORT_PROBLEM_CODES)[number]

/**
 * One line of the import's problems. `row` is the spreadsheet row (the header is row 1), or null for the whole file.
 * `value` is the cell the problem is about; `count` and `columns` are a ragged row's width and the header's; `date`
 * is the member's join date (`YYYY-MM-DD`) for `beforeJoined`.
 */
export interface ImportProblem {
  code: ImportProblemCode
  row: number | null
  value?: string
  count?: number
  columns?: number
  date?: string
}

export const isRowProblem = (code: ImportProblemCode): code is RowProblemCode =>
  (ROW_PROBLEM_CODES as readonly string[]).includes(code)
