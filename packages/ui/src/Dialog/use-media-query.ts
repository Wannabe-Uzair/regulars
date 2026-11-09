import { useCallback, useSyncExternalStore } from 'react'
import { mediaMatches } from '../theme/setting.ts'

/** Whether a media query matches, kept current as it changes. False where matchMedia is missing. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => mediaMatches(query),
    () => false,
  )
}
