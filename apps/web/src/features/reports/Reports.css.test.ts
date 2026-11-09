// @vitest-environment node
// Reports' stylesheets: width queries in rem (F28), so a larger browser text size moves the screen with the shell.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const dir = fileURLToPath(new URL('./', import.meta.url))
const sheets = readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.module.css'))
  .map((file) => ({ file, css: readFileSync(dir + file, 'utf8') }))

test('FR-REPORT-01 every width query is written in rem, as the shell writes them (F28)', () => {
  const queries = sheets.flatMap(({ file, css }) => [...css.matchAll(/@(?:media|container) ([^{]+)\{/g)].map((m) => [file, m[1]]))
  expect(queries.length).toBeGreaterThan(0)
  for (const [file, query] of queries) {
    if (!/width/.test(query ?? '')) continue
    expect(query, file).toMatch(/\d(\.\d+)?rem\b/)
    expect(query, file).not.toMatch(/\dpx\b/)
  }
})

const sheet = (name: string) => sheets.find(({ file }) => file.endsWith(name))!.css
/** The declarations of the first rule whose selector is exactly `selector`, inside `within` when given. */
function rule(selector: string, within: string): string {
  const at = within.indexOf(`${selector} {`)
  expect(at, selector).toBeGreaterThanOrEqual(0)
  return within.slice(at, within.indexOf('}', at))
}

test("NFR-USE-01 the chart's gridlines are the separator hairline", () => {
  const grid = rule('.grid', sheet('VisitsChart.module.css'))
  expect(grid).toContain('stroke: var(--color-line);')
  expect(grid).toContain('stroke-width: var(--border-hairline);')
})

test('FR-REPORT-04 below 24rem the cohort cells tighten so the five columns fit a 390 px phone', () => {
  const css = sheet('CohortTable.module.css')
  expect(rule('.cohorts', css)).toContain('container-type: inline-size;')
  const at = css.indexOf('@container (width < 24rem) {')
  expect(at).toBeGreaterThanOrEqual(0)
  const inside = css.slice(at)
  expect(rule('.cohorts table :is(th, td)', inside)).toContain('padding-inline: var(--space-3) 0;')
  expect(rule('.cohorts table :is(th, td):first-child', inside)).toContain('padding-inline: 0 var(--space-1);')
})
