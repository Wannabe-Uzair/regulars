// `npm run e2e:install`: download Playwright's WebKit once into <repo>/.cache/ms-playwright, shared by every worktree.
// Chrome needs no download: the e2e run uses the installed Google Chrome.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { browsersPath } from '../src/paths.ts'

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath() }
console.log(`Installing WebKit into ${env.PLAYWRIGHT_BROWSERS_PATH}`)
const result = spawnSync(process.execPath, [cli, 'install', 'webkit'], { env, stdio: 'inherit' })
process.exitCode = result.status ?? 1
