import { t } from '@tenure/copy'
import { Button, Panel, SignOutIcon } from '@tenure/ui'
import { useLogout } from '../../../shared/session/session.ts'
import styles from './settings.module.css'

/**
 * Settings' last group: the owner's Log Out, below 64rem only, where the shell has no sidebar; from there the sidebar's
 * is the one (FR-SHELL-01, audit B2-17). There is no theme row: the page is light only. A plain button, tint words
 * with no fill, as Show Link is (audit A16). A leaf that runs the log-out itself, as ShellActions does, so the page's
 * own queries can't come back into the cleared cache between log-out and /login (FR-AUTH-05).
 */
export function AccountPanel() {
  const logout = useLogout()
  return (
    <Panel className={styles.noSidebar} heading={t('settings.account.title')}>
      <div className={styles.stack}>
        <Button className={styles.logout} variant="plain" onClick={() => logout.mutate()} loading={logout.isPending}>
          <SignOutIcon className={styles.icon} />
          {t('nav.logout')}
        </Button>
        {logout.isError && (
          <p className={styles.error} role="alert">
            {logout.error.message}
          </p>
        )}
      </div>
    </Panel>
  )
}
