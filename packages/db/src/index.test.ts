import { expect, test } from 'vitest'
import { dbPackage } from './index.ts'

test('exports its package name', () => {
  expect(dbPackage).toBe('@tenure/db')
})
