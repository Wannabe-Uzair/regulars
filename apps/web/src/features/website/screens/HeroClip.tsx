import { t } from '@tenure/copy'
import { useMediaQuery } from '@tenure/ui'
import styles from './HeroClip.module.css'

/**
 * The clips, rendered by marketing/reel-remotion/build-hero.sh into public/media at 2x: the laptop's table from 48rem
 * (where the board takes its table), the phone's two-line rows below it. Each size is the board card's on the page (at
 * 1280 x 800 and 390 x 844), so the clip sits exactly where the board was.
 */
const CLIPS = {
  wide: { width: 896, height: 421 },
  phone: { width: 358, height: 580 },
} as const

/**
 * The home hero's board, "the board coming alive" (Uzair, on the Mac mini): a muted 9-second loop that plays inline at
 * once, its first frame as the poster until it does. It is the page's one picture of the product: the wrapper is
 * its image for assistive technology, named by the board's description, and the media inside is hidden. It has no controls. Under reduced motion the page shows the poster alone, with no video: a
 * video has no motion tokens to zero (ARCHITECTURE §9, "Reduced motion"). Its box keeps the clip's shape before the
 * file loads, so nothing shifts.
 */
export function HeroClip({ className }: { className?: string }) {
  const wide = useMediaQuery('(min-width: 48rem)')
  const still = useMediaQuery('(prefers-reduced-motion: reduce)')
  const shape = wide ? 'wide' : 'phone'
  const { width, height } = CLIPS[shape]
  const src = `/media/hero-board-${shape}`
  const props = {
    className: `${styles.clip} ${styles[shape]}`,
    width,
    height,
    style: { aspectRatio: `${width} / ${height}` },
    'aria-hidden': true,
  } as const
  const media = still ? (
    <img {...props} src={`${src}.webp`} alt="" />
  ) : (
    <video
      {...props}
      // A new shape loads its own clip.
      key={shape}
      // React sets `muted` as a property only; the attribute too keeps every Safari's autoplay rule satisfied.
      ref={(video) => {
        if (video) video.defaultMuted = true
      }}
      poster={`${src}.webp`}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
    >
      <source src={`${src}.mp4`} type="video/mp4" />
      <source src={`${src}.webm`} type="video/webm" />
    </video>
  )
  return (
    <div role="img" aria-label={t('home.board.aria')} className={className}>
      {media}
    </div>
  )
}
