import type { QueryClient } from '@tanstack/react-query'
import type { ErrorCode } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { buttonClass } from '@tenure/ui'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, type InitialEntry } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../app/App.tsx'
import { features } from '../../app/features.ts'
import { createQueryClient } from '../../app/query-client.ts'
import type { WebFeature } from '../../app/registry.ts'
import { buildRoutes } from '../../app/router.tsx'
import { sessionKey } from '../../shared/session/session.ts'
import styles from './AuthPage.module.css'
import { FakeEventSource, json, me, mockFetch, signedOut } from '../../test/fakes.ts'

/** A guarded page to come back to after log-in. */
const reports: WebFeature = {
  name: 'reports-test',
  routes: [{ path: '/app/reports', screen: async () => ({ default: () => <h1>Reports</h1> }) }],
}

let client: QueryClient
function renderAt(entry: InitialEntry) {
  client = createQueryClient()
  const router = createMemoryRouter(buildRoutes([...features, reports]), { initialEntries: [entry] })
  render(<App client={client} router={router} />)
  return router
}

const apiError = (status: number, code: ErrorCode, message: string) => json(status, { error: { code, message } })

/** Signed out; the auth POST answers with `answer`. */
/** What GET /api/today answers once signed in: a gym with no members yet. */
const emptyGym = { kpis: { newMembers: 0, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 }, slipping: [], checkinsToday: [], board: [], hasMembers: false }

function signedOutWith(answer: () => Response | Promise<Response>) {
  return mockFetch((method, path) => {
    if (method === 'POST' && (path === '/api/auth/login' || path === '/api/auth/signup')) return answer()
    // Not the stall: the frame asks before it shows the way to the other screen.
    if (path === '/api/demo') return json(200, { stall: false })
    // The frame's quiet session check, as the server answers it signed out (B2-24).
    if (path === '/api/auth/session') return json(200, { session: null })
    // Today loads its data as soon as it opens; the session itself comes from the sign-in answer.
    if (path === '/api/today') return json(200, emptyGym)
    // The shell asks an owner's pilot day as soon as it opens.
    if (path === '/api/billing')
      return json(200, { pilotStartedOn: '2026-10-01', pilotDay: 37, endsOn: '2026-12-29', ended: false })
    // An owner's empty gym reads the kiosk's path from Settings for "Open the kiosk".
    if (path === '/api/settings')
      return json(200, {
        gym: me('owner').gym,
        kioskPath: '/kiosk/k10sk-token',
        kioskUrl: 'http://localhost/kiosk/k10sk-token',
        kioskUrls: ['http://localhost/kiosk/k10sk-token'],
        phoneUrls: [],
      })
    return signedOut()
  })
}

/** The parsed JSON body of each POST to `path`. */
const posted = (fetch: ReturnType<typeof mockFetch>, path: string): unknown[] =>
  fetch.mock.calls
    .filter(([input, init]) => String(input) === path && init?.method === 'POST')
    .map(([, init]) => JSON.parse(String(init?.body)) as unknown)

