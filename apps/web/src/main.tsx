import '@tenure/ui/base.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { App } from './app/App.tsx'
import { features } from './app/features.ts'
import { createQueryClient } from './app/query-client.ts'
import { buildRoutes } from './app/router.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing #root')

const router = createBrowserRouter(buildRoutes(features))

createRoot(root).render(
  <StrictMode>
    <App client={createQueryClient()} router={router} />
  </StrictMode>,
)
