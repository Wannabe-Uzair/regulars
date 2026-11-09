import { useEffect, useMemo, useState } from 'react'
import { useApi, useMe } from '../api.js'
import { t } from '../copy.js'
import { Board as BoardGrid, EmptyState, Field, Input, PageTitle, Panel, Select } from '../components'
import { useLiveReload } from '../components/core/useLiveEvents.js'
import { CoreLegend, ErrorLine, Loading, StatusChips } from '../components/core/bits.jsx'
import '../components/core/core.css'

// SPEC metrics boardOrder: slipping first, then by joinedOn, newest first.
const boardOrder = (a, b) => (b.status === 'slipping') - (a.status === 'slipping') || b.joinedOn.localeCompare(a.joinedOn) || a.id - b.id

export function useDebounced(value, ms = 200) {
  const [v, setV] = useState(value)
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id) }, [value, ms])
  return v
}
export function membersPath({ status, coach, q }) {
  const p = new URLSearchParams()
  if (status !== 'all') p.set('status', status)
  if (coach) p.set('coach', coach)
  if (q.trim()) p.set('q', q.trim())
  const s = p.toString()
  return '/members' + (s ? `?${s}` : '')
}

// The coach select for owners (GET /api/coaches is owner only).
export function CoachFilter({ value, onChange }) {
  const coaches = useApi('/coaches')
  const options = [{ value: '', label: t('board.filter.allCoaches') }, ...(coaches.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))]
  return <Field label={t('board.filter.coach')}><Select value={value} onChange={(e) => onChange(e.target.value)} options={options} /></Field>
}

// The full 90-day board (SPEC §7 /board): status chips, coach (owner), search, legend. A row opens the member.
export default function Board() {
  const { role } = useMe()
  const [status, setStatus] = useState('all')
  const [coach, setCoach] = useState('')
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const res = useApi(membersPath({ status, coach, q: dq }))
  const slam = useLiveReload({ data: res.data, reload: res.reload })
  const members = useMemo(() => (res.data ? [...res.data].sort(boardOrder) : null), [res.data])
  const clear = () => { setStatus('all'); setCoach(''); setQ('') }

  return (
    <>
      <PageTitle>{t('board.title')}</PageTitle>
      <div className="core-filters">
        <StatusChips value={status} onChange={setStatus} />
        {role === 'owner' && <CoachFilter value={coach} onChange={setCoach} />}
        <Field label={t('common.search')}>
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('board.search')} />
        </Field>
      </div>
      <Panel>
        <ErrorLine error={res.error} />
        {!members ? <Loading />
          : members.length === 0
            ? <EmptyState title={t('board.empty')} action={{ label: t('board.emptyClear'), onClick: clear }}>{t('board.emptyBody')}</EmptyState>
            : <BoardGrid members={members} slam={slam} />}
        <CoreLegend />
      </Panel>
    </>
  )
}
