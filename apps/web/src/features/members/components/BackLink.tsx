// The member page's way back (FR-MEMBER-08, flow-5A): a chevron and the title of the page the member was opened from.
import { t } from '@tenure/copy'
import { buttonClass, CaretLeftIcon } from '@tenure/ui'
import { Link, useLocation } from 'react-router'
import { backFrom } from '../back.ts'
import styles from './BackLink.module.css'

/** Above the page's head in the loading, error and loaded views, so the h1 never moves (FR-SHELL-06). */
export function BackLink() {
  const back = backFrom(useLocation().state)
  return (
    <Link
      to={back.to}
      className={`${buttonClass({ variant: 'plain', size: 'sm' })} ${styles.back}`}
      aria-label={t('a11y.backTo', { page: back.word })}
    >
      <CaretLeftIcon className={styles.chevron} />
      {back.word}
    </Link>
  )
}
