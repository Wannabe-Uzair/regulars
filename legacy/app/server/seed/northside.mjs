// Deterministic Northside Strength demo data. Pure: no database, no I/O.
import { addDays, diffDays, memberMetrics, zonedToUtcISO } from './rules.mjs';

export const DEMO_PASSWORD = 'northside-demo-2026';

const TEMPLATES = [
  { name: 'We missed you', body: "Hey {first}, we missed you this week. Want me to save you a spot in Thursday's 6 pm class? - Coach {coach}", sort: 0 },
  { name: 'First weeks', body: "Hi {first}, it's {coach} from {gym}. How are your first few weeks going? Tell me if I can help with anything.", sort: 1 },
  { name: 'One visit', body: "Hi {first}, it's been {days} days since we saw you. One visit this week is a good restart. Want me to save you a spot? - {coach}", sort: 2 },
];

const USERS = [
  { key: 'mike', name: 'Mike R.', email: 'mike@northside.test', role: 'owner' },
  { key: 'priya', name: 'Priya S.', email: 'priya@northside.test', role: 'coach' },
  { key: 'jordan', name: 'Jordan T.', email: 'jordan@northside.test', role: 'coach' },
];
const COACH_FIRST = { mike: 'Mike', priya: 'Priya', jordan: 'Jordan' };

const FIRST_NAMES = ['Aaliyah', 'Aiden', 'Alejandro', 'Amara', 'Andre', 'Angela', 'Ben', 'Bianca', 'Brandon', 'Camila',
  'Carlos', 'Dana', 'Darius', 'Elena', 'Eli', 'Emma', 'Fatima', 'Gabriel', 'Grace', 'Hector', 'Isaac', 'Ivy', 'Jada',
  'Jamal', 'Kayla', 'Kevin', 'Lena', 'Liam', 'Lucia', 'Marcus', 'Mei', 'Nadia', 'Noah', 'Olivia', 'Omar', 'Paige',
  'Quinn', 'Rafael', 'Rosa', 'Ryan', 'Sofia', 'Tamika', 'Theo', 'Tyler', 'Uma', 'Victor', 'Wes', 'Xavier', 'Yara',
  'Zoe', 'Brianna', 'Diego', 'Erin', 'Felix', 'Gina', 'Hugo', 'Imani', 'Jake', 'Keisha', 'Luke', 'Mia', 'Nate',
  'Priscilla', 'Reggie', 'Tessa', 'Vince', 'Whitney', 'Anika', 'Caleb', 'Dominic', 'Esther', 'Hannah', 'Ian', 'Jasmine',
  'Kyle', 'Leah', 'Miguel', 'Nora', 'Owen', 'Renee', 'Sean', 'Tara', 'Wendy', 'Yusuf', 'Colleen', 'Dwayne', 'Farah'];
const INITIALS = 'ABCDEFGHJKLMNOPRSTVWYZ'.split('');

