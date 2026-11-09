/** A write clashed with a unique constraint. `field` names what clashed, such as 'email', 'slug' or 'tokenHash'. */
export class DuplicateError extends Error {
  readonly field: string

  constructor(field: string, options?: ErrorOptions) {
    super(`Duplicate ${field}`, options)
    this.name = 'DuplicateError'
    this.field = field
  }
}

const duplicateCodes = new Set(['SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY'])

const camelCase = (column: string) => column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

/**
 * The DuplicateError for a failed write, or undefined when it failed for another reason. Drizzle wraps the SQLite
 * error, so the code is looked for along the cause chain. SQLite names the clash as `table.col[, table.col]`; the
 * field is the last column, so a clash on `(gym_id, phone)` is 'phone'.
 */
function duplicateOf(err: unknown): DuplicateError | undefined {
  for (let e: unknown = err; e instanceof Error; e = e.cause) {
    if ('code' in e && typeof e.code === 'string' && duplicateCodes.has(e.code)) {
      const column = e.message.split('constraint failed: ')[1]?.split(', ').at(-1)?.split('.').at(-1)
      return new DuplicateError(column ? camelCase(column) : 'unknown', { cause: err })
    }
  }
  return undefined
}

/** Run a write, turning a unique-constraint clash into a DuplicateError. Other errors pass through. */
export function guardDuplicates<T>(write: () => T): T {
  try {
    return write()
  } catch (err) {
    throw duplicateOf(err) ?? err
  }
}
