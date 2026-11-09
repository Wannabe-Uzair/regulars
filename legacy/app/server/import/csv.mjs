// RFC 4180 CSV parser. Never throws on ragged rows; reports them in `problems`.
// rowNumbers[i] is the 1-based spreadsheet row of rows[i] (header is row 1; blank lines still count).
export function parseCsv(text) {
  let s = String(text ?? '');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const records = [];
  let rec = [];
  let field = '';
  let inQuotes = false;
  let any = false; // anything seen in current record
  const endField = () => { rec.push(field); field = ''; };
  const endRecord = () => { endField(); records.push(rec); rec = []; any = false; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') { inQuotes = true; any = true; }
    else if (c === ',') { endField(); any = true; }
    else if (c === '\r') { if (s[i + 1] === '\n') i++; endRecord(); }
    else if (c === '\n') endRecord();
    else { field += c; any = true; }
  }
  if (any || field !== '' || rec.length) endRecord();

  const problems = [];
  if (inQuotes) problems.push('The file ends inside a quoted value. Check for a missing closing quote.');
  let header = [];
  const rows = [];
  const rowNumbers = [];
  let headerFound = false;
  records.forEach((r, idx) => {
    if (r.every((v) => v.trim() === '')) return; // blank line
    if (!headerFound) { header = r.map((v) => v.trim()); headerFound = true; return; }
    rows.push(r);
    rowNumbers.push(idx + 1);
  });
  rows.forEach((r, i) => {
    if (r.length > header.length) problems.push(`Row ${rowNumbers[i]} has ${r.length} columns but the header has ${header.length}.`);
    else if (r.length < header.length) problems.push(`Row ${rowNumbers[i]} has only ${r.length} of ${header.length} columns.`);
  });
  return { header, rows, rowNumbers, problems };
}
