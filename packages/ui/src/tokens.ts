/**
 * Design tokens: the single source for packages/ui (docs/ARCHITECTURE.md §9).
 *
 * Named by role, never by colour. `scripts/generate.ts` writes these into `tokens.css` as CSS custom properties:
 * `--color-<role>`, `--text-<px>`, `--weight-<use>`, `--leading-<use>`, `--motion-<speed>`, `--ease-<curve>`,
 * `--delay-<use>`, `--space-<step>`, `--radius-<size>`, `--border-<width>`, `--shadow-<role>`, `--focus-<part>`, `--layer-<role>`,
 * `--opacity-<use>`, `--tracking-<use>`, `--scale-<use>`, `--size-<use>`, `--material-<bar>-filter`, `--blend-<use>`
 * (per theme) and `--toast-clearance`.
 */

/** `text` mixed into `surface`, in OKLab like the marks. */
const textOnSurface = (pct: number) => `color-mix(in oklab, var(--color-text) ${pct}%, var(--color-surface))` as const

/**
 * The board marks are the same recipe in both themes: `text` mixed into `surface` (the board sits on a surface),
 * as in the colour-round canvas. `mark-some` (1–2 visits) takes the least `text` that reaches 3:1 on `surface`
 * (ARCHITECTURE §9, WCAG 1.4.11), so its share differs per theme. `mark-none` is an empty cell drawn as an outline in
 * `mark-outline`, which follows `mark-some`. `contrast.test.ts` checks them.
 */
const boardMarks = (somePct: number) =>
  ({
    'mark-full': 'var(--color-text)',
    'mark-some': textOnSurface(somePct),
    'mark-none': 'transparent',
    'mark-outline': 'var(--color-mark-some)',
    'mark-future': textOnSurface(7),
  }) as const

/**
 * Lines: one strength (the milestone 1 review). `line-strong` borders inputs and controls, so it takes the least `text`
 * that reaches 3:1 on `surface`, `bg` and `raised` (WCAG 1.4.11): inputs sit in dialogs and menus too. `line`, for
 * dividers and card edges, is the same colour; the two roles stay apart so a later change can split them again.
 * `contrast.test.ts` checks both.
 */
const lines = (strongPct: number) =>
  ({ line: textOnSurface(strongPct), 'line-strong': textOnSurface(strongPct) }) as const

/**
 * Iris's lines (the redesign, 7 Nov): `line-strong` keeps the recipe above (the least `text` that reaches 3:1 on
 * `surface`, `bg` and `raised`), and `line`, for dividers and card edges, is a hairline: decoration, not held to 3:1
 * (ARCHITECTURE §2, "Lines").
 */
const hairlines = (strongPct: number, hairline: string) =>
  ({ line: hairline, 'line-strong': textOnSurface(strongPct) }) as const

/**
 * The kiosk's outlines (ARCHITECTURE §9, kiosk-blend.md): `text` mixed into `surface` until it clears 3:1 on every part
 * of the kiosk blend, `bg-alt` and the dark lime glow included, where `line-strong` falls under it.
 */
const lineBlend = (pct: number) => ({ 'line-blend': textOnSurface(pct) }) as const

/** One soft glow of a blend: a radial gradient's shape and the colour at its centre. */
export type Glow = { shape: string; colour: string }

/**
 * A glow's colour stops: full strength at the centre, fading to transparent along the curve the picks page drew
 * (kiosk-blend.md, N1 "Soft corners"), mixed in OKLab. `scripts/tokens-css.ts` writes each glow as a radial-gradient.
 */
export const glowStops = (colour: string): string[] => [
  `${colour} 0%`,
  `color-mix(in oklab, ${colour} 84.4%, transparent) 25%`,
  `color-mix(in oklab, ${colour} 50%, transparent) 50%`,
  `color-mix(in oklab, ${colour} 15.6%, transparent) 75%`,
  'transparent 100%',
]

/**
 * The glass on the phone's two bars (ARCHITECTURE §9, "Depth"): `surface` at 86% on the top bar and 94% on the tab
 * capsule, opaque enough for the text and the tint to keep 4.5:1 over text-coloured content with no blur at all.
 * tokens.css turns both opaque under the material fallbacks.
 */
const materials = {
  'material-bar': 'color-mix(in oklab, var(--color-surface) 86%, transparent)',
  'material-tabs': 'color-mix(in oklab, var(--color-surface) 94%, transparent)',
} as const

/** The faint lime of the dark kiosk blend's bottom-left corner: `attention` 20% into `bg`. */
const kioskLime = 'color-mix(in oklab, var(--color-attention) 20%, var(--color-bg))'

