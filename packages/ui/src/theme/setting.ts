import type { ThemeName } from '../tokens.ts'

/** What the person chose: a theme, or `system` to follow the device. */
export type ThemeSetting = ThemeName | 'system'

/** The one localStorage key, which `writeThemeSetting` saves to. Pinned light, nothing reads it tonight. */
export const themeStorageKey = 'tenure.theme'

export const darkSchemeQuery = '(prefers-color-scheme: dark)'
export const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

/**
 * The choice the page starts from: always light. The page is pinned light (ARCHITECTURE §9, "One light theme"), so a
 * choice stored on an earlier visit and the device's preference are ignored, as the boot script ignores them.
 */
export function readThemeSetting(): ThemeSetting {
  return 'light'
}

/** Saves the choice on this device. A storage that throws leaves the choice for this visit only. */
export function writeThemeSetting(setting: ThemeSetting): void {
  try {
    window.localStorage.setItem(themeStorageKey, setting)
  } catch {
    // Private window or storage full: nothing to save to.
  }
}

/** Whether a media query matches. False where matchMedia is missing. */
export function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

export function resolveTheme(setting: ThemeSetting, deviceDark: boolean): ThemeName {
  if (setting !== 'system') return setting
  return deviceDark ? 'dark' : 'light'
}

/** Marks <html> for the frame a theme change lands in, so theme.css can stop transitions under it. */
export const themeSwitchingAttribute = 'data-theme-switching'

/**
 * Sets the theme on <html>, where tokens.css reads it. Transitions stop for the frame it changes in: the mark goes on,
 * the theme flips, styles are flushed so the new colours are computed with transitions off, and the mark comes off on
 * the next frame. Otherwise a label's colour would ease from the old theme for 120 ms, navy on navy.
 */
export function applyTheme(theme: ThemeName): void {
  const html = document.documentElement
  html.setAttribute(themeSwitchingAttribute, '')
  html.setAttribute('data-theme', theme)
  // Reading a computed value flushes styles.
  void window.getComputedStyle(html).getPropertyValue('color')
  window.requestAnimationFrame(() => html.removeAttribute(themeSwitchingAttribute))
}
