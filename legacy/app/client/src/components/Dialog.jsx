import { useEffect, useId, useRef } from 'react'
import { t } from '../copy.js'
// <Dialog open onClose title="NUDGE SAM O." actions={<Button/>}>…</Dialog>
// Native <dialog> (focus trap, Esc, inert page). Centred 560 px panel over rubber at 80%; a bottom sheet on phones.
export default function Dialog({ open, onClose, title, children, actions }) {
  const ref = useRef(null)
  const tid = useId()
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose?.() }}
      onClick={(e) => { if (e.target === ref.current) onClose?.() }} aria-labelledby={title ? tid : undefined}>
      {open && (
        <div className="dialog-inner">
          <div className="dialog-head">
            {title && <h2 className="section-title" id={tid}>{title}</h2>}
            <button type="button" className="btn btn-quiet" onClick={onClose}>{t('common.close', {}, 'CLOSE')}</button>
          </div>
          {children}
          {actions && <div className="dialog-actions">{actions}</div>}
        </div>
      )}
    </dialog>
  )
}
