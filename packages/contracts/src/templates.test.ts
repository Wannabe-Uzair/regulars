import { describe, expect, test } from 'vitest'
import type { z } from 'zod'
import {
  CreateTemplateRequest,
  DeleteTemplateResponse,
  MESSAGE_MAX,
  RenderRequest,
  RenderResponse,
  TEMPLATE_NAME_MAX,
  TemplatesResponse,
  UpdateTemplateRequest,
} from './templates.ts'

const firstCode = (schema: z.ZodType, input: unknown) => {
  const r = schema.safeParse(input)
  if (r.success) throw new Error(`expected ${JSON.stringify(input)} to fail`)
  return r.error.issues[0]?.message
}

describe('Template', () => {
  test('FR-TPL-01 the list is the old { id, name, body } shape', () => {
    expect(TemplatesResponse.safeParse([{ id: 1, name: 'We missed you', body: 'Hey {first}' }]).success).toBe(true)
    expect(TemplatesResponse.safeParse([{ id: 1, body: 'Hey' }]).success).toBe(false)
    expect(DeleteTemplateResponse.parse({ ok: true })).toEqual({ ok: true })
    expect(RenderResponse.parse({ body: 'Hi Sam' })).toEqual({ body: 'Hi Sam' })
  })
})

describe('CreateTemplateRequest', () => {
  test('FR-TPL-01 trims; a name of 60 and a body of 1,000 pass', () => {
    expect([TEMPLATE_NAME_MAX, MESSAGE_MAX]).toEqual([60, 1000])
    const ok = { name: ` ${'n'.repeat(60)} `, body: ` ${'b'.repeat(1000)}\n` }
    expect(CreateTemplateRequest.parse(ok)).toEqual({ name: 'n'.repeat(60), body: 'b'.repeat(1000) })
  })

  test.each([
    ['a name of 61', { name: 'n'.repeat(61), body: 'Hi' }, 'templateName'],
    ['a blank name', { name: '  ', body: 'Hi' }, 'templateName'],
    ['no name', { body: 'Hi' }, 'templateName'],
    ['a body of 1,001', { name: 'N', body: 'b'.repeat(1001) }, 'messageBody'],
    ['a blank body', { name: 'N', body: ' \n ' }, 'messageBody'],
    ['no body', { name: 'N' }, 'messageBody'],
    ['a list', [{ name: 'N', body: 'Hi' }], 'generic'],
    ['a bad name before a bad body', { name: '', body: '' }, 'templateName'],
  ])('FR-TPL-01 refuses %s with its code', (_, input, code) => {
    expect(firstCode(CreateTemplateRequest, input)).toBe(code)
  })
})

describe('UpdateTemplateRequest', () => {
  test('FR-TPL-01 takes nothing, a name alone or a body alone', () => {
    expect(UpdateTemplateRequest.parse({})).toEqual({})
    expect(UpdateTemplateRequest.parse({ name: ' New ' })).toEqual({ name: 'New' })
    expect(UpdateTemplateRequest.parse({ body: 'Hi {first}' })).toEqual({ body: 'Hi {first}' })
  })

  test.each([
    ['a null name', { name: null }, 'templateName'],
    ['a name of 61', { name: 'n'.repeat(61) }, 'templateName'],
    ['a null body', { body: null }, 'messageBody'],
    ['a blank body', { body: ' ' }, 'messageBody'],
  ])('FR-TPL-01 refuses %s with its code', (_, input, code) => {
    expect(firstCode(UpdateTemplateRequest, input)).toBe(code)
  })
})

describe('RenderRequest', () => {
  test('FR-TPL-02 takes a member with a body, a template or neither (the API answers templateChoice)', () => {
    expect(RenderRequest.parse({ memberId: 12, body: null, templateId: null })).toEqual({ memberId: 12, body: null, templateId: null })
    expect(RenderRequest.parse({ memberId: 12, body: ' Hi ' })).toEqual({ memberId: 12, body: 'Hi' })
    expect(RenderRequest.parse({ memberId: 12, templateId: 3 })).toEqual({ memberId: 12, templateId: 3 })
  })

  test.each([
    ['no member', { body: 'Hi' }, 'notFound'],
    ['a member id as text', { memberId: '12', body: 'Hi' }, 'notFound'],
    ['a member id of 0', { memberId: 0, body: 'Hi' }, 'notFound'],
    ['a fractional member id', { memberId: 1.5, body: 'Hi' }, 'notFound'],
    ['a blank body', { memberId: 12, body: '  ' }, 'messageBody'],
    ['a malformed template id', { memberId: 12, templateId: 'abc' }, 'notFound'],
    ['a bad member before a bad body', { memberId: -1, body: '' }, 'notFound'],
    ['a bad body before a bad template', { memberId: 12, body: '', templateId: 'x' }, 'messageBody'],
  ])('FR-TPL-02 refuses %s with its code', (_, input, code) => {
    expect(firstCode(RenderRequest, input)).toBe(code)
  })
})
