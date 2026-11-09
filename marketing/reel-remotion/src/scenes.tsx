import type { CSSProperties, ReactNode } from 'react'
import voice from '../public/voice.json'
import { at, countAt, counts, countTicks } from './cues.ts'
import { endCard, figures, member, nudgeText } from './content.ts'
import { color, font, shadow, weight } from './theme.ts'
import {
  Avatar,
  Box,
  CheckInRing,
  clamp01,
  handoff,
  Icon,
  icons,
  lerp,
  liftShadow,
  lineCount,
  mixColor,
  mixRect,
  modalShadow,
  Phone,
  phoneFrame,
  QuarterMark,
  SegmentRing,
  sp,
  Stage,
  stageCentre,
  StatusMark,
  Tag,
  textWidth,
  useShape,
  useT,
  welcomeRingY,
  type Rect,
  type Shape,
  type Status,
} from './ui.tsx'

type Word = { word: string; at: number; stress?: boolean }
const line = (beat: string) => voice.lines.find((l) => l.beat === beat)!
const words = (beat: string) => line(beat).words as Word[]

/*
 * The handoffs. At every cut one shape carries across (a card, a capsule, a square, a circle, a phone): it moves and
 * reshapes on the smooth spring while the content inside it changes (handoff() in ui.tsx: the old content out in about
 * 2 frames, the new one in as the shape settles). The shapes that travel between scenes are drawn by Morphs(), under
 * every scene, in frame pixels; each scene leaves its own container empty (no fill, no shadow) while the morph is in
 * flight and takes it back once the morph lands. The geometry below is each container's resting box, worked out from
 * the same numbers the scenes lay themselves out with.
 */

/** Spring progress counted as landed: under a pixel from the resting box. */
const LANDED = 0.999

/** The phone's size in each shape. */
function phoneSize(shape: Shape) {
  return shape === 'wide' ? { w: 430, h: 800 } : { w: 700, h: 1220 }
}
function usePhone() {
  return phoneSize(useShape())
}

/** The lockup's tinted square (the Quarter mark beside "Regulars"), for a mark `size` px with its row centred on `c`. */
function lockupSquare(size: number, c: { x: number; y: number }): Rect {
  const name = textWidth(endCard.name, size * 0.75, weight.heading, -0.01)
  const markW = size - (2 * size * 4.4) / 24
  const left = c.x - (markW + size * 0.36 + name) / 2
  const s = (size * 5) / 24
  return { x: left + s / 2, y: c.y - size / 2 + (size * 17.1) / 24, w: s, h: s, r: (size * 1.3) / 24 }
}

const END = {
  wide: { size: 180, gap: 56, tagline: 76, taglineW: 1600, demo: 52 },
  tall: { size: 170, gap: 80, tagline: 80, taglineW: 900, demo: 58 },
} as const

/** The end card's lockup centre: its column (lockup, tagline, Try the Demo) is centred on the whole frame. */
function endLockupCentre(shape: Shape) {
  const e = END[shape]
  const text = words('end-card')
    .slice(1)
    .map((w) => w.word)
    .join(' ')
  const tagH = lineCount(text, e.tagline, 600, e.taglineW, -0.02) * e.tagline * 1.15
  const column = e.size + e.gap + tagH + e.gap + e.demo * 1.2
  const c = stageCentre(shape, true)
  return { x: c.x, y: c.y - column / 2 + e.size / 2 }
}

/** The figures card as it rests at 12.1 s (the bars, both rows): centred over its source line. */
function figuresCard(shape: Shape): Rect {
  const c = stageCentre(shape)
  return shape === 'wide' ? { x: c.x, y: c.y - 35, w: 1480, h: 520, r: 96 } : { x: c.x, y: c.y - 45, w: 960, h: 620, r: 96 }
}

/** The kiosk's phone, at rest in the middle of the picture. */
function kioskPhone(shape: Shape): Rect {
  const c = stageCentre(shape)
  const ph = phoneSize(shape)
  return { x: c.x, y: c.y, w: ph.w, h: ph.h, r: ph.w * 0.12 }
}

/** The kiosk's push-in on the welcome. */
const WELCOME_ZOOM = { wide: 1.42, tall: 1.12 } as const
/** The welcome-back phone's scale. */
const BACK_ZOOM = { wide: 1.42, tall: 1.08 } as const

/** A welcome's check ring in frame pixels, on a phone centred in the picture at `zoom`. */
function welcomeRing(shape: Shape, back: boolean, zoom: number): Rect {
  const c = stageCentre(shape)
  const { w, h } = phoneSize(shape)
  const d = w * 0.4 * zoom
  return { x: c.x, y: c.y + (welcomeRingY(w, h, back) - h / 2) * zoom, w: d, h: d, r: d / 2 }
}

/** Sam close up (0:17): his avatar, name and weeks, each centred at its offset from the picture's centre. */
const FOCUS = {
  wide: { avatar: 110, avatarY: -229, nameY: -124, weeksY: 116 },
  tall: { avatar: 120, avatarY: -330, nameY: -215, weeksY: 20 },
} as const

function focusAvatar(shape: Shape): Rect {
  const c = stageCentre(shape)
  const f = FOCUS[shape]
  return { x: c.x, y: c.y + f.avatarY, w: f.avatar, h: f.avatar, r: f.avatar / 2 }
}

/** The board: three rows of fixed height in one card, Sam's in the middle, so his row's centre is the card's. */
const BOARD = {
  wide: { w: 1500, pad: 16, row: 156, padX: 48, avatar: 88 },
  tall: { w: 980, pad: 20, row: 204, padX: 40, avatar: 92 },
} as const

function boardCard(shape: Shape): Rect {
  const c = stageCentre(shape)
  const b = BOARD[shape]
  return { x: c.x, y: c.y, w: b.w, h: b.pad * 2 + b.row * 3 + 4, r: 40 }
}

function boardAvatar(shape: Shape): Rect {
  const c = stageCentre(shape)
  const b = BOARD[shape]
  const x = c.x - b.w / 2 + b.padX + b.avatar / 2
  // 9:16 rows wrap: the avatar sits in the row's first line, above the weeks (34 px padding, then 92 px).
  const y = shape === 'wide' ? c.y : c.y - b.row / 2 + 34 + b.avatar / 2
  return { x, y, w: b.avatar, h: b.avatar, r: b.avatar / 2 }
}

/** Sam's row on its own (0:20): a card of fixed height; its first line holds the avatar, name and status. */
const ROW = {
  wide: { w: 1400, pad: 44, padX: 52, avatar: 110, name: 56, status: 38, nudge: 44 },
  tall: { w: 980, pad: 44, padX: 44, avatar: 120, name: 58, status: 40, nudge: 48 },
} as const

function rowLine1(shape: Shape) {
  const r = ROW[shape]
  return Math.max(r.avatar, r.name * 1.2 + 10 + r.status * 1.2)
}

