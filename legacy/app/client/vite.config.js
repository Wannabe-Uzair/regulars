import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// The brand is imported straight from marketing/brand/ (never copied), so the app and the expo kit can't drift.
const brand = fileURLToPath(new URL('../../../marketing/brand/', import.meta.url))

// kit.js and wordmark.js are UMD scripts: CommonJS when `module` exists, otherwise they set window.TENURE.
// Vite 8's bundler sees their `module.exports` and wraps them as CommonJS, so the browser branch never runs
// in a build. Shadowing `module` and `require` with local bindings makes them plain side-effect scripts,
// exactly as a <script> tag would run them, in dev and in the build.
const brandUmd = {
  name: 'tenure-brand-umd',
  enforce: 'pre',
  transform(code, id) {
    if (id.startsWith(brand) && id.endsWith('.js')) return { code: 'var module, require;\n' + code, map: null }
  },
}

// Ports can be moved so several copies can run side by side: TENURE_WEB_PORT (default 5174) and TENURE_API (default the API on 5175).
const WEB_PORT = Number(process.env.TENURE_WEB_PORT) || 5174
const API = process.env.TENURE_API || 'http://127.0.0.1:5175'

export default defineConfig({
  plugins: [brandUmd, react()],
  resolve: { alias: { '@brand': brand } },
  server: {
    port: WEB_PORT,
    strictPort: true,
    fs: { allow: ['.', brand] },
    proxy: { '/api': { target: API, changeOrigin: false } },
  },
  preview: { port: WEB_PORT, strictPort: true, proxy: { '/api': { target: API, changeOrigin: false } } },
})
