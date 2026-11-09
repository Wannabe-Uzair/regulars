import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'
import { reportsKeys } from './api.ts'

export const reports: WebFeature = {
  name: 'reports',
  routes: [{ path: '/app/reports', ownerOnly: true, screen: () => import('./screens/Reports.tsx') }],
  nav: [{ to: '/app/reports', label: () => t('nav.owner.reports'), ownerOnly: true }],
  // Visits, members (archived ones still count, deleted ones don't), nudges and imports all move the figures.
  live: {
    'checkin.recorded': [reportsKeys.all],
    'member.joined': [reportsKeys.all],
    'member.updated': [reportsKeys.all],
    'member.deleted': [reportsKeys.all],
    'nudge.recorded': [reportsKeys.all],
    'import.committed': [reportsKeys.all],
  },
}
