// Every API module, in one list. A new module is a folder plus one line here.
import type { ApiModule } from '../platform/module.ts'
import { authModule } from './auth/index.ts'
import { billingModule } from './billing/index.ts'
import { demoModule } from './demo/index.ts'
import { healthModule } from './health/index.ts'
import { importModule } from './import/index.ts'
import { invitesModule } from './invites/index.ts'
import { kioskModule } from './kiosk/index.ts'
import { membersModule } from './members/index.ts'
import { nudgesModule } from './nudges/index.ts'
import { outboxModule } from './outbox/index.ts'
import { realtimeModule } from './realtime/index.ts'
import { reportsModule } from './reports/index.ts'
import { resetModule } from './reset/index.ts'
import { settingsModule } from './settings/index.ts'
import { staffModule } from './staff/index.ts'
import { templatesModule } from './templates/index.ts'
import { todayModule } from './today/index.ts'

export const defaultModules: readonly ApiModule[] = [
  healthModule,
  authModule,
  realtimeModule,
  todayModule,
  membersModule,
  kioskModule,
  nudgesModule,
  templatesModule,
  reportsModule,
  billingModule,
  settingsModule,
  staffModule,
  invitesModule,
  importModule,
  resetModule,
  outboxModule,
  demoModule,
]
