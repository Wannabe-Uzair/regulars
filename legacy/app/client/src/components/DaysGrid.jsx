import { T } from '../brand.js'
import { t } from '../copy.js'
// One member's 90 days: 13 columns (weeks) × 7 rows (days), kit.days geometry (gap 0.25 of a cell).
// Visited = yellow; past day without a visit = rubber3; days not reached yet = rubber3 outline.
// days: [{ day, visited }] (SPEC member page) or visits: [day index]; daysSinceJoin marks what is still ahead.
export default function DaysGrid({ days, visits, daysSinceJoin = 89, max = 520 }) {
  const set = new Set(visits ?? days.filter((d) => d.visited).map((d) => d.day))
  const s = 10, gap = s * 0.25, w = 13 * s + 12 * gap, h = 7 * s + 6 * gap
  const rects = []
  for (let wk = 0; wk < 13; wk++) for (let d = 0; d < 7; d++) {
    const i = wk * 7 + d
    if (i >= 90) continue
    const x = wk * (s + gap), y = d * (s + gap)
    if (set.has(i)) rects.push(<rect key={i} x={x} y={y} width={s} height={s} fill={T.C.yellow} />)
    else if (i <= daysSinceJoin) rects.push(<rect key={i} x={x} y={y} width={s} height={s} fill={T.C.rubber3} />)
    else rects.push(<rect key={i} x={x + 0.5} y={y + 0.5} width={s - 1} height={s - 1} fill="none" stroke={T.C.rubber3} strokeWidth="1" />)
  }
  const label = t(set.size === 1 ? 'a11y.days.one' : 'a11y.days.many', { n: set.size, d: Math.min(90, daysSinceJoin + 1) },
    set.size === 1 ? '{n} visit in the first {d} days' : '{n} visits in the first {d} days')
  return <svg className="days-grid" style={{ '--max': `${max}px` }} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>{rects}</svg>
}
