import { describe, expect, test } from 'vitest'
import { contrast, mixOklab, resolveColor, resolveOver } from './contrast.ts'
import { glowStops, themes, type ColorRole, type ThemeName } from './tokens.ts'

type Pair = [fg: ColorRole, bg: ColorRole, min: number]
type StatePair = [fg: ColorRole, state: ColorRole, ground: ColorRole, min: number]

/** The grounds a component can sit on: the page, a card or panel, and a menu, dialog or toast. */
const grounds = ['bg', 'surface', 'raised'] as const

// The WCAG AA pairs behind docs/ARCHITECTURE.md §9. A token change that breaks one fails here.
const pairs: Pair[] = [
  ...(['bg', 'bg-alt', 'surface', 'raised'] as const).map((bg): Pair => ['text', bg, 4.5]),
  ...(['bg', 'bg-alt', 'surface', 'raised'] as const).map((bg): Pair => ['text-soft', bg, 4.99]),
  ['on-action', 'action', 4.5],
  ['on-attention', 'attention-fill', 4.5],
  // The tinted capsule (Button's tinted variant, the Nudge): the same values under §9's names.
  ['on-tint-fill', 'tint-fill', 4.5],
  // The filled danger capsule: an alert's destructive confirm.
  ['on-danger', 'danger', 4.5],
  // Danger text has no tint behind it in any state (the danger button's hover, the danger menu item's highlight).
  ...(['attention-text', 'link', 'danger'] as const).flatMap((fg) => grounds.map((bg): Pair => [fg, bg, 4.5])),
  // StatusTag's words for the other statuses: neutral in light, in the text colour (the status marks, ARCHITECTURE §9).
  ...(['status-below-text', 'status-on-text', 'status-new-text'] as const).flatMap((fg) =>
    grounds.map((bg): Pair => [fg, bg, 4.5]),
  ),
  // Focus rings, the Toast's attention edge, the selected tab's underline and the invalid input's border.
  ...(['focus', 'attention', 'action', 'danger'] as const).flatMap((fg) => grounds.map((bg): Pair => [fg, bg, 3])),
  // StatusDot's marks, graphics (WCAG 1.4.11), on the page and the card the board sits on: in light the neutral dot and
  // half ring in the text colour and New's empty ring in the soft text (Slipping's triangle is `attention`, above). In
  // dark they are the board's own marks, held to 3:1 on surface, as before.
  ...(['status-below', 'status-on', 'status-new'] as const).flatMap((fg) =>
    (['bg', 'surface'] as const).map((bg): Pair => [fg, bg, 3]),
  ),
]

// Text on each state the components define, painted over every ground it can appear on.
const statePairs: StatePair[] = [
  // Primary button and the chosen ThemeChoice option, on hover.
  ...grounds.map((g): StatePair => ['on-action', 'action-hover', g, 4.5]),
  // The Nudge button on hover.
  ...grounds.map((g): StatePair => ['on-attention', 'attention-fill-hover', g, 4.5]),
  ...grounds.map((g): StatePair => ['on-tint-fill', 'tint-fill-hover', g, 4.5]),
  // Secondary and quiet buttons on hover, and the highlighted (hovered or keyboard-focused) menu item.
  ...grounds.map((g): StatePair => ['text', 'highlight', g, 4.5]),
  // The press colours (pick E2, ARCHITECTURE §9): one step past each hover, with the text on each at least 5.86:1.
  ...grounds.map((g): StatePair => ['on-action', 'action-press', g, 5.86]),
  ...grounds.map((g): StatePair => ['text', 'highlight-press', g, 5.86]),
  // The filled danger capsule on hover and press: its words only gain contrast.
  ...grounds.map((g): StatePair => ['on-danger', 'danger-hover', g, 4.5]),
  ...grounds.map((g): StatePair => ['on-danger', 'danger-press', g, 4.5]),
]

/**
 * The Nudge pressed: 5.86:1 in dark, as the other press colours; in light (Iris) the tint's words on the capsule at
 * least 4.5:1 (ARCHITECTURE §9), since the pale fill leaves no room for the deeper press the others take.
 */
const nudgePress = { dark: 5.86, light: 4.5 } as const

