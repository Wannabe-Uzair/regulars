// Deterministic Northside Strength demo data. Pure: no database, no I/O.
import type { NudgeChannel, UserRole } from '../schema/index.ts'
import { addDays, diffDays, memberMetrics, zonedToUtcISO } from './rules.ts'

export const DEMO_PASSWORD = 'northside-demo-2026'

/** A nudge template as the seed receives it: the API passes the domain's DEFAULT_TEMPLATES. */
export interface SeedTemplateInput {
  readonly name: string
  readonly body: string
}

export interface NorthsideGym {
  name: string
  slug: string
  timezone: string
  /** ISO 3166-1 alpha-2. The sample phones stay +1 whatever it is. */
  country: string
  isDemo: true
  /** `YYYY-MM-DD`. */
  pilotStartedOn: string
}
export interface NorthsideUser {
  key: string
  name: string
  email: string
  role: UserRole
}
export interface NorthsideTemplate {
  name: string
  body: string
  sort: number
}
export interface NorthsideMember {
  key: string
  firstName: string
  lastName: string
  phone: string
  /** '' when the member has no email. */
  email: string
  /** `YYYY-MM-DD`. */
  joinedOn: string
  coachKey: string
  externalId: string
}
export interface NorthsideCheckin {
  memberKey: string
  /** UTC ISO timestamp. */
  at: string
}
export interface NorthsideNudge {
  memberKey: string
  userKey: string
  /** Index into `templates`. */
  templateIndex: number
  body: string
  /** How it left: never `own-phone`, which marks the nudges from before the first version. */
  channel: Exclude<NudgeChannel, 'own-phone'>
  /** UTC ISO timestamp. */
  sentAt: string
}
export interface NorthsideData {
  gym: NorthsideGym
  users: NorthsideUser[]
  templates: NorthsideTemplate[]
  members: NorthsideMember[]
  checkins: NorthsideCheckin[]
  nudges: NorthsideNudge[]
}

const USERS: readonly NorthsideUser[] = [
  { key: 'mike', name: 'Mike R.', email: 'mike@northside.test', role: 'owner' },
  { key: 'priya', name: 'Priya S.', email: 'priya@northside.test', role: 'coach' },
  { key: 'jordan', name: 'Jordan T.', email: 'jordan@northside.test', role: 'coach' },
]
const COACH_FIRST: Readonly<Record<string, string>> = { mike: 'Mike', priya: 'Priya', jordan: 'Jordan' }

const FIRST_NAMES = ['Aaliyah', 'Aiden', 'Alejandro', 'Amara', 'Andre', 'Angela', 'Ben', 'Bianca', 'Brandon', 'Camila',
  'Carlos', 'Dana', 'Darius', 'Elena', 'Eli', 'Emma', 'Fatima', 'Gabriel', 'Grace', 'Hector', 'Isaac', 'Ivy', 'Jada',
  'Jamal', 'Kayla', 'Kevin', 'Lena', 'Liam', 'Lucia', 'Marcus', 'Mei', 'Nadia', 'Noah', 'Olivia', 'Omar', 'Paige',
  'Quinn', 'Rafael', 'Rosa', 'Ryan', 'Sofia', 'Tamika', 'Theo', 'Tyler', 'Uma', 'Victor', 'Wes', 'Xavier', 'Yara',
  'Zoe', 'Brianna', 'Diego', 'Erin', 'Felix', 'Gina', 'Hugo', 'Imani', 'Jake', 'Keisha', 'Luke', 'Mia', 'Nate',
  'Priscilla', 'Reggie', 'Tessa', 'Vince', 'Whitney', 'Anika', 'Caleb', 'Dominic', 'Esther', 'Hannah', 'Ian', 'Jasmine',
  'Kyle', 'Leah', 'Miguel', 'Nora', 'Owen', 'Renee', 'Sean', 'Tara', 'Wendy', 'Yusuf', 'Colleen', 'Dwayne', 'Farah']
const INITIALS = 'ABCDEFGHJKLMNOPRSTVWYZ'.split('')

interface KitMember {
  first: string
  last: string
  weeks: number[]
  cur: number
  coach?: string
}

// The expo kit's six sample members: finished-week visits, then visits so far in the current week.
const KIT: readonly KitMember[] = [
  { first: 'Maya', last: 'R.', weeks: [3, 4, 3, 3, 4, 3, 3, 4, 3], cur: 2 },
  { first: 'Jo', last: 'W.', weeks: [3, 3, 2, 3, 3, 4, 3, 3, 3, 2, 3, 3], cur: 1 },
  { first: 'Dev', last: 'P.', weeks: [2, 3, 3, 4, 3, 3], cur: 2 },
  { first: 'Chris', last: 'L.', weeks: [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2], cur: 1 },
  { first: 'Hana', last: 'L.', weeks: [3, 2, 2, 1, 1, 0], cur: 0, coach: 'mike' },
  { first: 'Sam', last: 'O.', weeks: [2, 1, 0], cur: 0, coach: 'mike' },
]
const KIT_R = 3 // days into the current week, so 4 days are available for the partial week

