// The phone's large title tucking into the top bar (ARCHITECTURE §2, "App shell"): an IntersectionObserver on the
// page's h1 flips the bar's `data-tucked`; the bar's copy is aria-hidden, so the h1 stays the page's one title.
import type { Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { act, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { FakeEventSource, json, me, mockFetch } from '../../test/fakes.ts'
import { App } from '../App.tsx'
import { features } from '../features.ts'
import { createQueryClient } from '../query-client.ts'
import { buildRoutes } from '../router.tsx'
import styles from './AppShell.module.css'

const emptyGym = {
  kpis: { newMembers: 0, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 },
  slipping: [],
  checkinsToday: [],
  board: [],
  hasMembers: false,
}

/** An IntersectionObserver that the test drives: `fire` reports the title above the bar's edge, or back below it. */
class FakeObserver {
  static instances: FakeObserver[] = []
  readonly targets: Element[] = []
  disconnected = false
  readonly callback: IntersectionObserverCallback
  readonly options: IntersectionObserverInit
  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback
    this.options = options
    FakeObserver.instances.push(this)
  }
  observe(target: Element) {
    this.targets.push(target)
  }
  disconnect() {
    this.disconnected = true
  }
  /** `true`: gone up under the bar; `'part'`: over half under it; `'mostly'`: under half under it (a scroll that stopped part-way); `false`: all below. */
  fire(under: boolean | 'part' | 'mostly') {
    const target = this.targets[0]!
    const rootBounds = { top: 60 } as DOMRectReadOnly
    const entry = {
      target,
      isIntersecting: under !== true,
      intersectionRatio: under === true ? 0 : under === 'part' ? 0.4 : under === 'mostly' ? 0.6 : 1,
      boundingClientRect: {
        top: under === true ? -10 : under === 'part' || under === 'mostly' ? 40 : 80,
      } as DOMRectReadOnly,
      rootBounds,
    } as IntersectionObserverEntry
    act(() => this.callback([entry], this as unknown as IntersectionObserver))
  }
}

/** Stubs matchMedia so the phone's width query (tuck.ts) matches, or (on a laptop) nothing does. */
function atWidth(phone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query === '(width < 48rem)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function renderAt(path: string, role: Role = 'owner', isDemo = false) {
  mockFetch((_method, url) => {
    if (url === '/api/auth/me') return json(200, me(role, { isDemo }))
    if (url === '/api/today') return json(200, emptyGym)
    return json(404, { error: { code: 'notApi', message: 'No.' } })
  })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [path] })
  render(<App client={createQueryClient()} router={router} />)
}

beforeEach(() => {
  FakeEventSource.install()
  FakeObserver.instances = []
  vi.stubGlobal('IntersectionObserver', FakeObserver)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const live = () => FakeObserver.instances.filter((o) => !o.disconnected)

test('FR-SHELL-01 on a phone, the bar is tucked once the large title leaves under it, and untucked when it comes back', async () => {
  atWidth(true)
  renderAt('/app')
  const title = await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
  const bar = screen.getByRole('banner')
  expect(live()).toHaveLength(1)
  const observer = live()[0]!
  expect(observer.targets).toEqual([title])
  // The viewport under the bar is the root: its top edge comes down by the bar's height.
  expect(observer.options.rootMargin).toMatch(/^-\d+px 0px 0px 0px$/)
  observer.fire(false)
  expect(bar).not.toHaveAttribute('data-tucked')
  observer.fire(true)
  expect(bar).toHaveAttribute('data-tucked')
  observer.fire(false)
  expect(bar).not.toHaveAttribute('data-tucked')
})

test('FR-SHELL-01 the bar tucks once half the title is under it, so a scroll that stops part-way shows one title (audit B2-05)', async () => {
  atWidth(true)
  renderAt('/app')
  await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
  const bar = screen.getByRole('banner')
  const observer = live()[0]!
  // Told when the title crosses half, not only when it is wholly in view or wholly gone.
  expect(observer.options.threshold).toBe(0.5)
  observer.fire('part')
  expect(bar).toHaveAttribute('data-tucked')
  observer.fire('mostly')
  expect(bar).not.toHaveAttribute('data-tucked')
  observer.fire(false)
  expect(bar).not.toHaveAttribute('data-tucked')
})

test('FR-SHELL-01 FR-SHELL-06 the large title is the one h1; the bar shows a copy hidden from assistive tech', async () => {
  atWidth(true)
  renderAt('/app', 'owner', true)
  await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  const bar = screen.getByRole('banner')
  const copy = bar.querySelector(`.${styles.barTitle}`)
  expect(copy).toHaveAttribute('aria-hidden', 'true')
  expect(copy).toHaveTextContent(t('today.owner.title'))
  // The demo gym's tag holds the bar's leading edge while the title is tucked in.
  expect(within(copy as HTMLElement).getByText(t('tag.sample'))).toBeInTheDocument()
})

test('FR-SHELL-01 a page leaving takes its title and the tuck with it', async () => {
  atWidth(true)
  renderAt('/app/nowhere')
  await screen.findByRole('heading', { level: 1, name: t('notFound.title') })
  const bar = screen.getByRole('banner')
  live()[0]!.fire(true)
  expect(bar).toHaveAttribute('data-tucked')
  await act(async () => {
    screen.getByRole('link', { name: t('shell.notFound.link') }).click()
  })
  await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
  expect(FakeObserver.instances[0]!.disconnected).toBe(true)
  expect(live()).toHaveLength(1)
  expect(bar).not.toHaveAttribute('data-tucked')
  expect(bar.querySelector(`.${styles.barTitle}`)).toHaveTextContent(t('today.owner.title'))
})

test('FR-SHELL-02 laptops are unchanged: no observer, no copy in the bar, nothing tucks', async () => {
  atWidth(false)
  renderAt('/app')
  await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
  expect(FakeObserver.instances).toHaveLength(0)
  const bar = screen.getByRole('banner')
  expect(bar.querySelector(`.${styles.barTitle}`)).toBeNull()
  expect(bar).not.toHaveAttribute('data-tucked')
})
