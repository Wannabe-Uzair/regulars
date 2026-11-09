import { t } from '@tenure/copy'
import { Button, Card, EmptyState } from '@tenure/ui'
import { useTemplates } from '../../../shared/nudge/api.ts'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useSession } from '../../../shared/session/session.ts'
import styles from './Templates.module.css'

/**
 * /app/templates (FR-TPL-01): the gym's templates, each its name over its message, as the composer offers them. Read
 * only for now, for owners too: the editor comes after the stall, which leaves the page out of its navigation. Before,
 * the page was a title alone (audit B2-08).
 */
export default function Templates() {
  const role = useSession().data?.user.role
  const templates = useTemplates()
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <PageTitle title={t('templates.title')} />
        {role === 'coach' && <p className={styles.sub}>{t('templates.readOnly')}</p>}
      </div>
      {templates.isError ? (
        <div className={styles.error}>
          <p role="alert">{templates.error.message}</p>
          <Button onClick={() => void templates.refetch()} loading={templates.isFetching}>
            {t('common.retry')}
          </Button>
        </div>
      ) : templates.data === undefined ? null : templates.data.length === 0 ? (
        <EmptyState title={t('templates.empty')} body={t('templates.emptyBody')} />
      ) : (
        <ul className={styles.list}>
          {templates.data.map((template) => (
            <li key={template.id}>
              <Card className={styles.card}>
                <h2 className={styles.name}>{template.name}</h2>
                <p className={styles.body}>{template.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
