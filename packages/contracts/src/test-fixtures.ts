// Wire examples shaped like the old app's output, in camelCase.
import type { MemberSummary } from './members.ts'

/** A slipping member, as the old summaryOf sends it. */
export const summary: MemberSummary = {
  id: 12,
  firstName: 'Sam',
  lastName: 'Ortiz',
  name: 'Sam O.',
  phone: '+13125550142',
  coachId: 2,
  coachName: 'Priya S.',
  joinedOn: '2026-09-01',
  daysSinceJoin: 66,
  week: 9,
  weeks: [3, 3, 2, 3, 1, 1, 0, 1, 0, 0],
  pace: 0.3,
  status: 'slipping',
  lastVisitOn: '2026-10-28',
  daysSinceLastVisit: 9,
  lastNudgeAt: '2026-11-02T15:04:00.000Z',
}
