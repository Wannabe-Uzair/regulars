import { t } from '@tenure/copy'
import { ChartBarIcon, GearSixIcon } from '@tenure/ui'
import { describe, expect, test } from 'vitest'
import type { NavItem } from '../registry.ts'
import { iconFor, tabsFor } from './tabs.ts'

const item = (to: string): NavItem => ({ to, label: () => to })
const paths = (items: readonly NavItem[]) => items.map((i) => i.to)

describe('tabsFor', () => {
  test("FR-SHELL-01 an owner's five pages are all tabs, in order, with no More", () => {
    const tabs = tabsFor(['/app', '/app/board', '/app/members', '/app/reports', '/app/settings'].map(item))
    expect(paths(tabs)).toEqual(['/app', '/app/board', '/app/members', '/app/reports', '/app/settings'])
    expect(tabs.map((tab) => tab.label('owner'))).toEqual([
      t('tab.owner.today'),
      t('tab.owner.board'),
      t('tab.owner.members'),
      t('tab.owner.reports'),
      t('tab.owner.settings'),
    ])
  })

  test("FR-SHELL-01 the tabs keep their own labels: a coach's Today tab reads as the tab copy says", () => {
    const [today] = tabsFor([item('/app')])
    expect(today?.label('coach')).toBe(t('tab.coach.today'))
    expect(today?.label('owner')).toBe(t('tab.owner.today'))
  })

  test('FR-SHELL-04 a page the nav leaves out is no tab', () => {
    expect(paths(tabsFor(['/app', '/app/members', '/app/nudges'].map(item)))).toEqual(['/app', '/app/members'])
  })
})

describe('iconFor', () => {
  test('FR-SHELL-02 the sidebar reads the same icon per page as the tabs, and none for a page with no tab', () => {
    expect(iconFor('/app/reports')).toBe(ChartBarIcon)
    expect(iconFor('/app/settings')).toBe(GearSixIcon)
    expect(iconFor('/app/nudges')).toBeUndefined()
  })
})
