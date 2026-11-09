// The module registry and each module's access declarations (NFR-SEC-04). The sweep that calls every route as each
// kind of user is the permissions test's; this checks the declarations themselves.
import { Hono } from 'hono'
import { describe, expect, test } from 'vitest'
import { defaultModules } from '../modules/index.ts'
import { createTestContext } from './context.ts'
import type { ApiModule, AppEnv } from './module.ts'

/** The routes a module registers, as `METHOD /api/path`; middleware (`ALL`) left out. */
function registered(module: ApiModule): Set<string> {
  const router = new Hono<AppEnv>()
  module.register(router, createTestContext())
  return new Set(router.routes.filter((r) => r.method !== 'ALL').map((r) => `${r.method} /api${r.path}`))
}

describe('the module registry', () => {
  test('NFR-SEC-04 every first-version module is registered once', () => {
    expect(defaultModules.map((m) => m.name)).toEqual([
      'health',
      'auth',
      'realtime',
      'today',
      'members',
      'kiosk',
      'nudges',
      'templates',
      'reports',
      'billing',
      'settings',
      'staff',
      'invites',
      'import',
      'reset',
      'outbox',
      'demo',
    ])
  })

  test.each(defaultModules.map((m) => [m.name, m] as const))(
    'NFR-SEC-04 %s declares its public and owner-only routes, each one it registers, none both',
    (_, module) => {
      expect(module.publicPaths).toBeDefined()
      expect(module.ownerPaths).toBeDefined()
      const routes = registered(module)
      const declared = [...(module.publicPaths ?? []), ...(module.ownerPaths ?? [])]
      for (const key of declared) expect(routes, key).toContain(key)
      expect(new Set(declared).size).toBe(declared.length)
    },
  )
})