function rowCard(shape: Shape): Rect {
  const c = stageCentre(shape)
  const r = ROW[shape]
  const h = shape === 'wide' ? r.pad * 2 + rowLine1(shape) : r.pad * 2 + rowLine1(shape) + 36 + 120
  return { x: c.x, y: c.y, w: r.w, h, r: 40 }
}

function rowAvatar(shape: Shape): Rect {
  const card = rowCard(shape)
  const r = ROW[shape]
  const x = card.x - card.w / 2 + r.padX + r.avatar / 2
  const y = card.y - card.h / 2 + r.pad + rowLine1(shape) / 2
  return { x, y, w: r.avatar, h: r.avatar, r: r.avatar / 2 }
}

/** The row's Nudge capsule: a fixed size, so the sheet can grow out of it and fold back into its place. */
function nudgePill(shape: Shape): Rect {
  const card = rowCard(shape)
  const r = ROW[shape]
  const s = r.nudge
  const w = textWidth('Nudge', s, 600) + s * 1.1 + s * 0.4 + s * 1.8
  const h = s * 2.2
  if (shape === 'wide') return { x: card.x + card.w / 2 - r.padX - w / 2, y: card.y, w, h, r: h / 2 }
  return { x: card.x, y: card.y - card.h / 2 + r.pad + rowLine1(shape) + 36 + 60, w, h, r: h / 2 }
}

const SHEET = {
  wide: { top: 40, w: 1000, padTop: 48, padBottom: 56, padX: 64, title: 52, text: 30, gap: 22, button: 40 },
  tall: { top: 420, w: 980, padTop: 60, padBottom: 64, padX: 56, title: 60, text: 36, gap: 30, button: 46 },
} as const

function sheetRect(shape: Shape): Rect {
  const s = SHEET[shape]
  const lines = lineCount(nudgeText, s.text, 400, s.w - s.padX * 2)
  const h = s.padTop + s.title * 1.2 + s.gap + lines * s.text * 1.35 + 8 + s.gap + 3 * s.button * 2.2 + 2 * s.gap + s.padBottom
  const c = stageCentre(shape, true)
  return { x: c.x, y: s.top + h / 2, w: s.w, h, r: 48 }
}

/** Sam's phone with Coach Mike's thread: it pushes in a little as the text is typed (about its point 80% down in 9:16). */
function threadZoom(shape: Shape, t: number) {
  return lerp(1, shape === 'wide' ? 1.1 : 1.08, sp(t, at.typing))
}
function threadPhone(shape: Shape, t: number): Rect {
  const c = stageCentre(shape)
  const { w, h } = phoneSize(shape)
  const z = threadZoom(shape, t)
  const y = shape === 'wide' ? c.y : c.y + 0.3 * h * (1 - z)
  return { x: c.x, y, w: w * z, h: h * z, r: w * 0.12 * z }
}

/** The Came back capsule, centred with its caption line on the whole frame. */
function cameBackCapsule(shape: Shape): Rect {
  const c = stageCentre(shape, true)
  const [w, h, below] = shape === 'wide' ? [1300, 380, 36 + 34 * 1.2] : [900, 360, 36 + 38 * 1.2]
  return { x: c.x, y: c.y - (h + below) / 2 + h / 2, w, h, r: 96 }
}

const joinShadows = (...s: string[]) => s.filter((x) => x !== 'none').join(', ') || 'none'

/** The shapes that travel between scenes, under every scene. */
export function Morphs() {
  const t = useT()
  const shape = useShape()
  const out: ReactNode[] = []

  // 12.1 s: the figures card shrinks into the mark's tinted square; 13.85 s: the square opens into the kiosk's phone.
  {
    const toMark = sp(t, 12.1)
    const toPhone = sp(t, 13.85)
    if (t >= 12.1 && toPhone < LANDED) {
      const square = lockupSquare(shape === 'wide' ? 280 : 210, stageCentre(shape))
      const rect = mixRect(mixRect(figuresCard(shape), square, toMark), kioskPhone(shape), toPhone)
      const fill = toPhone > 0 ? mixColor(color.tint, color.bg, toPhone / 0.5) : mixColor(color.surface, color.tint, (toMark - 0.25) / 0.5)
      const sh = toPhone > 0 ? phoneFrame(phoneSize(shape).w, toPhone) : liftShadow(1 - toMark)
      out.push(<Box key="mark" rect={rect} fill={fill} shadow={sh} />)
    }
  }

  // 19.95 s: the board card closes onto Sam's row; 21.75 s: his row card becomes his phone.
  {
    const toRow = sp(t, 19.95)
    const toPhone = sp(t, 21.75)
    if (t >= 19.95 && toRow < LANDED) {
      out.push(<Box key="board" rect={mixRect(boardCard(shape), rowCard(shape), toRow)} fill={color.surface} shadow={shadow.lift} />)
    }
    if (t >= 21.75 && toPhone < LANDED) {
      const z = threadZoom(shape, t)
      const rect = mixRect(rowCard(shape), threadPhone(shape, t), toPhone)
      const sh = joinShadows(liftShadow(1 - toPhone), phoneFrame(phoneSize(shape).w * z, toPhone))
      out.push(<Box key="row" rect={rect} fill={mixColor(color.surface, color.bg, toPhone / 0.6)} shadow={sh} />)
    }
  }

  // 24.35 s: the welcome-back check ring opens into the Came back capsule; 25.95 s: the capsule shrinks into the end
  // card's tinted square.
  {
    const toPill = sp(t, 24.35)
    const toEnd = sp(t, 25.95)
    if ((t >= 24.35 && toPill < LANDED) || (t >= 25.95 && toEnd < LANDED)) {
      const square = lockupSquare(END[shape].size, endLockupCentre(shape))
      const rect = mixRect(mixRect(welcomeRing(shape, true, BACK_ZOOM[shape]), cameBackCapsule(shape), toPill), square, toEnd)
      const fill = toEnd > 0 ? mixColor(color.surface, color.tint, (toEnd - 0.25) / 0.5) : mixColor(color.tint, color.surface, toPill / 0.5)
      out.push(<Box key="came-back" rect={rect} fill={fill} shadow={liftShadow(toPill * (1 - toEnd))} />)
    }
  }

  return <div style={{ position: 'absolute', inset: 0 }}>{out}</div>
}

/**
 * Sam's avatar, drawn over the scenes (it rides across the board card as the board forms): at 16.95 s the welcome's
 * check ring becomes his avatar; it rides to his board row (18.35 s) and to his row on its own (19.95 s).
 */
