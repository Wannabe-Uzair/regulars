// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

test('FR-SHELL-01 the toast stack sits clear of the tab bar by --toast-clearance, above the home indicator', () => {
  const css = readFileSync(new URL('./Toast.module.css', import.meta.url), 'utf8')
  const stack = css.split('\n.stack {\n')[1]?.split('}')[0] ?? ''
  expect(stack).toContain(
    'inset-block-end: calc(var(--space-4) + var(--toast-clearance) + env(safe-area-inset-bottom, 0));',
  )
})
