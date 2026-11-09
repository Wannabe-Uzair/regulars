import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNorthside, DEMO_PASSWORD } from '../northside.mjs';
import { analyze, localDate, zonedToUtcISO, diffDays, addDays } from '../rules.mjs';

const TODAYS = ['2026-11-06', '2026-11-02', '2027-03-15'];
const KIT = { 'Maya R.': 'on', 'Jo W.': 'on', 'Dev P.': 'on', 'Chris L.': 'below', 'Hana L.': 'slipping', 'Sam O.': 'slipping' };
const KIT_WEEKS = {
  'Maya R.': [3, 4, 3, 3, 4, 3, 3, 4, 3, 2], 'Jo W.': [3, 3, 2, 3, 3, 4, 3, 3, 3, 2, 3, 3, 1],
  'Dev P.': [2, 3, 3, 4, 3, 3, 2], 'Chris L.': [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2, 1],
  'Hana L.': [3, 2, 2, 1, 1, 0, 0], 'Sam O.': [2, 1, 0, 0],
};
const nm = (m) => `${m.firstName} ${m.lastName}`;

for (const today of TODAYS) {
  test(`rules hold for ${today}`, () => {
    const d = buildNorthside({ today });
    const res = analyze(d, today);
    const all = [...res.values()];
    const win = all.filter((x) => x.inWindow);
    assert.equal(win.length, 60);
    assert.equal(all.filter((x) => x.daysSinceJoin >= 90 && x.daysSinceJoin <= 150).length, 25);
    const slipping = win.filter((x) => x.status === 'slipping');
    assert.ok(slipping.length >= 10 && slipping.length <= 14, `slipping ${slipping.length}`);
    for (const u of d.users) assert.ok(slipping.filter((x) => x.member.coachKey === u.key).length >= 2, u.key);
    for (const [n, st] of Object.entries(KIT)) {
      const x = all.find((r) => nm(r.member) === n);
      assert.equal(x.status, st, n);
      assert.deepEqual(x.weeks, KIT_WEEKS[n], n);
      if (n === 'Hana L.' || n === 'Sam O.') assert.equal(x.member.coachKey, 'mike');
    }
    assert.equal(d.gym.pilotStartedOn, addDays(today, -23));
  });

  test(`check-ins are valid for ${today}`, () => {
    const d = buildNorthside({ today });
    const tz = d.gym.timezone, now = zonedToUtcISO(today, 12, 0, tz);
    const join = new Map(d.members.map((m) => [m.key, m.joinedOn]));
    const seen = new Set();
    for (const c of d.checkins) {
      const ld = localDate(c.at, tz);
      assert.ok(ld >= join.get(c.memberKey), 'before join');
      assert.ok(c.at <= now, 'in the future');
      const k = `${c.memberKey}|${ld}`;
      assert.ok(!seen.has(k), 'two check-ins one day');
      seen.add(k);
      const h = +new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(c.at));
      assert.ok((h >= 6 && h <= 8) || h === 12 || (h >= 17 && h <= 19), `hour ${h}`);
    }
  });

  test(`nudges are valid for ${today}`, () => {
    const d = buildNorthside({ today });
    const tz = d.gym.timezone;
    assert.ok(d.nudges.length >= 18 && d.nudges.length <= 22, `nudges ${d.nudges.length}`);
    const byKey = new Map(d.members.map((m) => [m.key, m]));
    let back = 0;
    for (const n of d.nudges) {
      const m = byKey.get(n.memberKey);
      assert.equal(n.userKey, m.coachKey);
      assert.ok(!/[{}]/.test(n.body), n.body);
      assert.ok(diffDays(today, localDate(n.sentAt, tz)) >= 1 && diffDays(today, localDate(n.sentAt, tz)) <= 42);
      const sentDay = localDate(n.sentAt, tz);
      const res = analyze({ ...d, checkins: d.checkins.filter((c) => localDate(c.at, tz) < sentDay) }, sentDay).get(n.memberKey);
      assert.ok(['below', 'slipping'].includes(res.status), `${nm(m)} was ${res.status}`);
      const end = new Date(new Date(n.sentAt).getTime() + 7 * 86400000).toISOString();
      if (d.checkins.some((c) => c.memberKey === n.memberKey && c.at > n.sentAt && c.at <= end)) back++;
    }
    assert.ok(back >= 5, `came back ${back}`);
  });
}

test('phones unique and in range, emails well formed', () => {
  const d = buildNorthside({ today: '2026-11-06' });
  const phones = d.members.map((m) => m.phone);
  assert.equal(new Set(phones).size, phones.length);
  for (const p of phones) assert.match(p, /^\+13125550(1\d\d)$/);
  for (const m of d.members) assert.ok(m.email === '' || m.email === `${m.firstName.toLowerCase()}.${m.lastName[0].toLowerCase()}@example.com`);
  assert.equal(new Set(d.members.map((m) => m.externalId)).size, d.members.length);
});

test('users, templates, demo password', () => {
  const d = buildNorthside({ today: '2026-11-06' });
  assert.deepEqual(d.users.map((u) => u.email), ['mike@northside.test', 'priya@northside.test', 'jordan@northside.test']);
  assert.equal(d.templates.length, 3);
  assert.ok(DEMO_PASSWORD.length >= 12);
  assert.equal(d.gym.isDemo, true);
});

test('deterministic for the same today', () => {
  assert.deepEqual(buildNorthside({ today: '2026-11-06' }), buildNorthside({ today: '2026-11-06' }));
});
