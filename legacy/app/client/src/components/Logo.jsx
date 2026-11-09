import { T } from '../brand.js'
import { t } from '../copy.js'
// The logo is only ever drawn by TENURE.logo (DESIGN §5). w = word width in px (160 minimum on screen).
export default function Logo({ w = 184, descriptor = false, className = '' }) {
  return <div className={`logo ${className}`} role="img" aria-label={t('a11y.logo')} style={{ width: w }} dangerouslySetInnerHTML={{ __html: T.logo({ w, descriptor }) }} />
}