describe.each(Object.keys(themes) as ThemeName[])('%s theme', (name) => {
  const color: Record<ColorRole, string> = themes[name].color

  /** A role as hex, its `var()` and `color-mix()` resolved the way the browser does. */
  const hex = (role: ColorRole) => resolveColor(color, color[role])

  test.each(pairs)('%s on %s is at least %d:1', (fg, bg, min) => {
    expect(contrast(hex(fg), hex(bg))).toBeGreaterThanOrEqual(min)
  })

  test.each(statePairs)('%s on %s over %s is at least %d:1', (fg, state, ground, min) => {
    const under = resolveOver(color, color[state], color[ground])
    expect(contrast(resolveColor(color, color[fg]), under)).toBeGreaterThanOrEqual(min)
  })

  test.each(
    (
      [
        ['on-attention', 'attention-fill-press'],
        ['on-tint-fill', 'tint-fill-press'],
      ] as const
    ).flatMap(([fg, press]) => grounds.map((g) => [fg, press, g] as const)),
  )(`%s on %s over %s is at least ${nudgePress[name]}:1`, (fg, press, ground) => {
    const under = resolveOver(color, color[press], color[ground])
    expect(contrast(hex(fg), under)).toBeGreaterThanOrEqual(nudgePress[name])
  })

  // Each press colour is the same recipe as its hover, one step further: twice the hover's share, or 14% for the tint.
  test.each([
    ['action-hover', 'action-press'],
    ['attention-fill-hover', 'attention-fill-press'],
    ['tint-fill-hover', 'tint-fill-press'],
    ['highlight', 'highlight-press'],
  ] as const)('%s deepens one step to %s', (hover, press) => {
    const share = (role: ColorRole) => Number(/(\d+)%/.exec(color[role])?.[1])
    expect(color[press].replace(/\d+%/, '')).toBe(color[hover].replace(/\d+%/, ''))
    expect(share(press)).toBe(hover === 'highlight' ? 14 : 100 - 2 * (100 - share(hover)))
  })

  // The glass on the phone's two bars (ARCHITECTURE §9, "Depth"): Safari has no reduced-transparency query, so each
  // fill alone, with no blur, keeps the text and the tint at 4.5:1 over the darkest content, text-coloured.
  test.each(['material-bar', 'material-tabs'] as const)(
    'NFR-USE-01 text and the tint keep 4.5:1 on %s over text-coloured content, with no blur',
    (material) => {
      const under = resolveOver(color, color[material], hex('text'))
      for (const fg of ['text', 'tint'] as const) {
        expect(contrast(hex(fg), under), `${fg} on ${material}`).toBeGreaterThanOrEqual(4.5)
      }
    },
  )

  // Input and control borders (WCAG 1.4.11). The mix is resolved the way the browser does it.
  test.each(grounds)('line-strong on %s is at least 3:1', (bg) => {
    expect(contrast(resolveColor(color, color['line-strong']), color[bg])).toBeGreaterThanOrEqual(3)
  })

  // Lines (ARCHITECTURE §2, revised 7 Nov): in dark, dividers and card edges match input borders; in light (Iris) they
  // are a hairline, which is decoration and isn't held to 3:1, kept lighter than the control border.
  test('line is line-strong in dark, and a hairline lighter than line-strong in light', () => {
    if (name === 'dark') expect(color.line).toBe(color['line-strong'])
    else {
      expect(color.line).toBe('#D1D1D6')
      expect(contrast(hex('line'), color.surface)).toBeLessThan(contrast(hex('line-strong'), color.surface))
    }
  })

  // The kiosk's outlines sit straight on its blend, where line-strong falls under 3:1 on bg-alt (kiosk-blend.md).
  test.each(['bg', 'bg-alt', 'surface'] as const)('NFR-USE-01 FR-KIOSK-07 line-blend on %s is at least 3:1', (bg) => {
    expect(contrast(resolveColor(color, color['line-blend']), color[bg])).toBeGreaterThanOrEqual(3)
  })

  // Light's kiosk blend has no glows (a plain ground, FR-KIOSK-07), so there it is line-blend on bg, checked above.
  test('NFR-USE-01 FR-KIOSK-07 line-blend is at least 3:1 on the full strength of every glow in the kiosk blend', () => {
    const glows = themes[name].blend.kiosk.map((g) => g.colour)
    for (const glow of glows) {
      const ratio = contrast(resolveColor(color, color['line-blend']), resolveColor(color, glow))
      expect(ratio, `line-blend on ${glow}`).toBeGreaterThanOrEqual(3)
    }
  })

  // The kiosk's focus rings and its 24 px danger lines sit on the blend too (F17): on bg-alt and every glow, not just
  // the grounds above.
  test.each(['focus', 'danger'] as const)(
    'NFR-USE-01 FR-KIOSK-07 %s is at least 3:1 on bg-alt and every glow',
    (fg) => {
      const parts = [color['bg-alt'], ...themes[name].blend.kiosk.map((g) => g.colour)]
      for (const part of parts) {
        const ratio = contrast(resolveColor(color, color[fg]), resolveColor(color, part))
        expect(ratio, `${fg} on ${part}`).toBeGreaterThanOrEqual(3)
      }
    },
  )

  // The board's 1–2 visits mark (WCAG 1.4.11): 3:1 on the board's surface, and apart from the full 3+ mark beside it.
  test('NFR-USE-01 FR-BOARD-01 mark-some is at least 3:1 on surface and from mark-full', () => {
    const some = resolveColor(color, color['mark-some'])
    expect(contrast(some, color.surface)).toBeGreaterThanOrEqual(3)
    expect(contrast(some, resolveColor(color, color['mark-full']))).toBeGreaterThanOrEqual(3)
  })

  test('mark-some takes the least text that reaches 3:1 on surface, and mark-outline follows it', () => {
    const pct = Number(/(\d+)%/.exec(color['mark-some'])?.[1])
    expect(contrast(mixOklab(color.text, pct - 1, color.surface), color.surface)).toBeLessThan(3)
    expect(color['mark-outline']).toBe('var(--color-mark-some)')
  })

  // The mark's square (logo-dot): a graphic, so 3:1 on every ground it sits on, the blend's bg-alt included (WCAG
  // 1.4.11); at least 4.5:1 on surface and raised as well (ARCHITECTURE §9).
  test.each(['bg', 'bg-alt', 'surface', 'raised'] as const)('NFR-USE-01 logo-dot on %s is at least 3:1', (bg) => {
    expect(contrast(hex('logo-dot'), color[bg])).toBeGreaterThanOrEqual(3)
  })

  test.each(['surface', 'raised'] as const)('NFR-USE-01 logo-dot on %s is at least 4.5:1', (bg) => {
    expect(contrast(hex('logo-dot'), color[bg])).toBeGreaterThanOrEqual(4.5)
  })

  // DayTrack: the filled days stand 3:1 from the track (WCAG 1.4.11), though the bar is hidden from AT.
  test('NFR-USE-01 FR-BILL-01 the day track fill (action) on its track (mark-future) is at least 3:1', () => {
    expect(contrast(hex('action'), hex('mark-future'))).toBeGreaterThanOrEqual(3)
  })

  test('line-strong takes the least text that reaches 3:1', () => {
    const pct = Number(/(\d+)%/.exec(color['line-strong'])?.[1])
    const softer = mixOklab(color.text, pct - 1, color.surface)
    expect(Math.min(...grounds.map((bg) => contrast(softer, color[bg])))).toBeLessThan(3)
  })

  // WCAG 1.4.1: a link marked by colour alone must stand 3:1 apart from the text around it, body or soft.
  test('a link is underlined, or stands 3:1 apart from the text around it', () => {
    const apart = Math.min(contrast(hex('link'), color.text), contrast(hex('link'), color['text-soft']))
    const marked = themes[name].link.decoration === 'underline' || apart >= 3
    expect(marked, `the ${name} link is ${apart.toFixed(2)}:1 from the text, with no underline`).toBe(true)
  })
})

