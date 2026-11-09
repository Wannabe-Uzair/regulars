// The member filter shared by Members and the board (FR-MEM-02): the search, the status chips and the owner's coach
// filter. Pure: the screens read the filter from the URL and pass it in, and a server list may call the same rules.
import { inFirst90, type MemberSummary, type Status } from './metrics.ts'
import { fold, foldDigits } from './text.ts'

/** The status chips, in their order: All, then the statuses as the old chips listed them. */
export const STATUS_FILTERS = ['all', 'slipping', 'new', 'on', 'below'] as const satisfies readonly ('all' | Status)[]
export type StatusFilter = (typeof STATUS_FILTERS)[number]

export const isStatusFilter = (value: unknown): value is StatusFilter =>
  (STATUS_FILTERS as readonly unknown[]).includes(value)

/** The coach filter's choice for members with no coach. */
export const NO_COACH = 'none'

/** A coach's id, or NO_COACH. No coach filter keeps everyone. */
export type CoachFilter = number | typeof NO_COACH

export type MemberFilter = {
  /** Missing or 'all' keeps every status. */
  status?: StatusFilter
  coach?: CoachFilter
  /** The search box's text. Blank keeps everyone. */
  q?: string
}

/** What the search reads. A member may have a single name (FR-GLOBAL-04): the last name is then empty or null. */
export type SearchableMember = Pick<MemberSummary, 'firstName' | 'phone'> & { lastName: string | null }

/**
 * What the filter reads; the caller's own row type comes back. A row without `daysSinceJoin` reads as a member in
 * their first 90 days, as every row on the board is.
 */
export type FilterableMember = SearchableMember &
  Pick<MemberSummary, 'status' | 'coachId'> &
  Partial<Pick<MemberSummary, 'daysSinceJoin'>>

/** Fewer digits than this, once leading zeros are dropped, don't search phones. */
const PHONE_DIGITS = 3

/**
 * The search: case and accents folded on both sides ("jose" finds José), a hit inside "first last"; or, when the query
 * has 3 or more digits once its leading zeros are dropped, a hit inside the phone's digits. So "0300 123" finds
 * +923001234567, "(312) 555" finds +13125550142 and "00 44 7911" finds +447911123456. A blank query finds everyone.
 */
export function matchesSearch(member: SearchableMember, query: string): boolean {
  const q = fold(query.trim().replace(/\s+/g, ' '))
  if (q === '') return true
  const name = fold([member.firstName, member.lastName ?? ''].join(' ').trim())
  if (name.includes(q)) return true
  const digits = foldDigits(query)
  return digits.length >= PHONE_DIGITS && member.phone !== null && member.phone.replace(/\D/g, '').includes(digits)
}

/**
 * Whether a member passes the status chips. A status chip matches members in their first 90 days only: from day 90 a
 * member shows "Past 90 days" instead of a status (answers.md, 7 Nov), so All is the only chip that keeps them.
 */
const matchesStatus = (member: Pick<FilterableMember, 'status' | 'daysSinceJoin'>, status: StatusFilter): boolean =>
  status === 'all' ||
  (member.status === status && (member.daysSinceJoin === undefined || inFirst90(member.daysSinceJoin)))

/** Whether a member passes the coach filter. */
const matchesCoach = (member: Pick<MemberSummary, 'coachId'>, coach: CoachFilter | undefined): boolean =>
  coach === undefined || (coach === NO_COACH ? member.coachId === null : member.coachId === coach)

/** The members that pass the status, the coach and the search together, in the list's own order. */
export function filterMembers<T extends FilterableMember>(list: readonly T[], filter: MemberFilter): T[] {
  const { status = 'all', coach, q = '' } = filter
  return list.filter(
    (m) => matchesStatus(m, status) && matchesCoach(m, coach) && matchesSearch(m, q),
  )
}

/** Whether any of the three narrows the list (a blank search doesn't). */
export const isFiltered = ({ status = 'all', coach, q = '' }: MemberFilter): boolean =>
  status !== 'all' || coach !== undefined || q.trim() !== ''

export type CoachOption = { id: number; name: string }

export type CoachOptions = {
  /** Each coach on the list once, sorted by name in the gym's locale. */
  coaches: CoachOption[]
  /** Some member on the list has no coach, so "No coach" is a choice. */
  noCoach: boolean
}

/**
 * The coach filter's choices, from the members on screen (FR-MEM-02): each coach once, by name in `locale`, then by
 * id. A member whose coach has no name to show (not in the gym's staff list) gives no choice.
 */
export function coachOptions(
  members: readonly Pick<MemberSummary, 'coachId' | 'coachName'>[],
  locale: string,
): CoachOptions {
  const byId = new Map<number, string>()
  let noCoach = false
  for (const m of members) {
    if (m.coachId === null) noCoach = true
    else if (m.coachName !== null) byId.set(m.coachId, m.coachName)
  }
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  const coaches = [...byId].map(([id, name]) => ({ id, name }))
  coaches.sort((a, b) => collator.compare(a.name, b.name) || a.id - b.id)
  return { coaches, noCoach }
}

/**
 * A coach filter that names a choice the list offers, else none. A link or Back can name a coach no member on screen
 * has any more; it then reads as All coaches, so the filter shown is the filter applied.
 */
export function offeredCoach(coach: CoachFilter | undefined, options: CoachOptions): CoachFilter | undefined {
  if (coach === NO_COACH) return options.noCoach ? coach : undefined
  return options.coaches.some((c) => c.id === coach) ? coach : undefined
}
