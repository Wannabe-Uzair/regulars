import { t } from '@tenure/copy'
import { Button, SignOutIcon } from '@tenure/ui'
import { useLogout } from '../../shared/session/session.ts'

type Props = {
  className: string | undefined
  errorClassName: string | undefined
  /** The sign-out icon's class: the sidebar shows it from 1024 px, the coach's phone header doesn't. */
  iconClassName: string | undefined
  /** The button's own class, so the sidebar can line it up with the nav items above it. */
  buttonClassName: string | undefined
}

/**
 * Log out, with its error line under it: at the sidebar's foot from 1024 px, and for a coach in the phone header below
 * it (owners log out from Settings' Account group there). There is no theme choice: the page is pinned light
 * (ARCHITECTURE §9). A leaf, so the log-out's progress re-renders only this. If the shell around it re-rendered between
 * log-out's cache clear and /login, its queries (the pilot day's billing) would come back into the cleared cache
 * (FR-AUTH-05).
 */
export function ShellActions({ className, errorClassName, iconClassName, buttonClassName }: Props) {
  const logout = useLogout()
  return (
    <>
      <div className={className}>
        <Button variant="quiet" className={buttonClassName} onClick={() => logout.mutate()} loading={logout.isPending}>
          <SignOutIcon className={iconClassName} />
          {t('nav.logout')}
        </Button>
      </div>
      {logout.isError && (
        <p className={errorClassName} role="alert">
          {logout.error.message}
        </p>
      )}
    </>
  )
}
