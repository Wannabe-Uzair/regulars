import { expect, test } from 'vitest'
import { contrast, resolveColor } from '../contrast.ts'
import { themes, type ColorRole } from '../tokens.ts'

// The plain button has no fill: its tint words sit on the ground, deepening on hover and press, so each of the three
// must hold 4.5:1 on every ground a plain button sits on (a sheet's Cancel on raised, Show All on a card, Join on bg).
const color: Record<ColorRole, string> = themes.light.color
const hex = (role: ColorRole) => resolveColor(color, color[role])

test.each(
  (['action', 'action-hover', 'action-press'] as const).flatMap((fg) =>
    (['bg', 'surface', 'raised'] as const).map((bg) => [fg, bg] as const),
  ),
)('NFR-USE-01 the plain button’s %s words on %s are at least 4.5:1', (fg, bg) => {
  expect(contrast(hex(fg), hex(bg))).toBeGreaterThanOrEqual(4.5)
})
