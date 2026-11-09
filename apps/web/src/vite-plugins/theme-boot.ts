// Runs in Node, inside vite.config.ts: import only the boot script's own path, never the @tenure/ui root (TSX).
import { themeBootScript } from '@tenure/ui/boot-script'
import type { Plugin } from 'vite'

const headOpen = /<head(\s[^>]*)?>/i

/** The page with the boot script as the first thing in <head>, ahead of every stylesheet. */
export function inlineThemeBoot(html: string): string {
  const head = headOpen.exec(html)
  if (!head) throw new Error('index.html has no <head> for the theme boot script')
  const at = head.index + head[0].length
  return `${html.slice(0, at)}\n    <script>${themeBootScript}</script>${html.slice(at)}`
}

/**
 * Inlines the theme boot script as a classic inline <script>, so `data-theme` is set before the first paint and the
 * page never flashes the other theme (docs/ARCHITECTURE.md §9). It runs after Vite has added its stylesheet links.
 */
export function themeBoot(): Plugin {
  return {
    name: 'tenure:theme-boot',
    transformIndexHtml: { order: 'post', handler: inlineThemeBoot },
  }
}
