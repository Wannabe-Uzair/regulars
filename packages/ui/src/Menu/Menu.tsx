import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import clsx from 'clsx'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import styles from './Menu.module.css'

export type MenuProps = {
  /** The button that opens it. Give an icon-only trigger a label, e.g. an IconButton named "More for Dana". */
  trigger: ReactElement
  /** MenuItem and MenuSeparator elements. */
  children: ReactNode
  /** Which edge of the trigger the menu lines up with. Defaults to `start`; `end` suits a row's menu at the right. */
  align?: 'start' | 'end'
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/** A dropdown menu on Radix: arrow keys move through the items, Enter or Space chooses, Escape closes. */
export function Menu({ trigger, children, align = 'start', open, defaultOpen, onOpenChange }: MenuProps) {
  return (
    <RadixMenu.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content className={styles.content} align={align} sideOffset={4} collisionPadding={8}>
          {children}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  )
}

export type MenuItemTone = 'neutral' | 'danger'

export type MenuItemProps = Omit<ComponentProps<typeof RadixMenu.Item>, 'asChild'> & {
  /** `danger` for destructive items, e.g. "Remove member". Defaults to `neutral`. */
  tone?: MenuItemTone
}

/** One choice. `onSelect` runs when it is chosen, by click, Enter or Space, and the menu closes. */
export function MenuItem({ tone = 'neutral', className, ...rest }: MenuItemProps) {
  return <RadixMenu.Item {...rest} data-tone={tone} className={clsx(styles.item, styles[tone], className)} />
}

/** A line between groups of items. */
export function MenuSeparator() {
  return <RadixMenu.Separator className={styles.separator} />
}
