import { buildNorthside } from './northside.mjs';
import { analyze, kpis } from './rules.mjs';

const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const data = buildNorthside({ today });
const res = analyze(data, today);
const name = (m) => `${m.firstName} ${m.lastName}`;

console.log(`Northside seed for ${today}: ${data.members.length} members, ${data.checkins.length} check-ins, ${data.nudges.length} nudges`);
const win = [...res.values()].filter((x) => x.inWindow);
console.log(`in window: ${win.length}, older: ${res.size - win.length}`);
console.log('\nStatus by coach (first 90 days):');
for (const u of data.users) {
  const c = { on: 0, below: 0, slipping: 0, new: 0 };
  for (const x of win) if (x.member.coachKey === u.key) c[x.status]++;
  console.log(`  ${u.key.padEnd(7)} ${Object.entries(c).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}
console.log('\nKPIs:', JSON.stringify(kpis(res.values(), data.nudges, today, data.gym.timezone)));
console.log('\nKit members:');
for (const n of ['Maya R.', 'Jo W.', 'Dev P.', 'Chris L.', 'Hana L.', 'Sam O.']) {
  const x = [...res.values()].find((r) => name(r.member) === n);
  console.log(`  ${n.padEnd(9)} ${x.status.padEnd(9)} pace=${x.pace} weeks=[${x.weeks.join(',')}] coach=${x.member.coachKey}`);
}
