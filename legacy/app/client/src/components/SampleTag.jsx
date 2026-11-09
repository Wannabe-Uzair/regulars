// SAMPLE DATA / SAMPLE MESSAGE: sits inside the panel it labels, top right (DESIGN §6).
import { t } from '../copy.js'
export default function SampleTag({ children = t('tag.sample'), className = '' }) {
  return <span className={`sample-tag ${className}`}>{children}</span>
}
