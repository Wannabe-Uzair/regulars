// Templates (FR-TPL-01 to 03): the list, owners' edits and the message filled in for one member. Every validation
// issue's message is an ErrorCode.
import { z } from 'zod'
import { type ErrorCode, withCode } from './errors.ts'
import { Id } from './wire.ts'

/** A template's name: at most 60 characters. */
export const TEMPLATE_NAME_MAX = 60
/** A message's length, a template's body or a nudge's: at most 1,000 characters. */
export const MESSAGE_MAX = 1000

/** A trimmed string of 1..max characters. */
const text = (max: number, code: ErrorCode) =>
  z.string(withCode(code)).trim().min(1, withCode(code)).max(max, withCode(code))

/** A row id whose every issue (not a number, not a whole number, not above 0) is `code`. */
const idWithCode = (code: ErrorCode) => z.int(withCode(code)).positive(withCode(code))

/** A message, trimmed: 1 to 1,000 characters. A template's body and a nudge's follow this one rule. */
export const MessageBody = text(MESSAGE_MAX, 'messageBody')
const TemplateName = text(TEMPLATE_NAME_MAX, 'templateName')

export const Template = z.object({ id: Id, name: z.string(), body: z.string() })
export type Template = z.infer<typeof Template>

/** GET /api/templates: the gym's templates in their order. */
export const TemplatesResponse = z.array(Template)
export type TemplatesResponse = z.infer<typeof TemplatesResponse>

/** POST /api/templates (owners). Answers 201 with the Template. */
export const CreateTemplateRequest = z.object({ name: TemplateName, body: MessageBody }, withCode('generic'))
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequest>

/** PATCH /api/templates/:id (owners): only the fields sent change. Answers the Template. */
export const UpdateTemplateRequest = z.object(
  { name: TemplateName.optional(), body: MessageBody.optional() },
  withCode('generic'),
)
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequest>

/** DELETE /api/templates/:id (owners). Nudges sent from it keep their text. */
export const DeleteTemplateResponse = z.object({ ok: z.literal(true) })
export type DeleteTemplateResponse = z.infer<typeof DeleteTemplateResponse>

/**
 * POST /api/templates/render: a message filled in for one member, by the person asking. `body` when given (the
 * composer's own words, or an unsaved template's preview), else the template `templateId`; with neither the API
 * answers 400 `templateChoice`.
 */
export const RenderRequest = z.object(
  {
    memberId: idWithCode('notFound'),
    body: MessageBody.nullish(),
    templateId: idWithCode('notFound').nullish(),
  },
  withCode('generic'),
)
export type RenderRequest = z.infer<typeof RenderRequest>

export const RenderResponse = z.object({ body: z.string() })
export type RenderResponse = z.infer<typeof RenderResponse>
