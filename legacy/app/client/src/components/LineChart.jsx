import { useLayoutEffect, useRef, useState } from 'react'
import { T } from '../brand.js'
import { t } from '../copy.js'
// Visits by week since joining (SPEC §6 reports.visitsByWeek): yellow = members still coming, steel = the rest,
// dashed chalk line at 3 visits a week labelled THE LINE · 3 A WEEK. Axis labels Barlow Condensed 600, steel.
// data: [{ week: 1..13, stillComing, slipped }] (null = no data). Drawn at the container's pixel width so text never scales.
export default function LineChart({ data, height = 280, title = t('reports.chart.title', {}, 'Visits a week since joining') }) {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const vals = data.flatMap((d) => [d.stillComing, d.slipped]).filter((v) => v != null)
  const yMax = Math.max(4, Math.ceil(Math.max(0, ...vals)))
  const L = 30, R = 8, Tp = 14, B = 34
  const iw = Math.max(0, w - L - R), ih = height - Tp - B
  const x = (wk) => L + ((wk - 1) / 12) * iw
  const y = (v) => Tp + ih - (v / yMax) * ih
  const path = (key) => data.reduce((acc, d) => {
    if (d[key] == null) return { d: acc.d, pen: false }
    return { d: acc.d + `${acc.pen ? 'L' : 'M'}${x(d.week).toFixed(1)} ${y(d[key]).toFixed(1)}`, pen: true }
  }, { d: '', pen: false }).d
  // THE LINE label: never on top of a data line. Try right/below (the old spot), right/above, left/below, left/above;
  // take the first whose box keeps every series 4 px clear, else the roomiest.
  const lineText = t('reports.chart.line')
  const lw = lineText.length * 8.5
  const lineLabel = (() => {
    const sample = (key) => {
      const pts = []
      for (let i = 0; i < data.length; i++) {
        const a = data[i], b = data[i + 1]
        if (a[key] == null) continue
        pts.push([x(a.week), y(a[key])])
        if (b && b[key] != null) for (let k = 1; k < 8; k++) pts.push([x(a.week) + (x(b.week) - x(a.week)) * k / 8, y(a[key]) + (y(b[key]) - y(a[key])) * k / 8])
      }
      return pts
    }
    const pts = [...sample('stillComing'), ...sample('slipped')]
    let best = null
    for (const [end, above] of [[true, false], [true, true], [false, false], [false, true]]) {
      const x1 = end ? w - R - lw : L + 6, x2 = x1 + lw
      const base = y(3) + (above ? -8 : 20)
      const top = base - 12, bottom = base + 3
      const gap = Math.min(Infinity, ...pts.filter(([px]) => px >= x1 - 4 && px <= x2 + 4).map(([, py]) => (py < top ? top - py : py > bottom ? py - bottom : 0)))
      if (gap >= 4) return { end, base }
      if (!best || gap > best.gap) best = { end, base, gap }
    }
    return best
  })()
  const label = { fontFamily: T.F.label, fontWeight: 600, fontSize: 15, fill: T.C.steel }
  const step = iw < 420 ? 2 : 1
  return (
    <figure className="chart" style={{ margin: 0 }}>
      <div className="chart-legend label label-sm" aria-hidden="true">
        <span><i style={{ background: T.C.yellow }} />{t('reports.chart.still')}</span>
        <span><i style={{ background: T.C.steel }} />{t('reports.chart.slipped')}</span>
      </div>
      <div ref={ref}>
        {w > 0 && (
          <svg width={w} height={height} role="img" aria-label={`${title}. ${describe(data)}`}>
            {Array.from({ length: yMax + 1 }, (_, v) => (
              <g key={v}>
                <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={T.C.rubber3} strokeWidth="1" />
                <text x={L - 10} y={y(v) + 5} textAnchor="end" style={label}>{v}</text>
              </g>
            ))}
            {data.map((d) => (d.week - 1) % step === 0 || d.week === 13 ? <text key={d.week} x={x(d.week)} y={height - 12} textAnchor="middle" style={label}>{d.week}</text> : null)}
            <line x1={L} x2={w - R} y1={y(3)} y2={y(3)} stroke={T.C.chalk} strokeWidth="1.5" strokeDasharray="6 5" />
            <text x={lineLabel.end ? w - R : L + 6} y={lineLabel.base} textAnchor={lineLabel.end ? 'end' : 'start'} style={{ ...label, fontWeight: 700, fill: T.C.chalk, letterSpacing: '0.12em', fontSize: 13 }}>{lineText}</text>
            <path d={path('slipped')} fill="none" stroke={T.C.steel} strokeWidth="3" strokeLinejoin="miter" strokeLinecap="square" />
            <path d={path('stillComing')} fill="none" stroke={T.C.yellow} strokeWidth="3" strokeLinejoin="miter" strokeLinecap="square" />
          </svg>
        )}
      </div>
      <figcaption className="meta" style={{ marginTop: 6 }}>{t('reports.chart.axis', {}, 'Week since joining')}</figcaption>
    </figure>
  )
}
const describe = (data) => data.filter((d) => d.stillComing != null || d.slipped != null)
  .map((d) => t('reports.chart.point', { n: d.week, still: d.stillComing ?? t('reports.chart.none', {}, 'none'), slipped: d.slipped ?? t('reports.chart.none', {}, 'none') },
    'Week {n}: still coming {still}, slipped {slipped}')).join('; ')