/**
 * State colours, so `contrast.test.ts` can check every text-on-state pair. `highlight` is the neutral hover and
 * menu-highlight tint, translucent so it works on any ground. Danger text gets no tint behind it (its margin over
 * 4.5:1 is too thin to survive one); its hover is a thicker danger edge instead. Disabled states are exempt from
 * WCAG contrast, but still come from here.
 */
const states = (actionPartner: 'on-action' | 'text') => ({
  'action-hover': `color-mix(in oklab, var(--color-action) 88%, var(--color-${actionPartner}))`,
  /** The press colours (pick E2) go one step past hover, so a control deepens while it's held. */
  'action-press': `color-mix(in oklab, var(--color-action) 76%, var(--color-${actionPartner}))`,
  /** The filled danger capsule deepens toward the text, so its `on-danger` words only gain contrast. */
  'danger-hover': 'color-mix(in oklab, var(--color-danger) 88%, var(--color-text))',
  'danger-press': 'color-mix(in oklab, var(--color-danger) 76%, var(--color-text))',
  highlight: 'color-mix(in oklab, var(--color-text) 8%, transparent)',
  'highlight-press': 'color-mix(in oklab, var(--color-text) 14%, transparent)',
  'disabled-fill': 'color-mix(in oklab, var(--color-text) 8%, transparent)',
  'control-disabled': 'color-mix(in oklab, var(--color-text) 7%, var(--color-surface))',
  /**
   * A loading screen's placeholder shapes (Skeleton): translucent like `highlight`, so a shape is one step off whatever
   * it sits on, the white card or the grey ground (a count line, the member page's head). Decorative.
   */
  skeleton: 'color-mix(in oklab, var(--color-text) 7%, transparent)',
  scrim: 'color-mix(in oklab, var(--color-bg) 72%, transparent)',
})

/**
 * Dark: Navy & Lime. Light: Iris (the redesign, 7 Nov; it replaces Summer Ocean Breeze). Only the light values change
 * tonight: the dark column stays until the theme is pinned light, and goes after the stall. Every pair is checked by
 * `contrast.test.ts`.
 */
