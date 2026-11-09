import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'
import { memberKeys } from './api.ts'

export const members: WebFeature = {
  name: 'members',
  routes: [
    { path: '/app/members', screen: () => import('./screens/Members.tsx') },
    { path: '/app/members/:id', screen: () => import('./screens/Member.tsx') },
  ],
  nav: [{ to: '/app/members', label: (role) => t(role === 'owner' ? 'nav.owner.members' : 'nav.coach.members') }],
  // The lists and the member page show weeks, status, the last visit, the facts and the nudges: each of these events
  // can change them.
  live: {
    'member.joined': [memberKeys.all],
    'member.updated': [memberKeys.all],
    'member.deleted': [memberKeys.all],
    'checkin.recorded': [memberKeys.all],
    'nudge.recorded': [memberKeys.all],
  },
}
