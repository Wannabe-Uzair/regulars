import type { QueryClient } from '@tanstack/react-query'
import type { MeResponse, SettingsResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { US_ZONES, zoneCity, zonesFor } from '@tenure/domain'
import { buttonClass } from '@tenure/ui'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../app/App.tsx'
import { features } from '../../app/features.ts'
import { createQueryClient } from '../../app/query-client.ts'
import { buildRoutes } from '../../app/router.tsx'
import { sessionKey } from '../../shared/session/session.ts'
import { FakeEventSource, json, me, mockFetch, signedOut } from '../../test/fakes.ts'
import panelStyles from './components/settings.module.css'

const KIOSK = 'http://192.168.137.1:5175/kiosk/kiosk-token-1'
const PHONE = 'http://192.168.137.1:5175'

let session: MeResponse
let settings: SettingsResponse
let settingsAnswer: () => Response | Promise<Response>
let patchAnswer: (body: Record<string, unknown>) => Response
let logoutAnswer: () => Response
let loggedOut: boolean
let client: QueryClient
let fetch: ReturnType<typeof mockFetch>
let execCommand: ReturnType<typeof vi.fn<(command: string) => boolean>>

/** The PATCH answer the API would give: the fields sent saved over the gym. */
const saved = (body: Record<string, unknown>) => {
  settings = { ...settings, gym: { ...settings.gym, ...body } }
  session = { ...session, gym: settings.gym }
  return json(200, settings)
}

function renderAt(path: string, role: 'owner' | 'coach' = 'owner') {
  session = me(role)
  settings = {
    gym: session.gym,
    kioskPath: '/kiosk/kiosk-token-1',
    kioskUrl: KIOSK,
    kioskUrls: [KIOSK],
    phoneUrls: [PHONE],
  }
  fetch = mockFetch((method, path) => {
    if (path === '/api/auth/me') return loggedOut ? signedOut() : json(200, session)
    if (path === '/api/auth/logout' && method === 'POST') {
      const answer = logoutAnswer()
      loggedOut = answer.ok
      return answer
    }
    if (path === '/api/settings' && method === 'GET') return settingsAnswer()
    if (path === '/api/settings' && method === 'PATCH') {
      const [, init] = fetch.mock.calls.at(-1) ?? []
      return patchAnswer(JSON.parse(String(init?.body)) as Record<string, unknown>)
    }
    return json(404, { error: { code: 'notApi', message: "That isn't part of the Regulars API." } })
  })
  client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [path] })
  render(<App client={client} router={router} />)
  return router
}

const calls = (method: string, path: string) =>
  fetch.mock.calls.filter(([url, init]) => String(url) === path && (init?.method ?? 'GET') === method)
const patched = () => calls('PATCH', '/api/settings').map(([, init]) => JSON.parse(String(init?.body)) as unknown)
const select = (label: string) => screen.getByLabelText<HTMLSelectElement>(label)
const optionTexts = (label: string) => [...select(label).options].map((o) => o.textContent)
const save = () => userEvent.click(screen.getByRole('button', { name: t('common.save') }))

/** A Settings panel, by its heading: the heading sits in the panel's header, which sits in the panel. */
const panelOf = (heading: HTMLElement) => heading.parentElement?.parentElement ?? heading
const panel = async (name: string) => panelOf(await screen.findByRole('heading', { name }))
const panelNow = (name: string) => panelOf(screen.getByRole('heading', { name }))

beforeEach(() => {
  FakeEventSource.install()
  settingsAnswer = () => json(200, settings)
  patchAnswer = saved
  logoutAnswer = () => json(200, { ok: true })
  loggedOut = false
  // jsdom is not a secure context, as the stall's plain-HTTP LAN address isn't: copying takes the textarea fallback.
  execCommand = vi.fn<(command: string) => boolean>(() => true)
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'execCommand')
})

