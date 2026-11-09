import { t } from '@tenure/copy'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from '../../app/App.tsx'
import { features } from '../../app/features.ts'
import { createQueryClient } from '../../app/query-client.ts'
import { buildRoutes } from '../../app/router.tsx'
import { FakeEventSource, mockFetch, signedOut } from '../../test/fakes.ts'

beforeEach(() => {
  FakeEventSource.install()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('/invite/:token shows the bad-link sentence in the sign-in card, and its link leads to /login', async () => {
  mockFetch(() => signedOut())
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: ['/invite/abc'] })
  render(<App client={createQueryClient()} router={router} />)
  const main = await screen.findByRole('main')
  expect(within(main).getByRole('heading', { level: 1, name: t('invite.bad.title') })).toBeVisible()
  expect(within(main).getByText(t('invite.bad'))).toBeVisible()
  expect(within(main).getByText(t('brand.name'))).toBeVisible()
  expect(within(main).getByText(t('brand.tagline'))).toBeVisible()
  const link = within(main).getByRole('link', { name: t('invite.bad.action') })
  expect(link).toHaveAttribute('href', '/login')
})
