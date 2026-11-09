import clsx from 'clsx'
import { useId, type ComponentProps, type ReactNode } from 'react'
import styles from './Panel.module.css'

export type HeadingLevel = 2 | 3 | 4

export type PanelProps = Omit<ComponentProps<'section'>, 'aria-labelledby'> & {
  /** The panel's title. With `landmark`, it also names the region. */
  heading: ReactNode
  /**
   * Makes the panel a `<section>` named by its heading, so it is a region landmark. Defaults to false: most panels are
   * parts of one page, and a landmark for each would crowd the landmark list. Keep it for the few worth jumping to.
   */
  landmark?: boolean
  /** Defaults to 2. */
  headingLevel?: HeadingLevel
  /** Buttons or links at the end of the header. */
  actions?: ReactNode
}

/** A card-like block with a header (heading and actions) and a body. */
export function Panel({
  heading,
  headingLevel = 2,
  landmark = false,
  actions,
  className,
  children,
  ...rest
}: PanelProps) {
  const headingId = useId()
  const Heading = `h${headingLevel}` as const
  // A div takes every attribute a section does; the cast only keeps the section's ref type.
  const Root = (landmark ? 'section' : 'div') as 'section'

  return (
    <Root {...rest} aria-labelledby={landmark ? headingId : undefined} className={clsx(styles.panel, className)}>
      {/* A div, not <header>: outside a section, <header> can be read as the page's banner landmark. */}
      <div className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {heading}
        </Heading>
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.body}>{children}</div>
    </Root>
  )
}
