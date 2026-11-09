import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'

export const billing: WebFeature = {
  name: 'billing',
  routes: [{ path: '/app/billing', ownerOnly: true, screen: () => import('./screens/Billing.tsx') }],
  nav: [{ to: '/app/billing', label: () => t('nav.owner.billing'), ownerOnly: true, hidden: true }],
}
