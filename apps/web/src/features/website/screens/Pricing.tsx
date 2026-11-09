import { t } from '@tenure/copy'
import { Link } from 'react-router'
import { usePageTitle } from '../../../shared/page/page.ts'
import styles from './Placeholder.module.css'

/** Placeholder until the website job; its tab title is the brand name alone. */
export default function Pricing() {
  usePageTitle()
  return (
    <main className={styles.page}>
      <h1>{t('signup.lede')}</h1>
      <p>
        <Link to="/signup">{t('signup.submit')}</Link>
      </p>
    </main>
  )
}
