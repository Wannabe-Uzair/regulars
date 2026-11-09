import * as RadixTabs from '@radix-ui/react-tabs'
import clsx from 'clsx'
import type { ComponentProps } from 'react'
import styles from './Tabs.module.css'

export type TabsProps = Omit<ComponentProps<typeof RadixTabs.Root>, 'asChild' | 'orientation'>

/**
 * Tabs on Radix: arrow keys move between tabs and switch the panel as they go, Home and End jump to the ends. Holds a
 * TabList of Tabs and one TabPanel per tab, matched by `value`.
 */
export function Tabs({ className, ...rest }: TabsProps) {
  return <RadixTabs.Root {...rest} className={clsx(styles.tabs, className)} />
}

export type TabListProps = Omit<ComponentProps<typeof RadixTabs.List>, 'asChild' | 'aria-label'> & {
  /** The accessible name of the set of tabs, e.g. "Member views". */
  label: string
}

export function TabList({ label, className, ...rest }: TabListProps) {
  return <RadixTabs.List {...rest} aria-label={label} className={clsx(styles.list, className)} />
}

export type TabProps = Omit<ComponentProps<typeof RadixTabs.Trigger>, 'asChild'>

export function Tab({ className, ...rest }: TabProps) {
  return <RadixTabs.Trigger {...rest} className={clsx(styles.tab, className)} />
}

export type TabPanelProps = Omit<ComponentProps<typeof RadixTabs.Content>, 'asChild'>

export function TabPanel({ className, ...rest }: TabPanelProps) {
  return <RadixTabs.Content {...rest} className={clsx(styles.panel, className)} />
}
