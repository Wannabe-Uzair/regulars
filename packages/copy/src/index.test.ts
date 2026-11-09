import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { parseCopy, renderCatalogue } from '../scripts/generate.ts'
import { catalogue, copyPackage, has, t } from './index.ts'
import type { CopyId } from './index.ts'

const root = path.join(import.meta.dirname, '..')

test('exports its package name', () => {
  expect(copyPackage).toBe('@tenure/copy')
})

test('t() returns text with no placeholders', () => {
  expect(t('api.signIn')).toBe('Log in to continue.')
})

test('t() fills placeholders with strings and numbers', () => {
  expect(t('a11y.cell.visits', { n: 3, v: 2 })).toBe('Week 3: 2 visits')
  expect(t('kiosk.welcome.back', { first: 'Sam', n: '4' })).toBe('Welcome back, Sam. Week 4.')
})

test('t() leaves an unknown placeholder as written', () => {
  const loose = t as (id: CopyId, vars: Record<string, string | number>) => string
  expect(loose('a11y.cell.visits', { n: 3 })).toBe('Week 3: {v} visits')
})

// Never called: tsc -b checks that each line below fails to compile.
export function compileTimeChecks(): void {
  // @ts-expect-error an id that is not in COPY.md
  t('no.such.id')
  // @ts-expect-error a placeholder text needs its vars
  t('a11y.cell.visits')
  // @ts-expect-error a missing var
  t('a11y.cell.visits', { n: 3 })
  // @ts-expect-error an extra var
  t('a11y.cell.visits', { n: 3, v: 2, x: 1 })
  // @ts-expect-error a text with no placeholders takes no vars
  t('api.signIn', { n: 1 })
}

test('has() accepts only catalogue ids', () => {
  expect(has('api.signIn')).toBe(true)
  expect(has('no.such.id')).toBe(false)
  expect(has('toString')).toBe(false)
})

test('every api.* id has text', () => {
  const ids = Object.keys(catalogue).filter((id) => id.startsWith('api.'))
  expect(ids.length).toBe(41)
  for (const id of ids) expect(catalogue[id as CopyId].length).toBeGreaterThan(0)
})

