import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReports } from '../reports.mjs';
import { buildNorthside } from '../../seed/northside.mjs';

const TZ = 'America/Chicago';
// Local noon-ish UTC instant for a local date (same calendar day in Chicago in all fixtures).
const at = (ymd) => `${ymd}T17:00:00Z`;
const run = (o) => buildReports({ timezone: TZ, members: [], checkins: [], nudges: [], ...o });

test('empty gym: 4 cohorts, 13 weeks, everything null', () => {
  const r = run({ today: '2026-11-06' });
  assert.deepEqual(r.cohorts.map((c) => c.month), ['2026-08', '2026-09', '2026-10', '2026-11']);
  for (const c of r.cohorts) assert.deepEqual([c.joined, c.day30, c.day60, c.day90], [0, null, null, null]);
  assert.equal(r.visitsByWeek.length, 13);
  assert.deepEqual(r.visitsByWeek[0], { week: 1, stillComing: null, slipped: null });
  assert.deepEqual(r.nudges, { sent: 0, cameBack: 0, rate: null });
});

test('month list crosses a year boundary', () => {
  const r = run({ today: '2027-02-10' });
  assert.deepEqual(r.cohorts.map((c) => c.month), ['2026-11', '2026-12', '2027-01', '2027-02']);
});

const cohortFixture = () => {
  const members = [
    { id: 'm1', joinedOn: '2026-08-01' }, // 97 days
    { id: 'm2', joinedOn: '2026-08-20' }, // 78 days
    { id: 'm3', joinedOn: '2026-09-10' }, // 57 days
    { id: 'm4', joinedOn: '2026-10-30' }, // 7 days
    { id: 'm5', joinedOn: '2026-07-31' }, // outside the 4 months
  ];
  const checkins = [
    { memberId: 'm1', at: at('2026-08-26') }, // day 25: inside the day-30 window 23..29
    { memberId: 'm1', at: at('2026-09-23') }, // day 53: in 60's window 53..59
    { memberId: 'm2', at: at('2026-09-11') }, // day 22: just before the day-30 window
    { memberId: 'm2', at: at('2026-09-19') }, // day 30: just after the day-30 window
    { memberId: 'm2', at: at('2026-10-14') }, // day 55 (twice, same day)
    { memberId: 'm2', at: '2026-10-14T23:00:00Z' },
    { memberId: 'm3', at: at('2026-10-03') }, // day 23: first day of the window
    { memberId: 'm5', at: at('2026-08-30') },
  ];
  return { members, checkins };
};

test('cohorts: joined, day30/60/90 percentages and nulls', () => {
  const r = run({ today: '2026-11-06', ...cohortFixture() });
  assert.deepEqual(r.cohorts, [
    { month: '2026-08', joined: 2, day30: 50, day60: 100, day90: 0 }, // day90: only m1 reached it, no visit in 83..89
    { month: '2026-09', joined: 1, day30: 100, day60: null, day90: null },
    { month: '2026-10', joined: 1, day30: null, day60: null, day90: null },
    { month: '2026-11', joined: 0, day30: null, day60: null, day90: null },
  ]);
});

test('cohorts: percentage is rounded to an integer', () => {
  const members = [1, 2, 3].map((i) => ({ id: `r${i}`, joinedOn: '2026-10-01' })); // 36 days
  const checkins = [{ memberId: 'r1', at: at('2026-10-27') }]; // day 26
  const r = run({ today: '2026-11-06', members, checkins });
  assert.equal(r.cohorts[2].day30, 33);
});

test('cohorts: dates use gym-local time across the 2026-11-01 DST change in America/Chicago', () => {
  const members = [
    { id: 'a', joinedOn: '2026-11-01' }, // 34 days at 2026-12-05
    { id: 'b', joinedOn: '2026-11-01' },
    { id: 'c', joinedOn: '2026-10-31' },
    { id: 'd', joinedOn: '2026-12-01' },
  ];
  const checkins = [
    // 2026-12-01T05:30Z = Nov 30 23:30 CST = day 29 local (a hit); in UTC it would be day 30 (a miss)
    { memberId: 'a', at: '2026-12-01T05:30:00Z' },
    // 2026-12-02T05:30Z = Dec 1 23:30 CST = day 30 local (a miss)
    { memberId: 'b', at: '2026-12-02T05:30:00Z' },
    // 2026-11-01T04:30Z = Oct 31 23:30 CDT: day 0 of c, so no day-30 visit
    { memberId: 'c', at: '2026-11-01T04:30:00Z' },
  ];
  const r = run({ today: '2026-12-05', members, checkins });
  assert.deepEqual(r.cohorts.map((c) => c.month), ['2026-09', '2026-10', '2026-11', '2026-12']);
  assert.deepEqual(r.cohorts[1], { month: '2026-10', joined: 1, day30: 0, day60: null, day90: null });
  assert.deepEqual(r.cohorts[2], { month: '2026-11', joined: 2, day30: 50, day60: null, day90: null });
  assert.deepEqual(r.cohorts[3], { month: '2026-12', joined: 1, day30: null, day60: null, day90: null });
});

