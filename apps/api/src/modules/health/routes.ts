import type { HealthResponse } from '@tenure/contracts'
import type { Router } from '../../platform/module.ts'

export function healthRoutes(router: Router) {
  router.get('/health', (c) => c.json({ ok: true } satisfies HealthResponse))
}