const field = (label: string) => screen.getByLabelText(label)
const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  FakeEventSource.install()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the sign-in frame', () => {
  test.each(['/login', '/signup'])(
    '%s: the mesh layers are hidden, and the card holds the logo and its title',
    async (path) => {
      signedOutWith(() => signedOut())
      renderAt(path)
      const main = await screen.findByRole('main')
      const ground = main.parentElement?.parentElement
      expect(ground?.querySelectorAll(':scope > [aria-hidden="true"]')).toHaveLength(2)
      expect(main.closest('[aria-hidden="true"]')).toBeNull()
      expect(within(main).getByText(t('brand.name'))).toBeVisible()
      // COPY §0: the tagline sits under the wordmark, above the title.
      const tagline = within(main).getByText(t('brand.tagline'))
      expect(tagline.previousElementSibling).toHaveTextContent(t('brand.name'))
      const title = within(main).getByRole('heading', { level: 1 })
      expect(tagline.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    },
  )

  test.each([
    ['/login', 'login.title'],
    ['/signup', 'signup.title'],
  ] as const)('%s: the tab title is the page title, then the brand', async (path, title) => {
    signedOutWith(() => signedOut())
    renderAt(path)
    await screen.findByRole('heading', { level: 1, name: t(title) })
    // The title is set in an effect after the page renders, so wait for it, as router.test.tsx does.
    await vi.waitFor(() => expect(document.title).toBe(`${t(title)} · ${t('brand.name')}`))
  })

  // ARCHITECTURE §9, links: a link that stands on its own is a quiet button, and keeps the link role.
  test('the footer: a prompt, then a small secondary-button link to the other screen', async () => {
    const look = buttonClass({ variant: 'secondary' })
    signedOutWith(() => signedOut())
    renderAt('/login')
    const toSignup = await screen.findByRole('link', { name: t('login.toSignup.link') })
    expect(toSignup).toHaveAttribute('href', '/signup')
    expect(toSignup.className).toBe(look)
    expect(toSignup.previousElementSibling?.textContent).toBe(t('login.toSignup'))

    await userEvent.click(toSignup)
    const toLogin = await screen.findByRole('link', { name: t('signup.toLogin.link') })
    expect(toLogin).toHaveAttribute('href', '/login')
    expect(toLogin.className).toBe(look)
    expect(toLogin.previousElementSibling?.textContent).toBe(t('signup.toLogin'))
  })

  test.each(['/login', '/signup'])(
    'B2-24 a signed-out visit to %s asks the quiet session, never me, so no 401 reaches the console',
    async (path) => {
      const fetch = signedOutWith(() => signedOut())
      renderAt(path)
      await screen.findByRole('heading', { level: 1 })
      await vi.waitFor(() => expect(fetch.mock.calls.map(([input]) => String(input))).toContain('/api/auth/session'))
      expect(fetch.mock.calls.map(([input]) => String(input))).not.toContain('/api/auth/me')
    },
  )

  test('B2-10 Log In shows one tagline, the one under the logo, with no second line under its title', async () => {
    signedOutWith(() => signedOut())
    renderAt('/login')
    const title = await screen.findByRole('heading', { level: 1, name: t('login.title') })
    expect(within(screen.getByRole('main')).getByText(t('brand.tagline'))).toBeVisible()
    expect(title.nextElementSibling).toBeNull()
    // The short card hangs a little above the middle; only Set Up's long form starts at the top margin.
    expect(screen.getByRole('main').parentElement?.parentElement?.className).not.toContain(styles.long)
  })

  test('Set Up Your Gym keeps its line under the title (FR-AUTH-03), and its long form starts at the top margin', async () => {
    signedOutWith(() => signedOut())
    renderAt('/signup')
    const title = await screen.findByRole('heading', { level: 1, name: t('signup.title') })
    expect(title.nextElementSibling).toHaveTextContent(t('signup.lede'))
    expect(screen.getByRole('main').parentElement?.parentElement?.className).toContain(styles.long)
  })

  test.each(['/login', '/signup'])('FR-AUTH-09 a signed-in visitor to %s goes straight to /app', async (path) => {
    mockFetch((_method, p) => (p === '/api/auth/session' ? json(200, { session: me('owner') }) : p === '/api/demo' ? json(200, { stall: false }) : signedOut()))
    const router = renderAt(path)
    expect(await screen.findByRole('heading', { name: t('today.owner.title') })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/app')
  })

  test('FR-AUTH-09 a signed-in visitor sent to /login by the guard goes on to the page they came for', async () => {
    mockFetch((_method, p) => (p === '/api/auth/session' ? json(200, { session: me('owner') }) : p === '/api/demo' ? json(200, { stall: false }) : signedOut()))
    const router = renderAt({ pathname: '/login', state: { from: '/app/reports?week=3' } })
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(router.state.location.pathname + router.state.location.search).toBe('/app/reports?week=3')
  })
})

