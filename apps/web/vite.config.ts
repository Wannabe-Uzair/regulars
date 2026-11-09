import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { themeBoot } from './src/vite-plugins/theme-boot.ts'

// The API refuses a write whose Origin doesn't match the request's Host (its cross-site guard). Keep the browser's
// Host when proxying (changeOrigin: false), as the old client did; the string shorthand would rewrite it to :5175.
const api = { target: 'http://127.0.0.1:5175', changeOrigin: false }

export default defineConfig({
  plugins: [react(), themeBoot()],
  server: {
    port: 5174,
    proxy: { '/api': api },
  },
  preview: {
    port: 5174,
    proxy: { '/api': api },
  },
})
