// Renders docs/SPEC.md as a styled A4 PDF, docs/SPEC.pdf:
//
//   node docs/spec/render.mjs
//
// Node 26 and Google Chrome, no packages. The script converts the Markdown SPEC.md uses (headings, paragraphs, bold,
// italics, inline code, links, lists, tables, and <br> and • inside table cells) into one HTML file,
// docs/spec/SPEC.html, then prints that with headless Chrome. Nothing here can draw mermaid, so SPEC.md names the
// SVG to use in a comment before each mermaid block (<!-- PDF: the same diagram is docs/spec/context.svg -->).
// Chrome runs with its own profile under docs/spec/.tmp/, which is deleted afterwards.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const here = import.meta.dirname
const root = join(here, '..', '..')
const specFile = join(root, 'docs', 'SPEC.md')
const htmlFile = join(here, 'SPEC.html')
const pdfFile = join(root, 'docs', 'SPEC.pdf')
const tmpDir = join(here, '.tmp')
const fontDir = relative(here, join(root, 'node_modules', '@fontsource-variable', 'hanken-grotesk', 'files'))

// Inline Markdown

const escapeHtml = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

// Prose keeps an entity the Markdown already wrote, such as &amp;, and never breaks an ID such as FR-AUTH-07.
const prose = (s) =>
  s
    .replace(/&(?!#?\w+;)/g, '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g, '<span class="id">$&</span>')

// A path may break after a slash. In a table cell, a long file name may also break before a dot, so it wraps in a
// narrow column.
const code = (s, inCell) => {
  let html = escapeHtml(s)
  if (inCell) html = html.replace(/[^/\s]{14,}/g, (name) => name.replace(/(?<=\w)\.(?=[a-z])/gi, '<wbr>.'))
  if (/[a-z]\/|\/[a-z]/i.test(s)) html = html.replace(/(?<=[^/\s])\/(?=[^/\s])/g, '/<wbr>')
  return `<code>${html}</code>`
}

function codeSpan(src, i, inCell = false) {
  const open = /^`+/.exec(src.slice(i))[0]
  for (let j = i + open.length; j < src.length;) {
    const k = src.indexOf('`', j)
    if (k < 0) return null
    const run = /^`+/.exec(src.slice(k))[0]
    if (run.length === open.length) {
      let body = src.slice(i + open.length, k)
      if (/^ [^]*\S[^]* $/.test(body)) body = body.slice(1, -1)
      return { html: code(body, inCell), end: k + run.length }
    }
    j = k + run.length
  }
  return null
}

// Where `delim` closes an emphasis, skipping code spans, or -1.
function closer(src, from, delim) {
  for (let j = from; j < src.length; j++) {
    if (src[j] === '`') {
      const span = codeSpan(src, j)
      if (span) {
        j = span.end - 1
        continue
      }
    }
    if (!src.startsWith(delim, j) || !/\S/.test(src[j - 1])) continue
    if (delim === '**' || (src[j + 1] !== '*' && src[j - 1] !== '*')) return j
  }
  return -1
}

function link(src, i) {
  let depth = 0
  for (let j = i; j < src.length; j++) {
    if (src[j] === '`') {
      const span = codeSpan(src, j)
      if (span) {
        j = span.end - 1
        continue
      }
    }
    if (src[j] === '[') depth++
    else if (src[j] === ']' && --depth === 0) {
      const target = /^\(([^()\s]+)\)/.exec(src.slice(j + 1))
      return target && { text: src.slice(i + 1, j), href: target[1], end: j + 1 + target[0].length }
    }
  }
  return null
}

