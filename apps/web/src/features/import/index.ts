import type { WebFeature } from '../../app/registry.ts'

export const importer: WebFeature = {
  name: 'import',
  routes: [{ path: '/app/settings/import', ownerOnly: true, screen: () => import('./screens/Import.tsx') }],
}
