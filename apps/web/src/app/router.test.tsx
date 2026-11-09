import type { QueryClient } from '@tanstack/react-query'
import type { Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { buttonClass, CalendarDotIcon, GearSixIcon, SquaresFourIcon, type WeightedIconProps } from '@tenure/ui'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { get } from '../shared/api/client.ts'
import { returnTo, sessionKey } from '../shared/session/session.ts'
import { FakeEventSource, json, me, mockFetch, signedOut } from '../test/fakes.ts'
import { App } from './App.tsx'
import { features } from './features.ts'
import { createQueryClient } from './query-client.ts'
import type { WebFeature } from './registry.ts'
import { reloadPage } from './reload.ts'
import { buildRoutes } from './router.tsx'
import titleStyles from '../shared/page/PageTitle.module.css'
import notFoundStyles from './NotFound.module.css'
import styles from './shell/AppShell.module.css'
import { billingKey } from './shell/pilot.ts'

vi.mock('./reload.ts', () => ({ reloadPage: vi.fn() }))

let client: QueryClient
function renderAt(path: string, registry: readonly WebFeature[] = features) {
  client = createQueryClient()
  const router = createMemoryRouter(buildRoutes(registry), { initialEntries: [path] })
  render(<App client={client} router={router} />)
  return router
}

const emptyGym = {
  kpis: { newMembers: 0, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 },
  slipping: [],
  checkinsToday: [],
  board: [],
  hasMembers: false,
}

const notApi = () => json(404, { error: { code: 'notApi', message: "That isn't part of the Regulars API." } })

/** The billing answer on pilot day `pilotDay`, or from day 91 when `ended`. */
const billing =
  (pilotDay: number, ended = false) =>
  () =>
    json(200, { pilotStartedOn: '2026-10-01', pilotDay, endsOn: '2026-12-29', ended })

/**
 * Signed in until log-out, as the server would be. Today answers an empty gym unless a test passes its own; billing
 * isn't answered unless a test passes it.
 */
function signedInAs(role: Role, today: () => Response = () => json(200, emptyGym), billingAnswer = notApi) {
  let loggedOut = false
  return mockFetch((method, path) => {
    if (path === '/api/auth/me') return loggedOut ? signedOut() : json(200, me(role))
    if (method === 'POST' && path === '/api/auth/logout') {
      loggedOut = true
      return json(200, { ok: true })
    }
    if (path === '/api/today') return today()
    if (path === '/api/billing') return billingAnswer()
    return notApi()
  })
}

beforeEach(() => {
  FakeEventSource.install()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(reloadPage).mockReset()
})

describe('the route registry', () => {
  const paths = features.flatMap((f) => f.routes.map((r) => r.path))

  test.each(paths)('%s renders its screen', async (path) => {
    signedInAs('owner')
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByText(t('notFound.title'))).not.toBeInTheDocument()
  })

  test('FR-SHELL-02 every first-version page is registered once', () => {
    expect(paths).toEqual([
      '/',
      '/pricing',
      '/login',
      '/signup',
      '/app',
      '/app/board',
      '/app/members',
      '/app/members/:id',
      '/app/nudges',
      '/app/reports',
      '/app/templates',
      '/app/settings',
      '/app/settings/import',
      '/app/billing',
      '/app/me',
      '/kiosk/:token',
      '/invite/:token',
    ])
  })

  test('an unknown path renders the not-found page, in its own words, on a card with the mark, as the bad invite does', async () => {
    renderAt('/nowhere')
    expect(await screen.findByRole('heading', { name: t('notFound.title') })).toBeInTheDocument()
    expect(screen.getByText(t('notFound.body'))).toBeInTheDocument()
    // Visitor check M2: one card in the page's <main> holds the mark, the tagline, the title, the sentence and the way
    // back, on the blended ground, as Log In and the bad invite do; no bar above it.
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    const card = screen.getByRole('heading', { level: 1 }).closest(`.${notFoundStyles.card}`)
    expect(card).not.toBeNull()
    expect(screen.getByRole('main')).toContainElement(card as HTMLElement)
    for (const text of [t('brand.name'), t('brand.tagline'), t('notFound.body'), t('notFound.link')])
      expect(card).toContainElement(screen.getByText(text))
    // B2-09: one tinted way back, as in the shell and on Member Not Found.
    const home = screen.getByRole('link', { name: t('notFound.link') })
    expect(home).toHaveAttribute('href', '/')
    expect(home.className).toBe(buttonClass({ variant: 'tinted' }))
    // F20: the screens' own title, at the display leading.
    expect(screen.getByRole('heading', { level: 1 }).className).toBe(titleStyles.title)
  })

  test('FR-SHELL-02 an unknown /app path shows the not-found page inside the shell, with a way back to Today', async () => {
    signedInAs('owner')
    renderAt('/app/nowhere')
    expect(await screen.findByRole('heading', { level: 1, name: t('notFound.title') })).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText('Northside Strength')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: t('a11y.tabbar') })).toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByText(t('shell.notFound.body'))).toBeInTheDocument()
    const back = screen.getByRole('link', { name: t('shell.notFound.link') })
    expect(back).toHaveAttribute('href', '/app')
    expect(back.className).toBe(buttonClass({ variant: 'tinted' }))
  })
})

