// Reports calculator (SPEC §4, §6). Pure: no I/O. Dates are gym-local via Intl.DateTimeFormat.

const fmtCache = new Map();
function localDate(iso, timezone) {
  let f = fmtCache.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    fmtCache.set(timezone, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function dayNumber(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
const diffDays = (a, b) => dayNumber(a) - dayNumber(b);

function monthsBack(ymd, n) {
  let [y, m] = ymd.split('-').map(Number);
  m -= n;
  while (m < 1) { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

const pct = (num, den) => Math.round((100 * num) / den);
const avg1 = (sum, n) => (n === 0 ? null : Math.round((sum / n) * 10) / 10);

export function buildReports({ today, now, timezone, members, checkins, nudges }) {
  // Distinct local check-in days per member, as day numbers.
  const daysByMember = new Map();
  for (const c of checkins) {
    let s = daysByMember.get(c.memberId);
    if (!s) daysByMember.set(c.memberId, (s = new Set()));
    s.add(dayNumber(localDate(c.at, timezone)));
  }
  const todayN = dayNumber(today);

  // ---- cohorts ----
  const months = [3, 2, 1, 0].map((k) => monthsBack(today, k));
  const cohorts = months.map((month) => {
    const mine = members.filter((m) => m.joinedOn.slice(0, 7) === month);
    const out = { month, joined: mine.length };
    for (const N of [30, 60, 90]) {
      let reached = 0;
      let visited = 0;
      for (const m of mine) {
        const j = dayNumber(m.joinedOn);
        if (todayN - j < N) continue;
        reached++;
        const days = daysByMember.get(m.id);
        if (days) {
          for (let d = N - 7; d <= N - 1; d++) if (days.has(j + d)) { visited++; break; }
        }
      }
      out[`day${N}`] = reached === 0 ? null : pct(visited, reached);
    }
    return out;
  });

  // ---- visitsByWeek ----
  const visitsByWeek = [];
  for (let w = 1; w <= 13; w++) {
    const start = 7 * (w - 1);
    const end = Math.min(start + 6, 89);
    const g = { still: [0, 0], slipped: [0, 0] };
    for (const m of members) {
      const j = dayNumber(m.joinedOn);
      if (todayN - j < end + 1) continue; // week not finished
      const days = daysByMember.get(m.id);
      let count = 0;
      let last = -Infinity;
      if (days) {
        for (const d of days) {
          if (d > last) last = d;
          if (d - j >= start && d - j <= end) count++;
        }
      }
      const grp = todayN - last <= 13 ? g.still : g.slipped;
      grp[0] += count;
      grp[1]++;
    }
    visitsByWeek.push({ week: w, stillComing: avg1(...g.still), slipped: avg1(...g.slipped) });
  }

  // ---- nudges ----
  const nowMs = now ? Date.parse(now) : null;
  let sent = 0;
  let cameBack = 0;
  for (const n of nudges) {
    const t = Date.parse(n.sentAt);
    if (nowMs !== null && t > nowMs) continue;
    const age = todayN - dayNumber(localDate(n.sentAt, timezone));
    if (age < 0 || age > 89) continue;
    sent++;
    for (const c of checkins) {
      if (c.memberId !== n.memberId) continue;
      const dt = Date.parse(c.at) - t;
      if (dt > 0 && dt <= 7 * 86400000) { cameBack++; break; }
    }
  }
  return { cohorts, visitsByWeek, nudges: { sent, cameBack, rate: sent === 0 ? null : pct(cameBack, sent) } };
}
