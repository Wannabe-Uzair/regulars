// Me (FR-ME-01), which was a title alone (audit B2-08).
import { t } from '@tenure/copy'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import { buildRoutes } from '../../../app/router.tsx'
import { FakeEventSource, json, me, mockFetch } from '../../../test/fakes.ts'

beforeEach(() => FakeEventSource.install())
afterEach(() => vi.unstubAllGlobals())

test("FR-ME-01 Me shows the user's name, email, gym and role, and Log Out", async () => {
  const session = me('coach')
  mockFetch((_method, url) => {
    if (url === '/api/auth/me') return json(200, session)
    return json(404, { error: { code: 'notApi', message: 'No.' } })
  })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: ['/app/me'] })
  render(<App client={createQueryClient()} router={router} />)
  await screen.findByRole('heading', { level: 1, name: t('me.title') })
  const main = screen.getByRole('main')
  for (const [label, value] of [
    [t('me.name'), session.user.name],
    [t('me.email'), session.user.email],
    [t('me.gym'), session.gym.name],
    [t('me.role'), t('role.coach')],
  ]) {
    expect(main).toHaveTextContent(label!)
    expect(main).toHaveTextContent(value!)
  }
  expect(within(main).getByRole('button', { name: t('me.logout') })).toBeInTheDocument()
})
