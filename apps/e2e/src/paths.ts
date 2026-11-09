// Where the e2e run keeps its files. The databases live in this worktree; the WebKit download is shared by every
// worktree of the repository, under the main checkout's gitignored .cache/.
import { execFileSync } from 'node:child_process'
import path from 'node:path'

/** apps/e2e. */
export const E2E_DIR = path.resolve(import.meta.dirname, '..')

/** This checkout's root (a worktree's own root inside a worktree). */
export const REPO_DIR = path.resolve(E2E_DIR, '..', '..')

/** apps/e2e/.data: one seeded database per browser (gitignored). */
export const DATA_DIR = path.join(E2E_DIR, '.data')

/**
 * The main checkout's root: the parent of `git rev-parse --git-common-dir`, which is the same for every worktree.
 * Read-only git, run in this checkout.
 */
function sharedRepoDir(): string {
  // No GIT_* keys (a hook sets GIT_DIR and friends); if the command still fails, this checkout's root stands in.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')))
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: E2E_DIR,
      encoding: 'utf8',
      env,
    }).trim()
    return path.dirname(path.resolve(E2E_DIR, common))
  } catch {
    return REPO_DIR
  }
}

/** <repo>/.cache/ms-playwright: where `npm run e2e:install` puts WebKit, and where the run looks for it. */
export function browsersPath(): string {
  return path.join(sharedRepoDir(), '.cache', 'ms-playwright')
}
