/**
 * The brief's checks that a script can make (docs/milestone-2/redesign/wave2/briefs/reel.md):
 * - G5 the words: the captions, the SRT and the voice lines against the brief's script table, and the figures and
 *   their sources against marketing/VISITOR-QA.md;
 * - G4 flashes: the frame luminance of each MP4 (ffmpeg signalstats), no more than 3 large swings in any second.
 * Run after build.sh: `node check.ts`. Exits 1 on any mismatch.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { captionChunks, PICTURED, type Line } from './src/captions.ts'
import { figures } from './src/content.ts'

const voice = JSON.parse(readFileSync('public/voice.json', 'utf8')) as {
  lines: (Line & { text_spoken: string; spoken_words: { word: string }[] })[]
}
const brief = readFileSync('../../docs/milestone-2/redesign/wave2/briefs/reel.md', 'utf8')
const qa = readFileSync('../VISITOR-QA.md', 'utf8')
const srt = readFileSync('../exports/Regulars-reel.srt', 'utf8')
const problems: string[] = []

// The script table: each row's first quote is what is said; a "Caption:" quote, when there is one, is what is shown.
const rows = brief
  .split('\n')
  .filter((l) => /^\| 0:\d\d–0:\d\d \|/.test(l))
  .map((l) => {
    const cell = l.split('|')[3]!
    const quotes = [...cell.matchAll(/"([^"]+)"/g)].map((m) => m[1]!)
    const caption = /Caption: "([^"]+)"/.exec(cell)?.[1] ?? quotes[0]!
    return { spoken: quotes[0]!, caption }
  })
if (rows.length !== voice.lines.length) problems.push(`table has ${rows.length} rows, voice.json ${voice.lines.length} lines`)

/** Numbers as the voice says them. */
const say: Record<string, string> = { '6': 'six', '10': 'ten', '78%': 'seventy-eight percent', '59%': 'fifty-nine percent' }
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,?]/g, '')
    .split(/\s+/)
    .map((w) => say[w] ?? w)
    .join(' ')

rows.forEach((row, i) => {
  const l = voice.lines[i]!
  const shown = l.words.map((w) => w.word).join(' ')
  if (shown !== row.caption) problems.push(`line ${i + 1} caption words "${shown}" != table "${row.caption}"`)
  if (l.caption !== row.caption) problems.push(`line ${i + 1} voice.json caption "${l.caption}" != table`)
  if (norm(l.text_spoken) !== norm(row.spoken)) problems.push(`line ${i + 1} spoken "${l.text_spoken}" != table "${row.spoken}"`)
  const spoken = l.spoken_words.map((w) => w.word).join(' ')
  if (norm(spoken) !== norm(row.spoken)) problems.push(`line ${i + 1} spoken words "${spoken}" != table`)
})

// The SRT and the burned-in captions are cut from the same chunks; together they must read the table's captions.
const chunks = captionChunks(voice.lines)
const srtText = srt
  .trim()
  .split(/\n\n/)
  .map((b) => b.split('\n').slice(2).join(' '))
if (srtText.join(' ') !== rows.map((r) => r.caption).join(' ')) problems.push('SRT text != the table captions')
if (chunks.map((c) => c.text).join(' ') !== rows.map((r) => r.caption).join(' ')) problems.push('captions != the table')
const onScreen = chunks.filter((c) => !PICTURED.has(c.beat)).length
console.log(`G5: ${rows.length} lines, ${chunks.length} SRT cues, ${onScreen} caption cues (the question and end card are the picture)`)

// The figures and their sources, as VISITOR-QA.md gives them.
for (const [figure, where] of [
  ['6 in 10', figures.sixInTen.figure],
  ['Sperandei et al., 2016', figures.sixInTen.source],
  ['78%', figures.renewed.stay],
  ['59%', figures.renewed.under],
  ['2001 UK industry study', figures.renewed.source],
] as const) {
  if (!qa.includes(figure)) problems.push(`VISITOR-QA.md lacks "${figure}"`)
  if (where !== figure) problems.push(`the film shows "${where}" for "${figure}"`)
}
if (!qa.includes('3 or more times a week') || !qa.includes('Under once a week')) problems.push('the renewal labels differ from VISITOR-QA.md')

// G4: mean luma per frame; a large swing is a change of more than 20 (of 255) from one frame to the next.
for (const f of ['Regulars-reel-16x9.mp4', 'Regulars-reel-9x16.mp4']) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-f', 'lavfi', '-i', `movie=../exports/${f},signalstats`, '-show_entries', 'frame_tags=lavfi.signalstats.YAVG', '-of', 'csv=p=0'],
    { encoding: 'utf8', maxBuffer: 1 << 24 },
  )
  const y = r.stdout.trim().split('\n').map((s) => Number.parseFloat(s))
  const swings = y.flatMap((v, i) => (i > 0 && Math.abs(v - y[i - 1]!) > 20 ? [i] : []))
  let worst = 0
  for (let i = 0; i < y.length; i++) worst = Math.max(worst, swings.filter((s) => s >= i && s < i + 30).length)
  const range = `${Math.min(...y).toFixed(1)} to ${Math.max(...y).toFixed(1)}`
  console.log(`G4 ${f}: ${y.length} frames, luma ${range}, ${swings.length} large swings, at most ${worst} in any second`)
  if (y.length !== 900) problems.push(`${f} has ${y.length} frames`)
  if (worst > 3) problems.push(`${f}: ${worst} large luminance swings in one second`)
}

if (problems.length) {
  console.log(`${problems.length} mismatches:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log('0 mismatches')
