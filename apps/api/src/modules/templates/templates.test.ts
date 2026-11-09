import { RenderResponse, Template, TemplatesResponse } from '@tenure/contracts'
import { DEFAULT_TEMPLATES } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { createTestContext } from '../../platform/context.ts'
import { errorBody } from '../../platform/http/errors.ts'
import { call, cookieOf, HOST } from '../../test/http.ts'
import { addMember, KIT } from '../../test/members.ts'
import { addCoach, otherGym } from '../../test/nudges.ts'
import { makeWorld, type World } from '../../test/world.ts'

const list = async (w: World, cookie: string) => {
  const r = await call(w.app, 'GET', '/api/templates', { cookie })
  expect(r.status).toBe(200)
  return TemplatesResponse.parse(r.body)
}
const render = (w: World, cookie: string, body: unknown) => call(w.app, 'POST', '/api/templates/render', { cookie, body })
const stored = async (w: World) => (await w.ctx.repos.templates.list(w.gym.id)).map(({ id, name, body }) => ({ id, name, body }))
const oneVisit = async (w: World) => {
  const t = (await w.ctx.repos.templates.list(w.gym.id)).find((x) => x.name === 'One visit')
  if (!t) throw new Error('no One visit template')
  return t
}

describe('POST /api/templates/render', () => {
  test('FR-TPL-02 render fills {first} {coach} {gym} {days} for that member and the current user', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { ...KIT.sam, coachId: w.coach.id })
    const cookie = await w.login(w.coach.email)
    const back = (await list(w, cookie)).find((t) => t.name === 'One visit')
    const r = await render(w, cookie, { memberId: sam, templateId: back?.id })
    expect(r.status).toBe(200)
    // Sam's last visit is day 21 of 24: 3 days ago.
    expect(RenderResponse.strict().parse(r.body).body).toBe(
      "Hi Sam, it's been 3 days since we saw you. One visit this week is a good restart. Want me to save you a spot? - Priya",
    )
    const custom = await render(w, cookie, { memberId: sam, body: '{first} at {gym}, from {coach}' })
    expect(custom.body).toEqual({ body: 'Sam at Northside Strength, from Priya' })
    const none = await render(w, cookie, { memberId: sam })
    expect([none.status, none.body]).toEqual([400, errorBody('templateChoice')])
  })

  test("FR-GLOBAL-04 a single-named member's one name fills {first}", async () => {
    const w = await makeWorld()
    const leo = await addMember(w, { first: 'Leo', last: null, daysSinceJoin: 10 })
    const r = await render(w, await w.login(w.owner.email), { memberId: leo, body: 'Hi {first}' })
    expect(r.body).toEqual({ body: 'Hi Leo' })
  })

  test("FR-TPL-02 {coach} is the first word of the sender's name, not the member's coach", async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { ...KIT.sam, coachId: w.coach.id })
    const uzair = await addCoach(w, 'Uzair', 'uzair@northside.test')
    const ana = await addMember(w, { first: 'Ana', daysSinceJoin: 3, coachId: uzair.id })
    // Sam is Priya's member; the owner sends, so {coach} is Mike.
    expect((await render(w, await w.login(w.owner.email), { memberId: sam, body: '- {coach}' })).body).toEqual({ body: '- Mike' })
    expect((await render(w, await w.login(uzair.email), { memberId: ana, body: '- {coach}' })).body).toEqual({ body: '- Uzair' })
  })

  test('FR-TPL-02 {days} is the days since joining for a member never seen, and never below 0', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const never = await addMember(w, { first: 'Nell', daysSinceJoin: 16 })
    const joiningTomorrow = await addMember(w, { first: 'Tom', daysSinceJoin: -1 })
    expect((await render(w, cookie, { memberId: never, body: '{days}' })).body).toEqual({ body: '16' })
    expect((await render(w, cookie, { memberId: joiningTomorrow, body: '{days}' })).body).toEqual({ body: '0' })
  })

  test("FR-TPL-02 a malformed templateId is 404 notFound, a blank body 400 messageBody, and a body wins over a template", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const sam = await addMember(w, KIT.sam)
    const r1 = await render(w, cookie, { memberId: sam, templateId: 'abc' })
    expect([r1.status, r1.body]).toEqual([404, errorBody('notFound')])
    const r2 = await render(w, cookie, { memberId: sam, body: '   ' })
    expect([r2.status, r2.body]).toEqual([400, errorBody('messageBody')])
    const r3 = await render(w, cookie, { memberId: sam, body: 'Mine, {first}', templateId: (await oneVisit(w)).id })
    expect(r3.body).toEqual({ body: 'Mine, Sam' })
    const r4 = await render(w, cookie, { memberId: 'x', body: 'Hi' })
    expect([r4.status, r4.body]).toEqual([404, errorBody('notFound')])
  })

  test("FR-STAFF-07 a coach gets 404 rendering for another coach's member, 200 for their own", async () => {
    const w = await makeWorld()
    const theirs = await addMember(w, { ...KIT.sam, coachId: w.coach2.id })
    const mine = await addMember(w, { ...KIT.hana, coachId: w.coach.id })
    const cookie = await w.login(w.coach.email)
    const r = await render(w, cookie, { memberId: theirs, body: 'hi' })
    expect([r.status, r.body]).toEqual([404, errorBody('memberNotFound')])
    expect((await render(w, cookie, { memberId: mine, body: 'hi' })).status).toBe(200)
  })

  test("FR-STAFF-07 the body is read before the member: a blank body for another coach's member is 400", async () => {
    const w = await makeWorld()
    const theirs = await addMember(w, { ...KIT.sam, coachId: w.coach2.id })
    const r = await render(w, await w.login(w.coach.email), { memberId: theirs, body: ' ' })
    expect([r.status, r.body]).toEqual([400, errorBody('messageBody')])
  })

  test("FR-PRIV-02 another gym's member or template is not found", async () => {
    const w = await makeWorld()
    const other = await otherGym(w)
    const cookie = await w.login(w.owner.email)
    const sam = await addMember(w, KIT.sam)
    const r1 = await render(w, cookie, { memberId: other.member.id, body: 'Hi' })
    expect([r1.status, r1.body]).toEqual([404, errorBody('memberNotFound')])
    const r2 = await render(w, cookie, { memberId: sam, templateId: other.template.id })
    expect([r2.status, r2.body]).toEqual([404, errorBody('templateNotFound')])
  })
})

