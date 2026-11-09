import Hazard from './Hazard.jsx'
import SampleTag from './SampleTag.jsx'
// <Panel title="SLIPPING NOW" hazard sample action={<Button/>}>…</Panel>. rubber2, no border, 24 px padding (20 on phones).
export default function Panel({ title, hazard, sample, action, as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={`panel${hazard ? ' panel-hazard' : ''} ${className}`.trim()} {...rest}>
      {hazard && <Hazard />}
      {(title || sample || action) && (
        <div className="panel-head">
          {title && <h2 className="section-title">{title}</h2>}
          {action}
          {sample && <SampleTag>{sample === true ? undefined : sample}</SampleTag>}
        </div>
      )}
      {children}
    </Tag>
  )
}
