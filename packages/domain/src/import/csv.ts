// The CSV reader (FR-IMPORT-01), ported from legacy/app/server/import/csv.mjs: RFC 4180 quoting, a BOM, CRLF, LF or
// CR line ends. It never throws; a ragged row or an unclosed quote is a problem. The separator is the comma, unless
// the first line splits into more fields on a semicolon (a Québec Excel export) or a tab (cells pasted from a sheet).
import type { ImportProblem } from './problems.ts'

export interface ParsedCsv {
  /** The first non-blank line, trimmed. */
  header: string[]
  rows: string[][]
  /** rowNumbers[i] is rows[i]'s spreadsheet row: the header's line is row 1, and blank lines still count. */
  rowNumbers: number[]
  problems: ImportProblem[]
}

const SEPARATORS = [',', ';', '\t'] as const

/** The separator that splits the first non-blank line into the most fields outside quotes; a tie goes to the comma. */
function sniffSeparator(s: string): string {
  const counts = new Map<string, number>(SEPARATORS.map((sep) => [sep, 0]))
  let inQuotes = false
  let seen = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string
    if (c === '"') inQuotes = !inQuotes
    else if (!inQuotes && (c === '\n' || c === '\r')) {
      if (seen) break
    } else if (!inQuotes && counts.has(c)) {
      counts.set(c, (counts.get(c) ?? 0) + 1)
      seen = true
    } else if (c.trim() !== '') seen = true
  }
  let best: string = ','
  for (const sep of SEPARATORS) if ((counts.get(sep) ?? 0) > (counts.get(best) ?? 0)) best = sep
  return best
}

export function parseCsv(text: string): ParsedCsv {
  let s = text
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  const sep = sniffSeparator(s)
  const records: string[][] = []
  let rec: string[] = []
  let field = ''
  let inQuotes = false
  let any = false // anything seen in the current record
  const endField = () => {
    rec.push(field)
    field = ''
  }
  const endRecord = () => {
    endField()
    records.push(rec)
    rec = []
    any = false
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"' && field === '') {
      inQuotes = true
      any = true
    } else if (c === sep) {
      endField()
      any = true
    } else if (c === '\r') {
      if (s[i + 1] === '\n') i++
      endRecord()
    } else if (c === '\n') endRecord()
    else {
      field += c
      any = true
    }
  }
  if (any || field !== '' || rec.length) endRecord()

  const problems: ImportProblem[] = []
  if (inQuotes) problems.push({ code: 'unclosedQuote', row: null })
  let header: string[] = []
  const rows: string[][] = []
  const rowNumbers: number[] = []
  let headerFound = false
  records.forEach((r, idx) => {
    if (r.every((v) => v.trim() === '')) return // a blank line
    if (!headerFound) {
      header = r.map((v) => v.trim())
      headerFound = true
      return
    }
    rows.push(r)
    rowNumbers.push(idx + 1)
  })
  rows.forEach((r, i) => {
    const row = rowNumbers[i] ?? null
    if (r.length > header.length) problems.push({ code: 'extraColumns', row, count: r.length, columns: header.length })
    else if (r.length < header.length) {
      problems.push({ code: 'missingColumns', row, count: r.length, columns: header.length })
    }
  })
  return { header, rows, rowNumbers, problems }
}
