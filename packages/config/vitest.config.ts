import { defineProject } from 'vitest/config'
import { nodeProject } from './src/vitest.ts'

export default defineProject(nodeProject('config'))
