// The stand-in email outbox, in development only.
// A stub until its job fills it: it registers no routes yet, so it declares none.
import type { ApiModule } from '../../platform/module.ts'

export const outboxModule: ApiModule = {
  name: 'outbox',
  register: () => {},
  publicPaths: [],
  ownerPaths: [],
}