function inline(src, inCell = false) {
  let html = ''
  let text = ''
  const emit = (s) => {
    html += prose(text) + s
    text = ''
  }
  for (let i = 0; i < src.length;) {
    const c = src[i]
    if (c === '`') {
      const span = codeSpan(src, i, inCell)
      if (span) {
        emit(span.html)
        i = span.end
        continue
      }
    }
    if (c === '<') {
      const br = /^<br\s*\/?>/i.exec(src.slice(i))
      if (br) {
        emit('<br>')
        i += br[0].length
        continue
      }
    }
    if (c === '[') {
      const l = link(src, i)
      if (l) {
        emit(`<a href="${escapeHtml(l.href)}">${inline(l.text, inCell)}</a>`)
        i = l.end
        continue
      }
    }
    if (c === '*') {
      const width = src.startsWith('**', i) ? 2 : 1
      const end = /\S/.test(src[i + width] ?? '') ? closer(src, i + width + 1, '*'.repeat(width)) : -1
      if (end > 0) {
        const tag = width === 2 ? 'strong' : 'em'
        emit(`<${tag}>${inline(src.slice(i + width, end), inCell)}</${tag}>`)
        i = end + width
        continue
      }
    }
    text += c
    i++
  }
  emit('')
  return html
}

const plain = (src) =>
  inline(src)
    .replace(/<[^>]+>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')

// GitHub's heading anchors, which the Contents links use.
const slugs = new Map()
function slug(text) {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replaceAll(' ', '-')
  const n = slugs.get(base) ?? 0
  slugs.set(base, n + 1)
  return n ? `${base}-${n}` : base
}

// Block Markdown

const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])( +)(.*)$/
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

function listItem(line) {
  const m = LIST_ITEM.exec(line)
  if (!m) return null
  const ordered = /\d/.test(m[2])
  return {
    indent: m[1].length,
    ordered,
    start: ordered ? parseInt(m[2], 10) : 1,
    content: m[4],
    contentColumn: m[1].length + m[2].length + m[3].length,
  }
}

const indentOf = (line) => /^ */.exec(line)[0].length
const isTable = (lines, i) => /^\s*\|/.test(lines[i]) && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1])