describe('at the stall', () => {
  /** Stall mode, signed out until Try the Demo, which answers the demo owner's session; then Today opens as after log-in. */
  function atTheStall() {
    const fetch = signedOutWith(() => signedOut())
    const app = fetch.getMockImplementation()
    fetch.mockImplementation(async (input, init) => {
      const path = String(input)
      if (path === '/api/demo') return json(200, { stall: true })
      if (init?.method === 'POST' && path === '/api/demo/try') return json(200, me('owner', { isDemo: true }))
      return app ? app(input, init) : signedOut()
    })
    return fetch
  }

  test('FR-WEB-04 Log In offers Try the Demo in place of the sign-up, and it opens Today signed in to the demo gym', async () => {
    const fetch = atTheStall()
    const router = renderAt('/login')
    const main = await screen.findByRole('main')
    const tryDemo = await within(main).findByRole('button', { name: t('demo.try') })
    expect(within(main).queryByRole('link', { name: t('login.toSignup.link') })).toBeNull()
    expect(within(main).queryByText(t('login.toSignup'))).toBeNull()
    await userEvent.click(tryDemo)
    expect(await screen.findByRole('heading', { name: t('today.owner.title') })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/app')
    expect(posted(fetch, '/api/demo/try')).toHaveLength(1)
  })

  test('FR-WEB-04 while the stall question is open, the card holds a blank slot and neither button, so it keeps its height', async () => {
    mockFetch((_method, path) => (path === '/api/demo' ? new Promise<Response>(() => {}) : signedOut()))
    renderAt('/login')
    const main = await screen.findByRole('main')
    await within(main).findByRole('heading', { name: t('login.title') })
    expect(main.querySelector('div[aria-hidden="true"]')).not.toBeNull()
    expect(within(main).queryByRole('button', { name: t('demo.try') })).toBeNull()
    expect(within(main).queryByRole('link', { name: t('login.toSignup.link') })).toBeNull()
  })

  test('FR-WEB-04 /signup sends the visitor to the home page, and the form never shows', async () => {
    atTheStall()
    const router = renderAt('/signup')
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('button', { name: t('signup.submit') })).toBeNull()
  })

  test('outside stall mode, Log In keeps the sign-up link and shows no Try the Demo', async () => {
    mockFetch((_method, path) => (path === '/api/demo' ? json(200, { stall: false }) : signedOut()))
    renderAt('/login')
    expect(await screen.findByRole('link', { name: t('login.toSignup.link') })).toHaveAttribute('href', '/signup')
    expect(screen.queryByRole('button', { name: t('demo.try') })).toBeNull()
  })
})

