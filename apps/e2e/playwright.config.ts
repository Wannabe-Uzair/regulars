// Playwright's flows (`npm run e2e`). Chrome runs through the installed Google Chrome; WebKit, standing in for Safari,
// comes from `npm run e2e:install`. Each engine talks to its own seeded stall server (src/global-setup.ts).
import { defineConfig, devices, type Project } from '@playwright/test'
import { browsersPath } from './src/paths.ts'
import { baseURLOf } from './src/servers.ts'

// Set before the workers start, so they find the shared WebKit download.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= browsersPath()

/**
 * The stall has no tablet: the kiosk runs on a laptop's screen or a phone, so its flows run on Chrome desktop, the
 * Android phone and the iPhone. Every other flow runs on all four projects.
 */
const KIOSK = '**/kiosk*.e2e.ts'
const KIOSK_PROJECTS = new Set(['chrome-desktop', 'chrome-phone', 'webkit-phone'])

const chrome = { channel: 'chrome', baseURL: baseURLOf('chrome') }
const webkit = { baseURL: baseURLOf('webkit') }

const projects: Project[] = [
  { name: 'chrome-desktop', use: { ...devices['Desktop Chrome'], ...chrome } },
  { name: 'chrome-phone', use: { ...devices['Pixel 7'], ...chrome } },
  { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], ...webkit } },
  { name: 'webkit-phone', use: { ...devices['iPhone 17'], ...webkit } },
]

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.e2e.ts',
  outputDir: './test-results',
  globalSetup: './src/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: projects.map((p) => (KIOSK_PROJECTS.has(p.name ?? '') ? p : { ...p, testIgnore: KIOSK })),
})
