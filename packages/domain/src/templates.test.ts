import { describe, expect, test } from 'vitest'
import { DEFAULT_TEMPLATES, firstWord, renderTemplate, TEMPLATE_VARS, templateVarsFor } from './templates.ts'

test('renderTemplate fills the four variables', () => {
  expect(renderTemplate('{first}/{coach}/{gym}/{days}/{other}', { first: 'Sam', coach: 'Mike', gym: 'N', days: 6 })).toBe('Sam/Mike/N/6/{other}')
})

test('renderTemplate leaves a missing value empty', () => {
  expect(renderTemplate('Hi {first} - {coach}', { first: 'Sam', coach: null })).toBe('Hi Sam - ')
})

test('default templates stay GSM-7 (no em dash, en dash or curly apostrophe)', () => {
  expect(DEFAULT_TEMPLATES).toHaveLength(3)
  for (const t of DEFAULT_TEMPLATES) expect(t.body).not.toMatch(/[—–’]/)
})

// The GSM-7 basic alphabet and its extension table: a text in these goes out as one SMS per 160 characters.
const GSM7 = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/

test('FR-TPL-03 default templates match the demo seed names and stay GSM-7, filled in too', () => {
  expect(DEFAULT_TEMPLATES.map((t) => t.name)).toEqual(['We missed you', 'First weeks', 'One visit'])
  const vars = { first: 'Sam', coach: 'Mike', gym: 'Northside Strength', days: 6 }
  for (const t of DEFAULT_TEMPLATES) {
    expect(t.body).toMatch(GSM7)
    expect(renderTemplate(t.body, vars)).toMatch(GSM7)
  }
  expect('Hey Sam — see you’').not.toMatch(GSM7)
})

describe('the variables', () => {
  test('FR-TPL-02 TEMPLATE_VARS are the four variables renderTemplate fills', () => {
    expect(TEMPLATE_VARS).toEqual(['first', 'coach', 'gym', 'days'])
    const body = TEMPLATE_VARS.map((v) => `{${v}}`).join(' ')
    expect(renderTemplate(body, { first: 'a', coach: 'b', gym: 'c', days: 1 })).toBe('a b c 1')
  })

  test.each([
    ['Priya S.', 'Priya'],
    ['  Priya  Shah ', 'Priya'],
    ['Uzair', 'Uzair'],
    ['Dr. Priya', 'Dr.'],
    ['', ''],
    ['   ', ''],
    [null, ''],
    [undefined, ''],
  ])('FR-TPL-02 {coach} is the first word of the sender\'s name: %j gives %j', (name, word) => {
    expect(firstWord(name)).toBe(word)
  })

  const base = { firstName: 'Sam', senderName: 'Mike R.', gymName: 'Northside Strength', daysSinceLastVisit: 3, daysSinceJoin: 24 }

  test("FR-TPL-02 templateVarsFor: the member's first name, the sender's first word, the gym, the days since the last visit", () => {
    expect(templateVarsFor(base)).toEqual({ first: 'Sam', coach: 'Mike', gym: 'Northside Strength', days: 3 })
  })

  test("FR-GLOBAL-04 a single-named member's one name is {first}", () => {
    expect(templateVarsFor({ ...base, firstName: 'Leo' }).first).toBe('Leo')
  })

  test('FR-TPL-02 {days} falls back to the days since joining for a member never seen, never below 0', () => {
    expect(templateVarsFor({ ...base, daysSinceLastVisit: null, daysSinceJoin: 20 }).days).toBe(20)
    expect(templateVarsFor({ ...base, daysSinceLastVisit: null, daysSinceJoin: -2 }).days).toBe(0)
    expect(templateVarsFor({ ...base, daysSinceLastVisit: 0, daysSinceJoin: 20 }).days).toBe(0)
  })
})
