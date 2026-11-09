import type { QueryClient } from '@tanstack/react-query'
import { t } from '@tenure/copy'
import { buttonClass } from '@tenure/ui'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import type { WebFeature } from '../../../app/registry.ts'
import { buildRoutes } from '../../../app/router.tsx'
import { sessionKey } from '../../../shared/session/session.ts'
import { FakeEventSource, json, me, mockFetch, signedOut } from '../../../test/fakes.ts'
import { ResetDemo, TryDemo } from './StallDemo.tsx'

/** A page holding one TryDemo and the ResetDemo alone, away from Home, which places three of the first. */
const stallPage: WebFeature = {
  name: 'stall-test',
  routes: [
    {
      path: '/stall-test',
      screen: async () => ({
        default: () => (
          <main>
            <TryDemo size="lg" />
            <ResetDemo />
          </main>
        ),
      }),
    },
  ],
}

const emptyToday = {
  kpis: { newMembers: 0, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 },
  slipping: [],
  checkinsToday: [],
  board: [],
  hasMembers: false,
}

let client: QueryClient
function renderStall() {
  client = createQueryClient()
  const router = createMemoryRouter(buildRoutes([...features, stallPage]), { initialEntries: ['/stall-test'] })
  render(<App client={client} router={router} />)
  return router
}

/** The server, in stall mode or not; `reset` answers POST /api/demo/reset. */
function server({ stall, reset = () => json(200, { ok: true }) }: { stall: boolean; reset?: () => Response }) {
  let signedIn = false
  return mockFetch((method, path) => {
    if (path === '/api/demo') return json(200, { stall })
    if (method === 'POST' && path === '/api/demo/try') {
      signedIn = true
      return json(200, me('owner', { isDemo: true }))
    }
    if (method === 'POST' && path === '/api/demo/reset') return reset()
    if (path === '/api/auth/me') return signedIn ? json(200, me('owner', { isDemo: true })) : signedOut()
    if (path === '/api/today') return json(200, emptyToday)
    return signedOut()
  })
}

const calls = (fetch: ReturnType<typeof mockFetch>, method: string, path: string) =>
  fetch.mock.calls.filter(([input, init]) => String(input) === path && (init?.method ?? 'GET') === method).length

beforeEach(() => FakeEventSource.install())
afterEach(() => vi.unstubAllGlobals())

describe('TryDemo and ResetDemo', () => {
  test('FR-WEB-04 outside stall mode neither shows its button', async () => {
    const fetch = server({ stall: false })
    renderStall()
    await waitFor(() => expect(calls(fetch, 'GET', '/api/demo')).toBe(1))
    await screen.findByRole('main')
    expect(screen.queryByRole('button', { name: t('demo.try') })).toBeNull()
    expect(screen.queryByRole('button', { name: t('demo.reset') })).toBeNull()
  })

  test('FR-WEB-04 in stall mode one tap on Try the Demo signs in as the demo owner and opens Today', async () => {
    const fetch = server({ stall: true })
    const router = renderStall()
    const tryDemo = await screen.findByRole('button', { name: t('demo.try') })
    expect(tryDemo.className).toContain(buttonClass({ variant: 'primary', size: 'lg' }))
    await userEvent.click(tryDemo)
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))
    expect(calls(fetch, 'POST', '/api/demo/try')).toBe(1)
  })

  test('FR-OPS-03 Reset the Demo, a quiet small button, asks first: cancel leaves the demo alone, confirm resets it and says so', async () => {
    const fetch = server({ stall: true })
    renderStall()
    const reset = await screen.findByRole('button', { name: t('demo.reset') })
    expect(reset.className).toContain(buttonClass({ variant: 'quiet', size: 'sm' }))
    await userEvent.click(reset)
    let dialog = await screen.findByRole('dialog', { name: t('demo.reset.title') })
    expect(dialog).toHaveAccessibleDescription(t('demo.reset.body'))
    await userEvent.click(within(dialog).getByRole('button', { name: t('common.cancel') }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls(fetch, 'POST', '/api/demo/reset')).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: t('demo.reset') }))
    dialog = await screen.findByRole('dialog', { name: t('demo.reset.title') })
    client.setQueryData(sessionKey, me('owner', { isDemo: true }))
    await userEvent.click(within(dialog).getByRole('button', { name: t('demo.reset') }))
    expect(await screen.findByText(t('demo.reset.done'))).toBeInTheDocument()
    expect(calls(fetch, 'POST', '/api/demo/reset')).toBe(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The reset signed every demo device out, so this one asks for its session again before the app opens.
    expect(client.getQueryState(sessionKey)?.isInvalidated).toBe(true)
  })

  test("FR-OPS-03 a reset that fails keeps the confirm open with the server's sentence", async () => {
    server({ stall: true, reset: () => json(500, { error: { code: 'server', message: 'Something went wrong.' } }) })
    renderStall()
    await userEvent.click(await screen.findByRole('button', { name: t('demo.reset') }))
    const dialog = await screen.findByRole('dialog', { name: t('demo.reset.title') })
    await userEvent.click(within(dialog).getByRole('button', { name: t('demo.reset') }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.queryByText(t('demo.reset.done'))).toBeNull()
  })
})
