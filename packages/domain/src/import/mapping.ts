// Which column feeds which field (FR-IMPORT-02), ported from legacy/app/server/import/mapping.mjs, with a Full name
// field for members (FR-IMPORT-03). The suggestion comes from common gym-software headers; the owner can change it.

export const IMPORT_KINDS = ['members', 'checkins'] as const
export type ImportKind = (typeof IMPORT_KINDS)[number]

export const MEMBER_IMPORT_FIELDS = [
  'external_id',
  'first_name',
  'full_name',
  'last_name',
  'phone',
  'email',
  'joined_on',
  'coach_email',
] as const
export const CHECKIN_IMPORT_FIELDS = ['external_id', 'phone', 'checked_in_at'] as const

export type MemberImportField = (typeof MEMBER_IMPORT_FIELDS)[number]
export type CheckinImportField = (typeof CHECKIN_IMPORT_FIELDS)[number]
export type ImportField = MemberImportField | CheckinImportField

export const IMPORT_FIELDS = {
  members: MEMBER_IMPORT_FIELDS,
  checkins: CHECKIN_IMPORT_FIELDS,
} as const satisfies Record<ImportKind, readonly ImportField[]>

/** Each of the kind's fields, to a column index or null. */
export type ImportMapping = Partial<Record<ImportField, number | null>>

/**
 * What a mapping still lacks, each one required: a name (a first name or a full name) and a join date for members; a
 * check-in time, and an ID or phone to match by, for check-ins.
 */
export const MISSING_FIELDS = ['name', 'joinedOn', 'checkinTime', 'match'] as const
export type MissingField = (typeof MISSING_FIELDS)[number]

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')

// Normalised headers, in priority order: an earlier synonym wins over an earlier column, and each column feeds one
// field. Fields are tried in this order too, so "Email" goes to email before coach_email looks at it.
const SYNONYMS: { members: Record<MemberImportField, string[]>; checkins: Record<CheckinImportField, string[]> } = {
  members: {
    external_id: [
      'externalid',
      'memberid',
      'id',
      'barcode',
      'clientid',
      'membernumber',
      'memberno',
      'customerid',
      'accountid',
    ],
    first_name: ['firstname', 'first', 'givenname', 'fname', 'forename'],
    full_name: ['fullname', 'name', 'membername', 'clientname', 'customername', 'contactname'],
    last_name: ['lastname', 'last', 'surname', 'familyname', 'lname'],
    phone: [
      'phone',
      'phonenumber',
      'mobile',
      'mobilephone',
      'mobilenumber',
      'cell',
      'cellphone',
      'cellnumber',
      'telephone',
      'tel',
    ],
    email: ['email', 'emailaddress', 'memberemail', 'email1'],
    joined_on: [
      'joinedon',
      'joindate',
      'joined',
      'startdate',
      'membersince',
      'signupdate',
      'signup',
      'datejoined',
      'membershipstart',
      'membershipstartdate',
      'enrolleddate',
    ],
    coach_email: ['coachemail', 'coach', 'traineremail', 'trainer', 'assignedcoach', 'coachsemail'],
  },
  checkins: {
    external_id: ['externalid', 'memberid', 'id', 'barcode', 'clientid', 'membernumber', 'memberno', 'customerid'],
    phone: ['phone', 'phonenumber', 'mobile', 'mobilephone', 'cell', 'cellphone', 'telephone'],
    checked_in_at: [
      'checkedinat',
      'checkintime',
      'checkin',
      'checkedin',
      'visitdate',
      'visittime',
      'visitdatetime',
      'timestamp',
      'datetime',
      'datetimein',
      'checkindate',
      'checkindatetime',
      'time',
      'date',
      'attendeddate',
    ],
  },
}

const isSet = (mapping: ImportMapping, field: ImportField) => mapping[field] != null

/** The required fields `mapping` leaves out, in the order the screen lists them. */
export function missingFields(kind: ImportKind, mapping: ImportMapping): MissingField[] {
  const missing: MissingField[] = []
  if (kind === 'members') {
    if (!isSet(mapping, 'first_name') && !isSet(mapping, 'full_name')) missing.push('name')
    if (!isSet(mapping, 'joined_on')) missing.push('joinedOn')
  } else {
    if (!isSet(mapping, 'checked_in_at')) missing.push('checkinTime')
    if (!isSet(mapping, 'external_id') && !isSet(mapping, 'phone')) missing.push('match')
  }
  return missing
}

/** The suggested mapping for a file's header: every field of the kind, each to a column index or null. */
export function guessMapping(kind: ImportKind, header: readonly string[]): ImportMapping {
  const table: Record<string, string[]> = SYNONYMS[kind]
  const normHeader = header.map(norm)
  const used = new Set<number>()
  const mapping: ImportMapping = {}
  for (const field of IMPORT_FIELDS[kind]) {
    mapping[field] = null
    for (const syn of table[field] ?? []) {
      const idx = normHeader.findIndex((h, i) => h === syn && !used.has(i))
      if (idx !== -1) {
        mapping[field] = idx
        used.add(idx)
        break
      }
    }
  }
  return mapping
}

/**
 * The owner's mapping as column indexes: each value is a column index, a header name, or null or '' for none. Only
 * the kind's fields are read, and a field left out is none. Undefined when a value names no column of `header`.
 */
export function resolveMapping(
  kind: ImportKind,
  header: readonly string[],
  given: Readonly<Record<string, number | string | null>>,
): ImportMapping | undefined {
  const mapping: ImportMapping = {}
  for (const field of IMPORT_FIELDS[kind]) {
    const v = Object.hasOwn(given, field) ? given[field] : null
    if (v === null || v === undefined || v === '') mapping[field] = null
    else if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < header.length) mapping[field] = v
    else if (typeof v === 'string' && header.includes(v)) mapping[field] = header.indexOf(v)
    else return undefined
  }
  return mapping
}
