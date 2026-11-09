// Invites: an owner invites a coach or a co-owner by email; the invitee looks the link up and accepts it.
//
// The invite is bound to its email: the account it makes takes the email the owner typed. Until a migration gives
// `invites` an email column, the email is stored in the invite's `name` column (an invite no longer carries a name:
// the invitee types theirs on accepting). Only this file reads or writes that column.
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  CreateInviteRequest,
  CreateInviteResponse,
  InviteInfo,
} from '@tenure/contracts'
import { t } from '@tenure/copy'
import { DuplicateError, type Gym, type Invite, type User } from '@tenure/db'
import { hashPassword } from '../../platform/auth/password.ts'
import { newToken, sha256 } from '../../platform/auth/token.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'

/**
 * The new person and their gym, as sign-up and log-in answer them. The auth module's own mappers are not on its
 * public index, so this mirrors them; `satisfies` keeps it in step with the contract.
 */
const meOf = (u: User, g: Gym) =>
  ({
    user: { id: u.id, name: u.name, email: u.email, role: u.role },
    gym: {
      id: g.id,
      name: g.name,
      slug: g.slug,
      isDemo: g.isDemo,
      timezone: g.timezone,
      country: g.country,
      plan: g.plan,
      pilotStartedOn: g.pilotStartedOn,
    },
  }) satisfies AcceptInviteResponse

/** An invite works once, for this long. */
export const INVITE_DAYS = 7
const INVITE_MS = INVITE_DAYS * 86_400_000

const expiresAt = (createdAt: string) => new Date(Date.parse(createdAt) + INVITE_MS).toISOString()

/** The invite this token names, if it can still be used. */
const findLive = (ctx: AppContext, token: string) =>
  ctx.repos.invites.findLive(sha256(token), new Date(ctx.clock().getTime() - INVITE_MS).toISOString())

/** The invite this token names, with its gym; 404 linkInvalid when it is unknown, used or expired. */
async function liveInvite(ctx: AppContext, token: string): Promise<{ invite: Invite; gym: Gym }> {
  const invite = await findLive(ctx, token)
  const gym = invite && (await ctx.repos.gyms.findById(invite.gymId))
  if (!invite || !gym) throw new ApiError('linkInvalid')
  return { invite, gym }
}

/**
 * A new invite to `gym` from `createdBy`, emailed to the invitee. The link points at the first LAN address when there
 * is one, so a phone can open it, else at `requestOrigin`. The link is in the answer too, to copy.
 */
export async function createInvite(
  ctx: AppContext,
  gym: Gym,
  createdBy: number,
  input: CreateInviteRequest,
  requestOrigin: string,
): Promise<CreateInviteResponse> {
  const token = newToken()
  const createdAt = ctx.clock().toISOString()
  await ctx.repos.invites.create({
    tokenHash: sha256(token),
    gymId: gym.id,
    role: input.role,
    name: input.email,
    createdBy,
    createdAt,
  })
  const [ip] = ctx.lan()
  const origin = ip ? `http://${ip}:${ctx.config.port}` : requestOrigin
  const link = `${origin}/invite/${token}`
  const lede = input.role === 'owner' ? t('invite.lede.owner') : t('invite.lede')
  await ctx.adapters.email.send({ to: input.email, subject: t('invite.title', { gymName: gym.name }), text: `${lede}\n\n${link}` })
  return { link, expiresAt: expiresAt(createdAt), email: input.email, role: input.role }
}

/** What the invite page shows for a live invite. */
export async function inviteInfo(ctx: AppContext, token: string): Promise<InviteInfo> {
  const { invite, gym } = await liveInvite(ctx, token)
  return { gymName: gym.name, email: invite.name, role: invite.role }
}

/**
 * Use an invite: the new person joins its gym with its role and email. The link is checked first, then the email,
 * and only then is the password hashed, so a bad link or a taken email costs no scrypt. The caller swaps the
 * browser's session for the new person's.
 */
export async function acceptInvite(
  ctx: AppContext,
  token: string,
  input: AcceptInviteRequest,
): Promise<AcceptInviteResponse & { userId: number }> {
  const { invite, gym } = await liveInvite(ctx, token)
  const email = invite.name
  if (await ctx.repos.users.findByEmail(email)) throw new ApiError('duplicate')
  const passwordHash = await hashPassword(input.password)
  const now = ctx.clock()
  let user
  try {
    user = await ctx.repos.invites.accept({
      tokenHash: invite.tokenHash,
      liveSince: new Date(now.getTime() - INVITE_MS).toISOString(),
      acceptedAt: now.toISOString(),
      user: { email, name: input.name, passwordHash },
    })
  } catch (err) {
    // The same email may have joined while we hashed.
    if (err instanceof DuplicateError && err.field === 'email') throw new ApiError('duplicate')
    throw err
  }
  // Used by another accept while we hashed.
  if (!user) throw new ApiError('linkInvalid')
  ctx.bus.publish({ type: 'staff.updated', gymId: user.gymId })
  return { ...meOf(user, gym), userId: user.id }
}
