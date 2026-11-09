// Normalisers for phones, dates, names and emails. All return null when invalid.
export function phoneE164(s) {
  if (s == null) return null;
  let t = String(s).trim().replace(/\s*(x|ext\.?|extension)\s*\d+$/i, '');
  const plus = t.startsWith('+');
  const d = t.replace(/\D/g, '');
  if (plus) {
    if (d.length === 11 && d[0] === '1' && /^1[2-9]\d{2}[2-9]\d{6}$/.test(d)) return '+' + d;
    return null;
  }
  let n = d;
  if (n.length === 11 && n[0] === '1') n = n.slice(1);
  if (n.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(n)) return null;
  return '+1' + n;
}

const pad = (n) => String(n).padStart(2, '0');
function validYmd(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const fmt = (y, m, d) => (validYmd(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null);

export function parseDate(s) {
  if (s == null) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (m) return fmt(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?:\s.*)?$/);
  if (m) {
    let y = +m[3];
    if (m[3].length === 2) y += y < 70 ? 2000 : 1900;
    return fmt(y, +m[1], +m[2]);
  }
  return null;
}

// Offset (ms) of `tz` from UTC at the instant `ms`.
const dtfCache = new Map();
function tzOffset(ms, tz) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    dtfCache.set(tz, f);
  }
  const p = {};
  for (const { type, value } of f.formatToParts(new Date(ms))) p[type] = +value;
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// Wall-clock fields in `tz` -> UTC ms. Ambiguous (fall-back) times take the first occurrence;
// nonexistent (spring-forward) times are read with the offset in force before the gap.
function localToUtcMs(y, mo, d, h, mi, sec, tz) {
  const wall = Date.UTC(y, mo - 1, d, h, mi, sec);
  const before = tzOffset(wall - 86400000, tz);
  const after = tzOffset(wall + 86400000, tz);
  const cands = [...new Set([before, after])]
    .map((o) => wall - o)
    .filter((u) => tzOffset(u, tz) === wall - u)
    .sort((a, b) => a - b);
  return cands.length ? cands[0] : wall - before;
}

export function parseLocalDateTime(s, timezone) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  // ISO with explicit offset or Z
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})$/i);
  if (m) {
    if (!validYmd(+m[1], +m[2], +m[3]) || +m[4] > 23 || +m[5] > 59) return null;
    const off = m[7].toUpperCase() === 'Z' ? 'Z' : m[7].replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
    const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}${off}`);
    return isNaN(dt) ? null : dt.toISOString();
  }
  let y, mo, d, h, mi, sec = 0;
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
  if (m) { [y, mo, d, h, mi] = [+m[1], +m[2], +m[3], +m[4], +m[5]]; sec = +(m[6] ?? 0); }
  else {
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp])?\.?[Mm]?\.?$/);
    if (!m) return null;
    mo = +m[1]; d = +m[2]; y = +m[3]; h = +m[4]; mi = +m[5]; sec = +(m[6] ?? 0);
    if (m[3].length === 2) y += y < 70 ? 2000 : 1900;
    if (m[7]) {
      if (h < 1 || h > 12) return null;
      const pm = m[7].toLowerCase() === 'p';
      h = (h % 12) + (pm ? 12 : 0);
    }
  }
  if (!validYmd(y, mo, d) || h > 23 || mi > 59 || sec > 59) return null;
  try {
    return new Date(localToUtcMs(y, mo, d, h, mi, sec, timezone)).toISOString();
  } catch {
    return null;
  }
}

// YYYY-MM-DD of an ISO instant in `timezone`.
export function localDate(iso, timezone) {
  const p = {};
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso))) p[type] = value;
  return `${p.year}-${p.month}-${p.day}`;
}

export function cleanName(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/\s+/g, ' ');
  return t || null;
}

export function cleanEmail(s) {
  if (s == null) return null;
  const t = String(s).trim().toLowerCase();
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@.,;<>]+$/.test(t) ? t : null;
}
