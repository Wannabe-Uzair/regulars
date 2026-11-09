import { describe, expect, test } from 'vitest'
import { createStopSignal, gracefulStop } from './shutdown.ts'

describe('createStopSignal', () => {
  test('stop() calls each end still registered, once; one registered after the stop is called at once', () => {
    const signal = createStopSignal()
    const calls: string[] = []
    signal.onStop(() => calls.push('a'))
    const offB = signal.onStop(() => calls.push('b'))
    offB()
    signal.stop()
    signal.stop()
    expect(calls).toEqual(['a'])
    signal.onStop(() => calls.push('late'))
    expect(calls).toEqual(['a', 'late'])
  })
})

describe('gracefulStop', () => {
  test('if the server never closes, the fallback closes the database and exits 1; called again, it does nothing', async () => {
    const calls: string[] = []
    let exited: (code: number) => void = () => {}
    const exit = new Promise<number>((resolve) => (exited = resolve))
    const stop = gracefulStop({
      server: { close: (() => {}) as never, closeIdleConnections: () => {}, closeAllConnections: () => calls.push('all') },
      endStreams: () => calls.push('streams'),
      closeDb: () => calls.push('db'),
      log: (line) => calls.push(line),
      exit: (code) => exited(code),
      graceMs: 10,
      fallbackMs: 50,
    })
    stop()
    stop()
    expect(await exit).toBe(1)
    expect(calls).toEqual(['Stopping Tenure', 'streams', 'all', 'db'])
  })
})