describe('the guards', () => {
  test('/app/* without a session goes to /login, keeping where the user was going', async () => {
    mockFetch(() => signedOut())
    const router = renderAt('/app/reports?week=3')
    expect(await screen.findByRole('heading', { name: t('login.title') })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(returnTo(router.state.location.state)).toBe('/app/reports?week=3')
  })

  test.each(['/app/reports', '/app/settings', '/app/settings/import', '/app/billing'])(
    'FR-SHELL-04 the owner-only %s sends a coach to /app, and its nav item is hidden',
    async (path) => {
      signedInAs('coach')
      const router = renderAt(path)
      expect(await screen.findByRole('heading', { name: t('today.coach.title') })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/app')
      const nav = within(screen.getByRole('navigation', { name: t('a11y.tabs') }))
      expect(nav.getByRole('link', { name: t('nav.coach.today') })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: t('nav.owner.reports') })).not.toBeInTheDocument()
    },
  )

  test('FR-SHELL-04 an owner reaches the owner-only route and sees its nav item', async () => {
    signedInAs('owner')
    renderAt('/app/reports')
    expect(await screen.findByRole('heading', { level: 1, name: t('reports.title') })).toBeInTheDocument()
    for (const [nav, name] of [
      [t('a11y.tabs'), t('nav.owner.reports')],
      [t('a11y.tabbar'), t('tab.owner.reports')],
    ] as const)
      expect(within(screen.getByRole('navigation', { name: nav })).getByRole('link', { name })).toHaveAttribute(
        'href',
        '/app/reports',
      )
  })

  test('a 401 from any app query ends the session and goes to /login', async () => {
    signedInAs('owner', signedOut)
    const router = renderAt('/app')
    await screen.findByRole('heading', { name: t('today.owner.title') })
    const today = () => get('/api/today', { parse: (data) => data })
    await act(() => client.fetchQuery({ queryKey: ['today'], queryFn: today }).catch(() => undefined))
    expect(await screen.findByRole('heading', { name: t('login.title') })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})

describe('the live stream', () => {
  test('a stream the server ends after the session ended sends the user to /login', async () => {
    let sessionEnded = false
    mockFetch((_method, path) => {
      if (path === '/api/auth/me') return sessionEnded ? signedOut() : json(200, me('owner'))
      if (path === '/api/today') return json(200, emptyGym)
      return signedOut()
    })
    const router = renderAt('/app')
    await screen.findByRole('heading', { name: t('today.owner.title') })
    const stream = FakeEventSource.instances[0]!
    act(() => stream.open())
    // Signed out in another tab: the server closes the stream, and its reconnect would get a 401.
    sessionEnded = true
    act(() => stream.fail())
    expect(await screen.findByRole('heading', { name: t('login.title') })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(returnTo(router.state.location.state)).toBe('/app')
  })
})

describe('page changes', () => {
  test.each([
    ['/', t('brand.name')],
    ['/nowhere', `${t('notFound.title')} · ${t('brand.name')}`],
    ['/app', `${t('today.owner.title')} · ${t('brand.name')}`],
  ])('%s sets the tab title', async (path, title) => {
    signedInAs('owner')
    renderAt(path)
    await screen.findByRole('heading', { level: 1 })
    await vi.waitFor(() => expect(document.title).toBe(title))
  })

  test('the first load leaves focus alone; after a navigation focus is on the new h1', async () => {
    // Signed out, and not the stall, as the server answers it: the sign-in frame asks before it shows the sign-up.
    mockFetch((_method, path) => (path === '/api/demo' ? json(200, { stall: false }) : signedOut()))
    renderAt('/login')
    const loginTitle = await screen.findByRole('heading', { level: 1, name: t('login.title') })
    expect(loginTitle).not.toHaveFocus()
    expect(document.body).toHaveFocus()
    await userEvent.click(await screen.findByRole('link', { name: t('login.toSignup.link') }))
    const signupTitle = await screen.findByRole('heading', { level: 1, name: t('signup.title') })
    await vi.waitFor(() => expect(signupTitle).toHaveFocus())
    expect(signupTitle).toHaveAttribute('tabindex', '-1')
    // Marked, so base.css shows its focus as the page-title bar instead of the ring. A click shows no bar: 'pointer'.
    expect(signupTitle).toHaveAttribute('data-route-focus', 'pointer')
  })
})

/** The links in the app's navigation, in order, as [name, href]. */
async function navLinks() {
  const nav = within(await screen.findByRole('navigation', { name: t('a11y.tabs') }))
  return nav.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])
}

describe('the nav', () => {
  test("FR-SHELL-02 an owner's nav lists today's pages in order", async () => {
    signedInAs('owner')
    renderAt('/app')
    expect(await navLinks()).toEqual([
      [t('nav.owner.today'), '/app'],
      [t('nav.owner.board'), '/app/board'],
      [t('nav.owner.members'), '/app/members'],
      [t('nav.owner.reports'), '/app/reports'],
      [t('nav.owner.settings'), '/app/settings'],
    ])
  })

  test("FR-SHELL-04 a coach's nav lists three pages, and no owner page", async () => {
    signedInAs('coach')
    renderAt('/app')
    expect(await navLinks()).toEqual([
      [t('nav.coach.today'), '/app'],
      [t('nav.coach.board'), '/app/board'],
      [t('nav.coach.members'), '/app/members'],
    ])
  })

  test("FR-SHELL-02 a coach's first sidebar item says Today, as their first tab and an owner's item do", () => {
    expect(t('nav.coach.today')).toBe(t('tab.coach.today'))
    expect(t('nav.coach.today')).toBe(t('nav.owner.today'))
  })

  test('FR-SHELL-02 a tapped item takes the mark at once while its screen loads, and the page being left drops it', async () => {
    signedInAs('owner')
    let arrive: (screen: { default: () => React.JSX.Element }) => void = () => {}
    const slow: WebFeature = {
      name: 'slow-test',
      routes: [{ path: '/app/slow', screen: () => new Promise((resolve) => (arrive = resolve)) }],
      nav: [{ to: '/app/slow', label: () => 'Slow' }],
    }
    renderAt('/app', [...features, slow])
    await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
    const nav = within(screen.getByRole('navigation', { name: t('a11y.tabs') }))
    const target = nav.getByRole('link', { name: 'Slow' })
    const today = nav.getByRole('link', { name: t('nav.owner.today') })
    expect(today.className).toContain(styles.active)
    await userEvent.click(target)
    // The screen hasn't loaded: Today is still on show, but the mark has moved.
    expect(screen.getByRole('heading', { level: 1, name: t('today.owner.title') })).toBeInTheDocument()
    expect(target.className).toContain(styles.active)
    expect(today.className).not.toContain(styles.active)
    const tabs = within(screen.getByRole('navigation', { name: t('a11y.tabbar') }))
    expect(tabs.getByRole('link', { name: t('tab.owner.today') }).className).not.toContain(styles.tabActive)
    await act(async () => arrive({ default: () => <h1>Slow page</h1> }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Slow page' })).toBeInTheDocument()
    expect(target.className).toContain(styles.active)
  })

  test.each(['/app/nudges', '/app/templates', '/app/billing', '/app/me'])(
    'FR-SHELL-02 the stall version leaves %s out of every navigation, and keeps its route',
    async (path) => {
      signedInAs('owner')
      renderAt(path)
      expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.queryByText(t('notFound.title'))).not.toBeInTheDocument()
      for (const name of [t('a11y.tabs'), t('a11y.tabbar')]) {
        const hrefs = within(screen.getByRole('navigation', { name }))
          .getAllByRole('link')
          .map((a) => a.getAttribute('href'))
        expect(hrefs, name).toContain('/app/reports')
        expect(hrefs, name).not.toContain(path)
      }
    },
  )

  test('FR-SHELL-04 the import page is an owner page with no nav item of its own', async () => {
    signedInAs('owner')
    renderAt('/app/settings/import')
    expect(await screen.findByRole('heading', { level: 1, name: t('import.title') })).toBeInTheDocument()
    expect((await navLinks()).map(([, href]) => href)).not.toContain('/app/settings/import')
  })

  test.each([
    ['FR-KIOSK-01', '/kiosk/kiosk-token-1', 'kiosk.idle.title'],
    ['FR-STAFF-04', '/invite/invite-token-1', 'invite.bad.title'],
  ] as const)('%s %s renders outside the shell, without a session', async (_, path, title) => {
    mockFetch(() => signedOut())
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: t(title) })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})

describe('the shell', () => {
  test('FR-SHELL-02 the banner holds the logo link, the gym name, the nav, then Log out, with no theme toggle', async () => {
    signedInAs('owner')
    renderAt('/app')
    const header = within(await screen.findByRole('banner'))
    const home = await header.findByRole('link', { name: t('brand.name') })
    expect(home).toHaveAttribute('href', '/app')
    const gym = header.getByText('Northside Strength')
    const nav = header.getByRole('navigation', { name: t('a11y.tabs') })
    const logout = header.getByRole('button', { name: t('nav.logout') })
    // The page is pinned light (ARCHITECTURE §9): no theme toggle in the header or the sidebar.
    expect(header.queryByRole('button', { name: t('theme.toDark') })).not.toBeInTheDocument()
    expect(header.queryByRole('button', { name: t('theme.toLight') })).not.toBeInTheDocument()
    // In this order, so the sidebar shows Log out at its foot.
    const order = [home, gym, nav, logout]
    for (const [i, el] of order.slice(1).entries())
      expect(order[i]!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('FR-SHELL-03 an owner sees the pilot day right after the gym name', async () => {
    signedInAs('owner', undefined, billing(37))
    renderAt('/app')
    const pilot = await within(await screen.findByRole('banner')).findByText(t('shell.pilot', { n: 37 }))
    expect(screen.getByText('Northside Strength').nextElementSibling).toBe(pilot)
  })

  test('FR-SHELL-03 from day 91 the pilot line goes', async () => {
    signedInAs('owner', undefined, billing(90, true))
    renderAt('/app')
    await screen.findByRole('heading', { name: t('today.owner.title') })
    await vi.waitFor(() => expect(client.getQueryData(billingKey)).toBeDefined())
    // Let the shell render the answer before looking for the line.
    await act(async () => {})
    expect(screen.queryByText(t('shell.pilot', { n: 90 }))).not.toBeInTheDocument()
  })

  test('FR-SHELL-03 a coach sees no pilot day, and the shell never asks for billing', async () => {
    const fetch = signedInAs('coach', undefined, billing(37))
    renderAt('/app')
    await screen.findByRole('heading', { name: t('today.coach.title') })
    expect(screen.queryByText(t('shell.pilot', { n: 37 }))).not.toBeInTheDocument()
    expect(fetch.mock.calls.map(([path]) => String(path))).not.toContain('/api/billing')
  })

  test('FR-SHELL-05 a session check that fails offers Try again, which loads the app', async () => {
    let fails = true
    mockFetch((_method, path) => {
      if (path === '/api/auth/me')
        return fails ? json(429, { error: { code: 'rateLimit', message: 'Slow down.' } }) : json(200, me('owner'))
      if (path === '/api/today') return json(200, emptyGym)
      return notApi()
    })
    renderAt('/app')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fails = false
    const retry = screen.getByRole('button', { name: t('common.retry') })
    // Primary, as the screens' Try again is.
    expect(retry.className).toContain(buttonClass({ variant: 'primary' }))
    await userEvent.click(retry)
    expect(await screen.findByRole('heading', { name: t('today.owner.title') })).toBeInTheDocument()
  })

  test.each(['/app', '/app/me'])(
    'FR-SHELL-07 no theme toggle or choice anywhere: %s, a dark choice saved on an earlier visit is ignored',
    async (path) => {
      localStorage.setItem('tenure.theme', 'dark')
      signedInAs('owner')
      renderAt(path)
      await screen.findByRole('heading', { level: 1 })
      await screen.findByRole('navigation', { name: t('a11y.tabbar') })
      for (const name of [t('theme.toDark'), t('theme.toLight'), t('theme.choice')]) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
        expect(screen.queryByRole('radiogroup', { name })).not.toBeInTheDocument()
      }
      expect(screen.queryByRole('radio', { name: t('theme.choice.dark') })).not.toBeInTheDocument()
      // Nothing reads the saved choice or sets one: the page is pinned light by its tokens (ARCHITECTURE §9).
      expect(document.documentElement).not.toHaveAttribute('data-theme')
      expect(localStorage.getItem('tenure.theme')).toBe('dark')
      expect(localStorage).toHaveLength(1)
    },
  )

  test('FR-SHELL-02 the demo gym’s name carries the Sample data tag; another gym’s has none', async () => {
    signedInAs('owner')
    renderAt('/app')
    expect(await screen.findByText('Northside Strength')).toBeInTheDocument()
    expect(screen.queryByText(t('tag.sample'))).toBeNull()
    cleanup()
    mockFetch((_method, path) => {
      if (path === '/api/auth/me') return json(200, me('owner', { isDemo: true }))
      if (path === '/api/today') return json(200, emptyGym)
      return notApi()
    })
    renderAt('/app')
    const header = await screen.findByRole('banner')
    expect(await within(header).findByText(t('tag.sample'))).toBeInTheDocument()
  })

  test('shows the gym name and opens one live stream', async () => {
    signedInAs('owner')
    renderAt('/app')
    expect(await screen.findByText('Northside Strength')).toBeInTheDocument()
    expect(FakeEventSource.instances).toHaveLength(1)
  })

  test('log-out posts, clears the cache, closes the stream and goes to /login', async () => {
    const fetch = signedInAs('owner')
    const router = renderAt('/app')
    await screen.findByRole('heading', { name: t('today.owner.title') })
    client.setQueryData(['today'], { cached: true })
    const asked = fetch.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: t('nav.logout') }))
    expect(await screen.findByRole('heading', { name: t('login.title') })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    // Nothing cached survives but the session, now known to be signed out, and the stall question the login page asks.
    const cached = client.getQueryCache().getAll()
    expect(cached.map((q) => q.queryKey)).toEqual([sessionKey, ['demo']])
    expect(client.getQueryData(sessionKey)).toBeNull()
    // So the login page doesn't ask for the session again, and no 401 lands in the console (audit A14).
    expect(fetch.mock.calls.slice(asked).map(([input]) => String(input))).not.toContain('/api/auth/me')
    expect(FakeEventSource.instances.every((es) => es.readyState === FakeEventSource.CLOSED)).toBe(true)
  })
})

/** The phone tab bar. */
async function tabBar() {
  return within(await screen.findByRole('navigation', { name: t('a11y.tabbar') }))
}

/** The path an icon draws in a weight, to tell Fill from Regular. */
function iconPath(Icon: ComponentType<WeightedIconProps>, weight: WeightedIconProps['weight']): string {
  return /\sd="([^"]+)"/.exec(renderToStaticMarkup(<Icon weight={weight} />))?.[1] ?? ''
}

/** The path a link's icon draws, after checking the icon is hidden and comes before the link's words. */
function linkIconPath(link: HTMLElement): string {
  const svg = link.querySelector('svg')
  expect(svg, link.textContent ?? '').not.toBeNull()
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(link.firstElementChild).toBe(svg)
  return svg?.querySelector('path')?.getAttribute('d') ?? ''
}

describe('the tab bar', () => {
  test("FR-SHELL-01 an owner's tab bar holds Today, Board, Members, Reports and Settings, each a filled icon over its word, with no More", async () => {
    signedInAs('owner')
    renderAt('/app')
    const tabs = await tabBar()
    const links = tabs.getAllByRole('link')
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      [t('tab.owner.today'), '/app'],
      [t('tab.owner.board'), '/app/board'],
      [t('tab.owner.members'), '/app/members'],
      [t('tab.owner.reports'), '/app/reports'],
      [t('tab.owner.settings'), '/app/settings'],
    ])
    // Every tab's icon is the Fill one, the open tab's and the others' alike.
    expect(linkIconPath(links[0]!)).toBe(iconPath(CalendarDotIcon, 'fill'))
    expect(linkIconPath(links[1]!)).toBe(iconPath(SquaresFourIcon, 'fill'))
    expect(linkIconPath(links[4]!)).toBe(iconPath(GearSixIcon, 'fill'))
    for (const link of links) expect(link.querySelector('svg')?.getAttribute('class')).toBe(styles.tabIcon)
    expect(tabs.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(t('tab.owner.more'))).not.toBeInTheDocument()
  })

  test('FR-SHELL-01 the open tab carries aria-current, and Settings stays marked on the import', async () => {
    signedInAs('owner')
    renderAt('/app')
    const today = (await tabBar()).getByRole('link', { name: t('tab.owner.today') })
    expect(today).toHaveAttribute('aria-current', 'page')
    expect(today.className).toContain(styles.tabActive)
    cleanup()

    signedInAs('owner')
    renderAt('/app/settings/import')
    expect(await screen.findByRole('heading', { level: 1, name: t('import.title') })).toBeInTheDocument()
    const tabs = await tabBar()
    expect(tabs.getByRole('link', { name: t('tab.owner.settings') })).toHaveAttribute('aria-current', 'page')
    for (const link of tabs.getAllByRole('link')) {
      const marked = link.getAttribute('href') === '/app/settings'
      expect(link.getAttribute('aria-current'), link.textContent ?? '').toBe(marked ? 'page' : null)
      expect(link.classList.contains(styles.tabActive as string), link.textContent ?? '').toBe(marked)
    }
  })

  test("FR-SHELL-01 a coach's tab bar holds Today, Board and Members, and the header a quiet Log Out", async () => {
    signedInAs('coach')
    renderAt('/app')
    const tabs = await tabBar()
    expect(tabs.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      [t('tab.coach.today'), '/app'],
      [t('tab.coach.board'), '/app/board'],
      [t('tab.coach.members'), '/app/members'],
    ])
    expect(tabs.queryByRole('button')).not.toBeInTheDocument()
    const logout = within(screen.getByRole('banner')).getByRole('button', { name: t('nav.logout') })
    expect(logout.className).toContain(buttonClass({ variant: 'quiet' }))
    // The class the sidebar lines its Log Out up with (AppShell.css.test.ts).
    expect(logout.className).toContain(styles.logout)
    // The phone header shows a coach's actions (AppShell.css.test.ts), and not an owner's.
    expect(logout.parentElement?.className).toContain(styles.coachActions)
    cleanup()

    signedInAs('owner')
    renderAt('/app')
    const ownerLogout = await within(await screen.findByRole('banner')).findByRole('button', { name: t('nav.logout') })
    expect(ownerLogout.parentElement?.className).toBe(styles.actions)
  })
})