// Words Uzair decided (docs/milestone-2/answers.md, FIRST-VERSION.md), and the critic's wording picks, as given.
test.each([
  ['FR-AUTH-03', 'signup.lede', 'Start a free 90-day pilot for your gym.'],
  ['FR-AUTH-07', 'login.forgot', 'Forgot your password?'],
  ['FR-AUTH-07', 'reset.title', 'Reset Your Password'],
  ['FR-AUTH-07', 'reset.submit', 'Send Reset Link'],
  ['FR-AUTH-07', 'reset.new.title', 'Choose a New Password'],
  ['FR-AUTH-07', 'reset.new.submit', 'Save Password'],
  ['FR-GYM-04', 'settings.import.link', 'Import Members or Check-Ins'],
  ['FR-STAFF-03', 'settings.invite', 'Invite Staff'],
  ['FR-STAFF-03', 'role.coach', 'Coach'],
  ['FR-STAFF-03', 'role.owner', 'Owner'],
  ['FR-STAFF-05', 'settings.reactivate', 'Reactivate'],
  ['FR-MEM-01', 'members.view.first90', 'First 90 Days'],
  ['FR-MEM-01', 'members.view.everyone', 'Everyone'],
  ['FR-MEM-01', 'members.view.archived', 'Archived'],
  ['FR-MEM-03', 'common.open', 'Open'],
  ['FR-MEM-05', 'members.add', 'Add Member'],
  ['FR-MEM-05', 'members.add.title', 'Add a Member'],
  ['FR-MEM-06', 'members.emptyNone', 'Members appear here once they join at the front desk or you import them.'],
  ['FR-MEMBER-05', 'member.archive', 'Archive'],
  ['FR-MEMBER-05', 'member.archiveTitle', 'Archive this member?'],
  ['FR-MEMBER-05', 'member.archive.ask', 'Archive {name}?'],
  ['FR-MEMBER-05', 'member.archiveConfirm', 'Archive'],
  ['FR-MEMBER-06', 'member.restore', 'Restore Member'],
  ['FR-MEMBER-07', 'member.delete', 'Delete Permanently'],
  ['FR-MEMBER-07', 'member.deleteTitle', 'Delete this member for good?'],
  ['FR-MEMBER-07', 'member.delete.ask', 'Delete {name}?'],
  ['FR-MEMBER-07', 'member.deleteConfirm', 'Delete'],
  ['FR-NUDGE-02', 'nudge.contact', 'Contact {first}'],
  ['FR-NUDGE-02', 'nudge.contact.text', 'Text Message'],
  ['FR-NUDGE-02', 'nudge.contact.whatsapp', 'WhatsApp'],
  ['FR-NUDGE-02', 'nudge.copy', 'Copy Message'],
  ['FR-NUDGE-02', 'nudge.helpPhone', 'Records the nudge, then opens the app you pick with this message to {name}.'],
  [
    'FR-NUDGE-02',
    'nudge.helpDesktop',
    'Messages go from your own phone. Choose WhatsApp, or copy the message and send it to {phone}.',
  ],
  ['FR-TODAY-02', 'nudge.done', 'Nudged'],
  ['FR-NUDGE-06', 'nudges.channel.text', 'Text'],
  ['FR-NUDGE-06', 'nudges.channel.whatsapp', 'WhatsApp'],
  ['FR-NUDGE-06', 'nudges.channel.copy', 'Copied'],
  ['FR-NUDGE-06', 'nudges.channel.inPerson', 'In person'],
  ['FR-IMPORT-04', 'import.dates.toDayFirst', 'Read Them Day First'],
  ['FR-IMPORT-04', 'import.dates.toMonthFirst', 'Read Them Month First'],
  ['FR-TODAY-01', 'today.slipping.title', 'Slipping Now'],
  ['FR-TODAY-01', 'today.checkins.title', 'Checked In Today'],
  ['FR-TODAY-02', 'today.slipping.all', 'Show All {n}'],
  ['FR-TODAY-03', 'today.empty.import', 'Import Members'],
  ['FR-TODAY-03', 'today.empty.kiosk', 'Open the Kiosk'],
  ['FR-KIOSK-02', 'kiosk.mode.phone', 'Phone Number'],
  ['FR-KIOSK-02', 'kiosk.mode.name', 'Name'],
  ['FR-KIOSK-04', 'kiosk.join', 'Join the Gym'],
  ['FR-KIOSK-05', 'kiosk.welcome.visits', '{n} of 3 visits this week.'],
  ['FR-REPORT-01', 'reports.nudges.lead', '{n} of {total} nudges led to a visit'],
  ['FR-WEB-01', 'home.title', 'Turn new members into regulars.'],
  ['FR-KIOSK-05', 'kiosk.welcome.plain', 'Welcome back, {first}.'],
  ['FR-KIOSK-06', 'api.memberArchived', 'Please see the front desk to check in.'],
  ['FR-KIOSK-02', 'kiosk.phone.hint', 'Number from another country? Start with + and the country code.'],
  ['FR-GLOBAL-02', 'err.phone', 'Enter a number from your gym’s country, or + and the country code.'],
  ['FR-WEB-04', 'demo.try', 'Try the Demo'],
  ['FR-SHELL-05', 'common.retry', 'Try Again'],
] as const)('%s %s reads as decided', (_req, id, text) => {
  expect(catalogue[id]).toBe(text)
})

test('NFR-COPY-01 the ids the first version retires are gone', () => {
  const retired = [
    'billing.plan', // no plan button (FR-BILL-01)
    'billing.notLive',
    'billing.payback',
    'nudge.send', // the Contact menu replaces it (FR-NUDGE-02)
    'nudge.markSent',
    'nudge.recordedFor', // duplicated toast.nudge
    'tab.coach.me', // coaches have no Me tab (FR-SHELL-01; Uzair, 8 Nov)
    'more.items',
  ]
  expect(retired.filter((id) => has(id))).toEqual([])
})

