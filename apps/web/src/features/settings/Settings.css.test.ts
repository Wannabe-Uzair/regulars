// @vitest-environment node
// Settings' stylesheets: media queries in rem (F28), so a larger browser text size moves the screen with the shell.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const dir = fileURLToPath(new URL('./', import.meta.url))
const sheets = readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.module.css'))
  .map((file) => ({ file, css: readFileSync(dir + file, 'utf8') }))

test('FR-GYM-03 Open on a Phone shows from 64rem only', () => {
  const css = readFileSync(dir + 'components/settings.module.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  expect(css).toMatch(/@media \(width < 64rem\)\s*\{\s*\.laptopOnly\s*\{\s*display: none;\s*\}\s*\}/)
  const panels = readFileSync(dir + 'components/LinkPanels.tsx', 'utf8')
  expect(panels).toMatch(/<Panel className=\{styles\.laptopOnly\} heading=\{t\('phone\.title'\)\}>/)
})

test("FR-GYM-03 each QR code sits on its own white tile, edged in the card's hairline", () => {
  const css = readFileSync(dir + 'components/settings.module.css', 'utf8')
  const qr = /\.qr\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(qr).toContain('border: var(--border-hairline) solid var(--color-line);')
  expect(qr).toContain('box-sizing: border-box;')
})

test('FR-GYM-01 every width query is written in rem, as the shell writes them (F28)', () => {
  const queries = sheets.flatMap(({ file, css }) => [...css.matchAll(/@media ([^{]+)\{/g)].map((m) => [file, m[1]]))
  expect(queries.length).toBeGreaterThan(0)
  for (const [file, query] of queries) {
    if (!/width/.test(query ?? '')) continue
    expect(query, file).toMatch(/\d(\.\d+)?rem\b/)
    expect(query, file).not.toMatch(/\dpx\b/)
  }
})

test('FR-SHELL-01 the Account group shows below 64rem only, where the shell has no sidebar (audit B2-17)', () => {
  const css = readFileSync(dir + 'components/settings.module.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  expect(css).toMatch(/@media \(width >= 64rem\)\s*\{\s*\.noSidebar\s*\{\s*display: none;\s*\}\s*\}/)
  const account = readFileSync(dir + 'components/AccountPanel.tsx', 'utf8')
  expect(account).toMatch(/<Panel className=\{styles\.noSidebar\} heading=\{t\('settings\.account\.title'\)\}>/)
})
