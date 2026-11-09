// What an API module is, and the Hono env every route shares.
import type { Actor } from '@tenure/contracts'
import type { Gym } from '@tenure/db'
import type { Hono } from 'hono'
import type { AppContext } from './context.ts'
import type { EventBus } from './events.ts'

/** Per-request values. The session middleware sets `actor` and `gym` when someone is signed in. */
export type AppVariables = {
  actor?: Actor
  /** The signed-in user's gym. */
  gym?: Gym
}

export type AppEnv = { Variables: AppVariables }

/** What a handler behind requireActor or requireOwner sees: both are set. */
export type SignedInEnv = { Variables: { actor: Actor; gym: Gym } }

/** A module's router, mounted at /api: it registers `/health`, the client calls `/api/health`. */
export type Router = Hono<AppEnv>

export type RouteMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/** A route as the client calls it: the method, a space, and the full path with Hono's params, e.g. `GET /api/members/:id`. */
export type RouteKey = `${RouteMethod} /api/${string}`

/**
 * A feature of the API. `subscribe`, if given, is called once when the app is built, to listen on the bus.
 *
 * Each module declares who may call its routes (NFR-SEC-04): `publicPaths` need no session, `ownerPaths` need an
 * owner, and every other route it registers needs someone signed in. A module declares only routes it registers;
 * the permissions sweep checks each route against its declaration.
 */
export type ApiModule = {
  name: string
  register(router: Router, ctx: AppContext): void
  subscribe?(bus: EventBus, ctx: AppContext): void
  publicPaths?: readonly RouteKey[]
  ownerPaths?: readonly RouteKey[]
}
