import { fileURLToPath } from 'node:url'

type ProjectPreset = {
  test: { name: string; environment: 'node' | 'jsdom'; include: string[]; setupFiles?: string[] }
}

const domSetup = fileURLToPath(new URL('./setup-dom.ts', import.meta.url))

/** Vitest project preset for packages and the API: Node environment. */
export function nodeProject(name: string): ProjectPreset {
  return {
    test: {
      name,
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
}

/** Vitest project preset for the web app and ui: jsdom with jest-dom matchers and Testing Library cleanup. */
export function domProject(name: string): ProjectPreset {
  return {
    test: {
      name,
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: [domSetup],
    },
  }
}
