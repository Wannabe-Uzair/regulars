import {
  border,
  focus,
  focusMoreContrast,
  font,
  glowStops,
  hairlineDense,
  label,
  layer,
  material,
  motion,
  opacity,
  radius,
  size,
  space,
  themes,
  toast,
  tracking,
  type Glow,
  type ThemeName,
} from '../src/tokens.ts'

/** A value, or one laid out over several lines from the declaration's indent. */
type Value = string | number | ((indent: string) => string)
type Declarations = [name: string, value: Value][]

const header = '/* Generated from src/tokens.ts by scripts/generate.ts. Do not edit: run `npm run generate`. */'

/** px → rem at the 16 px browser default, so the type scale follows the reader's text size. */
const rem = (px: number) => `${px / 16}rem`

function shared(): Declarations {
  return [
    ['--font-sans', font.family.sans],
    ['--font-numeric', font.numeric],
    ...font.size.map((px): [string, string] => [`--text-${px}`, rem(px)]),
    ['--text-kiosk', font.kiosk],
    ...Object.entries(font.weight).map(([k, v]): [string, number] => [`--weight-${k}`, v]),
    ...Object.entries(font.leading).map(([k, v]): [string, number] => [`--leading-${k}`, v]),
    ['--label-size', rem(label.size)],
    ['--label-weight', label.weight],
    ['--label-tracking', label.tracking],
    ['--label-transform', label.transform],
    ...Object.entries(motion.duration).map(([k, v]): [string, string] => [`--motion-${k}`, v]),
    ...Object.entries(motion.easing).map(([k, v]): [string, string] => [`--ease-${k}`, v]),
    ...Object.entries(motion.scale).map(([k, v]): [string, number] => [`--scale-${k}`, v]),
    ...Object.entries(motion.delay).map(([k, v]): [string, string] => [`--delay-${k}`, v]),
    ...Object.entries(space).map(([k, v]): [string, string] => [`--space-${k}`, v]),
    ...Object.entries(radius).map(([k, v]): [string, string] => [`--radius-${k}`, v]),
    ...Object.entries(border).map(([k, v]): [string, string] => [`--border-${k}`, v]),
    ...Object.entries(focus).map(([k, v]): [string, string] => [`--focus-${k}`, v]),
    ...Object.entries(size).map(([k, v]): [string, string] => [`--size-${k}`, v]),
    ...Object.entries(material).map(([k, v]): [string, string] => [`--material-${k}`, v]),
    ...Object.entries(layer).map(([k, v]): [string, number] => [`--layer-${k}`, v]),
    ['--toast-clearance', toast.clearance],
    ...Object.entries(opacity).map(([k, v]): [string, number] => [`--opacity-${k}`, v]),
    ...Object.entries(tracking).map(([k, v]): [string, string] => [`--tracking-${k}`, v]),
  ]
}

function theme(name: ThemeName): Declarations {
  const t = themes[name]
  return [
    ['color-scheme', t.colorScheme],
    ...Object.entries(t.color).map(([k, v]): [string, string] => [`--color-${k}`, v]),
    ...Object.entries(t.shadow).map(([k, v]): [string, string] => [`--shadow-${k}`, v]),
    ['--link-decoration', t.link.decoration],
    ['--opacity-grain', t.grain.opacity],
    ...Object.entries(t.blend).map(([k, v]): [string, Value] => [`--blend-${k}`, gradients(v)]),
  ]
}

/** Hex in lower case, as Prettier writes CSS; tokens.ts keeps the table's upper case. */
const cssValue = (v: string | number) => (typeof v === 'string' && /^#[0-9a-f]+$/i.test(v) ? v.toLowerCase() : v)

/**
 * A blend's glows as radial gradients, one argument a line, the way Prettier lays out a value too long for one line: a
 * single gradient opens on the declaration's line, and a list starts each gradient on a line of its own. A blend with
 * no glows (a plain ground) is `none`.
 */
function gradients(glows: readonly Glow[]): Value {
  if (glows.length === 0) return 'none'
  return (indent) => {
    const gradient = (at: string, glow: Glow) =>
      `radial-gradient(\n${[glow.shape, ...glowStops(glow.colour)].map((arg) => `${at}  ${arg}`).join(',\n')}\n${at})`
    if (glows.length === 1) return gradient(indent, glows[0] as Glow)
    return `\n${glows.map((glow) => `${indent}  ${gradient(`${indent}  `, glow)}`).join(',\n')}`
  }
}

/**
 * The glass made opaque: each material is plain `surface` and each backdrop filter `none`, where blur can't run or the
 * reader asks for less transparency or more contrast (ARCHITECTURE §9, "Depth"). Components write no query for it.
 */
const opaqueMaterials = (): Declarations => [
  ...Object.keys(themes.light.color)
    .filter((role) => role.startsWith('material-'))
    .map((role): [string, string] => [`--color-${role}`, 'var(--color-surface)']),
  ...Object.keys(material).map((k): [string, string] => [`--material-${k}`, 'none']),
]

/** A `:root` block inside an at-rule. */
const within = (rule: string, decls: Declarations) => `${rule} {\n${block(':root', decls, '  ')}\n}`

/** A `linear()` easing with a stop a line, as Prettier lays out a value too long for one line. */
const stops =
  (easing: string): Value =>
  (indent) =>
    `linear(\n${easing
      .replace(/^linear\(|\)$/g, '')
      .split(', ')
      .map((stop) => `${indent}  ${stop}`)
      .join(',\n')}\n${indent})`

function block(selector: string, decls: Declarations, indent = ''): string {
  const declaration = (k: string, v: Value) => {
    const value = typeof v === 'function' ? v(`${indent}  `) : cssValue(v)
    return `${indent}  ${k}:${String(value).startsWith('\n') ? '' : ' '}${value};`
  }
  const body = decls.map(([k, v]) => declaration(k, v)).join('\n')
  return `${indent}${selector} {\n${body}\n${indent}}`
}

/**
 * The text of `src/tokens.css`. The page is pinned light (ARCHITECTURE §9, "One light theme" and FR-SHELL-07): `:root`
 * takes the light theme whatever `data-theme` or the device says, and no rule switches on `prefers-color-scheme`. The
 * dark column stays in tokens.ts, unused and not emitted, until after the stall. Then come the at-rules: the sampled
 * springs where `linear()` works, the dense hairline on 2x screens, and the opaque glass where blur can't run, under
 * reduced transparency and under more contrast (which also thickens the focus ring).
 */
export function renderTokensCss(): string {
  const blocks = [
    header,
    block(':root', shared()),
    block(':root', theme('light')),
    within(
      '@supports (transition-timing-function: linear(0, 1))',
      Object.entries(motion.linear).map(([k, v]): [string, Value] => [`--ease-${k}`, stops(v)]),
    ),
    within('@media (min-resolution: 2dppx)', [['--border-hairline', hairlineDense]]),
    within('@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))', opaqueMaterials()),
    within('@media (prefers-reduced-transparency: reduce)', opaqueMaterials()),
    within('@media (prefers-contrast: more)', [
      ...opaqueMaterials(),
      ...Object.entries(focusMoreContrast).map(([k, v]): [string, string] => [`--focus-${k}`, v]),
    ]),
  ]
  return blocks.join('\n\n') + '\n'
}
