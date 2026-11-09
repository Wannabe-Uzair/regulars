import { t } from '@tenure/copy'
import { Button, buttonClass, CaretDownIcon, CaretUpIcon, CopyField, Panel, useToast } from '@tenure/ui'
import { type ReactNode, useId, useState } from 'react'
import { qrSrc } from '../api.ts'
import styles from './settings.module.css'

type LinkProps = { link: string; label: string; copyLabel: string; copied: string; footer?: ReactNode }

/**
 * One link as its QR code first, the panel's line under it, then Show Link, which shows the link itself with its Copy
 * button (FR-GYM-03). Closed on every load. The QR image comes from the API, which draws only this gym's own links.
 * CopyField falls back to a selected textarea where the clipboard is withheld, as on plain HTTP at the stall.
 */
function LinkWithQr({ link, label, copyLabel, copied, footer }: LinkProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={styles.link}>
      <img className={styles.qr} src={qrSrc(link)} alt={t('phone.qr', { url: link })} />
      {footer}
      <Button
        className={styles.disclosure}
        variant="plain"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? t('settings.link.hide') : t('settings.link.show')}
        {open ? <CaretUpIcon className={styles.icon} /> : <CaretDownIcon className={styles.icon} />}
      </Button>
      <div className={styles.reveal} id={id} hidden={!open}>
        <CopyField
          value={link}
          label={label}
          copyLabel={copyLabel}
          failedMessage={t('common.copyFailed')}
          onCopied={() => toast.show({ message: copied })}
        />
      </div>
    </div>
  )
}

/**
 * Open on a Phone, on laptops only (a phone is already there): each LAN address as a QR code, the two steps under the
 * first, or `phone.none` when there is none.
 */
export function PhonePanel({ phoneUrls }: { phoneUrls: readonly string[] }) {
  const steps = (
    <div className={styles.steps}>
      <p>{t('phone.step1')}</p>
      <p>{t('phone.step2')}</p>
    </div>
  )
  return (
    <Panel className={styles.laptopOnly} heading={t('phone.title')}>
      <div className={styles.stack}>
        {phoneUrls.length === 0 ? (
          <p className={styles.soft}>{t('phone.none')}</p>
        ) : (
          phoneUrls.map((url, i) => (
            <LinkWithQr
              key={url}
              link={url}
              label={t('phone.title')}
              copyLabel={t('phone.copy')}
              copied={t('phone.copied')}
              footer={i === 0 ? steps : undefined}
            />
          ))
        )}
      </div>
    </Panel>
  )
}

/**
 * The kiosk: its QR code (the first LAN address in stall mode) with its line, the link behind Show Link, and "Open the
 * Kiosk", which opens it in a new tab on the address this browser already uses.
 */
export function KioskPanel({ kioskUrl, kioskPath }: { kioskUrl: string; kioskPath: string }) {
  return (
    <Panel heading={t('kiosk.set.title')}>
      <div className={styles.stack}>
        <LinkWithQr
          link={kioskUrl}
          label={t('kiosk.set.title')}
          copyLabel={t('kiosk.set.copy')}
          copied={t('kiosk.set.copied')}
          footer={<p className={styles.line}>{t('kiosk.set.body')}</p>}
        />
        <a className={`${buttonClass()} ${styles.open}`} href={kioskPath} target="_blank" rel="noopener noreferrer">
          {t('kiosk.set.open')}
        </a>
      </div>
    </Panel>
  )
}
