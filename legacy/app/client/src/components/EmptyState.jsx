import Button from './Button.jsx'
// An Anton section title, one sentence, one primary button ({ label, to } or { label, onClick }).
export default function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <h2 className="section-title">{title}</h2>
      {children && <p className="body">{children}</p>}
      {action && <Button to={action.to} onClick={action.onClick}>{action.label}</Button>}
    </div>
  )
}