test('FR-BILL-01 no line names a price', () => {
  const priced = Object.entries(catalogue).filter(([, text]) =>
    /[$£€]\s?\d|\b(USD|CAD|GBP|PKR|AED|Rs\.?)\s?\d|\b(a|per) (month|year)\b|\/mo\b/i.test(text),
  )
  expect(priced).toEqual([])
})

test('FR-GLOBAL-02 the phone lines name no country of their own', () => {
  const lines = [t('err.phone'), t('kiosk.phone.hint'), t('import.problem.badPhone', { value: '555' })]
  for (const line of lines) expect(line).not.toMatch(/\bUS\b|10-digit/)
})

test('NFR-COPY-01 a quoted search or value takes typographic quotes, never straight ones (audit A12)', () => {
  expect(Object.entries(catalogue).filter(([, text]) => text.includes('"'))).toEqual([])
  expect(t('board.empty.search', { query: 'zz' })).toBe('No Results for “zz”')
})

test('NFR-COPY-01 every apostrophe on screen is typographic, never a straight one (audit B2-11)', () => {
  expect(Object.entries(catalogue).filter(([, text]) => text.includes("'"))).toEqual([])
  expect(catalogue['invite.bad.title']).toBe('This Link Doesn’t Work')
  expect(catalogue['today.slipping.emptyTitle']).toBe('Nobody’s Slipping')
  expect(catalogue['api.loginMismatch']).toBe('That email and password don’t match.')
})

test('NFR-COPY-01 Wi-Fi never breaks at its hyphen: it takes a non-breaking hyphen (audit A13)', () => {
  expect(Object.entries(catalogue).filter(([, text]) => /Wi-Fi/i.test(text))).toEqual([])
  for (const id of ['phone.step1', 'phone.none'] as const) expect(catalogue[id]).toContain('Wi‑Fi')
})

test('NFR-COPY-01 the kiosk lines describe the join action instead of quoting its button', () => {
  for (const id of ['kiosk.notFound', 'kiosk.notFound.action'] as const) {
    expect(catalogue[id]).not.toContain(t('kiosk.join'))
  }
})

test('src/catalogue.generated.ts is current with COPY.md', () => {
  const md = fs.readFileSync(path.join(root, 'COPY.md'), 'utf8')
  const committed = fs.readFileSync(path.join(root, 'src/catalogue.generated.ts'), 'utf8')
  expect(committed, 'run `npm run generate -w @tenure/copy` and commit the result').toBe(renderCatalogue(md))
})

test('the generator rejects a duplicate id', () => {
  expect(() => renderCatalogue('| a.b | One |\n| a.b | Two |\n')).toThrow(/duplicate id "a.b"/)
})

// Every string is in sentence case. An all-caps word of 2 or more letters must be an acronym or unit.
const ACRONYMS = new Set(['CSV', 'SMS', 'QR', 'US', 'ID', 'API', 'JSON', 'KB', 'MB', 'GSM', 'AM', 'PM'])
// Strings deliberately left in capitals, id -> reason. Empty: the product owner has not asked for any.
const CAPS_EXCEPTIONS: Record<string, string> = {}

function capsWords(text: string): string[] {
  const words = text.replace(/\{[^}]*\}/g, ' ').match(/[A-Za-z][A-Za-z0-9.]*/g) ?? []
  return words.filter((w) => {
    const letters = w.replace(/[^A-Za-z]/g, '')
    if (letters.length < 2 || letters !== letters.toUpperCase()) return false
    return !ACRONYMS.has(letters) && !/^E\.?164$/.test(w)
  })
}

