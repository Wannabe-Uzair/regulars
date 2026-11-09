import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMe } from '../api.js'
import { pilotDay } from '../util.js'
import { t } from '../copy.js'
import Logo from './Logo.jsx'
import Tape from './Tape.jsx'
import SampleTag from './SampleTag.jsx'
import Dialog from './Dialog.jsx'
import Button from './Button.jsx'

/* The frame around every signed-in screen (DESIGN §12 layout):
 *  desktop ≥ 1100: 232 px sidebar (logo, nav, gym name + pilot day, LOG OUT);
 *  tablet 760–1099: 72 px top bar with the logo, the current page and MENU (opens the nav as a panel);
 *  phone < 760: bottom tabs (owner TODAY · BOARD · MEMBERS · MORE, coach TODAY · BOARD · NUDGES · ME).
 * SAMPLE DATA sits top right when gym.isDemo. Pass user/gym to render it without a session (the /_kit gallery). */
// [path, copy id]: the words come from COPY §3 through t() when rendered.
const OWNER_NAV = [['/', 'nav.owner.today'], ['/board', 'nav.owner.board'], ['/members', 'nav.owner.members'], ['/nudges', 'nav.owner.nudges'],
  ['/reports', 'nav.owner.reports'], ['/templates', 'nav.owner.templates'], ['/settings', 'nav.owner.settings'], ['/billing', 'nav.owner.billing']]
const COACH_NAV = [['/', 'nav.coach.today'], ['/board', 'nav.coach.board'], ['/members', 'nav.coach.members'], ['/nudges', 'nav.coach.nudges'], ['/templates', 'nav.coach.templates']]
const OWNER_TABS = [['/', 'tab.owner.today'], ['/board', 'tab.owner.board'], ['/members', 'tab.owner.members']]
const COACH_TABS = [['/', 'tab.coach.today'], ['/board', 'tab.coach.board'], ['/nudges', 'tab.coach.nudges'], ['/me', 'tab.coach.me']]
const MORE = [['/reports', 'nav.owner.reports'], ['/templates', 'nav.owner.templates'], ['/settings', 'nav.owner.settings'], ['/billing', 'nav.owner.billing']]

const isActive = (path, pathname) => (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/'))

export default function AppShell({ user: userProp, gym: gymProp, children }) {
  const me = useMe()
  const user = userProp ?? me.user, gym = gymProp ?? me.gym
  const owner = user?.role === 'owner'
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [more, setMore] = useState(false)
  useEffect(() => { setMenu(false); setMore(false) }, [pathname])

  const nav = owner ? OWNER_NAV : COACH_NAV
  const currentId = nav.find(([p]) => isActive(p, pathname))?.[1]
  const current = currentId ? t(currentId) : ''
  const day = pilotDay(gym)
  const logout = async () => { await me.logout().catch(() => {}); navigate('/login') }
  const links = <nav className="nav label" aria-label={t('a11y.tabs')}>{nav.map(([to, id]) => <NavLink key={to} to={to} end={to === '/'}>{t(id)}</NavLink>)}</nav>
  const gymFoot = (
    <div className="side-foot">
      <div className="label c-chalk">{gym?.name}</div>
      {day && <><div className="meta">{t('shell.pilot', { n: day })}</div><Tape filled={day / 30} /></>}
      <button type="button" className="btn btn-quiet" onClick={logout}>{t('nav.logout')}</button>
    </div>
  )

  return (
    <div className={`shell${gym?.isDemo ? ' is-demo' : ''}`}>
      <aside className="sidebar">
        <Logo w={184} />
        {links}
        {gymFoot}
      </aside>

      <header className="topbar">
        <Logo w={136} />
        <span className="label topbar-page" aria-hidden="true">{current}</span>
        <Button variant="secondary" aria-expanded={menu} aria-controls="menu-panel" onClick={() => setMenu((v) => !v)}>{menu ? t('common.close', {}, 'CLOSE') : t('nav.menu', {}, 'MENU')}</Button>
      </header>
      {menu && <div className="menu-panel" id="menu-panel">{links}{gymFoot}</div>}

      <main className="main" id="main">
        {gym?.isDemo && <div className="sample-corner"><SampleTag /></div>}
        <div className="main-inner">{children ?? <Outlet />}</div>
      </main>

      <nav className="tabbar label" aria-label={t('a11y.tabbar', {}, 'Tabs')}>
        {(owner ? OWNER_TABS : COACH_TABS).map(([to, id]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive: a }) => (a ? 'active' : '')}>{t(id)}</NavLink>
        ))}
        {owner && (
          <button type="button" className={MORE.some(([p]) => isActive(p, pathname)) ? 'active' : ''} aria-haspopup="dialog" onClick={() => setMore(true)}>{t('tab.owner.more')}</button>
        )}
      </nav>
      {owner && (
        <Dialog open={more} onClose={() => setMore(false)} title={t('tab.owner.more')}>
          <nav className="nav label" aria-label={t('a11y.more', {}, 'More')}>{MORE.map(([to, id]) => <NavLink key={to} to={to}>{t(id)}</NavLink>)}</nav>
          {gymFoot}
        </Dialog>
      )}
    </div>
  )
}
