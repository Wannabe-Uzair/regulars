import type { Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import type { NavItem } from '../registry.ts'
import styles from './AppShell.module.css'
import { MarkedLink } from './MarkedLink.tsx'
import { tabsFor } from './tabs.ts'

type Props = { role: Role; nav: readonly NavItem[] }

/**
 * The bottom tab bar below 1024 px (FR-SHELL-01), a floating glass capsule on the nav layer: every page of the role's
 * nav that is a tab, each a filled icon over its one-word label, and no More. The open page's tab takes the tint and
 * `aria-current="page"`, and keeps both on a page under it (Settings on the import).
 */
export function TabBar({ role, nav }: Props) {
  return (
    <nav className={styles.tabBar} aria-label={t('a11y.tabbar')}>
      <ul className={styles.tabs}>
        {tabsFor(nav).map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <MarkedLink to={to} end={to === '/app'} className={styles.tab} markedClassName={styles.tabActive}>
              <Icon className={styles.tabIcon} weight="fill" />
              <span className={styles.tabLabel}>{label(role)}</span>
            </MarkedLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
