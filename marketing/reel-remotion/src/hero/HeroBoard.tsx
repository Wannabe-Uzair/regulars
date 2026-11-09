import type { CSSProperties } from 'react'
import { Easing, interpolate } from 'remotion'
import { clamp01, icons, lerp, sp as spring, useT } from '../ui.tsx'
import './hero.css'
import { words } from './words.ts'

/**
 * The home hero's clip, "the board coming alive" (Uzair, on the Mac mini): the floating board as the home page drew it,
 * in 9 s that loop. Four members check in (each week fills with the board's pop and fading row tint); Sam's weeks thin
 * and his row turns Slipping, with its Nudge; the Nudge is pressed and reads "Nudged" with its check; a beat later his
 * week fills and he is back on the line; then his weeks fill again, the weeks in progress go back to their outlines,
 * and it rests on the first frame, which is also the poster and the still under Reduce Motion. On the app's springs
 * (theme.ts): the smooth one for everything, the quick one for what leaves.
 *
 * `sample` draws the home page's own still instead (Sam slipping, with his Nudge): build-hero's look compares it with
 * a screenshot of the page.
 */
export type HeroShape = 'wide' | 'phone'

export const HERO = {
  fps: 30,
  seconds: 9,
  /** The card's size on the home page: 896 px wide at 1280 x 800 (the table), 358 px at 390 x 844 (two-line rows). */
  size: { wide: { width: 896, height: 421 }, phone: { width: 358, height: 580 } },
} as const

type Kind = 'full' | 'some' | 'none' | 'outline' | 'future'
type Status = 'on' | 'below' | 'slipping'
/** How a mark takes its new look: a check-in's pop, the page's fill (in from 60%), or a fade to what lies under it. */
type How = 'pop' | 'fill' | 'fade'
type Change = { at: number; kind?: Kind; flag?: boolean; how: How }
type Row = { name: keyof typeof words; status: Status; nudge?: boolean; marks: Kind[]; flags?: number[] }

const at = {
  checkIns: [0.8, 1.15, 1.5, 1.85],
  thin: 2.8,
  slipping: 3.2,
  nudgeIn: 3.4,
  press: 4.6,
  nudged: 4.8,
  back: 6.0,
  onTheLine: 6.3,
  refill: 7.4,
  settle: 7.9,
} as const

/** A week's marks from its visits, as the board's weekCells draws them: `week` is the week in progress. */
function marks(week: number, visits: number[]): Kind[] {
  return Array.from({ length: 13 }, (_, w) => {
    const v = visits[w]
    if (w > week || v === undefined) return 'future'
    if (w === week) return v >= 3 ? 'full' : 'outline'
    return v >= 3 ? 'full' : v >= 1 ? 'some' : 'none'
  })
}

/** The home page's six sample rows (apps/web board-sample.ts), Sam on the line at first: three full weeks. */
const ROWS: Row[] = [
  { name: 'home.board.member1', status: 'on', marks: marks(3, [3, 3, 3, 1]) },
  { name: 'home.board.member2', status: 'slipping', nudge: true, marks: marks(6, [3, 2, 2, 2, 1, 0, 1]), flags: [4, 5] },
  { name: 'home.board.member3', status: 'on', marks: marks(6, [1, 3, 3, 3, 3, 3, 0]) },
  { name: 'home.board.member4', status: 'on', marks: marks(9, [3, 3, 3, 3, 3, 3, 3, 3, 3, 0]) },
  { name: 'home.board.member5', status: 'below', marks: marks(11, [3, 3, 3, 2, 2, 3, 2, 2, 2, 2, 2, 1]) },
  { name: 'home.board.member6', status: 'on', marks: marks(12, [3, 3, 2, 3, 3, 3, 3, 3, 3, 2, 3, 3, 1]) },
]

/** Sam as the home page's still shows him: weeks 1, 1, 0 and this week's 1, slipping, with his Nudge. */
const SAM_SAMPLE: Row = { ...ROWS[0]!, status: 'slipping', nudge: true, marks: marks(3, [1, 1, 0, 1]), flags: [1, 2] }

/** The rows whose week in progress fills at the start (Dev, Maya, Chris, Jo), and that week. */
const IN_PROGRESS: Record<number, number> = { 2: 6, 3: 9, 4: 11, 5: 12 }

