import type { MeResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, Logo, Tag } from '@tenure/ui'
import { createElement, type MouseEvent, useMemo, useRef } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { useLiveEvents } from '../../shared/live/live.ts'
import { BarTitleContext } from '../../shared/page/bar-title.ts'
import { returnState, useSession } from '../../shared/session/session.ts'
import { Loading } from '../Loading.tsx'
import { liveFor, navFor, type WebFeature } from '../registry.ts'
import styles from './AppShell.module.css'
import { MarkedLink } from './MarkedLink.tsx'
import { ShellActions } from './ShellActions.tsx'
import { usePilotDay } from './pilot.ts'
import { TabBar } from './TabBar.tsx'
import { iconFor } from './tabs.ts'
import { useTuck } from './tuck.ts'

type Props = { features: readonly WebFeature[] }

/** The frame for /app/*: without a session it sends the user to /login, remembering where they were going. */
export function AppShell({ features }: Props) {
  const session = useSession()
  const location = useLocation()
  if (session.isPending) return <Loading />
  // A failed re-check (the live stream asks again when it drops) keeps a signed-in user in the app.
  if (session.isError && !session.data)
    return (
      <div className={styles.error}>
        <p className={styles.errorLine} role="alert">
          {session.error.message}
        </p>
        <Button variant="primary" onClick={() => void session.refetch()} loading={session.isFetching}>
          {t('common.retry')}
        </Button>
      </div>
    )
  if (!session.data) return <Navigate to="/login" replace state={returnState(location)} />
  return <SignedIn me={session.data} features={features} />
}

/**
 * One header at every width, laid out by CSS (AppShell.module.css): below 1024 px a static glass bar with the gym name
 * (and a coach's quiet Log Out), its nav hidden for the tab bar; from 1024 px a sidebar with the logo, the gym name,
 * the nav with an icon per page, and the actions at its foot (FR-SHELL-01, FR-SHELL-02). The demo gym's name carries
 * the Sample data tag, so its made-up results never pass for real ones (Uzair, 7 Nov). Below 48rem the page's large
 * title tucks into the bar as you scroll (tuck.ts): the bar's copy is aria-hidden, so the page's h1 stays the one title,
 * and the Sample data tag holds the bar's trailing edge while it shows.
 */
function SignedIn({ me, features }: Props & { me: MeResponse }) {
  const live = useMemo(() => liveFor(features), [features])
  useLiveEvents(live)
  const role = me.user.role
  const nav = navFor(features, role)
  const pilot = usePilotDay(role)
  const bar = useRef<HTMLElement>(null)
  const tuck = useTuck(bar)
  return (
    <div className={styles.frame}>
      <a className={styles.skip} href="#content" onClick={skipToContent}>
        {t('shell.skip')}
      </a>
      <header ref={bar} className={styles.header}>
        <Link className={styles.home} to="/app">
          <Logo name={t('brand.name')} />
        </Link>
        <div className={styles.gymArea}>
          <span className={styles.gym}>{me.gym.name}</span>
          {pilot.day !== null && <span className={styles.pilot}>{t('shell.pilot', { n: pilot.day })}</span>}
          {pilot.pending && <span className={`${styles.pilot} ${styles.pilotSlot}`} aria-hidden="true" />}
          {me.gym.isDemo && <Tag className={styles.sample}>{t('tag.sample')}</Tag>}
          {tuck.title !== null && (
            <div className={styles.barTitle} aria-hidden="true">
              <span className={styles.barTitleText}>{tuck.title}</span>
              {me.gym.isDemo && <Tag className={styles.sample}>{t('tag.sample')}</Tag>}
            </div>
          )}
        </div>
        <nav className={styles.navArea} aria-label={t('a11y.tabs')}>
          <ul className={styles.nav}>
            {nav.map((item) => (
              <li key={item.to}>
                <MarkedLink
                  to={item.to}
                  end={item.to === '/app'}
                  className={styles.link}
                  markedClassName={styles.active}
                >
                  {(marked) => <NavLabel to={item.to} label={item.label(role)} marked={marked} />}
                </MarkedLink>
              </li>
            ))}
          </ul>
        </nav>
        <ShellActions
          className={role === 'coach' ? `${styles.actions} ${styles.coachActions}` : styles.actions}
          errorClassName={styles.logoutError}
          iconClassName={styles.logoutIcon}
          buttonClassName={styles.logout}
        />
      </header>
      <main id="content" className={styles.main}>
        <BarTitleContext value={tuck.show}>
          <Outlet />
        </BarTitleContext>
      </main>
      <TabBar role={role} nav={nav} />
    </div>
  )
}

/**
 * Skip to Content (audit B2-23): the first stop for Tab, past the sidebar's links to the page's title, focused as a
 * navigation focuses it (page.ts: the short focus bar), or to the main column when a page has no title yet.
 */
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById('content')
  const target = main?.querySelector('h1') ?? main
  if (!target) return
  event.preventDefault()
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.dataset.routeFocus = 'keyboard'
  target.focus()
}

/**
 * A sidebar item: its page's icon, Regular, or Fill while it's marked (FR-SHELL-02), then its label. The icon is one of
 * tabs.ts's module-level components, made with createElement since the page picks which.
 */
function NavLabel({ to, label, marked }: { to: string; label: string; marked: boolean }) {
  const icon = iconFor(to)
  return (
    <>
      {icon && createElement(icon, { className: styles.linkIcon, weight: marked ? 'fill' : 'regular' })}
      {label}
    </>
  )
}
