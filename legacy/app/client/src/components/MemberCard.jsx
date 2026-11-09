import { Link } from 'react-router-dom'
import Button from './Button.jsx'
import StatusTag from './StatusTag.jsx'
import { WeekRow } from './Board.jsx'
import { t } from '../copy.js'
import { defaultMeta } from './MemberRow.jsx'

// Phone card: rubber2, 14 px apart (wrap them in <ul className="member-cards">), full-width NUDGE → for slipping members.
export default function MemberCard({ member: m, onNudge, meta, to = `/members/${m.id}` }) {
  const slipping = m.status === 'slipping'
  return (
    <li className="member-card">
      <div className="card-top">
        <Link className="action-name" to={to}>{m.name}</Link>
        <StatusTag status={m.status} />
      </div>
      <span className="meta">{meta ?? defaultMeta(m)}</span>
      <WeekRow member={m} />
      {slipping && onNudge && <Button nudge block aria-label={t('a11y.nudgeMember', { name: m.name }, 'Nudge {name}')} onClick={() => onNudge(m)} />}
    </li>
  )
}
