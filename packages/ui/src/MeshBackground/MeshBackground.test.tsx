import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { MeshBackground } from './MeshBackground.tsx'

test('its mesh and grain layers are hidden, and the children sit outside them', () => {
  render(
    <MeshBackground data-testid="ground">
      <h1>Sign in</h1>
    </MeshBackground>,
  )
  const ground = screen.getByTestId('ground')
  const layers = ground.querySelectorAll(':scope > [aria-hidden="true"]')
  expect(layers).toHaveLength(2)
  const heading = screen.getByRole('heading', { name: 'Sign in' })
  expect(heading.closest('[aria-hidden="true"]')).toBeNull()

  const filter = ground.querySelector('filter')
  expect(filter?.id).toMatch(/^tenure-grain-[a-zA-Z0-9]+$/)
  expect(ground.querySelector('rect')).toHaveAttribute('filter', `url(#${filter?.id})`)
})

test('FR-KIOSK-07 the kiosk pattern takes its own class, and the site pattern stays the default', () => {
  render(
    <>
      <MeshBackground data-testid="site" />
      <MeshBackground data-testid="kiosk" pattern="kiosk" />
    </>,
  )
  const mesh = (id: string) => screen.getByTestId(id).querySelector(':scope > div[aria-hidden="true"]')
  expect(mesh('site')).toHaveAttribute('data-pattern', 'site')
  expect(mesh('kiosk')).toHaveAttribute('data-pattern', 'kiosk')
  expect(mesh('kiosk')?.className).not.toBe(mesh('site')?.className)
})
