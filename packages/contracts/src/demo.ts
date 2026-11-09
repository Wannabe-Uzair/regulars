// The stall demo (FR-WEB-04, FR-OPS-03): "Try the demo" and "Reset the demo", in stall mode only.
import { z } from 'zod'
import { MeResponse } from './auth.ts'

/** GET /api/demo, public: whether this server runs in stall mode, so the website shows the demo buttons. */
export const DemoStatus = z.object({ stall: z.boolean() })
export type DemoStatus = z.infer<typeof DemoStatus>

/**
 * POST /api/demo/try, public, with an empty body: signs the visitor in as the demo gym's owner and answers as log-in
 * does. Outside stall mode it answers 404 (`notFound`).
 */
export const TryDemoResponse = MeResponse
export type TryDemoResponse = MeResponse

/**
 * POST /api/demo/reset, public, with an empty body: puts the demo gym back as seeded, keeping its kiosk link, and signs
 * every demo device out (this one's cookie included). Outside stall mode it answers 404 (`notFound`).
 */
export const ResetDemoResponse = z.object({ ok: z.literal(true) })
export type ResetDemoResponse = z.infer<typeof ResetDemoResponse>