export function Carried() {
  const t = useT()
  const shape = useShape()
  const toFocus = sp(t, 16.95)
  const toBoard = sp(t, 18.35)
  const toRow = sp(t, 19.95)
  if (t < 16.95 || toRow >= LANDED) return null
  const rect = mixRect(
    mixRect(mixRect(welcomeRing(shape, false, WELCOME_ZOOM[shape]), focusAvatar(shape), toFocus), boardAvatar(shape), toBoard),
    rowAvatar(shape),
    toRow,
  )
  return (
    <Box rect={rect} fill={mixColor(color.tint, color.tintFill, toFocus / 0.5)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <svg width={rect.w * 0.5} height={rect.w * 0.5} viewBox="0 0 24 24" style={{ position: 'absolute', opacity: handoff(toFocus).out }}>
        <path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke={color.onTint} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ color: color.tint, fontWeight: 600, fontSize: rect.w * 0.38, letterSpacing: '0.01em', opacity: handoff(toFocus).in }}>{member.initials}</span>
    </Box>
  )
}

/** One word landing on the smooth spring: up 0.3 em and in. */
function Landing({ w, t, style }: { w: Word; t: number; style?: CSSProperties }) {
  const p = sp(t, w.at - 0.06)
  return (
    <span
      style={{
        display: 'inline-block',
        opacity: clamp01(p * 1.4),
        transform: `translateY(${lerp(0.3, 0, p)}em)`,
        fontWeight: w.stress ? weight.display + 100 : undefined,
        ...style,
      }}
    >
      {w.word}
    </span>
  )
}

function Words({ list, t, gap = '0.26em' }: { list: Word[]; t: number; gap?: string }) {
  return (
    <>
      {list.map((w, i) => (
        <span key={i} style={{ whiteSpace: 'nowrap' }}>
          <Landing w={w} t={t} />
          {i < list.length - 1 && <span style={{ display: 'inline-block', width: gap }} />}
        </span>
      ))}
    </>
  )
}

/** 0:00-0:03. The question lands word by word; a row of January's new members thins out, 6 of 10. */
const FACES = ['JM', 'AK', 'SC', 'RT', 'LP', 'NB', 'EW', 'DH', 'KO', 'MV']
const LEAVERS = [1, 3, 4, 6, 7, 9]

/** Where the question's words rest once they lift (1.35 s), up from the picture's centre: the figure's card forms there. */
const QUESTION_LIFT = { wide: -120, tall: -230 } as const

export function Question() {
  const t = useT()
  const shape = useShape()
  if (t > 3.1) return null
  const wide = shape === 'wide'
  // Shot 2 at 1.35 s: the words lift and the faces come up beneath them.
  const lift = sp(t, 1.35)
  // 2.75 s: a card forms around the words and becomes the 6-in-10 figure (Figures); the words leave as it forms.
  const gone = handoff(sp(t, 2.75)).out
  const size = wide ? 112 : 116
  return (
    <Stage>
      <div
        style={{
          fontSize: size,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.08,
          textAlign: 'center',
          maxWidth: wide ? 1500 : 940,
          textWrap: 'balance',
          transform: `translateY(${lerp(0, QUESTION_LIFT[shape], lift)}px) scale(${lerp(1, 0.86, lift)})`,
          opacity: gone,
        }}
      >
        <Words list={words('question')} t={t} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: wide ? 560 : 860,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: wide ? 24 : 28,
          width: wide ? 1400 : 780,
          opacity: lift * gone,
          transform: `translateY(${lerp(80, 0, lift)}px)`,
        }}
      >
        {FACES.map((f, i) => {
          const k = LEAVERS.indexOf(i)
          const left = k < 0 ? 0 : sp(t, 1.9 + k * 0.13)
          return (
            <Avatar
              key={f}
              initials={f}
              size={wide ? 112 : 128}
              style={{ opacity: 1 - left * 0.88, transform: `scale(${lerp(1, 0.82, left)})`, filter: `saturate(${1 - left})` }}
            />
          )
        })}
      </div>
    </Stage>
  )
}

/** The figures' source, on screen while the figure is. */
function Source({ children, o }: { children: ReactNode; o: number }) {
  const wide = useShape() === 'wide'
  return (
    <div style={{ fontSize: wide ? 30 : 34, color: color.textSoft, fontWeight: weight.body, opacity: o, marginTop: wide ? 36 : 48 }}>
      Source: {children}
    </div>
  )
}

/** A capsule card on the surface: the shape the scenes 2 and 3 morph through. */
function Capsule({ w, h, children, style }: { w: number; h: number; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: Math.min(h / 2, 96),
        background: color.surface,
        boxShadow: shadow.lift,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flex: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/**
 * 0:03-0:12. One card carries the figures: it forms around the question's words and becomes the 6-in-10 pill, its ring
 * filling; it reshapes into a week with three days filled ("three times a week"); then into the two renewal bars,
 * counting up, 78% in ink and 59% in grey. At 12.1 s it shrinks into the mark's square (Morphs).
 */
export function Figures() {
  const t = useT()
  const shape = useShape()
  const wide = shape === 'wide'
  if (t < 2.7 || t > 12.4) return null
  const inP = sp(t, 2.75)
  const toWeek = sp(t, 5.5)
  const toBars = sp(t, 7.75)
  // The card grows to hold the second renewal row from 10.2 s (no empty half while it waits); the row itself fades in
  // as its count starts (10.4 s), so "0%" never rests beside the source.
  const grow = sp(t, 10.2)
  // 59% rests from 11.2 s; at 12.1 s Morphs takes the card on into the mark's square, and its content leaves.
  const out = sp(t, 12.1)
  const leaving = t >= 12.1
  // The morphing box: the question's block, then the pill, then the week strip, then the bars' card.
  const qW = wide ? 1300 : 900
  const qH = wide ? 260 : 420
  const pillW = wide ? 1500 : 900
  const pillH = wide ? 400 : 640
  const weekW = wide ? 1240 : 940
  const weekH = wide ? 300 : 300
  const barsW = wide ? 1480 : 960
  const barsH = wide ? lerp(340, 520, grow) : lerp(400, 620, grow)
  let w = lerp(qW, pillW, inP)
  let h = lerp(qH, pillH, inP)
  w = lerp(w, weekW, toWeek)
  h = lerp(h, weekH, toWeek)
  w = lerp(w, barsW, toBars)
  h = lerp(h, barsH, toBars)
  // The card starts where the lifted words rest (its centre sits half the source line above the picture's centre).
  const startY = QUESTION_LIFT[shape] + (wide ? 35 : 45)
  // The figure reads 6 in 10 from its first frame; only the ring fills, one segment per tick, over 3 frames.
  const sixFill = countTicks(counts.sixInTen).reduce((sum, tick) => sum + clamp01((t - tick) / 0.1), 0)
  // Each content hands over inside the card while the card reshapes: out in about 2 frames, in as it settles.
  const pillO = handoff(inP).in * handoff(toWeek).out
  const weekO = handoff(toWeek).in * handoff(toBars).out
  const barsO = handoff(toBars).in * handoff(out).out
  return (
    <Stage>
      <Capsule
        w={w}
        h={h}
        style={{
          transform: `translateY(${lerp(startY, 0, inP)}px)`,
          background: leaving ? 'transparent' : mixColor(color.bg, color.surface, inP / 0.6),
          boxShadow: leaving ? 'none' : liftShadow(inP),
        }}
      >
        {pillO > 0.01 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: wide ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: wide ? 64 : 40,
              opacity: pillO,
            }}
          >
            <div style={{ position: 'relative' }}>
              <SegmentRing n={10} filled={sixFill} size={wide ? 280 : 300} stroke={wide ? 32 : 34} on={color.text} off={color.line} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: wide ? 'flex-start' : 'center' }}>
              <div style={{ fontSize: wide ? 168 : 156, fontWeight: weight.display, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {figures.sixInTen.figure}
              </div>
              <div style={{ fontSize: wide ? 52 : 48, fontWeight: weight.body, color: color.textSoft, marginTop: 14 }}>{figures.sixInTen.label}</div>
            </div>
          </div>
        )}
        {weekO > 0.01 && <Week o={weekO} t={t} />}
        {barsO > 0.01 && <Bars o={barsO} t={t} grow={grow} />}
      </Capsule>
      <div style={{ position: 'relative', height: wide ? 70 : 90 }}>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
          <Source o={handoff(inP).in * handoff(toWeek).out}>{figures.sixInTen.source}</Source>
        </div>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
          <Source o={handoff(toWeek).in * handoff(out).out}>{figures.renewed.source}</Source>
        </div>
      </div>
    </Stage>
  )
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function Week({ o, t }: { o: number; t: number }) {
  const wide = useShape() === 'wide'
  const cell = wide ? 112 : 96
  const visited = [0, 2, 4]
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: wide ? 28 : 22, opacity: o }}>
      {DAYS.map((d, i) => {
        const k = visited.indexOf(i)
        const p = k < 0 ? 0 : sp(t, at.weekDays[k]!)
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: cell,
                height: cell,
                borderRadius: cell * 0.24,
                boxSizing: 'border-box',
                border: `${wide ? 5 : 4}px solid ${p > 0.02 ? color.text : color.markSome}`,
                background: p > 0.02 ? color.text : 'transparent',
                transform: `scale(${p > 0.02 ? lerp(0.7, 1, p) : 1})`,
              }}
            />
            <div style={{ fontSize: wide ? 34 : 32, fontWeight: 600, color: color.textSoft }}>{d}</div>
          </div>
        )
      })}
    </div>
  )
}

