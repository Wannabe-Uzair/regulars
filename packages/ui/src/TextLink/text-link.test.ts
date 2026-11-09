import { expect, test } from 'vitest'
import { textLinkClass } from './text-link.ts'
import styles from './TextLink.module.css'

// layout.test.ts checks the CSS rule; this checks the export points at it, so a mistyped key can't export no class.
test('textLinkClass is the TextLink module rule', () => {
  expect(styles.textLink).toBeTruthy()
  expect(textLinkClass).toBe(styles.textLink)
})
