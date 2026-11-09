// Regenerates members.csv and checkins.csv for the day they are imported: node make-samples.mjs [YYYY-MM-DD]
// Defaults to today's date at UTC-12, the earliest date anywhere, so it is today or earlier in every time zone.
// The last check-ins are two days before that date: a full day with none, then today, wherever the gym is
// (the import refuses check-ins in the future). Output is deterministic for a given date.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const earliestToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Etc/GMT+12' }).format(new Date());
const ref = process.argv[2] ?? earliestToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(ref) || isNaN(Date.parse(ref))) {
  console.error('Usage: node make-samples.mjs [YYYY-MM-DD]');
  process.exit(1);
}
const refMs = Date.parse(ref + 'T00:00:00Z') - 86400000; // the day before `ref`: day 0 below, never a check-in day
const dayStr = (daysAgo) => new Date(refMs - daysAgo * 86400000).toISOString().slice(0, 10);
const mdy = (iso) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
const q = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// pattern: steady = ~3-4 visits/week all the way; fading = visits taper off; late = started recently
const people = [
  ['Maria', 'Alvarez', 'maria.alvarez@example.test', 'mike', 54, 'steady'],
  ['Devon', 'Brooks', 'devon.brooks@example.test', 'priya', 49, 'fading'],
  ['Ethan', 'Okafor, Jr.', 'ethan.okafor@example.test', 'jordan', 45, 'steady'],
  ['Sofia', 'Nguyen', 'sofia.nguyen@example.test', 'mike', 41, 'fading'],
  ['Marcus', 'Reed', 'marcus.reed@example.test', 'priya', 37, 'steady'],
  ['Hannah', 'Kowalski', 'hannah.kowalski@example.test', 'jordan', 33, 'fading'],
  ['Tyrone', 'Washington', 'tyrone.w@example.test', 'mike', 29, 'steady'],
  ['Priscilla', 'Dominguez', 'pri.dominguez@example.test', 'priya', 24, 'steady'],
  ['Caleb', 'Hoffman', 'caleb.hoffman@example.test', 'jordan', 19, 'fading'],
  ['Aisha', 'Rahman', 'aisha.rahman@example.test', 'mike', 14, 'steady'],
  ['Jake', 'Sullivan', 'jake.sullivan@example.test', 'priya', 9, 'fading'],
  ['Lena', 'Fischer', 'lena.fischer@example.test', 'jordan', 5, 'steady'],
];

let seed = 20261106;
const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };

const members = [['Member ID', 'First Name', 'Last Name', 'Mobile', 'Email', 'Member Since', 'Coach Email']];
const checkins = [['Member ID', 'Check-in Time']];
people.forEach(([first, last, email, coach, joinAgo, pattern], i) => {
  const id = `M-${1001 + i}`;
  const join = dayStr(joinAgo);
  members.push([id, first, last, `+1 773-555-01${String(10 + i).padStart(2, '0')}`, email, mdy(join), `${coach}@northside.test`]);
  const first_day = Math.min(joinAgo, 28);
  for (let ago = first_day; ago >= 1; ago--) {
    const t = first_day === 0 ? 1 : (first_day - ago) / first_day; // 0 -> 1 across the window
    const p = pattern === 'steady' ? 0.55 : Math.max(0.05, 0.7 - 0.75 * t);
    if (rand() > p) continue;
    const date = dayStr(ago);
    const hour = [6, 7, 12, 17, 18, 19][Math.floor(rand() * 6)];
    const min = Math.floor(rand() * 4) * 15;
    checkins.push([id, `${date} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`]);
  }
});
const toCsv = (rows) => rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
writeFileSync(join(dir, 'members.csv'), toCsv(members));
writeFileSync(join(dir, 'checkins.csv'), toCsv(checkins));
const last = checkins.slice(1).map((r) => r[1].slice(0, 10)).sort().at(-1);
console.log(`Wrote ${members.length - 1} members and ${checkins.length - 1} check-ins for ${ref} (last check-in ${last})`);
