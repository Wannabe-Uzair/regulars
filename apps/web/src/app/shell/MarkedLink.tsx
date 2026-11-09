import type { ReactNode } from 'react'
import { Link, matchPath } from 'react-router'
import { useMarkedPath } from './mark.ts'

type Props = {
  to: string
  /** Marked on this path only, not on the paths under it (Today, at /app). */
  end?: boolean
  className: string | undefined
  /** Added while the item is marked. */
  markedClassName: string | undefined
  onClick?: () => void
  /** The item's content, or a function of whether it's marked (the sidebar and the tabs swap to the Fill icon). */
  children: ReactNode | ((marked: boolean) => ReactNode)
}

/**
 * A nav link marked while its page, or a page under it, is open or loading, or while a member opened from its page is
 * (mark.ts). A change of search or hash alone keeps the mark. The marked link carries `aria-current="page"`
 * (FR-SHELL-01), so what is read out and what is shown agree.
 */
export function MarkedLink({ to, end = false, className, markedClassName, onClick, children }: Props) {
  const marked = matchPath({ path: to, end }, useMarkedPath()) !== null
  return (
    <Link
      to={to}
      className={marked ? `${className} ${markedClassName}` : className}
      aria-current={marked ? 'page' : undefined}
      onClick={onClick}
    >
      {typeof children === 'function' ? children(marked) : children}
    </Link>
  )
}
