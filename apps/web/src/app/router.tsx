import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { Loading } from './Loading.tsx'
import { NotFound } from './NotFound.tsx'
import { Root } from './Root.tsx'
import { RouteError } from './RouteError.tsx'
import { type FeatureRoute, isAppPath, type WebFeature } from './registry.ts'

/**
 * A lazy route Component whose failed load reaches the route error. The router swallows a failed lazy `Component`
 * and renders the route empty, so a chunk that fails to load becomes a component that throws it on render.
 */
const lazyComponent = (load: () => Promise<ComponentType>) => ({
  Component: async (): Promise<ComponentType> => {
    try {
      return await load()
    } catch (error) {
      return function FailedToLoad(): never {
        throw error
      }
    }
  },
})

const lazyScreen = (route: FeatureRoute) => lazyComponent(async () => (await route.screen()).default)

/** An /app route as a child of the /app layout: /app itself is its index. */
const appChild = (route: FeatureRoute): RouteObject =>
  route.path === '/app'
    ? { index: true, lazy: lazyScreen(route) }
    : { path: route.path.slice('/app/'.length), lazy: lazyScreen(route) }

/**
 * The route tree from the registry. Every screen is lazy, and so is the app shell, so the website doesn't ship the
 * app. /app/* sits behind the session guard (in the shell); owner-only routes sit behind the owner guard. A screen
 * that throws or fails to load shows the route error inside the shell under /app, and on its own elsewhere; so does
 * an address that isn't part of Tenure.
 */
export function buildRoutes(features: readonly WebFeature[]): RouteObject[] {
  const routes = features.flatMap((f) => f.routes)
  const app = routes.filter((r) => isAppPath(r.path))
  return [
    {
      Component: Root,
      HydrateFallback: Loading,
      errorElement: <RouteError page />,
      children: [
        ...routes.filter((r) => !isAppPath(r.path)).map((r) => ({ path: r.path, lazy: lazyScreen(r) })),
        {
          path: '/app',
          lazy: async () => {
            const { AppShell } = await import('./shell/AppShell.tsx')
            return { element: <AppShell features={features} /> }
          },
          children: [
            {
              // Pathless: catches errors below the shell, so the header and nav stay.
              errorElement: <RouteError />,
              children: [
                ...app.filter((r) => !r.ownerOnly).map(appChild),
                {
                  lazy: lazyComponent(async () => (await import('./shell/RequireOwner.tsx')).RequireOwner),
                  children: app.filter((r) => r.ownerOnly).map(appChild),
                },
                // A bad /app link keeps the header and the nav, with a way back to Today.
                { path: '*', element: <NotFound inShell /> },
              ],
            },
          ],
        },
        { path: '*', Component: NotFound },
      ],
    },
  ]
}
