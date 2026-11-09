// Scoped reads shared by routes: what a user may see, and MemberSummary lists from the DB.
import { buildSummaries, addDays, todayIn, WINDOW_DAYS } from './metrics.mjs'
import { fail } from './http.mjs'
import { MSG } from './messages.mjs'

/** SQL fragment + params limiting members (alias m) to what `user` may see. */
export function memberScope(user) {
  return user.role === 'owner'
    ? { sql: 'm.gym_id = ?', params: [user.gym_id] }
    : { sql: 'm.gym_id = ? AND m.coach_id = ?', params: [user.gym_id, user.id] }
}

export const gymToday = (gym, now) => todayIn(gym.timezone, now())

/**
 * MemberSummary list for what `user` may see. By default only members in their first 90 days;
 * `all: true` includes everyone; `ids` limits to those member ids.
 */
export function loadSummaries(db, gym, user, { today, all = false, ids = null } = {}) {
  const scope = memberScope(user)
  let where = scope.sql
  const params = [...scope.params]
  if (!all) {
    where += ' AND m.joined_on >= ? AND m.joined_on <= ?'
    params.push(addDays(today, -(WINDOW_DAYS - 1)), today)
  }
  if (ids) {
    where += ` AND m.id IN (${ids.map(() => '?').join(',') || 'NULL'})`
    params.push(...ids)
  }
  const members = db.prepare(`SELECT m.* FROM members m WHERE ${where} ORDER BY m.id`).all(...params)
  const checkins = db.prepare(
    `SELECT c.member_id, c.at FROM checkins c JOIN members m ON m.id = c.member_id WHERE ${where} ORDER BY c.at`,
  ).all(...params)
  const lastNudges = db.prepare(
    `SELECT n.member_id, MAX(n.sent_at) AS sent_at FROM nudges n JOIN members m ON m.id = n.member_id WHERE ${where} GROUP BY n.member_id`,
  ).all(...params)
  const users = db.prepare('SELECT id, name FROM users WHERE gym_id = ?').all(gym.id)
  return buildSummaries({ members, checkins, users, lastNudges, today, timeZone: gym.timezone })
}

/** The member row if `user` may see it, else 404 (a coach never learns another coach's ids). */
export function memberFor(db, user, memberId) {
  const scope = memberScope(user)
  const row = db.prepare(`SELECT m.* FROM members m WHERE m.id = ? AND ${scope.sql}`).get(memberId, ...scope.params)
  if (!row) fail(404, MSG.memberNotFound)
  return row
}

/** One member's summary (any age), assuming access was already checked. */
export function summaryOf(db, gym, user, memberId, today) {
  return loadSummaries(db, gym, user, { today, all: true, ids: [memberId] })[0]
}

/** Does the member have a check-in within 7 days after sentAt? (ISO strings compare in order.) */
export function cameBackStmt(db) {
  const stmt = db.prepare('SELECT 1 FROM checkins WHERE member_id = ? AND at > ? AND at <= ? LIMIT 1')
  return (memberId, sentAt) => !!stmt.get(memberId, sentAt, new Date(Date.parse(sentAt) + 7 * 86400000).toISOString())
}
