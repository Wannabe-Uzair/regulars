import { expect, test } from 'vitest'
import { contractsPackage } from './index.ts'

test('exports its package name', () => {
  expect(contractsPackage).toBe('@tenure/contracts')
})
