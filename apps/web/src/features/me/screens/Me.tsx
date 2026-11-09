import { t } from '@tenure/copy'
import { Button, Card, FactList, SignOutIcon } from '@tenure/ui'
import { useLogout, useSession } from '../../../shared/session/session.ts'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import styles from './Me.module.css'

/**
 * /app/me (FR-ME-01): the signed-in user's name, email, gym and role, then Log Out, a plain button in the tint as
 * Settings' Account group has it (audit A16). No theme choice (FR-SHELL-07). Left out of the stall's navigation;
 * before, the page was a title alone (audit B2-08). The shell only renders it with a session.
 */
export default function Me() {
  const me = useSession().data
  const logout = useLogout()
  if (!me) return null
  return (
    <div className={styles.page}>
      <PageTitle title={t('me.title')} />
      <Card>
        <FactList
          items={[
            { label: t('me.name'), value: me.user.name },
            { label: t('me.email'), value: me.user.email },
            { label: t('me.gym'), value: me.gym.name },
            { label: t('me.role'), value: t(me.user.role === 'owner' ? 'role.owner' : 'role.coach') },
          ]}
        />
      </Card>
      <div className={styles.actions}>
        <Button variant="plain" onClick={() => logout.mutate()} loading={logout.isPending}>
          <SignOutIcon />
          {t('me.logout')}
        </Button>
        {logout.isError && (
          <p className={styles.error} role="alert">
            {logout.error.message}
          </p>
        )}
      </div>
    </div>
  )
}
