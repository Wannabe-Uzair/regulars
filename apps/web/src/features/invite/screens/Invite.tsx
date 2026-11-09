import { t } from '@tenure/copy'
import { buttonClass, Card, Logo, MeshBackground } from '@tenure/ui'
import { Link } from 'react-router'
import { usePageTitle } from '../../../shared/page/page.ts'
import styles from './Invite.module.css'

/**
 * /invite/:token: for now only the dead end of a bad link, in the sign-in page's card and layout. (A feature never imports another's files,
 * so the frame is restated here, not borrowed from auth.)
 */
export default function Invite() {
  usePageTitle(t('invite.bad.title'))
  return (
    <MeshBackground className={styles.ground}>
      <main className={styles.main}>
        <Card className={styles.card}>
          <div className={styles.head}>
            <div className={styles.brand}>
              <Logo name={t('brand.name')} />
              <p className={styles.descriptor}>{t('brand.tagline')}</p>
            </div>
            <h1 className={styles.title}>{t('invite.bad.title')}</h1>
            <p className={styles.lede}>{t('invite.bad')}</p>
          </div>
          <div className={styles.other}>
            <Link className={buttonClass({ variant: 'secondary' })} to="/login">
              {t('invite.bad.action')}
            </Link>
          </div>
        </Card>
      </main>
    </MeshBackground>
  )
}
