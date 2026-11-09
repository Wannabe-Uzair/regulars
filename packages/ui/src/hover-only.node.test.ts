// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const src = new URL('./', import.meta.url)
const modules = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.module.css'))
  .sort()

const hoverMedia = '@media (hover: hover) {'
const coarseMedia = '@media (pointer: coarse) {'

type Rule = { selector: string; body: string }

/** The rules in a stretch of CSS with no at-rule in it: selector lists and bodies, whitespace evened out. */
function rules(css: string): Rule[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: (m[1] ?? '').trim().replace(/\s+/g, ' '),
    body: (m[2] ?? '').trim().replace(/\s+/g, ' '),
  }))
}

/** CSS with the insides of every `media` block taken out: what they held, and what is left. */
function takeOut(css: string, media: string): { inside: string; rest: string } {
  let rest = css
  let inside = ''
  for (let at = rest.indexOf(media); at !== -1; at = rest.indexOf(media)) {
    let depth = 0
    let end = at + media.length
    for (; end < rest.length; end += 1) {
      if (rest[end] === '{') depth += 1
      if (rest[end] === '}' && depth-- === 0) break
    }
    inside += rest.slice(at + media.length, end)
    rest = rest.slice(0, at) + rest.slice(end + 1)
  }
  return { inside, rest }
}

/**
 * A module's CSS split into what sits inside its `@media (hover: hover)` blocks, its `@media (pointer: coarse)` blocks
 * (the press give under a finger) and everything else.
 */
function split(file: string): { hover: string; coarse: string; rest: string } {
  const css = readFileSync(new URL(file, src), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const { inside: hover, rest: noHover } = takeOut(css, hoverMedia)
  const { inside: coarse, rest } = takeOut(noHover, coarseMedia)
  return { hover, coarse, rest }
}

/** A rule body's declarations, as `property: value` strings. */
const declarations = (body: string) =>
  body
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)

/**
 * The press step for a hover's look (pick E2, ARCHITECTURE §9's press colours): each hover fill goes one step further;
 * a hover that only darkens words also takes the pressed tint behind them; a hover edge goes from the soft text to the
 * text. Danger has no fill to deepen, so its thicker edge stays; the filled destructive confirm deepens its red. Every
 * press lands at once (`transition: none`), and the rule at rest eases it back over --motion-fast on release.
 */
function pressStep(hoverBody: string): string[] {
  const press = declarations(hoverBody).map((d) =>
    d
      .replace('var(--color-action-hover)', 'var(--color-action-press)')
      .replace('var(--color-danger-hover)', 'var(--color-danger-press)')
      .replace('var(--color-tint-fill-hover)', 'var(--color-tint-fill-press)')
      .replace(/var\(--color-highlight\)/, 'var(--color-highlight-press)')
      .replace('border-color: var(--color-text-soft)', 'border-color: var(--color-text)'),
  )
  const wordsOnly = press.length === 1 && press[0] === 'color: var(--color-text)'
  return [...(wordsOnly ? ['background-color: var(--color-highlight-press)'] : []), ...press, 'transition: none'].sort()
}

/** The properties a module's rules at rest ease over --motion-fast. */
function easedFast(rest: string): Set<string> {
  const eased = new Set<string>()
  for (const [, list = ''] of rest.matchAll(/transition:([^;]+);/g)) {
    for (const part of list.split(',')) {
      const [property, duration] = part.trim().split(/\s+/)
      if (property && duration === 'var(--motion-fast)') eased.add(property)
    }
  }
  return eased
}

describe('hover is for pointers that hover, and a press goes one step further (F10, E2)', () => {
  const withHover = modules.filter((file) => split(file).hover !== '')

  test('finds the modules with a hover', () => {
    expect(withHover).toEqual(
      expect.arrayContaining([
        'Button/Button.module.css',
        'ChoiceGroup/ChoiceGroup.module.css',
        'Field/control.module.css',
        'Tabs/Tabs.module.css',
      ]),
    )
  })

  test.each(modules)('%s has no :hover outside @media (hover: hover)', (file) => {
    expect(split(file).rest).not.toContain(':hover')
  })

  test.each(withHover)('NFR-USE-01 %s gives each hover rule an :active twin that takes the press step', (file) => {
    const { hover, rest } = split(file)
    const outside = rules(rest)
    for (const { selector, body } of rules(hover)) {
      for (const one of selector.split(/,(?![^(]*\))/)) expect(one, `${file}: ${one}`).toContain(':hover')
      // A busy button keeps its hover fill (pick F2) but takes no press, since it ignores clicks.
      const twin = selector.replaceAll(':hover', ':active').replaceAll(':not(:disabled)', ':not(:disabled, .loading)')
      const found = outside.find((r) => r.selector === twin)
      expect(found, `${file}: ${twin} is missing`).toBeDefined()
      expect(declarations(found?.body ?? '').sort(), `${file}: ${twin}`).toEqual(pressStep(body))
    }
  })

  test.each(withHover)('%s eases every pressed property back over --motion-fast on release', (file) => {
    const { rest } = split(file)
    const eased = easedFast(rest)
    for (const { selector, body } of rules(rest).filter((r) => r.selector.includes(':active'))) {
      for (const d of declarations(body).filter((d) => !d.startsWith('transition'))) {
        const property = d.slice(0, d.indexOf(':'))
        expect(eased.has(property), `${file}: ${selector} presses ${property}, which nothing eases back`).toBe(true)
      }
    }
  })

  test.each(modules)('NFR-USE-04 %s moves and scales nothing on press with a mouse', (file) => {
    const pressed = rules(split(file).rest).filter((r) => r.selector.includes(':active'))
    for (const { selector, body } of pressed)
      expect(body, `${file}: ${selector}`).not.toMatch(/transform|scale|translate/)
  })

  test('NFR-USE-04 Button gives 3% only under a finger, and eases back on the quick spring', () => {
    const file = 'Button/Button.module.css'
    const { coarse, rest } = split(file)
    // The give is the only thing under a finger: the press scales to --scale-press (3%), the colour landing at once.
    expect(rules(coarse)).toEqual([
      {
        selector: '.button:active:not(:disabled, .loading)',
        body: 'transform: scale(var(--scale-press)); transition: transform var(--motion-fast) var(--ease-standard);',
      },
    ])
    // Let go, the rule at rest springs it back on the quick spring, alongside the colours it eases over --motion-fast.
    const atRest = rules(rest).find((r) => r.selector === '.button')?.body ?? ''
    expect(atRest).toContain('transform var(--motion-spring-quick) var(--ease-spring-quick)')
    // No other module gives under a finger, and none writes the reduced-motion query: the tokens zero the give.
    for (const other of modules.filter((m) => m !== file)) expect(split(other).coarse, other).toBe('')
    expect(readFileSync(new URL(file, src), 'utf8')).not.toContain('prefers-reduced-motion')
  })

  test.each(modules)('%s never repeats a hover colour under :active', (file) => {
    const pressed = rules(split(file).rest).filter((r) => r.selector.includes(':active'))
    for (const { selector, body } of pressed) {
      expect(body, `${file}: ${selector}`).not.toMatch(/-hover\)|var\(--color-highlight\)/)
    }
  })
})
