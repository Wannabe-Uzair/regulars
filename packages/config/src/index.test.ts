import { expect, test } from 'vitest'
import { configPackage } from './index.ts'
import { domProject, nodeProject } from './vitest.ts'

test('exports its package name', () => {
  expect(configPackage).toBe('@tenure/config')
})

test('vitest presets pick the right environment', () => {
  expect(nodeProject('x').test.environment).toBe('node')
  expect(domProject('x').test.environment).toBe('jsdom')
})