export const themes = {
  dark: {
    colorScheme: 'dark',
    color: {
      bg: '#202734',
      'bg-alt': '#36415A',
      surface: '#2B3447',
      raised: '#36415A',
      text: '#E0F8C7',
      'text-soft': '#ADC1A2',
      /** Everything you can act on: `action`, `link` and `focus` point at it, and so do selection and the caret. */
      tint: '#B7D894',
      action: 'var(--color-tint)',
      'on-action': '#202734',
      attention: '#B7D894',
      'attention-fill': '#B7D894',
      'on-attention': '#202734',
      /** The tinted capsule (Button's tinted variant, the Nudge): in dark, the values the Nudge had. */
      'tint-fill': '#B7D894',
      'on-tint-fill': '#202734',
      'attention-text': '#B7D894',
      /** StatusDot's marks and StatusTag's words for the other statuses: in dark, the board's marks and `text`. */
      'status-below': 'var(--color-mark-some)',
      'status-below-text': 'var(--color-text)',
      'status-on': 'var(--color-mark-full)',
      'status-on-text': 'var(--color-text)',
      'status-new': 'var(--color-mark-outline)',
      'status-new-text': 'var(--color-text)',
      link: 'var(--color-tint)',
      focus: 'var(--color-tint)',
      danger: '#F9928F',
      /** Words on the filled danger capsule: an alert's destructive confirm. */
      'on-danger': '#202734',
      /** The logo's mark accent (pick B3): the lime accent. */
      'logo-dot': '#B7D894',
      ...lines(50),
      ...lineBlend(53),
      ...states('on-action'),
      /** Hover darkens the lime a step toward its own text colour. */
      'attention-fill-hover': 'color-mix(in oklab, var(--color-attention-fill) 88%, var(--color-on-attention))',
      'attention-fill-press': 'color-mix(in oklab, var(--color-attention-fill) 76%, var(--color-on-attention))',
      'tint-fill-hover': 'color-mix(in oklab, var(--color-tint-fill) 88%, var(--color-on-tint-fill))',
      'tint-fill-press': 'color-mix(in oklab, var(--color-tint-fill) 76%, var(--color-on-tint-fill))',
      ...materials,
      ...boardMarks(42),
    },
    /** Dark `raised` relies on its lighter colour, not a shadow. */
    shadow: { lift: 'none', flyout: 'none', float: 'none', modal: 'none', raised: 'none' },
    /**
     * The kiosk's blend (N1, "Soft corners"): a slate glow (`bg-alt`) in the top-right corner and a faint lime one in
     * the bottom-left, over the navy. A whole gradient list per theme, since `light-dark()` only switches colours.
     */
    blend: {
      kiosk: [
        { shape: '62% 74% at 100% 0%', colour: 'var(--color-bg-alt)' },
        { shape: '58% 78% at 0% 100%', colour: kioskLime },
      ] as readonly Glow[],
    },
    /** MeshBackground's fine grain, as the colour-round canvas: fractal noise at 8% in overlay blend. */
    grain: { opacity: 0.08 },
    /** The dark lime is only 1.2:1 from the soft text around a link, too close to mark it alone, so it is underlined. */
    link: { decoration: 'underline' },
  },
  light: {
    /** Only light: a phone in dark mode doesn't darken the form controls, scrollbars or ground (§9). */
    colorScheme: 'only light',
    color: {
      bg: '#F2F2F7',
      /** The ground is plain (ARCHITECTURE §9, "Ground"): the blend partner is the ground itself, so blends are flat. */
      'bg-alt': '#F2F2F7',
      surface: '#FFFFFF',
      raised: '#FFFFFF',
      text: '#1D1D1F',
      'text-soft': '#606068',
      /** Iris's one tint: white on it 6.32:1, and 5.66:1 as a link on the ground. */
      tint: '#5444E4',
      action: 'var(--color-tint)',
      'on-action': '#FFFFFF',
      attention: '#E0102E',
      /** Retired (the Nudge's first names): `tint-fill` and `on-tint-fill` carry the same values. */
      'attention-fill': '#EAE9FC',
      'on-attention': 'var(--color-tint)',
      /** The tinted capsule (Button's tinted variant, the Nudge): the tint's words on its pale fill, 5.28:1. Red stays for status and errors. */
      'tint-fill': '#EAE9FC',
      'on-tint-fill': 'var(--color-tint)',
      'attention-text': '#D40624',
      /**
       * The status marks (ARCHITECTURE §9): On the line, Below the line and New are neutral, their marks and words in
       * the text colour (New's empty ring in the soft text); only Slipping is red. No green or amber tonight.
       */
      'status-below': 'var(--color-text)',
      'status-below-text': 'var(--color-text)',
      'status-on': 'var(--color-text)',
      'status-on-text': 'var(--color-text)',
      'status-new': 'var(--color-text-soft)',
      'status-new-text': 'var(--color-text)',
      link: 'var(--color-tint)',
      focus: 'var(--color-tint)',
      danger: '#D40624',
      /** Words on the filled danger capsule: an alert's destructive confirm (ConfirmDialog's danger tone). */
      'on-danger': '#FFFFFF',
      /** The mark's square takes the tint, so red appears only for status. */
      'logo-dot': 'var(--color-tint)',
      ...hairlines(47, '#D1D1D6'),
      /** The ground is plain, so the kiosk's outlines are the control border. */
      'line-blend': 'var(--color-line-strong)',
      ...states('text'),
      /**
       * Hover shades the capsule 3% toward the text and press 6%, which keeps the tint's words at 4.95:1 and 4.63:1: a
       * deeper step would take them under 4.5:1.
       */
      'attention-fill-hover': 'color-mix(in oklab, var(--color-attention-fill) 97%, var(--color-text))',
      'attention-fill-press': 'color-mix(in oklab, var(--color-attention-fill) 94%, var(--color-text))',
      'tint-fill-hover': 'color-mix(in oklab, var(--color-tint-fill) 97%, var(--color-text))',
      'tint-fill-press': 'color-mix(in oklab, var(--color-tint-fill) 94%, var(--color-text))',
      ...materials,
      ...boardMarks(44),
    },
    /**
     * Fluent's ramp (ARCHITECTURE §9, "Depth"): a soft ambient shadow over a sharper key one, neutral black, deeper at
     * each step. `lift` is a clickable card hovered with a pointer, `flyout` menus and tooltips, `float` toasts and the
     * tab capsule, `modal` dialogs and sheets. `raised` is retired: an alias of `flyout` until the shell moves off it.
     */
    shadow: {
      lift: '0 0 2px rgb(0 0 0 / 0.06), 0 4px 8px rgb(0 0 0 / 0.07)',
      flyout: '0 0 2px rgb(0 0 0 / 0.08), 0 8px 16px rgb(0 0 0 / 0.12)',
      float: '0 0 8px rgb(0 0 0 / 0.08), 0 14px 28px rgb(0 0 0 / 0.14)',
      modal: '0 0 8px rgb(0 0 0 / 0.1), 0 32px 64px rgb(0 0 0 / 0.18)',
      raised: 'var(--shadow-flyout)',
    },
    /** The kiosk's ground is plain (FR-KIOSK-07): no glows. */
    blend: { kiosk: [] as readonly Glow[] },
    /** No grain on the plain ground. */
    grain: { opacity: 0 },
    /** The tint is 2.66:1 from the text and 1.01:1 from the soft text, too close to mark a link alone: underlined. */
    link: { decoration: 'underline' },
  },
} as const

