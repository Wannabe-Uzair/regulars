import { Link } from 'react-router-dom'
import Button from './Button.jsx'
import StatusTag from './StatusTag.jsx'
import { WeekRow } from './Board.jsx'
import { lastVisitText } from '../util.js'
import { t } from '../copy.js'

// Desktop action-list row (SLIPPING NOW, CHECKED IN TODAY): Anton name, meta, week row, status, NUDGE → for slipping members.
// Use inside <ul className="list">. `meta` overrides the default meta line.
export default function MemberRow({ member: m, onNudge, meta, to = `/members/${m.id}` }) {
  const slipping = m.status === 'slipping'
  return (
    <li className="member-row">
      <div className="who">
        <Link className="action-name" to={to}>{m.name}</Link>
        <span className="meta">{meta ?? defaultMeta(m)}</span>
      </div>
      <WeekRow member={m} />
      <div className="btn-row">
        <StatusTag status={m.status} />
        {slipping && onNudge && <Button nudge aria-label={t('a11y.nudgeMember', { name: m.name }, 'Nudge {name}')} onClick={() => onNudge(m)} />}
      </div>
    </li>
  )
}
export const defaultMeta = (m) => [lastVisitText(m.daysSinceLastVisit), t('member.meta.week', { n: (m.week ?? 0) + 1 }, 'Week {n}'), m.coachName && t('member.meta.coach', { name: m.coachName }, 'Coach {name}')].filter(Boolean).join(' · ')