// Whether a line starts a new block, and so ends a paragraph. As in CommonMark, an ordered list interrupts a
// paragraph only when it starts at 1.
function startsBlock(lines, i) {
  const line = lines[i]
  if (/^ {0,3}(#{1,6}\s|`{3,}|~{3,}|<!--)/.test(line) || isTable(lines, i)) return true
  const item = listItem(line)
  return Boolean(item && (!item.ordered || item.start === 1))
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'))

function parseList(lines, start) {
  const first = listItem(lines[start])
  const list = { type: 'list', ordered: first.ordered, start: first.start, loose: false, items: [] }
  let i = start
  while (i < lines.length) {
    const item = listItem(lines[i])
    if (!item || item.indent !== first.indent || item.ordered !== first.ordered) break
    const body = [item.content]
    for (i++; i < lines.length;) {
      const line = lines[i]
      if (!line.trim()) {
        let j = i + 1
        while (j < lines.length && !lines[j].trim()) j++
        if (j < lines.length && indentOf(lines[j]) >= item.contentColumn) {
          for (; i < j; i++) body.push('')
          continue
        }
        break
      }
      if (indentOf(line) >= item.contentColumn) body.push(line.slice(item.contentColumn))
      else if (!startsBlock(lines, i) && !listItem(line) && body.at(-1).trim()) body.push(line.trim())
      else break
      i++
    }
    list.items.push(parseBlocks(body))
    let j = i
    while (j < lines.length && !lines[j].trim()) j++
    const next = j > i && j < lines.length && listItem(lines[j])
    if (next && next.indent === first.indent && next.ordered === first.ordered) {
      list.loose = true
      i = j
    }
  }
  return [list, i]
}

function parseBlocks(lines) {
  const blocks = []
  let svg = null
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (/^ {0,3}<!--/.test(line)) {
      let comment = line
      while (!comment.includes('-->') && i + 1 < lines.length) comment += '\n' + lines[++i]
      const named = /^\s*<!--\s*PDF:[^]*?(docs\/spec\/[\w./-]+\.svg)/.exec(comment)
      if (named) svg = named[1]
      i++
      continue
    }
    const fence = /^ {0,3}(`{3,}|~{3,})\s*([\w-]*)/.exec(line)
    if (fence) {
      const body = []
      for (i++; i < lines.length && !lines[i].trimStart().startsWith(fence[1]); i++) body.push(lines[i])
      i++
      blocks.push({ type: 'code', lang: fence[2], text: body.join('\n'), svg: fence[2] === 'mermaid' ? svg : null })
      svg = null
      continue
    }
    const heading = /^ {0,3}(#{1,6})\s+(.*?)(\s+#+)?\s*$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      i++
      continue
    }
    if (isTable(lines, i)) {
      const rows = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++])
      blocks.push({ type: 'table', header: cells(rows[0]), rows: rows.slice(2).map(cells) })
      continue
    }
    if (listItem(line)) {
      const [list, next] = parseList(lines, i)
      blocks.push(list)
      i = next
      continue
    }
    const text = [line.trim()]
    for (i++; i < lines.length && lines[i].trim() && !startsBlock(lines, i); i++) text.push(lines[i].trim())
    blocks.push({ type: 'para', text: text.join('\n') })
  }
  return blocks
}

// HTML

// A table cell: lines split by <br>, and a line that starts with • or a step number hangs from its marker.
function cell(src) {
  const lines = src.split(/<br\s*\/?>/i).map((line) => line.trim())
  if (lines.length === 1 && !/^(•|\d+\.)\s/.test(src)) return inline(src, true)
  const step = lines.some((line) => /^\d{2,}\.\s/.test(line)) ? 'step wide' : 'step'
  return lines
    .map((line) => {
      const item = /^(•|\d+\.)\s+([^]*)$/.exec(line)
      if (!item) return `<span class="line">${inline(line, true)}</span>`
      const kind = item[1] === '•' ? 'bullet' : step
      return `<span class="line ${kind}"><span class="marker">${item[1]}</span>${inline(item[2], true)}</span>`
    })
    .join('')
}

// Each column is named after its header, such as col.expected-result, so the styles can size it.
const columnClass = (header) =>
  plain(header)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function renderTable({ header, rows }) {
  const width = header.length
  const row = (values, tag) =>
    '<tr>' + header.map((_, j) => `<${tag}>${cell(values[j] ?? '')}</${tag}>`).join('') + '</tr>'
  return [
    `<table class="cols-${width}">`,
    `<colgroup>${header.map((h) => `<col class="${columnClass(h)}">`).join('')}</colgroup>`,
    `<thead>${row(header, 'th')}</thead>`,
    `<tbody>\n${rows.map((values) => row(values, 'td')).join('\n')}\n</tbody>`,
    '</table>',
  ].join('\n')
}

function renderList(list, className) {
  const tag = list.ordered ? 'ol' : 'ul'
  const attributes = (className ? ` class="${className}"` : '') + (list.start !== 1 ? ` start="${list.start}"` : '')
  const items = list.items.map((blocks) => {
    const parts = blocks.map((block, k) =>
      block.type === 'para' && !list.loose ? inline(block.text) : renderBlock(block, blocks, k),
    )
    return `<li>${parts.join('\n')}</li>`
  })
  return `<${tag}${attributes}>\n${items.join('\n')}\n</${tag}>`
}

function renderDiagram(block, next) {
  if (!block.svg) {
    throw new Error('SPEC.md has a mermaid block with no <!-- PDF: ... docs/spec/<name>.svg --> comment before it.')
  }
  const svg = readFileSync(join(root, block.svg), 'utf8')
    .replace(/<\?xml[^>]*\?>\s*/, '')
    // The PDF is light only, so the diagram's dark palette never applies, whatever the printing machine prefers.
    .replace(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g, '@media not all')
  let caption = ''
  if (next?.type === 'para' && /^\*Figure\b/.test(next.text)) {
    next.caption = true
    caption = `<figcaption>${inline(next.text)}</figcaption>`
  }
  return `<figure class="diagram">\n${svg.trim()}\n${caption}\n</figure>`
}

function renderBlock(block, blocks, k) {
  switch (block.type) {
    case 'heading':
      return `<h${block.level} id="${slug(plain(block.text))}">${inline(block.text)}</h${block.level}>`
    case 'para':
      if (block.caption) return ''
      if (/^\*\*[^*]+\*\*$/.test(block.text)) return `<p class="label">${inline(block.text.slice(2, -2))}</p>`
      return `<p>${inline(block.text)}</p>`
    case 'list': {
      const previous = blocks[k - 1]
      return renderList(block, previous?.type === 'heading' && plain(previous.text) === 'Contents' ? 'toc' : '')
    }
    case 'table':
      return renderTable(block)
    case 'code':
      if (block.lang === 'mermaid') return renderDiagram(block, blocks[k + 1])
      return `<pre><code>${escapeHtml(block.text)}</code></pre>`
  }
}

const cssString = (s) => `"${s.replace(/["\\]/g, '\\$&')}"`

function page(blocks) {
  // The cover holds the title, the line under it, the document table and the revision history.
  const revisions = blocks.findIndex((b) => b.type === 'para' && b.text === '**Revision history**')
  const coverEnd = blocks.findIndex((b, k) => b.type === 'table' && k > revisions)
  const render = (part) => part.map((block, k) => renderBlock(block, part, k)).join('\n')
  const cover = render(blocks.slice(0, coverEnd + 1))
  const body = render(blocks.slice(coverEnd + 1))

  const title = plain(blocks.find((b) => b.type === 'heading' && b.level === 1).text)
  const versionRow = blocks.find((b) => b.type === 'table')?.rows.find(([label]) => label === 'Version')
  const version = /^[\d.]+/.exec(versionRow?.[1] ?? '')?.[0]
  const footer = version ? `${title} · version ${version}` : title

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
<style>
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: normal;
  font-weight: 100 900;
  src: url('${fontDir}/hanken-grotesk-latin-wght-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Hanken Grotesk';
  font-style: italic;
  font-weight: 100 900;
  src: url('${fontDir}/hanken-grotesk-latin-wght-italic.woff2') format('woff2');
}

:root {
  --text: #1D3557;
  --text-soft: #3F5571;
  --rule: #A8DADC;
  --header: #F1FAEE;
  --line: #D4E7E8;
  --font: 'Hanken Grotesk', system-ui, sans-serif;
  --mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

@page {
  size: A4;
  margin: 18mm 17mm 20mm;
  @bottom-left {
    content: ${cssString(footer)};
    font: 8pt/1 var(--font);
    color: var(--text-soft);
  }
  @bottom-right {
    content: 'Page ' counter(page) ' of ' counter(pages);
    font: 8pt/1 var(--font);
    color: var(--text-soft);
  }
}
@page :first {
  @bottom-left { content: none; }
  @bottom-right { content: none; }
}

html {
  font-family: var(--font);
  font-size: 10.5pt;
  line-height: 1.45;
  color: var(--text);
  background: #FFFFFF;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body { margin: 0; }

h1, h2, h3, h4 {
  margin: 0;
  font-weight: 700;
  line-height: 1.2;
  break-after: avoid;
  break-inside: avoid;
}
h2 {
  margin-bottom: 11pt;
  padding-bottom: 5pt;
  border-bottom: 0.75pt solid var(--rule);
  font-size: 17pt;
  break-before: page;
}
h2#contents { break-before: auto; margin-top: 18pt; }
h3 { margin: 17pt 0 6pt; font-size: 12.5pt; }
h4 { margin: 13pt 0 5pt; font-size: 11pt; }
h2 + h3 { margin-top: 0; }

p { margin: 0 0 7pt; orphans: 3; widows: 3; }
p.label { margin: 13pt 0 5pt; font-weight: 700; break-after: avoid; }
strong { font-weight: 650; }
a { color: inherit; text-decoration: none; }
.id { white-space: nowrap; }

ul, ol { margin: 0 0 8pt; padding-left: 15pt; }
li { margin: 2pt 0; }
li > ul, li > ol { margin: 2pt 0 0; }
li::marker { color: var(--text-soft); }

code {
  padding: 0 0.22em;
  border-radius: 2pt;
  background: var(--header);
  font-family: var(--mono);
  font-size: 0.86em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
:is(h1, h2, h3, h4, .toc) code { white-space: nowrap; }
pre { margin: 0 0 8pt; padding: 6pt 8pt; background: var(--header); white-space: pre-wrap; }
pre code { padding: 0; background: none; }

table {
  width: 100%;
  margin: 4pt 0 13pt;
  border-collapse: collapse;
  font-size: 9pt;
  line-height: 1.38;
}
table.cols-5, table.cols-6 { font-size: 8.5pt; }
th, td {
  padding: 3.5pt 5.5pt;
  border-bottom: 0.5pt solid var(--line);
  text-align: left;
  vertical-align: top;
  overflow-wrap: break-word;
}
/* The acceptance tests. Left to itself, Chrome gives their spare width to the results and squeezes the steps. */
table:has(col.steps) col.id { width: 7%; }
table:has(col.steps) col.test { width: 12%; }
table:has(col.steps) col.steps { width: 26%; }
table:has(col.steps) col.expected-result { width: 28%; }
table:has(col.steps) col.covered-by { width: 14%; }
table:has(col.steps) col.covers { width: 13%; }
thead { display: table-header-group; }
thead th {
  border-top: 0.75pt solid var(--rule);
  border-bottom: 0.75pt solid var(--rule);
  background: var(--header);
  font-weight: 650;
}
thead code { background: #FFFFFF; }
tr { break-inside: avoid; }
.line { display: block; }
.line + .line { margin-top: 1.5pt; }
.bullet, .step { position: relative; }
.bullet { padding-left: 0.95em; }
.step { padding-left: 1.3em; }
.step.wide { padding-left: 1.75em; }
.marker { position: absolute; left: 0; color: var(--text-soft); }
.step > .marker { width: 1em; text-align: right; }
.step.wide > .marker { width: 1.45em; }

figure.diagram { margin: 6pt 0 14pt; break-inside: avoid; }
figure.diagram svg { display: block; width: 100%; height: auto; }
figcaption { margin-top: 6pt; color: var(--text-soft); font-size: 9pt; }
figcaption em { color: var(--text); font-weight: 650; }

.toc, .toc ul { margin: 0; padding: 0; list-style: none; }
.toc { columns: 2; column-gap: 9mm; line-height: 1.32; }
.toc > li { margin: 0 0 5pt; font-weight: 650; break-inside: avoid; }
.toc ul { padding-left: 15pt; font-weight: 400; }
.toc ul li { margin: 0.5pt 0 0; }

.cover { padding-top: 34mm; break-after: page; }
.cover h1 {
  max-width: 150mm;
  margin-bottom: 12pt;
  padding-top: 12pt;
  border-top: 3pt solid var(--rule);
  font-size: 30pt;
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.cover h1 + p { max-width: 140mm; margin-bottom: 22mm; color: var(--text-soft); font-size: 13pt; line-height: 1.4; }
.cover table { font-size: 9.5pt; }
.cover table :is(th, td):first-child { width: 24%; font-weight: 650; }
.cover table:last-of-type :is(th, td):nth-child(2) { white-space: nowrap; }
.cover p.label { margin-top: 12mm; }
</style>
</head>
<body>
<section class="cover">
${cover}
</section>
<main>
${body}
</main>
</body>
</html>
`
}

// Build the HTML, then print it

const html = page(parseBlocks(readFileSync(specFile, 'utf8').split('\n')))
writeFileSync(htmlFile, html)

const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]))
const broken = [...html.matchAll(/ href="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !ids.has(id))
if (broken.length) console.warn(`Links with no heading to land on: ${broken.join(', ')}`)

rmSync(pdfFile, { force: true })
mkdirSync(tmpDir, { recursive: true })
const profile = mkdtempSync(join(tmpDir, 'chrome-'))
try {
  const run = spawnSync(
    chrome,
    [
      '--headless=new',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfFile}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      pathToFileURL(htmlFile).href,
    ],
    { encoding: 'utf8', timeout: 180_000 },
  )
  if (run.error) throw run.error
  if (run.status !== 0 || !existsSync(pdfFile)) {
    process.stderr.write(run.stderr)
    throw new Error(`Chrome exited with ${run.status ?? run.signal} and wrote no PDF.`)
  }
} finally {
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  try {
    rmdirSync(tmpDir) // only when empty: anything else in it isn't this script's
  } catch {}
}

const pages = readFileSync(pdfFile, 'latin1').match(/\/Type\s*\/Page(?![a-z])/g)?.length ?? 0
console.log(`${relative(root, pdfFile)}: ${pages} pages, from ${relative(root, htmlFile)}`)
