import type { WebFeature } from '../../app/registry.ts'

export const kiosk: WebFeature = {
  name: 'kiosk',
  routes: [{ path: '/kiosk/:token', screen: () => import('./screens/Kiosk.tsx') }],
}
