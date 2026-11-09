// The visits-by-week chart's geometry (FR-REPORT-02): scales, the two series' paths, the axes and where each line's
// one label sits at its end. Pure, so the screen only draws what this returns.
import type { WeekVisitsRow } from '@tenure/contracts'

export type SeriesKey = 'stillComing' | 'slipped'
export type LabelKey = SeriesKey | 'line'

export type Point = { week: number; x: number; y: number; value: number }

export type EndLabel = {
  key: LabelKey
  /** Where the text is anchored: the line's end, so it reads back along the line. */
  x: number
  /** The text's baseline. */
  y: number
  anchor: 'start' | 'end'
}

export type ChartLayout = {
  width: number
  height: number
  plot: { left: number; right: number; top: number; bottom: number }
  yMax: number
  /** The gridlines and their figures, 0 to yMax. */
  yTicks: { value: number; y: number }[]
  /** The weeks written under the axis: every week, or every other one when the plot is narrow. */
  xTicks: { week: number; x: number }[]
  /** Each series' SVG path; a week with nobody in it (null) breaks the line. */
  paths: Record<SeriesKey, string>
  points: Record<SeriesKey, Point[]>
  /** Points with no neighbour on either side, which a path alone wouldn't show. */
  isolated: Record<SeriesKey, Point[]>
  /** The line across the chart at `line` visits a week. */
  lineY: number
  /** One label per line that is drawn, kept apart vertically. */
  labels: EndLabel[]
}

export const CHART_HEIGHT = 260
const WEEKS = 13
/** Room for the y figures, the x figures and a label above the top line. */
const MARGIN = { left: 28, right: 8, top: 24, bottom: 28 }
/** Below this plot width the x axis writes every other week. */
const NARROW_PLOT = 420
/** The labels' line height, at the chart's 13 px label size. */
const LABEL_GAP = 16
/** How far a label's baseline sits above its line's end. */
const LABEL_RISE = 8
/** How far a label's baseline sits below its line's end, clearing the stroke. */
const LABEL_DROP = 18
/** A rough width per character at 13 px, enough to tell whether a label fits before its line's end. */
const CHAR_WIDTH = 7
/** How far a label's text, with its halo, reaches above and below its baseline at 13 px. */
const LABEL_ASCENT = 12
const LABEL_DESCENT = 4
/** Half a line's stroke, plus a marker's reach, kept clear of a label's text. */
const STROKE_CLEAR = 4

/** A stretch of a drawn line (a lone point is a stretch from itself to itself). */
type Segment = { x1: number; y1: number; x2: number; y2: number }

export function chartLayout(
  rows: readonly WeekVisitsRow[],
  line: number,
  width: number,
  labelText: Record<LabelKey, string>,
): ChartLayout {
  const height = CHART_HEIGHT
  const plot = { left: MARGIN.left, right: width - MARGIN.right, top: MARGIN.top, bottom: height - MARGIN.bottom }
  const values = rows.flatMap((r) => [r.stillComing, r.slipped]).filter((v): v is number => v !== null)
  const yMax = Math.max(line + 1, Math.ceil(Math.max(0, ...values)))
  const x = (week: number) => plot.left + ((week - 1) / (WEEKS - 1)) * (plot.right - plot.left)
  const y = (value: number) => plot.bottom - (value / yMax) * (plot.bottom - plot.top)

  const points = {} as Record<SeriesKey, Point[]>
  const paths = {} as Record<SeriesKey, string>
  const isolated = {} as Record<SeriesKey, Point[]>
  const segments: Segment[] = []
  for (const key of ['stillComing', 'slipped'] as const) {
    const byWeek = new Map(rows.map((r) => [r.week, r[key]]))
    const series: Point[] = []
    let d = ''
    const lonely: Point[] = []
    for (let week = 1; week <= WEEKS; week++) {
      const value = byWeek.get(week) ?? null
      if (value === null) continue
      const point = { week, x: x(week), y: y(value), value }
      const joinsBefore = (byWeek.get(week - 1) ?? null) !== null
      const joinsAfter = (byWeek.get(week + 1) ?? null) !== null
      d += `${joinsBefore ? 'L' : 'M'}${round(point.x)} ${round(point.y)}`
      if (!joinsBefore && !joinsAfter) lonely.push(point)
      const before = series.at(-1)
      if (joinsBefore && before) segments.push({ x1: before.x, y1: before.y, x2: point.x, y2: point.y })
      else segments.push({ x1: point.x, y1: point.y, x2: point.x, y2: point.y })
      series.push(point)
    }
    points[key] = series
    paths[key] = d
    isolated[key] = lonely
  }

  const lineY = y(line)
  segments.push({ x1: plot.left, y1: lineY, x2: plot.right, y2: lineY })
  const ends: { key: LabelKey; x: number; y: number }[] = [{ key: 'line', x: plot.right, y: lineY }]
  for (const key of ['stillComing', 'slipped'] as const) {
    const last = points[key].at(-1)
    if (last) ends.push({ key, x: last.x, y: last.y })
  }

  const plotWidth = plot.right - plot.left
  return {
    width,
    height,
    plot,
    yMax,
    yTicks: Array.from({ length: yMax + 1 }, (_, value) => ({ value, y: y(value) })),
    xTicks: Array.from({ length: WEEKS }, (_, i) => i + 1)
      .filter((week) => plotWidth >= NARROW_PLOT || week % 2 === 1)
      .map((week) => ({ week, x: x(week) })),
    paths,
    points,
    isolated,
    lineY,
    labels: placeLabels(ends, plot, labelText, segments),
  }
}

