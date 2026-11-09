import Tape from './Tape.jsx'
// Anton page title with the 3-segment floor tape 12 px under it. `sub` = optional one-line meta under the tape.
export default function PageTitle({ children, sub }) {
  return (
    <header className="page-head">
      <h1 className="page-title">{children}</h1>
      <Tape />
      {sub && <p className="meta page-sub">{sub}</p>}
    </header>
  )
}
