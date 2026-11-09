import { catalogue } from './catalogue.generated.ts'

export { catalogue }
export type CopyId = keyof typeof catalogue

export const copyPackage = '@tenure/copy'

type Placeholders<S extends string> = S extends `${string}{${infer K}}${infer R}`
  ? K | Placeholders<R>
  : never

type Vars<I extends CopyId> = [Placeholders<(typeof catalogue)[I]>] extends [never]
  ? []
  : [vars: Record<Placeholders<(typeof catalogue)[I]>, string | number>]

// t('kiosk.welcome.back', { first: 'Sam', n: 4 }) fills {placeholders}. An id that is not in COPY.md,
// or a missing or extra placeholder, fails to compile. A placeholder not in vars stays as written.
export function t<I extends CopyId>(id: I, ...args: Vars<I>): string {
  const vars: Record<string, string | number> = args[0] ?? {}
  return catalogue[id].replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export const has = (id: string): id is CopyId => Object.hasOwn(catalogue, id)
