// The page's large title and the phone's top bar: the shell offers a way to show the title in its bar, and PageTitle
// hands it its h1. Outside the shell (sign-in, invites, errors before a session) nothing is offered and nothing tucks.
import { createContext, useContext, useEffect, useRef, type RefObject } from 'react'

/** Shows `title` in the bar while `heading` (the page's h1) is scrolled under it; returns the cleanup. */
export type ShowBarTitle = (title: string, heading: HTMLElement) => () => void

export const BarTitleContext = createContext<ShowBarTitle | null>(null)

/** Offers the h1 behind the returned ref to the shell's bar, for as long as it shows `title`. */
export function useBarTitle(title: string): RefObject<HTMLHeadingElement | null> {
  const heading = useRef<HTMLHeadingElement>(null)
  const show = useContext(BarTitleContext)
  useEffect(() => {
    if (!show || !heading.current) return
    return show(title, heading.current)
  }, [show, title])
  return heading
}