/** Each mark's changes over the loop, in order; every row starts and ends as it was. */
function changes(row: number, week: number): Change[] {
  const list: Change[] = []
  const checkIn = [2, 3, 4, 5].indexOf(row)
  if (checkIn >= 0 && IN_PROGRESS[row] === week) {
    list.push({ at: at.checkIns[checkIn]!, kind: 'full', how: 'pop' })
    list.push({ at: at.settle + 0.06 * checkIn, kind: 'outline', how: 'fade' })
  }
  if (row === 0) {
    const thin: Kind[] = ['some', 'some', 'none']
    if (week < 3) {
      list.push({ at: at.thin + 0.12 * week, kind: thin[week], flag: week >= 1, how: 'fade' })
      if (week >= 1) list.push({ at: at.onTheLine, flag: false, how: 'fade' })
      list.push({ at: at.refill + 0.12 * week, kind: 'full', how: 'fill' })
    }
    if (week === 3) {
      list.push({ at: at.back, kind: 'full', how: 'pop' })
      list.push({ at: at.settle + 0.24, kind: 'outline', how: 'fade' })
    }
  }
  return list
}

const ease = Easing.bezier(0.2, 0, 0, 1)

/** The reel's springs, landed exactly once they are within 0.2% of rest, so the last frame is the first. */
function sp(t: number, start: number, kind?: 'smooth' | 'quick'): number {
  const v = spring(t, start, kind)
  return Math.abs(1 - v) < 0.002 ? 1 : v
}

/** A check-in's row tint: in on the quick spring, then gone over --motion-linger (1.6 s) on --ease-standard. */
function tintAt(t: number, start: number): number {
  if (t < start) return 0
  return sp(t, start, 'quick') * (1 - interpolate(t - start, [0, 1.6], [0, 1], { easing: ease, extrapolateRight: 'clamp' }))
}

function Mark({ kind, style }: { kind: Kind | 'flag'; style?: CSSProperties }) {
  return <span className="hb-mark" data-mark={kind} style={style} />
}

/** One week's cell at time t: its look before the latest change, and the new one coming in on that change's spring. */
function Cell({ t, kind, flag, list }: { t: number; kind: Kind; flag: boolean; list: Change[] }) {
  let prev = { kind, flag }
  let cur = prev
  let change: Change | undefined
  for (const c of list) {
    if (c.at > t) break
    prev = cur
    cur = { kind: c.kind ?? cur.kind, flag: c.flag ?? cur.flag }
    change = c
  }
  const p = change ? sp(t, change.at) : 1
  const flagOpacity = lerp(Number(prev.flag), Number(cur.flag), p)
  const flagLayer = flagOpacity > 0 && <Mark kind="flag" style={{ opacity: flagOpacity }} />
  if (!change || prev.kind === cur.kind || p >= 1) {
    return (
      <span className="hb-cell">
        <Mark kind={cur.kind} />
        {flagLayer}
      </span>
    )
  }
  if (change.how === 'fade') {
    return (
      <span className="hb-cell">
        <Mark kind={cur.kind} />
        <Mark kind={prev.kind} style={{ opacity: 1 - p }} />
        {flagLayer}
      </span>
    )
  }
  // A check-in pops from 125% (the board's pop) as it comes in; the page's fill grows from 60%.
  const from = change.how === 'pop' ? 1.25 : 0.6
  const opacity = change.how === 'pop' ? sp(t, change.at, 'quick') : p
  return (
    <span className="hb-cell">
      <Mark kind={prev.kind} />
      <Mark kind={cur.kind} style={{ opacity, transform: `scale(${lerp(from, 1, p)})` }} />
      {flagLayer}
    </span>
  )
}

