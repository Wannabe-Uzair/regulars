import { t } from '@tenure/copy'
import { buttonClass, CaretRightIcon, Card, Kpi, Panel, Skeleton, SkeletonGroup, StatusDot } from '@tenure/ui'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BoardSkeleton } from '../../../shared/board/BoardSkeleton.tsx'
import styles from './Today.module.css'
import own from './TodaySkeleton.module.css'

/** Placeholder rows under Slipping Now and Checked In Today, the names' widths in turn. */
const SLIPPING = ['40%', '52%', '34%']
const CHECKINS = ['45%', '32%', '50%']
/** The short board's placeholder rows. */
const BOARD_ROWS = 6

/**
 * Today while it loads (FR-TODAY-01): the same platter, panels and board, with the titles, the figures' labels and
 * hints in their words and placeholders where the counts, names and weeks will be. Only the words that come from the
 * gym wait; the frame is there at once, so nothing moves when they land.
 */
export function TodaySkeleton({ owner }: { owner: boolean }) {
  return (
    <SkeletonGroup label={t('common.loading')} className={styles.page}>
      <Card className={styles.summary}>
        <Skeleton shape="lines" className={`${styles.headline} ${own.headline}`} />
        <div className={styles.kpis}>
          <Figure label={t('today.kpi.new')} hint={t('today.kpi.new.hint')} />
          <Figure label={t('today.kpi.onLine')} hint={t('today.kpi.onLine.hint')} />
          <Figure
            label={
              <FigureLabel link>
                <StatusDot status="slipping" />
                {t('today.kpi.slipping')}
              </FigureLabel>
            }
            hint={t('today.kpi.slipping.hint')}
          />
          <Figure
            label={<FigureLabel link={owner}>{t('today.kpi.nudged')}</FigureLabel>}
            hint={t('today.kpi.nudged.hint')}
          />
        </div>
      </Card>
      <div className={styles.columns}>
        <Panel heading={t('today.slipping.title')}>
          <ul className={styles.list}>
            {SLIPPING.map((width) => (
              <li key={width} className={styles.row}>
                <span className={styles.rowLink}>
                  <Skeleton shape="row" count={2} width={width} className={own.slipping} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel heading={t('today.checkins.title')}>
          <ul className={styles.list}>
            {CHECKINS.map((width) => (
              <li key={width} className={styles.row}>
                <span className={`${styles.rowLink} ${styles.checkin}`}>
                  <Skeleton width="3.5em" className={`${styles.time} ${own.time}`} />
                  <Skeleton width={width} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel heading={t('today.board.title')} actions={
          <Link to="/app/board" className={buttonClass({ variant: 'secondary' })}>
            {t('today.board.open')}
          </Link>
        }>
        <BoardSkeleton rows={BOARD_ROWS} />
      </Panel>
    </SkeletonGroup>
  )
}

function Figure({ label, hint }: { label: ReactNode; hint: string }) {
  return (
    <div className={styles.figure}>
      <Kpi label={label} value={<Skeleton width="1.6em" />} hint={hint} />
    </div>
  )
}

/** As Today's: a figure that opens a screen ends its label with a soft chevron. */
function FigureLabel({ link = false, children }: { link?: boolean; children: ReactNode }) {
  return (
    <span className={styles.figureLabel}>
      {children}
      {link && <CaretRightIcon className={styles.chevron} />}
    </span>
  )
}