describe('the kiosk blend', () => {
  test('FR-KIOSK-07 is the N1 pattern on the theme roles in dark, and none in light, where the ground is plain', () => {
    // Dark: a slate glow at the top right and a faint lime one at the bottom left. Light (Iris, 7 Nov): no glows.
    expect(themes.dark.blend.kiosk).toEqual([
      { shape: '62% 74% at 100% 0%', colour: 'var(--color-bg-alt)' },
      { shape: '58% 78% at 0% 100%', colour: 'color-mix(in oklab, var(--color-attention) 20%, var(--color-bg))' },
    ])
    expect(themes.light.blend.kiosk).toEqual([])
    // Each fades on the drawing's curve: full, 84.4%, 50%, 15.6%, then nothing.
    expect(glowStops('var(--color-bg-alt)')).toEqual([
      'var(--color-bg-alt) 0%',
      'color-mix(in oklab, var(--color-bg-alt) 84.4%, transparent) 25%',
      'color-mix(in oklab, var(--color-bg-alt) 50%, transparent) 50%',
      'color-mix(in oklab, var(--color-bg-alt) 15.6%, transparent) 75%',
      'transparent 100%',
    ])
  })
})

describe('the logo dot', () => {
  test('NFR-USE-01 is the lime accent in dark and the tint in light, so red appears only for status', () => {
    expect(themes.dark.color['logo-dot']).toBe(themes.dark.color.attention)
    expect(themes.light.color['logo-dot']).toBe('var(--color-tint)')
    expect(contrast(resolveColor(themes.light.color, 'var(--color-logo-dot)'), '#FFFFFF')).toBeCloseTo(6.32, 2)
  })
})

