import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { t } from '@tenure/copy'
import { ToastProvider } from '@tenure/ui'
import type { DataRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

/** The providers around the router. No theme provider: the page is pinned light, and nothing switches it (FR-SHELL-07). */
export function App({ client, router }: { client: QueryClient; router: DataRouter }) {
  return (
    <QueryClientProvider client={client}>
      <ToastProvider dismissLabel={t('toast.dismiss')}>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
