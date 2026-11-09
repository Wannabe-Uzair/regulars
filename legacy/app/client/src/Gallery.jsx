// /_kit — every component with fixture data (dev only). This is how the look is checked against DESIGN §12.
import { useState } from 'react'
import { AuthContext } from './api.js'
import { T } from './brand.js'
import { useIsPhone } from './util.js'
import {
  AppShell, PageTitle, Kpi, Button, Field, Input, Select, StatusTag, Panel, useToast, Dialog, EmptyState, SampleTag,
  MemberRow, MemberCard, Board, Legend, DaysGrid, LineChart, Tape,
} from './components'
import * as F from './fixtures.js'

export default function Gallery() {
  const [role, setRole] = useState('owner')
  const user = role === 'owner' ? F.OWNER : F.COACH_USER
  const auth = { status: 'in', user, gym: F.GYM, role, ensure() {}, refresh() {}, async logout() {}, setGym() {} }
  return (
    <AuthContext.Provider value={auth}>
      <AppShell user={user} gym={F.GYM}><Kit role={role} setRole={setRole} /></AppShell>
    </AuthContext.Provider>
  )
}

function Sec({ n, title, children }) {
  return <section className="kit-sec"><div className="label">{n} — {title}</div>{children}</section>
}

function Kit({ role, setRole }) {
  const phone = useIsPhone()
  const toast = useToast()
  const [dialog, setDialog] = useState(false)
  const [slam, setSlam] = useState(null)
  const nudge = (m) => toast(`NUDGE FOR ${m.name.toUpperCase()}`)
  const checkIn = () => {
    setSlam({ memberId: 6, key: Date.now() })
    toast('SAM O. CHECKED IN')
  }
  return (
    <>
      <PageTitle sub="Component gallery. Fixture data from the expo kit's sample members.">THE KIT</PageTitle>
      <div className="btn-row">
        <Button variant={role === 'owner' ? 'primary' : 'secondary'} onClick={() => setRole('owner')}>VIEW AS OWNER</Button>
        <Button variant={role === 'coach' ? 'primary' : 'secondary'} onClick={() => setRole('coach')}>VIEW AS COACH</Button>
      </div>

      <Sec n="01" title="TYPE">
        <div className="stack">
          <h2 className="section-title">SECTION TITLE</h2>
          <div className="kpi-num tone-on">58%</div>
          <div className="action-name">SAM O.</div>
          <div className="label">LABEL · NAV · BUTTON</div>
          <p className="body">Tenure watches every new member's first 90 days, flags anyone who drops below the line, and lets you nudge them back in one tap.</p>
          <p className="meta">Meta text: last visit 11 days ago · Week 4 · Coach Mike R.</p>
          <p className="data">3.3/WK · 12 · NOV 6</p>
        </div>
      </Sec>

      <Sec n="02" title="BUTTONS">
        <div className="btn-row">
          <Button>PRIMARY</Button>
          <Button variant="secondary">SECONDARY</Button>
          <Button variant="quiet">QUIET</Button>
          <Button disabled>DISABLED</Button>
          <Button nudge onClick={() => toast('NUDGE')} />
          <Button variant="secondary" className="is-focus">FOCUSED</Button>
        </div>
      </Sec>

      <Sec n="03" title="INPUTS">
        <div className="grid-3">
          <Field label="EMAIL"><Input type="email" placeholder="you@gym.com" /></Field>
          <Field label="PHONE" error="Enter a 10-digit US number."><Input defaultValue="312 555" /></Field>
          <Field label="COACH" hint="Who nudges this member.">
            <Select options={[{ value: 1, label: 'Mike R.' }, { value: 2, label: 'Priya S.' }, { value: 3, label: 'Jordan T.' }]} />
          </Field>
          <Field label="FOCUSED"><Input className="is-focus" defaultValue="Focus outline: 2 px yellow, 2 px offset" /></Field>
        </div>
      </Sec>

      <Sec n="04" title="TAGS AND TAPE">
        <div className="kit-row">
          <StatusTag status="slipping" /><StatusTag status="on" /><StatusTag status="below" /><StatusTag status="new" />
          <SampleTag /><SampleTag>SAMPLE MESSAGE</SampleTag>
        </div>
        <div className="kit-row"><Tape style={{ '--tw': '250px', '--th': '9px' }} /><Tape filled={23 / 30} style={{ '--tw': '250px', '--th': '9px' }} /></div>
      </Sec>

      <Sec n="05" title="TODAY: KPIS AND SLIPPING NOW">
        <div className="grid-4">
          <Kpi label="NEW MEMBERS" value={F.TODAY.kpis.newMembers} />
          <Kpi label="ON THE LINE" value={F.TODAY.kpis.onTheLinePct} suffix="%" tone="on" />
          <Kpi label="SLIPPING" value={F.TODAY.kpis.slipping} tone="slipping" />
          <Kpi label="NUDGED THIS WEEK" value={F.TODAY.kpis.nudgedThisWeek} />
        </div>
        <Panel title="SLIPPING NOW" hazard sample>
          {phone
            ? <ul className="member-cards">{F.SLIPPING.map((m) => <MemberCard key={m.id} member={m} onNudge={nudge} />)}</ul>
            : <ul className="list">{F.SLIPPING.map((m) => <MemberRow key={m.id} member={m} onNudge={nudge} />)}</ul>}
        </Panel>
        <Panel title="CHECKED IN TODAY" sample>
          <ul className="list">{F.MEMBERS.filter((m) => m.status !== 'slipping').slice(0, 3).map((m) => <MemberRow key={m.id} member={m} />)}</ul>
        </Panel>
        <Panel title="PHONE CARDS" sample>
          <ul className="member-cards">{F.MEMBERS.slice(3, 6).map((m) => <MemberCard key={m.id} member={m} onNudge={nudge} />)}</ul>
        </Panel>
      </Sec>

      <Sec n="06" title="THE 90-DAY BOARD">
        <Panel sample action={<Button variant="secondary" onClick={checkIn}>SIMULATE A CHECK-IN</Button>}>
          <Board members={F.BOARD} highlightId={6} onNudge={nudge} slam={slam} />
          <Legend />
        </Panel>
        {!phone && (
          <Panel title="KIT.BOARD REFERENCE" sample>
            <p className="meta" style={{ marginBottom: 16 }}>The expo kit's SVG at the same width, for comparing geometry.</p>
            <div dangerouslySetInnerHTML={{ __html: T.board({ w: 1000 }) }} />
          </Panel>
        )}
      </Sec>

      <Sec n="07" title="ONE MEMBER'S 90 DAYS">
        <div className="grid-2">
          <Panel sample><div className="label kit-cap" style={{ marginBottom: 12 }}>A MEMBER WHO STAYS</div><DaysGrid days={F.STAYER_DAYS} /></Panel>
          <Panel sample><div className="label kit-cap" style={{ marginBottom: 12 }}>A MEMBER WHO SLIPS · DAY 40</div><DaysGrid days={F.SLIPPER_DAYS} daysSinceJoin={40} /></Panel>
        </div>
      </Sec>

      <Sec n="08" title="CHART">
        <Panel title="VISITS BY WEEK" sample><LineChart data={F.VISITS_BY_WEEK} /></Panel>
      </Sec>

      <Sec n="09" title="EMPTY STATE, TOAST, DIALOG">
        <div className="grid-2">
          <Panel><EmptyState title="NO MEMBERS YET" action={{ label: 'IMPORT YOUR MEMBERS', onClick: () => toast('IMPORT') }}>Import a CSV from your gym software to fill the board.</EmptyState></Panel>
          <Panel>
            <div className="btn-row">
              <Button variant="secondary" onClick={() => toast('SAM O. CHECKED IN')}>SHOW A TOAST</Button>
              <Button variant="secondary" onClick={() => setDialog(true)}>OPEN A DIALOG</Button>
            </div>
          </Panel>
        </div>
        <Dialog open={dialog} onClose={() => setDialog(false)} title="NUDGE SAM O."
          actions={<><Button onClick={() => setDialog(false)}>COPY TEXT</Button><Button variant="secondary" onClick={() => setDialog(false)}>MARK AS SENT</Button></>}>
          <div className="stack" style={{ gap: 14 }}>
            <SampleTag>SAMPLE MESSAGE</SampleTag>
            <p className="body">Hey Sam, we missed you this week. Want me to save you a spot in Thursday's 6 pm class? — Coach Mike</p>
          </div>
        </Dialog>
      </Sec>
    </>
  )
}