export type ThemeName = keyof typeof themes
export type ColorRole = keyof (typeof themes)['dark']['color']

export const font = {
  /** Inter 4 with optical sizes (the redesign, 7 Nov), self-hosted from `fonts/` by base.css's one @font-face. */
  family: { sans: "'Inter Variable', system-ui, sans-serif" },
  /**
   * The type scale in px. The CSS carries it in rem, so it follows the reader's browser text size. 48 and 96 are the
   * home page's display sizes (its headline: 96 on laptops, 48 on phones), used nowhere else.
   */
  size: [12, 13, 14, 16, 17, 18, 21, 24, 32, 34, 44, 48, 64, 96],
  /**
   * The one size outside the scale (ARCHITECTURE §9): the kiosk's typed number, `--text-kiosk`. 8rem (128 px), shrinking
   * to fit a narrower container: the kiosk shows the number formatted, "(312) 555-0142", 8.14 em wide in Inter 600's
   * tabular figures (measured in Chrome, at every size), so the width inside the kiosk's side padding, over 7.7, keeps
   * it on one line at every width up to the cap. `cqi` falls back to the viewport outside a size container.
   */
  kiosk: 'min(8rem, calc((100cqi - 2 * var(--space-8)) / 7.7))',
  /** Inter in 400, 600 and 700 only (ARCHITECTURE §9): controls take 600, as headings do; titles of 32 px and up 700. */
  weight: { body: 400, interface: 600, heading: 600, display: 700 },
  /** `body` for running text, `heading` for 18–24, `display` for 32 and up. */
  leading: { body: 1.5, heading: 1.25, display: 1.1 },
  /** Tabular figures for all data. */
  numeric: 'tabular-nums',
} as const

/**
 * Labels (ARCHITECTURE §9): no spaced capitals. Status tags, small labels above headings, figure labels, table column
 * headers and the Sample data tag are sentence-case footnotes, shown as COPY.md writes them. A future table's column
 * headers must use these tokens (`--label-size`, `--label-weight`, `--label-tracking`, `--label-transform`), as Tag,
 * StatusTag, Kpi and Eyebrow do.
 */
export const label = { size: 12, weight: 600, tracking: 'normal', transform: 'none' } as const

export const motion = {
  /**
   * `crossfade` is the one theme switch (§9 Theme switching). The springs' durations are the curves' own (§9 "Motion"):
   * each `spring*` pairs with its `--ease-spring*`. `linger` is a tint fading after a live change (the board's row after
   * a check-in), on `--ease-standard`.
   */
  duration: {
    fast: '120ms',
    base: '200ms',
    slow: '320ms',
    crossfade: '240ms',
    spring: '740ms',
    'spring-quick': '450ms',
    'spring-bounce': '820ms',
    linger: '1600ms',
  },
  /**
   * One spring family: smooth (no bounce, 90% there at 311 ms) for sheets and dialogs rising, quick (90% at 187 ms) for
   * them leaving and a press's release, and one bounce (4.6% over) for the kiosk welcome's check only. These are the
   * `cubic-bezier()` fallbacks; `linear` below holds the sampled springs that replace them where `linear()` works.
   */
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasised: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    spring: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    'spring-quick': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    'spring-bounce': 'cubic-bezier(0.34, 1.45, 0.64, 1)',
  },
  /** The springs sampled as `linear()` (the motion specimen's values), set inside `@supports` by tokens.css. */
  linear: {
    spring:
      'linear(0, 0.004 1%, 0.019 2.3%, 0.043 3.5%, 0.08 5%, 0.116 6.3%, 0.163 7.8%, 0.366 13.8%, 0.461 16.8%, 0.555 20%, 0.594 21.5%, 0.636 23.3%, 0.705 26.5%, 0.738 28.2%, 0.767 30%, 0.794 31.8%, 0.821 33.8%, 0.863 37.5%, 0.901 42%, 0.931 46.8%, 0.955 52.3%, 0.972 58.5%, 0.984 65.5%, 0.992 73.8%, 1)',
    'spring-quick':
      'linear(0, 0.004 1%, 0.02 2.3%, 0.044 3.5%, 0.082 5%, 0.118 6.3%, 0.158 7.5%, 0.363 13.5%, 0.46 16.5%, 0.555 19.8%, 0.595 21.3%, 0.637 23%, 0.671 24.5%, 0.707 26.3%, 0.74 28%, 0.77 29.8%, 0.82 33.3%, 0.863 37%, 0.884 39.3%, 0.902 41.5%, 0.931 46.3%, 0.955 51.7%, 0.973 58%, 0.984 65%, 0.992 73.3%, 0.996 83%, 1)',
    'spring-bounce':
      'linear(0, 0.001 0.5%, 0.008 1.3%, 0.029 2.5%, 0.062 3.8%, 0.113 5.3%, 0.162 6.5%, 0.216 7.8%, 0.484 13.5%, 0.594 16%, 0.655 17.5%, 0.702 18.8%, 0.746 20%, 0.787 21.3%, 0.824 22.5%, 0.858 23.8%, 0.888 25%, 0.92 26.5%, 0.943 27.8%, 0.967 29.3%, 0.984 30.5%, 1.001 32%, 1.022 34.5%, 1.036 37%, 1.044 39.8%, 1.046 42.8%, 1.041 48%, 1.012 62.7%, 1.003 70.5%, 0.998 82.3%, 1)',
  },
  /**
   * `pop` is where the check-in pop and the kiosk welcome's entrance start, scaling down to 1 (§2 "Motion"). `press` is
   * the 3% give under a finger; base.css sets it to 1 under reduced motion.
   */
  scale: { pop: 1.25, press: 0.97 },
  /**
   * `busy` is how long a wait goes unshown (pick F2): a button keeps its fill and words, and a spinner shows only after
   * it, so a quick answer never flashes one. A wait, not a move, so reduced motion keeps it.
   */
  delay: { busy: '400ms' },
} as const

