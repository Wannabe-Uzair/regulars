import { useBarTitle } from './bar-title.ts'
import { usePageTitle } from './page.ts'
import styles from './PageTitle.module.css'

/**
 * A screen's h1, which also names the browser tab ("Board · Regulars"). After a navigation, focus lands on it. On a
 * phone it is the large title, which tucks into the shell's top bar as you scroll (bar-title.ts).
 */
export function PageTitle({ title }: { title: string }) {
  usePageTitle(title)
  const heading = useBarTitle(title)
  return (
    <h1 ref={heading} className={styles.title}>
      {title}
    </h1>
  )
}
