import { t } from '@tenure/copy'
import { Button } from '@tenure/ui'
import { PageTitle } from '../shared/page/PageTitle.tsx'
import { reloadPage } from './reload.ts'
import styles from './RouteError.module.css'

type Props = {
  /** On its own (outside the shell) it is the page's <main>; inside the shell it sits in the shell's <main>. */
  page?: boolean
}

/**
 * What a route shows when its screen throws or its lazy chunk fails to load. Retry reloads the page: the router
 * remembers a failed lazy load for the life of the page, and after a deploy the old chunk names are gone anyway.
 */
export function RouteError({ page = false }: Props) {
  const Frame = page ? 'main' : 'div'
  return (
    <Frame className={page ? `${styles.error} ${styles.page}` : styles.error}>
      <PageTitle title={t('routeError.title')} />
      <p className={styles.body}>{t('routeError.body')}</p>
      <Button variant="primary" onClick={reloadPage}>
        {t('routeError.retry')}
      </Button>
    </Frame>
  )
}
