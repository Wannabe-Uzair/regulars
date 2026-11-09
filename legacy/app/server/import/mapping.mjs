// Guess which CSV column feeds which field, from common gym-software export headers.
const norm = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const SYNONYMS = {
  members: {
    external_id: ['externalid', 'memberid', 'id', 'barcode', 'clientid', 'membernumber', 'memberno', 'customerid', 'accountid'],
    first_name: ['firstname', 'first', 'givenname', 'fname', 'forename'],
    last_name: ['lastname', 'last', 'surname', 'familyname', 'lname'],
    phone: ['phone', 'phonenumber', 'mobile', 'mobilephone', 'mobilenumber', 'cell', 'cellphone', 'cellnumber', 'telephone', 'tel'],
    email: ['email', 'emailaddress', 'memberemail', 'email1'],
    joined_on: ['joinedon', 'joindate', 'joined', 'startdate', 'membersince', 'signupdate', 'signup', 'datejoined', 'membershipstart', 'membershipstartdate', 'enrolleddate'],
    coach_email: ['coachemail', 'coach', 'traineremail', 'trainer', 'assignedcoach', 'coachsemail'],
  },
  checkins: {
    external_id: ['externalid', 'memberid', 'id', 'barcode', 'clientid', 'membernumber', 'memberno', 'customerid'],
    phone: ['phone', 'phonenumber', 'mobile', 'mobilephone', 'cell', 'cellphone', 'telephone'],
    checked_in_at: ['checkedinat', 'checkintime', 'checkin', 'checkedin', 'visitdate', 'visittime', 'visitdatetime', 'timestamp', 'datetime', 'datetimein', 'checkindate', 'checkindatetime', 'time', 'date', 'attendeddate'],
  },
};

const REQUIRED = {
  members: { first_name: 'a first name', joined_on: 'a join date' },
  checkins: { checked_in_at: 'a check-in date and time' },
};

export function guessMapping(kind, header) {
  const table = SYNONYMS[kind];
  if (!table) throw new Error(`Unknown import kind: ${kind}`);
  const normHeader = header.map(norm);
  const used = new Set();
  const mapping = {};
  // Synonym lists are in priority order; earlier synonyms win over earlier columns.
  for (const [field, syns] of Object.entries(table)) {
    mapping[field] = null;
    for (const syn of syns) {
      const idx = normHeader.findIndex((h, i) => h === syn && !used.has(i));
      if (idx !== -1) { mapping[field] = idx; used.add(idx); break; }
    }
  }
  const problems = [];
  for (const [field, label] of Object.entries(REQUIRED[kind])) {
    if (mapping[field] == null) problems.push(`We couldn't find ${label} column. Choose which column holds it.`);
  }
  if (kind === 'checkins' && mapping.external_id == null && mapping.phone == null) {
    problems.push("We couldn't find a member ID or phone column to match check-ins to members. Choose one.");
  }
  return { mapping, problems };
}
