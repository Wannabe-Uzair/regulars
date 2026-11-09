import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'

export const me: WebFeature = {
  name: 'me',
  routes: [{ path: '/app/me', screen: () => import('./screens/Me.tsx') }],
  nav: [{ to: '/app/me', label: () => t('nav.me'), hidden: true }],
}
