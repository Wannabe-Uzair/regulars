import { Link } from 'react-router-dom'
import { t } from '../copy.js'
// <Button variant="primary|secondary|quiet" to="/path" | href | onClick> · <Button nudge> renders NUDGE → (arrow in Anton).
export default function Button({ variant = 'primary', block, nudge, to, href, className = '', children, type = 'button', ...rest }) {
  const cls = `btn btn-${variant}${block ? ' btn-block' : ''} ${className}`.trim()
  const content = nudge ? <>{t('member.nudge').replace(/\s*→\s*$/, '')} <span className="arrow" aria-hidden="true">→</span></> : children
  const label = nudge && !rest['aria-label'] ? { 'aria-label': t('a11y.nudge', {}, 'Nudge') } : {}
  if (to) return <Link className={cls} to={to} {...label} {...rest}>{content}</Link>
  if (href) return <a className={cls} href={href} {...label} {...rest}>{content}</a>
  return <button className={cls} type={type} {...label} {...rest}>{content}</button>
}