describe('Settings, the gym form', () => {
  test('FR-GYM-01 a coach who opens Settings is sent to Today', async () => {
    const router = renderAt('/app/settings', 'coach')
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))
    expect(calls('GET', '/api/settings')).toHaveLength(0)
  })

  test("FR-GYM-01 a failed load shows the server's sentence, and Try again loads it", async () => {
    settingsAnswer = () => json(500, { error: { code: 'generic', message: 'Something went wrong.' } })
    renderAt('/app/settings')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.')
    settingsAnswer = () => json(200, settings)
    await userEvent.click(screen.getByRole('button', { name: t('common.retry') }))
    expect(await screen.findByLabelText(t('settings.gym.name'))).toHaveValue('Northside Strength')
  })

  test('FR-GYM-01 Save sends only what changed, puts the gym into the session and toasts', async () => {
    renderAt('/app/settings')
    const name = await screen.findByLabelText(t('settings.gym.name'))
    await userEvent.clear(name)
    await userEvent.type(name, '  Northside Two  ')
    await save()
    expect(await screen.findByText(t('settings.saved'))).toBeVisible()
    expect(patched()).toEqual([{ name: 'Northside Two' }])
    expect(client.getQueryData<MeResponse>(sessionKey)?.gym.name).toBe('Northside Two')
    // The shell's gym name follows the session.
    expect(screen.getAllByText('Northside Two').length).toBeGreaterThan(0)
    expect(name).toHaveValue('Northside Two')
  })

  test('FR-GYM-01 a blank name says why under the field and sends nothing', async () => {
    renderAt('/app/settings')
    const name = await screen.findByLabelText(t('settings.gym.name'))
    await userEvent.clear(name)
    await userEvent.type(name, '   ')
    await save()
    expect(name).toHaveAccessibleDescription(t('api.gymName'))
    expect(name).toHaveFocus()
    expect(patched()).toEqual([])
  })

  test("FR-GYM-01 a server refusal shows the server's sentence above the button", async () => {
    patchAnswer = () => json(400, { error: { code: 'timezone', message: 'Choose a timezone from the list.' } })
    renderAt('/app/settings')
    await userEvent.selectOptions(await screen.findByLabelText(t('settings.gym.tz')), 'America/Denver')
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a timezone from the list.')
  })

  test("FR-GYM-02 a US gym's zones are the old 7, by city; another country lists its own, east to west", async () => {
    renderAt('/app/settings')
    await screen.findByLabelText(t('settings.gym.tz'))
    expect(optionTexts(t('settings.gym.country'))).toEqual([
      t('country.CA'),
      t('country.PK'),
      t('country.AE'),
      t('country.GB'),
      t('country.US'),
    ])
    expect(select(t('settings.gym.country'))).toHaveValue('US')
    expect(optionTexts(t('settings.gym.tz'))).toEqual(US_ZONES.map(zoneCity))
    expect(select(t('settings.gym.tz'))).toHaveValue('America/Chicago')
    await userEvent.selectOptions(select(t('settings.gym.country')), 'CA')
    expect(optionTexts(t('settings.gym.tz'))).toEqual(zonesFor('CA').map(zoneCity))
  })

  test("FR-GYM-01 a Country change moves the zone to the country's own, and the owner can pick another of its zones", async () => {
    renderAt('/app/settings')
    const country = await screen.findByLabelText(t('settings.gym.country'))
    // Chicago isn't in Canada: the zone moves to Toronto.
    await userEvent.selectOptions(country, 'CA')
    expect(select(t('settings.gym.tz'))).toHaveValue('America/Toronto')
    await userEvent.selectOptions(select(t('settings.gym.tz')), 'America/Vancouver')
    await save()
    await screen.findByText(t('settings.saved'))
    expect(patched()).toEqual([{ country: 'CA', timezone: 'America/Vancouver' }])
    // Vancouver is in Canada too, so moving back and forth keeps a zone of the country chosen.
    await userEvent.selectOptions(select(t('settings.gym.country')), 'PK')
    expect(select(t('settings.gym.tz'))).toHaveValue('Asia/Karachi')
    expect(optionTexts(t('settings.gym.tz'))).toEqual(['Karachi'])
  })

  test("FR-GYM-02 a US gym on a zone outside the old 7 sees it first, and saving the name doesn't move it", async () => {
    renderAt('/app/settings')
    settings = { ...settings, gym: { ...settings.gym, timezone: 'America/Boise' } }
    session = { ...session, gym: settings.gym }
    await screen.findByLabelText(t('settings.gym.tz'))
    await act(() => client.invalidateQueries({ queryKey: ['settings'] }))
    await waitFor(() => expect(select(t('settings.gym.tz'))).toHaveValue('America/Boise'))
    expect(optionTexts(t('settings.gym.tz'))).toEqual(['Boise', ...US_ZONES.map(zoneCity)])
    await userEvent.type(screen.getByLabelText(t('settings.gym.name')), ' Two')
    await save()
    await screen.findByText(t('settings.saved'))
    expect(patched()).toEqual([{ name: 'Northside Strength Two' }])
  })

  test("FR-GYM-05 settings.updated from another device refreshes Settings and the session's gym", async () => {
    renderAt('/app/settings')
    await screen.findByLabelText(t('settings.gym.name'))
    const before = [calls('GET', '/api/settings').length, calls('GET', '/api/auth/me').length]
    settings = { ...settings, gym: { ...settings.gym, name: 'Renamed elsewhere' } }
    session = { ...session, gym: settings.gym }
    act(() => FakeEventSource.instances[0]?.emit({ type: 'settings.updated', gymId: 1 }))
    await waitFor(() => expect(screen.getByLabelText(t('settings.gym.name'))).toHaveValue('Renamed elsewhere'))
    expect(calls('GET', '/api/settings').length).toBe((before[0] ?? 0) + 1)
    expect(calls('GET', '/api/auth/me').length).toBe((before[1] ?? 0) + 1)
  })
})

