import { buildNorthside } from '../seed/northside.mjs';
import { buildReports } from './reports.mjs';

export function northsideReport(today) {
  const timezone = 'America/Chicago';
  const g = buildNorthside({ today, timezone });
  const members = g.members.map((m) => ({ id: m.key, joinedOn: m.joinedOn }));
  const checkins = g.checkins.map((c) => ({ memberId: c.memberKey, at: c.at }));
  const nudges = g.nudges.map((n) => ({ memberId: n.memberKey, sentAt: n.sentAt }));
  return buildReports({ today, timezone, members, checkins, nudges });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(northsideReport(process.argv[2] || '2026-11-06'), null, 2));
}