test('visitsByWeek: 23:30 CDT Oct 31 and 00:30 CDT Nov 1 are different local days', () => {
  const members = [{ id: 'z', joinedOn: '2026-10-31' }];
  const checkins = [
    { memberId: 'z', at: '2026-11-01T04:30:00Z' }, // Oct 31 23:30 CDT, day 0
    { memberId: 'z', at: '2026-11-01T05:30:00Z' }, // Nov 1 00:30 CDT, day 1 (same UTC day)
  ];
  const r = run({ today: '2026-11-20', members, checkins });
  assert.deepEqual(r.visitsByWeek[0], { week: 1, stillComing: null, slipped: 2 });
});

test('nudges: a nudge sent after now is ignored', () => {
  const r = run({ today: '2026-11-06', now: '2026-11-06T12:00:00Z', nudges: [{ memberId: 'a', sentAt: '2026-11-06T13:00:00Z' }] });
  assert.deepEqual(r.nudges, { sent: 0, cameBack: 0, rate: null });
});

const weekFixture = () => {
  const members = [
    { id: 'w1', joinedOn: '2026-10-01' }, // 36 days
    { id: 'w2', joinedOn: '2026-10-01' }, // 36 days
    { id: 'w3', joinedOn: '2026-10-20' }, // 17 days
    { id: 'w13', joinedOn: '2026-07-01' }, // 128 days, older than 90
    { id: 'w14', joinedOn: '2026-08-08' }, // exactly 90 days: week 13 just finished
    { id: 'w15', joinedOn: '2026-08-09' }, // 89 days: week 13 not finished
  ];
  const v = (id, ...days) => days.map((d) => ({ memberId: id, at: at(d) }));
  const checkins = [
    ...v('w1', '2026-10-01', '2026-10-01', '2026-10-03', '2026-10-09', '2026-10-30'), // day 0 twice, 2, 8, 29
    ...v('w2', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06'), // days 1,3,4,5 (last visit 31 days ago)
    ...v('w3', '2026-10-21', '2026-11-02'), // days 1, 13
    ...v('w13', '2026-09-23', '2026-09-28', '2026-09-29'), // days 84, 89, 90 (day 90 is outside week 13)
    ...v('w14', '2026-11-05'), // day 89
  ];
  return { members, checkins };
};

test('visitsByWeek: groups, finished weeks, duplicates, week 13', () => {
  const r = run({ today: '2026-11-06', ...weekFixture() });
  const w = r.visitsByWeek;
  assert.equal(w.length, 13);
  assert.deepEqual(w.map((x) => x.week), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.deepEqual(w[0], { week: 1, stillComing: 1.0, slipped: 1.3 }); // still: 2,1,0 / slipped: 4,0,0
  assert.deepEqual(w[1], { week: 2, stillComing: 0.7, slipped: 0 });
  assert.deepEqual(w[2], { week: 3, stillComing: 0, slipped: 0 }); // w3 not yet finished week 3
  assert.deepEqual(w[3], { week: 4, stillComing: 0, slipped: 0 });
  assert.deepEqual(w[4], { week: 5, stillComing: 0.5, slipped: 0 }); // w1 finished week 5 (35 <= 36), 1 visit
  assert.deepEqual(w[5], { week: 6, stillComing: 0, slipped: 0 }); // w1 not finished week 6
  assert.deepEqual(w[11], { week: 12, stillComing: 0, slipped: 0 }); // w15 (89 days) finished week 12
  assert.deepEqual(w[12], { week: 13, stillComing: 1, slipped: 2 }); // w14 / w13; w15 not finished; day 90 not counted
});

test('visitsByWeek: a group with nobody in it is null; stillComing boundary is 13 days', () => {
  const members = [{ id: 'p', joinedOn: '2026-09-01' }, { id: 'q', joinedOn: '2026-09-01' }];
  const checkins = [
    { memberId: 'p', at: at('2026-09-02') },
    { memberId: 'p', at: at('2026-10-24') }, // 13 days before today: still coming
    { memberId: 'q', at: at('2026-09-03') },
    { memberId: 'q', at: at('2026-10-23') }, // 14 days before today: slipped
  ];
  const r = run({ today: '2026-11-06', members, checkins });
  assert.deepEqual(r.visitsByWeek[0], { week: 1, stillComing: 1, slipped: 1 });
  assert.deepEqual(r.visitsByWeek[7], { week: 8, stillComing: 1, slipped: 1 }); // days 53 and 52 fall in week 8 (days 49..55)
  const only = run({ today: '2026-11-06', members: [members[0]], checkins: [checkins[1]] });
  assert.equal(only.visitsByWeek[0].slipped, null);
  assert.equal(only.visitsByWeek[0].stillComing, 0);
});

test('nudges: exactly 7 days counts, 7 days + 1 minute does not, strictly after, 90-day window', () => {
  const nudges = [
    { memberId: 'n1', sentAt: '2026-10-10T15:00:00Z' }, // visit exactly 7 days later: counts
    { memberId: 'n2', sentAt: '2026-10-10T15:00:00Z' }, // visit 7 days + 1 minute: does not
    { memberId: 'n3', sentAt: '2026-10-12T15:00:00Z' }, // visit at the same instant and before: does not
    { memberId: 'n4', sentAt: '2026-10-12T15:00:00Z' }, // visit 1 minute later: counts
    { memberId: 'n5', sentAt: '2026-08-09T15:00:00Z' }, // 89 days ago: in the window, no visit
    { memberId: 'n6', sentAt: '2026-08-08T15:00:00Z' }, // 90 days ago: outside, even though a visit followed
  ];
  const checkins = [
    { memberId: 'n1', at: '2026-10-17T15:00:00Z' },
    { memberId: 'n2', at: '2026-10-17T15:01:00Z' },
    { memberId: 'n3', at: '2026-10-12T15:00:00Z' },
    { memberId: 'n3', at: '2026-10-12T14:00:00Z' },
    { memberId: 'n4', at: '2026-10-12T15:01:00Z' },
    { memberId: 'n4', at: '2026-10-13T15:01:00Z' }, // second visit does not double count
    { memberId: 'n6', at: '2026-08-09T15:00:00Z' },
  ];
  const r = run({ today: '2026-11-06', now: '2026-11-06T18:00:00Z', nudges, checkins });
  assert.deepEqual(r.nudges, { sent: 5, cameBack: 2, rate: 40 });
});

test('smoke: Northside demo gym', () => {
  const today = '2026-11-06';
  const g = buildNorthside({ today, timezone: TZ });
  const r = buildReports({
    today,
    timezone: TZ,
    members: g.members.map((m) => ({ id: m.key, joinedOn: m.joinedOn })),
    checkins: g.checkins.map((c) => ({ memberId: c.memberKey, at: c.at })),
    nudges: g.nudges.map((n) => ({ memberId: n.memberKey, sentAt: n.sentAt })),
  });
  assert.equal(r.cohorts.length, 4);
  assert.equal(r.cohorts[3].month, '2026-11');
  assert.equal(r.visitsByWeek.length, 13);
  for (const w of r.visitsByWeek.slice(3, 9)) {
    if (w.stillComing !== null && w.slipped !== null) assert.ok(w.stillComing > w.slipped, `week ${w.week}`);
  }
  assert.ok(r.nudges.cameBack >= 5, `cameBack ${r.nudges.cameBack}`);
  assert.ok(r.nudges.rate >= 0 && r.nudges.rate <= 100);
});

test('cohorts: day N window is N-7..N-1 and requires having reached day N', () => {
  const members = [{ id: 'e1', joinedOn: '2026-10-07' }, { id: 'e2', joinedOn: '2026-10-07' }]; // 30 days at 2026-11-06
  const checkins = [
    { memberId: 'e1', at: at('2026-10-30') }, // day 23: hit
    { memberId: 'e2', at: at('2026-11-06') }, // day 30: outside
  ];
  assert.equal(run({ today: '2026-11-06', members, checkins }).cohorts[2].day30, 50);
  assert.equal(run({ today: '2026-11-05', members, checkins: [checkins[0]] }).cohorts[2].day30, null); // day 29: not reached
});
