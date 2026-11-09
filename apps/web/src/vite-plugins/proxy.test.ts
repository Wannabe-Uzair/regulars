// @vitest-environment node
import { expect, test } from 'vitest'
import config from '../../vite.config.ts'

// The API's cross-site guard compares Origin with Host, so the dev and preview proxies must not rewrite Host.
test('the /api proxy keeps the browser Host in dev and preview', () => {
  expect(config.server?.proxy?.['/api']).toMatchObject({ target: 'http://127.0.0.1:5175', changeOrigin: false })
  expect(config.preview?.proxy?.['/api']).toMatchObject({ target: 'http://127.0.0.1:5175', changeOrigin: false })
})
