import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ThemeContext } from './context.ts'
import {
  applyTheme,
  darkSchemeQuery,
  mediaMatches,
  readThemeSetting,
  reducedMotionQuery,
  resolveTheme,
  writeThemeSetting,
  type ThemeSetting,
} from './setting.ts'

export type ThemeProviderProps = { children: ReactNode }

/** One crossfade where the browser has View Transitions and motion is welcome; otherwise none. */
function canCrossfade(): boolean {
  return typeof document.startViewTransition === 'function' && !mediaMatches(reducedMotionQuery)
}

/**
 * Owns the theme: reads the saved choice, keeps `data-theme` on <html> in step, follows the device while the choice is
 * `system`, and saves each new choice. A change on screen, from the toggle or from the device, goes through the one
 * crossfade. The crossfade itself is in `@tenure/ui/theme.css`.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [choice, setChoiceState] = useState(readThemeSetting)
  const [deviceDark, setDeviceDark] = useState(() => mediaMatches(darkSchemeQuery))
  const resolved = resolveTheme(choice, deviceDark)

  // A layout effect, so the attribute changes in the same commit as the state, inside the view transition.
  useLayoutEffect(() => applyTheme(resolved), [resolved])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(darkSchemeQuery)
    const onChange = (event: MediaQueryListEvent) => {
      // Under `system` the device's change is the theme on screen changing, so it crossfades as the toggle does.
      if (choice !== 'system' || !canCrossfade()) {
        setDeviceDark(event.matches)
        return
      }
      document.startViewTransition(() => flushSync(() => setDeviceDark(event.matches)))
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [choice])

  const setChoice = useCallback(
    (next: ThemeSetting) => {
      writeThemeSetting(next)
      if (resolveTheme(next, deviceDark) === resolved || !canCrossfade()) {
        setChoiceState(next)
        return
      }
      document.startViewTransition(() => flushSync(() => setChoiceState(next)))
    },
    [deviceDark, resolved],
  )

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice])
  return <ThemeContext value={value}>{children}</ThemeContext>
}