function Bar({ value, label, ink, o, t, start }: { value: typeof counts.stay; label: string; ink: string; o: number; t: number; start: number }) {
  const wide = useShape() === 'wide'
  const n = countAt(value, t)
  // 16:9: 380 label + 40 + 640 track + 40 + 200 figure = 1300 px, inside the 1480 px card with 90 px each side.
  const trackW = wide ? 640 : 820
  const trackH = wide ? 76 : 72
  const appear = sp(t, start)
  return (
    <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', gap: wide ? 40 : 18, opacity: o * appear, transform: `translateY(${lerp(24, 0, appear)}px)` }}>
      <div style={{ fontSize: wide ? 40 : 44, fontWeight: 600, width: wide ? 380 : undefined, color: color.text }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: wide ? 0 : 0 }}>
        <div style={{ width: trackW, height: trackH, borderRadius: trackH / 2, background: color.bg, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${n}%`, borderRadius: trackH / 2, background: ink }} />
        </div>
      </div>
      <div
        style={{
          position: wide ? 'relative' : 'absolute',
          right: wide ? undefined : 70,
          marginTop: wide ? 0 : -14,
          fontSize: wide ? 96 : 92,
          fontWeight: weight.display,
          color: ink,
          letterSpacing: '-0.03em',
          width: wide ? 200 : undefined,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {n}%
      </div>
    </div>
  )
}

/** One renewal row's height in each shape (16:9: the 96 px figure; 9:16: the label over the track). */
const BAR_ROW = { wide: 96, tall: 143 }

function Bars({ o, t, grow }: { o: number; t: number; grow: number }) {
  const wide = useShape() === 'wide'
  const gap = wide ? 56 : 80
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap, opacity: o }}>
      <div style={{ fontSize: wide ? 44 : 50, fontWeight: 600, color: color.textSoft, alignSelf: wide ? 'center' : 'center' }}>Renewed their membership</div>
      <div style={{ position: 'relative' }}>
        <Bar value={counts.stay} label={figures.renewed.stayLabel} ink={color.text} o={1} t={t} start={7.85} />
      </div>
      <div style={{ position: 'relative', height: lerp(0, wide ? BAR_ROW.wide : BAR_ROW.tall, grow), marginTop: lerp(-gap, 0, grow) }}>
        <Bar value={counts.under} label={figures.renewed.underLabel} ink={color.grey} o={1} t={t} start={counts.under.start} />
      </div>
    </div>
  )
}

/**
 * 0:12-0:14. The Quarter mark sweeps in; "Regulars" fades in beside it as it is said. Its tinted square is the figures
 * card, arrived (Morphs), and at 13.85 s it opens into the kiosk's phone while the quarter and the name leave.
 */
export function Mark() {
  const t = useT()
  const wide = useShape() === 'wide'
  if (t < 12.15 || t > 14.2) return null
  const sweep = sp(t, 12.2)
  const name = sp(t, 12.82)
  const out = sp(t, 13.85, 'quick')
  const size = wide ? 280 : 210
  return (
    <Stage style={{ flexDirection: 'row', gap: size * 0.36, opacity: handoff(out).out }}>
      <div style={{ margin: `0 ${(-size * 4.4) / 24}px` }}>
        <QuarterMark size={size} sweep={sweep} square={0} />
      </div>
      <div style={{ fontSize: size * 0.75, fontWeight: weight.heading, letterSpacing: '-0.01em', lineHeight: 1, opacity: name, transform: `translateX(${lerp(-24, 0, name)}px)` }}>
        {endCard.name}
      </div>
    </Stage>
  )
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '']
const TAPPED = ['7', '4', '2']

/** The four slots of the typed number, inside the kiosk's screen (`w` wide): the title, the choice, then the slots. */
function slotRect(w: number, i: number): Rect {
  const top = w * (0.14 + 0.1 * 1.2 + 0.05 + 0.1128 + 0.07)
  return { x: w / 2 - w * 0.345 + i * w * 0.18 + w * 0.075, y: top + w * 0.095, w: w * 0.15, h: w * 0.19, r: w * 0.04 }
}

function Keypad({ t, w }: { t: number; w: number }) {
  const typed = ['0', ...TAPPED.filter((_, i) => t >= at.keyTaps[i]!)]
  const key = w * 0.21
  // From the welcome (15.2 s) the slots are the shapes that fold into the check ring (SlotsToRing).
  const slotsGone = t >= at.welcome
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: w * 0.14 }}>
      <div style={{ fontSize: w * 0.1, fontWeight: weight.display, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Check in</div>
      <div style={{ display: 'flex', marginTop: w * 0.05, background: color.highlightPress, borderRadius: w, padding: w * 0.008 }}>
        {['Phone Number', 'Name'].map((label, i) => (
          <div
            key={label}
            style={{
              fontSize: w * 0.044,
              lineHeight: 1.2,
              fontWeight: 600,
              padding: `${w * 0.022}px ${w * 0.05}px`,
              borderRadius: w,
              background: i === 0 ? color.surface : 'transparent',
              boxShadow: i === 0 ? shadow.lift : undefined,
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: w * 0.03, marginTop: w * 0.07, opacity: slotsGone ? 0 : 1 }}>
        {[0, 1, 2, 3].map((i) => {
          const d = typed[i]
          const p = i === 0 ? 1 : sp(t, at.keyTaps[i - 1]!, 'quick')
          return (
            <div
              key={i}
              style={{
                width: w * 0.15,
                height: w * 0.19,
                borderRadius: w * 0.04,
                background: color.surface,
                boxSizing: 'border-box',
                border: `${Math.max(2, w * 0.006)}px solid ${d !== undefined && i === typed.length - 1 ? color.tint : color.line}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: w * 0.1,
                fontWeight: 600,
              }}
            >
              <span style={{ opacity: d === undefined ? 0 : p, transform: `scale(${lerp(0.6, 1, p)})` }}>{d}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${key}px)`, gap: w * 0.05, marginTop: w * 0.09 }}>
        {KEYS.map((k, i) => {
          const tap = TAPPED.indexOf(k)
          const since = tap < 0 ? -1 : t - at.keyTaps[tap]!
          const pressed = since >= 0 && since < 0.14
          const release = since >= 0.14 ? sp(t, at.keyTaps[tap]! + 0.14, 'quick') : 0
          const s = pressed ? 0.94 : since >= 0.14 ? lerp(0.94, 1, release) : 1
          return (
            <div
              key={i}
              style={{
                width: key,
                height: key,
                borderRadius: key / 2,
                background: k === '' ? 'transparent' : pressed ? color.tintFillPress : color.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: w * 0.09,
                fontWeight: weight.body,
                transform: `scale(${s})`,
              }}
            >
              {k}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 15.2 s: the four typed slots fold together into the welcome's check ring; the ring's own bouncy entrance takes over. */
function SlotsToRing({ t, w, h }: { t: number; w: number; h: number }) {
  const fold = sp(t, at.welcome)
  const ringP = sp(t, at.check, 'bounce')
  if (t < at.welcome || clamp01(ringP * 2) >= 1) return null
  const d = w * 0.4 * lerp(0.6, 1, ringP)
  const ring: Rect = { x: w / 2, y: welcomeRingY(w, h, false), w: d, h: d, r: d / 2 }
  const typed = ['0', ...TAPPED]
  return (
    <>
      {typed.map((digit, i) => {
        const rect = mixRect(slotRect(w, i), ring, fold)
        return (
          <Box
            key={i}
            rect={rect}
            fill={mixColor(color.surface, color.tint, fold / 0.5)}
            style={{
              boxSizing: 'border-box',
              border: `${Math.max(2, w * 0.006)}px solid ${mixColor(i === 3 ? color.tint : 'rgba(29, 29, 31, 0.12)', 'rgba(84, 68, 228, 0)', fold / 0.4)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: w * 0.1,
              fontWeight: 600,
            }}
          >
            <span style={{ opacity: handoff(fold).out }}>{digit}</span>
          </Box>
        )
      })}
    </>
  )
}

