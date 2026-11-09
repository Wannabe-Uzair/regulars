import { Link } from 'react-router-dom'
import Tape from './Tape.jsx'
import Button from './Button.jsx'
import { t } from '../copy.js'

/* The 90-day board: kit.board's geometry, states and colours, drawn live (DESIGN §6, §12).
 * Columns as fractions of the width: name 19% | 13 week cells 53% | gap 2% | pace 9% | status 17% (CSS in app.css).
 * Cell states: 3+ visits yellow · 1–2 steel · 0 rubber3 outline · not reached nothing. SLIPPING (from the server)
 * turns the name, pace and the last two finished weeks red. The current week (in progress) is a steel outline that
 * fills yellow once it has 3 visits. Narrow boards (< 620 px) show name + cells only.
 *
 * <Board members={[MemberSummary]} highlightId={id} onNudge={(m) => …} slam={{ memberId, key }} header pace status />
 * Each row opens /members/:id (or rowHref(m)). highlightId + onNudge put the NUDGE → chip on that slipping member. */
export function cellInfo(m, c) {
  const current = m.week ?? m.weeks.length - 1
  if (c > current || c >= m.weeks.length) return { state: 'future' }
  const v = m.weeks[c]
  const now = c === current
  const flag = m.status === 'slipping' && !now && c >= current - 2
  const state = v >= 3 ? 'on' : now ? 'now' : v >= 1 ? 'low' : 'none'
  const n = c + 1
  const label = now
    ? (v === 1 ? t('a11y.cell.nowOne', { n }, 'Week {n}: in progress, 1 visit so far') : t('a11y.cell.now', { n, v }))
    : v === 0 ? t('a11y.cell.none', { n }) : v === 1 ? t('a11y.cell.one', { n }, 'Week {n}: 1 visit') : t('a11y.cell.visits', { n, v })
  return { state, flag, now, label }
}
const cellClass = ({ state, flag, now }) => `cell cell-${state === 'now' ? 'now' : state}${now && state === 'on' ? ' cell-now' : ''}${flag ? ' cell-flag' : ''}`

export function Cells({ member, className = 'board-cells', slamKey }) {
  return (
    <div className={className}>
      {Array.from({ length: 13 }, (_, c) => {
        const info = cellInfo(member, c)
        if (info.state === 'future') return <span key={c} className="cell" aria-hidden="true" />
        const slam = slamKey != null && info.now
        return <span key={slam ? `s${slamKey}` : c} role="img" aria-label={info.label} className={cellClass(info) + (slam ? ' cell-slam' : '')} />
      })}
    </div>
  )
}
// One member's 13-week row outside the board (member page, cards). Cell size via --cell.
export const WeekRow = ({ member }) => <Cells member={member} className="weekrow" />

export const paceText = (p) => (p == null ? t('common.none') : t('board.pace', { x: p.toFixed(1) }, '{x}/WK'))

// A ruler label, right-aligned to its cell: the last letter carries no tracking, so the label ends at the cell's edge.
const Mark = ({ text }) => <span>{text.slice(0, -1)}<span className="last">{text.slice(-1)}</span></span>

export default function Board({ members, header = true, pace = true, status = true, highlightId, onNudge, slam, rowHref = (m) => `/members/${m.id}`, label }) {
  return (
    <div className="board" role="group" aria-label={label ?? t('board.aria', {}, 'The 90-day board')}>
      {header && (
        <div className="board-head" aria-hidden="true">
          <span className="hl">{t('board.head.member', {}, 'NEW MEMBER')}</span>
          <div className="board-ruler">
            <div className="marks hl">{['reports.col.day30', 'reports.col.day60', 'reports.col.day90'].map((id) => <Mark key={id} text={t(id)} />)}</div>
            <Tape />
          </div>
          {pace && <span className="hl pace-h">{t('members.col.pace')}</span>}
        </div>
      )}
      {members.map((m) => {
        const flag = m.status === 'slipping'
        return (
          <div key={m.id} className={`board-row${flag ? ' flag' : ''}`}>
            <Link className="board-name" to={rowHref(m)}>{m.name}{flag && <span className="sr-only">{t('a11y.slipping', {}, ', slipping')}</span>}</Link>
            <Cells member={m} slamKey={slam?.memberId === m.id ? slam.key : undefined} />
            {pace && <span className="board-pace">{paceText(m.pace)}</span>}
            {status && (
              <div className="board-status">
                {flag && highlightId === m.id && onNudge
                  ? <Button nudge className="chip" aria-label={t('a11y.nudgeMember', { name: m.name }, 'Nudge {name}')} onClick={() => onNudge(m)} />
                  : flag && <span className="slip" aria-hidden="true">{t('status.slipping')}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// One line under a board: kit.legend's items plus the in-progress week.
export function Legend() {
  return (
    <div className="legend label label-sm" aria-hidden="true">
      <span><i className="cell cell-on" />{t('board.legend.3')}</span>
      <span><i className="cell cell-low" />{t('board.legend.low', {}, '1–2')}</span>
      <span><i className="cell cell-none" />{t('board.legend.none', {}, 'NONE')}</span>
      <span><i className="cell sw-flag" />{t('status.slipping')}</span>
      <span><i className="cell cell-now" />{t('board.legend.week', {}, 'THIS WEEK')}</span>
    </div>
  )
}
