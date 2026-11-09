// Floor tape: three segments (the first 90 days in 30-day blocks), square ends. `filled` 0–3 lights them left to right.
// Size via CSS vars --tw / --th (PageTitle and the board set them).
export default function Tape({ filled = 3, className = '', style }) {
  return (
    <div className={`tape3 ${className}`} style={style} aria-hidden="true">
      {[0, 1, 2].map((i) => <span key={i}><i style={{ width: `${Math.max(0, Math.min(1, filled - i)) * 100}%` }} /></span>)}
    </div>
  )
}