/** StatusDot's four shapes on their 12-unit grid, in currentColor. */
function Dot({ status }: { status: Status }) {
  return (
    <svg className="hb-dot" viewBox="0 0 12 12" aria-hidden="true">
      {status === 'on' && <circle cx="6" cy="6" r="5" fill="currentColor" />}
      {status === 'below' && (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1A5 5 0 0 0 6 11Z" fill="currentColor" />
        </>
      )}
      {status === 'slipping' && (
        <path d="M1 1.7h10L6 10.3Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function StatusTag({ status, style }: { status: Status; style?: CSSProperties }) {
  return (
    <span className="hb-tag" data-status={status} style={style}>
      <Dot status={status} />
      {words[`status.${status}`]}
    </span>
  )
}

/** Phosphor's check at 1 em (packages/ui CheckIcon). */
function Check({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true" style={style}>
      <path d={icons.check} />
    </svg>
  )
}

/** Sam's status and Nudge over the loop: on the line, Slipping with Nudge, pressed, Nudged, and on the line again. */
function SamStatus({ t }: { t: number }) {
  // The words swap on a single frame, as the app does; only the Nudge's arrival and departure fade, and the check springs in.
  const slipping = t >= at.slipping && t < at.onTheLine
  const shown = sp(t, at.nudgeIn) * (1 - sp(t, at.onTheLine, 'quick'))
  const done = t >= at.nudged
  const pressed = t >= at.press && t < at.nudged
  const check = sp(t, at.nudged)
  return (
    <span className="hb-status">
      <span className="hb-stack">
        <StatusTag status={slipping ? 'slipping' : 'on'} />
      </span>
      <span className="hb-stack hb-end">
        <span
          className="hb-button hb-tinted"
          style={{
            opacity: done ? 0 : shown,
            backgroundColor: pressed ? 'var(--tint-fill-press)' : undefined,
          }}
        >
          <span>{words['member.nudge']}</span>
        </span>
        <span className="hb-button" style={{ opacity: done ? shown : 0 }}>
          <span>
            <Check style={{ opacity: clamp01(check), transform: `scale(${lerp(0.5, 1, check)})` }} />
            {words['nudge.done']}
          </span>
        </span>
      </span>
    </span>
  )
}

function Status({ row }: { row: Row }) {
  return (
    <span className="hb-status">
      <StatusTag status={row.status} />
      {row.nudge && (
        <span className="hb-button hb-tinted">
          <span>{words['member.nudge']}</span>
        </span>
      )}
    </span>
  )
}

const LEGEND: { kind: Kind; flag?: boolean; label: keyof typeof words }[] = [
  { kind: 'full', label: 'board.legend.3' },
  { kind: 'some', label: 'board.legend.low' },
  { kind: 'none', label: 'board.legend.none' },
  { kind: 'some', flag: true, label: 'status.slipping' },
  { kind: 'outline', label: 'board.legend.week' },
]

export function HeroBoard({ shape, sample = false }: { shape: HeroShape; sample?: boolean }) {
  const real = useT()
  // The still is the loop's first frame; `sample` holds the home page's still, with nothing moving.
  const t = sample ? 0 : real
  const rows = sample ? [SAM_SAMPLE, ...ROWS.slice(1)] : ROWS
  return (
    <div className={`hb-frame hb-${shape}`}>
      <div className="hb-card">
        <p className="hb-head">
          <span className="hb-title">{words['home.board.title']}</span>
          <span className="hb-tag">{words['tag.sample']}</span>
        </p>
        <ul className="hb-rows">
          {rows.map((row, r) => {
            const checkIn = sample ? -1 : r === 0 ? at.back : (at.checkIns[[2, 3, 4, 5].indexOf(r)] ?? -1)
            const tint = checkIn >= 0 ? tintAt(t, checkIn) : 0
            return (
              <li key={row.name} className="hb-row">
                {tint > 0 && <span className="hb-tint" style={{ opacity: tint }} />}
                <span className="hb-name">{words[row.name]}</span>
                <span className="hb-weeks">
                  {row.marks.map((kind, w) => (
                    <Cell
                      key={w}
                      t={t}
                      kind={kind}
                      flag={row.flags?.includes(w) ?? false}
                      list={sample ? [] : changes(r, w)}
                    />
                  ))}
                </span>
                {r === 0 && !sample ? <SamStatus t={t} /> : <Status row={row} />}
              </li>
            )
          })}
        </ul>
        <ul className="hb-legend" aria-hidden="true">
          {LEGEND.map((item) => (
            <li key={item.label}>
              <span className="hb-cell">
                <Mark kind={item.kind} />
                {item.flag && <Mark kind="flag" />}
              </span>
              {words[item.label]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
