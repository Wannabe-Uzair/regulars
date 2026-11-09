// The filter bar's state, kept in the URL (FR-MEM-02): `q` for the search, `status` for the chips and, for owners,
// `coach` (a coach's id, or 'none'). Members and the board share it, so Back returns to the same list. Parameters the
// bar doesn't own (Members' `view`) are kept.
import type { MemberSummary } from '@tenure/contracts'
import {
  type CoachFilter,
  type CoachOptions,
  coachOptions,
  filterMembers,
  type FilterableMember,
  isFiltered,
  isStatusFilter,
  NO_COACH,
  offeredCoach,
  type StatusFilter,
} from '@tenure/domain'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useGymFormat } from '../format/useGymFormat.ts'
import { useSession } from '../session/session.ts'

/** The URL parameters the bar owns. */
export const filterParams = { q: 'q', status: 'status', coach: 'coach' } as const

/** A row the bar can filter: a MemberSummary, or anything with the fields the rules read. */
export type FilterRow = FilterableMember & Pick<MemberSummary, 'coachName'>

/** What the filter bar shows and sets. */
export type MemberFilterBar = {
  /** The search box's text, as typed. */
  query: string
  setQuery: (text: string) => void
  status: StatusFilter
  setStatus: (status: StatusFilter) => void
  /** The coach chosen, or undefined for all coaches. */
  coach: CoachFilter | undefined
  setCoach: (coach: CoachFilter | undefined) => void
  /** The coach filter's choices, from the members given; null for a coach, who sees only their own members. */
  coaches: CoachOptions | null
}

export type MemberFilters<T> = {
  /** The members that pass the bar, in the order given. */
  rows: T[]
  /** Some filter narrows the list: the screen shows the "no match" empty state, with `clear`, rather than its own. */
  filtered: boolean
  /** Clears the search, the status and the coach. */
  clear: () => void
  bar: MemberFilterBar
}

const readStatus = (value: string | null): StatusFilter => (isStatusFilter(value) ? value : 'all')

const readCoach = (value: string | null): CoachFilter | undefined =>
  value === NO_COACH ? NO_COACH : value !== null && /^[1-9]\d*$/.test(value) ? Number(value) : undefined

/**
 * The search box's text. React Router commits a URL change in a transition, after the keystroke that made it, so a box
 * bound to `?q=` straight would lose letters typed quickly. The box keeps its own text, and the URL follows it. `url`
 * is the last `?q=` seen: when it changes to the text's own value that's the box's write arriving; any other value is
 * a change from outside (Back, Forward, a link, clearing), which the box then shows.
 */
type Search = { text: string; url: string }

/** The URL's value for a search: none when it's blank. */
const urlValue = (text: string) => (text.trim() === '' ? '' : text)

/**
 * The filter bar's state and the rows that pass it. `members` is the screen's whole list (its coach choices come from
 * it); undefined while it loads.
 */
export function useMemberFilters<T extends FilterRow>(members: readonly T[] | undefined): MemberFilters<T> {
  const [params, setParams] = useSearchParams()
  const owner = useSession().data?.user.role === 'owner'
  const { locale } = useGymFormat()

  const urlQuery = params.get(filterParams.q) ?? ''
  const [search, setSearch] = useState<Search>({ text: urlQuery, url: urlQuery })
  let current = search
  if (urlQuery !== search.url) {
    current = { text: urlQuery === urlValue(search.text) ? search.text : urlQuery, url: urlQuery }
    setSearch(current)
  }

  const coaches = useMemo(() => (owner ? coachOptions(members ?? [], locale) : null), [owner, members, locale])
  const status = readStatus(params.get(filterParams.status))
  const coach = coaches ? offeredCoach(readCoach(params.get(filterParams.coach)), coaches) : undefined
  const query = current.text
  const rows = useMemo(() => filterMembers(members ?? [], { status, coach, q: query }), [members, status, coach, query])

  /** Writes the bar's parameters, keeping every other one, without a new history entry. */
  const write = (change: (next: URLSearchParams) => void) =>
    setParams(
      (now) => {
        const next = new URLSearchParams(now)
        change(next)
        return next
      },
      { replace: true },
    )
  const set = (next: URLSearchParams, name: string, value: string) =>
    value === '' ? next.delete(name) : next.set(name, value)

  const typeSearch = (text: string) => {
    setSearch((s) => ({ ...s, text }))
    return urlValue(text)
  }

  return {
    rows,
    filtered: isFiltered({ status, coach, q: query }),
    clear: () => {
      typeSearch('')
      write((next) => Object.values(filterParams).forEach((name) => next.delete(name)))
    },
    bar: {
      query,
      setQuery: (text) => {
        const value = typeSearch(text)
        write((next) => set(next, filterParams.q, value))
      },
      status,
      setStatus: (value) => write((next) => set(next, filterParams.status, value === 'all' ? '' : value)),
      coach,
      setCoach: (value) => write((next) => set(next, filterParams.coach, value === undefined ? '' : String(value))),
      coaches,
    },
  }
}
