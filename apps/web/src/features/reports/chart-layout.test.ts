import type { WeekVisitsRow } from '@tenure/contracts'
import { describe, expect, test } from 'vitest'
import { CHART_HEIGHT, chartLayout, type LabelKey } from './chart-layout.ts'

const text: Record<LabelKey, string> = { stillComing: 'Still coming', slipped: 'Slipped', line: 'The line · 3 a week' }

const weeks = (still: (number | null)[], slipped: (number | null)[]): WeekVisitsRow[] =>
  Array.from({ length: 13 }, (_, i) => ({ week: i + 1, stillComing: still[i] ?? null, slipped: slipped[i] ?? null }))

const full = weeks(
  [3.5, 3.2, 3, 2.9, 3.1, 3, 2.8, 3, 3.2, 3, 2.9, 3.1, 3.4],
  [2, 1.5, 1.2, 1, 0.8, 0.5, 0.4, 0.3, 0.2, 0.2, 0.1, 0, 0],
)

describe('the visits chart layout (FR-REPORT-02)', () => {
  test('FR-REPORT-02: the y axis runs to at least one past the line, and further when the data does', () => {
    expect(chartLayout(full, 3, 640, text).yMax).toBe(4)
    const busy = weeks([5.2], [1])
    const layout = chartLayout(busy, 3, 640, text)
    expect(layout.yMax).toBe(6)
    expect(layout.yTicks.map((tick) => tick.value)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(layout.height).toBe(CHART_HEIGHT)
  })

  test('FR-REPORT-02: the chart is drawn at the width it is given, so a phone gets the whole chart', () => {
    const phone = chartLayout(full, 3, 300, text)
    expect(phone.plot.right).toBeLessThanOrEqual(300)
    expect(Math.max(...phone.points.stillComing.map((p) => p.x))).toBeLessThanOrEqual(300)
    // A narrow plot writes every other week; a wide one writes all 13.
    expect(phone.xTicks.map((tick) => tick.week)).toEqual([1, 3, 5, 7, 9, 11, 13])
    expect(chartLayout(full, 3, 900, text).xTicks).toHaveLength(13)
  })

  test('FR-REPORT-02: a week with nobody in it breaks the line, and a lone week still shows as a point', () => {
    const gappy = weeks([2, 2, null, 3, null, 1], [])
    const layout = chartLayout(gappy, 3, 640, text)
    expect(layout.paths.stillComing.match(/M/g)).toHaveLength(3)
    expect(layout.paths.stillComing.match(/L/g)).toHaveLength(1)
    expect(layout.isolated.stillComing.map((p) => p.week)).toEqual([4, 6])
    expect(layout.paths.slipped).toBe('')
  })

  test('FR-REPORT-02: each drawn line has one label, at its end', () => {
    const layout = chartLayout(full, 3, 640, text)
    expect(layout.labels.map((l) => l.key).sort()).toEqual(['line', 'slipped', 'stillComing'])
    const still = layout.labels.find((l) => l.key === 'stillComing')!
    const lastStill = layout.points.stillComing.at(-1)!
    expect(still).toMatchObject({ x: lastStill.x, anchor: 'end' })
    expect(still.y).toBeLessThan(lastStill.y)
    expect(layout.labels.find((l) => l.key === 'line')!.x).toBe(layout.plot.right)

    // A series that ends early is labelled where it ends; one with nobody in it gets no label.
    const early = chartLayout(weeks([2, 2, 2, 2, 2, 2, 2, 2], []), 3, 640, text)
    expect(early.labels.map((l) => l.key).sort()).toEqual(['line', 'stillComing'])
    expect(early.labels.find((l) => l.key === 'stillComing')!.x).toBe(early.points.stillComing.at(-1)!.x)
  })

  test('FR-REPORT-02: labels whose lines end together are kept apart and inside the chart', () => {
    // All three lines end at 3: the labels stack instead of overprinting.
    const together = chartLayout(weeks(Array(13).fill(3), Array(13).fill(3)), 3, 640, text)
    const ys = together.labels.map((l) => l.y).sort((a, b) => a - b)
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(16)

    // Lines ending at the very top and the very bottom keep their labels on the chart.
    const edges = chartLayout(weeks([...Array(12).fill(1), 4], [...Array(12).fill(1), 0]), 3, 640, text)
    for (const label of edges.labels) {
      expect(label.y).toBeGreaterThanOrEqual(16)
      expect(label.y).toBeLessThanOrEqual(edges.plot.bottom)
    }
    // Top to bottom, the labels keep their lines' order.
    const order = edges.labels.map((l) => l.key)
    expect(order).toEqual(['stillComing', 'line', 'slipped'])
  })

  test('FR-REPORT-02: two lines that end close together are labelled outside the gap between them', () => {
    // Still coming ends just under the line at 3: the line's label goes above it, still coming's below its own end.
    const close = chartLayout(weeks([...Array(12).fill(3), 2.8], Array(13).fill(0.2)), 3, 640, text)
    const label = (key: LabelKey) => close.labels.find((l) => l.key === key)!
    const stillEnd = close.points.stillComing.at(-1)!
    expect(label('line').y).toBeLessThan(close.lineY)
    expect(label('stillComing').y).toBeGreaterThan(stillEnd.y)
    // Slipped ends near 0, with no room below: its label goes above its end rather than over its last marker.
    expect(label('slipped').y).toBeLessThan(close.points.slipped.at(-1)!.y)
  })

  test("FR-REPORT-02: on a phone, no label's text sits on a line it spans, though the lines peak under it", () => {
    // The demo's shape: still coming wavers about the line at 3 through its last weeks, so at 310 px a label ending at
    // week 13 spans weeks 10 to 13, where the series peaks above its own end.
    const demo = weeks(
      [3.1, 3.1, 2.9, 2.3, 2.4, 2.5, 2.8, 2.9, 2.8, 2.8, 3.1, 2.8, 2.9],
      [2.9, 2.6, 1.9, 2, 1.7, 1.6, 1.1, 1.4, 0.9, 1.2, 1.5, 0.2, 0],
    )
    for (const width of [290, 310, 340, 640]) {
      const layout = chartLayout(demo, 3, width, text)
      const lines = (['stillComing', 'slipped'] as const).flatMap((key) => {
        const pts = layout.points[key]
        return pts.slice(1).map((p, i) => [pts[i]!, p] as const)
      })
      lines.push([
        { week: 0, x: layout.plot.left, y: layout.lineY, value: 3 },
        { week: 0, x: layout.plot.right, y: layout.lineY, value: 3 },
      ])
      for (const label of layout.labels) {
        // The glyphs' box: 13 px text, about 7 px a character, 10 above the baseline and 3 below.
        const w = text[label.key].length * 7
        const left = label.anchor === 'end' ? label.x - w : label.x
        const [top, bottom] = [label.y - 10, label.y + 3]
        for (const [a, b] of lines) {
          for (let x = Math.max(left, a.x); x <= Math.min(left + w, b.x); x += 1) {
            const y = a.x === b.x ? a.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)
            expect({ width, key: label.key, crosses: y >= top && y <= bottom }).toEqual({
              width,
              key: label.key,
              crosses: false,
            })
          }
        }
      }
    }
  })

  test('FR-REPORT-02: a label that would run off the start reads forward from its end instead', () => {
    const one = chartLayout(weeks([2], []), 3, 640, text)
    expect(one.labels.find((l) => l.key === 'stillComing')!.anchor).toBe('start')
  })
})
