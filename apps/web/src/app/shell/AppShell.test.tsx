// The shell around every /app page: the pilot day's place held while billing loads (audit B2-06), and the Skip to
// Content link ahead of the sidebar (audit B2-23).
import type { Role } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
const billing = { pilotStartedOn: '2026-10-01', pilotDay: 24, endsOn: '2026-12-29', ended: false }

/** Renders /app for `role`, with /api/billing answering only once the returned function is called. */
function renderHeld(role: Role) {
  let answer = () => {}
  const held = new Promise<Response>((ok) => (answer = () => ok(json(200, billing))))
  mockFetch((_method, url) => {
    if (url === '/api/auth/me') return json(200, me(role))
    if (url === '/api/today') return json(200, emptyGym)
    if (url === '/api/billing') return held
    return json(404, { error: { code: 'notApi', message: 'No.' } })
  })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: ['/app'] })
  render(<App client={createQueryClient()} router={router} />)
  return () => act(async () => answer())
}

beforeEach(() => FakeEventSource.install())
afterEach(() => vi.unstubAllGlobals())

const slot = () => screen.getByRole('banner').querySelector(`.${styles.pilotSlot}`)

test("FR-SHELL-03 while billing loads, an owner's sidebar holds the pilot day's line, so nothing below it moves (audit B2-06)", async () => {
  const answer = renderHeld('owner')
  await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
  expect(slot()).not.toBeNull()
  expect(slot()).toHaveAttribute('aria-hidden', 'true')
  expect(slot()).toBeEmptyDOMElement()
  await answer()
  expect(await screen.findByText(t('shell.pilot', { n: 24 }))).toBeInTheDocument()
  expect(slot()).toBeNull()
})

test('FR-SHELL-03 a coach, who has no pilot line, gets no place held for one', async () => {
  renderHeld('coach')
  await screen.findByRole('heading', { level: 1, name: t('today.coach.title') })
  expect(slot()).toBeNull()
})

test('FR-SHELL-06 the first Tab reaches Skip to Content, which takes focus past the sidebar to the page title (audit B2-23)', async () => {
  const user = userEvent.setup()
  renderHeld('owner')
  const title = await screen.findByRole('heading', { level: 1, name: t('today.owner.title') })
  await user.tab()
  const skip = screen.getByRole('link', { name: t('shell.skip') })
  expect(skip).toHaveFocus()
  // Ahead of everything in the header: the logo's link home and every sidebar item come after it.
  const header = screen.getByRole('banner')
  expect(skip.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  await user.keyboard('{Enter}')
  expect(title).toHaveFocus()
  expect(title).toHaveAttribute('data-route-focus', 'keyboard')
})
