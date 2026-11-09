import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import voice from '../public/voice.json'
import { captionChunks, PICTURED, type Line } from './captions.ts'
import { sfxCues } from './cues.ts'
import { Back, Carried, CheckIn, EndCard, Figures, Mark, Morphs, Nudge, Question, Slipping } from './scenes.tsx'
import { color, font, FPS, weight } from './theme.ts'
import { clamp01, lerp, ShapeContext, sp, useShape, useT, type Shape } from './ui.tsx'

const CHUNKS = captionChunks(voice.lines as Line[]).filter((c) => !PICTURED.has(c.beat))

/** Word-by-word captions: each word lands as it is said, the stressed word bolder. */
function Captions() {
  const t = useT()
  const wide = useShape() === 'wide'
  const c = CHUNKS.find((x) => t >= x.from && t < x.to)
  if (!c) return null
  const out = clamp01((t - (c.to - 0.12)) / 0.12)
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: wide ? 870 : 1600,
        height: wide ? 170 : 300,
        display: 'flex',
        alignItems: wide ? 'center' : 'flex-start',
        justifyContent: 'center',
        fontFamily: font,
      }}
    >
      <div
        style={{
          maxWidth: wide ? 1640 : 940,
          textAlign: 'center',
          fontSize: wide ? 58 : 66,
          lineHeight: 1.2,
          fontWeight: weight.body,
          letterSpacing: '-0.01em',
          color: color.text,
          textWrap: 'balance',
          opacity: 1 - out,
        }}
      >
        {c.words.map((w, i) => {
          const p = sp(t, w.at - 0.06, 'quick')
          return (
            <span key={i}>
              <span
                style={{
                  display: 'inline-block',
                  opacity: clamp01(p * 1.3),
                  transform: `translateY(${lerp(0.25, 0, p)}em)`,
                  fontWeight: w.stress ? weight.display : weight.body,
                }}
              >
                {w.word}
              </span>
              {i < c.words.length - 1 ? ' ' : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** The voice, music and UI sounds, for the studio's preview. The renders are muted and mixed by mix.ts with ffmpeg. */
function Sound() {
  return (
    <>
      <Audio src={staticFile('music.wav')} volume={0.9} />
      {voice.lines.map((l) => (
        <Sequence key={l.beat} from={Math.round(l.file_start * FPS)} layout="none">
          <Audio src={staticFile(`voice/${l.file.split('/').at(-1)}`)} />
        </Sequence>
      ))}
      {sfxCues().map((c, i) => (
        <Sequence key={i} from={Math.round(c.start * FPS)} layout="none">
          <Audio src={staticFile(`sfx/${c.name}.wav`)} volume={2} />
        </Sequence>
      ))}
    </>
  )
}

export function Reel({ shape }: { shape: Shape }) {
  return (
    <ShapeContext.Provider value={shape}>
      <AbsoluteFill style={{ background: color.bg, fontFamily: font, color: color.text, overflow: 'hidden' }}>
        <Morphs />
        <Question />
        <Figures />
        <Mark />
        <CheckIn />
        <Slipping />
        <Nudge />
        <Back />
        <Carried />
        <EndCard />
        <Captions />
        <Sound />
      </AbsoluteFill>
    </ShapeContext.Provider>
  )
}

