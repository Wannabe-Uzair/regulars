import clsx from 'clsx'
import { useId, type ComponentProps } from 'react'
import styles from './MeshBackground.module.css'

/** `site` is the colour-round mesh of the website and sign-in screens; `kiosk` is the kiosk's own blend. */
export type MeshPattern = 'site' | 'kiosk'

export type MeshBackgroundProps = ComponentProps<'div'> & {
  /** Defaults to `site`. */
  pattern?: MeshPattern
}

/**
 * The blended ground for the website, the sign-in screens and the kiosk: a pattern on the theme roles under fine grain.
 * `site` blends `bg` into `bg-alt`, the colour-round recipe; `kiosk` is N1 "Soft corners", which draws a different
 * pattern in each theme. Both layers are decorative; the children sit above them.
 */
export function MeshBackground({ pattern = 'site', className, children, ...rest }: MeshBackgroundProps) {
  // useId output is not a safe url(#…) fragment in every React version, so keep letters and digits only.
  const grainId = `tenure-grain-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <div {...rest} className={clsx(styles.root, className)}>
      <div
        className={clsx(styles.mesh, pattern === 'kiosk' && styles.kiosk)}
        data-pattern={pattern}
        aria-hidden="true"
      />
      <svg className={styles.grain} aria-hidden="true" focusable="false">
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" fill="transparent" filter={`url(#${grainId})`} />
      </svg>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
