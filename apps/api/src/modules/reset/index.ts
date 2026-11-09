// Password reset: asking for a link, and choosing a new password with it.
// A stub until its job fills it: it registers no routes yet, so it declares none.
import type { ApiModule } from '../../platform/module.ts'

export const resetModule: ApiModule = {
  name: 'reset',
  register: () => {},
  publicPaths: [],
  ownerPaths: [],
}
