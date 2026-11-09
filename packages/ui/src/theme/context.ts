import { createContext, use } from 'react'
import type { ThemeName } from '../tokens.ts'
import type { ThemeSetting } from './setting.ts'

export type ThemeState = {
  /** What the person chose. */
  choice: ThemeSetting
  /** The theme on screen. */
  resolved: ThemeName
  /** Saves the choice on this device and switches, with one crossfade where the browser can. */
  setChoice: (choice: ThemeSetting) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

/** The theme choice and the theme on screen. Needs a ThemeProvider above it. */
export function useTheme(): ThemeState {
  const state = use(ThemeContext)
  if (state === null) throw new Error('useTheme needs a ThemeProvider above it')
  return state
}
