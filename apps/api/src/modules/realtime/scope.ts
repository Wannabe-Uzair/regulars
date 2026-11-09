// Who hears which live event: an owner, everything of their gym; a coach, the events about their own members (the
// member's coach after the write) and the gym-wide ones (an import, a staff or a settings change). Nobody hears
// another gym.
import type { Actor, LiveEvent } from '@tenure/contracts'

export const inScope = (actor: Actor, event: LiveEvent): boolean =>
  event.gymId === actor.gymId && (actor.role === 'owner' || !('coachId' in event) || event.coachId === actor.id)
