import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'
import { boardKeys } from './api.ts'

export const board: WebFeature = {
  name: 'board',
  routes: [{ path: '/app/board', screen: () => import('./screens/Board.tsx') }],
  nav: [{ to: '/app/board', label: (role) => t(role === 'owner' ? 'nav.owner.board' : 'nav.coach.board') }],
  // The board reads Today's read model, so it refreshes on the same events: each can change a row or the list.
  live: {
    'checkin.recorded': [boardKeys.all],
    'member.joined': [boardKeys.all],
    'member.updated': [boardKeys.all],
    'member.deleted': [boardKeys.all],
    'nudge.recorded': [boardKeys.all],
    'import.committed': [boardKeys.all],
  },
}
