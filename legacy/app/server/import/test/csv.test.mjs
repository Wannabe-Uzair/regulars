import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../csv.mjs';

test('basic parse with LF and trailing newline', () => {
  const r = parseCsv('a,b\n1,2\n3,4\n');
  assert.deepEqual(r.header, ['a', 'b']);
  assert.deepEqual(r.rows, [['1', '2'], ['3', '4']]);
  assert.deepEqual(r.problems, []);
});
test('CRLF line endings, no trailing newline', () => {
  const r = parseCsv('a,b\r\n1,2\r\n3,4');
  assert.deepEqual(r.rows, [['1', '2'], ['3', '4']]);
});
test('UTF-8 BOM is stripped from the first header', () => {
  assert.deepEqual(parseCsv('﻿Name,Age\nA,1').header, ['Name', 'Age']);
});
test('quoted commas, escaped quotes and newlines inside quotes', () => {
  const r = parseCsv('n,note\n"Okafor, Jr.","said ""hi"""\n"x","line1\nline2"\n');
  assert.deepEqual(r.rows[0], ['Okafor, Jr.', 'said "hi"']);
  assert.deepEqual(r.rows[1], ['x', 'line1\nline2']);
  assert.equal(r.rows.length, 2);
});
test('blank lines are skipped but row numbers stay spreadsheet-accurate', () => {
  const r = parseCsv('a,b\n\n1,2\n\r\n3,4\n\n');
  assert.deepEqual(r.rows, [['1', '2'], ['3', '4']]);
  assert.deepEqual(r.rowNumbers, [3, 5]);
});
test('empty fields are kept', () => {
  assert.deepEqual(parseCsv('a,b,c\n1,,3\n,,\n').rows, [['1', '', '3']]);
});
test('short and long rows are reported, not thrown', () => {
  const r = parseCsv('a,b\n1\n1,2,3\n1,2\n');
  assert.equal(r.rows.length, 3);
  assert.equal(r.problems.length, 2);
  assert.match(r.problems[0], /Row 2/);
  assert.match(r.problems[1], /Row 3/);
});
test('unterminated quote is reported, not thrown', () => {
  const r = parseCsv('a,b\n1,"oops\n');
  assert.equal(r.problems.length, 1);
});
test('empty input', () => {
  const r = parseCsv('');
  assert.deepEqual(r, { header: [], rows: [], rowNumbers: [], problems: [] });
});
