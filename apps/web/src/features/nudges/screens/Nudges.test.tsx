// The nudges log (FR-NUDGE-06, TC-38), which was a title alone (audit B2-08).
import type { NudgeLogEntry, Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import { buildRoutes } from '../../../app/router.tsx'
import { FakeEventSource, json, me, mockFetch } from '../../../test/fakes.ts'

const entry = (over: Partial<NudgeLogEntry>): NudgeLogEntry => ({
  id: 1,
  at: '2026-11-05T16:30:00.000Z',
  memberId: 7,
  memberName: 'Sam O.',
  by: 'Dana R.',
  body: 'Hi Sam, we missed you this week.',
  channel: 'whatsapp',
  outcome: 'cameBack',
  ...over,
})

function renderLog(log: NudgeLogEntry[], role: Role = 'owner') {
  mockFetch((_method, url) => {
    if (url === '/api/auth/me') return json(200, me(role))
    if (url === '/api/nudges') return json(200, log)
    return json(404, { error: { code: 'notApi', message: 'No.' } })
  })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: ['/app/nudges'] })
  render(<App client={createQueryClient()} router={router} />)
}

beforeEach(() => FakeEventSource.install())
afterEach(() => vi.unstubAllGlobals())

test('FR-NUDGE-06 each nudge opens its member and shows the message, the sender, the channel and what happened', async () => {
  renderLog([entry({}), entry({ id: 2, memberId: 8, memberName: 'Leo', channel: null, outcome: 'noVisit' })])
  const sam = await screen.findByRole('link', { name: /Sam O\./ })
  expect(sam).toHaveAttribute('href', '/app/members/7')
  expect(sam).toHaveTextContent('Hi Sam, we missed you this week.')
  expect(sam).toHaveTextContent('Dana R.')
  expect(sam).toHaveTextContent(t('nudges.channel.whatsapp'))
  expect(within(sam).getByText(t('nudges.cameBack'))).toBeInTheDocument()
  const leo = screen.getByRole('link', { name: /Leo/ })
  expect(leo).toHaveTextContent(t('nudges.noVisit'))
  expect(screen.getByText(t('nudges.sub'))).toBeInTheDocument()
})

test('FR-NUDGE-06 with no nudges, the empty state sends the coach to Today', async () => {
  renderLog([], 'coach')
  expect(await screen.findByRole('heading', { level: 2, name: t('nudges.empty') })).toBeInTheDocument()
  expect(screen.getByText(t('nudges.emptyBody'))).toBeInTheDocument()
  expect(screen.getByRole('link', { name: t('nudges.emptyAction') })).toHaveAttribute('href', '/app')
  expect(screen.getByText(t('nudges.subCoach'))).toBeInTheDocument()
})
