import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'
import { todayKeys } from './api.ts'

export const today: WebFeature = {
  name: 'today',
  routes: [{ path: '/app', screen: () => import('./screens/Today.tsx') }],
  nav: [{ to: '/app', label: (role) => t(role === 'owner' ? 'nav.owner.today' : 'nav.coach.today') }],
  // Today shows KPIs, slipping members, today's check-ins and the board: every member event can change it.
  live: {
    'checkin.recorded': [todayKeys.all],
    'member.joined': [todayKeys.all],
    'member.updated': [todayKeys.all],
    'member.deleted': [todayKeys.all],
    'nudge.recorded': [todayKeys.all],
    'import.committed': [todayKeys.all],
  },
}
