/**
 * The voice-over cut into captions, one sentence at a time, timed from voice.json's word times. Shared by the film's
 * burned-in captions and the SRT (srt.ts), so the two cannot disagree. Plain TypeScript (no imports) so Node runs it.
 */

export type Word = { word: string; at: number; stress?: boolean; unspoken?: boolean }
export type Line = { beat: string; caption: string; words: Word[] }
export type Chunk = { beat: string; words: Word[]; from: number; to: number; text: string }

/** The lines whose words are the picture itself (the question, the end card's tagline) carry no caption bar. */
export const PICTURED = new Set(['question', 'end-card'])

export function captionChunks(lines: Line[]): Chunk[] {
  const out: Chunk[] = []
  for (const l of lines) {
    let cur: Word[] = []
    const flush = () => {
      if (!cur.length) return
      out.push({ beat: l.beat, words: cur, from: cur[0]!.at - 0.1, to: 0, text: cur.map((w) => w.word).join(' ') })
      cur = []
    }
    for (const w of l.words) {
      cur.push(w)
      if (/[.?]$/.test(w.word)) flush()
    }
    flush()
  }
  // Each caption stays until the next one starts, and at most 1 s past its last word.
  out.forEach((c, i) => {
    const next = out[i + 1]?.from ?? 30
    c.to = Math.min(next, c.words.at(-1)!.at + 1.0, 30)
  })
  return out
}