describe('/login', () => {
  async function fill(email: string, password: string) {
    await screen.findByRole('heading', { name: t('login.title') })
    if (email) await userEvent.type(field(t('login.email')), email)
    if (password) await userEvent.type(field(t('login.password')), password)
    await userEvent.click(button(t('login.submit')))
  }

  test('its fields are labelled and say what to autofill', async () => {
    signedOutWith(() => signedOut())
    renderAt('/login')
    const email = await screen.findByRole('textbox', { name: t('login.email') })
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'email')
    expect(field(t('login.password'))).toHaveAttribute('type', 'password')
    expect(field(t('login.password'))).toHaveAttribute('autocomplete', 'current-password')
    expect(email).not.toHaveAttribute('aria-invalid')
  })

  test('empty fields: one line under each, marked invalid, focus on the first, nothing sent', async () => {
    const fetch = signedOutWith(() => json(200, me('owner')))
    renderAt('/login')
    await fill('', '')
    expect(field(t('login.email'))).toHaveAttribute('aria-invalid', 'true')
    expect(field(t('login.email'))).toHaveAccessibleDescription(t('err.email'))
    expect(field(t('login.password'))).toHaveAttribute('aria-invalid', 'true')
    expect(field(t('login.password'))).toHaveAccessibleDescription(t('login.passwordRequired'))
    expect(field(t('login.email'))).toHaveFocus()
    expect(posted(fetch, '/api/auth/login')).toEqual([])
  })

  test("changing a field clears that field's line; the other's stays", async () => {
    signedOutWith(() => json(200, me('owner')))
    renderAt('/login')
    await fill('', '')
    await userEvent.type(field(t('login.password')), 'x')
    expect(field(t('login.password'))).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText(t('login.passwordRequired'))).not.toBeInTheDocument()
    expect(field(t('login.email'))).toHaveAttribute('aria-invalid', 'true')
    expect(field(t('login.email'))).toHaveAccessibleDescription(t('err.email'))
  })

  test('an email in the wrong format is caught; a filled password passes', async () => {
    const fetch = signedOutWith(() => json(200, me('owner')))
    renderAt('/login')
    await fill('dana@gym', 'short')
    expect(field(t('login.email'))).toHaveAccessibleDescription(t('err.email'))
    expect(field(t('login.password'))).not.toHaveAttribute('aria-invalid')
    expect(posted(fetch, '/api/auth/login')).toEqual([])
  })

  test('sends exactly the email and password, with the button working under its submitting label', async () => {
    let answer: (r: Response) => void = () => {}
    const fetch = signedOutWith(() => new Promise<Response>((resolve) => (answer = resolve)))
    renderAt('/login')
    await fill('dana@gym.com', 'correct horse')
    const working = await screen.findByRole('button', { name: t('login.submitting') })
    expect(working).toHaveAttribute('aria-busy', 'true')
    expect(posted(fetch, '/api/auth/login')).toEqual([{ email: 'dana@gym.com', password: 'correct horse' }])
    answer(apiError(401, 'loginMismatch', t('api.loginMismatch')))
    expect(await screen.findByRole('button', { name: t('login.submit') })).not.toHaveAttribute('aria-busy')
  })

  test.each([
    ['a mismatch', () => apiError(401, 'loginMismatch', t('api.loginMismatch')), t('api.loginMismatch')],
    ['too many tries', () => apiError(429, 'loginTooMany', t('api.loginTooMany')), t('api.loginTooMany')],
    [
      'no network',
      () => {
        throw new TypeError('Failed to fetch')
      },
      t('err.network'),
    ],
  ])('%s: the sentence shows above the button and is announced', async (_name, answer, sentence) => {
    signedOutWith(answer)
    renderAt('/login')
    await fill('dana@gym.com', 'correct horse')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(sentence)
    expect(alert.nextElementSibling).toBe(button(t('login.submit')))
    expect(field(t('login.email'))).not.toHaveAttribute('aria-invalid')
    expect(field(t('login.password'))).not.toHaveAttribute('aria-invalid')
  })

  test('success clears the cache, seeds the session and opens Today without asking for it again', async () => {
    const fetch = signedOutWith(() => json(200, me('owner')))
    renderAt('/login')
    await screen.findByRole('heading', { name: t('login.title') })
    client.setQueryData(['today'], { stale: true })
    const meCalls = () => fetch.mock.calls.filter(([input]) => String(input) === '/api/auth/me').length
    const before = meCalls()
    await fill('dana@gym.com', 'correct horse')
    expect(await screen.findByRole('heading', { name: t('today.owner.title') })).toBeInTheDocument()
    expect(client.getQueryData(sessionKey)).toEqual(me('owner'))
    // The stale entry is gone; Today has since loaded its own fresh data.
    expect(client.getQueryData(['today'])).not.toEqual({ stale: true })
    expect(meCalls()).toBe(before)
  })

  test('success goes back to the page the guard sent the user from', async () => {
    signedOutWith(() => json(200, me('owner')))
    const router = renderAt({ pathname: '/login', state: { from: '/app/reports?week=3' } })
    await fill('dana@gym.com', 'correct horse')
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(router.state.location.pathname + router.state.location.search).toBe('/app/reports?week=3')
  })
})