describe('the sidebar', () => {
  test('FR-SHELL-02 the selected sidebar page shows its Fill icon in the tinted capsule', async () => {
    signedInAs('owner')
    renderAt('/app')
    const nav = within(await screen.findByRole('navigation', { name: t('a11y.tabs') }))
    const today = nav.getByRole('link', { name: t('nav.owner.today') })
    const board = nav.getByRole('link', { name: t('nav.owner.board') })
    expect(today.className).toContain(styles.active)
    expect(linkIconPath(today)).toBe(iconPath(CalendarDotIcon, 'fill'))
    expect(board.className).not.toContain(styles.active)
    expect(linkIconPath(board)).toBe(iconPath(SquaresFourIcon, 'regular'))
    expect(nav.getAllByRole('link')).toHaveLength(5)
    for (const link of nav.getAllByRole('link')) linkIconPath(link)

    await userEvent.click(board)
    await screen.findByRole('heading', { level: 1, name: t('board.title') })
    expect(linkIconPath(board)).toBe(iconPath(SquaresFourIcon, 'fill'))
    expect(linkIconPath(today)).toBe(iconPath(CalendarDotIcon, 'regular'))
  })
})

describe('the route error', () => {
  // React reports each error a boundary catches; keep the expected one out of the test output.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** A screen whose chunk fails to load on the first page load and loads on the next. */
  function flaky(path: string): WebFeature {
    let loads = 0
    const screenModule = async () => {
      loads += 1
      if (loads === 1) throw new TypeError('Failed to fetch dynamically imported module')
      return { default: () => <h1>Flaky</h1> }
    }
    return { name: 'flaky-test', routes: [{ path, screen: screenModule }] }
  }

  test('a screen that fails to load under /app shows inside the shell, and retry loads the page again', async () => {
    signedInAs('owner')
    const registry = [...features, flaky('/app/flaky')]
    renderAt('/app/flaky', registry)
    expect(await screen.findByRole('heading', { name: t('routeError.title') })).toBeInTheDocument()
    expect(screen.getByText(t('routeError.body'))).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByText('Northside Strength')).toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)

    // A reload starts a new page with a new router: stand in for it here.
    vi.mocked(reloadPage).mockImplementation(() => {
      cleanup()
      renderAt('/app/flaky', registry)
    })
    await userEvent.click(screen.getByRole('button', { name: t('routeError.retry') }))
    expect(reloadPage).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Flaky' })).toBeInTheDocument()
    expect(screen.queryByText(t('routeError.title'))).not.toBeInTheDocument()
  })

  test('outside /app it shows on its own', async () => {
    mockFetch(() => signedOut())
    renderAt('/flaky', [...features, flaky('/flaky')])
    expect(await screen.findByRole('heading', { name: t('routeError.title') })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('button', { name: t('routeError.retry') }))
  })
})