describe('the tint (Iris, 7 Nov)', () => {
  test.each(Object.keys(themes) as ThemeName[])('in %s, action, link and focus point at the one tint', (name) => {
    for (const role of ['action', 'link', 'focus'] as const) expect(themes[name].color[role]).toBe('var(--color-tint)')
  })

  test('in light, hover and press mix the tint toward the text, 12% and 24%; dark keeps its on-action partner', () => {
    expect(themes.light.color['action-hover']).toBe('color-mix(in oklab, var(--color-action) 88%, var(--color-text))')
    expect(themes.light.color['action-press']).toBe('color-mix(in oklab, var(--color-action) 76%, var(--color-text))')
    expect(themes.dark.color['action-hover']).toBe(
      'color-mix(in oklab, var(--color-action) 88%, var(--color-on-action))',
    )
  })

  test('in light, the Nudge is a tinted capsule: the tint on #EAE9FC, shaded 3% and 6% toward the text', () => {
    expect(themes.light.color['attention-fill']).toBe('#EAE9FC')
    expect(themes.light.color['on-attention']).toBe('var(--color-tint)')
    expect(themes.light.color['attention-fill-hover']).toBe(
      'color-mix(in oklab, var(--color-attention-fill) 97%, var(--color-text))',
    )
  })

  test("in light, the tinted capsule takes the Nudge's values under its own names, shaded 3% and 6% toward the text", () => {
    expect(themes.light.color['tint-fill']).toBe(themes.light.color['attention-fill'])
    expect(themes.light.color['on-tint-fill']).toBe('var(--color-tint)')
    expect(themes.light.color['tint-fill-hover']).toBe(
      'color-mix(in oklab, var(--color-tint-fill) 97%, var(--color-text))',
    )
    expect(themes.light.color['tint-fill-press']).toBe(
      'color-mix(in oklab, var(--color-tint-fill) 94%, var(--color-text))',
    )
  })

  test('NFR-USE-01 the top bar is surface at 86% and the tab capsule at 94%, the tint 4.74:1 on the bar over text', () => {
    const light: Record<ColorRole, string> = themes.light.color
    expect(light['material-bar']).toBe('color-mix(in oklab, var(--color-surface) 86%, transparent)')
    expect(light['material-tabs']).toBe('color-mix(in oklab, var(--color-surface) 94%, transparent)')
    const bar = resolveOver(light, light['material-bar'], resolveColor(light, light.text))
    expect(contrast(resolveColor(light, light.tint), bar)).toBeCloseTo(4.74, 2)
  })

  test('in light, the blend partner is the plain ground and the kiosk outline is the control border', () => {
    expect(themes.light.color['bg-alt']).toBe(themes.light.color.bg)
    expect(themes.light.color['line-blend']).toBe('var(--color-line-strong)')
    expect(themes.light.grain.opacity).toBe(0)
  })
})

