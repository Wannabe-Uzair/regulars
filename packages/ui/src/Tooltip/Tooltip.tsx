import * as RadixTooltip from '@radix-ui/react-tooltip'
import { createContext, use, type ReactElement, type ReactNode } from 'react'
import styles from './Tooltip.module.css'

/** Hover delay before a tooltip shows. Focus shows it at once. */
const delayDuration = 400

const InProvider = createContext(false)

export type TooltipProviderProps = { children: ReactNode }

/**
 * Optional. Put one around the app so tooltips share one hover delay: once one is showing, moving to the next shows
 * it at once. A Tooltip outside any provider brings its own.
 */
export function TooltipProvider({ children }: TooltipProviderProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <InProvider value={true}>{children}</InProvider>
    </RadixTooltip.Provider>
  )
}

export type TooltipProps = {
  /** The short text it shows. It describes the trigger; it never replaces the trigger's own name. */
  content: ReactNode
  /** The element it describes, usually an IconButton. It must take focus. */
  children: ReactElement
  /** Defaults to `top`; it flips when there is no room. */
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/** A tooltip on Radix: shows on hover after a delay and on keyboard focus at once; Escape hides it. */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const inProvider = use(InProvider)
  const tooltip = (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content className={styles.content} side={side} sideOffset={6} collisionPadding={8}>
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
  if (inProvider) return tooltip
  return <RadixTooltip.Provider delayDuration={delayDuration}>{tooltip}</RadixTooltip.Provider>
}
