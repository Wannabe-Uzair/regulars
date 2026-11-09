import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { FakeEventSource } from '../../test/fakes.ts'
import { sessionKey } from '../session/session.ts'
import { connectLive, type LiveInvalidations } from './live.ts'

const checkin = {
  type: 'checkin.recorded',
  gymId: 1,
  memberId: 4,
  coachId: null,
  name: 'Sam O.',
  at: '2026-11-06T14:00:00.000Z',
}

let client: QueryClient
beforeEach(() => {
  FakeEventSource.install()
  client = new QueryClient()
  for (const key of [['today'], ['board', 'all'], ['members'], ['nudges'], sessionKey]) client.setQueryData(key, 1)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const invalidated = () =>
  client
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.isInvalidated)
    .map((q) => q.queryKey)

const declared: LiveInvalidations = { 'checkin.recorded': [['today'], ['board']], 'nudge.recorded': [['nudges']] }

/** Runs the pending batch of refreshes: they wait for the next macrotask. */
const flush = () => vi.advanceTimersByTime(0)

test('a live event invalidates exactly the keys declared for its type', () => {
  vi.useFakeTimers()
  const close = connectLive(client, declared)
  const es = FakeEventSource.instances[0]!
  expect(es.url).toBe('/api/events')
  es.open()
  es.emit(checkin)
  flush()
  expect(invalidated()).toEqual([['today'], ['board', 'all']])
  close()
})

test('a named event is handled too; a malformed or unknown message is ignored', () => {
  vi.useFakeTimers()
  connectLive(client, declared)
  const es = FakeEventSource.instances[0]!
  es.emit('not json')
  es.emit({ type: 'member.deleted', gymId: 1 })
  flush()
  expect(invalidated()).toEqual([])
  es.emit({ type: 'nudge.recorded', gymId: 1, memberId: 4, coachId: 2 }, 'nudge.recorded')
  flush()
  expect(invalidated()).toEqual([['nudges']])
})

test('a closed stream reopens with backoff, then refreshes every declared key once', () => {
  vi.useFakeTimers()
  const close = connectLive(client, declared)
  FakeEventSource.instances[0]!.fail()
  vi.advanceTimersByTime(999)
  expect(FakeEventSource.instances).toHaveLength(1)
  vi.advanceTimersByTime(1)
  const second = FakeEventSource.instances[1]!
  second.fail()
  vi.advanceTimersByTime(1999)
  expect(FakeEventSource.instances).toHaveLength(2)
  vi.advanceTimersByTime(1)
  const third = FakeEventSource.instances[2]!
  // Each close checked the session again; nothing else was refreshed yet.
  expect(invalidated()).toEqual([sessionKey])
  client.setQueryData(sessionKey, 1)
  third.open()
  flush()
  expect(invalidated()).toEqual([['today'], ['board', 'all'], ['nudges']])
  close()
  expect(third.readyState).toBe(FakeEventSource.CLOSED)
  vi.advanceTimersByTime(60_000)
  expect(FakeEventSource.instances).toHaveLength(3)
})

test('a stream the browser is still retrying leaves the session alone', () => {
  vi.useFakeTimers()
  connectLive(client, declared)
  const es = FakeEventSource.instances[0]!
  es.readyState = FakeEventSource.CONNECTING
  es.onerror?.(new Event('error'))
  flush()
  expect(invalidated()).toEqual([])
})

const invalidations = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey)

test('FR-LIVE-03 a burst of events invalidates each declared key once, on the next tick', () => {
  vi.useFakeTimers()
  const spy = vi.spyOn(client, 'invalidateQueries')
  connectLive(client, declared)
  const es = FakeEventSource.instances[0]!
  es.open()
  // An import of 135 check-ins publishes 135 events.
  for (let i = 0; i < 135; i++) es.emit({ ...checkin, memberId: i + 1 })
  expect(spy).not.toHaveBeenCalled()
  flush()
  expect(invalidations(spy)).toEqual([['today'], ['board']])
  // The next event starts a new batch.
  es.emit(checkin)
  flush()
  expect(spy).toHaveBeenCalledTimes(4)
})

test('FR-LIVE-03 a reconnect refreshes each distinct key once', () => {
  vi.useFakeTimers()
  // As Today declares it: one key for every event type.
  const today = { 'checkin.recorded': [['today']], 'member.joined': [['today']], 'member.updated': [['today']], 'nudge.recorded': [['today']] } satisfies LiveInvalidations
  connectLive(client, today)
  FakeEventSource.instances[0]!.fail()
  vi.advanceTimersByTime(1000)
  const spy = vi.spyOn(client, 'invalidateQueries')
  FakeEventSource.instances[1]!.open()
  flush()
  expect(invalidations(spy)).toEqual([['today']])
})

test('FR-LIVE-03 closing the stream drops refreshes still waiting for their tick', () => {
  vi.useFakeTimers()
  const spy = vi.spyOn(client, 'invalidateQueries')
  const close = connectLive(client, declared)
  FakeEventSource.instances[0]!.emit(checkin)
  close()
  flush()
  expect(spy).not.toHaveBeenCalled()
})
