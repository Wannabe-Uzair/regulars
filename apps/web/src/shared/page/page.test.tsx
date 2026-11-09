import { t } from '@tenure/copy'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router'
import { expect, test, vi } from 'vitest'
import { useFocusOnNavigate } from './page.ts'
import { PageTitle } from './PageTitle.tsx'

function Root() {
  useFocusOnNavigate()
  return <Outlet />
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <Root />,
        children: [
          {
            path: '/a',
            element: (
              <>
                <h1>A</h1>
                <Link to="/a?q=1">search</Link>
                <Link to="/a#part">hash</Link>
                <Link to="/b">other page</Link>
              </>
            ),
          },
          { path: '/b', element: <PageTitle title="B" /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

test('FR-SHELL-06 a change of search or hash alone leaves focus where it is', async () => {
  const router = renderAt('/a')
  const title = screen.getByRole('heading', { name: 'A' })
  const search = screen.getByRole('link', { name: 'search' })
  await userEvent.click(search)
  expect(router.state.location.search).toBe('?q=1')
  expect(search).toHaveFocus()
  const hash = screen.getByRole('link', { name: 'hash' })
  await userEvent.click(hash)
  expect(router.state.location.hash).toBe('#part')
  expect(hash).toHaveFocus()
  expect(title).not.toHaveAttribute('data-route-focus')
})

test('FR-SHELL-06 a change of path by a click moves focus to the new h1, marked pointer, so no focus bar shows', async () => {
  renderAt('/a')
  await userEvent.click(screen.getByRole('link', { name: 'other page' }))
  const title = await screen.findByRole('heading', { level: 1, name: 'B' })
  await vi.waitFor(() => expect(title).toHaveFocus())
  expect(title).toHaveAttribute('tabindex', '-1')
  expect(title).toHaveAttribute('data-route-focus', 'pointer')
})

test('FR-SHELL-06 a change of path by a key marks the new h1 keyboard, for the focus bar, even after an earlier click', async () => {
  const user = userEvent.setup()
  renderAt('/a')
  // A click first, then a key: the last input wins.
  await user.click(screen.getByRole('link', { name: 'search' }))
  screen.getByRole('link', { name: 'other page' }).focus()
  await user.keyboard('{Enter}')
  const title = await screen.findByRole('heading', { level: 1, name: 'B' })
  await vi.waitFor(() => expect(title).toHaveFocus())
  expect(title).toHaveAttribute('data-route-focus', 'keyboard')
})

test('FR-SHELL-06 a key press then a click marks the new h1 pointer, so Safari shows no bar after Escape and a tap', async () => {
  const user = userEvent.setup()
  renderAt('/a')
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('link', { name: 'other page' }))
  const title = await screen.findByRole('heading', { level: 1, name: 'B' })
  await vi.waitFor(() => expect(title).toHaveFocus())
  expect(title).toHaveAttribute('data-route-focus', 'pointer')
})

test('FR-SHELL-06 PageTitle is the h1 and names the tab', async () => {
  render(<PageTitle title="Board" />)
  expect(screen.getByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument()
  await vi.waitFor(() => expect(document.title).toBe(t('brand.pageTitle', { page: 'Board', brand: t('brand.name') })))
})
