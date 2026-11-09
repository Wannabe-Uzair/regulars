import { t } from '@tenure/copy'
import { Button, buttonClass, CaretDownIcon, Field, Panel, SignOutIcon, Skeleton, SkeletonGroup } from '@tenure/ui'
import type { ReactNode } from 'react'
import panelStyles from '../components/settings.module.css'
import styles from './Settings.module.css'
import own from './SettingsSkeleton.module.css'

/** One link's frame: a placeholder where its QR code will be, the panel's line under it, then Show Link. */
function LinkSkeleton({ footer }: { footer: ReactNode }) {
  return (
    <div className={panelStyles.link}>
      <Skeleton shape="block" className={panelStyles.qr} />
      {footer}
      <Button className={panelStyles.disclosure} variant="plain">
        {t('settings.link.show')}
        <CaretDownIcon className={panelStyles.icon} />
      </Button>
    </div>
  )
}

/**
 * Settings while it loads (FR-GYM-01, 03; audit B2-07): the same panels in order, with their titles, lines, labels and
 * buttons in their words, and placeholders where the gym's own parts will be: each QR code, and the name, Country and
 * time zone in their fields. Open on a Phone shows from 64rem and the Account group below it, as when loaded, so nothing
 * moves when the settings land.
 */
export function SettingsSkeleton() {
  return (
    <SkeletonGroup label={t('common.loading')} className={styles.panels}>
      <Panel heading={t('kiosk.set.title')}>
        <div className={panelStyles.stack}>
          <LinkSkeleton footer={<p className={panelStyles.line}>{t('kiosk.set.body')}</p>} />
          <span className={`${buttonClass()} ${panelStyles.open}`}>{t('kiosk.set.open')}</span>
        </div>
      </Panel>
      <Panel className={panelStyles.laptopOnly} heading={t('phone.title')}>
        <div className={panelStyles.stack}>
          <LinkSkeleton
            footer={
              <div className={panelStyles.steps}>
                <p>{t('phone.step1')}</p>
                <p>{t('phone.step2')}</p>
              </div>
            }
          />
        </div>
      </Panel>
      <Panel heading={t('settings.gym.title')}>
        <div className={panelStyles.form}>
          {(['settings.gym.name', 'settings.gym.country', 'settings.gym.tz'] as const).map((label) => (
            <Field key={label} label={t(label)}>
              <Skeleton shape="block" className={own.control} />
            </Field>
          ))}
          <Button className={panelStyles.save} variant="primary">
            {t('common.save')}
          </Button>
        </div>
      </Panel>
      <Panel className={panelStyles.noSidebar} heading={t('settings.account.title')}>
        <div className={panelStyles.stack}>
          <Button className={panelStyles.logout} variant="plain">
            <SignOutIcon className={panelStyles.icon} />
            {t('nav.logout')}
          </Button>
        </div>
      </Panel>
    </SkeletonGroup>
  )
}