/** A 4 px grid: `--space-<n>` is n × 4 px. */
export const space = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

export const radius = { sm: '4px', md: '8px', lg: '12px', xl: '24px', full: '999px' } as const

/**
 * Border widths: `thin` for control outlines; `hairline` for every separator and card edge, with `--color-line`;
 * `thick` for an edge that has to stand out; `band` for the accent band along an edge (an attention toast's), drawn
 * inside the thin edge so the radius clips it.
 */
export const border = { thin: '1px', hairline: '1px', thick: '2px', band: '4px' } as const

/** The hairline on screens of 2 device pixels per px and up: one device pixel. */
export const hairlineDense = '0.5px'

/** The focus ring. Under `prefers-contrast: more` it thickens to `focusMoreContrast` (NFR-USE-06). */
export const focus = { width: '2px', offset: '2px' } as const

export const focusMoreContrast = { width: '3px' } as const

/** Sizes: a round kiosk key at most (76 px); the keypad clamps it by the viewport's height to no less than 64 px. */
export const size = { 'kiosk-key': '4.75rem' } as const

/**
 * The glass's backdrop filters (ARCHITECTURE §9, "Depth"): the top bar's and the tab capsule's, written to both
 * `-webkit-backdrop-filter` and `backdrop-filter`. tokens.css sets them to `none` under the material fallbacks.
 */
export const material = {
  'bar-filter': 'saturate(180%) blur(20px)',
  'tabs-filter': 'saturate(180%) blur(30px)',
} as const

/**
 * Stacking: `sticky` 1 for a sticky column inside a scroller (the board's names), `nav` 30 for the tab bar and the
 * sidebar (under dialogs), dialogs 40, menus and tooltips 50 (so they open over a dialog), toasts 60. `behind` is -1,
 * for decoration inside its own stacking context.
 */
export const layer = { behind: -1, sticky: 1, nav: 30, dialog: 40, menu: 50, tooltip: 50, toast: 60 } as const

/**
 * How far toasts sit above the bottom edge's own gap, to stay clear of the tab bar. 0 here; the app shell sets
 * `--toast-clearance` to the tab bar's height while the bar shows.
 */
export const toast = { clearance: '0px' } as const

/**
 * Opacities: disabled controls, the spinner's faint track and the low end of a skeleton's slow pulse. The mesh grain's
 * is per theme (`themes.*.grain`).
 */
export const opacity = { disabled: 0.5, 'spinner-track': 0.25, 'skeleton-pulse': 0.55 } as const

/** Letter spacing beyond the labels' `--label-tracking`: the name beside the mark is set slightly tight (about -0.01em, Inter 600). */
export const tracking = { logo: '-0.01em' } as const

export const tokens = {
  themes,
  font,
  motion,
  space,
  radius,
  border,
  focus,
  size,
  material,
  layer,
  toast,
  opacity,
  tracking,
} as const
