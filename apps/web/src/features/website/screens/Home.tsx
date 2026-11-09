import { t } from '@tenure/copy'
import { buttonClass, type ButtonSize, Logo } from '@tenure/ui'
import { useId } from 'react'
import { Link } from 'react-router'
import { usePageTitle } from '../../../shared/page/page.ts'
import { useDemoStatus } from '../stall/api.ts'
import { ResetDemo, TryDemo } from '../stall/StallDemo.tsx'
import { HeroClip } from './HeroClip.tsx'
import styles from './Home.module.css'

/** The three sourced figures, each with the number of the source it cites in the footer (VISITOR-QA.md's figures). */
const FIGURES = [
  { value: 'home.fig.quit.value', label: 'home.fig.quit.label', source: 1 },
  { value: 'home.fig.stay.value', label: 'home.fig.stay.label', source: 2 },
  { value: 'home.fig.fade.value', label: 'home.fig.fade.label', source: 2 },
] as const

const SOURCES = ['home.source.1', 'home.source.2'] as const

/** The page's ways in at one size: Try the Demo in stall mode; outside it, Set Up Your Gym and (but in the close) Log In. */
function Actions({
  stall,
  size,
  login = true,
}: {
  stall: boolean
  size: Extract<ButtonSize, 'sm' | 'lg'>
  login?: boolean
}) {
  if (stall) return <TryDemo size={size} />
  return (
    <div className={size === 'sm' ? styles.barActions : styles.actions}>
      <Link className={buttonClass({ variant: 'primary', size })} to="/signup">
        {t('home.start')}
      </Link>
      {login && (
        <Link className={buttonClass({ variant: 'secondary', size })} to="/login">
          {t('home.login')}
        </Link>
      )}
    </div>
  )
}

/**
 * Holds a way in's place while the stall question is open: an unseen Try the Demo at the same size, the stall's one
 * button, so the bar, the hero and the close keep the height they land at and nothing moves when the answer comes
 * (B2-04). Hidden from everyone, it takes no tap or focus.
 */
function Held({ size }: { size: Extract<ButtonSize, 'sm' | 'lg'> }) {
  return (
    <span className={`${buttonClass({ variant: 'primary', size })} ${styles.held}`} aria-hidden="true">
      {t('demo.try')}
    </span>
  )
}

/**
 * The website's home, a product page (home-1, FR-WEB-01): a sticky opaque bar with the mark, the name and the way in;
 * a centred hero that sets the name over the headline, its line, the way in and the free pilot with no price; the
 * floating board (a rendered clip, "the board coming alive", its still under reduced motion) across the edge from
 * the white hero to the grey ground; the sourced figures with their footnotes; the way in again; and a footer with the sources, what the app never does and, in stall mode, Reset the Demo (flow-1A).
 * In stall mode there is no sign-up or log-in, since a gym set up on the offline stall laptop reaches no one: Try the
 * Demo is the one filled button, in the bar, the hero and the close, the three named alike. No button shows until the
 * stall question is answered, so the sign-up never flashes on the stall; until then each place holds an unseen Try the
 * Demo (Held). It imports nothing of the app under /app, so it loads without the app's code (FR-WEB-05). Its tab title
 * is the brand name alone.
 */
export default function Home() {
  usePageTitle()
  const demo = useDemoStatus()
  const answered = !demo.isPending
  const stall = demo.data?.stall === true
  const heroId = useId()
  const figuresId = useId()
  const closeId = useId()
  const sourcesId = useId()
  return (
    <div className={styles.ground}>
      <header className={styles.bar}>
        <div className={`${styles.page} ${styles.barRow}`}>
          <Logo name={t('brand.name')} />
          {answered ? <Actions stall={stall} size="sm" /> : <Held size="sm" />}
        </div>
      </header>
      <main>
        <section className={styles.hero} aria-labelledby={heroId}>
          <div className={`${styles.page} ${styles.heroWords}`}>
            <p className={styles.brand}>{t('brand.name')}</p>
            <h1 id={heroId} className={styles.title}>
              {t('home.title')}
            </h1>
            <p className={styles.lede}>{t('home.lede')}</p>
            {answered ? <Actions stall={stall} size="lg" /> : <Held size="lg" />}
            <p className={styles.offer}>{t('home.offer')}</p>
          </div>
        </section>
        <div className={styles.band}>
          <div className={styles.page}>
            <HeroClip className={styles.board} />
          </div>
        </div>
        <section className={styles.figures} aria-labelledby={figuresId}>
          <div className={styles.page}>
            <h2 id={figuresId} className={styles.heading}>
              {t('home.figures.title')}
            </h2>
            <ul className={styles.figureList}>
              {FIGURES.map((figure) => (
                <li key={figure.value} className={styles.figure}>
                  <p className={styles.value}>{t(figure.value)}</p>
                  <p className={styles.label}>
                    {t(figure.label)}
                    <sup className={styles.footnote}>
                      <a href={`#source-${figure.source}`} aria-label={t('a11y.footnote', { n: figure.source })}>
                        {figure.source}
                      </a>
                    </sup>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className={styles.close} aria-labelledby={closeId}>
          <div className={`${styles.page} ${styles.closeWords}`}>
            <h2 id={closeId} className={styles.heading}>
              {t('home.close.title')}
            </h2>
            {answered ? <Actions stall={stall} size="lg" login={false} /> : <Held size="lg" />}
            <p className={styles.offer}>{t('home.offer')}</p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.page} ${styles.footerColumn}`}>
          <h2 id={sourcesId} className={styles.sourcesTitle}>
            {t('home.sources.title')}
          </h2>
          <ol className={styles.sources} aria-labelledby={sourcesId}>
            {SOURCES.map((source, i) => (
              <li key={source} id={`source-${i + 1}`}>
                {t(source)}
              </li>
            ))}
          </ol>
          <div className={styles.footerRow}>
            <div className={styles.notes}>
              <p>{t('home.footer.never')}</p>
              <p>{t('home.footer.sample')}</p>
            </div>
            <ResetDemo />
          </div>
        </div>
      </footer>
    </div>
  )
}