function Welcome({ t, back, w, title: gate = 1 }: { t: number; back: boolean; w: number; title?: number }) {
  const checkAt = back ? at.checkBack : at.check
  const p = sp(t, checkAt, back ? 'smooth' : 'bounce')
  const draw = sp(t, checkAt + 0.08, 'smooth')
  const title = sp(t, (back ? at.welcomeBack : at.welcome) + 0.05) * gate
  const week = sp(t, back ? 99 : 16.05)
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <CheckInRing size={w * 0.4} p={p} draw={draw} />
      <div style={{ fontSize: w * 0.105, fontWeight: weight.display, letterSpacing: '-0.02em', marginTop: w * 0.09, opacity: title, transform: `translateY(${lerp(20, 0, title)}px)`, textAlign: 'center', lineHeight: 1.1, padding: `0 ${w * 0.06}px` }}>
        {back ? `Welcome back, ${member.first}.` : `Welcome, ${member.first}.`}
      </div>
      {!back && (
        <div style={{ display: 'flex', alignItems: 'center', gap: w * 0.04, marginTop: w * 0.1, opacity: week, transform: `translateY(${lerp(16, 0, week)}px)` }}>
          <SegmentRing n={3} filled={week >= 0.5 ? 1 : 0} size={w * 0.2} stroke={w * 0.035} on={color.tint} off={color.line} />
          <div style={{ fontSize: w * 0.06, fontWeight: 600 }}>
            1 of 3
            <div style={{ fontSize: w * 0.048, fontWeight: weight.body, color: color.textSoft }}>this week</div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 0:14-0:17. The kiosk on a phone (the mark's square, opened): three key taps, then "Welcome, Sam." with the check on
 * the bouncy spring; the typed slots fold into its ring.
 */
export function CheckIn() {
  const t = useT()
  const shape = useShape()
  const ph = usePhone()
  if (t < 13.85 || t > 17.3) return null
  // The square becomes this phone (Morphs); its frame is the phone's own once it lands.
  const opened = sp(t, 13.85)
  const framed = opened >= LANDED ? 1 : 0
  const out = sp(t, 16.95, 'quick')
  const toWelcome = sp(t, at.welcome)
  // The welcome is a closer shot: the camera pushes in on the phone, and the phone's frame goes as it pushes, so the
  // welcome stands on the ground at full size with no edge for the stage to cut.
  const push = sp(t, at.welcome - 0.05)
  return (
    <Stage style={{ opacity: handoff(out).out }}>
      <Phone width={ph.w} height={ph.h} bare={Math.max(1 - framed, clamp01(push * 2.5))} style={{ transform: `scale(${lerp(1, WELCOME_ZOOM[shape], push)})` }}>
        <div style={{ opacity: handoff(opened).in * handoff(toWelcome).out }}>
          <Keypad t={t} w={ph.w} />
        </div>
        <SlotsToRing t={t} w={ph.w} h={ph.h} />
        <Welcome t={t} back={false} w={ph.w} title={handoff(toWelcome).in} />
      </Phone>
    </Stage>
  )
}

const SAM_WEEKS = [3, 3, 2, 1, 0]

function Cell({ filled, size, p }: { filled: boolean; size: number; p: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        boxSizing: 'border-box',
        border: `${Math.max(2, size * 0.05)}px solid ${filled ? color.text : color.markSome}`,
        background: filled ? color.text : 'transparent',
        opacity: p,
        transform: `scale(${lerp(0.6, 1, p)})`,
      }}
    />
  )
}

type Row = { initials: string; name: string; status: Status; word: string; weeks: number[] }
const ROWS: Row[] = [
  { initials: 'AR', name: 'Ava Reid', status: 'on', word: 'On the line', weeks: [3, 3, 3, 4, 3] },
  { initials: member.initials, name: member.name, status: 'on', word: 'On the line', weeks: SAM_WEEKS },
  { initials: 'LP', name: 'Leo Park', status: 'below', word: 'Below the line', weeks: [2, 1, 2, 2, 1] },
]

function StatusWord({ status, word, size }: { status: Status; word: string; size: number }) {
  const red = status === 'slipping'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.4, fontSize: size, lineHeight: 1.2, fontWeight: 600, color: red ? color.attentionText : color.text, whiteSpace: 'nowrap' }}>
      <StatusMark status={status} size={size * 0.75} fill={red ? color.attention : color.text} />
      {word}
    </div>
  )
}

