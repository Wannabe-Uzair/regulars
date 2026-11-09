// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// The mark applyTheme sets (setting.ts's themeSwitchingAttribute, which theme.test.tsx checks); setting.ts needs the
// DOM, so this node test names it itself.
const mark = '[data-theme-switching]'

test('NFR-USE-04 theme.css stops every transition while applyTheme marks <html>', () => {
  const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')
  expect(css).toContain(
    `${mark},\n${mark} *,\n${mark} *::before,\n${mark} *::after {\n  transition: none !important;\n}`,
  )
})
