import type { ErrorCode, KioskGymResponse, KioskWelcome } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../../app/App.tsx'
import { features } from '../../../app/features.ts'
import { createQueryClient } from '../../../app/query-client.ts'
import { buildRoutes } from '../../../app/router.tsx'
import { FakeEventSource, json, mockFetch } from '../../../test/fakes.ts'
import { SEARCH_PAUSE_MS } from '../components/NameSearch.tsx'
import { START_OVER_MS, STILL_THERE_MS } from './Kiosk.tsx'
import { START_OVER_SECONDS } from '../components/StillThere.tsx'

const K = '/api/kiosk/tok'

const gym = (over: Partial<KioskGymResponse> = {}): KioskGymResponse => ({
  gymName: 'Northside Strength',
  isDemo: false,
  country: 'US',
  ...over,
})
const welcome = (over: Partial<KioskWelcome> = {}): KioskWelcome => ({
  firstName: 'Sam',
  greeting: 'back',
  week: 3,
  weekNumber: 4,
  day: 24,
  visitsThisWeek: 1,
  visitsLine: 'visit',
  status: 'slipping',
  ...over,
})
const failure = (status: number, code: ErrorCode, message: string) => json(status, { error: { code, message } })
/** The welcome's visits line, in its words. */
const welcomeLineText = (n: number, line: KioskWelcome['visitsLine']) =>
  line === 'line'
    ? t('kiosk.welcome.line')
    : line === 'visit'
      ? t('kiosk.welcome.visit')
      : t('kiosk.welcome.visits', { n })

type Answer = () => Response | Promise<Response>
let answers: Record<string, Answer>

/** Render /kiosk/tok, answering `GET /api/kiosk/tok` with the gym unless a test says otherwise. */
function renderKiosk(over: Record<string, Answer> = {}) {
  answers = { [`GET ${K}`]: () => json(200, gym()), ...over }
  const fetch = mockFetch((method, path) => {
    const answer = answers[`${method} ${path}`]
    return answer ? answer() : failure(404, 'notApi', "That isn't part of the Regulars API.")
  })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: ['/kiosk/tok'] })
  render(<App client={createQueryClient()} router={router} />)
  /** The bodies posted to a path, parsed. */
  const posted = (path: string) =>
    fetch.mock.calls
      .filter(([input, init]) => String(input) === path && init?.method === 'POST')
      .map(([, init]) => JSON.parse(String(init?.body)) as unknown)
  const asked = (path: string) => fetch.mock.calls.filter(([input]) => String(input) === path).length
  return { fetch, posted, asked }
}

const user = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
const ready = () => screen.findByRole('group', { name: t('kiosk.keypad.label') })
const number = () => screen.getByRole('status', { name: t('kiosk.display.label') })
const key = (name: string) =>
  within(screen.getByRole('group', { name: t('kiosk.keypad.label') })).getByRole('button', { name })
