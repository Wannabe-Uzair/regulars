import { t } from '../../copy.js'
import { fmtDate } from '../../util.js'

// Small shared pieces of the core screens (Today, Board, Members, Member, Nudges). Every word comes from COPY.md.

export const STATUSES = ['slipping', 'new', 'on', 'below'] // SPEC §4 order of checks
export const statusLabel = (s) => t(`status.${s}`)

// COPY uses a `{Mon d}` token, which t() can't fill (it only fills {word} tokens).
export const joinedText = (ymd) => t('member.joined').replace('{Mon d}', fmtDate(ymd))

// "+13125550177" -> "(312) 555-0177"; anything else as stored.
export function phoneText(p) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p ?? '')
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p ?? ''
}

// Member page: "Last visit 11 days ago" / today / yesterday / never.
export function lastVisitLong(n) {
  if (n == null) return t('member.lastVisit.never', {}, 'Never visited')
  if (n === 0) return t('member.lastVisit.today', {}, 'Last visit today')
  if (n === 1) return t('member.lastVisit.yesterday', {}, 'Last visit yesterday')
  return t('member.lastVisit', { n })
}
// Members table cell: "11 days ago" / Today / Yesterday / Never visited.
export function lastVisitShort(n) {
  if (n == null) return t('member.lastVisit.never', {}, 'Never visited')
  if (n === 0) return t('members.last.today', {}, 'Today')
  if (n === 1) return t('members.last.yesterday', {}, 'Yesterday')
  return t('members.last.days', { n }, '{n} days ago')
}
// SLIPPING NOW row meta: "Last visit 11 days ago · Coach Mike R."
// No coach: the last-visit words alone ("Last visit 5 days ago"), not "· Coach —".
export function slippingMeta(m) {
  const coach = m.coachName
  const n = m.daysSinceLastVisit
  if (!coach) return lastVisitLong(n)
  if (n == null) return t('today.slipping.rowNever', { coach }, 'Never visited · Coach {coach}')
  if (n === 0) return t('today.slipping.rowToday', { coach }, 'Last visit today · Coach {coach}')
  if (n === 1) return t('today.slipping.rowYesterday', { coach }, 'Last visit yesterday · Coach {coach}')
  return t('today.slipping.row', { n, coach })
}
export const paceLong = (p) => (p == null ? t('common.none') : t('member.pace', { x: p.toFixed(1) }))
export const weekCell = (m) => t('members.weekCell', { n: (m.week ?? 0) + 1 }, '{n} / 13')
export const countText = (n) => (n === 1 ? t('members.count.one', {}, '1 member') : t('members.count', { n }))

// Status filter chips: ALL + the four statuses. aria-pressed toggle buttons.
export function StatusChips({ value, onChange }) {
  return (
    <div className="core-chips" role="group" aria-label={t('board.filter.status')}>
      <span className="field-label">{t('board.filter.status')}</span>
      {['all', ...STATUSES].map((s) => (
        <button key={s} type="button" className={`core-chip tag-${s}`} aria-pressed={value === s} onClick={() => onChange(s)}>
          {s === 'all' ? t('board.filter.all') : statusLabel(s)}
        </button>
      ))}
    </div>
  )
}

// Board legend from COPY (board.legend.*), drawn with the board's own cell classes, plus the status note.
export function CoreLegend() {
  const items = [['cell-on', 'board.legend.3'], ['cell-low', 'board.legend.12'], ['cell-none', 'board.legend.0'],
    ['cell-now', 'board.legend.now'], ['cell-future', 'board.legend.future']]
  return (
    <div className="core-legend">
      <ul className="legend label label-sm">
        {items.map(([c, id]) => <li key={id}><i className={`cell ${c}`} aria-hidden="true" />{t(id)}</li>)}
        <li><i className="cell sw-flag" aria-hidden="true" />{statusLabel('slipping')}</li>
      </ul>
      <p className="meta">{t('status.note')}</p>
    </div>
  )
}

export function Loading() {
  return <p className="meta" role="status">{t('common.loading', {}, 'Loading')}</p>
}
export function ErrorLine({ error }) {
  return error ? <p className="form-error" role="alert">{error.message}</p> : null
}
