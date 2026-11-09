import { join } from 'node:path'
import { ESLint } from 'eslint'
import { expect, test } from 'vitest'
import { tenureEslintConfig } from './eslint.ts'

const root = join(import.meta.dirname, '../../..')
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: tenureEslintConfig(root) })

/** The no-restricted-imports messages for `code` as if it were the file at `path`. */
async function restricted(code: string, path: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(root, path) })
  return result!.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message)
}

test('FR-GLOBAL-02 the web may not import normalizePhone or libphonenumber’s max metadata', async () => {
  const web = 'apps/web/src/shared/x.ts'
  expect(
    await restricted("import { normalizePhone } from '@tenure/domain'\nnormalizePhone('', 'US')\n", web),
  ).toHaveLength(1)
  expect(await restricted("import 'libphonenumber-js'\n", web)).toHaveLength(1)
  expect(await restricted("import 'libphonenumber-js/max'\n", web)).toHaveLength(1)
  expect(await restricted("import 'libphonenumber-js/mobile'\n", web)).toHaveLength(1)
  expect(await restricted("import 'libphonenumber-js/core'\n", web)).toHaveLength(1)
  expect(await restricted("import 'libphonenumber-js/min'\n", web)).toEqual([])
  expect(await restricted("import { formatPhone } from '@tenure/domain'\nformatPhone('', 'US')\n", web)).toEqual([])
})

test('FR-GLOBAL-02 the API may import normalizePhone', async () => {
  const code = "import { normalizePhone } from '@tenure/domain'\nnormalizePhone('', 'US')\n"
  expect(await restricted(code, 'apps/api/src/modules/x/service.ts')).toEqual([])
})
