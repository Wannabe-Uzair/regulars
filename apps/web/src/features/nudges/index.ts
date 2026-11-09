import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'

export const nudges: WebFeature = {
  name: 'nudges',
  routes: [{ path: '/app/nudges', screen: () => import('./screens/Nudges.tsx') }],
  nav: [
    { to: '/app/nudges', label: (role) => t(role === 'owner' ? 'nav.owner.nudges' : 'nav.coach.nudges'), hidden: true },
  ],
}
