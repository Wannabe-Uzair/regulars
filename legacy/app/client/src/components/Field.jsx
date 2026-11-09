import { useId, cloneElement, isValidElement } from 'react'
// <Field label="EMAIL" error="..." hint="..."><Input .../></Field>: wires id, aria-describedby and aria-invalid.
export function Field({ label, error, hint, children }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children, { id: children.props.id || id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })
    : children
  return (
    <div className="field">
      <label className="field-label" htmlFor={isValidElement(children) ? children.props.id || id : undefined}>{label}</label>
      {control}
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
      {error && <p className="field-error" id={errId}>{error}</p>}
    </div>
  )
}
export const Input = ({ className = '', ...p }) => <input className={`input ${className}`} {...p} />
export const Textarea = ({ className = '', ...p }) => <textarea className={`textarea ${className}`} {...p} />
// options: [{ value, label }] or children <option>s
export function Select({ options, className = '', children, ...p }) {
  return <select className={`select ${className}`} {...p}>{options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}</select>
}
export default Field
