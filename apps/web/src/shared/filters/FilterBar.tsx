// The one filter bar Members and the board share (FR-MEM-02): the search box, the status chips and the owner's coach
// filter. Its state comes from useMemberFilters, so it lives in the URL.
import { t } from '@tenure/copy'
import { type CoachFilter, NO_COACH, STATUS_FILTERS, type StatusFilter } from '@tenure/domain'
import { ChoiceGroup, type ChoiceOption, Field, Input, Select } from '@tenure/ui'
import styles from './FilterBar.module.css'
import type { MemberFilterBar } from './useMemberFilters.ts'

/** All, then each status with its dot: the words carry the status, the dot repeats it. */
const statusOptions: ChoiceOption<StatusFilter>[] = STATUS_FILTERS.map((status) =>
  status === 'all'
    ? { value: status, label: t('board.filter.all') }
    : { value: status, label: t(`status.${status}`), dot: status },
)

const coachValue = (coach: CoachFilter | undefined) => (coach === undefined ? '' : String(coach))

const readCoachValue = (value: string): CoachFilter | undefined =>
  value === '' ? undefined : value === NO_COACH ? NO_COACH : Number(value)

export type FilterBarProps = {
  bar: MemberFilterBar
  /** The screen's own words: `board.search` on the board, `members.search` on Members. */
  searchPlaceholder: string
  /**
   * The search on a line of its own from 48rem too, over the chips and the coach filter: for Members, whose placeholder
   * is too long to show whole beside them on a laptop (A5).
   */
  searchOwnLine?: boolean
  className?: string
}

/**
 * The search, the status chips and, for an owner, the coach filter (FR-MEM-02), each named for assistive technology
 * with its label hidden. From 48rem they share one line (except with searchOwnLine, Members': the search takes a line above the chips and the coach filter); below it the search comes first, then the chips on one line
 * that scrolls sideways, then the coach filter.
 */
export function FilterBar({ bar, searchPlaceholder, searchOwnLine = false, className }: FilterBarProps) {
  const { coaches } = bar
  const classes = [styles.bar, searchOwnLine && styles.searchOwnLine, className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <Field label={<span className={styles.hidden}>{t('common.search')}</span>} className={styles.search}>
        <Input
          type="search"
          value={bar.query}
          placeholder={searchPlaceholder}
          autoComplete="off"
          onChange={(event) => bar.setQuery(event.target.value)}
        />
      </Field>
      <ChoiceGroup
        look="chips"
        label={t('board.filter.status')}
        hideLabel
        options={statusOptions}
        value={bar.status}
        onChange={bar.setStatus}
        className={styles.statusLine}
      />
      {coaches && (
        <Field label={<span className={styles.hidden}>{t('board.filter.coach')}</span>} className={styles.coach}>
          <Select value={coachValue(bar.coach)} onChange={(event) => bar.setCoach(readCoachValue(event.target.value))}>
            <option value="">{t('board.filter.allCoaches')}</option>
            {coaches.coaches.map((coach) => (
              <option key={coach.id} value={String(coach.id)}>
                {coach.name}
              </option>
            ))}
            {coaches.noCoach && <option value={NO_COACH}>{t('member.coach.none')}</option>}
          </Select>
        </Field>
      )}
    </div>
  )
}
