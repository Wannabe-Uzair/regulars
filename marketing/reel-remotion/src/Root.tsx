import { cancelRender, Composition, continueRender, delayRender, staticFile } from 'remotion'
import { HERO, HeroBoard } from './hero/HeroBoard.tsx'
import { Reel } from './Reel.tsx'
import { FPS, FRAMES } from './theme.ts'

/** Inter 4 from the repo (packages/ui/src/fonts/InterVariable.woff2), loaded before any frame is taken. */
const fontHandle = delayRender('Inter')
const inter = new FontFace('Inter', `url(${staticFile('fonts/InterVariable.woff2')}) format('woff2')`, {
  weight: '100 900',
})
inter
  .load()
  .then((f) => {
    document.fonts.add(f)
    continueRender(fontHandle)
  })
  // A missing font stops the render at once, not after delayRender's timeout.
  .catch((err: unknown) => cancelRender(err))

const Wide = () => <Reel shape="wide" />
const Tall = () => <Reel shape="tall" />
const HeroWide = ({ sample }: { sample: boolean }) => <HeroBoard shape="wide" sample={sample} />
const HeroPhone = ({ sample }: { sample: boolean }) => <HeroBoard shape="phone" sample={sample} />
const heroFrames = HERO.fps * HERO.seconds

export function Root() {
  return (
    <>
      <Composition id="Reel16x9" component={Wide} width={1920} height={1080} fps={FPS} durationInFrames={FRAMES} />
      <Composition id="Reel9x16" component={Tall} width={1080} height={1920} fps={FPS} durationInFrames={FRAMES} />
      {/* The home hero's clip (build-hero.sh renders each at 2x): the card at its size on the page, laptop and phone. */}
      <Composition
        id="HeroBoardWide"
        component={HeroWide}
        {...HERO.size.wide}
        fps={HERO.fps}
        durationInFrames={heroFrames}
        defaultProps={{ sample: false }}
      />
      <Composition
        id="HeroBoardPhone"
        component={HeroPhone}
        {...HERO.size.phone}
        fps={HERO.fps}
        durationInFrames={heroFrames}
        defaultProps={{ sample: false }}
      />
    </>
  )
}