const checkInButton = () => screen.getByRole('button', { name: t('kiosk.keypad.submit') })
const tap = async (u: ReturnType<typeof user>, digits: string) => {
  for (const d of digits) await u.click(key(d))
}
const headline = () => screen.getByRole('heading', { level: 1 })
/** The segmented choice's two ways in (FR-KIOSK-02). */
const byName = () => screen.getByRole('radio', { name: t('kiosk.mode.name') })
const byPhone = () => screen.getByRole('radio', { name: t('kiosk.mode.phone') })
/** The number's slots: those holding a digit, and the empty ones after them. */
const slotsOf = () => ({
  text: number().textContent,
  empty: number().querySelectorAll('[data-slot="empty"]'),
})

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  FakeEventSource.install()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the start', () => {
  test("FR-KIOSK-01 it loads the gym without a session or a live stream: the gym's name, the title, and the number above the keypad", async () => {
    const { asked } = renderKiosk()
    await ready()
    expect(screen.getByText('Northside Strength')).toBeInTheDocument()
    expect(headline()).toHaveTextContent(t('kiosk.idle.title'))
    expect(screen.getByText(t('kiosk.idle.prompt'))).toBeInTheDocument()
    expect(screen.queryByText(t('tag.sample'))).not.toBeInTheDocument()
    const keypad = screen.getByRole('group', { name: t('kiosk.keypad.label') })
    expect(number().compareDocumentPosition(keypad) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(asked('/api/auth/me')).toBe(0)
    expect(FakeEventSource.instances).toEqual([])
  })

  test('FR-KIOSK-07 the demo gym shows the Sample data tag', async () => {
    renderKiosk({ [`GET ${K}`]: () => json(200, gym({ isDemo: true })) })
    await ready()
    expect(screen.getByText(t('tag.sample'))).toBeInTheDocument()
  })

  test("FR-KIOSK-01 loading keeps the Check in title; a bad link says This Link Doesn't Work over its sentence, in the tab too, with no retry", async () => {
    let release: (r: Response) => void = () => {}
    const { asked } = renderKiosk({ [`GET ${K}`]: () => new Promise((resolve) => (release = resolve)) })
    expect(await screen.findByRole('heading', { level: 1, name: t('kiosk.idle.title') })).toBeInTheDocument()
    expect(screen.getByText(t('kiosk.loading'))).toBeInTheDocument()
    await vi.waitFor(() => expect(asked(K)).toBe(1))
    act(() => release(failure(404, 'linkInvalid', 'This link no longer works. Ask for a new one.')))
    expect(await screen.findByRole('alert')).toHaveTextContent(t('kiosk.bad'))
    expect(headline()).toHaveTextContent(t('kiosk.bad.title'))
    // The title comes first, then its sentence.
    expect(
      headline().compareDocumentPosition(screen.getByRole('alert')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(document.title).toBe(t('brand.pageTitle', { page: t('kiosk.bad.title'), brand: t('brand.name') }))
    expect(screen.queryByRole('button', { name: t('kiosk.retry') })).not.toBeInTheDocument()
    expect(asked(K)).toBe(1)
  })

  test('FR-KIOSK-01 a failed load that is not a 404 offers Try again, which loads the gym', async () => {
    let fail = true
    renderKiosk({ [`GET ${K}`]: () => (fail ? failure(500, 'generic', 'Something went wrong.') : json(200, gym())) })
    const u = user()
    await u.click(await screen.findByRole('button', { name: t('kiosk.retry') }))
    // Not a bad link: the kiosk keeps its own title, over the sentence.
    expect(headline()).toHaveTextContent(t('kiosk.idle.title'))
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(document.title).toBe(t('brand.pageTitle', { page: t('kiosk.idle.title'), brand: t('brand.name') }))
    fail = false
    await u.click(screen.getByRole('button', { name: t('kiosk.retry') }))
    await ready()
  })

  test("FR-KIOSK-02 the keypad shows the number in the gym's grouping as it's typed; + only first, delete, 15 digits at most", async () => {
    renderKiosk()
    await ready()
    const u = user()
    expect(checkInButton()).toBeDisabled()
    await u.click(key(t('kiosk.keypad.plusLabel')))
    expect(number()).toHaveTextContent('+')
    expect(checkInButton()).toBeDisabled()
    expect(key(t('kiosk.keypad.plusLabel'))).toBeDisabled()
    await u.click(key(t('kiosk.keypad.backLabel')))
    await tap(u, '3125550142')
    expect(number()).toHaveTextContent('(312) 555-0142')
    expect(checkInButton()).toBeEnabled()
    await tap(u, '123456789')
    expect(number().textContent?.replace(/\D/g, '')).toBe('312555014212345')
    await u.click(key(t('kiosk.keypad.backLabel')))
    expect(number().textContent?.replace(/\D/g, '')).toBe('31255501421234')
  })

  test("FR-KIOSK-02 a UK gym's keypad groups the number as the UK does", async () => {
    renderKiosk({ [`GET ${K}`]: () => json(200, gym({ country: 'GB' })) })
    await ready()
    await tap(user(), '07911123456')
    expect(number()).toHaveTextContent('07911 123456')
  })

  test("FR-KIOSK-02 the number shows every digit in its slot, in the gym's grouping, and the empty slots carry no text", async () => {
    renderKiosk()
    await ready()
    const u = user()
    expect(slotsOf().text).toBe('')
    expect(slotsOf().empty).toHaveLength(10)
    await tap(u, '312')
    // US numbers have 10 digits: three typed, seven to go, each an empty slot with no text.
    expect(slotsOf().text).toBe('(312)')
    expect(slotsOf().empty).toHaveLength(7)
    for (const slot of slotsOf().empty) {
      expect(slot).toHaveAttribute('aria-hidden', 'true')
      expect(slot).toBeEmptyDOMElement()
    }
    await tap(u, '5550142')
    expect(slotsOf().text).toBe('(312) 555-0142')
    expect(slotsOf().empty).toHaveLength(0)
    // Each character in a slot of its own.
    expect([...number().querySelectorAll('span span')].map((slot) => slot.textContent)).toEqual([...'(312) 555-0142'])
    // A leading + names another country, whose length isn't known: no empty slots.
    for (let n = 0; n < 10; n++) await u.click(key(t('kiosk.keypad.backLabel')))
    await u.click(key(t('kiosk.keypad.plusLabel')))
    expect(slotsOf().text).toBe('+')
    expect(slotsOf().empty).toHaveLength(0)
  })

  test("FR-KIOSK-02 a UK gym's number has 11 slots", async () => {
    renderKiosk({ [`GET ${K}`]: () => json(200, gym({ country: 'GB' })) })
    await ready()
    expect(slotsOf().empty).toHaveLength(11)
    await tap(user(), '079')
    expect(slotsOf().empty).toHaveLength(8)
  })

  test('FR-KIOSK-02 Phone Number and Name are one segmented choice under the title, and the keyboard still types after it', async () => {
    renderKiosk()
    await ready()
    const u = user()
    const choice = () => screen.getByRole('radiogroup', { name: t('kiosk.mode.label') })
    /** The title first, then the choice, in the same column. */
    const titleLeads = () => {
      expect(headline().compareDocumentPosition(choice()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(headline().parentElement).toBe(choice().parentElement)
    }
    titleLeads()
    expect(byPhone()).toBeChecked()
    expect(screen.queryByRole('button', { name: t('kiosk.search.toggle') })).not.toBeInTheDocument()
    await u.click(byName())
    expect(byName()).toBeChecked()
    expect(screen.getByLabelText(t('kiosk.search.label'))).toHaveFocus()
    expect(headline()).toHaveTextContent(t('kiosk.idle.title'))
    titleLeads()
    expect(screen.getByRole('button', { name: t('kiosk.join') })).toBeInTheDocument()
    await u.click(byPhone())
    await ready()
    // The chosen radio has focus now, and a radio takes no text: digits still reach the keypad.
    expect(byPhone()).toHaveFocus()
    await u.keyboard('31')
    expect(number()).toHaveTextContent('31')
  })

  test('FR-KIOSK-08 a press on a key leaves focus where it was', async () => {
    renderKiosk()
    await ready()
    const u = user()
    const before = document.activeElement
    await tap(u, '31')
    await u.click(checkInButton())
    expect(document.activeElement).toBe(before)
  })
})

describe('checking in', () => {
  test('FR-KIOSK-05 a phone check-in shows the welcome, counts 5 to 1, then returns to the start', async () => {
    const { posted } = renderKiosk({ [`POST ${K}/checkin`]: () => json(200, welcome()) })
    await ready()
    const u = user()
    await tap(u, '3125550042')
    await u.click(checkInButton())
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' })).toBeInTheDocument()
    expect(screen.getByText(t('kiosk.welcome.visit'))).toBeInTheDocument()
    expect(posted(`${K}/checkin`)).toEqual([{ phone: '3125550042' }])
    for (const n of [5, 4, 3, 2, 1]) {
      expect(screen.getByText(t('kiosk.reset', { n }))).toBeInTheDocument()
      act(() => vi.advanceTimersByTime(1000))
    }
    expect(await ready()).toBeInTheDocument()
    expect(number()).toHaveTextContent('')
  })

  test.each([
    [1, 'visit', ['filled', 'empty', 'empty'], '108 252'],
    [2, 'visits', ['filled', 'filled', 'empty'], '108 252'],
    [5, 'line', ['filled', 'filled', 'filled'], '120 240'],
  ] as const)(
    "FR-KIOSK-05 the welcome draws its check inside one ring of this week's visits, a third a visit and closed at 3, hidden from screen readers (%i visits)",
    async (visitsThisWeek, visitsLine, thirds, dash) => {
      renderKiosk({ [`POST ${K}/checkin`]: () => json(200, welcome({ visitsThisWeek, visitsLine })) })
      await ready()
      const u = user()
      await tap(u, '31')
      await u.click(checkInButton())
      await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' })
      const rings = document.querySelectorAll('svg[data-visits]')
      expect(rings).toHaveLength(1)
      const ring = rings[0] as SVGElement
      expect(ring).toHaveAttribute('aria-hidden', 'true')
      const circles = [...ring.querySelectorAll('circle')]
      expect(circles.map((c) => c.getAttribute('data-third'))).toEqual(thirds)
      // Open thirds keep a gap between them; at 3 they meet and the ring is closed.
      for (const c of circles) expect(c).toHaveAttribute('stroke-dasharray', dash)
      expect(ring.querySelector('path')).toHaveAttribute('d', 'M56 90 L78 112 L122 64')
      // The visits line says it in words, and it is the one that pops.
      const line = screen.getByText(welcomeLineText(visitsThisWeek, visitsLine))
      expect(line.className).toMatch(/pop/)
      expect(headline().className).not.toMatch(/pop/)
    },
  )

  test("FR-KIOSK-07 the welcome keeps the gym's name and the Sample data tag", async () => {
    renderKiosk({
      [`GET ${K}`]: () => json(200, gym({ isDemo: true })),
      [`POST ${K}/checkin`]: () => json(200, welcome()),
    })
    await ready()
    const u = user()
    await tap(u, '31')
    await u.click(checkInButton())
    await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' })
    expect(screen.getByText('Northside Strength')).toBeInTheDocument()
    expect(screen.getByText(t('tag.sample'))).toBeInTheDocument()
  })

  test('FR-KIOSK-05 a tap on the welcome returns to the start at once', async () => {
    renderKiosk({ [`POST ${K}/checkin`]: () => json(200, welcome()) })
    await ready()
    const u = user()
    await tap(u, '3125550042')
    await u.click(checkInButton())
    await u.click(await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' }))
    expect(await ready()).toBeInTheDocument()
  })

  test('FR-KIOSK-05 the welcome says Day 1 of 90 on a first visit, drops the week from day 90, and emphasises On the line', async () => {
    let answer = welcome({ greeting: 'first', week: 0, weekNumber: 1, day: 0 })
    renderKiosk({ [`POST ${K}/checkin`]: () => json(200, answer) })
    await ready()
    const u = user()
    const checkIn = async () => {
      await tap(u, '31')
      await u.click(checkInButton())
    }
    await checkIn()
    expect(
      await screen.findByRole('heading', { level: 1, name: t('kiosk.welcome.first', { first: 'Sam' }) }),
    ).toBeInTheDocument()
    await u.keyboard('{Escape}')
    answer = welcome({ greeting: 'plain', week: 12, weekNumber: 13, day: 90, visitsThisWeek: 3, visitsLine: 'line' })
    await checkIn()
    expect(
      await screen.findByRole('heading', { level: 1, name: t('kiosk.welcome.plain', { first: 'Sam' }) }),
    ).toBeInTheDocument()
    expect(screen.getByText(t('kiosk.welcome.line'))).toBeInTheDocument()
    await u.keyboard('{Escape}')
    answer = welcome({ visitsThisWeek: 2, visitsLine: 'visits' })
    await checkIn()
    expect(await screen.findByText(t('kiosk.welcome.visits', { n: 2 }))).toBeInTheDocument()
  })

  test.each([
    [
      'FR-KIOSK-02 a number nobody has',
      failure(404, 'kioskNotFound', "We couldn't find that number."),
      [t('kiosk.notFound')],
    ],
    ['FR-KIOSK-02 a number that cannot be read', failure(400, 'phone', 'Enter a number.'), ['Enter a number.']],
    [
      'FR-KIOSK-06 an archived member',
      failure(409, 'memberArchived', 'Please see the front desk to check in.'),
      ['Please see the front desk to check in.'],
    ],
    [
      'NFR-SEC-03 too many tries',
      failure(429, 'kioskTooMany', 'Too many tries. Try again in a minute.'),
      ['Too many tries. Try again in a minute.'],
    ],
  ])("%s shows its line in the prompt's place, and the next key brings the prompt back", async (_, answer, lines) => {
    renderKiosk({ [`POST ${K}/checkin`]: () => answer.clone() })
    await ready()
    const u = user()
    await tap(u, '3125550000')
    await u.click(checkInButton())
    for (const line of lines) expect(await screen.findByText(line)).toBeInTheDocument()
    // One sentence in the two-line slot (B2-02): err.phone already says how to type another country's number.
    expect(screen.queryByText(t('kiosk.phone.hint'))).not.toBeInTheDocument()
    expect(screen.getByText(lines[0] ?? '').parentElement?.children).toHaveLength(1)
    expect(headline()).toHaveTextContent(t('kiosk.idle.title'))
    expect(screen.queryByText(t('kiosk.idle.prompt'))).not.toBeInTheDocument()
    // The line sits in the assertive region; the prompt, when it comes back, does not.
    const region = screen.getByText(lines[0] ?? '').parentElement as HTMLElement
    expect(region).toHaveAttribute('aria-live', 'assertive')
    await tap(u, '1')
    expect(screen.queryByText(lines[0] ?? '')).not.toBeInTheDocument()
    expect(region).toBeEmptyDOMElement()
    expect(screen.getByText(t('kiosk.idle.prompt'))).toBeInTheDocument()
    expect(region).not.toContainElement(screen.getByText(t('kiosk.idle.prompt')))
  })

  test('FR-KIOSK-01 a link that stops working mid-use shows the load-error screen, without retry', async () => {
    renderKiosk({
      [`POST ${K}/checkin`]: () => failure(404, 'linkInvalid', 'This link no longer works. Ask for a new one.'),
    })
    await ready()
    const u = user()
    await tap(u, '31')
    await u.click(checkInButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(t('kiosk.bad'))
    expect(headline()).toHaveTextContent(t('kiosk.bad.title'))
    expect(document.title).toBe(t('brand.pageTitle', { page: t('kiosk.bad.title'), brand: t('brand.name') }))
    expect(screen.queryByRole('group', { name: t('kiosk.keypad.label') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('kiosk.retry') })).not.toBeInTheDocument()
  })
})

describe('the keyboard and the idle return', () => {
  test('FR-KIOSK-08 a hardware keyboard types digits and +, deletes with Backspace and checks in with Enter; modifier keys are left alone', async () => {
    const { posted } = renderKiosk({ [`POST ${K}/checkin`]: () => json(200, welcome()) })
    await ready()
    const u = user()
    await u.keyboard('+44')
    await u.keyboard('{Backspace}')
    await u.keyboard('{Control>}5{/Control}')
    expect(number().textContent?.replace(/\s/g, '')).toBe('+4')
    await u.keyboard('{Backspace}{Backspace}3125550042{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' })).toBeInTheDocument()
    expect(posted(`${K}/checkin`)).toEqual([{ phone: '3125550042' }])
  })

  test('FR-KIOSK-08 Escape leaves the search, the join and the welcome; a digit on the welcome starts the next number', async () => {
    renderKiosk({ [`POST ${K}/checkin`]: () => json(200, welcome()) })
    await ready()
    const u = user()
    await u.click(byName())
    expect(screen.getByLabelText(t('kiosk.search.label'))).toHaveFocus()
    await u.keyboard('{Escape}')
    await ready()
    await u.click(screen.getByRole('button', { name: t('kiosk.join') }))
    expect(screen.getByRole('heading', { level: 1, name: t('kiosk.join.title') })).toBeInTheDocument()
    await u.keyboard('{Escape}')
    await ready()
    await u.keyboard('31{Enter}')
    await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' })
    await u.keyboard('7')
    await ready()
    expect(number()).toHaveTextContent('7')
  })
})

describe('Still there?', () => {
  const sheet = () => screen.queryByRole('dialog', { name: t('kiosk.idle.still') })
  const keepGoing = () => screen.getByRole('button', { name: t('kiosk.idle.keepGoing') })
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

  test('FR-KIOSK-08 a minute without a touch mid-entry asks, counting 20 to 1, and 20 s more starts over: a typed number, the search and the join', async () => {
    renderKiosk()
    await ready()
    const u = user()
    /** Nothing a second before the minute; then the sheet, its count, and the empty start 20 s later. */
    const idle = async (still: () => HTMLElement) => {
      wait(STILL_THERE_MS - 1000)
      expect(sheet()).not.toBeInTheDocument()
      wait(1000)
      expect(sheet()).toBeInTheDocument()
      expect(sheet()).toHaveAccessibleDescription(t('kiosk.idle.startOver', { n: START_OVER_SECONDS }))
      expect(keepGoing()).toBeInTheDocument()
      wait(START_OVER_MS - 1000)
      expect(sheet()).toHaveAccessibleDescription(t('kiosk.idle.startOver', { n: 1 }))
      expect(still()).toBeInTheDocument()
      wait(1000)
      expect(sheet()).not.toBeInTheDocument()
      await ready()
      expect(number()).toHaveTextContent('')
      expect(headline()).toHaveTextContent(t('kiosk.idle.title'))
    }
    await tap(u, '312')
    await idle(() => screen.getByText((_, el) => el?.tagName === 'OUTPUT' && el.textContent === '(312)'))
    await u.click(byName())
    await idle(() => screen.getByLabelText(t('kiosk.search.label')))
    await u.click(screen.getByRole('button', { name: t('kiosk.join') }))
    await idle(() => screen.getByLabelText(t('kiosk.join.first')))
  })

  test('FR-KIOSK-08 a tap, a key or typing starts the minute again', async () => {
    renderKiosk()
    await ready()
    const u = user()
    await tap(u, '3')
    wait(STILL_THERE_MS - 1000)
    await tap(u, '1')
    wait(STILL_THERE_MS - 1000)
    await u.keyboard('2')
    wait(STILL_THERE_MS - 1000)
    expect(sheet()).not.toBeInTheDocument()
    expect(number()).toHaveTextContent('312')
    await u.click(byName())
    wait(STILL_THERE_MS - 1000)
    await u.type(screen.getByLabelText(t('kiosk.search.label')), 'S')
    wait(STILL_THERE_MS - 1000)
    expect(sheet()).not.toBeInTheDocument()
    wait(1000)
    expect(sheet()).toBeInTheDocument()
  })

  test('FR-KIOSK-08 Keep Going closes it and keeps what was typed; the next minute asks again from 20', async () => {
    renderKiosk()
    await ready()
    const u = user()
    await tap(u, '312')
    wait(STILL_THERE_MS)
    wait(5000)
    expect(sheet()).toHaveAccessibleDescription(t('kiosk.idle.startOver', { n: START_OVER_SECONDS - 5 }))
    await u.click(keepGoing())
    expect(sheet()).not.toBeInTheDocument()
    // Past the 20 s it had left: nothing starts over.
    wait(START_OVER_MS)
    expect(number()).toHaveTextContent('(312)')
    wait(STILL_THERE_MS - START_OVER_MS)
    expect(sheet()).toHaveAccessibleDescription(t('kiosk.idle.startOver', { n: START_OVER_SECONDS }))
  })

  test('FR-KIOSK-08 while it asks, any key answers it and does nothing else: a digit types nothing, and Escape keeps the search', async () => {
    renderKiosk()
    await ready()
    const u = user()
    await tap(u, '31')
    wait(STILL_THERE_MS)
    await u.keyboard('5')
    expect(sheet()).not.toBeInTheDocument()
    expect(number().textContent?.replace(/\D/g, '')).toBe('31')
    await u.click(byName())
    wait(STILL_THERE_MS)
    expect(sheet()).toBeInTheDocument()
    await u.keyboard('{Escape}')
    expect(sheet()).not.toBeInTheDocument()
    expect(screen.getByLabelText(t('kiosk.search.label'))).toBeInTheDocument()
    wait(START_OVER_MS)
    expect(screen.getByLabelText(t('kiosk.search.label'))).toBeInTheDocument()
  })

  test('FR-KIOSK-08 nothing asks on the empty start or on the welcome, which counts back by itself', async () => {
    renderKiosk({ [`POST ${K}/checkin`]: () => json(200, welcome()) })
    await ready()
    const u = user()
    wait(5 * STILL_THERE_MS)
    expect(sheet()).not.toBeInTheDocument()
    expect(headline()).toHaveTextContent(t('kiosk.idle.title'))
    await u.keyboard('3125550042{Enter}')
    await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' })
    wait(STILL_THERE_MS + START_OVER_MS)
    expect(sheet()).not.toBeInTheDocument()
    await ready()
    expect(number()).toHaveTextContent('')
  })
})

describe('the name search', () => {
  const hits = Array.from({ length: 6 }, (_, i) => ({ memberId: 10 + i, name: `Sam ${String.fromCharCode(65 + i)}.` }))

  test('FR-KIOSK-02 it waits for typing to pause, asks once per query, lists up to 6 names, and Enter picks a lone name', async () => {
    const { asked, posted } = renderKiosk({
      [`GET ${K}/search?q=sa`]: () => json(200, hits),
      [`GET ${K}/search?q=sam%20b`]: () => json(200, [hits[1]]),
      [`POST ${K}/checkin`]: () => json(200, welcome()),
    })
    await ready()
    const u = user()
    await u.click(byName())
    const field = screen.getByLabelText(t('kiosk.search.label'))
    await u.type(field, 'Sa')
    expect(asked(`${K}/search?q=s`)).toBe(0)
    act(() => vi.advanceTimersByTime(SEARCH_PAUSE_MS))
    const list = await screen.findByRole('list', { name: t('kiosk.search.results') })
    expect(
      within(list)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(hits.map((h) => h.name))
    await u.type(field, 'm  B')
    act(() => vi.advanceTimersByTime(SEARCH_PAUSE_MS))
    await screen.findByRole('button', { name: 'Sam B.' })
    await u.clear(field)
    await u.type(field, 'sa')
    act(() => vi.advanceTimersByTime(SEARCH_PAUSE_MS))
    await screen.findByRole('button', { name: 'Sam F.' })
    expect(asked(`${K}/search?q=sa`)).toBe(1)
    await u.type(field, 'm b')
    act(() => vi.advanceTimersByTime(SEARCH_PAUSE_MS))
    await screen.findByRole('button', { name: 'Sam B.' })
    await u.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back, Sam. Week 4.' })).toBeInTheDocument()
    expect(posted(`${K}/checkin`)).toEqual([{ memberId: 11 }])
  })

  test('FR-KIOSK-02 it says when nobody matches, and leaving it drops its answers, so a member who joined since is found', async () => {
    let found: typeof hits = []
    const { asked } = renderKiosk({ [`GET ${K}/search?q=zed`]: () => json(200, found) })
    await ready()
    const u = user()
    const search = async () => {
      await u.click(byName())
      await u.type(screen.getByLabelText(t('kiosk.search.label')), 'Zed')
      act(() => vi.advanceTimersByTime(SEARCH_PAUSE_MS))
    }
    await search()
    expect(await screen.findByText(t('kiosk.search.noneFor', { query: 'Zed' }))).toBeInTheDocument()
    await u.click(byPhone())
    await ready()
    found = [{ memberId: 40, name: 'Zed' }]
    await search()
    expect(await screen.findByRole('button', { name: 'Zed' })).toBeInTheDocument()
    expect(asked(`${K}/search?q=zed`)).toBe(2)
  })
})

describe('joining', () => {
  const join = () => screen.getByRole('button', { name: t('kiosk.join.submit') })
  const openJoin = async (u: ReturnType<typeof user>) => {
    await ready()
    await u.click(screen.getByRole('button', { name: t('kiosk.join') }))
  }

  test('FR-KIOSK-04 a blank first name is caught without a call; a first name alone joins and is welcomed as Day 1 of 90', async () => {
    const { posted } = renderKiosk({
      [`POST ${K}/join`]: () =>
        json(200, welcome({ firstName: 'Zed', greeting: 'first', week: 0, weekNumber: 1, day: 0 })),
    })
    const u = user()
    await openJoin(u)
    expect(screen.getByLabelText(t('kiosk.join.first'))).toHaveFocus()
    await u.click(join())
    expect(screen.getByText(t('kiosk.join.firstRequired'))).toBeInTheDocument()
    expect(posted(`${K}/join`)).toEqual([])
    await u.type(screen.getByLabelText(t('kiosk.join.first')), ' Zed ')
    await u.click(join())
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Zed. Day 1 of 90.' })).toBeInTheDocument()
    expect(posted(`${K}/join`)).toEqual([{ firstName: 'Zed' }])
  })

  test("FR-KIOSK-04 the keypad's number fills the phone; a bad or taken phone shows on the phone field, an archived member's under the form", async () => {
    let answer = failure(400, 'phone', 'Enter a number.')
    const { posted } = renderKiosk({ [`POST ${K}/join`]: () => answer })
    const u = user()
    await ready()
    await tap(u, '3125550042')
    await u.click(screen.getByRole('button', { name: t('kiosk.join') }))
    const phone = screen.getByLabelText(new RegExp(t('kiosk.join.phone')))
    expect(phone).toHaveValue('3125550042')
    await u.type(screen.getByLabelText(t('kiosk.join.first')), 'Ana')
    await u.type(screen.getByLabelText(new RegExp(t('kiosk.join.last'))), 'Lee')
    await u.click(join())
    // One sentence: err.phone already says how to type another country's number, so no hint repeats it (B2-02).
    expect(await screen.findByText('Enter a number.')).toBeInTheDocument()
    expect(phone).toHaveAccessibleDescription('Enter a number.')
    answer = failure(409, 'duplicate', 'That phone number is already taken.')
    await u.click(join())
    await screen.findByText('That phone number is already taken.')
    expect(phone).toHaveAccessibleDescription('That phone number is already taken.')
    answer = failure(409, 'memberArchived', 'Please see the front desk to check in.')
    await u.click(join())
    expect(await screen.findByRole('alert')).toHaveTextContent('Please see the front desk to check in.')
    expect(posted(`${K}/join`)).toEqual(Array(3).fill({ firstName: 'Ana', lastName: 'Lee', phone: '3125550042' }))
  })

  test('FR-KIOSK-04 the demo gym joins by name only, with no phone field', async () => {
    const { posted } = renderKiosk({
      [`GET ${K}`]: () => json(200, gym({ isDemo: true })),
      [`POST ${K}/join`]: () =>
        json(200, welcome({ firstName: 'Vi', greeting: 'first', week: 0, weekNumber: 1, day: 0 })),
    })
    const u = user()
    await ready()
    await tap(u, '3125550042')
    await u.click(screen.getByRole('button', { name: t('kiosk.join') }))
    expect(screen.queryByLabelText(new RegExp(t('kiosk.join.phone')))).not.toBeInTheDocument()
    expect(screen.getByText(t('kiosk.join.promptName'))).toBeInTheDocument()
    await u.type(screen.getByLabelText(t('kiosk.join.first')), 'Vi')
    await u.click(join())
    await screen.findByRole('heading', { level: 1, name: 'Welcome, Vi. Day 1 of 90.' })
    expect(posted(`${K}/join`)).toEqual([{ firstName: 'Vi' }])
  })

  test('FR-KIOSK-04 Cancel goes back to the start', async () => {
    renderKiosk()
    const u = user()
    await openJoin(u)
    await u.click(screen.getByRole('button', { name: t('kiosk.join.cancel') }))
    expect(await ready()).toBeInTheDocument()
  })
})
