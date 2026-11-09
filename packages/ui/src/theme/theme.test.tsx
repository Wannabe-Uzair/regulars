import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { themeBootScript } from './boot-script.ts'
import { useTheme } from './context.ts'
import { installFakeMedia, installFakeViewTransition, type FakeMedia } from './fake-media.ts'
import { applyTheme, darkSchemeQuery, reducedMotionQuery, themeStorageKey, themeSwitchingAttribute } from './setting.ts'
import { ThemeProvider } from './ThemeProvider.tsx'

const html = document.documentElement
const theme = () => html.getAttribute('data-theme')

let media: FakeMedia | undefined

beforeEach(() => {
  localStorage.clear()
  html.removeAttribute('data-theme')
})

afterEach(() => {
  media?.restore()
  media = undefined
  vi.restoreAllMocks()
})

describe('themeBootScript', () => {
  const boot = () => new Function(themeBootScript)()

  // Pinned light (ARCHITECTURE §9, "One light theme"): whatever was stored and whatever the device prefers.
  test.each([
    ['light', false],
    ['light', true],
    ['dark', false],
    ['dark', true],
    ['system', true],
    ['sepia', true],
  ])('FR-SHELL-07 stored %s on a device that prefers dark: %s sets light', (stored, deviceDark) => {
    media = installFakeMedia({ [darkSchemeQuery]: deviceDark })
    localStorage.setItem(themeStorageKey, stored)
    boot()
    expect(theme()).toBe('light')
  })

  test('FR-SHELL-07 with nothing stored on a device that prefers dark it is light', () => {
    media = installFakeMedia({ [darkSchemeQuery]: true })
    boot()
    expect(theme()).toBe('light')
  })

  test('with no matchMedia and nothing stored it is light', () => {
    boot()
    expect(theme()).toBe('light')
  })
})

function Probe() {
  const { choice, resolved, setChoice } = useTheme()
  return (
    <>
      <output aria-label="choice">{choice}</output>
      <output aria-label="resolved">{resolved}</output>
      {(['light', 'dark', 'system'] as const).map((c) => (
        <button key={c} type="button" onClick={() => setChoice(c)}>
          {c}
        </button>
      ))}
    </>
  )
}

const shown = (name: string) => screen.getByRole('status', { name }).textContent

describe('ThemeProvider', () => {
  test('FR-SHELL-07 starts light whatever was saved or the device prefers, and applies it', () => {
    media = installFakeMedia({ [darkSchemeQuery]: true })
    localStorage.setItem(themeStorageKey, 'dark')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(shown('choice')).toBe('light')
    expect(theme()).toBe('light')
  })

  test('a choice made on the page applies, and the next visit starts light again', async () => {
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(shown('choice')).toBe('light')
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(localStorage.getItem(themeStorageKey)).toBe('dark')
    expect(theme()).toBe('dark')
    unmount()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(shown('choice')).toBe('light')
    expect(theme()).toBe('light')
  })

  test('FR-SHELL-07 never follows the device', () => {
    media = installFakeMedia({ [darkSchemeQuery]: false })
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(theme()).toBe('light')
    act(() => media?.set(darkSchemeQuery, true))
    expect(theme()).toBe('light')
    expect(shown('resolved')).toBe('light')
  })

  test('still switches when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'QuotaExceededError')
    })
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(shown('choice')).toBe('light')
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(theme()).toBe('dark')
  })

  test('useTheme outside a provider says what is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/)
  })
})

describe('applyTheme', () => {
  test('stops transitions for the frame the theme lands in: marked, flipped, flushed, then unmarked', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => frames.push(frame))
    const flushes: [theme: string | null, switching: boolean][] = []
    const getComputedStyle = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      flushes.push([theme(), html.hasAttribute(themeSwitchingAttribute)])
      return getComputedStyle.call(window, element, pseudo)
    })

    applyTheme('dark')
    // The mark theme.css stops transitions under (theme-css.node.test.ts).
    expect(themeSwitchingAttribute).toBe('data-theme-switching')
    expect(theme()).toBe('dark')
    expect(html).toHaveAttribute(themeSwitchingAttribute)
    // Styles were flushed after the flip and before transitions came back.
    expect(flushes).toContainEqual(['dark', true])
    for (const frame of frames) frame(0)
    expect(html).not.toHaveAttribute(themeSwitchingAttribute)
  })
})

describe('the switch', () => {
  let transition: ReturnType<typeof installFakeViewTransition> | undefined
  afterEach(() => {
    transition?.restore()
    transition = undefined
  })

  test('runs inside a view transition when the browser has one and motion is welcome', async () => {
    media = installFakeMedia({ [reducedMotionQuery]: false })
    transition = installFakeViewTransition()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(transition.updates).toHaveLength(1)
    expect(theme()).toBe('light')
    act(() => transition?.updates[0]?.())
    expect(theme()).toBe('dark')
    expect(shown('resolved')).toBe('dark')
  })

  test('a device change has nothing to crossfade: the page stays light', () => {
    media = installFakeMedia({ [darkSchemeQuery]: false, [reducedMotionQuery]: false })
    transition = installFakeViewTransition()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    act(() => media?.set(darkSchemeQuery, true))
    expect(transition.updates).toHaveLength(0)
    expect(theme()).toBe('light')
  })

  test('is instant under reduced motion', async () => {
    media = installFakeMedia({ [reducedMotionQuery]: true })
    transition = installFakeViewTransition()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(transition.updates).toHaveLength(0)
    expect(theme()).toBe('dark')
  })

  test('is instant without View Transitions', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(theme()).toBe('dark')
  })

  test('skips the transition when the theme on screen stays the same', async () => {
    media = installFakeMedia({ [darkSchemeQuery]: false })
    transition = installFakeViewTransition()
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'light' }))
    expect(transition.updates).toHaveLength(0)
    expect(shown('choice')).toBe('light')
  })
})