describe('Settings, the kiosk and phone links', () => {
  test('FR-GYM-03 the kiosk link with its QR code, Copy on plain HTTP, and Open the kiosk in a new tab', async () => {
    renderAt('/app/settings')
    const kiosk = await panel(t('kiosk.set.title'))
    const qr = within(kiosk).getByRole('img', { name: t('phone.qr', { url: KIOSK }) })
    expect(qr).toHaveAttribute('src', `/api/qr?text=${encodeURIComponent(KIOSK)}`)
    expect(within(kiosk).getByText(t('kiosk.set.body'))).toBeVisible()
    // The QR code shows at once; the link and Copy Link only after Show Link.
    expect(within(kiosk).getByText(KIOSK)).not.toBeVisible()
    expect(within(kiosk).queryByRole('button', { name: t('kiosk.set.copy') })).toBeNull()
    await userEvent.click(within(kiosk).getByRole('button', { name: t('settings.link.show') }))
    expect(within(kiosk).getByText(KIOSK)).toBeVisible()
    await userEvent.click(within(kiosk).getByRole('button', { name: t('kiosk.set.copy') }))
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(await screen.findByText(t('kiosk.set.copied'))).toBeVisible()
    const open = within(kiosk).getByRole('link', { name: t('kiosk.set.open') })
    expect(open).toHaveAttribute('href', '/kiosk/kiosk-token-1')
    expect(open).toHaveAttribute('target', '_blank')
  })

  test('FR-GYM-03 each link stays behind Show Link, which reads Hide Link and sets aria-expanded while it shows', async () => {
    renderAt('/app/settings')
    const kiosk = await panel(t('kiosk.set.title'))
    const show = within(kiosk).getByRole('button', { name: t('settings.link.show') })
    expect(show).toHaveAttribute('aria-expanded', 'false')
    const shown = document.getElementById(show.getAttribute('aria-controls') ?? '')
    expect(shown).toContainElement(within(kiosk).getByText(KIOSK))
    expect(shown).not.toBeVisible()

    await userEvent.click(show)
    expect(show).toHaveAccessibleName(t('settings.link.hide'))
    expect(show).toHaveAttribute('aria-expanded', 'true')
    expect(shown).toBeVisible()
    expect(within(kiosk).getByRole('group', { name: t('kiosk.set.title') })).toHaveTextContent(KIOSK)
    // Each link has its own: the phone's stays closed.
    const phone = panelNow(t('phone.title'))
    expect(within(phone).getByRole('button', { name: t('settings.link.show') })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(within(phone).getByText(PHONE)).not.toBeVisible()

    await userEvent.click(show)
    expect(show).toHaveAccessibleName(t('settings.link.show'))
    expect(show).toHaveAttribute('aria-expanded', 'false')
    expect(shown).not.toBeVisible()
  })

  test('FR-GYM-03 a copy that fails says how to copy by hand', async () => {
    execCommand.mockReturnValue(false)
    renderAt('/app/settings')
    const phone = await panel(t('phone.title'))
    await userEvent.click(within(phone).getByRole('button', { name: t('settings.link.show') }))
    await userEvent.click(within(phone).getByRole('button', { name: t('phone.copy') }))
    expect(await within(phone).findByRole('alert')).toHaveTextContent(t('common.copyFailed'))
  })

  test('FR-GYM-03 the QR codes come first, Kiosk then Open on a Phone, the gym form next and the Account group last', async () => {
    renderAt('/app/settings')
    const kiosk = await panel(t('kiosk.set.title'))
    const phone = panelNow(t('phone.title'))
    const gym = screen.getByLabelText(t('settings.gym.name'))
    const account = panelNow(t('settings.account.title'))
    const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(kiosk, phone)).toBe(true)
    expect(follows(phone, gym)).toBe(true)
    expect(follows(gym, account)).toBe(true)
    expect(account.parentElement?.lastElementChild).toBe(account)
    // The phone steps are two, under its QR code.
    expect(within(phone).getByText(t('phone.step1'))).toBeVisible()
    expect(within(phone).getByText(t('phone.step2'))).toBeVisible()
    expect(screen.queryByText(/^3\. Scan/)).toBeNull()
  })

  test('FR-GYM-03 each phone link has its QR code and Copy; with none, Settings says how to get one', async () => {
    renderAt('/app/settings')
    const phone = await panel(t('phone.title'))
    expect(within(phone).getByRole('img', { name: t('phone.qr', { url: PHONE }) })).toHaveAttribute(
      'src',
      `/api/qr?text=${encodeURIComponent(PHONE)}`,
    )
    await userEvent.click(within(phone).getByRole('button', { name: t('settings.link.show') }))
    expect(within(phone).getByText(PHONE)).toBeVisible()
    await userEvent.click(within(phone).getByRole('button', { name: t('phone.copy') }))
    expect(await screen.findByText(t('phone.copied'))).toBeVisible()

    settings = { ...settings, phoneUrls: [] }
    await act(() => client.invalidateQueries({ queryKey: ['settings'] }))
    expect(await screen.findByText(t('phone.none'))).toBeVisible()
    // The steps, the QR code and Show Link all go with the links (and the panel is still the live one).
    expect(within(phone).getByText(t('phone.none'))).toBeVisible()
    expect(within(phone).queryByRole('img')).toBeNull()
    expect(within(phone).queryByRole('button', { name: t('settings.link.show') })).toBeNull()
    expect(within(phone).queryByText(t('phone.step1'))).toBeNull()
  })

  test('FR-GYM-04 the import box is left out of the stall version', async () => {
    renderAt('/app/settings')
    await screen.findByLabelText(t('settings.gym.name'))
    expect(screen.queryByText(t('settings.import.link'))).toBeNull()
  })
})

