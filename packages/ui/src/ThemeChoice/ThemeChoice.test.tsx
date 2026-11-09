import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import { themeStorageKey } from '../theme/setting.ts'
import { ThemeProvider } from '../theme/ThemeProvider.tsx'
import { ThemeChoice } from './ThemeChoice.tsx'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

const labels = { light: 'Light', dark: 'Dark', system: 'Same as device' }

test('is a named radio group of three options, one checked, matching the choice', async () => {
  render(
    <ThemeProvider>
      <ThemeChoice label="Theme" optionLabels={labels} />
    </ThemeProvider>,
  )
  const group = screen.getByRole('radiogroup', { name: 'Theme' })
  const radios = within(group).getAllByRole('radio')
  expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['Light', 'Dark', 'Same as device'])
  expect(new Set(radios.map((r) => r.getAttribute('name'))).size).toBe(1)
  // The page is pinned light (ARCHITECTURE §9), so the choice starts at Light.
  expect(within(group).getByRole('radio', { name: 'Light' })).toBeChecked()

  await userEvent.click(within(group).getByRole('radio', { name: 'Dark' }))
  expect(within(group).getByRole('radio', { name: 'Dark' })).toBeChecked()
  expect(within(group).getByRole('radio', { name: 'Light' })).not.toBeChecked()
  expect(localStorage.getItem(themeStorageKey)).toBe('dark')
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
})
