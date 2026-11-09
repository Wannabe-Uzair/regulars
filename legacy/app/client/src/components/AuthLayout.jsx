import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { t } from '../copy.js'
// Login, signup and invite pages: the lockup and the approved hero on the left (top on phones), the form on the right.
export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <div className="auth-hero">
        <Logo w={220} descriptor />
        <p className="hero" aria-label={t('auth.hero.aria', {}, 'Day 90. Get every new member there.')}>
          <span className="big">{t('auth.hero.day', {}, 'DAY')} <span className="c-yellow">90</span></span>
          {t('auth.hero.line', {}, 'GET EVERY NEW MEMBER THERE.')}
        </p>
      </div>
      <main className="auth-form">{children}</main>
    </div>
  )
}

// The quiet link under an auth form, from one COPY line such as "New gym? Create your account.": the question as
// meta, the rest as the link. A line with no question is all link.
export function AuthAlt({ text, to }) {
  const i = text.indexOf('? ')
  const ask = i < 0 ? '' : text.slice(0, i + 1)
  const link = i < 0 ? text : text.slice(i + 2)
  return (
    <div className="auth-alt">
      {ask && <span className="meta">{ask}</span>}
      <Link className="btn btn-quiet" to={to}>{link}</Link>
    </div>
  )
}
