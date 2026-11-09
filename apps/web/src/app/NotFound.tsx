import { t } from '@tenure/copy'
import { buttonClass, Card, Logo, MeshBackground } from '@tenure/ui'
import { Link } from 'react-router'
import { PageTitle } from '../shared/page/PageTitle.tsx'
import styles from './NotFound.module.css'

type Props = {
  /** Inside the shell (a bad /app link) it sits in the shell's <main> and goes back to Today; on its own it is the
   * page's <main>, in the bad invite's centred card with the mark, and goes to the home page. */
  inShell?: boolean
}

/** One look in and out of the shell, and on Member Not Found (B2-09): the title, the sentence and one tinted way back. */
export function NotFound({ inShell = false }: Props) {
  const title = <PageTitle title={t('notFound.title')} />
  const link = (
    <Link className={buttonClass({ variant: 'tinted' })} to={inShell ? '/app' : '/'}>
      {t(inShell ? 'shell.notFound.link' : 'notFound.link')}
    </Link>
  )
  if (inShell)
    return (
      <div className={styles.body}>
        {title}
        <p className={styles.line}>{t('shell.notFound.body')}</p>
        {link}
      </div>
    )
  // Out of the shell, the frame the bad invite and Log In use: the blended ground, then a card in the middle with the
  // mark and the tagline over the title. app/ doesn't reach into a feature's files, so the frame is restated here, as
  // Invite restates it from auth.
  return (
    <MeshBackground className={styles.ground}>
      <main className={styles.main}>
        <Card className={styles.card}>
          <div className={styles.head}>
            <div className={styles.brand}>
              <Logo name={t('brand.name')} />
              <p className={styles.descriptor}>{t('brand.tagline')}</p>
            </div>
            {title}
            <p className={styles.line}>{t('notFound.body')}</p>
          </div>
          <div className={styles.other}>{link}</div>
        </Card>
      </main>
    </MeshBackground>
  )
}
