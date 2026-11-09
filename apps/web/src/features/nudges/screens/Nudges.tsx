import { useQuery } from '@tanstack/react-query'
import { type NudgeLogEntry, NudgesResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, buttonClass, Card, EmptyState, Tag } from '@tenure/ui'
import { Link } from 'react-router'
import { get } from '../../../shared/api/client.ts'
import { useGymFormat } from '../../../shared/format/useGymFormat.ts'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useSession } from '../../../shared/session/session.ts'
import styles from './Nudges.module.css'

const channelWords = {
  text: 'nudges.channel.text',
  whatsapp: 'nudges.channel.whatsapp',
  copy: 'nudges.channel.copy',
  'in-person': 'nudges.channel.inPerson',
} as const

const outcomeWords = { waiting: 'nudges.waiting', noVisit: 'nudges.noVisit' } as const

/**
 * /app/nudges, the nudges log (FR-NUDGE-06, TC-38): the last 30 days, newest first, each nudge's member (the row is
 * the link), the start of its message, when, who sent it and how, and whether the member came back. With none, the
 * empty state points to Today. Left out of the stall's navigation; before, the page was a title alone (audit B2-08).
 */
export default function Nudges() {
  const role = useSession().data?.user.role
  const log = useQuery({ queryKey: ['nudges'], queryFn: () => get('/api/nudges', NudgesResponse) })
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <PageTitle title={t('nudges.title')} />
        <p className={styles.sub}>{t(role === 'coach' ? 'nudges.subCoach' : 'nudges.sub')}</p>
      </div>
      {log.isError ? (
        <div className={styles.error}>
          <p role="alert">{log.error.message}</p>
          <Button onClick={() => void log.refetch()} loading={log.isFetching}>
            {t('common.retry')}
          </Button>
        </div>
      ) : log.data === undefined ? null : log.data.length === 0 ? (
        <EmptyState
          title={t('nudges.empty')}
          body={t('nudges.emptyBody')}
          action={
            <Link className={buttonClass({ variant: 'tinted' })} to="/app">
              {t('nudges.emptyAction')}
            </Link>
          }
        />
      ) : (
        <Card className={styles.card}>
          <ul className={styles.list}>
            {log.data.map((n) => (
              <NudgeRow key={n.id} nudge={n} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function NudgeRow({ nudge }: { nudge: NudgeLogEntry }) {
  const format = useGymFormat()
  return (
    <li>
      <Link className={styles.row} to={`/app/members/${nudge.memberId}`}>
        <span className={styles.top}>
          <span className={styles.name}>{nudge.memberName}</span>
          {nudge.outcome === 'cameBack' ? (
            <Tag>{t('nudges.cameBack')}</Tag>
          ) : (
            <span className={styles.outcome}>{t(outcomeWords[nudge.outcome])}</span>
          )}
        </span>
        <span className={styles.body}>{nudge.body}</span>
        <span className={styles.meta}>
          <time dateTime={nudge.at} className={styles.when}>
            {format.dateTime(nudge.at)}
          </time>
          {nudge.by !== null && <span>{nudge.by}</span>}
          {nudge.channel !== null && <span className={styles.channel}>{t(channelWords[nudge.channel])}</span>}
        </span>
      </Link>
    </li>
  )
}
