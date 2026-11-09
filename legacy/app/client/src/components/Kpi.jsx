import { useEffect, useRef, useState } from 'react'
import { t } from '../copy.js'
import { reducedMotion } from '../util.js'
// KPI tile: label above an Anton number. tone 'on' = yellow (ON THE LINE), 'slipping' = red, else chalk.
// Counts up on first render (0.4 s); with reduced motion it doesn't. value null shows a dash.
export default function Kpi({ label, value, suffix = '', tone, sub }) {
  const shown = useCountUp(value)
  const text = (v) => (v == null ? t('common.none') : `${v}${suffix}`)
  return (
    <div className="panel kpi">
      <div className="label label-sm kpi-label">{label}</div>
      <div className={`kpi-value kpi-num${tone ? ` tone-${tone}` : ''}`}>
        <span aria-hidden="true">{text(value)}</span>
        <span>{text(value == null ? null : shown)}</span>
      </div>
      {sub && <div className="meta kpi-sub">{sub}</div>}
    </div>
  )
}
function useCountUp(target, ms = 400) {
  const [v, setV] = useState(() => (typeof target === 'number' && !reducedMotion() ? 0 : target))
  const first = useRef(true)
  useEffect(() => {
    if (typeof target !== 'number' || !first.current || reducedMotion()) { setV(target); return }
    first.current = false
    let raf, t0
    const step = (t) => { t0 ??= t; const k = Math.min(1, (t - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - k, 4)))); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
