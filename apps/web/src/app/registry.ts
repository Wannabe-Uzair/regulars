// The feature registry's shape. A feature is a folder under src/features/ whose index.ts exports one WebFeature;
// app/features.ts lists them. Nothing else in the app knows a feature's routes, nav or query keys.
import type { Role } from '@tenure/contracts'
import type { ComponentType } from 'react'
import type { LiveInvalidations } from '../shared/live/live.ts'

/** Loads a screen module on first visit, so each feature's screens land in their own chunks. */
export type ScreenLoader = () => Promise<{ default: ComponentType }>

export type FeatureRoute = {
  /** Absolute path. `/app` and paths under it render inside the app shell and need a session. */
  path: string
  screen: ScreenLoader
  /** A coach who opens it is sent to /app. Only meaningful under /app. */
  ownerOnly?: boolean
}

export type NavItem = {
  to: string
  /** The label for the viewer's role (owner and coach nav can read differently). */
  label: (role: Role) => string
  /** Hidden from coaches. */
  ownerOnly?: boolean
  /** Left out of the navigation for now (the stall version), so nobody lands on an empty page. Its route stays. */
  hidden?: boolean
}

export type WebFeature = {
  name: string
  routes: readonly FeatureRoute[]
  /** App shell nav items, shown in registry order. */
  nav?: readonly NavItem[]
  /** Which of this feature's queries each live event makes stale. */
  live?: LiveInvalidations
}

export const isAppPath = (path: string): boolean => path === '/app' || path.startsWith('/app/')

/** The nav items a role sees, in registry order: none that is hidden, and owner-only ones for owners. */
export function navFor(features: readonly WebFeature[], role: Role): NavItem[] {
  return features.flatMap((f) => f.nav ?? []).filter((item) => !item.hidden && (role === 'owner' || !item.ownerOnly))
}

/** Every feature's live invalidations, merged by event type. */
export function liveFor(features: readonly WebFeature[]): LiveInvalidations {
  const merged: LiveInvalidations = {}
  for (const feature of features) {
    for (const [type, keys] of Object.entries(feature.live ?? {}) as [
      keyof LiveInvalidations,
      LiveInvalidations[keyof LiveInvalidations],
    ][]) {
      merged[type] = [...(merged[type] ?? []), ...(keys ?? [])]
    }
  }
  return merged
}
