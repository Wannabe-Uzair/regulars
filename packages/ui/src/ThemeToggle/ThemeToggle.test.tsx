import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import { ThemeProvider } from '../theme/ThemeProvider.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

test('its name says where it goes, for each direction', async () => {
  render(
    <ThemeProvider>
      <ThemeToggle toDarkLabel="Switch to dark" toLightLabel="Switch to light" />
    </ThemeProvider>,
  )
  const toDark = screen.getByRole('button', { name: 'Switch to dark' })
  expect(toDark).not.toHaveAttribute('aria-pressed')
  await userEvent.click(toDark)
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  await userEvent.click(screen.getByRole('button', { name: 'Switch to light' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  expect(screen.getByRole('button', { name: 'Switch to dark' })).toBeInTheDocument()
})
