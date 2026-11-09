// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

// The page every route shares (apps/web/index.html), and the files it links from apps/web/public.
const web = new URL('../../', import.meta.url)
const html = readFileSync(new URL('index.html', web), 'utf8')

describe('index.html', () => {
  test("FR-SHELL-01 the page runs under an iPhone's notch and home indicator, so the safe-area paddings take effect", () => {
    expect(html).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*"/)
  })

  test('FR-SHELL-07 the browser is told the page is light only, and its own bars take the ground', () => {
    expect(html).toContain('<meta name="color-scheme" content="only light" />')
    expect(html).toContain('<meta name="theme-color" content="#F2F2F7" />')
  })

  test("NFR-PERF-01 the page preloads Inter from the very file base.css's @font-face loads, so the build hashes one", () => {
    const tag = /<link\s[^>]*rel="preload"[^>]*>/.exec(html)?.[0] ?? ''
    const attrs = tag.replace(/\s+/g, ' ')
    expect(attrs).toContain(' as="font" type="font/woff2" crossorigin ')
    const font = new URL(/ href="([^"]+)"/.exec(attrs)?.[1] ?? 'missing', web)
    const ui = new URL('../../packages/ui/src/', web)
    expect(font.href).toBe(new URL('fonts/InterVariable.woff2', ui).href)
    expect(existsSync(font)).toBe(true)
    expect(readFileSync(new URL('base.css', ui), 'utf8')).toContain("src: url('./fonts/InterVariable.woff2')")
  })

  test('FR-SHELL-07 the tab is titled Regulars until a page names itself', () => {
    expect(html).toContain('<title>Regulars</title>')
  })

  test('FR-SHELL-07 every tab shows the Quarter mark on a white tile, with a PNG and a home-screen icon behind the SVG', () => {
    const links = [...html.matchAll(/<link rel="(icon|apple-touch-icon)" href="([^"]+)"/g)].map(([, rel, href]) => [
      rel,
      href,
    ])
    expect(links).toEqual([
      ['icon', '/favicon-32.png'],
      ['icon', '/favicon.svg'],
      ['apple-touch-icon', '/apple-touch-icon.png'],
    ])
    for (const [, href] of links) expect(existsSync(new URL(`public${href}`, web)), href).toBe(true)
    // Iris's light text and tint on white, light only: the baked quarter, with no mask, and the week's square.
    const svg = readFileSync(new URL('public/favicon.svg', web), 'utf8')
    expect(svg).toContain('<path d="M4.4 13.3V4.4A15.2 15.2 0 0 1 19.6 19.6H10.7V13.3Z" fill="#1D1D1F"/>')
    expect(svg).toContain('<rect x="4.4" y="14.6" width="5" height="5" rx="1.3" fill="#5444E4"/>')
    expect(svg).toContain('fill="#FFFFFF"')
    expect(svg).not.toContain('mask')
  })
})
