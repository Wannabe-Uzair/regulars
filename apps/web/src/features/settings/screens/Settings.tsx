import { t } from '@tenure/copy'
import { Button } from '@tenure/ui'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useSettings } from '../api.ts'
import { AccountPanel } from '../components/AccountPanel.tsx'
import { GymPanel } from '../components/GymPanel.tsx'
import { KioskPanel, PhonePanel } from '../components/LinkPanels.tsx'
import styles from './Settings.module.css'
import { SettingsSkeleton } from './SettingsSkeleton.tsx'

/**
 * /app/settings, owner only (COPY §11): the kiosk's and the phone's QR codes first (Open on a Phone on laptops only),
 * then the gym form (FR-GYM-01 to 03), then the Account group with the owner's Log Out (FR-SHELL-01). The import box
 * waits: the import isn't in the stall version.
 */
export default function Settings() {
  const settings = useSettings()

  let body
  if (settings.data) {
    const s = settings.data
    body = (
      <div className={styles.panels}>
        <KioskPanel kioskUrl={s.kioskUrl} kioskPath={s.kioskPath} />
        <PhonePanel phoneUrls={s.phoneUrls} />
        <GymPanel gym={s.gym} />
        <AccountPanel />
      </div>
    )
  } else if (settings.isError) {
    // Log Out stays reachable when Settings can't load: on a phone it is the owner's only one.
    body = (
      <>
        <div className={styles.error}>
          <p role="alert">{settings.error.message}</p>
          <Button variant="primary" loading={settings.isFetching} onClick={() => void settings.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
        <div className={styles.panels}>
          <AccountPanel />
        </div>
      </>
    )
  } else {
    body = <SettingsSkeleton />
  }

  return (
    <div className={styles.page}>
      <PageTitle title={t('settings.title')} />
      {body}
    </div>
  )
}