describe('the template list and its edits', () => {
  test('FR-TPL-01 the owner creates, edits and deletes templates', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const made = await call(w.app, 'POST', '/api/templates', { cookie, body: { name: 'Welcome', body: 'Welcome to {gym}, {first}!' } })
    expect(made.status).toBe(201)
    expect(Object.keys(made.body as object)).toEqual(['id', 'name', 'body'])
    const t = Template.parse(made.body)
    const edited = await call(w.app, 'PATCH', `/api/templates/${t.id}`, { cookie, body: { body: 'Hi {first}' } })
    expect(edited.body).toEqual({ id: t.id, name: 'Welcome', body: 'Hi {first}' })
    expect((await list(w, cookie)).at(-1)?.name).toBe('Welcome')
    expect((await call(w.app, 'DELETE', `/api/templates/${t.id}`, { cookie })).body).toEqual({ ok: true })
    expect(await list(w, cookie)).toHaveLength(3)
    const after = await call(w.app, 'PATCH', `/api/templates/${t.id}`, { cookie, body: { name: 'x' } })
    expect([after.status, after.body]).toEqual([404, errorBody('templateNotFound')])
  })

  test('FR-TPL-01 a name of 60 characters is created; 61, a blank name or a body over 1,000 are refused', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const post = (body: unknown) => call(w.app, 'POST', '/api/templates', { cookie, body })
    const before = await stored(w)
    for (const [body, code] of [
      [{ name: 'n'.repeat(61), body: 'Hi' }, 'templateName'],
      [{ name: '  ', body: 'Hi' }, 'templateName'],
      [{ name: 'N', body: 'b'.repeat(1001) }, 'messageBody'],
      [{ name: 'N', body: '' }, 'messageBody'],
    ] as const) {
      const r = await post(body)
      expect([r.status, r.body]).toEqual([400, errorBody(code)])
    }
    expect(await stored(w)).toEqual(before)
    const ok = await post({ name: ` ${'n'.repeat(60)} `, body: 'b'.repeat(1000) })
    expect(ok.status).toBe(201)
    expect(Template.parse(ok.body).name).toBe('n'.repeat(60))
    const edit = await call(w.app, 'PATCH', `/api/templates/${Template.parse(ok.body).id}`, { cookie, body: { name: 'n'.repeat(61) } })
    expect([edit.status, edit.body]).toEqual([400, errorBody('templateName')])
  })

  test("FR-PRIV-02 another gym's template is 404 to edit and delete, and stays as it was", async () => {
    const w = await makeWorld()
    const other = await otherGym(w)
    const cookie = await w.login(w.owner.email)
    const patch = await call(w.app, 'PATCH', `/api/templates/${other.template.id}`, { cookie, body: { name: 'Mine now' } })
    expect([patch.status, patch.body]).toEqual([404, errorBody('templateNotFound')])
    const del = await call(w.app, 'DELETE', `/api/templates/${other.template.id}`, { cookie })
    expect([del.status, del.body]).toEqual([404, errorBody('templateNotFound')])
    expect(await w.ctx.repos.templates.findInGym(other.gym.id, other.template.id)).toEqual(other.template)
  })

  test('FR-TPL-01 a malformed template id in the path is 404 notFound', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    for (const id of ['abc', '0', '-1', '1.5']) {
      const patch = await call(w.app, 'PATCH', `/api/templates/${id}`, { cookie, body: { name: 'x' } })
      expect([patch.status, patch.body]).toEqual([404, errorBody('notFound')])
      const del = await call(w.app, 'DELETE', `/api/templates/${id}`, { cookie })
      expect([del.status, del.body]).toEqual([404, errorBody('notFound')])
    }
  })

  test('FR-TPL-01 PATCH finds the template before it reads the body', async () => {
    const w = await makeWorld()
    const r = await call(w.app, 'PATCH', '/api/templates/9999', { cookie: await w.login(w.owner.email), body: { name: '' } })
    expect([r.status, r.body]).toEqual([404, errorBody('templateNotFound')])
  })

  test('FR-TPL-01 deleting a template keeps the text of the nudges sent from it', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const sam = await addMember(w, KIT.sam)
    const t = await oneVisit(w)
    const sent = await call(w.app, 'POST', '/api/nudges', { cookie, body: { memberId: sam, templateId: t.id, body: 'Hi Sam', channel: 'text' } })
    expect(sent.status).toBe(200)
    expect((await call(w.app, 'DELETE', `/api/templates/${t.id}`, { cookie })).status).toBe(200)
    const [nudge] = await w.ctx.repos.nudges.listByMember({ gymId: w.gym.id }, sam)
    expect(nudge).toMatchObject({ body: 'Hi Sam', templateId: null })
  })

  test("FR-TPL-01 a coach lists the templates but can't write them", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.coach.email)
    const before = await stored(w)
    expect(await list(w, cookie)).toEqual(before)
    const id = before[0]?.id
    for (const [method, path, body] of [
      ['POST', '/api/templates', { name: 'Mine', body: 'Hi {first}' }],
      ['PATCH', `/api/templates/${id}`, { name: 'Renamed' }],
      ['DELETE', `/api/templates/${id}`, undefined],
    ] as const) {
      const r = await call(w.app, method, path, { cookie, body })
      expect([r.status, r.body]).toEqual([403, errorBody('role')])
    }
    expect(await stored(w)).toEqual(before)
  })

  test('NFR-SEC-04 signed out, the templates are 401', async () => {
    const w = await makeWorld()
    for (const [method, path] of [
      ['GET', '/api/templates'],
      ['POST', '/api/templates/render'],
      ['POST', '/api/templates'],
      ['PATCH', '/api/templates/1'],
      ['DELETE', '/api/templates/1'],
    ] as const) {
      const r = await call(w.app, method, path, { body: method === 'GET' ? undefined : { name: 'x', body: 'y', memberId: 1 } })
      expect([r.status, r.body]).toEqual([401, errorBody('signIn')])
    }
  })

  test('NFR-SEC-02 a form-encoded POST /api/templates is refused and writes nothing', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const form = await call(w.app, 'POST', '/api/templates', { cookie, body: 'name=x', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    expect([form.status, form.body]).toEqual([400, errorBody('json')])
    expect(await stored(w)).toHaveLength(3)
  })

  test("NFR-SEC-02 an Origin that isn't the host can't create a template; the host's own can", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const body = { name: 'x', body: 'y' }
    const evil = await call(w.app, 'POST', '/api/templates', { cookie, body, headers: { origin: 'http://evil.example' } })
    expect([evil.status, evil.body]).toEqual([403, errorBody('crossSite')])
    expect(await stored(w)).toHaveLength(3)
    const ok = await call(w.app, 'POST', '/api/templates', { cookie, body, headers: { origin: `http://${HOST}` } })
    expect(ok.status).toBe(201)
  })
})

test('FR-TPL-03 a new gym gets the three default templates', async () => {
  const app = createApp(createTestContext())
  const body = { gymName: 'Iron & Oak Gym', name: 'Ana Ruiz', email: 'ana@example.com', password: 'longenough', country: 'US' }
  const signedUp = await call(app, 'POST', '/api/auth/signup', { body })
  expect(signedUp.status).toBe(200)
  const r = await call(app, 'GET', '/api/templates', { cookie: cookieOf(signedUp.res) })
  const templates = TemplatesResponse.parse(r.body)
  expect(templates.map(({ name, body }) => ({ name, body }))).toEqual(DEFAULT_TEMPLATES.map(({ name, body }) => ({ name, body })))
})
