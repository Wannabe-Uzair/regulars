// The members a user may see, as a repository scope. Every module that reads members scopes them through this.
import type { Actor } from '@tenure/contracts'
import type { Gym, Scope } from '@tenure/db'

/** The members a user sees: an owner the whole gym (even one who also coaches), a coach their own. */
export const scopeOf = (actor: Actor, gym: Gym): Scope =>
  actor.role === 'owner' ? { gymId: gym.id } : { gymId: gym.id, coachId: actor.id }
