// The phone tab bar below 1024 px (FR-SHELL-01): the role's pages as tabs, each with its icon, and no More.
import type { Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import {
  CalendarDotIcon,
  ChartBarIcon,
  GearSixIcon,
  SquaresFourIcon,
  UsersIcon,
  type WeightedIconProps,
} from '@tenure/ui'
import type { ComponentType } from 'react'
import type { NavItem } from '../registry.ts'

export type Tab = NavItem & { icon: ComponentType<WeightedIconProps> }

/** The tabs, in order, with their own labels (the tab bar's words, which the nav's may outgrow) and icons. */
const TABS: readonly Tab[] = [
  {
    to: '/app',
    label: (role: Role) => t(role === 'owner' ? 'tab.owner.today' : 'tab.coach.today'),
    icon: CalendarDotIcon,
  },
  {
    to: '/app/board',
    label: (role: Role) => t(role === 'owner' ? 'tab.owner.board' : 'tab.coach.board'),
    icon: SquaresFourIcon,
  },
  {
    to: '/app/members',
    label: (role: Role) => t(role === 'owner' ? 'tab.owner.members' : 'tab.coach.members'),
    icon: UsersIcon,
  },
  { to: '/app/reports', label: () => t('tab.owner.reports'), icon: ChartBarIcon },
  { to: '/app/settings', label: () => t('tab.owner.settings'), icon: GearSixIcon },
]

/** The tabs the role's nav holds, so a page left out of the nav (or an owner page, for a coach) is no tab either. */
export function tabsFor(nav: readonly NavItem[]): Tab[] {
  return TABS.filter((tab) => nav.some((item) => item.to === tab.to))
}

/** The icon of the page at `to`, which the sidebar shows beside its label too; none for a page with no tab. */
export function iconFor(to: string): ComponentType<WeightedIconProps> | undefined {
  return TABS.find((tab) => tab.to === to)?.icon
}
