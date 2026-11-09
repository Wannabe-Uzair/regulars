import { describe, expect, test } from 'vitest'
import { createDevAdapters } from './index.ts'

describe('the dev stand-ins', () => {
  const world = () => {
    const lines: string[] = []
    return { lines, adapters: createDevAdapters((line) => lines.push(line)) }
  }

  test('email keeps each message in its outbox and logs one line', async () => {
    const { lines, adapters } = world()
    const message = { to: 'priya@northside.test', subject: 'You are invited', text: 'Open the link.' }
    expect(await adapters.email.send(message)).toEqual({ id: 'dev-email-1' })
    expect(await adapters.email.send({ ...message, to: 'jordan@northside.test' })).toEqual({ id: 'dev-email-2' })
    expect(adapters.email.outbox).toEqual([message, { ...message, to: 'jordan@northside.test' }])
    expect(lines).toEqual([
      '[dev email] to priya@northside.test: You are invited',
      '[dev email] to jordan@northside.test: You are invited',
    ])
  })

  test('sms keeps each message in its outbox and logs one line', async () => {
    const { lines, adapters } = world()
    const message = { to: '+13125550111', body: 'We missed you this week.' }
    expect(await adapters.sms.send(message)).toEqual({ id: 'dev-sms-1' })
    expect(adapters.sms.outbox).toEqual([message])
    expect(lines).toEqual(['[dev sms] to +13125550111: 24 chars'])
  })

  test('payments records checkout and portal requests and sends the owner straight back', async () => {
    const { lines, adapters } = world()
    const checkout = {
      gymId: 1,
      plan: 'founding',
      email: 'mike@northside.test',
      successUrl: 'http://tenure.test/billing?ok=1',
      cancelUrl: 'http://tenure.test/billing',
    }
    expect(await adapters.payments.startCheckout(checkout)).toEqual({ url: checkout.successUrl })
    const portal = { gymId: 1, returnUrl: 'http://tenure.test/settings' }
    expect(await adapters.payments.portalUrl(portal)).toEqual({ url: portal.returnUrl })
    expect(adapters.payments.outbox).toEqual([
      { kind: 'checkout', ...checkout },
      { kind: 'portal', ...portal },
    ])
    expect(lines).toEqual([
      '[dev payments] checkout for gym 1, plan founding',
      '[dev payments] billing portal for gym 1',
    ])
  })

  test('each set of stand-ins has its own outboxes', async () => {
    const a = world().adapters
    const b = world().adapters
    await a.sms.send({ to: '+13125550111', body: 'hi' })
    expect([a.sms.outbox.length, b.sms.outbox.length]).toEqual([1, 0])
  })
})
