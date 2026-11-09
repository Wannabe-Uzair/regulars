// @vitest-environment node
// The kiosk's look in its stylesheets (FR-KIOSK-07, ARCHITECTURE §9).
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const dir = fileURLToPath(new URL('./', import.meta.url))
const sheets = readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.module.css'))
  .map((file) => ({ file, css: readFileSync(dir + file, 'utf8') }))

/** Every rule as [selector, declarations], at any depth. */
const rules = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    ([, s, b]) => [s?.trim() ?? '', b ?? ''] as const,
  )

const SCALE = ['12', '13', '14', '16', '17', '18', '21', '24', '32', '34', '44', '64']

/** A sheet's text with its comments taken out. */
const sheet = (file: string) => (sheets.find((s) => s.file === file)?.css ?? '').replace(/\/\*[\s\S]*?\*\//g, '')
/** The declarations of the first rule with exactly this selector. */
const body = (css: string, selector: string) => rules(css).find(([s]) => s === selector)?.[1] ?? ''

test('finds the kiosk stylesheets', () => {
  expect(sheets.map((s) => s.file).sort()).toEqual([
    'components/Keypad.module.css',
    'components/NumberSlots.module.css',
    'components/Panel.module.css',
    'components/StillThere.module.css',
    'components/Welcome.module.css',
    'screens/Kiosk.module.css',
  ])
})

test('FR-KIOSK-07 every kiosk text is on the scale at 64 px or less, except the typed number', () => {
  for (const { file, css } of sheets) {
    for (const [selector, declarations] of rules(css)) {
      for (const [, size] of declarations.matchAll(/font-size: ([^;]+);/g)) {
        // The number: the kiosk size, or smaller when a long number needs it to fit.
        if (selector === '.number') expect(size, file).toMatch(/^min\(var\(--text-kiosk\), /)
        else
          expect(
            SCALE.map((n) => `var(--text-${n})`),
            `${file} ${selector}`,
          ).toContain(size)
      }
    }
  }
})

test('FR-KIOSK-07 the kiosk draws no pattern and no literal of its own: the blend and every colour come from tokens', () => {
  for (const { file, css } of sheets) {
    for (const banned of [
      /background-image/,
      /gradient\(/,
      /url\(/,
      /color-mix\(/,
      /#[0-9a-f]{3,8}\b/i,
      /\d+ms\b/,
      /z-index:\s*-?\d/,
    ]) {
      expect(css, `${file} has ${banned}`).not.toMatch(banned)
    }
  }
})

test('FR-KIOSK-07 the kiosk is a plain ground, and danger is large text or semibold on it', () => {
  const screen = sheet('screens/Kiosk.module.css')
  // The page's own ground, with no blend lines handed to ui's parts and no glass.
  expect(body(screen, '.ground')).toContain('background-color: var(--color-bg);')
  for (const { file, css } of sheets) {
    expect(css, file).not.toMatch(/-blend\b|--color-line(-strong)?:|backdrop-filter/)
  }
  // native-2: no rubber band on the kiosk.
  expect(body(screen, ':root:has(.ground)')).toContain('overscroll-behavior: none;')
  // contrast.test.ts holds danger at 4.5:1 on bg; on the kiosk a danger line is 24 px, or 18 px and up at 600.
  for (const { file, css } of sheets) {
    for (const [selector, declarations] of rules(css.replace(/\/\*[\s\S]*?\*\//g, ''))) {
      if (!declarations.includes('color: var(--color-danger)')) continue
      const large = /font-size: var\(--text-(24|32|44|64)\)/.test(declarations)
      const semibold =
        /font-size: var\(--text-(18|21)\)/.test(declarations) &&
        declarations.includes('font-weight: var(--weight-interface)')
      expect(large || semibold, `${file} ${selector}`).toBe(true)
    }
  }
})

test('NFR-USE-03 FR-KIOSK-07 the keys are round, 76 px at most and never under 64 px', () => {
  const key = body(sheet('components/Keypad.module.css'), '.key')
  const size = 'clamp(var(--space-16), calc((100dvh - var(--keypad-rest)) / 4), var(--size-kiosk-key))'
  expect(key).toContain(`inline-size: ${size};`)
  expect(key).toContain(`block-size: ${size};`)
  expect(key).toContain('border-radius: var(--radius-full);')
})

test('FR-KIOSK-07 a pressed key goes one step past its hover at once, nothing moves, and + and delete have no outline (pick E2)', () => {
  const keypad = sheet('components/Keypad.module.css')
  const pressed = keypad.slice(keypad.indexOf('@media (hover: hover)'))
  expect(keypad).toContain('@media (hover: hover)')
  // The hover tint, then the press tint one step past it, at once, after the hover rules so it wins.
  expect(body(pressed, '.key:hover:not(:disabled)::before')).toContain('background-color: var(--color-highlight);')
  expect(body(pressed, '.key:active:not(:disabled)::before')).toContain(
    'background-color: var(--color-highlight-press);',
  )
  expect(body(pressed, '.key:active:not(:disabled)::before')).toContain('transition: none;')
  // Flat keys: digits on the surface, + and delete with no fill; no key has an outline.
  expect(body(keypad, '.key')).toContain('border: 0;')
  expect(body(keypad, '.key')).toContain('background-color: var(--color-surface);')
  expect(body(keypad, '.fn')).toContain('background-color: transparent;')
  expect(keypad).not.toMatch(/border-color|border: var/)
  // Nothing moves while pressed.
  expect(keypad).not.toMatch(/transform|scale/)
})

test('NFR-USE-04 the welcome moves only on the motion tokens, the bounce on the ring alone', () => {
  for (const { file, css } of sheets) {
    for (const [selector, declarations] of rules(css.replace(/\/\*[\s\S]*?\*\//g, ''))) {
      for (const [, value] of declarations.matchAll(/(?:animation|transition): ([^;]+);/g)) {
        if (value === 'none') continue
        expect(value, `${file} ${selector}`).toMatch(/var\(--motion-[a-z-]+\) var\(--ease-[a-z-]+\)/)
      }
      if (declarations.includes('--ease-spring-bounce'))
        expect(`${file} ${selector}`).toBe('components/Welcome.module.css .today')
    }
  }
  const welcome = sheet('components/Welcome.module.css')
  // The empty thirds are the segmented control's own track; today's third stays hidden through its delay.
  expect(body(welcome, '.third')).toContain('stroke: var(--color-highlight);')
  expect(welcome.slice(welcome.indexOf('@keyframes ring-fill'))).toMatch(/from \{[^}]*visibility: hidden;/)
  // The check draws on the smooth spring; today's third fills on the bouncy one, after the slow step.
  expect(body(welcome, '.check')).toMatch(/animation: check-draw var\(--motion-spring\) var\(--ease-spring\)/)
  expect(body(welcome, '.today')).toContain(
    'animation: ring-fill var(--motion-spring-bounce) var(--ease-spring-bounce) var(--motion-slow) both;',
  )
})

test("FR-KIOSK-07 the column keeps the phone's sizes on a laptop, only the gym's name grows, and a short screen tightens", () => {
  const screen = sheet('screens/Kiosk.module.css')
  const wide = screen.split('@media (min-width: 48rem)')[1]?.split('@media')[0] ?? ''
  expect(body(wide, '.gym')).toMatch(/font-size: var\(--text-18\);[\s\S]*font-weight: var\(--weight-heading\);/)
  expect(wide).not.toMatch(/\.(title|prompt|slot|column)\b/)
  // kiosk-1: nothing on the kiosk under 17 px.
  const narrow = screen.split('@media')[0] ?? ''
  expect(body(narrow, '.gym')).toContain('font-size: var(--text-17);')
  expect(body(narrow, '.title')).toContain('font-size: var(--text-32);')
  expect(body(narrow, '.prompt')).toContain('font-size: var(--text-18);')
  // Under 800 px the steps close up, and the keypad's rest of the height with them.
  expect(screen).toContain('@media (max-height: 50rem)')
  expect(sheet('components/Keypad.module.css')).toContain('@media (max-height: 50rem)')
  // The column tightens alike on the keypad and the name search, so the title and the choice stay put between them;
  // the panels (name search, join) keep their own steps.
  expect(body(screen.slice(screen.indexOf('@media (max-height: 50rem)')), '.column')).toContain('gap: var(--space-2);')
  expect(sheet('components/Panel.module.css')).not.toContain('@media (max-height: 50rem)')
  // The 24 px title keeps the heading weight (ARCHITECTURE §9: 700 is for 32 px and up).
  for (const css of [screen, sheet('components/Panel.module.css')]) {
    const short = css.slice(css.indexOf('@media (max-height: 45rem)'))
    expect(body(short, '.title')).toContain('font-weight: var(--weight-heading);')
  }
})

test("F26 the kiosk's page keeps clear of a sideways phone's notch, as the shell's columns do", () => {
  const screen = (sheets.find((s) => s.file === 'screens/Kiosk.module.css')?.css ?? '').replace(/\/\*[\s\S]*?\*\//g, '')
  const body = (css: string, selector: string) => rules(css).find(([s]) => s === selector)?.[1] ?? ''
  const narrow = screen.split('@media')[0] ?? ''
  const wide = screen.split('@media (min-width: 48rem)')[1] ?? ''
  for (const [css, gutter] of [
    [narrow, 'var(--space-4)'],
    [wide, 'var(--space-8)'],
  ] as const) {
    const page = body(css, '.page')
    expect(page, gutter).toContain(`max(${gutter}, env(safe-area-inset-left, 0px))`)
    expect(page, gutter).toContain(`max(${gutter}, env(safe-area-inset-right, 0px))`)
    // The inline padding comes after the shorthand, so the shorthand doesn't undo it.
    expect(page.lastIndexOf('padding-inline:'), gutter).toBeGreaterThan(page.lastIndexOf('padding:'))
  }
})

test("kiosk-1 the fields' labels, their Optional and their errors read at 18 px, and the Sample data tag at 17", () => {
  const panel = sheet('components/Panel.module.css')
  // ui's Field sets 14 and 13 px with one class; two parts here win over it.
  expect(body(panel, '.field > label')).toContain('font-size: var(--text-18);')
  expect(body(panel, '.field > p')).toContain('font-size: var(--text-18);')
  expect(body(panel, '.field > p')).toContain('font-weight: var(--weight-interface);')
  expect(body(sheet('screens/Kiosk.module.css'), '.top > .sample')).toContain('font-size: var(--text-17);')
})

test('kiosk-1 the column fills the height up to its own and sits in the middle of a taller screen', () => {
  const screen = sheet('screens/Kiosk.module.css')
  const column = body(screen, '.column')
  expect(column).toContain('flex: 1;')
  expect(column).toContain('max-block-size: var(--column-block);')
  expect(column).toContain('margin: auto;')
  expect(body(screen, '.page')).toMatch(/--column-block: [\d.]+rem;/)
  // The page is the flex column the margins centre it in.
  expect(body(screen, '.page')).toContain('flex-direction: column;')
})

test('FR-KIOSK-07 "Still there?" has one 64 px control: Keep Going across the sheet, and ui\'s corner X hidden for this sheet only', () => {
  const still = sheet('components/StillThere.module.css')
  expect(body(still, '.keep')).toContain('flex: 1;')
  // Scoped by the sheet's own button, so every other dialog keeps its X.
  expect(body(still, ":global([role='dialog']):has(.keep) > :first-child > button")).toContain('display: none;')
  // Any key answers the sheet, so Keep Going shows no ring (forced-colors mode still draws one).
  expect(body(still, '.keep:focus-visible')).toContain('outline-color: transparent;')
  expect(rules(still).map(([s]) => s)).toEqual([
    '.keep',
    ":global([role='dialog']):has(.keep) > :first-child > button",
    ":global([role='dialog']):has(.keep) h2",
    ":global([role='dialog']):has(.keep) > p",
    '.keep:focus-visible',
  ])
})

test('B2-16 "Still there?" asks in the kiosk\'s title style, centred, with the countdown centred under it', () => {
  const still = sheet('components/StillThere.module.css')
  const question = body(still, ":global([role='dialog']):has(.keep) h2")
  for (const line of [
    'font-size: var(--text-32);',
    'font-weight: var(--weight-display);',
    'line-height: var(--leading-display);',
    'text-align: center;',
  ])
    expect(question).toContain(line)
  const countdown = body(still, ":global([role='dialog']):has(.keep) > p")
  expect(countdown).toContain('font-size: var(--text-21);')
  expect(countdown).toContain('text-align: center;')
})

test('B2-16 the name results sit two to a row, and a lone last one is centred under the pair', () => {
  const panel = sheet('components/Panel.module.css')
  expect(body(panel, '.hits')).toContain('flex-wrap: wrap;')
  expect(body(panel, '.hits')).toContain('justify-content: center;')
  expect(body(panel, '.hits > li')).toContain('flex: 0 0 calc((100% - var(--space-2)) / 2);')
})

test("B2-15 the join's first name keeps a line for its error while it is empty, so nothing under it moves", () => {
  expect(body(sheet('components/Panel.module.css'), '.reserve:has(> p:empty)')).toContain(
    'padding-block-end: calc(var(--text-18) * var(--leading-heading) + var(--space-1));',
  )
})

test("B2-02 the prompt's slot is at least two lines and centres its words", () => {
  const slot = body(sheet('screens/Kiosk.module.css'), '.slot')
  expect(slot).toContain('min-block-size: calc(2 * var(--text-18) * var(--leading-heading));')
  expect(slot).toContain('text-align: center;')
})

test('B2-01 under 760 px Check In and Join the Gym share one row, Check In first', () => {
  const screen = sheet('screens/Kiosk.module.css')
  const short = screen.split('@media (max-height: 47.5rem)')[1]?.split('@media')[0] ?? ''
  expect(body(short, '.keypadColumn > .actions')).toContain('grid-template-columns: minmax(0, 1fr) auto;')
  // The keys take the height the row gives back.
  expect(sheet('components/Keypad.module.css')).toContain('@media (max-height: 47.5rem)')
})
