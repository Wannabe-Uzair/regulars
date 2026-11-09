import { describe, expect, test } from 'vitest'
import { DEFAULT_DB_FILE, loadConfig } from './config.ts'

describe('loadConfig', () => {
  test('defaults: 127.0.0.1:5175, apps/api/data/tenure.db, no stall, no Secure cookies, the rate limits as they are', () => {
    expect(loadConfig({})).toEqual({
      port: 5175,
      host: '127.0.0.1',
      dbFile: DEFAULT_DB_FILE,
      stall: false,
      secureCookies: false,
      limitFactor: 1,
    })
    expect(DEFAULT_DB_FILE.endsWith('/apps/api/data/tenure.db')).toBe(true)
  })

  test('reads every variable', () => {
    const env = {
      PORT: '8080',
      HOST: '0.0.0.0',
      TENURE_DB: ':memory:',
      TENURE_SERVE_CLIENT: '1',
      TENURE_SECURE_COOKIES: 'true',
      TENURE_LIMIT_FACTOR: '50',
    }
    expect(loadConfig(env)).toEqual({
      port: 8080,
      host: '0.0.0.0',
      dbFile: ':memory:',
      stall: true,
      secureCookies: true,
      limitFactor: 50,
    })
    expect(loadConfig({ TENURE_SERVE_CLIENT: '0', TENURE_SECURE_COOKIES: 'false' })).toMatchObject({
      stall: false,
      secureCookies: false,
    })
  })

  test('an empty variable counts as unset, as the old server read it', () => {
    expect(loadConfig({ PORT: '', HOST: '', TENURE_DB: '', TENURE_SERVE_CLIENT: '' })).toEqual(loadConfig({}))
  })

  test('ignores variables it does not know', () => {
    expect(loadConfig({ PATH: '/usr/bin', HOME: '/Users/x' })).toEqual(loadConfig({}))
  })

  test.each(['abc', '0', '65536', '80.5', '-1', '0x10'])('PORT=%s fails with a clear message', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(
      `Bad configuration:\n  PORT must be a whole number from 1 to 65535 (got "${port}")`,
    )
  })

  test.each(['0', '1001', '1.5', '-2', 'x', '10000'])('NFR-SEC-03 TENURE_LIMIT_FACTOR=%s fails with a clear message', (factor) => {
    expect(() => loadConfig({ TENURE_LIMIT_FACTOR: factor })).toThrow(
      `Bad configuration:\n  TENURE_LIMIT_FACTOR must be a whole number from 1 to 1000 (got "${factor}")`,
    )
  })

  test('a bad flag fails, and every bad variable is named', () => {
    expect(() => loadConfig({ TENURE_SERVE_CLIENT: 'yes', PORT: 'x' })).toThrow(
      /PORT must be a whole number.*\(got "x"\)\n {2}TENURE_SERVE_CLIENT must be 1, 0, true or false \(got "yes"\)/s,
    )
  })
})
