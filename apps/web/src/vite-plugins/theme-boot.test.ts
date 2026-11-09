import { themeBootScript } from '@tenure/ui/boot-script'
import { expect, test } from 'vitest'
import { inlineThemeBoot, themeBoot } from './theme-boot.ts'

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" crossorigin href="/assets/index.css">
  </head>
  <body><div id="root"></div></body>
</html>`

test('inlines the exact boot script as a classic script before any stylesheet', () => {
  const out = inlineThemeBoot(page)
  const script = out.indexOf(`<script>${themeBootScript}</script>`)
  expect(script).toBeGreaterThan(out.indexOf('<head>'))
  expect(script).toBeLessThan(out.indexOf('<link rel="stylesheet"'))
  expect(out.match(/<script/g)).toHaveLength(1)
})

test('the plugin hands its index.html hook that transform, after Vite adds its links', () => {
  const hook = themeBoot().transformIndexHtml
  expect(hook).toEqual({ order: 'post', handler: inlineThemeBoot })
})

test('a page with no <head> fails the build', () => {
  expect(() => inlineThemeBoot('<html><body></body></html>')).toThrow(/no <head>/)
})
