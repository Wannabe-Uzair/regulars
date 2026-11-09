import type { CheckinToday, Kpis, MemberSummary, Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import {
  Button,
  buttonClass,
  CaretRightIcon,
  Card,
  EmptyState,
  Kpi,
  Panel,
  RollingNumber,
  StatusDot,
  useMediaQuery,
  UserPlusIcon,
} from '@tenure/ui'
import { useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { BoardTable } from '../../../shared/board/BoardTable.tsx'
import { useFreshCheckins } from '../../../shared/board/fresh.ts'
import { useCheckinToasts } from '../../../shared/board/useCheckinToasts.ts'
import { useGymFormat } from '../../../shared/format/useGymFormat.ts'
import { NudgeButton } from '../../../shared/nudge/NudgeButton.tsx'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useSession } from '../../../shared/session/session.ts'
import { useKioskPath, useToday } from '../api.ts'
import styles from './Today.module.css'
import { TodaySkeleton } from './TodaySkeleton.tsx'

/** Today shows the top of the board, as the old client did (BOARD_ROWS = 12). */
const BOARD_ROWS = 12
/** A phone shows the first 5 rows of Slipping Now and of Checked In Today, then "Show All {n}" (FR-TODAY-02, A17). */
const PHONE_ROWS = 5
/** The shell's own breakpoint: the tab bar below it, the sidebar above. */
const PHONE = '(width < 48rem)'

/**
 * Today (COPY §4): a live sentence over the four figures, who is slipping, who checked in today and the 90-day board.
 * Owner and coach see the same screen; the server scopes a coach's data to their own members. Every list keeps the
 * order the API gives.
 */
export default function Today() {
  const me = useSession().data
  const role = me?.user.role ?? 'owner'
  const title = t(role === 'coach' ? 'today.coach.title' : 'today.owner.title')
  const today = useToday()
  useCheckinToasts(today.data?.checkinsToday)
  const fresh = useFreshCheckins(today.data?.checkinsToday)
  // "Open the Kiosk" shows for owners in an empty gym and in an empty Checked In Today.
  const needsKiosk = today.data !== undefined && (!today.data.hasMembers || today.data.checkinsToday.length === 0)
  const kiosk = useKioskPath(role === 'owner' && needsKiosk)
  const kioskLink =
    role === 'owner' && kiosk.data !== undefined ? (
      <Link to={kiosk.data} className={buttonClass({ variant: 'secondary' })}>
        {t('today.empty.kiosk')}
      </Link>
    ) : undefined

  let body
  if (today.data) {
    const d = today.data
    // The board holds only first-90-days members, so whether the scope has any member at all is the server's to say.
    body = !d.hasMembers ? (
      <Card>
        <EmptyState
          symbol={<UserPlusIcon />}
          title={t(role === 'coach' ? 'today.empty.coachTitle' : 'today.empty.title')}
          body={t(role === 'coach' ? 'today.empty.coach' : 'today.empty.kioskBody')}
          action={kioskLink}
        />
      </Card>
    ) : (
      <>
        <Summary kpis={d.kpis} role={role} />
        <div className={styles.columns}>
          <Slipping members={d.slipping} showCoach={role === 'owner'} />
          <CheckedIn checkins={d.checkinsToday} kiosk={kioskLink} />
        </div>
        <Panel
          heading={t('today.board.title')}
          actions={
            <Link to="/app/board" className={buttonClass({ variant: 'secondary' })}>
              {t('today.board.open')}
            </Link>
          }
        >
          {/* No Nudge on the short board (flow-4C): Slipping Now above carries one for each slipping member. */}
          <BoardTable members={d.board.slice(0, BOARD_ROWS)} fresh={fresh} />
        </Panel>
      </>
    )
  } else if (today.isError) {
    body = (
      <div className={styles.error}>
        <p role="alert">{today.error.message}</p>
        <Button variant="primary" loading={today.isFetching} onClick={() => void today.refetch()}>
          {t('today.retry')}
        </Button>
      </div>
    )
  } else {
    body = <TodaySkeleton owner={role === 'owner'} />
  }

  return (
    <div className={styles.page}>
      <PageTitle title={title} />
      {body}
    </div>
  )
}

/** The live sentence (FR-TODAY-01): built from the figures each render, so every refetch rewrites it. */
function headline({ newMembers: total, slipping: n }: Kpis): string {
  if (total === 0) return t('today.headline.empty')
  if (n === 0) return t('today.headline.none', { total })
  if (n === 1) return t('today.headline.one', { total })
  return t('today.headline', { n, total })
}

/**
 * The summary platter (data-1): the sentence over the four figures on one surface, parted by hairlines. The figures and
 * the sentence's numbers roll to their value when they first show and whenever a refetch changes them. Slipping opens
 * the board filtered to Slipping, and Nudged this week opens Reports, for owners only (Reports is theirs alone).
 */
function Summary({ kpis, role }: { kpis: Kpis; role: Role }) {
  const nudged = (
    <Kpi
      label={<FigureLabel link={role === 'owner'}>{t('today.kpi.nudged')}</FigureLabel>}
      value={<RollingNumber value={kpis.nudgedThisWeek} />}
      hint={t('today.kpi.nudged.hint')}
    />
  )
  return (
    <Card className={styles.summary}>
      <h2 className={styles.headline}>
        <RollingNumber value={headline(kpis)} />
      </h2>
      <div className={styles.kpis}>
        <div className={styles.figure}>
          <Kpi label={t('today.kpi.new')} value={<RollingNumber value={kpis.newMembers} />} hint={t('today.kpi.new.hint')} />
        </div>
        <div className={styles.figure}>
          <Kpi
            label={t('today.kpi.onLine')}
            value={<RollingNumber value={kpis.onTheLinePct === null ? t('common.none') : `${kpis.onTheLinePct}%`} />}
            hint={t('today.kpi.onLine.hint')}
          />
        </div>
        <Link to="/app/board?status=slipping" className={`${styles.figure} ${styles.figureLink}`}>
          {/* The slipping triangle before the word, as on the chips and status tags (pick H2): the only red here. */}
          <Kpi
            label={
              <FigureLabel link>
                <StatusDot status="slipping" />
                {t('today.kpi.slipping')}
              </FigureLabel>
            }
            value={<RollingNumber value={kpis.slipping} />}
            hint={t('today.kpi.slipping.hint')}
            emphasis="attention"
          />
        </Link>
        {role === 'owner' ? (
          <Link to="/app/reports" className={`${styles.figure} ${styles.figureLink}`}>
            {nudged}
          </Link>
        ) : (
          <div className={styles.figure}>{nudged}</div>
        )}
      </div>
    </Card>
  )
}

/** A figure's label; a figure that opens a screen ends it with a soft chevron. */
function FigureLabel({ link = false, children }: { link?: boolean; children: ReactNode }) {
  return (
    <span className={styles.figureLabel}>
      {children}
      {link && <CaretRightIcon className={styles.chevron} />}
    </span>
  )
}

/**
 * "Last visit 9 days ago · Coach Priya S.", with the today, yesterday and no-visit forms. A member with no coach shows
 * the last-visit words alone, and so does every row of a coach's own list, where each member is theirs (FR-TODAY-02,
 * B2-22).
 */
function lastVisitLine(m: MemberSummary, showCoach: boolean): string {
  // The words after the last " · " (the coach) take no-break spaces, so a narrow row wraps before "Coach Mike R.", not in it.
  const text = lastVisitText(showCoach ? m.coachName : null, m.daysSinceLastVisit)
  return text.replace(/(?<= · ).*$/, (tail) => tail.replaceAll(' ', '\u00A0'))
}

function lastVisitText(coach: string | null, days: number | null): string {
  if (coach === null) {
    if (days === null) return t('member.lastVisit.never')
    if (days === 0) return t('member.lastVisit.today')
    if (days === 1) return t('member.lastVisit.yesterday')
    return t('member.lastVisit', { n: days })
  }
  if (days === null) return t('today.slipping.rowNever', { coach })
  if (days === 0) return t('today.slipping.rowToday', { coach })
  if (days === 1) return t('today.slipping.rowYesterday', { coach })
  return t('today.slipping.row', { n: days, coach })
}

/** Where a row link came from, for the member page's way back. */
function useFrom() {
  const { pathname, search } = useLocation()
  return { from: pathname + search }
}

/**
 * A list a phone cuts to its first 5 rows: `collapsed` while "Show All {n}" should show, and `showAll`, which shows the
 * rest and moves focus to the sixth row's link. A laptop shows every row.
 */
function usePhoneRows<T>(items: readonly T[]) {
  const phone = useMediaQuery(PHONE)
  const [expanded, setExpanded] = useState(false)
  const list = useRef<HTMLUListElement>(null)
  const collapsed = phone && !expanded && items.length > PHONE_ROWS
  const shown = collapsed ? items.slice(0, PHONE_ROWS) : items

  function showAll() {
    flushSync(() => setExpanded(true))
    list.current?.children[PHONE_ROWS]?.querySelector('a')?.focus()
  }

  return { list, collapsed, shown, showAll }
}

/**
 * Slipping Now as an inset list (flow-3B): each row is one link to the member, named with the name and the last visit,
 * and the tinted Nudge sits beside it, never inside it, so no chevron. On a phone the first 5 rows show, then
 * "Show All {n}", which shows the rest and moves focus to the sixth row.
 */
function Slipping({ members, showCoach }: { members: readonly MemberSummary[]; showCoach: boolean }) {
  const state = useFrom()
  const { list, collapsed, shown, showAll } = usePhoneRows(members)

  return (
    <Panel heading={t('today.slipping.title')}>
      {members.length === 0 ? (
        <EmptyState
          headingLevel={3}
          title={t('today.slipping.emptyTitle')}
          body={t('today.slipping.empty')}
          className={styles.empty}
        />
      ) : (
        <>
          <ul className={styles.list} ref={list}>
            {shown.map((m) => (
              <li key={m.id} className={styles.row}>
                <Link to={`/app/members/${m.id}`} state={state} className={styles.rowLink}>
                  <span className={styles.name}>{m.name}</span>
                  <span className={styles.meta}>{lastVisitLine(m, showCoach)}</span>
                </Link>
                <div className={styles.trailing}>
                  <NudgeButton member={m} label={t('today.slipping.nudge')} size="sm" />
                </div>
              </li>
            ))}
          </ul>
          {collapsed && (
            <Button variant="plain" size="sm" aria-expanded={false} className={styles.showAll} onClick={showAll}>
              {t('today.slipping.all', { n: members.length })}
            </Button>
          )}
        </>
      )}
    </Panel>
  )
}

/**
 * Today's check-ins as a front desk's sign-in sheet (pick K2): each row one link to the member, the time in the gym's
 * locale and time zone (FR-GLOBAL-03), the name, then a chevron, since no button trails it. On a phone the first 5 rows
 * show, then "Show All {n}", as Slipping Now does (A17). None yet: owners get "Open the Kiosk".
 */
function CheckedIn({ checkins, kiosk }: { checkins: readonly CheckinToday[]; kiosk: ReactNode }) {
  const format = useGymFormat()
  const state = useFrom()
  const { list, collapsed, shown, showAll } = usePhoneRows(checkins)
  return (
    <Panel heading={t('today.checkins.title')}>
      {checkins.length === 0 ? (
        <EmptyState
          headingLevel={3}
          title={t('today.checkins.emptyTitle')}
          body={t('today.checkins.empty')}
          action={kiosk}
          className={styles.empty}
        />
      ) : (
        <>
          <ul className={styles.list} ref={list}>
            {shown.map((c) => (
              <li key={`${c.memberId}@${c.at}`} className={styles.row}>
                <Link to={`/app/members/${c.memberId}`} state={state} className={`${styles.rowLink} ${styles.checkin}`}>
                  <time className={styles.time} dateTime={c.at}>
                    {t('today.checkins.time', { time: format.time(c.at) })}
                  </time>
                  <span className={styles.name}>{t('today.checkins.name', { name: c.name })}</span>
                  <CaretRightIcon className={styles.chevron} />
                </Link>
              </li>
            ))}
          </ul>
          {collapsed && (
            <Button variant="plain" size="sm" aria-expanded={false} className={styles.showAll} onClick={showAll}>
              {t('today.checkins.all', { n: checkins.length })}
            </Button>
          )}
        </>
      )}
    </Panel>
  )
}