test('no catalogue value contains an all-caps word that is not an allowed acronym', () => {
  const bad = Object.entries(catalogue)
    .filter(([id]) => !(id in CAPS_EXCEPTIONS))
    .map(([id, text]) => [id, capsWords(text)] as const)
    .filter(([, words]) => words.length > 0)
    .map(([id, words]) => `${id}: ${words.join(', ')}`)
  expect(bad, 'write the string in sentence case, or add the acronym to ACRONYMS').toEqual([])
})

test('every id on the all-caps exceptions list is in the catalogue', () => {
  for (const id of Object.keys(CAPS_EXCEPTIONS)) expect(has(id)).toBe(true)
})

// Capitals in Apple's split (ARCHITECTURE §2, COPY.md's header): a row's kind comes from the start of its Where cell.
type Row = { id: string; text: string; where: string }
type Kind = 'name' | 'title' | 'control' | 'text'
const ROW_ID = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_{}-]+)+$/
const cell = (s: string): string =>
  s
    .trim()
    .replace(/^`(.*)`$/, '$1')
    .replace(/^"(.*)"$/, '$1')
    .replace(/\\\|/g, '|')
    .trim()

// COPY.md's rows as the generator reads them (a test below checks the two agree), each with its Where cell.
function copyRows(md: string): Row[] {
  const rows: Row[] = []
  let defCol = -1
  for (const line of md.split('\n')) {
    const inline = line.match(/^`([a-z][\w.{}-]+)`\s+—\s+"(.*?)"(.*)$/)
    if (inline?.[1] !== undefined && inline[2] !== undefined && ROW_ID.test(inline[1])) {
      rows.push({ id: inline[1], text: inline[2], where: (inline[3] ?? '').replace(/^\s*\(|\)\s*$/g, '') })
      continue
    }
    if (!line.trim().startsWith('|')) {
      defCol = -1
      continue
    }
    const cells = line
      .trim()
      .replace(/^\||\|$/g, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim())
    if (cells.every((c) => /^-+$/.test(c.replace(/:/g, '')))) continue
    const id = cell(cells[0] ?? '')
    if (!ROW_ID.test(id)) {
      defCol = cells.findIndex((c) => /definition/i.test(c)) // a header row
      continue
    }
    if (cells.length > 1)
      rows.push({ id, text: cell(cells[1] ?? ''), where: cells.length > 2 ? (cells.at(-1) ?? '') : '' })
    const def = cells[defCol]
    if (defCol > 1 && def) rows.push({ id: `${id}.def`, text: cell(def), where: '' })
  }
  return rows
}

