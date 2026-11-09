import type { WebFeature } from '../../app/registry.ts'

export const auth: WebFeature = {
  name: 'auth',
  routes: [
    { path: '/login', screen: () => import('./screens/Login.tsx') },
    { path: '/signup', screen: () => import('./screens/Signup.tsx') },
  ],
}
