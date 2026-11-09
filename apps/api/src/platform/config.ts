// The server's configuration, parsed from the environment. Pure: main.ts passes process.env in.
import path from 'node:path'
import { z } from 'zod'

/** apps/api/data/tenure.db: the old server kept its database in data/ beside its code, too. */
export const DEFAULT_DB_FILE = path.join(import.meta.dirname, '..', '..', 'data', 'tenure.db')

const PORT_RULE = 'must be a whole number from 1 to 65535'
const FLAG_RULE = 'must be 1, 0, true or false'
const FACTOR_RULE = 'must be a whole number from 1 to 1000'

const flag = z
  .enum(['1', '0', 'true', 'false'], { error: FLAG_RULE })
  .transform((v) => v === '1' || v === 'true')
  .default(false)

const Env = z.object({
  PORT: z
    .string()
    .regex(/^\d{1,5}$/, { error: PORT_RULE })
    .transform(Number)
    .refine((n) => n >= 1 && n <= 65535, { error: PORT_RULE })
    .default(5175),
  HOST: z.string().default('127.0.0.1'),
  /** A database file path, or ':memory:'. */
  TENURE_DB: z.string().default(DEFAULT_DB_FILE),
  /** Stall mode: also serve the built web app (`--stall` sets it, as the old server did). */
  TENURE_SERVE_CLIENT: flag,
  /** Mark the session cookie Secure. Set it when the app is served over HTTPS. */
  TENURE_SECURE_COOKIES: flag,
  /**
   * Test only: multiplies every rate limit, so the e2e servers' many sign-ups and kiosk check-ins don't trip them.
   * Never set it on the stall laptop or in Docker.
   */
  TENURE_LIMIT_FACTOR: z
    .string()
    .regex(/^\d{1,4}$/, { error: FACTOR_RULE })
    .transform(Number)
    .refine((n) => n >= 1 && n <= 1000, { error: FACTOR_RULE })
    .default(1),
})

export type Config = {
  port: number
  host: string
  dbFile: string
  stall: boolean
  secureCookies: boolean
  /** Every rate limit is multiplied by this (TENURE_LIMIT_FACTOR, test only). 1 by default. */
  limitFactor: number
}

/** Parse the environment. An empty variable counts as unset; a bad value throws one line per variable. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const set = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''))
  const result = Env.safeParse(set)
  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const key = String(issue.path[0])
      return `  ${key} ${issue.message} (got ${JSON.stringify(set[key])})`
    })
    throw new Error(`Bad configuration:\n${lines.join('\n')}`)
  }
  const e = result.data
  return {
    port: e.PORT,
    host: e.HOST,
    dbFile: e.TENURE_DB,
    stall: e.TENURE_SERVE_CLIENT,
    secureCookies: e.TENURE_SECURE_COOKIES,
    limitFactor: e.TENURE_LIMIT_FACTOR,
  }
}
