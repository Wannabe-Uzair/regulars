// What a page tells the browser and assistive tech about itself: its tab title, and focus on its h1 after navigating.
import { t } from '@tenure/copy'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/** Sets the tab title to "<page> · Regulars" (COPY §0: brand.name is the suffix); just "Regulars" without a page. */
export function usePageTitle(page?: string): void {
  useEffect(() => {
    document.title = page === undefined ? t('brand.name') : t('brand.pageTitle', { page, brand: t('brand.name') })
  }, [page])
}

/**
 * After each navigation to a new path (never on the first load), moves focus to the page's h1, so a screen reader
 * reads the new page from its title. A change of search or hash alone leaves focus where it is: filters live in the
 * URL, and typing in one must not lose the field. The router loads a lazy screen before it commits the new location,
 * so the h1 is there. The h1 is marked `data-route-focus`, never with the ring: `keyboard` when the last input was a key
 * (or there was none), and base.css shows its focus as a short bar beside it; `pointer` after a tap or click, and it
 * shows nothing (ARCHITECTURE §9). The modality is ours, since Safari's own :focus-visible keeps a key press's
 * modality through a later tap on a link.
 */
export function useFocusOnNavigate(): void {
  const { pathname } = useLocation()
  const firstPath = useRef(pathname)
  const navigated = useRef(false)
  const modality = useRef<'keyboard' | 'pointer'>('keyboard')
  useEffect(() => {
    // Captured on the document, so the input is known before the navigation it starts commits.
    const onKey = () => (modality.current = 'keyboard')
    const onPointer = () => (modality.current = 'pointer')
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer, true)
    }
  }, [])
  useEffect(() => {
    if (!navigated.current && pathname === firstPath.current) return
    navigated.current = true
    const heading = document.querySelector('h1')
    if (!heading) return
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
    heading.dataset.routeFocus = modality.current
    heading.focus()
  }, [pathname])
}
