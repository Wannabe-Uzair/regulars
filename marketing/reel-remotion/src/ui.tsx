import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { interpolate, interpolateColors, spring, useCurrentFrame } from 'remotion'
import { color, font, FPS, springs } from './theme.ts'

/** The two shapes: 16:9 (1920 x 1080) and 9:16 (1080 x 1920), each laid out for its own frame. */
export type Shape = 'wide' | 'tall'
export const ShapeContext = createContext<Shape>('wide')
export const useShape = () => useContext(ShapeContext)

/** The film's clock in seconds. */
export const useT = () => useCurrentFrame() / FPS

type SpringName = keyof typeof springs

/** A spring from 0 to 1 that starts at `start` seconds. */
export function sp(t: number, start: number, kind: SpringName = 'smooth'): number {
  return spring({ frame: (t - start) * FPS, fps: FPS, config: springs[kind] })
}

/** In on the smooth spring at `inAt`, out on the quick one at `outAt` (exits run quicker than entrances). */
export function presence(t: number, inAt: number, outAt: number): number {
  return Math.min(sp(t, inAt), 1 - sp(t, outAt, 'quick'))
}

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/**
 * The content swap inside a shape that carries across a cut, on the shape's own progress `p` (0 to 1): the old content
 * is gone a quarter of the way in (about 2 frames on the smooth spring), and the new one comes in from just past the
 * half, as the shape settles. Two contents are never drawn over each other, and the shape itself is always there.
 */
export function handoff(p: number) {
  return { out: 1 - clamp01(p / 0.25), in: clamp01((p - 0.55) / 0.4) }
}

/** A shape's box: its centre, size and corner radius, in frame pixels (or its parent's). */
export type Rect = { x: number; y: number; w: number; h: number; r: number }

export function mixRect(a: Rect, b: Rect, p: number): Rect {
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p), r: lerp(a.r, b.r, p) }
}

export const mixColor = (a: string, b: string, p: number) => interpolateColors(clamp01(p), [0, 1], [a, b])

