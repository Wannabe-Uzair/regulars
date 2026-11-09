/**
 * The film's two soundtracks and its subtitles, with ffmpeg:
 * - out/mix-voice.wav: the nine voice lines over the music, with the UI sounds (for the 16:9 and 9:16 films);
 * - out/mix-loop.wav: the music and the UI sounds only (the stall's loop);
 * - ../exports/Regulars-reel.srt: the voice-over as subtitles.
 * Each mix is levelled to -14 LUFS integrated and limited (4x oversampled) so its true peak stays under -1 dBTP.
 * Run by build.sh: `node mix.ts`.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { captionChunks, type Line } from './src/captions.ts'
import { sfxCues } from './src/cues.ts'

const voice = JSON.parse(readFileSync('public/voice.json', 'utf8')) as {
  lines: (Line & { file: string; file_start: number })[]
}
const FILM = 30
const TARGET = -14

/** Gains in dB. The voice lines are each -16 LUFS and the music -24, so the voice sits about 8 LU over the bed before
 * the speech gaps; the UI sounds are made quiet (peaks -9 to -19 dBFS) for the mixer to bring up. */
const gains = {
  voice: { music: -1.5, voice: 0, sfx: 3 },
  loop: { music: 0, voice: null, sfx: 3 },
} as const

function ffmpeg(args: string[]): string {
  return execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/** Integrated loudness and true peak, from ffmpeg's ebur128 meter (its summary goes to stderr). */
export function measure(file: string): { lufs: number; tp: number } {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {
    encoding: 'utf8',
  })
  const log = r.stderr.slice(r.stderr.lastIndexOf('Summary:'))
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(log)?.[1])
  const tp = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(log)?.[1])
  if (!Number.isFinite(lufs) || !Number.isFinite(tp)) throw new Error(`no loudness reading for ${file}`)
  return { lufs, tp }
}

function mix(kind: 'voice' | 'loop', out: string) {
  const g = gains[kind]
  const inputs: string[] = ['-i', 'public/music.wav']
  const filters: string[] = [`[0:a]volume=${g.music}dB,atrim=0:${FILM},afade=t=out:st=${FILM - 0.6}:d=0.6[m]`]
  const labels = ['[m]']
  let n = 1
  if (g.voice !== null) {
    for (const l of voice.lines) {
      const file = `public/voice/${l.file.split('/').at(-1)}`
      const ms = Math.round(l.file_start * 1000)
      inputs.push('-i', file)
      filters.push(`[${n}:a]pan=stereo|c0=c0|c1=c0,volume=${g.voice}dB,adelay=${ms}|${ms}[v${n}]`)
      labels.push(`[v${n}]`)
      n++
    }
  }
  for (const c of sfxCues()) {
    const ms = Math.round(c.start * 1000)
    inputs.push('-i', `public/sfx/${c.name}.wav`)
    filters.push(`[${n}:a]pan=stereo|c0=c0|c1=c0,volume=${g.sfx}dB,adelay=${ms}|${ms}[s${n}]`)
    labels.push(`[s${n}]`)
    n++
  }
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=first,atrim=0:${FILM}[pre]`)
  const raw = out.replace('.wav', '-raw.wav')
  ffmpeg(['-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[pre]', '-ar', '48000', '-c:a', 'pcm_s24le', raw])
  // Level to the target, then a 4x-oversampled limiter at -1.5 dBFS: the true peak stays under -1 dBTP.
  // The limiter takes a little loudness off a peaky mix, so a second pass corrects the gain by what the first lost.
  const before = measure(raw)
  let gain = TARGET - before.lufs
  let after = before
  for (let pass = 0; pass < 2; pass++) {
    ffmpeg([
      '-y',
      '-i',
      raw,
      '-af',
      `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=0.84:attack=1:release=60:level=false,aresample=48000`,
      '-c:a',
      'pcm_s24le',
      out,
    ])
    after = measure(out)
    if (Math.abs(after.lufs - TARGET) < 0.2) break
    gain += TARGET - after.lufs
  }
  console.log(`${out}: ${after.lufs} LUFS, true peak ${after.tp} dBTP (raw ${before.lufs} LUFS, gain ${gain.toFixed(2)} dB)`)
}

function srtTime(s: number): string {
  const ms = Math.round(s * 1000)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  const pad = (x: number, w = 2) => String(x).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(sec)},${pad(ms % 1000, 3)}`
}

export function srt(): string {
  return captionChunks(voice.lines)
    .map((c, i) => `${i + 1}\n${srtTime(Math.max(0, c.from))} --> ${srtTime(c.to)}\n${c.text}\n`)
    .join('\n')
}

if (import.meta.main) {
  mix('voice', 'out/mix-voice.wav')
  mix('loop', 'out/mix-loop.wav')
  writeFileSync('../exports/Regulars-reel.srt', srt())
  console.log('../exports/Regulars-reel.srt')
}
