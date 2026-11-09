// Reading an SSE body in tests, as the old server's events and security tests did.
import type { Hono } from 'hono'
import { expect } from 'vitest'
import type { AppEnv } from '../platform/module.ts'
import { HOST } from './http.ts'

export type SseReader = ReadableStreamDefaultReader<Uint8Array>

const timeout = (ms: number) => new Promise<{ timedOut: true }>((r) => setTimeout(() => r({ timedOut: true }), ms))

/** Read until `pred(text)` holds; throws with what arrived if `ms` pass first or the stream ends. */
export async function readUntil(reader: SseReader, pred: (text: string) => boolean, ms = 2000): Promise<string> {
  const dec = new TextDecoder()
  let text = ''
  const deadline = Date.now() + ms
  while (!pred(text)) {
    const left = deadline - Date.now()
    if (left <= 0) throw new Error(`timed out; got: ${text}`)
    const r = await Promise.race([reader.read(), timeout(left)])
    if ('timedOut' in r) continue
    if (r.done) throw new Error(`the stream ended; got: ${text}`)
    text += dec.decode(r.value, { stream: true })
  }
  return text
}

/** Read until the stream ends or `ms` pass (then cancel it). */
export async function readToEnd(reader: SseReader, ms = 1500): Promise<{ text: string; ended: boolean }> {
  const dec = new TextDecoder()
  let text = ''
  const deadline = Date.now() + ms
  for (;;) {
    const left = deadline - Date.now()
    if (left <= 0) {
      await reader.cancel()
      return { text, ended: false }
    }
    const r = await Promise.race([reader.read(), timeout(left)])
    if ('timedOut' in r) continue
    if (r.done) return { text, ended: true }
    text += dec.decode(r.value, { stream: true })
  }
}

/** GET /api/events with the cookie; checks it is a 200 event stream and reads past ": connected". */
export async function openStream(app: Hono<AppEnv>, cookie: string): Promise<SseReader> {
  const res = await app.request(`http://${HOST}/api/events`, { headers: { host: HOST, cookie } })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toMatch(/text\/event-stream/)
  if (!res.body) throw new Error('no body')
  const reader = res.body.getReader()
  await readUntil(reader, (t) => t.includes(': connected'))
  return reader
}