describe('/signup', () => {
  const labels = {
    gymName: () => t('signup.gymName'),
    name: () => t('signup.name'),
    email: () => t('signup.email'),
    password: () => t('signup.password'),
  }
  const valid = { gymName: 'Northside Strength', name: 'Dana R.', email: 'dana@gym.com', password: 'correct horse' }

  async function fill(values: Partial<typeof valid>) {
    await screen.findByRole('heading', { name: t('signup.title') })
    for (const [key, value] of Object.entries(values) as [keyof typeof valid, string][]) {
      if (!value) continue
      await userEvent.click(field(labels[key]()))
      await userEvent.paste(value)
    }
    await userEvent.click(button(t('signup.submit')))
  }

  /** The browser reports this time zone. Set it before rendering: the Country choice is preset from it. */
  function browserZone(timeZone: string | undefined) {
    const real = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...real,
      timeZone: timeZone as string,
    })
  }
  const country = () => screen.getByRole('combobox', { name: t('signup.country') })

  // A US zone, so the Country choice starts on the United States, whatever this machine's own zone is.
  beforeEach(() => browserZone('America/Chicago'))

  test("its fields come in the deck's order, labelled, with autofill set and the password's help", async () => {
    signedOutWith(() => signedOut())
    renderAt('/signup')
    await screen.findByRole('heading', { name: t('signup.title') })
    expect(screen.getByText(t('signup.lede'))).toBeInTheDocument()
    const inputs = [...document.querySelectorAll('form input')]
    expect(inputs.map((i) => i.getAttribute('autocomplete'))).toEqual(['organization', 'name', 'email', 'new-password'])
    expect(inputs).toEqual(Object.values(labels).map((label) => field(label())))
    expect(field(t('signup.password'))).toHaveAccessibleDescription(t('signup.passwordHelp'))
    // FR-AUTH-01: the Country choice comes last, after the password.
    expect(field(t('signup.password')).compareDocumentPosition(country()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test.each([
    ['America/Chicago', 'US'],
    ['America/Vancouver', 'CA'],
    ['Europe/London', 'GB'],
    ['Asia/Karachi', 'PK'],
    ['Asia/Dubai', 'AE'],
  ])('FR-AUTH-02 a browser in %s starts the Country choice on %s, among the five markets', async (zone, code) => {
    browserZone(zone)
    signedOutWith(() => signedOut())
    renderAt('/signup')
    await screen.findByRole('heading', { name: t('signup.title') })
    expect(country()).toHaveValue(code)
    const options = within(country()).getAllByRole('option')
    expect(options.map((o) => [o.getAttribute('value'), o.textContent])).toEqual(
      (['US', 'CA', 'GB', 'PK', 'AE'] as const).map((c) => [c, t(`country.${c}`)]),
    )
  })

  test.each([['Asia/Kolkata'], ['UTC'], [undefined]])(
    'FR-AUTH-02 a browser zone outside the five (%s) leaves the Country choice empty',
    async (zone) => {
      browserZone(zone)
      signedOutWith(() => signedOut())
      renderAt('/signup')
      await screen.findByRole('heading', { name: t('signup.title') })
      expect(country()).toHaveValue('')
      expect(within(country()).getAllByRole('option')[0]).toHaveTextContent(t('signup.countryPick'))
      expect(within(country()).getAllByRole('option')).toHaveLength(6)
    },
  )

  test('FR-AUTH-02 no country chosen: its line under the choice, focus on it, nothing sent', async () => {
    browserZone('Asia/Kolkata')
    const fetch = signedOutWith(() => json(201, me('owner')))
    renderAt('/signup')
    await fill(valid)
    expect(country()).toHaveAttribute('aria-invalid', 'true')
    expect(country()).toHaveAccessibleDescription(t('signup.countryRequired'))
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1)
    expect(country()).toHaveFocus()
    expect(posted(fetch, '/api/auth/signup')).toEqual([])
    // Choosing one clears the line, and the form goes.
    await userEvent.selectOptions(country(), 'GB')
    expect(country()).not.toHaveAttribute('aria-invalid')
    await userEvent.click(button(t('signup.submit')))
    await screen.findByRole('heading', { name: t('today.owner.title') })
    expect(posted(fetch, '/api/auth/signup')).toEqual([{ ...valid, timezone: 'Asia/Kolkata', country: 'GB' }])
  })

  test('FR-AUTH-01 the country chosen is sent, not the one detected', async () => {
    const fetch = signedOutWith(() => json(201, me('owner')))
    renderAt('/signup')
    await screen.findByRole('heading', { name: t('signup.title') })
    await userEvent.selectOptions(country(), 'PK')
    await fill(valid)
    await screen.findByRole('heading', { name: t('today.owner.title') })
    expect(posted(fetch, '/api/auth/signup')).toEqual([{ ...valid, timezone: 'America/Chicago', country: 'PK' }])
  })

  test('empty fields: the line for each, in place, focus on the first, nothing sent', async () => {
    const fetch = signedOutWith(() => json(201, me('owner')))
    renderAt('/signup')
    await fill({})
    expect(field(t('signup.gymName'))).toHaveAccessibleDescription(t('signup.gymNameRequired'))
    expect(field(t('signup.name'))).toHaveAccessibleDescription(t('signup.nameRequired'))
    expect(field(t('signup.email'))).toHaveAccessibleDescription(t('err.email'))
    expect(field(t('signup.password'))).toHaveAccessibleDescription(`${t('signup.passwordHelp')} ${t('err.password')}`)
    for (const label of Object.values(labels)) expect(field(label())).toHaveAttribute('aria-invalid', 'true')
    expect(field(t('signup.gymName'))).toHaveFocus()
    expect(posted(fetch, '/api/auth/signup')).toEqual([])
  })

  test.each([
    ['a blank gym name', { gymName: '   ' }, 'gymName', t('signup.gymNameRequired')],
    ['a blank name', { name: '  ' }, 'name', t('signup.nameRequired')],
    ['an email in the wrong format', { email: 'dana at gym' }, 'email', t('err.email')],
    ['a short password', { password: 'seven77' }, 'password', t('err.password')],
    ['a password over 200 characters', { password: 'x'.repeat(201) }, 'password', t('api.passwordTooLong')],
  ] as const)('%s is caught before sending, and only that field', async (_name, change, key, line) => {
    const fetch = signedOutWith(() => json(201, me('owner')))
    renderAt('/signup')
    await fill({ ...valid, ...change })
    expect(field(labels[key]())).toHaveAttribute('aria-invalid', 'true')
    expect(field(labels[key]()).getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText(line)).toBeInTheDocument()
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1)
    expect(field(labels[key]())).toHaveFocus()
    expect(posted(fetch, '/api/auth/signup')).toEqual([])
  })

  test("FR-AUTH-01 sends the fields, the country and the browser's time zone, with the button working", async () => {
    let answer: (r: Response) => void = () => {}
    const fetch = signedOutWith(() => new Promise<Response>((resolve) => (answer = resolve)))
    renderAt('/signup')
    await fill(valid)
    expect(await screen.findByRole('button', { name: t('signup.submitting') })).toHaveAttribute('aria-busy', 'true')
    expect(posted(fetch, '/api/auth/signup')).toEqual([{ ...valid, timezone: 'America/Chicago', country: 'US' }])
    answer(json(201, me('owner')))
    expect(await screen.findByRole('heading', { name: t('today.owner.title') })).toBeInTheDocument()
  })

  test.each([['Not/AZone'], [undefined]])('a time zone the API would refuse (%s) is left out', async (zone) => {
    browserZone(zone)
    const fetch = signedOutWith(() => json(201, me('owner')))
    renderAt('/signup')
    await screen.findByRole('heading', { name: t('signup.title') })
    await userEvent.selectOptions(country(), 'CA')
    await fill(valid)
    await screen.findByRole('heading', { name: t('today.owner.title') })
    expect(posted(fetch, '/api/auth/signup')).toEqual([{ ...valid, country: 'CA' }])
  })

  test.each([
    ['gymName', t('api.gymName'), 'gymName'],
    ['yourName', t('api.yourName'), 'name'],
    ['email', 'Enter an email like name@gym.com.', 'email'],
    ['password', 'Use 8 characters or more.', 'password'],
    ['passwordTooLong', t('api.passwordTooLong'), 'password'],
    ['duplicate', t('api.duplicate'), 'email'],
    ['country', t('api.country'), 'country'],
  ] as const)('the server answering %s: its sentence goes under that field', async (code, sentence, key) => {
    signedOutWith(() => apiError(code === 'duplicate' ? 409 : 400, code, sentence))
    renderAt('/signup')
    await fill(valid)
    await screen.findByText(sentence)
    const control = key === 'country' ? country() : field(labels[key]())
    expect(control).toHaveAttribute('aria-invalid', 'true')
    expect(control).toHaveAccessibleDescription(expect.stringContaining(sentence))
    expect(screen.getAllByText(sentence)).toHaveLength(1)
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // Focus moves to the field, so its error is read.
    expect(control).toHaveFocus()
  })

  test("changing a field clears that field's line, the client's or the server's; the others stay", async () => {
    signedOutWith(() => apiError(409, 'duplicate', t('api.duplicate')))
    renderAt('/signup')
    await fill({})
    await userEvent.type(field(t('signup.gymName')), 'N')
    expect(field(t('signup.gymName'))).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText(t('signup.gymNameRequired'))).not.toBeInTheDocument()
    for (const label of [t('signup.name'), t('signup.email'), t('signup.password')]) {
      expect(field(label)).toHaveAttribute('aria-invalid', 'true')
    }

    // The server's 'duplicate' under the email goes once the email changes.
    await fill(valid)
    expect(await screen.findByText(t('api.duplicate'))).toBeInTheDocument()
    await userEvent.type(field(t('signup.email')), 'x')
    expect(screen.queryByText(t('api.duplicate'))).not.toBeInTheDocument()
    expect(field(t('signup.email'))).not.toHaveAttribute('aria-invalid')
  })

  test.each([
    ['generic', () => apiError(400, 'generic', t('api.generic')), t('api.generic')],
    ['timezone', () => apiError(400, 'timezone', t('api.timezone')), t('api.timezone')],
    ['signupTooMany', () => apiError(429, 'signupTooMany', t('api.signupTooMany')), t('api.signupTooMany')],
    [
      'no network',
      () => {
        throw new TypeError('Failed to fetch')
      },
      t('err.network'),
    ],
  ])('%s: the sentence shows above the button and is announced', async (_name, answer, sentence) => {
    signedOutWith(answer)
    renderAt('/signup')
    await fill(valid)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(sentence)
    expect(alert.nextElementSibling).toBe(button(t('signup.submit')))
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  })

  test('success clears the cache, seeds the session and goes to the page the user came for', async () => {
    signedOutWith(() => json(201, me('owner')))
    const router = renderAt({ pathname: '/signup', state: { from: '/app/reports' } })
    await screen.findByRole('heading', { name: t('signup.title') })
    client.setQueryData(['today'], { stale: true })
    await fill(valid)
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/app/reports')
    expect(client.getQueryData(sessionKey)).toEqual(me('owner'))
    // The stale entry is gone; Today has since loaded its own fresh data.
    expect(client.getQueryData(['today'])).not.toEqual({ stale: true })
  })
})
