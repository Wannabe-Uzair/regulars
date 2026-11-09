// SPEC §4 rules, implemented locally for the seed's own checks.
// Dates are 'YYYY-MM-DD' strings in the gym's timezone.

const fmtCache = new Map();
function fmt(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return fmtCache.get(tz);
}
function parts(ms, tz) {
  const o = {};
  for (const p of fmt(tz).formatToParts(new Date(ms))) o[p.type] = p.value;
  return o;
}

/** Local calendar date (YYYY-MM-DD) of an instant (ISO string or Date) in tz. */
export function localDate(at, tz) {
  const p = parts(new Date(at).getTime(), tz);
  return `${p.year}-${p.month}-${p.day}`;
}

const dayNum = (ymd) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 86400000;
export function addDays(ymd, n) {
  return new Date((dayNum(ymd) + n) * 86400000).toISOString().slice(0, 10);
}
export function diffDays(a, b) { return dayNum(a) - dayNum(b); }

function offsetMs(utcMs, tz) {
  const p = parts(utcMs, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}
/** ISO UTC instant for a local wall-clock time (h, min) on a local date. */
export function zonedToUtcISO(ymd, h, min, tz) {
  const guess = Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10), h, min);
  let t = guess - offsetMs(guess, tz);
  const off2 = offsetMs(t, tz);
  if (guess - off2 !== t) t = guess - off2;
  return new Date(t).toISOString();
}

/**
 * Metrics for one member.
 * @param {{joinedOn:string, checkinDates:string[], today:string}} a  checkinDates are local dates
 */
export function memberMetrics({ joinedOn, checkinDates, today }) {
  const daysSinceJoin = diffDays(today, joinedOn);
  const inWindow = daysSinceJoin >= 0 && daysSinceJoin <= 89;
  const days = new Set();
  let last = null;
  for (const d of checkinDates) {
    if (d > today || d < joinedOn) continue;
    days.add(d);
    if (last === null || d > last) last = d;
  }
  const daysSinceLastVisit = last === null ? null : diffDays(today, last);
  if (!inWindow) return { daysSinceJoin, inWindow, weeks: [], finished: 0, pace: null, status: null, daysSinceLastVisit };
  const current = Math.floor(daysSinceJoin / 7);
  const weeks = new Array(current + 1).fill(0);
  for (const d of days) weeks[Math.floor(diffDays(d, joinedOn) / 7)]++;
  let finished = 0;
  while (finished <= current && (finished + 1) * 7 <= daysSinceJoin) finished++;
  const fin = weeks.slice(0, finished);
  const lastN = fin.slice(-3);
  const pace = lastN.length ? Math.round((lastN.reduce((a, b) => a + b, 0) / lastN.length) * 10) / 10 : null;
  let status;
  if (finished >= 2 && fin[finished - 1] < 2 && fin[finished - 2] < 2) status = 'slipping';
  else if (finished < 2) status = 'new';
  else if (fin[finished - 1] >= 3) status = 'on';
  else status = 'below';
  return { daysSinceJoin, inWindow, weeks, finished, pace, status, daysSinceLastVisit };
}

/** Per-member metrics for a whole buildNorthside() result. Returns Map(memberKey -> metrics + member). */
export function analyze(data, today) {
  const tz = data.gym.timezone;
  const dates = new Map();
  for (const c of data.checkins) {
    if (!dates.has(c.memberKey)) dates.set(c.memberKey, []);
    dates.get(c.memberKey).push(localDate(c.at, tz));
  }
  const out = new Map();
  for (const m of data.members) {
    out.set(m.key, { member: m, ...memberMetrics({ joinedOn: m.joinedOn, checkinDates: dates.get(m.key) ?? [], today }) });
  }
  return out;
}

/** Today KPIs (SPEC §4) over the given metrics values. */
export function kpis(metrics, nudges, today, tz) {
  const list = [...metrics];
  const inWin = list.filter((x) => x.inWindow);
  const withFinished = inWin.filter((x) => x.finished >= 1);
  const on = inWin.filter((x) => x.status === 'on').length;
  return {
    newMembers: inWin.length,
    onTheLinePct: withFinished.length ? Math.round((100 * on) / withFinished.length) : null,
    slipping: inWin.filter((x) => x.status === 'slipping').length,
    nudgedThisWeek: nudges.filter((n) => { const d = diffDays(today, localDate(n.sentAt, tz)); return d >= 0 && d <= 6; }).length,
  };
}
