import type { LiveEvent } from '@tenure/contracts'
import { describe, expect, test } from 'vitest'
import { createEventBus } from './events.ts'

const event = (memberId: number): LiveEvent => ({ type: 'member.joined', gymId: 1, memberId, coachId: null })
/** The member an event is about; every event these tests publish is about one. */
const idOf = (e: LiveEvent): number => ('memberId' in e ? e.memberId : 0)

describe('createEventBus', () => {
  test('fans each event out to every subscriber, in order, before publish returns', () => {
    const bus = createEventBus()
    const heard: string[] = []
    bus.subscribe((e) => heard.push(`a${idOf(e)}`))
    bus.subscribe((e) => heard.push(`b${idOf(e)}`))
    bus.publish(event(1))
    expect(heard).toEqual(['a1', 'b1'])
    bus.publish(event(2))
    expect(heard).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  test('unsubscribe stops delivery to that subscriber only', () => {
    const bus = createEventBus()
    const a: number[] = []
    const b: number[] = []
    const offA = bus.subscribe((e) => a.push(idOf(e)))
    bus.subscribe((e) => b.push(idOf(e)))
    bus.publish(event(1))
    offA()
    bus.publish(event(2))
    expect([a, b]).toEqual([[1], [1, 2]])
  })

  test('a subscriber that throws is logged, and the others still hear the event', () => {
    const failures: unknown[] = []
    const bus = createEventBus({ onError: (err, e) => failures.push([(err as Error).message, idOf(e)]) })
    const heard: number[] = []
    bus.subscribe((e) => heard.push(idOf(e)))
    bus.subscribe(() => {
      throw new Error('boom')
    })
    bus.subscribe((e) => heard.push(idOf(e) * 10))
    expect(() => bus.publish(event(1))).not.toThrow()
    expect(heard).toEqual([1, 10])
    expect(failures).toEqual([['boom', 1]])
  })

  test('a subscriber that unsubscribes during fan-out does not make the next one miss the event', () => {
    const bus = createEventBus()
    const heard: string[] = []
    const off = bus.subscribe(() => {
      heard.push('once')
      off()
    })
    bus.subscribe(() => heard.push('always'))
    bus.publish(event(1))
    bus.publish(event(2))
    expect(heard).toEqual(['once', 'always', 'always'])
  })
})
