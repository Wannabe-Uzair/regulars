import { render } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ComponentType } from 'react'
import { describe, expect, test } from 'vitest'
import * as ui from '../index.ts'
import type { WeightedIconProps } from './icon.tsx'

const dir = dirname(fileURLToPath(import.meta.url))
/** Every icon file, by its component's name. */
const names = readdirSync(dir)
  .filter((file) => /^[A-Z]\w*Icon\.tsx$/.test(file))
  .map((file) => file.replace(/\.tsx$/, ''))
  .sort()

/** The six that come in Regular and Fill: the five tabs and the account (ARCHITECTURE §9 "Icons"). */
const weighted = ['CalendarDotIcon', 'ChartBarIcon', 'GearSixIcon', 'SquaresFourIcon', 'UserCircleIcon', 'UsersIcon']

const component = (name: string) => (ui as unknown as Record<string, ComponentType<WeightedIconProps>>)[name]
const drawn = (name: string, props: WeightedIconProps = {}) => {
  const Icon = component(name)
  if (!Icon) throw new Error(`${name} isn't exported from @tenure/ui`)
  const { container } = render(<Icon {...props} />)
  const svg = container.querySelector('svg')
  if (!svg) throw new Error(`${name} drew no svg`)
  return svg
}

describe('NFR-MAINT-04 every icon draws in currentColor at 1em, hidden, with Phosphor’s licence beside it', () => {
  test('vendors the 27 icons, each exported from @tenure/ui, and no CloseIcon', () => {
    expect(names).toHaveLength(27)
    expect(names).not.toContain('CloseIcon')
    for (const name of names) expect(typeof component(name), name).toBe('function')
  })

  test.each(names)('%s is one path on the 256 grid, in currentColor at 1em, hidden', (name) => {
    const svg = drawn(name, { className: 'glyph' })
    expect(svg).toHaveAttribute('viewBox', '0 0 256 256')
    expect(svg).toHaveAttribute('width', '1em')
    expect(svg).toHaveAttribute('height', '1em')
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg).toHaveClass('glyph')
    const paths = svg.querySelectorAll('path')
    expect(paths).toHaveLength(1)
    expect(paths[0]?.getAttribute('d')).toMatch(/^M[\d.,\s\-A-Za-z]+$/)
  })

  test.each(weighted)('%s draws Regular by default and Fill on asking, two different paths', (name) => {
    const d = (props?: WeightedIconProps) => drawn(name, props).querySelector('path')?.getAttribute('d')
    expect(d()).toBe(d({ weight: 'regular' }))
    expect(d({ weight: 'fill' })).not.toBe(d())
  })

  test("ships Phosphor's MIT licence beside the icons", () => {
    const licence = readFileSync(join(dir, 'LICENSE'), 'utf8')
    expect(licence).toMatch(/^MIT License/)
    expect(licence).toContain('Copyright (c) 2023 Phosphor Icons')
  })
})
