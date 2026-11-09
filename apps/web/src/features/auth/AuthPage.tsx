import { t } from '@tenure/copy'
import { Button, buttonClass, Card, Logo, MeshBackground } from '@tenure/ui'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useDemoStatus, useTryDemo } from '../../shared/demo/demo.ts'
import { usePageTitle } from '../../shared/page/page.ts'
import { returnTo } from '../../shared/session/session.ts'
import { useQuietSession } from './api.ts'
import styles from './AuthPage.module.css'

type Props = {
  title: string
  /** The line under the title, if the page has one: Log In has none, since the tagline already sits above its title. */
  lede?: string
  /** The way to the other screen: `text` is the prompt, and `link` labels the small secondary-button link after it. */
  other: { to: string; text: string; link: string }
  /** A form taller than a laptop's screen (Set Up): the card starts at the top margin rather than a little above the middle. */
  long?: boolean
  /** At the stall: `demo` puts Try the Demo in the link's place (Log In); `home` sends the visitor to the home page (Set Up Your Gym). */
  atTheStall: 'demo' | 'home'
  children: ReactNode
}

/**
 * The frame for /login and /signup: one card on the blended background, its top edge fixed so an error grows it downwards, with the logo
 * and the tagline under it, the title (and on Set Up its line), the form, then the prompt and the button-styled link to the other
 * screen. At the stall a new gym set up on the offline laptop reaches no one, so there is no way to sign up (`atTheStall`); what the
 * stall changes waits for the stall question, so the sign-up never flashes there. The frame alone asks that question: a form that asked
 * it too would remount the frame each time it was asked again. A visitor who is already signed in goes straight into the app (asked
 * quietly: see useQuietSession).
 */
export function AuthPage({ title, lede, other, long = false, atTheStall, children }: Props) {
  const session = useQuietSession()
  const demo = useDemoStatus()
  const location = useLocation()
  usePageTitle(title)
  if (session.data) return <Navigate to={returnTo(location.state)} replace />
  if (atTheStall === 'home' && demo.isPending) return null
  if (atTheStall === 'home' && demo.data?.stall) return <Navigate to="/" replace />
  return (
    <MeshBackground className={long ? `${styles.ground} ${styles.long}` : styles.ground}>
      <main className={styles.main}>
        <Card className={styles.card}>
          <div className={styles.head}>
            <div className={styles.brand}>
              <Logo name={t('brand.name')} />
              <p className={styles.descriptor}>{t('brand.tagline')}</p>
            </div>
            <h1 className={styles.title}>{title}</h1>
            {lede !== undefined && <p className={styles.lede}>{lede}</p>}
          </div>
          {children}
          {demo.isPending ? (
            <div className={styles.slot} aria-hidden="true" />
          ) : demo.data?.stall && atTheStall === 'demo' ? (
            <TryDemo />
          ) : (
            <div className={styles.other}>
              <p className={styles.prompt}>{other.text}</p>
              <Link className={buttonClass({ variant: 'secondary' })} to={other.to}>
                {other.link}
              </Link>
            </div>
          )}
        </Card>
      </main>
    </MeshBackground>
  )
}

/** At the stall: signs in as the demo gym's owner and opens Today, as the home page's button does. A failure shows under it. */
function TryDemo() {
  const tryDemo = useTryDemo()
  return (
    <div className={styles.demo}>
      <Button variant="secondary" loading={tryDemo.isPending} onClick={() => tryDemo.mutate()}>
        {t('demo.try')}
      </Button>
      <FormError message={tryDemo.error?.message} submittedAt={tryDemo.submittedAt} />
    </div>
  )
}

/** The line above the submit button for a failure that belongs to no field. Keyed per submit, so a repeat is read again. */
export function FormError({ message, submittedAt }: { message: string | undefined; submittedAt: number }) {
  if (message === undefined) return null
  return (
    <p key={submittedAt} className={styles.formError} role="alert">
      {message}
    </p>
  )
}
