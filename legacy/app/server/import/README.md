# CSV import library

Pure functions (no I/O, no dependencies) for importing gym-software exports. A route parses, plans, then writes the plan to SQLite in one transaction.

| File | Exports |
| --- | --- |
| `csv.mjs` | `parseCsv(text)` -> `{header, rows, rowNumbers, problems}` (RFC 4180; ragged rows are reported in `problems`) |
| `mapping.mjs` | `guessMapping(kind, header)` -> `{mapping: {field: columnIndex\|null}, problems}` |
| `normalize.mjs` | `phoneE164`, `parseDate`, `parseLocalDateTime(s, tz)`, `localDate(iso, tz)`, `cleanName`, `cleanEmail` |
| `plan.mjs` | `planMembers`, `planCheckins` |

Notes
- Row numbers in messages are spreadsheet rows (header = row 1). Pass `rowNumbers` from `parseCsv` so skipped blank lines don't shift them.
- Ambiguous fall-back times (e.g. 2026-11-01 01:30 in America/Chicago) resolve to the first occurrence.
- "Duplicate within 1 hour" means a gap of less than 60 minutes to an existing or earlier imported check-in.
- `planCheckins` takes an optional `now` (default current time) for the future-time check.

## Samples

`samples/members.csv` and `samples/checkins.csv` end their check-ins two days before the day the generator runs, in any time zone. To regenerate for another date:
`node samples/make-samples.mjs 2027-02-15`.

Tests: `node --test server/import/test/`.
