import { type MarkSize, WeekMarks } from '@tenure/ui'
import { weekCells, type WeeksMember } from './weeks.ts'

export type WeekRowProps = {
  member: WeeksMember
  /** The check-in that just filled the week in progress, from useFreshCheckins: that mark pops (FR-BOARD-03). */
  fresh?: string
  /** Names the row as a group where nothing around it names the member. */
  label?: string
  size?: MarkSize
  className?: string
}

/**
 * One member's 13 week marks in a row, each labelled, on ui's WeekMarks: for a card or the member page. A board's
 * table puts each mark in its own cell instead, from weekCells, keyed by the cell's key.
 */
export function WeekRow({ member, fresh, label, size, className }: WeekRowProps) {
  // A new check-in gives the row a new key: the fresh mark mounts again and pops; the others have nothing to animate.
  return <WeekMarks key={fresh ?? ''} cells={weekCells(member, fresh)} label={label} size={size} className={className} />
}
