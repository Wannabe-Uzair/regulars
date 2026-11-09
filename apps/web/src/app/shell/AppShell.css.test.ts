// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

// The shell is laid out by CSS, so the DOM is the same at every width (ARCHITECTURE §2, "App shell"): below 1024 px a
// header row and a bottom tab bar, from 1024 px a sidebar. These pin the rules that make each width.
const css = readFileSync(new URL('./AppShell.module.css', import.meta.url), 'utf8')

/** The stylesheet outside any media query. */
const base = css.replace(/\n@media [^{]*\{\n[\s\S]*?\n\}\n/g, '\n')

/** The body of the media query that starts with `query`. */
function media(query: string): string {
  const start = css.indexOf(`@media ${query} {`)
  expect(start, query).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('\n}\n', start))
}

// In rem, so a larger browser text size moves the shell and the screens together (F28): 64rem is 1024 px, 48rem 768 px.
const tablet = media('(width < 64rem)')
const phone = media('(width < 48rem)')
const wide = media('(width >= 64rem)')
const hover = media('(hover: hover)')

/** The declarations of a rule, matched at the start of a line (indented inside a media query). */
function rule(sheet: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\n *${escaped} \\{\\n([^}]*)\\}`).exec(sheet)?.[1] ?? ''
}

const touchTarget = 'min-block-size: calc(var(--space-10) + var(--space-1));'

describe('below 1024 px', () => {
  test('FR-SHELL-01 the header has no logo and no nav: the tab bar holds the pages', () => {
    expect(rule(base, '.home')).toContain('display: none;')
    expect(rule(base, '.navArea')).toContain('display: none;')
  })

  test('FR-SHELL-01 the tab bar is fixed to the bottom on the nav layer', () => {
    expect(rule(base, '.tabBar')).toContain('position: fixed;')
    expect(rule(base, '.tabBar')).toContain('z-index: var(--layer-nav);')
  })

  test('FR-SHELL-01 the tab bar is a glass capsule on the float shadow, the top bar glass over a hairline, from tokens', () => {
    const tabBar = rule(base, '.tabBar')
    expect(tabBar).toContain('background-color: var(--color-material-tabs);')
    expect(tabBar).toContain('-webkit-backdrop-filter: var(--material-tabs-filter);')
    expect(tabBar).toContain('\n  backdrop-filter: var(--material-tabs-filter);')
    expect(tabBar).toContain('box-shadow: var(--shadow-float);')
    expect(tabBar).toContain('border-radius: var(--radius-full);')
    expect(tabBar).toContain('border: var(--border-hairline) solid var(--color-line);')
    expect(tabBar).toContain('inset-block-end: calc(var(--space-2) + env(safe-area-inset-bottom, 0px));')
    expect(tabBar).toContain('max(var(--space-4), env(safe-area-inset-left, 0px))')
    const header = rule(base, '.header')
    expect(header).toContain('position: sticky;')
    expect(header).toContain('background-color: var(--color-material-bar);')
    expect(header).toContain('-webkit-backdrop-filter: var(--material-bar-filter);')
    expect(header).toContain('\n  backdrop-filter: var(--material-bar-filter);')
    expect(header).toContain('border-block-end: var(--border-hairline) solid var(--color-line);')
    expect(header).toContain('env(safe-area-inset-top, 0px)')
    // tokens.css makes both opaque under the fallbacks, so the shell writes no query of its own for them.
    expect(css).not.toContain('@supports')
    expect(css).not.toContain('prefers-')
  })

  test('FR-SHELL-01 nothing on the bars is text-soft: the gym name, the pilot day and the tabs are in text', () => {
    for (const selector of ['.header', '.gym', '.pilot', '.tabBar', '.tab', '.tabIcon', '.tabLabel', '.tabActive'])
      expect(rule(base, selector), selector).not.toContain('--color-text-soft')
    for (const sheet of [tablet, phone]) expect(sheet).not.toContain('--color-text-soft')
    expect(rule(base, '.gym')).toContain('color: var(--color-text);')
    expect(rule(base, '.pilot')).toContain('color: var(--color-text);')
    expect(rule(base, '.tab')).toContain('color: var(--color-text);')
    // The Sample data tag's words are text-soft, so the tag is opaque on the glass.
    expect(rule(base, '.sample')).toContain('background-color: var(--color-surface);')
  })

  test('FR-SHELL-01 tabs and the sidebar links (the nav-item rule, .link) are 44 px touch targets', () => {
    expect(rule(base, '.tab')).toContain(touchTarget)
    expect(rule(base, '.link')).toContain(touchTarget)
  })

  test('FR-SHELL-01 toasts and the page clear the tab bar while it shows', () => {
    const root = rule(tablet, ':global(:root):has(.tabBar)')
    expect(root).toContain('--tab-bar-size: calc(')
    expect(root).toContain('--toast-clearance: var(--tab-bar-size);')
    expect(rule(base, '.main')).toContain('var(--tab-bar-size, 0px)')
    expect(rule(phone, '.main')).toContain('var(--tab-bar-size, 0px)')
  })

  test("FR-SHELL-01 the header holds an owner's gym name alone, and a coach's Log Out after it", () => {
    expect(rule(base, '.actions')).toContain('display: none;')
    expect(rule(base, '.coachActions')).toContain('display: flex;')
    expect(css.indexOf('\n.coachActions {')).toBeGreaterThan(css.indexOf('\n.actions {'))
    // The sign-out icon is the sidebar's: a quiet Log Out alone in the phone header.
    expect(rule(base, '.logoutIcon')).toContain('display: none;')
    expect(rule(wide, '.logoutIcon')).toContain('display: block;')
  })

  test("FR-SHELL-01 a coach's Log Out reaches into the gutter as a bar button does, and the demo gym's name keeps its room", () => {
    expect(rule(base, '.coachActions')).toContain('margin-inline-end: calc(-1 * var(--space-3));')
    expect(rule(phone, '.gymArea')).toContain('gap: var(--space-2);')
    // The sidebar's foot takes the pull back.
    expect(rule(wide, '.actions')).toContain('margin-inline-end: 0;')
  })

  test("FR-SHELL-01 the header, the main column and the tab bar keep clear of a sideways phone's notch", () => {
    for (const selector of ['.header', '.main', '.tabBar']) {
      expect(rule(base, selector), selector).toContain('env(safe-area-inset-left, 0px)')
      expect(rule(base, selector), selector).toContain('env(safe-area-inset-right, 0px)')
    }
    for (const selector of ['.header', '.main']) {
      expect(rule(phone, selector), selector).toContain('env(safe-area-inset-left, 0px)')
    }
  })

  test('FR-SHELL-03 the pilot day shows from 768 px, and not on a phone', () => {
    expect(rule(base, '.pilot')).not.toContain('display: none;')
    expect(rule(phone, '.pilot')).toContain('display: none;')
  })
})

describe('from 1024 px', () => {
  test('FR-SHELL-02 the frame has a sidebar column, and the main column may still be narrower than its content', () => {
    expect(rule(wide, '.frame')).toContain('grid-template-columns: 14.5rem minmax(0, 1fr);')
  })

  test('FR-SHELL-02 the header is a full-height sticky column on the nav layer, with the actions at its foot', () => {
    const header = rule(wide, '.header')
    expect(header).toContain('position: sticky;')
    expect(header).toContain('block-size: 100dvh;')
    expect(header).toContain('flex-direction: column;')
    expect(header).toContain('z-index: var(--layer-nav);')
    expect(rule(wide, '.actions')).toContain('margin-block-start: auto;')
  })

  test('FR-SHELL-02 the logo and the nav show, the tab bar goes, and nav links are 44 px targets', () => {
    expect(rule(wide, '.home')).toContain('display: flex;')
    expect(rule(wide, '.navArea')).toContain('display: block;')
    expect(rule(wide, '.tabBar')).toContain('display: none;')
    expect(rule(base, '.link')).toContain(touchTarget)
  })

  test('FR-SHELL-02 the sidebar foot keeps Log out, a row as wide as the nav items, its icon and words lined up with theirs', () => {
    expect(rule(wide, '.actions')).toContain('display: flex;')
    expect(rule(wide, '.actions')).toContain('align-items: stretch;')
    const logout = rule(wide, '.actions .logout')
    expect(logout).toContain('justify-content: flex-start;')
    // A nav item's padding, less the button's edge.
    expect(rule(base, '.link')).toContain('padding: 0 var(--space-3);')
    expect(logout).toContain('padding-inline: calc(var(--space-3) - var(--border-thin));')
    // The nav item's gap, which the button's own (space-2) reaches with the icon's margin.
    expect(rule(base, '.link')).toContain('gap: var(--space-3);')
    expect(rule(wide, '.logoutIcon')).toContain('margin-inline-end: var(--space-1);')
  })

  test("FR-SHELL-03 while billing loads the sidebar holds the pilot day's line, as tall as the line, and hides it below (audit B2-06)", () => {
    expect(rule(base, '.pilotSlot')).toContain('display: none;')
    const slot = rule(wide, '.pilotSlot')
    expect(slot).toContain('display: block;')
    // .pilot's 14 px at the body's leading, which it inherits.
    expect(slot).toContain('block-size: calc(var(--text-14) * var(--leading-body));')
    expect(rule(base, '.pilot')).toContain('font-size: var(--text-14);')
  })

  test('FR-SHELL-02 the sidebar is opaque surface, with no glass', () => {
    const header = rule(wide, '.header')
    expect(header).toContain('background-color: var(--color-surface);')
    expect(header).toContain('-webkit-backdrop-filter: none;')
    expect(header).toContain('\n    backdrop-filter: none;')
  })
})

describe('the nav items', () => {
  test('FR-SHELL-01 the sidebar items are 16 px; the tabs are 12 px labels under 24 px icons', () => {
    expect(rule(base, '.link')).toContain('font-size: var(--text-16);')
    expect(rule(base, '.link')).toContain('font-weight: var(--weight-interface);')
    expect(rule(base, '.tab')).toContain('font-size: var(--text-12);')
    expect(rule(base, '.tab')).toContain('flex-direction: column;')
    expect(rule(base, '.tabIcon')).toContain('font-size: var(--text-24);')
  })

  test('FR-SHELL-02 the current sidebar page is a soft tinted capsule; FR-SHELL-01 the open tab takes the tint, no fill', () => {
    expect(rule(base, '.active')).toContain('background-color: var(--color-tint-fill);')
    expect(rule(base, '.active')).toContain('color: var(--color-on-tint-fill);')
    expect(rule(base, '.link')).toContain('border-radius: var(--radius-full);')
    expect(rule(base, '.tabActive')).toContain('color: var(--color-tint);')
    expect(rule(base, '.tabActive')).not.toContain('background')
  })

  test('FR-SHELL-01 the other items hover as quiet buttons do, only where a pointer can hover', () => {
    const others = rule(hover, '.link:not(.active):hover,\n  .tab:not(.tabActive):hover')
    expect(others).toContain('background-color: var(--color-highlight);')
    expect(others).toContain('color: var(--color-text);')
    for (const selector of ['.link', '.tab'])
      expect(rule(base, selector), selector).toContain('background-color var(--motion-fast) var(--ease-standard)')
  })

  test('FR-SHELL-01 a pressed item goes one step past hover, the current one too', () => {
    expect(rule(base, '.link:not(.active):active,\n.tab:not(.tabActive):active')).toContain(
      'background-color: var(--color-highlight-press);',
    )
    expect(rule(base, '.active:active')).toContain('background-color: var(--color-tint-fill-press);')
    expect(rule(base, '.tabActive:active')).toContain('background-color: var(--color-highlight-press);')
  })
})

test('the media queries are in rem, so a larger browser text size moves the shell too', () => {
  expect([...css.matchAll(/@media [^{]*/g)].map(([query]) => query.trim())).toEqual([
    '@media (hover: hover)',
    '@media (width < 64rem)',
    '@media (width < 48rem)',
    '@media (width >= 64rem)',
  ])
})