// The first phrase of Where (before `,` `;` `:` or `(`, code spans left out) names the kind; first match wins.
function kindOf(where: string): Kind {
  if (/aria-label|accessible name/i.test(where)) return 'name'
  const phrase = (where.replace(/`[^`]*`/g, ' ').split(/[,;:(]/)[0] ?? '').trim()
  if (/^(under|over|after|before|beside|above|below)\b/i.test(phrase) || /^chart title$/i.test(phrase)) return 'text'
  if (/\btitle\b|^headline/i.test(phrase)) return 'title'
  if (/\b(button|tab|menu item|option|segment|primary|link)\b/i.test(phrase)) return 'control'
  return 'text'
}

// The rule card's small words, allowed in either case in Title Case ("Log In", "Go to Log In").
const SMALL = new Set(
  'a an the and but or nor for so yet as at by from in into of off on onto out over per to up via with'.split(' '),
)
// Real names that keep their capitals inside a sentence: the product, two apps, Wi-Fi, the pages, the five countries.
const PROPER = new Set(
  [
    'Regulars WhatsApp Messages Wi\u2011Fi', // Wi-Fi with its non-breaking hyphen (A13)
    'Today Board Members Reports Settings Nudges Templates Billing Me',
    'United States Canada Kingdom Pakistan Arab Emirates',
  ].flatMap((s) => s.split(' ')),
)
// Rows deliberately cased against their kind, id -> reason.
const CASING_EXCEPTIONS: Record<string, string> = {
  'home.source.1': 'a citation: authors, a journal and a city',
}

const bare = (word: string): string => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').replace(/['’]s$/, '')

function notTitleCase(text: string): string[] {
  const halves = text
    .replace(/\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .flatMap((w) => bare(w).split('-'))
  return halves.filter((h) => /^[a-z]/.test(h) && !SMALL.has(h))
}

function notSentenceCase(text: string): string[] {
  const words = text
    .replace(/\{[^}]*\}/g, 'x')
    .split(/\s+/)
    .filter(Boolean)
  return words.slice(1).flatMap((w, i) => {
    const word = bare(w)
    const prev = words[i] ?? ''
    if (!/^[A-Z]/.test(word) || /[.?:·]$/.test(prev)) return []
    if (PROPER.has(word) || ACRONYMS.has(word.replace(/[^A-Za-z]/g, ''))) return []
    if (/^[A-Z]$/.test(word) && w.endsWith('.')) return [] // an initial, as in "Sam O."
    return [word]
  })
}

test('the casing check reads the same rows as the generator', () => {
  const md = fs.readFileSync(path.join(root, 'COPY.md'), 'utf8')
  expect(new Map(copyRows(md).map((r) => [r.id, r.text]))).toEqual(parseCopy(md))
})

test('NFR-COPY-01 every row is cased by its kind: Title Case on what you press and short titles, sentence case on what you read', () => {
  const rows = copyRows(fs.readFileSync(path.join(root, 'COPY.md'), 'utf8'))
  const bad = rows
    .filter((r) => !(r.id in CASING_EXCEPTIONS))
    .flatMap((r) => {
      const kind = kindOf(r.where)
      if (kind === 'name') return []
      if (kind === 'text') return notSentenceCase(r.text).map((w) => `${r.id} (text): "${r.text}" has ${w}`)
      if (/[.?!]$/.test(r.text))
        return notSentenceCase(r.text).map((w) => `${r.id} (${kind}, a sentence): "${r.text}" has ${w}`)
      return notTitleCase(r.text).map((w) => `${r.id} (${kind}): "${r.text}" has ${w}`)
    })
  expect(bad, "recase the row, or start its Where with its kind (COPY.md's header)").toEqual([])
})

test('the casing check sorts kinds and words as the rule card says', () => {
  expect(kindOf('Primary button')).toBe('control')
  expect(kindOf('Link styled as a button, to Today')).toBe('control')
  expect(kindOf('Empty title, filters set')).toBe('title')
  expect(kindOf('Line under `today.empty.title` in the stall version')).toBe('text')
  expect(kindOf('Under the title')).toBe('text')
  expect(kindOf('Chart title (read by screen readers)')).toBe('text')
  expect(kindOf('`aria-label` of the done button')).toBe('name')
  expect(notTitleCase('Go to Log In')).toEqual([])
  expect(notTitleCase("This Link Doesn't Work")).toEqual([])
  expect(notTitleCase('This Link Doesn’t Work')).toEqual([])
  expect(notSentenceCase('Open Today’s list from Today')).toEqual([])
  expect(notTitleCase('Import Members or Check-ins')).toEqual(['ins'])
  expect(notTitleCase('Slipping now')).toEqual(['now'])
  expect(notSentenceCase('Nudge a slipping member from Today. Each nudge shows here.')).toEqual([])
  expect(notSentenceCase('Last visit {n} days ago · Coach {coach}')).toEqual([])
  expect(notSentenceCase('Members appear here once They join')).toEqual(['They'])
})

test('every id on the casing exceptions list is in the catalogue', () => {
  for (const id of Object.keys(CASING_EXCEPTIONS)) expect(has(id)).toBe(true)
})

test('NFR-COPY-01 no line makes Regulars the subject of a singular verb', () => {
  const singular = Object.entries(catalogue).filter(([, text]) =>
    /\bRegulars (is|has|shows|does|sends|keeps|works|lets|helps)\b/.test(text),
  )
  expect(singular).toEqual([])
})
