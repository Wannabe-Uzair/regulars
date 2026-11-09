import type { WebFeature } from '../../app/registry.ts'

export const website: WebFeature = {
  name: 'website',
  routes: [
    { path: '/', screen: () => import('./screens/Home.tsx') },
    { path: '/pricing', screen: () => import('./screens/Pricing.tsx') },
  ],
}