/** A morphing shape: a box drawn at `rect`, its content clipped to it. */
export function Box({ rect, fill, shadow, children, style }: { rect: Rect; fill: string; shadow?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x - rect.w / 2,
        top: rect.y - rect.h / 2,
        width: rect.w,
        height: rect.h,
        borderRadius: Math.min(rect.r, rect.w / 2, rect.h / 2),
        background: fill,
        boxShadow: shadow,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

let measureCtx: CanvasRenderingContext2D | null = null
/** A text's advance width in Inter (loaded before any frame is taken, Root.tsx), with CSS letter-spacing in em. */
export function textWidth(text: string, px: number, weight: number, trackingEm = 0): number {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  const ctx = measureCtx!
  ctx.font = `${weight} ${px}px Inter`
  return ctx.measureText(text).width + text.length * trackingEm * px
}

/** How many lines a text wraps to at `maxW` (greedy, at the spaces), for the shapes whose size follows their text. */
export function lineCount(text: string, px: number, weight: number, maxW: number, trackingEm = 0): number {
  let lines = 1
  let cur = ''
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word
    if (cur && textWidth(next, px, weight, trackingEm) > maxW) {
      lines++
      cur = word
    } else cur = next
  }
  return lines
}

/** theme.ts's shadow.lift at `k` of its strength. */
export const liftShadow = (k: number) => (k <= 0.001 ? 'none' : `0 0 2px rgb(0 0 0 / ${0.06 * k}), 0 4px 8px rgb(0 0 0 / ${0.07 * k})`)

/** theme.ts's shadow.modal at `k` of its strength. */
export const modalShadow = (k: number) => (k <= 0.001 ? 'none' : `0 0 8px rgb(0 0 0 / ${0.1 * k}), 0 32px 64px rgb(0 0 0 / ${0.18 * k})`)

/** The phone's frame: theme.ts's shadow.float and the white ring, at `k` of their strength, for a screen `w` wide. */
export function phoneFrame(w: number, k: number) {
  if (k <= 0.001) return 'none'
  return `0 0 ${8 * k}px rgb(0 0 0 / ${0.08 * k}), 0 ${14 * k}px ${28 * k}px rgb(0 0 0 / ${0.14 * k}), 0 0 0 ${Math.max(6, w * 0.022)}px rgb(255 255 255 / ${k})`
}

/** The kiosk welcome's ring centre, from the top of a phone screen `w` x `h` (its column is centred on the screen). */
export function welcomeRingY(w: number, h: number, back: boolean): number {
  const title = back ? 'Welcome back, Sam.' : 'Welcome, Sam.'
  const lines = lineCount(title, w * 0.105, 700, w * 0.88, -0.02)
  const column = w * 0.4 + w * 0.09 + lines * w * 0.105 * 1.1 + (back ? 0 : w * 0.3)
  return h / 2 - column / 2 + w * 0.2
}

/**
 * The picture area above the captions, where each scene lays itself out. In 16:9 it sits 60 px down, so its centre
 * (y 480) is the frame's optical centre over the caption band. `full` is the whole frame, for the shots no caption
 * shares (the Came back pill once its line has passed, and the end card).
 */
export function stageBox(shape: Shape, full = false) {
  if (shape === 'tall') return { left: 0, top: 230, width: 1080, height: 1340 }
  return full ? { left: 0, top: 0, width: 1920, height: 1080 } : { left: 0, top: 60, width: 1920, height: 840 }
}

/** The centre of the picture area, in frame pixels. */
export function stageCentre(shape: Shape, full = false) {
  const b = stageBox(shape, full)
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
}

export function Stage({ children, style, full }: { children: ReactNode; style?: CSSProperties; full?: boolean }) {
  const box = stageBox(useShape(), full)
  return (
    <div
      style={{
        position: 'absolute',
        ...box,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font,
        color: color.text,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/**
 * The Quarter mark (packages/ui Logo): a filled quarter circle with an L-shaped gap holding one rounded square, on a
 * 24-unit grid. `sweep` reveals the quarter clockwise about its corner, from 12 o'clock to 3 o'clock; `square` pops the
 * square in.
 */
export function QuarterMark({ size, sweep = 1, square = 1 }: { size: number; sweep?: number; square?: number }) {
  const cx = 4.4
  const cy = 19.6
  const r = 22
  const a = (-90 + 90 * clamp01(sweep)) * (Math.PI / 180)
  const wedge = `M${cx} ${cy}L${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}Z`
  const id = `q${Math.round(size)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: 'none', overflow: 'visible' }}>
      <defs>
        <clipPath id={id}>
          <path d={sweep >= 1 ? 'M-2 -2H26V26H-2Z' : wedge} />
        </clipPath>
      </defs>
      <path clipPath={`url(#${id})`} opacity={clamp01(sweep * 3)} fill={color.text} d="M4.4 13.3V4.4A15.2 15.2 0 0 1 19.6 19.6H10.7V13.3Z" />
      <rect
        fill={color.tint}
        x="4.4"
        y="14.6"
        width="5"
        height="5"
        rx="1.3"
        opacity={clamp01(square * 1.5)}
        style={{ transformOrigin: '6.9px 17.1px', transform: `scale(${lerp(0.4, 1, square)})` }}
      />
    </svg>
  )
}

export type Status = 'on' | 'below' | 'slipping' | 'new'

/** The four status marks (packages/ui StatusDot) on their 12-unit grid. */
export function StatusMark({ status, size, fill }: { status: Status; size: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ flex: 'none' }}>
      {status === 'on' && <circle cx="6" cy="6" r="5" fill={fill} />}
      {status === 'below' && (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke={fill} strokeWidth="1.5" />
          <path d="M6 1A5 5 0 0 0 6 11Z" fill={fill} />
        </>
      )}
      {status === 'new' && <circle cx="6" cy="6" r="4.25" fill="none" stroke={fill} strokeWidth="1.5" />}
      {status === 'slipping' && (
        <path d="M1 1.7h10L6 10.3Z" fill={fill} stroke={fill} strokeWidth="1" strokeLinejoin="round" />
      )}
    </svg>
  )
}

/** Phosphor 2.1.1 (MIT), Regular, copied as drawn in packages/ui/src/icons. */
export const icons = {
  check: 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
  chatCircle:
    'M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z',
} as const

export function Icon({ d, size, fill }: { d: string; size: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" style={{ flex: 'none' }}>
      <path d={d} fill={fill} />
    </svg>
  )
}

/** A member's initials in a tinted circle. */
export function Avatar({ initials, size, style }: { initials: string; size: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: color.tintFill,
        color: color.tint,
        fontWeight: 600,
        fontSize: size * 0.38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {initials}
    </div>
  )
}

/**
 * A neutral rounded frame for a phone's screen: no device drawing, only the screen's shape on a float shadow. `bare`
 * (0 to 1) takes the white ring and the shadow away, for a push-in so close that the screen becomes the frame: the
 * screen is the ground colour, so its content then stands on the ground with no edge to cut.
 */
export function Phone({
  width,
  height,
  children,
  style,
  bare = 0,
}: {
  width: number
  height: number
  children: ReactNode
  style?: CSSProperties
  bare?: number
}) {
  const keep = 1 - clamp01(bare)
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.12,
        background: keep > 0.001 ? color.bg : 'transparent',
        boxShadow: phoneFrame(width, keep),
        overflow: 'hidden',
        position: 'relative',
        flex: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** A ring of `n` equal segments, `filled` of them (fractions fade in) in `on`, the rest in `off`. */
export function SegmentRing({
  n,
  filled,
  size,
  stroke,
  on,
  off,
}: {
  n: number
  filled: number
  size: number
  stroke: number
  on: string
  off: string
}) {
  const r = (size - stroke) / 2
  const c = size / 2
  const gapDeg = n > 4 ? 5 : 8
  const seg = 360 / n
  const arc = (i: number) => {
    const a0 = ((-90 + i * seg + gapDeg / 2) * Math.PI) / 180
    const a1 = ((-90 + (i + 1) * seg - gapDeg / 2) * Math.PI) / 180
    return `M${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`
  }
  return (
    <svg width={size} height={size} style={{ flex: 'none' }}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <path d={arc(i)} stroke={off} strokeWidth={stroke} fill="none" strokeLinecap="butt" />
          <path
            d={arc(i)}
            stroke={on}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
            opacity={clamp01(filled - i)}
          />
        </g>
      ))}
    </svg>
  )
}

/** The kiosk welcome's check in its ring: the ring and check draw on `p` (0 to 1, may overshoot on the bounce). */
export function CheckInRing({ size, p, draw }: { size: number; p: number; draw: number }) {
  const s = interpolate(p, [0, 1], [0.6, 1])
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: color.tint,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${s})`,
        opacity: clamp01(p * 2),
        flex: 'none',
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
        <path
          d="M4.5 12.5l5 5L19.5 7"
          fill="none"
          stroke={color.onTint}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamp01(draw)}
        />
      </svg>
    </div>
  )
}

/** A small tag, like packages/ui Tag: the label size and weight on a neutral fill. */
export function Tag({ children, size }: { children: ReactNode; size: number }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 600,
        padding: `${size * 0.3}px ${size * 0.6}px`,
        borderRadius: 999,
        background: color.highlightPress,
        color: color.text,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
