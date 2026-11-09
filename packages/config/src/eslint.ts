import js from '@eslint/js'
import boundariesModule from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import type { ESLint } from 'eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// The package is CommonJS whose typings declare `export default`; at runtime module.exports is the plugin itself.
const boundaries = boundariesModule as unknown as ESLint.Plugin

/**
 * Element types, one per workspace (docs/ARCHITECTURE.md §4). Patterns are relative to the repo root.
 */
const elements = [
  { type: 'app-api', pattern: 'apps/api', partialMatch: false },
  { type: 'app-web', pattern: 'apps/web', partialMatch: false },
  { type: 'contracts', pattern: 'packages/contracts', partialMatch: false },
  { type: 'domain', pattern: 'packages/domain', partialMatch: false },
  { type: 'db', pattern: 'packages/db', partialMatch: false },
  { type: 'ui', pattern: 'packages/ui', partialMatch: false },
  { type: 'copy', pattern: 'packages/copy', partialMatch: false },
  { type: 'config', pattern: 'packages/config', partialMatch: false },
]

/** Files inside an app that belong to one API module or one web feature, with its name captured. */
const files = [
  { category: 'api-module', pattern: 'apps/api/src/modules/*/**', capture: ['module', 'rest'] },
  { category: 'api-module-entry', pattern: 'apps/api/src/modules/*/index.ts', capture: ['module'] },
  { category: 'web-feature', pattern: 'apps/web/src/features/*/**', capture: ['feature', 'rest'] },
]

/** Which elements each element may import. Every element may import its own files. */
const allowed: Record<string, string[]> = {
  'app-web': ['ui', 'copy', 'contracts', 'domain'],
  'app-api': ['db', 'domain', 'contracts', 'copy'],
  db: [],
  domain: [],
  contracts: ['domain'],
  ui: [],
  copy: [],
  config: [],
}

const policies = [
  ...Object.entries(allowed).map(([from, to]) => ({
    from: { element: { type: from } },
    allow: { to: { element: { types: { anyOf: [from, ...to] } } } },
  })),
  // An API module reaches another module only through that module's index.ts.
  {
    from: { file: { categories: { anyOf: ['api-module'] } } },
    disallow: {
      to: {
        file: {
          categories: { anyOf: ['api-module'], noneOf: ['api-module-entry'] },
          captured: { module: '!{{ from.file.captured.module }}' },
        },
      },
    },
  },
  // A web feature never imports another feature's files.
  {
    from: { file: { categories: { anyOf: ['web-feature'] } } },
    disallow: {
      to: {
        file: { categories: { anyOf: ['web-feature'] }, captured: { feature: '!{{ from.file.captured.feature }}' } },
      },
    },
  },
]

/** The shared flat config. `rootDir` is the repo root, so element patterns resolve the same from any cwd. */
export function tenureEslintConfig(rootDir: string) {
  return defineConfig([
    globalIgnores(['**/node_modules/', '**/dist/', '**/coverage/', '.turbo/', 'legacy/', 'marketing/']),
    js.configs.recommended,
    tseslint.configs.recommended,
    {
      languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
    },
    {
      files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
      extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
      languageOptions: { globals: globals.browser },
    },
    {
      files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
      plugins: { boundaries },
      settings: {
        'boundaries/root-path': rootDir,
        'boundaries/elements': elements,
        'boundaries/files': files,
        'boundaries/include': ['apps/**/*', 'packages/**/*'],
        // `main` mirrors `exports` so the node resolver can follow workspace symlinks to their TypeScript source.
        'import/resolver': { node: { extensions: ['.ts', '.tsx', '.js', '.jsx'], preserveSymlinks: false } },
      },
      rules: {
        'boundaries/dependencies': ['error', { default: 'disallow', checkInternals: true, policies }],
      },
    },
    {
      // The server reads every phone (FR-GLOBAL-02) with `max` metadata; the web only shows numbers, on `min`.
      files: ['apps/web/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: '@tenure/domain', importNames: ['normalizePhone'], message: serverPhoneRule },
              { name: 'libphonenumber-js', message: serverPhoneRule },
            ],
            // Every other entry point carries max metadata or the full parser; only /min is allowed.
            patterns: [{ group: ['libphonenumber-js/*', '!libphonenumber-js/min'], message: serverPhoneRule }],
          },
        ],
      },
    },
    {
      // packages/domain is pure (ARCHITECTURE §4): no Node APIs, no process, and the clock is always an argument.
      files: ['packages/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', { patterns: [{ group: domainBannedModules, message: pureDomain }] }],
        'no-restricted-globals': [
          'error',
          ...['process', 'Buffer', 'require'].map((name) => ({ name, message: pureDomain })),
        ],
        'no-restricted-properties': ['error', { object: 'Date', property: 'now', message: clockArgument }],
        'no-restricted-syntax': [
          'error',
          { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: clockArgument },
        ],
      },
    },
  ])
}

const serverPhoneRule =
  'The server reads phones (normalizePhone, on libphonenumber max metadata). The web shows them with formatPhone or formatPhoneAsTyped, on min.'
const pureDomain = 'packages/domain is pure: no Node APIs or process (ARCHITECTURE §4).'
const clockArgument = 'packages/domain never reads the clock: take `now` as an argument (ARCHITECTURE §4).'
const domainBannedModules = ['node:*', 'fs', 'fs/*', 'path', 'os', 'crypto', 'child_process', 'http', 'https', 'net']
