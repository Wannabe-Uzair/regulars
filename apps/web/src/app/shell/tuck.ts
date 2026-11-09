// The phone's large title tucking into the top bar, as on iOS (ARCHITECTURE §2, "App shell"). Below 48rem an
// IntersectionObserver watches the page's h1 against the viewport under the bar: once half the title has passed under
// the bar, the bar carries `data-tucked`, and its CSS fades the gym name out and the small title in. No scroll handler
// and no layout from script: the bar's height is read once per title.
import { useMediaQuery } from '@tenure/ui'
import { useCallback, useRef, useState, type RefObject } from 'react'
import type { ShowBarTitle } from '../../shared/page/bar-title.ts'

/** Where the bar is a top bar with the large title under it; from 48rem titles stay in the content. */
export const TUCK_QUERY = '(width < 48rem)'

/**
 * The bar's half: `show` for BarTitleContext, and the title the bar shows (null when there's none to show: from 48rem,
 * or with no page title).
 */
export function useTuck(bar: RefObject<HTMLElement | null>): { show: ShowBarTitle; title: string | null } {
  const phone = useMediaQuery(TUCK_QUERY)
  const [title, setTitle] = useState<string | null>(null)
  // The title that holds the bar now: a page leaving clears only its own.
  const holder = useRef<object | null>(null)
  const show = useCallback<ShowBarTitle>(
    (next, heading) => {
      const header = bar.current
      if (!phone || !header || typeof IntersectionObserver !== 'function') return () => {}
      const self = {}
      holder.current = self
      setTitle(next)
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return
          // Tucked once half the title is up under the bar, so a scroll that stops part-way shows one title, never
          // none and never two (audit B2-05); a title cut off at the bottom, below the fold (never, at the page's top),
          // isn't.
          const under = entry.intersectionRatio < 0.5 && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)
          header.toggleAttribute('data-tucked', under)
        },
        { rootMargin: `-${header.offsetHeight}px 0px 0px 0px`, threshold: 0.5 },
      )
      observer.observe(heading)
      return () => {
        observer.disconnect()
        if (holder.current !== self) return
        holder.current = null
        header.removeAttribute('data-tucked')
        setTitle(null)
      }
    },
    [bar, phone],
  )
  return { show, title }
}
