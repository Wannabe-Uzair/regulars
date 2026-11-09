import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { t } from '@tenure/copy'
import { buttonClass } from '@tenure/ui'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { App } from '../../app/App.tsx'
import { features } from '../../app/features.ts'
import { createQueryClient } from '../../app/query-client.ts'
import { buildRoutes } from '../../app/router.tsx'
import { FakeEventSource, json, mockFetch, signedOut } from '../../test/fakes.ts'
import homeStyles from './screens/Home.module.css'

function renderAt(entry: string) {
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [entry] })
  render(<App client={createQueryClient()} router={router} />)
  return router
}

beforeEach(() => {
  FakeEventSource.install()
  mockFetch(() => signedOut())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** jsdom has no matchMedia: answers the queries named true, and every other one false. */
function media(matches: Record<string, boolean>) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    matches: matches[query] ?? false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** The hero's clip: the video, or under reduced motion its still, the one replaced element in main. */
const clip = async () => {
  const main = await screen.findByRole('main')
  return main.querySelector('video, img') as HTMLVideoElement | HTMLImageElement
}

/** The hero: the region its headline names. */
const hero = () => screen.findByRole('region', { name: t('home.title') })

/** Each element comes after the one before it in the document. */
function inOrder(order: readonly Element[]) {
  for (const [a, b] of order.slice(0, -1).map((el, i) => [el, order[i + 1]] as const)) {
    expect(b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  }
}

describe('Home (/)', () => {
  test('FR-WEB-01 a plain page under a sticky bar with the mark and Regulars', async () => {
    renderAt('/')
    const main = await screen.findByRole('main')
    const bar = screen.getByRole('banner')
    expect(within(bar).getByText(t('brand.name'))).toBeVisible()
    expect(bar.querySelector('svg')).not.toBeNull()
    expect(bar.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // No blended ground: no ancestor of the page holds the mesh's hidden layers.
    for (let el = main.parentElement; el; el = el.parentElement) {
      expect(el.querySelectorAll(':scope > [aria-hidden="true"]')).toHaveLength(0)
    }
    await vi.waitFor(() => expect(document.title).toBe(t('brand.name')))
  })

  test('FR-WEB-01 offers the free 90-day pilot under its headline and line, with no price anywhere', async () => {
    renderAt('/')
    const region = await hero()
    expect(within(region).getByRole('heading', { level: 1, name: t('home.title') })).toBeInTheDocument()
    expect(within(region).getByText(t('home.lede'))).toBeInTheDocument()
    expect(within(region).getByText(t('home.offer'))).toHaveTextContent(/free 90-day pilot/i)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/[$£€]\s?\d|\b(USD|CAD|GBP|PKR|AED|Rs\.?)\s?\d|\b(a|per) (month|year)\b|\/mo\b/i)
  })

  test('FR-WEB-03 leads to sign-up first, then to log in, each a button-styled link', async () => {
    const router = renderAt('/')
    const region = await hero()
    const start = await within(region).findByRole('link', { name: t('home.start') })
    const login = within(region).getByRole('link', { name: t('home.login') })
    expect(start).toHaveAttribute('href', '/signup')
    expect(start.className).toBe(buttonClass({ variant: 'primary', size: 'lg' }))
    expect(login).toHaveAttribute('href', '/login')
    expect(login.className).toBe(buttonClass({ variant: 'secondary', size: 'lg' }))
    expect(start.compareDocumentPosition(login) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The bar repeats both, small.
    const bar = screen.getByRole('banner')
    expect(within(bar).getByRole('link', { name: t('home.start') }).className).toBe(
      buttonClass({ variant: 'primary', size: 'sm' }),
    )
    expect(within(bar).getByRole('link', { name: t('home.login') }).className).toBe(
      buttonClass({ variant: 'secondary', size: 'sm' }),
    )

    await userEvent.click(start)
    expect(await screen.findByRole('heading', { level: 1, name: t('signup.title') })).toBeInTheDocument()
    expect(screen.getByText(t('signup.lede'))).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/signup')
  })

  test('FR-WEB-01 each sourced figure links to its footnote, and the footer lists both sources', async () => {
    renderAt('/')
    const figures = await screen.findByRole('region', { name: t('home.figures.title') })
    const footer = screen.getByRole('contentinfo')
    const sources = within(footer).getByRole('list', { name: t('home.sources.title') })
    const items = within(sources).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([t('home.source.1'), t('home.source.2')])
    expect(items.map((li) => li.id)).toEqual(['source-1', 'source-2'])
    const cited = [
      ['home.fig.quit.value', 'home.fig.quit.label', 1],
      ['home.fig.stay.value', 'home.fig.stay.label', 2],
      ['home.fig.fade.value', 'home.fig.fade.label', 2],
    ] as const
    const tiles = within(figures).getAllByRole('listitem')
    expect(tiles).toHaveLength(cited.length)
    cited.forEach(([value, label, n], i) => {
      const tile = tiles[i]!
      expect(tile).toHaveTextContent(t(value))
      expect(tile).toHaveTextContent(t(label))
      const link = within(tile).getByRole('link', { name: t('a11y.footnote', { n }) })
      expect(link).toHaveAttribute('href', `#source-${n}`)
      expect(link.closest('sup')).not.toBeNull()
      expect(document.getElementById(`source-${n}`)).toBe(items[n - 1])
    })
  })
})

describe('home-1: the hero over the floating board', () => {
  test('FR-WEB-01 the hero sets Regulars over the headline, with no underline', async () => {
    renderAt('/')
    const region = await hero()
    const heading = within(region).getByRole('heading', { level: 1, name: t('home.title') })
    expect(heading.textContent).toBe(t('home.title'))
    expect(heading.children).toHaveLength(0)
    inOrder([within(region).getByText(t('brand.name')), heading])
  })

  test("the clip follows the hero's words: the line, the buttons, then the offer", async () => {
    renderAt('/')
    const region = await hero()
    inOrder([
      within(region).getByText(t('brand.name')),
      within(region).getByRole('heading', { level: 1 }),
      within(region).getByText(t('home.lede')),
      await within(region).findByRole('link', { name: t('home.start') }),
      within(region).getByRole('link', { name: t('home.login') }),
      within(region).getByText(t('home.offer')),
      await clip(),
    ])
  })

  test('FR-WEB-04 in stall mode Try the Demo is in the bar, the hero and the close, Reset the Demo is a quiet small button in the footer, and there is no sign-up or log-in', async () => {
    mockFetch((_method, path) => (path === '/api/demo' ? json(200, { stall: true }) : signedOut()))
    renderAt('/')
    const region = await hero()
    const heroTry = await within(region).findByRole('button', { name: t('demo.try') })
    const barTry = within(screen.getByRole('banner')).getByRole('button', { name: t('demo.try') })
    const close = screen.getByRole('region', { name: t('home.close.title') })
    const closeTry = within(close).getByRole('button', { name: t('demo.try') })
    expect(screen.getAllByRole('button', { name: t('demo.try') })).toEqual([barTry, heroTry, closeTry])
    expect(barTry.className).toContain(buttonClass({ variant: 'primary', size: 'sm' }))
    expect(heroTry.className).toContain(buttonClass({ variant: 'primary', size: 'lg' }))
    expect(closeTry.className).toContain(buttonClass({ variant: 'primary', size: 'lg' }))
    const reset = within(screen.getByRole('contentinfo')).getByRole('button', { name: t('demo.reset') })
    expect(reset.className).toContain(buttonClass({ variant: 'quiet', size: 'sm' }))
    expect(screen.getAllByRole('button', { name: t('demo.reset') })).toEqual([reset])
    // A gym set up on the offline stall laptop reaches no one (Uzair, 7 Nov).
    expect(screen.queryByRole('link', { name: t('home.start') })).toBeNull()
    expect(screen.queryByRole('link', { name: t('home.login') })).toBeNull()
    inOrder([
      within(region).getByText(t('home.lede')),
      heroTry,
      within(region).getByText(t('home.offer')),
      await clip(),
    ])
  })

  test('FR-WEB-04 the sign-up waits for the stall question, so it never flashes on the stall', async () => {
    let answer: ((r: Response) => void) | undefined
    mockFetch((_method, path) =>
      path === '/api/demo' ? new Promise<Response>((resolve) => (answer = resolve)) : signedOut(),
    )
    renderAt('/')
    const region = await hero()
    // The page is up and has asked; until the answer comes, no way in shows.
    await vi.waitFor(() => expect(answer).toBeDefined())
    expect(screen.queryByRole('link', { name: t('home.start') })).toBeNull()
    expect(screen.queryByRole('button', { name: t('demo.try') })).toBeNull()
    answer?.(json(200, { stall: false }))
    expect(await within(region).findByRole('link', { name: t('home.start') })).toBeInTheDocument()
  })

  test('B2-04 while the stall question is open, the bar, the hero and the close each hold an unseen Try the Demo, so nothing moves when it lands', async () => {
    let answer: ((r: Response) => void) | undefined
    mockFetch((_method, path) =>
      path === '/api/demo' ? new Promise<Response>((resolve) => (answer = resolve)) : signedOut(),
    )
    renderAt('/')
    const region = await hero()
    await vi.waitFor(() => expect(answer).toBeDefined())
    const close = screen.getByRole('region', { name: t('home.close.title') })
    const places = [
      [screen.getByRole('banner'), 'sm'],
      [region, 'lg'],
      [close, 'lg'],
    ] as const
    for (const [landmark, size] of places) {
      const held = within(landmark).getByText(t('demo.try'))
      // The stall's button at its size, its box kept but unseen, and hidden from assistive technology.
      expect(held.className).toContain(buttonClass({ variant: 'primary', size }))
      expect(held).toHaveAttribute('aria-hidden', 'true')
      expect(held.tagName).toBe('SPAN')
      expect(homeStyles.held).toBeTruthy()
      expect(held).toHaveClass(`${homeStyles.held}`)
    }
    expect(screen.queryAllByRole('button', { name: t('demo.try') })).toEqual([])
    answer?.(json(200, { stall: true }))
    const tries = await screen.findAllByRole('button', { name: t('demo.try') })
    expect(tries).toHaveLength(3)
    // Landed, each place holds the button alone.
    for (const [landmark] of places) expect(within(landmark).getAllByText(t('demo.try'))).toHaveLength(1)
  })

  test('the board is a muted clip that loops inline at once, its first frame as the poster, hidden as decoration', async () => {
    renderAt('/')
    const video = await clip()
    expect(video).toBeInstanceOf(HTMLVideoElement)
    if (!(video instanceof HTMLVideoElement)) return
    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute('muted')
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('autoplay')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video).toHaveAttribute('aria-hidden', 'true')
    expect(video).not.toHaveAttribute('controls')
    // The page's one picture of the product keeps its description for assistive technology, and holds the clip.
    const picture = within(screen.getByRole('main')).getByRole('img', { name: t('home.board.aria') })
    expect(picture).toContainElement(video)
    // Below 48rem, the phone's cut: its poster and both files, MP4 first (H.264 is the hardware path in Safari), WebM after.
    expect(video).toHaveAttribute('poster', '/media/hero-board-phone.webp')
    const sources = [...video.querySelectorAll('source')].map((s) => [s.getAttribute('src'), s.getAttribute('type')])
    expect(sources).toEqual([
      ['/media/hero-board-phone.mp4', 'video/mp4'],
      ['/media/hero-board-phone.webm', 'video/webm'],
    ])
    // The box keeps the clip's shape before the file loads, so nothing shifts.
    expect(video).toHaveAttribute('width', '358')
    expect(video).toHaveAttribute('height', '580')
    expect(video.style.aspectRatio).toBe('358 / 580')
  })

  test('from 48rem the clip is the laptop cut, the board as a table', async () => {
    media({ '(min-width: 48rem)': true })
    renderAt('/')
    const video = await clip()
    expect(video).toBeInstanceOf(HTMLVideoElement)
    expect(video).toHaveAttribute('poster', '/media/hero-board-wide.webp')
    expect([...video.querySelectorAll('source')].map((s) => s.getAttribute('src'))).toEqual([
      '/media/hero-board-wide.mp4',
      '/media/hero-board-wide.webm',
    ])
    expect(video).toHaveAttribute('width', '896')
    expect(video).toHaveAttribute('height', '421')
  })

  test('NFR-USE-04 under reduced motion the page shows the clip’s still alone, with no video', async () => {
    media({ '(prefers-reduced-motion: reduce)': true, '(min-width: 48rem)': true })
    renderAt('/')
    const still = await clip()
    expect(still).toBeInstanceOf(HTMLImageElement)
    expect(still).toHaveAttribute('src', '/media/hero-board-wide.webp')
    expect(still).toHaveAttribute('alt', '')
    expect(still).toHaveAttribute('aria-hidden', 'true')
    expect(still).toHaveAttribute('width', '896')
    expect(document.querySelector('video')).toBeNull()
    const picture = within(screen.getByRole('main')).getByRole('img', { name: t('home.board.aria') })
    expect(picture).toContainElement(still)
  })

  test('the clip makes no request: Home asks only whether this is the stall', async () => {
    const fetch = mockFetch(() => signedOut())
    renderAt('/')
    expect(await clip()).not.toBeNull()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(new Set(fetch.mock.calls.map(([input]) => String(input)))).toEqual(new Set(['/api/demo']))
  })
})

describe('FR-WEB-05 the website loads without the app’s code', () => {
  const src = path.join(import.meta.dirname, '../../')
  // `from './x'`, a bare `import './x'` and a lazy `import('./x')`: every relative specifier.
  const IMPORT = /\b(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g

  /** Every source file Home reaches through relative imports, static or dynamic, as paths under src/. */
  function reached(entry: string): Set<string> {
    const seen = new Set<string>()
    const walk = (file: string) => {
      if (seen.has(file)) return
      seen.add(file)
      if (!/\.tsx?$/.test(file)) return
      for (const [, specifier = ''] of readFileSync(path.join(src, file), 'utf8').matchAll(IMPORT)) {
        walk(path.normalize(path.join(path.dirname(file), specifier)))
      }
    }
    walk(entry)
    return seen
  }

  /** The app under /app: the shell, and every feature folder that registers an /app route. */
  const appCode = [
    'app/shell/',
    ...readdirSync(path.join(src, 'features'))
      .filter((name) => /path: '\/app['/]/.test(readFileSync(path.join(src, 'features', name, 'index.ts'), 'utf8')))
      .map((name) => `features/${name}/`),
  ]

  test('the check knows the app: the shell and the feature folders under /app', () => {
    expect(appCode).toEqual(expect.arrayContaining(['app/shell/', 'features/today/', 'features/board/']))
    expect(appCode).not.toContain('features/website/')
    // The walk follows lazy imports too: the router reaches the shell only through one.
    expect(reached('app/router.tsx')).toContain('app/shell/AppShell.tsx')
  })

  test('Home, the stall controls included, reaches no file of the app', () => {
    const files = [...reached('features/website/screens/Home.tsx')]
    expect(files).toContain('features/website/stall/StallDemo.tsx')
    expect(files.filter((file) => appCode.some((dir) => file.startsWith(dir)))).toEqual([])
  })
})
