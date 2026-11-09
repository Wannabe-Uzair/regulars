// The templates page (FR-TPL-01), read only for now, which was a title alone (audit B2-08).
import type { Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import { buildRoutes } from '../../../app/router.tsx'
import { FakeEventSource, json, me, mockFetch } from '../../../test/fakes.ts'

function renderAt(templates: { id: number; name: string; body: string }[], role: Role = 'owner') {
  mockFetch((_method, url) => {
    if (url === '/api/auth/me') return json(200, me(role))
    if (url === '/api/templates') return json(200, templates)
    return json(404, { error: { code: 'notApi', message: 'No.' } })
  })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: ['/app/templates'] })
  render(<App client={createQueryClient()} router={router} />)
}

beforeEach(() => FakeEventSource.install())
afterEach(() => vi.unstubAllGlobals())

test("FR-TPL-01 the gym's templates, each its name over its message; coaches are told they read them", async () => {
  renderAt([{ id: 1, name: 'Missed you', body: 'Hi {first}, we missed you.' }], 'coach')
  expect(await screen.findByRole('heading', { level: 2, name: 'Missed you' })).toBeInTheDocument()
  expect(screen.getByText('Hi {first}, we missed you.')).toBeInTheDocument()
  expect(screen.getByText(t('templates.readOnly'))).toBeInTheDocument()
})

test('FR-TPL-01 with none, the empty state says what a template is for', async () => {
  renderAt([])
  expect(await screen.findByRole('heading', { level: 2, name: t('templates.empty') })).toBeInTheDocument()
  expect(screen.getByText(t('templates.emptyBody'))).toBeInTheDocument()
  expect(screen.queryByText(t('templates.readOnly'))).toBeNull()
})
