// Templates (FR-TPL-01 to 03): every signed-in user lists them and fills one in for a member they see; owners create,
// edit and delete them. Template edits publish no event: no screen shows another user's templates live, and
// contracts' events have none.
import type { Actor, CreateTemplateRequest, RenderRequest, Template, UpdateTemplateRequest } from '@tenure/contracts'
import type { Gym, Template as TemplateRow } from '@tenure/db'
import { progress, renderTemplate, templateVarsFor, todayIn } from '@tenure/domain'
import { scopeOf } from '../../platform/auth/scope.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'

const wire = (t: TemplateRow): Template => ({ id: t.id, name: t.name, body: t.body })

export async function listTemplates(ctx: AppContext, gym: Gym): Promise<Template[]> {
  return (await ctx.repos.templates.list(gym.id)).map(wire)
}

/** The gym's template, else 404 templateNotFound. */
async function findTemplate(ctx: AppContext, gym: Gym, id: number): Promise<TemplateRow> {
  const template = await ctx.repos.templates.findInGym(gym.id, id)
  if (!template) throw new ApiError('templateNotFound')
  return template
}

/** The message for one member, filled in with the variables of that member and the person asking (FR-TPL-02). */
export async function renderFor(ctx: AppContext, actor: Actor, gym: Gym, input: RenderRequest): Promise<string> {
  const scope = scopeOf(actor, gym)
  const member = await ctx.repos.members.findInScope(scope, input.memberId)
  if (!member) throw new ApiError('memberNotFound')
  const body =
    input.body ??
    (input.templateId == null ? undefined : (await findTemplate(ctx, gym, input.templateId)).body)
  if (body === undefined) throw new ApiError('templateChoice')
  const checkins = await ctx.repos.checkins.listByMember(scope, member.id)
  const p = progress({
    joinedOn: member.joinedOn,
    checkinAts: checkins.map((c) => c.at),
    today: todayIn(gym.timezone, ctx.clock()),
    timeZone: gym.timezone,
  })
  const vars = templateVarsFor({
    firstName: member.firstName,
    senderName: actor.name,
    gymName: gym.name,
    daysSinceLastVisit: p.daysSinceLastVisit,
    daysSinceJoin: p.daysSinceJoin,
  })
  return renderTemplate(body, vars)
}

export async function createTemplate(ctx: AppContext, gym: Gym, input: CreateTemplateRequest): Promise<Template> {
  return wire(await ctx.repos.templates.create({ gymId: gym.id, ...input, updatedAt: ctx.clock().toISOString() }))
}

/** 404 templateNotFound before the edit is read: the old route found the template first. */
export async function ensureTemplate(ctx: AppContext, gym: Gym, id: number): Promise<void> {
  await findTemplate(ctx, gym, id)
}

export async function updateTemplate(ctx: AppContext, gym: Gym, id: number, edit: UpdateTemplateRequest): Promise<Template> {
  const updated = await ctx.repos.templates.update(gym.id, id, { ...edit, updatedAt: ctx.clock().toISOString() })
  if (!updated) throw new ApiError('templateNotFound')
  return wire(updated)
}

/** Nudges sent from it keep their text and lose the link to it. */
export async function deleteTemplate(ctx: AppContext, gym: Gym, id: number): Promise<void> {
  const deleted = await ctx.repos.templates.delete(gym.id, id)
  if (!deleted) throw new ApiError('templateNotFound')
}
