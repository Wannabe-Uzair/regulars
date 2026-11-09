import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'

export const templates: WebFeature = {
  name: 'templates',
  routes: [{ path: '/app/templates', screen: () => import('./screens/Templates.tsx') }],
  nav: [
    {
      to: '/app/templates',
      label: (role) => t(role === 'owner' ? 'nav.owner.templates' : 'nav.coach.templates'),
      hidden: true,
    },
  ],
}
