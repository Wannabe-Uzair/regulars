import { expect, test } from 'vitest'
import { domainPackage } from './index.ts'

test('exports its package name', () => {
  expect(domainPackage).toBe('@tenure/domain')
})
