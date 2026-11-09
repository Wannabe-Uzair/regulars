// Small pieces shared by the admin screens (Templates, Reports, Billing, Settings, Me).
import { Button, Dialog } from '../index.js'
import { t } from '../../copy.js'
import './admin.css'

// A section title with its one explaining sentence, for sections that sit outside a panel.
export function Section({ title, explain, children, className = '' }) {
  return (
    <section className={`admin-sec ${className}`.trim()}>
      <div className="admin-sec-head">
        <h2 className="section-title">{title}</h2>
        {explain && <p className="meta">{explain}</p>}
      </div>
      {children}
    </section>
  )
}

// What a screen shows when its data didn't load: the server's sentence, as given.
export function LoadError({ error }) {
  if (!error) return null
  return <p className="body load-error" role="alert">{error.message || t('err.server')}</p>
}

// A yes/no dialog: the confirm button is the primary, CANCEL the secondary.
export function ConfirmDialog({ open, title, children, confirm, onConfirm, onClose, busy, error }) {
  return (
    <Dialog open={open} onClose={onClose} title={title}
      actions={<>
        <Button onClick={onConfirm} disabled={busy}>{confirm}</Button>
        <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
      </>}>
      <p className="body">{children}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Dialog>
  )
}

// A QR code for one of this gym's phone or kiosk URLs (GET /api/qr returns SVG; dark modules on a chalk tile).
export function Qr({ url }) {
  return (
    <div className="qr">
      <img src={`/api/qr?text=${encodeURIComponent(url)}`} alt={t('phone.qr', { url })} width="136" height="136" />
    </div>
  )
}

// Copies text; falls back to a hidden textarea where the async clipboard isn't available (plain http on a LAN IP).
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through */ }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  ta.remove()
  return ok
}

// "Aug 2026" from "2026-08".
export function monthLabel(ym) {
  const [y, m] = String(ym).split('-').map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 15).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// The role word for a user (OWNER / COACH).
export const roleLabel = (role) => (role === 'owner' ? t('role.owner', {}, 'OWNER') : t('role.coach', {}, 'COACH'))
