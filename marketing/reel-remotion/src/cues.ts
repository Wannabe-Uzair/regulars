/**
 * The film's picture events and the UI sound placed at each, in seconds. The scenes read these times and mix.ts places
 * the sounds from the same list, so a sound cannot drift from its picture. Plain TypeScript (no imports) so Node runs
 * mix.ts directly.
 */

/** A count that eases out from `from` to `to` over `dur` seconds from `start`. */
export type Count = { start: number; dur: number; from: number; to: number; step: number; ease: 'linear' | 'out' }

const ease = (c: Count, x: number) => (c.ease === 'linear' ? x : 1 - (1 - x) ** 2)
const easeInverse = (c: Count, p: number) => (c.ease === 'linear' ? p : 1 - Math.sqrt(1 - p))

/** The value shown at time `t`, rounded. */
export function countAt(c: Count, t: number): number {
  const x = Math.min(1, Math.max(0, (t - c.start) / c.dur))
  return Math.round(c.from + (c.to - c.from) * ease(c, x))
}

/** When the count first shows each multiple of `step` (and its last value): one tick each. */
export function countTicks(c: Count): number[] {
  const ticks: number[] = []
  const span = c.to - c.from
  for (let v = c.from + c.step; v <= c.to; v += c.step) ticks.push(v)
  if (ticks.at(-1) !== c.to) ticks.push(c.to)
  return ticks.map((v) => {
    // The first x where round(from + span * ease(x)) reaches v: ease(x) = (v - 0.5 - from) / span.
    const p = Math.min(1, Math.max(0, (v - 0.5 - c.from) / span))
    return c.start + easeInverse(c, p) * c.dur
  })
}

/** Snap a time to the frame that shows it (30 fps), so a sound starts on the frame its picture changes. */
export const onFrame = (t: number) => Math.ceil(t * 30 - 1e-6) / 30

export const counts = {
  /** The 6-in-10 ring: one segment per tick. */
  sixInTen: { start: 3.35, dur: 0.84, from: 0, to: 6, step: 1, ease: 'linear' },
  /** The two renewal pills. */
  stay: { start: 8.0, dur: 0.9, from: 0, to: 78, step: 20, ease: 'out' },
  /** 59% starts as the row lands (10.4 s) and reaches 59 on the spoken "fifty-nine" (11.2 s), so it rests before the cut. */
  under: { start: 10.4, dur: 0.8, from: 0, to: 59, step: 20, ease: 'out' },
  /** Came back, 8 to 9. */
  cameBack: { start: 24.85, dur: 0.1, from: 8, to: 9, step: 1, ease: 'linear' },
} satisfies Record<string, Count>

/** The picture events. */
export const at = {
  /** Three days of the week fill, on "three", "times" and "week". */
  weekDays: [6.6, 6.87, 7.33],
  keyTaps: [14.4, 14.7, 15.0],
  welcome: 15.2,
  /** Sam's check starts to draw (the bouncy spring); the chime starts with it. */
  check: 15.4,
  /** Sam's weeks, 3, 3, 2, 1, 0: each week's marks land in turn. */
  weeks: [17.25, 17.5, 17.75, 18.0, 18.25],
  /** Sam's row turns Slipping, on "gone". */
  slipping: 18.93,
  nudgeTap: 20.45,
  sheet: 20.6,
  textMessageTap: 21.05,
  nudged: 21.3,
  thread: 21.75,
  typing: 21.85,
  /** Coach Mike's bubble lands. */
  bubble: 22.35,
  welcomeBack: 23.15,
  checkBack: 23.4,
  cameBackPill: 24.35,
  endCard: 26.0,
  /** Early enough that the finished end card holds still for about 1.1 s before the loop wraps. */
  tryDemo: 28.55,
} as const

export type SfxName = 'key-tap-1' | 'key-tap-2' | 'key-tap-3' | 'chime' | 'sent' | 'tick' | 'tap'

/** Each UI sound: its file in public/sfx, when the file starts, and the picture event it marks. */
export type SfxCue = { name: SfxName; start: number; event: number; what: string }

/** sent.wav lands 0.30 s into the file (sfx.json), so it starts that much before the bubble. */
const SENT_LANDS = 0.3

export function sfxCues(): SfxCue[] {
  const cues: SfxCue[] = []
  const add = (name: SfxName, event: number, what: string, lead = 0) => {
    const e = onFrame(event)
    cues.push({ name, start: e - lead, event: e, what })
  }
  countTicks(counts.sixInTen).forEach((t, i) => add('tick', t, `6 in 10 ring, segment ${i + 1}`))
  at.weekDays.forEach((t, i) => add('tick', t, `three times a week, day ${i + 1}`))
  countTicks(counts.stay).forEach((t, i) => add('tick', t, `78% count, step ${i + 1}`))
  countTicks(counts.under).forEach((t, i) => add('tick', t, `59% count, step ${i + 1}`))
  at.keyTaps.forEach((t, i) => add(`key-tap-${i + 1}` as SfxName, t, `kiosk key ${i + 1}`))
  add('chime', at.check, "Sam's check")
  at.weeks.forEach((t, i) => add('tick', t, `Sam's week ${i + 1}`))
  add('tap', at.nudgeTap, 'Nudge pressed')
  add('tap', at.textMessageTap, 'Text Message pressed')
  add('sent', at.bubble, "Coach Mike's bubble lands", SENT_LANDS)
  add('chime', at.checkBack, "Sam's check, welcome back")
  countTicks(counts.cameBack).forEach((t) => add('tick', t, 'Came back 8 to 9'))
  return cues.sort((a, b) => a.start - b.start)
}