function MiniWeeks({ weeks, size }: { weeks: number[]; size: number }) {
  return (
    <div style={{ display: 'flex', gap: size * 0.35 }}>
      {weeks.map((n, i) => (
        <div key={i} style={{ display: 'flex', gap: size * 0.12 }}>
          {[0, 1, 2].map((j) => (
            <Cell key={j} filled={j < n} size={size} p={1} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** A block centred across the picture, `dy` px from its middle. */
function Centred({ dy, children, style }: { dy: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', display: 'flex', justifyContent: 'center', transform: `translateY(calc(-50% + ${dy}px))`, ...style }}>
      {children}
    </div>
  )
}

/**
 * 0:17-0:20. The welcome's ring becomes Sam's avatar (Morphs); his weeks thin, 3, 3, 2, 1, 0; the board forms around his
 * row as his avatar takes its place there, and his row turns Slipping.
 */
export function Slipping() {
  const t = useT()
  const shape = useShape()
  const wide = shape === 'wide'
  if (t < 16.9 || t > 20.3) return null
  const toFocus = sp(t, 16.95)
  const toBoard = sp(t, 18.35)
  // 19.95 s: the board card closes onto Sam's row (Morphs) and the other rows leave.
  const toRow = sp(t, 19.95)
  const closing = t >= 19.95
  const slip = sp(t, at.slipping)
  const cell = wide ? 72 : 52
  const f = FOCUS[shape]
  const b = BOARD[shape]
  const focusO = handoff(toBoard).out
  return (
    <Stage>
      {toBoard < 0.99 && t >= 16.95 && (
        <>
          <Centred dy={f.nameY} style={{ opacity: clamp01((toFocus - 0.9) / 0.1) * (1 - clamp01(toBoard / 0.08)) }}>
            <div style={{ fontSize: wide ? 64 : 68, fontWeight: weight.display, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{member.name}</div>
          </Centred>
          <Centred dy={f.weeksY} style={{ opacity: handoff(toFocus).in * focusO }}>
            <div style={{ display: 'flex', gap: wide ? 48 : 28 }}>
              {SAM_WEEKS.map((n, i) => {
                const p = sp(t, at.weeks[i]!)
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: cell * 0.2 }}>
                    <div style={{ fontSize: 30, fontWeight: 600, color: color.textSoft, marginTop: 12 }}>Week {i + 1}</div>
                    {[0, 1, 2].map((j) => (
                      <Cell key={j} filled={j < n} size={cell * (wide ? 1.2 : 1.45)} p={p} />
                    ))}
                  </div>
                )
              })}
            </div>
          </Centred>
        </>
      )}
      {toBoard > 0.01 && (
        <div
          style={{
            width: b.w,
            boxSizing: 'border-box',
            background: closing ? 'transparent' : color.surface,
            borderRadius: 40,
            boxShadow: closing ? 'none' : liftShadow(handoff(toBoard).in),
            padding: `${b.pad}px 0`,
          }}
        >
          {ROWS.map((r, i) => {
            const sam = r.name === member.name
            const status: Status = sam && slip > 0.5 ? 'slipping' : r.status
            const word = sam && slip > 0.5 ? 'Slipping' : r.word
            return (
              <div
                key={r.name}
                style={{
                  display: 'flex',
                  flexWrap: wide ? 'nowrap' : 'wrap',
                  alignItems: 'center',
                  alignContent: 'flex-start',
                  boxSizing: 'border-box',
                  height: b.row + (i > 0 ? 2 : 0),
                  gap: wide ? 32 : 24,
                  rowGap: 20,
                  padding: `34px ${b.padX}px`,
                  borderTop: i > 0 ? `2px solid ${closing ? 'transparent' : mixColor('rgba(29, 29, 31, 0)', color.line, handoff(toBoard).in)}` : undefined,
                  opacity: handoff(toBoard).in * handoff(toRow).out,
                }}
              >
                {/* Sam's avatar is the one Morphs carries here. */}
                <Avatar initials={r.initials} size={b.avatar} style={{ opacity: sam ? 0 : 1 }} />
                <div style={{ fontSize: 46, fontWeight: 600, flex: 1, opacity: sam ? clamp01((toBoard - 0.97) / 0.03) : 1 }}>{r.name}</div>
                <div style={{ order: wide ? 0 : 3, width: wide ? undefined : '100%', paddingLeft: wide ? 0 : 116 }}>
                  <MiniWeeks weeks={r.weeks} size={wide ? 22 : 24} />
                </div>
                <div style={{ width: wide ? 330 : undefined, display: 'flex', justifyContent: 'flex-end' }}>
                  <StatusWord status={status} word={word} size={38} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Stage>
  )
}

/** The tinted capsule (Button's tinted variant): the tint's words on its pale fill. */
function Tinted({ children, size, pressed, style }: { children: ReactNode; size: number; pressed?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size * 0.4,
        background: pressed ? color.tintFillPress : color.tintFill,
        color: color.tint,
        fontSize: size,
        lineHeight: 1.2,
        fontWeight: 600,
        padding: `${size * 0.5}px ${size * 0.9}px`,
        borderRadius: size * 2,
        transform: pressed ? 'scale(0.97)' : undefined,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** The Nudge capsule's label: the chat icon and the word. */
function NudgeLabel({ size }: { size: number }) {
  return (
    <>
      <Icon d={icons.chatCircle} size={size * 1.1} fill={color.tint} />
      Nudge
    </>
  )
}

function SamRow({ t, o, landed, nudged }: { t: number; o: number; landed: boolean; nudged: number }) {
  const shape = useShape()
  const wide = shape === 'wide'
  const r = ROW[shape]
  const card = rowCard(shape)
  const pill = nudgePill(shape)
  const pressed = t >= at.nudgeTap && t < at.nudgeTap + 0.14
  // From 20.6 s the Nudge capsule is the sheet (it grows out of it and folds back into its place).
  const pillShown = t < at.sheet
  return (
    <div
      style={{
        width: card.w,
        height: card.h,
        boxSizing: 'border-box',
        background: landed ? color.surface : 'transparent',
        borderRadius: 40,
        boxShadow: landed ? shadow.lift : 'none',
        padding: `${r.pad}px ${r.padX}px`,
        display: 'flex',
        flexWrap: wide ? 'nowrap' : 'wrap',
        alignItems: 'center',
        alignContent: 'flex-start',
        gap: 32,
        rowGap: 36,
      }}
    >
      <Avatar initials={member.initials} size={r.avatar} style={{ opacity: landed ? o : 0 }} />
      <div style={{ flex: 1, opacity: o }}>
        <div style={{ fontSize: r.name, lineHeight: 1.2, fontWeight: 600 }}>{member.name}</div>
        <div style={{ marginTop: 10 }}>
          <StatusWord status="slipping" word="Slipping" size={r.status} />
        </div>
      </div>
      <div style={{ position: 'relative', width: wide ? 330 : '100%', height: 120, display: 'flex', justifyContent: wide ? 'flex-end' : 'center', alignItems: 'center', opacity: o }}>
        {pillShown && (
          <div style={{ position: 'absolute' }}>
            <Tinted size={r.nudge} pressed={pressed} style={{ width: pill.w, height: pill.h, padding: 0, boxSizing: 'border-box' }}>
              <NudgeLabel size={r.nudge} />
            </Tinted>
          </div>
        )}
        <div style={{ position: 'absolute', opacity: handoff(nudged).in, display: 'flex', alignItems: 'center', gap: 16, fontSize: r.nudge, fontWeight: 600, color: color.text, transform: `scale(${lerp(0.9, 1, nudged)})` }}>
          <Icon d={icons.check} size={r.nudge * 1.05} fill={color.text} />
          Nudged
        </div>
      </div>
    </div>
  )
}

/** The sheet: it grows out of the Nudge capsule (20.6 s) and folds back into its place as the row reads Nudged. */
function Sheet({ t }: { t: number }) {
  const shape = useShape()
  const s = SHEET[shape]
  const opening = sp(t, at.sheet)
  // Sheets leave on the quick spring.
  const leave = sp(t, at.nudged - 0.05, 'quick')
  const rise = opening * (1 - leave)
  if (rise <= 0.001 && t > at.sheet) return null
  if (t < at.sheet) return null
  const pill = nudgePill(shape)
  const sheet = sheetRect(shape)
  const rect = mixRect(pill, sheet, rise)
  const fill = mixColor(color.tintFill, color.surface, rise / 0.6)
  // Folding back, the capsule it became dissolves into the slot in its second half, where the row then reads Nudged.
  const fade = 1 - clamp01((leave - 0.5) / 0.5)
  const pressed = t >= at.textMessageTap && t < at.textMessageTap + 0.14
  const content = handoff(opening).in * (1 - clamp01(leave / 0.25))
  const scrim = rise * 0.6
  return (
    <div style={{ position: 'absolute', inset: 0, background: `rgba(242, 242, 247, ${scrim})`, overflow: 'hidden', fontFamily: font, color: color.text }}>
      <Box rect={rect} fill={fill} shadow={modalShadow(rise)} style={{ opacity: fade }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: ROW[shape].nudge * 0.4, color: color.tint, fontSize: ROW[shape].nudge, lineHeight: 1.2, fontWeight: 600, opacity: handoff(opening).out }}>
          <NudgeLabel size={ROW[shape].nudge} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: sheet.w,
            boxSizing: 'border-box',
            padding: `${s.padTop}px ${s.padX}px ${s.padBottom}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: s.gap,
            opacity: content,
          }}
        >
          <div style={{ fontSize: s.title, lineHeight: 1.2, fontWeight: weight.display, letterSpacing: '-0.02em' }}>Nudge {member.first}</div>
          <div style={{ fontSize: s.text, color: color.textSoft, lineHeight: 1.35, marginBottom: 8 }}>{nudgeText}</div>
          <Tinted size={s.button} pressed={pressed}>Text Message</Tinted>
          <Tinted size={s.button}>WhatsApp</Tinted>
          <Tinted size={s.button}>Copy Message</Tinted>
        </div>
      </Box>
    </div>
  )
}

/**
 * 0:20-0:23. The board card closes onto Sam's row; one tap on the Nudge; the sheet grows out of it with Text Message
 * and folds back as the row reads Nudged; then the row card becomes Sam's phone (Morphs, and Back's ThreadToWelcome).
 */
export function Nudge() {
  const t = useT()
  if (t < 19.9 || t > 22.6) return null
  const toRow = sp(t, 19.95)
  const toPhone = sp(t, 21.75)
  const landed = toRow >= LANDED && t < 21.75
  const nudged = sp(t, at.nudged + 0.08)
  return (
    <>
      <Stage>
        <SamRow t={t} o={handoff(toRow).in * handoff(toPhone).out} landed={landed} nudged={nudged} />
      </Stage>
      <Sheet t={t} />
    </>
  )
}

function Thread({ t, w, hideBubble }: { t: number; w: number; hideBubble: boolean }) {
  const typing = sp(t, at.typing) * (1 - sp(t, at.bubble - 0.05, 'quick'))
  const bubble = sp(t, at.bubble)
  // The typing dots breathe gently, well under three a second.
  const dot = (i: number) => 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((t - at.typing) * 2 * Math.PI * 1.6 - i * 0.9))
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: w * 0.1, paddingBottom: w * 0.04, borderBottom: `2px solid ${color.line}`, background: color.surface }}>
        <Avatar initials="M" size={w * 0.16} />
        <div style={{ fontSize: w * 0.055, fontWeight: 600, marginTop: w * 0.02 }}>Coach {member.coach}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: w * 0.06, paddingBottom: w * 0.2 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, opacity: typing, display: 'flex', gap: w * 0.02, padding: `${w * 0.045}px ${w * 0.055}px`, borderRadius: w * 0.07, background: color.surface, boxShadow: shadow.lift }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: w * 0.035, height: w * 0.035, borderRadius: w, background: color.textSoft, opacity: dot(i) }} />
            ))}
          </div>
          <div
            style={{
              opacity: hideBubble ? 0 : bubble,
              transform: `translateY(${lerp(30, 0, bubble)}px) scale(${lerp(0.92, 1, bubble)})`,
              transformOrigin: 'bottom left',
              width: w * 0.8,
              boxSizing: 'border-box',
              fontSize: w * 0.068,
              lineHeight: 1.3,
              padding: `${w * 0.04}px ${w * 0.05}px`,
              borderRadius: w * 0.06,
              background: color.surface,
              boxShadow: shadow.lift,
            }}
          >
            {nudgeText}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Coach Mike's bubble on Sam's phone, at rest, inside the screen (`w` x `h`). */
function bubbleRect(w: number, h: number): Rect {
  const lines = lineCount(nudgeText, w * 0.068, 400, w * 0.7)
  const bh = lines * w * 0.068 * 1.3 + w * 0.08
  return { x: w * 0.06 + w * 0.4, y: h - w * 0.2 - bh / 2, w: w * 0.8, h: bh, r: w * 0.06 }
}

/**
 * 21.75-24.6 s. One phone: Sam's, with Coach Mike's thread (the row card became it); at 23.0 s it becomes the kiosk's
 * (in 16:9 it pushes in and loses its frame) and the sent bubble folds into the welcome-back check ring.
 */
function ThreadToWelcome({ t }: { t: number }) {
  const shape = useShape()
  const wide = shape === 'wide'
  const { w, h } = phoneSize(shape)
  const k = sp(t, 21.75)
  const b = sp(t, 23.0)
  const leave = sp(t, at.cameBackPill, 'quick')
  const zt = threadZoom(shape, t)
  const scale = lerp(zt, BACK_ZOOM[shape], b)
  const dy = lerp(wide ? 0 : 0.3 * h * (1 - zt), 0, b)
  const framed = k >= LANDED ? 1 : 0
  const keep = framed * (wide ? 1 - clamp01(b * 2.5) : 1)
  const ringP = sp(t, at.checkBack)
  const folding = t >= 23.0 && clamp01(ringP * 2) < 1
  const d = w * 0.4 * lerp(0.6, 1, ringP)
  const ring: Rect = { x: w / 2, y: welcomeRingY(w, h, true), w: d, h: d, r: d / 2 }
  const bubble = bubbleRect(w, h)
  const rect = mixRect(bubble, ring, b)
  return (
    <Stage style={{ opacity: handoff(leave).out, overflow: 'visible' }}>
      <Phone width={w} height={h} bare={1 - keep} style={{ transform: `translateY(${dy}px) scale(${scale})` }}>
        <div style={{ opacity: handoff(k).in * handoff(b).out }}>
          <Thread t={t} w={w} hideBubble={t >= 23.0} />
        </div>
        {folding && (
          <Box rect={rect} fill={mixColor(color.surface, color.tint, b / 0.6)} shadow={liftShadow(1 - b)}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: bubble.w, boxSizing: 'border-box', padding: `${w * 0.04}px ${w * 0.05}px`, fontSize: w * 0.068, lineHeight: 1.3, opacity: handoff(b).out }}>
              {nudgeText}
            </div>
          </Box>
        )}
        {t >= 23.0 && <Welcome t={t} back w={w} title={handoff(b).in} />}
      </Phone>
    </Stage>
  )
}

/**
 * 0:23-0:26. Sam's phone becomes the kiosk, "Welcome back, Sam."; the check ring opens into the Came back capsule
 * (Morphs), counting 8 to 9, tagged Sample data; at 25.95 s the capsule shrinks into the end card's square.
 */
export function Back() {
  const t = useT()
  const shape = useShape()
  const wide = shape === 'wide'
  if (t < 21.7 || t > 26.3) return null
  const toPill = sp(t, at.cameBackPill)
  const toEnd = sp(t, 25.95)
  const landed = toPill >= LANDED && t < 25.95
  const n = countAt(counts.cameBack, t)
  const bump = t >= counts.cameBack.start ? sp(t, counts.cameBack.start) : 0
  const o = handoff(toPill).in * handoff(toEnd).out
  const capsule = cameBackCapsule(shape)
  return (
    <>
      {t < 24.7 && <ThreadToWelcome t={t} />}
      {t >= at.cameBackPill && (
        <Stage full>
          <Capsule
            w={capsule.w}
            h={capsule.h}
            style={{ gap: wide ? 64 : 48, justifyContent: 'center', background: landed ? color.surface : 'transparent', boxShadow: landed ? shadow.lift : 'none' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start', opacity: o }}>
              <div style={{ fontSize: wide ? 72 : 64, fontWeight: 600 }}>Came back</div>
              <Tag size={wide ? 38 : 36}>Sample data</Tag>
            </div>
            <div style={{ fontSize: wide ? 210 : 190, fontWeight: weight.display, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: color.text, opacity: o, transform: `scale(${1 + 0.06 * Math.sin(Math.PI * clamp01(bump))})` }}>
              {n}
            </div>
          </Capsule>
          <div style={{ fontSize: wide ? 34 : 38, lineHeight: 1.2, color: color.textSoft, fontWeight: weight.body, marginTop: 36, opacity: o }}>Nudged members who came back</div>
        </Stage>
      )}
    </>
  )
}

/**
 * 0:26-0:30. The mark (its square is the Came back capsule, arrived), "Regulars", the tagline as it is said, then
 * "Try the Demo here."; still from 29.4 s for the loop.
 */
export function EndCard() {
  const t = useT()
  const shape = useShape()
  if (t < 25.95) return null
  const e = END[shape]
  // The quarter and "Regulars" come in once the shrinking capsule (Morphs, from 25.95 s) is no wider than the mark and
  // clear of the name: 9 frames into its smooth spring. Earlier, the capsule still spans the start of "Regulars".
  const inP = sp(t, 25.95 + 0.3)
  const square = sp(t, 25.95) >= LANDED ? 1 : 0
  const tagline = words('end-card').slice(1)
  const demo = sp(t, at.tryDemo)
  return (
    <Stage full style={{ gap: e.gap }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: e.size * 0.36 }}>
        <div style={{ margin: `0 ${(-e.size * 4.4) / 24}px`, opacity: inP }}>
          <QuarterMark size={e.size} square={square} />
        </div>
        <div style={{ fontSize: e.size * 0.75, fontWeight: weight.heading, letterSpacing: '-0.01em', lineHeight: 1, opacity: inP }}>{endCard.name}</div>
      </div>
      <div style={{ fontSize: e.tagline, fontWeight: 600, letterSpacing: '-0.02em', textAlign: 'center', maxWidth: e.taglineW, lineHeight: 1.15 }}>
        <Words list={tagline} t={t} />
      </div>
      <div style={{ opacity: demo, transform: `translateY(${lerp(16, 0, demo)}px)`, fontSize: e.demo, lineHeight: 1.2, fontWeight: 600, color: color.tint }}>{endCard.action}</div>
    </Stage>
  )
}