/**
 * Each label ends at its line's end (or starts there when the text wouldn't fit before it). The top line's label sits
 * above its end and every other one below where there's room, so two lines that end close together have their labels outside the gap
 * between them, not across the lower line. A label whose text would cross a drawn line (on a phone the text spans
 * several weeks) tries the other side of its end, then moves clear of every line under its text. Labels still too
 * close are pushed apart, keeping their top-to-bottom order, and all of them stay inside the chart.
 */
function placeLabels(
  ends: { key: LabelKey; x: number; y: number }[],
  plot: ChartLayout['plot'],
  labelText: Record<LabelKey, string>,
  segments: readonly Segment[],
): EndLabel[] {
  const sorted = [...ends].sort((a, b) => a.y - b.y)
  const highest = LABEL_GAP
  const lowest = plot.bottom - LABEL_RISE
  const inside = (baseline: number) => baseline >= highest && baseline <= lowest
  const anchors = sorted.map((end) => {
    const width = labelText[end.key].length * CHAR_WIDTH
    return end.x - plot.left >= width ? ('end' as const) : ('start' as const)
  })
  const baselines = sorted.map((e, i) => {
    const width = labelText[e.key].length * CHAR_WIDTH
    const from = anchors[i] === 'end' ? e.x - width : e.x
    const under = segments.map((s) => spanYs(s, from, from + width)).filter((r) => r !== null)
    const clear = (baseline: number) =>
      under.every(
        ([top, bottom]) =>
          bottom + STROKE_CLEAR < baseline - LABEL_ASCENT || top - STROKE_CLEAR > baseline + LABEL_DESCENT,
      )
    const above = e.y - LABEL_RISE
    const below = e.y + LABEL_DROP
    // Below its end unless it's the top line, or there's no room under it (it would cover its own last point).
    const want = i === 0 || below > lowest ? above : below
    // Else the clear baseline nearest that: just above or just below a line under the text.
    const slots = [want, want === above ? below : above]
    for (const [top, bottom] of under) {
      slots.push(top - STROKE_CLEAR - LABEL_DESCENT - 1, bottom + STROKE_CLEAR + LABEL_ASCENT + 1)
    }
    let best: number | undefined
    for (const b of slots) {
      if (inside(b) && clear(b) && (best === undefined || Math.abs(b - want) < Math.abs(best - want))) best = b
    }
    return best ?? want
  })
  for (let i = 0; i < baselines.length; i++) {
    const floor = i === 0 ? highest : baselines[i - 1]! + LABEL_GAP
    baselines[i] = Math.max(baselines[i]!, floor)
  }
  // Pushed past the bottom: walk back up, keeping the gaps.
  for (let i = baselines.length - 1; i >= 0; i--) {
    const ceiling = i === baselines.length - 1 ? lowest : baselines[i + 1]! - LABEL_GAP
    baselines[i] = Math.min(baselines[i]!, ceiling)
  }
  return sorted.map((end, i) => ({ key: end.key, x: end.x, y: round(baselines[i]!), anchor: anchors[i]! }))
}

/** The top and bottom a segment reaches between x = from and x = to, or null when it lies outside them. */
function spanYs(s: Segment, from: number, to: number): [number, number] | null {
  const lo = Math.max(Math.min(s.x1, s.x2), from)
  const hi = Math.min(Math.max(s.x1, s.x2), to)
  if (lo > hi) return null
  const at = (x: number) => (s.x2 === s.x1 ? s.y1 : s.y1 + ((x - s.x1) / (s.x2 - s.x1)) * (s.y2 - s.y1))
  const [a, b] = [at(lo), at(hi)]
  return [Math.min(a, b), Math.max(a, b)]
}

const round = (n: number) => Math.round(n * 10) / 10
