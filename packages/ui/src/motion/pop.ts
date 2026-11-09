import clsx from 'clsx'
import styles from './pop.module.css'

/**
 * The pop, as a class: the element scales from 1.25 to 1 once, when it mounts, and never under reduced motion. To pop
 * again, remount it (give it a new React key). `<h1 className={popClass}>` on the kiosk welcome; Mark's `fresh` uses it.
 */
export const popClass: string = clsx(styles.pop)
