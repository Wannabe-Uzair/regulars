// The nudges and templates tests' extras: a second gym with a member, and one more coach in the world's gym.
import { addDays, DEFAULT_TEMPLATES } from '@tenure/domain'
import { sha256 } from '../platform/auth/token.ts'
import { PASSWORD, TODAY, type World } from './world.ts'
import { hashPassword } from '../platform/auth/password.ts'

/** Another gym, with its owner, its default templates and one member, Zed, who has a phone. */
export async function otherGym(w: World) {
  const createdAt = w.ctx.clock().toISOString()
  const { gym, owner } = await w.ctx.repos.gyms.createWithOwner({
    gym: { name: 'Elsewhere Fitness', slug: 'elsewhere', timezone: 'America/Chicago', pilotStartedOn: TODAY, kioskToken: 'kiosk-token-other' },
    owner: { email: 'olga@elsewhere.test', name: 'Olga E.', passwordHash: 'not-a-login' },
    templates: DEFAULT_TEMPLATES,
    createdAt,
  })
  const { created } = await w.ctx.repos.members.applyImport({
    gymId: gym.id,
    at: createdAt,
    creates: [{ firstName: 'Zed', lastName: 'Other', phone: '+13125550001', email: null, joinedOn: addDays(TODAY, -10), coachId: owner.id, externalId: null }],
    updates: [],
    checkins: [],
  })
  const member = created[0]
  const template = (await w.ctx.repos.templates.list(gym.id))[0]
  if (!member || !template) throw new Error('fixture: the other gym is incomplete')
  return { gym, owner, member, template }
}

/** One more coach in the world's gym, who logs in with PASSWORD. */
export async function addCoach(w: World, name: string, email: string) {
  const createdAt = w.ctx.clock().toISOString()
  const tokenHash = sha256(`invite-${email}`)
  await w.ctx.repos.invites.create({ tokenHash, gymId: w.gym.id, name, createdBy: w.owner.id, createdAt })
  const user = await w.ctx.repos.invites.accept({
    tokenHash,
    liveSince: '1970-01-01T00:00:00.000Z',
    acceptedAt: createdAt,
    user: { email, name, passwordHash: await hashPassword(PASSWORD) },
  })
  if (!user) throw new Error(`fixture: could not add ${email}`)
  return user
}
