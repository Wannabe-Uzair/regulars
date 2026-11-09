// Hazard band, 16 px: only on the top edge of an area that needs action (SLIPPING NOW; a phone's Today when anyone slips).
// One per screen, never on calm screens. Uses the brand's .hazard class.
export default function Hazard({ className = '' }) {
  return <div className={`hazard hazard-band ${className}`} aria-hidden="true" />
}
