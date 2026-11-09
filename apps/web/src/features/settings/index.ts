import { t } from '@tenure/copy'
import type { WebFeature } from '../../app/registry.ts'
import { sessionKey } from '../../shared/session/session.ts'
import { settingsKeys } from './api.ts'

export const settings: WebFeature = {
  name: 'settings',
  routes: [{ path: '/app/settings', ownerOnly: true, screen: () => import('./screens/Settings.tsx') }],
  nav: [{ to: '/app/settings', label: () => t('nav.owner.settings'), ownerOnly: true }],
  // A save on any device renames the gym or moves its country or zone: the session's gym and this screen refresh.
  live: { 'settings.updated': [sessionKey, settingsKeys.all] },
}
