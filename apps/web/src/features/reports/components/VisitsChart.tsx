import type { WeekVisitsRow } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { chartLayout, type LabelKey } from '../chart-layout.ts'
import styles from './VisitsChart.module.css'

/** The width drawn at before the box is measured (and where nothing measures, as in tests). */
const FIRST_WIDTH = 640
const MARKER_RADIUS = 3.5

const labelClass: Record<LabelKey, string | undefined> = {
  stillComing: styles.stillLabel,
  slipped: styles.slippedLabel,
  line: styles.lineLabel,
}

/**
 * Visits a week since joining (FR-REPORT-02), drawn in SVG at its box's own width, so it fits a phone with its text at
 * full size. Still coming is solid in the text colour, slipped dashed in the slipping colour with point markers, and
 * the line at 3 dotted in soft text. Each line is labelled once, at its end; there is no legend. Screen readers get the
 * chart's name and every week's two figures.
 */
export function VisitsChart({ rows, line }: { rows: readonly WeekVisitsRow[]; line: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(FIRST_WIDTH)
  const descId = useId()

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      if (el.clientWidth > 0) setWidth(el.clientWidth)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const text: Record<LabelKey, string> = {
    stillComing: t('reports.chart.still'),
    slipped: t('reports.chart.slipped'),
    line: t('reports.chart.line'),
  }
  const layout = chartLayout(rows, line, width, text)
  const { plot } = layout

  return (
    <figure className={styles.figure}>
      <div ref={box} className={styles.box}>
        <svg
          className={styles.svg}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label={t('a11y.chart')}
          aria-describedby={descId}
        >
          <desc id={descId}>{describe(rows)}</desc>
          {layout.yTicks.map((tick) => (
            <g key={tick.value}>
              <line className={styles.grid} x1={plot.left} x2={plot.right} y1={tick.y} y2={tick.y} />
              <text className={styles.tick} x={plot.left - 8} y={tick.y} dominantBaseline="middle" textAnchor="end">
                {tick.value}
              </text>
            </g>
          ))}
          {layout.xTicks.map((tick) => (
            <text key={tick.week} className={styles.tick} x={tick.x} y={layout.height - 8} textAnchor="middle">
              {tick.week}
            </text>
          ))}
          <line className={styles.line} x1={plot.left} x2={plot.right} y1={layout.lineY} y2={layout.lineY} />
          <path className={styles.slipped} d={layout.paths.slipped} />
          {layout.points.slipped.map((p) => (
            <circle key={p.week} className={styles.slippedMarker} cx={p.x} cy={p.y} r={MARKER_RADIUS} />
          ))}
          <path className={styles.still} d={layout.paths.stillComing} />
          {layout.isolated.stillComing.map((p) => (
            <circle key={p.week} className={styles.stillMarker} cx={p.x} cy={p.y} r={MARKER_RADIUS} />
          ))}
          {layout.labels.map((label) => (
            <text
              key={label.key}
              className={`${styles.label} ${labelClass[label.key] ?? ''}`}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
            >
              {text[label.key]}
            </text>
          ))}
        </svg>
      </div>
      <figcaption className={styles.caption}>
        <span>{t('reports.chart.axis')}</span>
        <span>{t('reports.chart.stillDef')}</span>
      </figcaption>
    </figure>
  )
}

/** "Week 1: still coming 2.5, slipped 1.2; …", for every week with anyone in it. */
function describe(rows: readonly WeekVisitsRow[]): string {
  const none = t('reports.chart.none')
  return rows
    .filter((r) => r.stillComing !== null || r.slipped !== null)
    .map((r) => t('reports.chart.point', { n: r.week, still: r.stillComing ?? none, slipped: r.slipped ?? none }))
    .join('; ')
}
