import clsx from 'clsx'
import styles from './TextLink.module.css'

/** The look of a link inside a sentence: `<Link className={textLinkClass} …>`. A link on its own takes `buttonClass`. */
export const textLinkClass: string = clsx(styles.textLink)
