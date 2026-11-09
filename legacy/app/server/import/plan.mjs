// Pure planners: turn parsed CSV rows into creates/updates/skips. The route writes them in one transaction.
import { cleanEmail, cleanName, localDate, parseDate, parseLocalDateTime, phoneE164 } from './normalize.mjs';

const HOUR = 3600000;
const cell = (row, mapping, field) => {
  const i = mapping[field];
  return i == null ? '' : String(row[i] ?? '').trim();
};

export function planMembers({ rows, mapping, existing = [], coaches = [], rowNumbers }) {
  const creates = [], updates = [], skipped = [], problems = [];
  if (mapping.first_name == null) problems.push("No first name column is chosen, so no members can be imported.");
  if (mapping.joined_on == null) problems.push("No join date column is chosen, so no members can be imported.");
  if (problems.length) return { creates, updates, skipped, problems };

  const byExt = new Map(), byPhone = new Map();
  for (const m of existing) {
    if (m.externalId) byExt.set(String(m.externalId), m);
    if (m.phone) byPhone.set(m.phone, m);
  }
  const coachByEmail = new Map(coaches.map((c) => [String(c.email).toLowerCase(), c.id]));
  const seenIds = new Set();      // existing member ids already touched by this file
  const seenExt = new Set(), seenPhone = new Set(); // new members created by this file

  rows.forEach((row, i) => {
    const n = rowNumbers ? rowNumbers[i] : i + 2;
    const skip = (reason) => skipped.push({ row: n, reason: `Row ${n}: ${reason}` });
    const warn = (msg) => problems.push(`Row ${n}: ${msg}`);

    const firstName = cleanName(cell(row, mapping, 'first_name'));
    if (!firstName) return skip('no first name.');
    const joinedRaw = cell(row, mapping, 'joined_on');
    const joinedOn = parseDate(joinedRaw);
    if (!joinedOn) return skip(joinedRaw ? `couldn't read the join date "${joinedRaw}".` : 'no join date.');

    const lastName = cleanName(cell(row, mapping, 'last_name'));
    const externalId = cell(row, mapping, 'external_id') || null;
    const phoneRaw = cell(row, mapping, 'phone');
    const phone = phoneRaw ? phoneE164(phoneRaw) : null;
    if (phoneRaw && !phone) warn(`"${phoneRaw}" isn't a valid US phone number, so it was left blank.`);
    const emailRaw = cell(row, mapping, 'email');
    const email = emailRaw ? cleanEmail(emailRaw) : null;
    if (emailRaw && !email) warn(`"${emailRaw}" isn't a valid email address, so it was left blank.`);
    const coachRaw = cell(row, mapping, 'coach_email');
    let coachId = null;
    if (coachRaw) {
      coachId = coachByEmail.get(coachRaw.toLowerCase()) ?? null;
      if (coachId == null) warn(`no coach has the email "${coachRaw}", so no coach was assigned.`);
    }

    // external_id match beats phone match
    let match = null;
    if (externalId && byExt.has(externalId)) match = byExt.get(externalId);
    else if (phone && byPhone.has(phone)) match = byPhone.get(phone);

    if (match) {
      if (externalId && !match.externalId && seenExt.has(externalId)) return skip(`the member ID "${externalId}" is already used earlier in the file. Give this row its own ID.`);
      if (seenIds.has(match.id)) return skip('this member already appears earlier in the file.');
      seenIds.add(match.id);
      const changes = {};
      if (firstName !== match.firstName) changes.firstName = firstName;
      if (lastName && lastName !== match.lastName) changes.lastName = lastName;
      if (phone && phone !== match.phone) changes.phone = phone;
      if (email && email !== match.email) changes.email = email;
      if (joinedOn !== match.joinedOn) changes.joinedOn = joinedOn;
      if (coachId != null && coachId !== match.coachId) changes.coachId = coachId;
      if (externalId && !match.externalId) { changes.externalId = externalId; seenExt.add(externalId); }
      if (Object.keys(changes).length) updates.push({ id: match.id, row: n, changes });
      else skip('already up to date.');
      return;
    }
    if ((externalId && seenExt.has(externalId)) || (phone && seenPhone.has(phone))) {
      return skip('this member already appears earlier in the file.');
    }
    if (externalId) seenExt.add(externalId);
    if (phone) seenPhone.add(phone);
    creates.push({ row: n, externalId, firstName, lastName, phone, email, joinedOn, coachId });
  });
  return { creates, updates, skipped, problems };
}

export function planCheckins({ rows, mapping, timezone, members = [], existing = [], now = new Date(), rowNumbers }) {
  const creates = [], skipped = [], problems = [];
  if (mapping.checked_in_at == null) problems.push('No check-in time column is chosen, so no check-ins can be imported.');
  if (mapping.external_id == null && mapping.phone == null) problems.push('No member ID or phone column is chosen, so check-ins cannot be matched to members.');
  if (problems.length) return { creates, skipped, problems };

  const byExt = new Map(), byPhone = new Map();
  for (const m of members) {
    if (m.externalId) byExt.set(String(m.externalId), m);
    if (m.phone) byPhone.set(m.phone, m);
  }
  const nowMs = new Date(now).getTime();
  const times = new Map(); // memberId -> [ms]
  for (const e of existing) {
    if (!times.has(e.memberId)) times.set(e.memberId, []);
    times.get(e.memberId).push(new Date(e.at).getTime());
  }

  rows.forEach((row, i) => {
    const n = rowNumbers ? rowNumbers[i] : i + 2;
    const skip = (reason) => skipped.push({ row: n, reason: `Row ${n}: ${reason}` });
    const ext = cell(row, mapping, 'external_id');
    const phoneRaw = cell(row, mapping, 'phone');
    const phone = phoneRaw ? phoneE164(phoneRaw) : null;
    let member = null;
    if (ext && byExt.has(ext)) member = byExt.get(ext);
    else if (phone && byPhone.has(phone)) member = byPhone.get(phone);
    if (!member) return skip(`no member matches ${ext ? `ID "${ext}"` : phoneRaw ? `phone "${phoneRaw}"` : 'this row (no ID or phone)'}.`);

    const raw = cell(row, mapping, 'checked_in_at');
    const at = parseLocalDateTime(raw, timezone);
    if (!at) return skip(raw ? `couldn't read the check-in time "${raw}".` : 'no check-in time.');
    const ms = new Date(at).getTime();
    if (ms > nowMs) return skip('the check-in time is in the future.');
    if (member.joinedOn && localDate(at, timezone) < member.joinedOn) return skip(`the check-in is before the member joined (${member.joinedOn}).`);
    const list = times.get(member.id) ?? [];
    if (list.some((t) => Math.abs(t - ms) < HOUR)) return skip('duplicate: this member already has a check-in within an hour.');
    list.push(ms);
    times.set(member.id, list);
    creates.push({ memberId: member.id, at });
  });
  return { creates, skipped, problems };
}