// The expo kit's six sample members: finished-week visits, then visits so far in the current week.
const KIT = [
  { first: 'Maya', last: 'R.', weeks: [3, 4, 3, 3, 4, 3, 3, 4, 3], cur: 2 },
  { first: 'Jo', last: 'W.', weeks: [3, 3, 2, 3, 3, 4, 3, 3, 3, 2, 3, 3], cur: 1 },
  { first: 'Dev', last: 'P.', weeks: [2, 3, 3, 4, 3, 3], cur: 2 },
  { first: 'Chris', last: 'L.', weeks: [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2], cur: 1 },
  { first: 'Hana', last: 'L.', weeks: [3, 2, 2, 1, 1, 0], cur: 0, coach: 'mike' },
  { first: 'Sam', last: 'O.', weeks: [2, 1, 0], cur: 0, coach: 'mike' },
];
const KIT_R = 3; // days into the current week, so 4 days are available for the partial week

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildNorthside({ today, timezone = 'America/Chicago' }) {
  const rnd = mulberry32(0x4e53_2026);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  // ---- member specs: each yields { dsj, dayList(): sorted day indices } ----
  // Visit days of week w: n distinct days in [7w, min(7w+6, dsj)], week 0 always includes day 0.
  const weekDays = (w, n, dsj, from = 7 * w) => {
    const lo = Math.max(from, 7 * w), hi = Math.min(7 * w + 6, dsj);
    const avail = [];
    for (let d = lo; d <= hi; d++) avail.push(d);
    n = Math.min(n, avail.length);
    if (n <= 0) return [];
    const out = [];
    if (w === 0 && avail[0] === 0) out.push(0);
    for (const d of shuffle(avail)) { if (out.length >= n) break; if (!out.includes(d)) out.push(d); }
    return out;
  };
  const fromCounts = (counts, dsj) => {
    const days = [];
    counts.forEach((n, w) => days.push(...weekDays(w, n, dsj)));
    return days;
  };

  const specs = [];
  const add = (s) => specs.push(s);

  for (const k of KIT) {
    const dsj = 7 * k.weeks.length + KIT_R;
    add({ type: 'kit', kit: k, dsj, forcedCoach: k.coach, days: fromCounts([...k.weeks, k.cur], dsj) });
  }
  // steady x18
  for (let i = 0; i < 18; i++) {
    const dsj = int(14, 89), F = Math.floor(dsj / 7);
    const counts = [];
    for (let w = 0; w < F; w++) counts.push(pick([3, 3, 3, 4, 4, 3, 2]));
    counts[F - 1] = pick([3, 4]);
    counts.push(int(1, 2));
    add({ type: 'steady', dsj, days: fromCounts(counts, dsj) });
  }
  // drifting x10: 4 deep (slipping), 6 mild (below)
  for (let i = 0; i < 10; i++) {
    const deep = i < 4;
    const F = deep ? int(5, 9) : int(3, 8), end = deep ? 1 : 2;
    const dsj = Math.min(89, 7 * F + int(0, 6));
    const counts = [];
    for (let w = 0; w < F; w++) counts.push(3 - Math.round((w * (3 - end)) / (F - 1)));
    counts[F - 1] = end; counts[F - 2] = end;
    counts.push(int(0, 1));
    add({ type: deep ? 'drifting-slipping' : 'drifting', dsj, slippingNonKit: deep, days: fromCounts(counts, dsj) });
  }
  // stopped x10: 6 slipping (F = k+2.. ), 4 just stopped (F = k+1, below)
  for (let i = 0; i < 10; i++) {
    const slip = i < 6, k = int(2, 4);
    const F = slip ? Math.min(12, k + int(2, 7)) : k + 1;
    const dsj = Math.min(89, 7 * F + int(0, 6));
    const counts = [];
    for (let w = 0; w < k; w++) counts.push(pick([3, 3, 4]));
    for (let w = k; w < F; w++) counts.push(0);
    counts.push(0);
    add({ type: slip ? 'stopped-slipping' : 'stopped', dsj, slippingNonKit: slip, days: fromCounts(counts, dsj) });
  }
  // brand new x8
  for (let i = 0; i < 8; i++) {
    const dsj = i === 0 ? 0 : int(1, 13);
    add({ type: 'new', dsj, days: fromCounts([int(2, 3), int(1, 2)], dsj) });
  }
  // came back after a nudge x8
  for (let i = 0; i < 8; i++) {
    const s = int(2, 3), N = 7 * (s + 2) + 1, dsj = N + int(5, 30);
    const counts = [];
    for (let w = 0; w < s; w++) counts.push(3);
    const days = fromCounts(counts, dsj);
    const resume = N + 1 + int(0, 2);
    days.push(resume);
    const w2 = s + 2;
    const rest = weekDays(w2, 1, dsj, resume + 1);
    days.push(...rest);
    for (let w = w2 + 1; w <= Math.floor(dsj / 7); w++) days.push(...weekDays(w, w === Math.floor(dsj / 7) ? int(1, 2) : int(2, 3), dsj));
    add({ type: 'cameback', dsj, nudgeDay: N, days: [...new Set(days)].sort((a, b) => a - b) });
  }
  // older (joined 90-150 days ago) x25, for reports
  for (let i = 0; i < 25; i++) {
    const dsj = int(90, 150), rate = int(2, 4);
    const churnAt = rnd() < 0.35 ? int(4, 16) : null;
    const counts = [];
    for (let w = 0; w <= Math.floor(dsj / 7); w++) {
      counts.push(churnAt !== null && w >= churnAt ? 0 : Math.max(1, Math.min(5, rate + int(-1, 1))));
    }
    add({ type: 'older', dsj, days: fromCounts(counts, dsj) });
  }

  // ---- identities ----
  const used = new Set(KIT.map((k) => `${k.first}|${k.last}`));
  const kitFirsts = new Set(KIT.map((k) => k.first));
  const names = [];
  for (const sp of specs) {
    if (sp.kit) { names.push([sp.kit.first, sp.kit.last]); continue; }
    let f, l;
    do { f = pick(FIRST_NAMES); l = pick(INITIALS) + '.'; } while (used.has(`${f}|${l}`) || kitFirsts.has(f));
    used.add(`${f}|${l}`);
    names.push([f, l]);
  }

  // Shuffle presentation order, then assign coaches: slipping non-kit cycle priya/jordan/mike; rest round-robin.
  const order = shuffle(specs.map((_, i) => i));
  const phones = shuffle(Array.from({ length: 100 }, (_, i) => `+1312555${String(100 + i).padStart(4, '0')}`));
  const coachKeys = ['mike', 'priya', 'jordan'];
  let slipC = 1, rr = 0;
  const members = [];
  const dayIdxByKey = new Map();
  order.forEach((si, idx) => {
    const sp = specs[si], [first, last] = names[si];
    let coachKey;
    if (sp.forcedCoach) coachKey = sp.forcedCoach;
    else if (sp.slippingNonKit) coachKey = coachKeys[slipC++ % 3];
    else coachKey = coachKeys[rr++ % 3];
    const key = `m${String(idx + 1).padStart(2, '0')}`;
    members.push({
      key, firstName: first, lastName: last, phone: phones[idx],
      email: rnd() < 0.7 ? `${first.toLowerCase()}.${last[0].toLowerCase()}@example.com` : '',
      joinedOn: addDays(today, -sp.dsj), coachKey, externalId: `NS-${1001 + idx}`, _type: sp.type,
    });
    dayIdxByKey.set(key, sp.days);
  });

  // ---- check-ins ----
  const checkins = [];
  const datesByKey = new Map();
  for (const m of members) {
    const slot = int(0, 2);
    const dates = [];
    for (const d of dayIdxByKey.get(m.key)) {
      const date = addDays(m.joinedOn, d);
      const s = date === today ? 0 : rnd() < 0.75 ? slot : int(0, 2);
      const [h, min] = s === 0 ? [int(6, 8), int(0, 59)] : s === 1 ? [12, int(0, 59)] : [int(17, 19), int(0, 59)];
      checkins.push({ memberKey: m.key, at: zonedToUtcISO(date, h, min, timezone) });
      dates.push(date);
    }
    datesByKey.set(m.key, dates);
  }

  // ---- nudges ----
  const statusAt = (m, D) => memberMetrics({ joinedOn: m.joinedOn, checkinDates: datesByKey.get(m.key).filter((x) => x < D), today: D });
  const nudges = [];
  const mkNudge = (m, D, preferred) => {
    const st = statusAt(m, D);
    const ti = preferred ?? (st.status === 'slipping' ? pick([0, 2]) : pick([0, 1]));
    const days = st.daysSinceLastVisit ?? diffDays(D, m.joinedOn);
    const body = TEMPLATES[ti].body
      .replaceAll('{first}', m.firstName).replaceAll('{coach}', COACH_FIRST[m.coachKey])
      .replaceAll('{gym}', 'Northside Strength').replaceAll('{days}', String(days));
    nudges.push({ memberKey: m.key, userKey: m.coachKey, templateIndex: ti, body, sentAt: zonedToUtcISO(D, int(9, 11), int(0, 59), timezone) });
  };
  const nudged = new Set();
  const specByKey = new Map(order.map((si, idx) => [members[idx].key, specs[si]]));
  for (const m of members) {
    const sp = specByKey.get(m.key);
    if (sp.type === 'cameback') { mkNudge(m, addDays(m.joinedOn, sp.nudgeDay), 2); nudged.add(m.key); }
  }
  for (const mi of shuffle(members.map((_, i) => i))) {
    if (nudges.length >= 20) break;
    const m = members[mi];
    if (nudged.has(m.key) || m._type === 'older' || m._type === 'new') continue;
    const elig = [];
    for (let back = 1; back <= 41; back++) {
      const D = addDays(today, -back);
      if (diffDays(D, m.joinedOn) < 14 || diffDays(D, m.joinedOn) > 89) continue;
      const st = statusAt(m, D).status;
      if (st === 'below' || st === 'slipping') elig.push(D);
    }
    if (!elig.length) continue;
    mkNudge(m, pick(elig));
    nudged.add(m.key);
  }

  checkins.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.memberKey < b.memberKey ? -1 : 1));
  nudges.sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1));
  return {
    gym: { name: 'Northside Strength', slug: 'northside', timezone, isDemo: true, pilotStartedOn: addDays(today, -23) },
    users: USERS.map((u) => ({ ...u })),
    templates: TEMPLATES.map((t) => ({ ...t })),
    members: members.map(({ _type, ...m }) => m),
    checkins,
    nudges,
  };
}
