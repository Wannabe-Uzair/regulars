// Scratch directories under apps/api/data/ (gitignored), one per test file, removed after its tests.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import path from 'node:path'
import { afterAll } from 'vitest'

export const DATA_DIR = path.join(import.meta.dirname, '..', '..', 'data')

/** A fresh directory under apps/api/data/, deleted when the file's tests finish. */
export function scratchDir(prefix: string): string {
  mkdirSync(DATA_DIR, { recursive: true })
  const dir = mkdtempSync(path.join(DATA_DIR, `${prefix}-`))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
