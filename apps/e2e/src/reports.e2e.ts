// Reports (FR-REPORT-01): each section is titled by its takeaway. Nothing is saved.
import { demo, expect, expectFiguresRolledTo, signIn, test } from './fixtures.ts'

test('FR-REPORT-01 the nudges lead stays on one line where it fits, on a laptop and a phone (preflight F2)', async ({
  page,
}) => {
  await signIn(page, demo.owner)
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/app/reports')
    const lead = page.getByRole('heading', { level: 2, name: /nudges? led to a visit$/ })
    await expect(lead).toBeVisible()
    await expectFiguresRolledTo(page)
    await page.evaluate('document.fonts.ready.then(() => undefined)')
    // The heading takes its header's row, and the lead, which fits that row at both widths, takes one line of it.
    // (Sized to its content, WebKit measured the rolling digits short and broke it after "nudges".)
    const box = await lead.evaluate((h) => {
      const style = h.ownerDocument.defaultView!.getComputedStyle
      const header = h.parentElement!
      const row =
        header.clientWidth - parseFloat(style(header).paddingInlineStart) - parseFloat(style(header).paddingInlineEnd)
      return {
        width: h.getBoundingClientRect().width,
        row,
        lines: h.getBoundingClientRect().height / parseFloat(style(h).lineHeight),
      }
    })
    expect(Math.abs(box.width - box.row), `${width} px: the heading's width against its row`).toBeLessThanOrEqual(1)
    expect(Math.round(box.lines), `${width} px: the lead's lines`).toBe(1)
  }
})