describe('Settings, the Account group', () => {
  test("FR-SHELL-01 an owner logs out from Settings' Account group", async () => {
    const router = renderAt('/app/settings')
    const account = await panel(t('settings.account.title'))
    await userEvent.click(within(account).getByRole('button', { name: t('nav.logout') }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(calls('POST', '/api/auth/logout')).toHaveLength(1)
    // Nothing of Settings comes back into the cleared cache (FR-AUTH-05): only the session, signed out, and the login page's stall question.
    expect(
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey),
    ).toEqual([sessionKey, ['demo']])
  })

  test('FR-SHELL-01 Log Out is a plain action in the tint, as Show Link is, not text-coloured words (audit A16)', async () => {
    renderAt('/app/settings')
    const account = await panel(t('settings.account.title'))
    const logout = within(account).getByRole('button', { name: t('nav.logout') })
    expect(logout).toHaveClass(...buttonClass({ variant: 'plain' }).split(' '))
  })

  test('FR-SHELL-01 a log-out that fails says why in the Account group', async () => {
    logoutAnswer = () => json(500, { error: { code: 'generic', message: 'Something went wrong.' } })
    const router = renderAt('/app/settings')
    const account = await panel(t('settings.account.title'))
    await userEvent.click(within(account).getByRole('button', { name: t('nav.logout') }))
    expect(await within(account).findByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(router.state.location.pathname).toBe('/app/settings')
  })

  test("FR-SHELL-01 Log Out stays in Settings when Settings can't load", async () => {
    settingsAnswer = () => json(500, { error: { code: 'generic', message: 'Something went wrong.' } })
    renderAt('/app/settings')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.')
    const account = panelNow(t('settings.account.title'))
    expect(within(account).getByRole('button', { name: t('nav.logout') })).toBeVisible()
  })
})

describe('Settings, loading', () => {
  test("FR-GYM-01 while Settings loads, its panels hold their words and the QR codes' and fields' frames, then the gym (audit B2-07)", async () => {
    const pending = Promise.withResolvers<Response>()
    settingsAnswer = () => pending.promise
    renderAt('/app/settings')
    const region = await waitFor(() => {
      const busy = document.querySelector<HTMLElement>('[aria-busy="true"]:has(> [inert])')
      expect(busy).not.toBeNull()
      return busy as HTMLElement
    })
    expect(within(region).getByRole('status')).toHaveTextContent(t('common.loading'))
    const shapes = region.querySelector<HTMLElement>(':scope > [inert]') as HTMLElement
    expect(shapes).toHaveAttribute('aria-hidden', 'true')
    // The four panels in order, by their titles, each in the class it has once loaded.
    expect([...shapes.querySelectorAll('h2')].map((h) => h.textContent)).toEqual([
      t('kiosk.set.title'),
      t('phone.title'),
      t('settings.gym.title'),
      t('settings.account.title'),
    ])
    expect(panelOf(within(shapes).getByText(t('phone.title')))).toHaveClass(panelStyles.laptopOnly as string)
    expect(panelOf(within(shapes).getByText(t('settings.account.title')))).toHaveClass(panelStyles.noSidebar as string)
    // A QR-sized placeholder per link, and the gym form's three labels over placeholders where their values will be.
    expect(shapes.querySelectorAll(`.${panelStyles.qr}`)).toHaveLength(2)
    for (const label of ['settings.gym.name', 'settings.gym.country', 'settings.gym.tz'] as const) {
      expect(within(shapes).getByText(t(label)).nextElementSibling).toHaveAttribute('aria-hidden', 'true')
    }
    expect(within(shapes).getByText(t('kiosk.set.body'))).toBeInTheDocument()

    await act(async () => pending.resolve(json(200, settings)))
    expect(await screen.findByLabelText(t('settings.gym.name'))).toHaveValue('Northside Strength')
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
