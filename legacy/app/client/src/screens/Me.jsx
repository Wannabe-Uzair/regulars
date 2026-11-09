import { useNavigate } from 'react-router-dom'
import { Button, PageTitle, Panel } from '../components'
import { useMe } from '../api.js'
import { t } from '../copy.js'
import { roleLabel } from '../components/admin/parts.jsx'
import '../components/admin/admin.css'

// Me (SPEC §7 /me, the coach's fourth phone tab): name, email, gym, role and LOG OUT.
export default function Me() {
  const { user, gym, logout } = useMe()
  const navigate = useNavigate()
  const out = async () => { await logout().catch(() => {}); navigate('/login') }
  const facts = [
    [t('me.name', {}, 'NAME'), user?.name],
    [t('me.email', {}, 'EMAIL'), user?.email],
    [t('me.gym', {}, 'GYM'), gym?.name],
    [t('me.role', {}, 'ROLE'), user && roleLabel(user.role)],
  ]
  return (
    <div className="admin me">
      <PageTitle>{t('me.title')}</PageTitle>
      <Panel>
        <dl className="facts">
          {facts.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd className="body">{v || t('common.none')}</dd></div>
          ))}
        </dl>
      </Panel>
      <div><Button onClick={out}>{t('me.logout')}</Button></div>
    </div>
  )
}
