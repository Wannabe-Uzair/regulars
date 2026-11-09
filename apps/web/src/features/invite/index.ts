import type { WebFeature } from '../../app/registry.ts'

export const invite: WebFeature = {
  name: 'invite',
  routes: [{ path: '/invite/:token', screen: () => import('./screens/Invite.tsx') }],
}
