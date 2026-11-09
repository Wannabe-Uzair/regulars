/**
 * Iris, the light theme, copied from packages/ui/src/tokens.ts (the film may not import the app's packages: it is its
 * own package). Colours by role, never by colour name. The board marks and lines are tokens.ts's OKLab mixes, resolved
 * here to the sRGB values they come to on `surface`.
 */
export const color = {
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1D1D1F',
  textSoft: '#606068',
  tint: '#5444E4',
  onTint: '#FFFFFF',
  tintFill: '#EAE9FC',
  /** `tint-fill` pressed: tokens.ts's 76% of `tint-fill` into the tint. */
  tintFillPress: '#C9C4F6',
  attentionText: '#D40624',
  attention: '#E0102E',
  /** `line`, the hairline for dividers and card edges. */
  line: 'rgba(29, 29, 31, 0.12)',
  /** `mark-some` and `mark-outline` on `surface` in the light theme. */
  markSome: '#8E8E93',
  /** `highlight-press`, `text` 14% over the ground. */
  highlightPress: 'rgba(29, 29, 31, 0.14)',
  /** A grey for the 59% pill: `text-soft`. */
  grey: '#8E8E93',
} as const

export const shadow = {
  float: '0 0 8px rgb(0 0 0 / 0.08), 0 14px 28px rgb(0 0 0 / 0.14)',
  modal: '0 0 8px rgb(0 0 0 / 0.1), 0 32px 64px rgb(0 0 0 / 0.18)',
  lift: '0 0 2px rgb(0 0 0 / 0.06), 0 4px 8px rgb(0 0 0 / 0.07)',
} as const

export const weight = { body: 400, interface: 600, heading: 600, display: 700 } as const

export const font = "Inter, -apple-system, 'Helvetica Neue', sans-serif"

/**
 * The app's one spring family (tokens.ts `motion`), as Remotion springs with mass 1.
 * - smooth: no bounce, 90% there at 311 ms. Critically damped, (1 + wt)e^(-wt) = 0.1 at wt = 3.89, so w = 12.5 rad/s:
 *   stiffness w^2 = 156, damping 2w = 25.
 * - quick: 90% at 187 ms, w = 20.8: stiffness 433, damping 41.6. For leaving and a press's release.
 * - bounce: 4.6% over, so damping ratio 0.70; w = 11 settles in about 820 ms: stiffness 121, damping 15.4. Sam's check only.
 */
export const springs = {
  smooth: { mass: 1, stiffness: 156, damping: 25, overshootClamping: false },
  quick: { mass: 1, stiffness: 433, damping: 41.6, overshootClamping: false },
  bounce: { mass: 1, stiffness: 121, damping: 15.4, overshootClamping: false },
} as const

export const FPS = 30
export const FRAMES = 900