// The nudges' channels, in send order and repeating: mostly texts, then WhatsApp and copied messages, and the odd word
// in person. By position, not by rnd(), so adding them moved no other seeded value.
const SEED_CHANNELS: readonly NorthsideNudge['channel'][] = [
  'text', 'whatsapp', 'text', 'copy', 'text', 'in-person', 'whatsapp', 'text', 'copy', 'text',
]

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Spec {
  type: string
  kit?: KitMember
  dsj: number
  forcedCoach?: string | undefined
  slippingNonKit?: boolean
  nudgeDay?: number
  days: number[]
}

/**
 * The Northside data for `today` (`YYYY-MM-DD` in `timezone`). The same day gives the same data; `templates` must have
 * at least three entries, since the nudges use the first three by index.
 */
export function buildNorthside({ today, timezone = 'America/Chicago', country = 'US', templates }: {
  today: string
  timezone?: string
  /** ISO 3166-1 alpha-2. Default `US`. */
  country?: string
  templates: readonly SeedTemplateInput[]
}): NorthsideData {
  const rnd = mulberry32(0x4e53_2026)
  const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!
  const shuffle = <T>(arr: readonly T[]): T[] => {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!] }
    return a
  }

  // ---- member specs: each yields { dsj, dayList(): sorted day indices } ----
  // Visit days of week w: n distinct days in [7w, min(7w+6, dsj)], week 0 always includes day 0.
  const weekDays = (w: number, n: number, dsj: number, from = 7 * w): number[] => {
    const lo = Math.max(from, 7 * w), hi = Math.min(7 * w + 6, dsj)
    const avail: number[] = []
    for (let d = lo; d <= hi; d++) avail.push(d)
    n = Math.min(n, avail.length)
    if (n <= 0) return []
    const out: number[] = []
    if (w === 0 && avail[0] === 0) out.push(0)
    for (const d of shuffle(avail)) { if (out.length >= n) break; if (!out.includes(d)) out.push(d) }
    return out
  }
  const fromCounts = (counts: readonly number[], dsj: number): number[] => {
    const days: number[] = []
    counts.forEach((n, w) => days.push(...weekDays(w, n, dsj)))
    return days
  }

  const specs: Spec[] = []
  const add = (s: Spec) => specs.push(s)

  for (const k of KIT) {
    const dsj = 7 * k.weeks.length + KIT_R
    add({ type: 'kit', kit: k, dsj, forcedCoach: k.coach, days: fromCounts([...k.weeks, k.cur], dsj) })
  }
  // steady x18
  for (let i = 0; i < 18; i++) {
    const dsj = int(14, 89), F = Math.floor(dsj / 7)
    const counts: number[] = []
    for (let w = 0; w < F; w++) counts.push(pick([3, 3, 3, 4, 4, 3, 2]))
    counts[F - 1] = pick([3, 4])
    counts.push(int(1, 2))
    add({ type: 'steady', dsj, days: fromCounts(counts, dsj) })
  }
  // drifting x10: 4 deep (slipping), 6 mild (below)
  for (let i = 0; i < 10; i++) {
    const deep = i < 4
    const F = deep ? int(5, 9) : int(3, 8), end = deep ? 1 : 2
    const dsj = Math.min(89, 7 * F + int(0, 6))
    const counts: number[] = []
    for (let w = 0; w < F; w++) counts.push(3 - Math.round((w * (3 - end)) / (F - 1)))
    counts[F - 1] = end; counts[F - 2] = end
    counts.push(int(0, 1))
    add({ type: deep ? 'drifting-slipping' : 'drifting', dsj, slippingNonKit: deep, days: fromCounts(counts, dsj) })
  }
  // stopped x10: 6 slipping (F = k+2.. ), 4 just stopped (F = k+1, below)
  for (let i = 0; i < 10; i++) {
    const slip = i < 6, k = int(2, 4)
    const F = slip ? Math.min(12, k + int(2, 7)) : k + 1
    const dsj = Math.min(89, 7 * F + int(0, 6))
    const counts: number[] = []
    for (let w = 0; w < k; w++) counts.push(pick([3, 3, 4]))
    for (let w = k; w < F; w++) counts.push(0)
    counts.push(0)
    add({ type: slip ? 'stopped-slipping' : 'stopped', dsj, slippingNonKit: slip, days: fromCounts(counts, dsj) })
  }
  // brand new x8
  for (let i = 0; i < 8; i++) {
    const dsj = i === 0 ? 0 : int(1, 13)
    add({ type: 'new', dsj, days: fromCounts([int(2, 3), int(1, 2)], dsj) })
  }
  // came back after a nudge x8
  for (let i = 0; i < 8; i++) {
    const s = int(2, 3), N = 7 * (s + 2) + 1, dsj = N + int(5, 30)
    const counts: number[] = []
    for (let w = 0; w < s; w++) counts.push(3)
    const days = fromCounts(counts, dsj)
    const resume = N + 1 + int(0, 2)
    days.push(resume)
    const w2 = s + 2
    const rest = weekDays(w2, 1, dsj, resume + 1)
    days.push(...rest)
    for (let w = w2 + 1; w <= Math.floor(dsj / 7); w++) days.push(...weekDays(w, w === Math.floor(dsj / 7) ? int(1, 2) : int(2, 3), dsj))
    add({ type: 'cameback', dsj, nudgeDay: N, days: [...new Set(days)].sort((a, b) => a - b) })
  }
  // older (joined 90-150 days ago) x25, for reports
  for (let i = 0; i < 25; i++) {
    const dsj = int(90, 150), rate = int(2, 4)
    const churnAt = rnd() < 0.35 ? int(4, 16) : null
    const counts: number[] = []
    for (let w = 0; w <= Math.floor(dsj / 7); w++) {
      counts.push(churnAt !== null && w >= churnAt ? 0 : Math.max(1, Math.min(5, rate + int(-1, 1))))
    }
    add({ type: 'older', dsj, days: fromCounts(counts, dsj) })
  }

  // ---- identities ----
  const used = new Set(KIT.map((k) => `${k.first}|${k.last}`))
  const kitFirsts = new Set(KIT.map((k) => k.first))
  const names: [string, string][] = []
  for (const sp of specs) {
    if (sp.kit) { names.push([sp.kit.first, sp.kit.last]); continue }
    let f: string, l: string
    do { f = pick(FIRST_NAMES); l = pick(INITIALS) + '.' } while (used.has(`${f}|${l}`) || kitFirsts.has(f))
    used.add(`${f}|${l}`)
    names.push([f, l])
  }

  // Shuffle presentation order, then assign coaches: slipping non-kit cycle priya/jordan/mike; rest round-robin.
  const order = shuffle(specs.map((_, i) => i))
  const phones = shuffle(Array.from({ length: 100 }, (_, i) => `+1312555${String(100 + i).padStart(4, '0')}`))
  const coachKeys = ['mike', 'priya', 'jordan']
  let slipC = 1, rr = 0
  const members: NorthsideMember[] = []
  const typeByKey = new Map<string, string>()
  const dayIdxByKey = new Map<string, number[]>()
  order.forEach((si, idx) => {
    const sp = specs[si]!, [first, last] = names[si]!
    let coachKey: string
    if (sp.forcedCoach) coachKey = sp.forcedCoach
    else if (sp.slippingNonKit) coachKey = coachKeys[slipC++ % 3]!
    else coachKey = coachKeys[rr++ % 3]!
    const key = `m${String(idx + 1).padStart(2, '0')}`
    members.push({
      key, firstName: first, lastName: last, phone: phones[idx]!,
      email: rnd() < 0.7 ? `${first.toLowerCase()}.${last[0]!.toLowerCase()}@example.com` : '',
      joinedOn: addDays(today, -sp.dsj), coachKey, externalId: `NS-${1001 + idx}`,
    })
    typeByKey.set(key, sp.type)
    dayIdxByKey.set(key, sp.days)
  })

  // ---- check-ins ----
  const checkins: NorthsideCheckin[] = []
  const datesByKey = new Map<string, string[]>()
  const checkinDate = new Map<NorthsideCheckin, string>()
  for (const m of members) {
    const slot = int(0, 2)
    const dates: string[] = []
    for (const d of dayIdxByKey.get(m.key)!) {
      const date = addDays(m.joinedOn, d)
      const s = date === today ? 0 : rnd() < 0.75 ? slot : int(0, 2)
      // Today's check-ins are over by 07:00, so from 08:00 on the seeded day (the stall's morning) every member's next
      // kiosk check-in is stored: one within an hour of another isn't (FR-KIOSK-03), and none is in the future. Each
      // slot draws the same random numbers as before, so the rest of the seed is unchanged.
      const [h, min] =
        s === 0 ? [date === today ? int(5, 6) : int(6, 8), int(0, 59)]
        : s === 1 ? [12, int(0, 59)]
        : [int(17, 19), int(0, 59)]
      const checkin = { memberKey: m.key, at: zonedToUtcISO(date, h, min, timezone) }
      checkins.push(checkin)
      checkinDate.set(checkin, date)
      dates.push(date)
    }
    datesByKey.set(m.key, dates)
  }

  // ---- nudges ----
  const statusAt = (m: NorthsideMember, D: string) =>
    memberMetrics({ joinedOn: m.joinedOn, checkinDates: datesByKey.get(m.key)!.filter((x) => x < D), today: D })
  const nudges: Omit<NorthsideNudge, 'channel'>[] = []
  const mkNudge = (m: NorthsideMember, D: string, preferred?: number) => {
    const st = statusAt(m, D)
    const ti = preferred ?? (st.status === 'slipping' ? pick([0, 2]) : pick([0, 1]))
    const days = st.daysSinceLastVisit ?? diffDays(D, m.joinedOn)
    const body = templates[ti]!.body
      .replaceAll('{first}', m.firstName).replaceAll('{coach}', COACH_FIRST[m.coachKey]!)
      .replaceAll('{gym}', 'Northside Strength').replaceAll('{days}', String(days))
    nudges.push({ memberKey: m.key, userKey: m.coachKey, templateIndex: ti, body, sentAt: zonedToUtcISO(D, int(9, 11), int(0, 59), timezone) })
  }
  const nudged = new Set<string>()
  const specByKey = new Map(order.map((si, idx) => [members[idx]!.key, specs[si]!]))
  for (const m of members) {
    const sp = specByKey.get(m.key)!
    if (sp.type === 'cameback') { mkNudge(m, addDays(m.joinedOn, sp.nudgeDay!), 2); nudged.add(m.key) }
  }
  for (const mi of shuffle(members.map((_, i) => i))) {
    if (nudges.length >= 20) break
    const m = members[mi]!
    const type = typeByKey.get(m.key)
    if (nudged.has(m.key) || type === 'older' || type === 'new') continue
    const elig: string[] = []
    for (let back = 1; back <= 41; back++) {
      const D = addDays(today, -back)
      if (diffDays(D, m.joinedOn) < 14 || diffDays(D, m.joinedOn) > 89) continue
      const st = statusAt(m, D).status
      if (st === 'below' || st === 'slipping') elig.push(D)
    }
    if (!elig.length) continue
    mkNudge(m, pick(elig))
    nudged.add(m.key)
  }

  nudges.sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1))
  // A believable came-back rate: of the nudges whose 7 days are over by the end of `today`, about 65% come back. The
  // "came back after a nudge" members always do; the rest of that 35% stay silent, oldest first, by dropping the
  // check-ins in their 7 days (the cameBack rule in the domain's metrics), when that leaves the member's status and
  // weeks as they are. Draws nothing from the random stream.
  const WEEK_MS = 7 * 86_400_000
  const endOfToday = Date.parse(zonedToUtcISO(addDays(today, 1), 0, 0, timezone))
  const past = nudges.filter((n) => Date.parse(n.sentAt) + WEEK_MS <= endOfToday)
  const inWeek = (n: Omit<NorthsideNudge, 'channel'>, c: NorthsideCheckin) =>
    n.memberKey === c.memberKey && c.at > n.sentAt && Date.parse(c.at) <= Date.parse(n.sentAt) + WEEK_MS
  const silent: Omit<NorthsideNudge, 'channel'>[] = []
  const want = Math.round(past.length * 0.35)
  for (const n of past) {
    if (silent.length >= want) break
    const m = members.find((x) => x.key === n.memberKey)!
    const dropped = new Set(checkins.filter((c) => inWeek(n, c)).map((c) => checkinDate.get(c)!))
    const keep = datesByKey.get(m.key)!.filter((d) => !dropped.has(d))
    const metrics = (dates: string[]) => memberMetrics({ joinedOn: m.joinedOn, checkinDates: dates, today }).status
    if (metrics(keep) !== metrics(datesByKey.get(m.key)!)) continue
    silent.push(n)
  }
  const silenced = checkins.filter((c) => !silent.some((n) => inWeek(n, c)))
  silenced.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.memberKey < b.memberKey ? -1 : 1))
  return {
    gym: { name: 'Northside Strength', slug: 'northside', timezone, country, isDemo: true, pilotStartedOn: addDays(today, -23) },
    users: USERS.map((u) => ({ ...u })),
    templates: templates.map((t, i) => ({ name: t.name, body: t.body, sort: i })),
    members,
    checkins: silenced,
    nudges: nudges.map((n, i) => ({ ...n, channel: SEED_CHANNELS[i % SEED_CHANNELS.length]! })),
  }
}
