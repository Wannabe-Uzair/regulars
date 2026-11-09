// Test-only fixture data, ported from legacy/app/server/test/fixtures.mjs. index.ts does not export this file.

export const TODAY = '2026-11-06'
export const TZ = 'America/Chicago'

/** 18:00Z is noon (CST) or 1 pm (CDT) in Chicago: always the same local date. */
export const localNoon = (date: string): string => `${date}T18:00:00.000Z`

export type KitMember = { first: string; last: string; weeks: number[]; daysSinceJoin: number; current: number }

/** The expo kit's sample members: finished weeks' visit counts, days since joining, visits in the current week. */
export const KIT = {
  maya: { first: 'Maya', last: 'Reyes', weeks: [3, 4, 3, 3, 4, 3, 3, 4, 3], daysSinceJoin: 66, current: 2 },
  chris: { first: 'Chris', last: 'Lee', weeks: [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2], daysSinceJoin: 80, current: 1 },
  hana: { first: 'Hana', last: 'Lin', weeks: [3, 2, 2, 1, 1, 0], daysSinceJoin: 45, current: 1 },
  sam: { first: 'Sam', last: 'Ortiz', weeks: [2, 1, 0], daysSinceJoin: 24, current: 1 },
} satisfies Record<string, KitMember>