describe('the status marks (ARCHITECTURE §9)', () => {
  const light: Record<ColorRole, string> = themes.light.color
  const hex = (role: ColorRole) => resolveColor(light, light[role])
  /** A colour with no hue to speak of: its channels within 16 of each other. */
  const neutral = (colour: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16)) as [number, number, number]
    return Math.max(r, g, b) - Math.min(r, g, b) <= 16
  }

  test("NFR-USE-01 status marks are 3:1 or more on surface and bg; only Slipping's are red", () => {
    // On the line, Below the line and New: neutral marks and words, with no green or amber tonight.
    for (const role of ['status-on', 'status-on-text', 'status-below', 'status-below-text'] as const) {
      expect(light[role], role).toBe('var(--color-text)')
    }
    const marks = ['status-on', 'status-below', 'status-new', 'attention'] as const
    for (const role of marks) {
      for (const bg of ['surface', 'bg'] as const)
        expect(contrast(hex(role), light[bg]), `${role} on ${bg}`).toBeGreaterThanOrEqual(3)
    }
    for (const role of [
      'status-on',
      'status-on-text',
      'status-below',
      'status-below-text',
      'status-new',
      'status-new-text',
    ] as const) {
      expect(neutral(hex(role)), `${role} is ${hex(role)}`).toBe(true)
    }
    // Slipping's triangle and its word are the one red.
    for (const role of ['attention', 'attention-text'] as const) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex(role).slice(i, i + 2), 16)) as [number, number, number]
      expect(r - Math.max(g, b), `${role} is ${hex(role)}`).toBeGreaterThan(128)
    }
  })
})

describe('contrast', () => {
  test('matches the WCAG extremes and is symmetric', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrast('#FFF', '#FFFFFF')).toBe(1)
    expect(contrast('#1D3557', '#F1FAEE')).toBeCloseTo(contrast('#F1FAEE', '#1D3557'), 10)
  })

  test("agrees with Iris's figures", () => {
    // Light (ARCHITECTURE §9): text 15.1–16.8:1, white on the tint 6.32:1, the tint as a link on the ground 5.66:1,
    // line-strong 3.01:1 on bg; and the tint on the Nudge's capsule 5.28:1.
    expect(contrast('#1D1D1F', '#F2F2F7')).toBeCloseTo(15.1, 1)
    expect(contrast('#1D1D1F', '#FFFFFF')).toBeCloseTo(16.8, 1)
    expect(contrast('#FFFFFF', '#5444E4')).toBeCloseTo(6.32, 2)
    expect(contrast('#5444E4', '#F2F2F7')).toBeCloseTo(5.66, 2)
    expect(contrast(resolveColor(themes.light.color, 'var(--color-line-strong)'), '#F2F2F7')).toBeCloseTo(3.01, 2)
    expect(contrast('#5444E4', '#EAE9FC')).toBeCloseTo(5.28, 2)
  })
})

describe('mixOklab', () => {
  test('mixes in OKLab, as CSS color-mix does', () => {
    // Halfway between white and black in OKLab is L 0.5, which is #636363 in sRGB.
    expect(mixOklab('#FFFFFF', 50, '#000000')).toBe('#636363')
    expect(mixOklab('#1D3557', 100, '#FFFFFF')).toBe('#1D3557')
    expect(mixOklab('#1D3557', 0, '#FFFFFF')).toBe('#FFFFFF')
  })

  test('resolves roles and mixes against the palette', () => {
    const palette = {
      text: '#000000',
      surface: '#FFFFFF',
      line: 'color-mix(in oklab, var(--color-text) 50%, var(--color-surface))',
    }
    expect(resolveColor(palette, palette.line)).toBe('#636363')
    expect(() => resolveColor(palette, 'var(--color-nope)')).toThrow(/unknown colour role/)
  })

  test('paints a translucent tint over its ground in sRGB, as the browser composites it', () => {
    const palette = { text: '#000000', tint: 'color-mix(in oklab, var(--color-text) 50%, transparent)' }
    expect(resolveOver(palette, palette.tint, '#FFFFFF')).toBe('#808080')
    expect(resolveOver(palette, 'var(--color-text)', '#FFFFFF')).toBe('#000000')
  })
})
