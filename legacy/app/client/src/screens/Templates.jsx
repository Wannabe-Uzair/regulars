import { useEffect, useState } from 'react'
import { Button, Dialog, EmptyState, PageTitle, Panel } from '../components'
import { useIsPhone } from '../util.js'
import { useApi, useMe } from '../api.js'
import { t } from '../copy.js'
import TemplateEditor, { VariablesHelp } from '../components/admin/TemplateEditor.jsx'
import { LoadError } from '../components/admin/parts.jsx'
import '../components/admin/admin.css'

// Templates (SPEC §5, §7 /templates). Owner: the list and an editor with a live preview; coach: read only.
export default function Templates() {
  const { role } = useMe()
  return role === 'owner' ? <OwnerTemplates /> : <CoachTemplates />
}

function CoachTemplates() {
  const { data, error } = useApi('/templates')
  return (
    <div className="admin">
      <PageTitle sub={t('templates.readOnly')}>{t('templates.title')}</PageTitle>
      <LoadError error={error} />
      {data && !data.length && <EmptyState title={t('templates.empty')}>{t('templates.emptyBody')}</EmptyState>}
      {data?.length > 0 && (
        <div className="tpl-layout read">
          <ul className="tpl-read">
            {data.map((tpl) => (
              <li key={tpl.id} className="tpl-card">
                <h2 className="label c-chalk">{tpl.name}</h2>
                <p className="body">{tpl.body}</p>
              </li>
            ))}
          </ul>
          <Panel><VariablesHelp /></Panel>
        </div>
      )}
    </div>
  )
}

function OwnerTemplates() {
  const phone = useIsPhone()
  const { data: list, error, setData } = useApi('/templates')
  const sample = useSampleMember()
  // selected: a template id, 'new', or null (nothing open; on desktop the first template opens by default)
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    if (!phone && selected == null && list?.length) setSelected(list[0].id)
  }, [phone, list, selected])

  const current = selected === 'new' ? null : list?.find((x) => x.id === selected)
  const open = selected === 'new' || !!current
  const startNew = () => setSelected('new')
  const onSaved = (tpl) => {
    setData((xs) => (xs.some((x) => x.id === tpl.id) ? xs.map((x) => (x.id === tpl.id ? tpl : x)) : [...xs, tpl]))
    setSelected(phone ? null : tpl.id)
  }
  const onDeleted = (id) => {
    setData((xs) => xs.filter((x) => x.id !== id))
    setSelected(null)
  }
  const editorTitle = current ? current.name : t('templates.new')
  const editor = open && (
    <TemplateEditor key={selected} template={current} sample={sample} onSaved={onSaved} onDeleted={onDeleted} />
  )

  return (
    <div className="admin">
      <PageTitle>{t('templates.title')}</PageTitle>
      <LoadError error={error} />
      {list && !list.length && selected !== 'new' && (
        <EmptyState title={t('templates.empty')} action={{ label: t('templates.new'), onClick: startNew }}>{t('templates.emptyBody')}</EmptyState>
      )}
      {list && (list.length > 0 || selected === 'new') && (
        <div className="tpl-layout">
          <Panel action={<Button block={phone} onClick={startNew}>{t('templates.new')}</Button>}>
            <ul className="tpl-list">
              {list.map((tpl) => (
                <li key={tpl.id}>
                  <button type="button" className="tpl-item" aria-current={tpl.id === selected ? 'true' : undefined} onClick={() => setSelected(tpl.id)}>
                    <span className="label">{tpl.name}</span>
                    <span className="meta">{tpl.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          {!phone && open && <Panel title={editorTitle}>{editor}</Panel>}
        </div>
      )}
      {phone && (
        <Dialog open={open} onClose={() => setSelected(null)} title={editorTitle}>{editor}</Dialog>
      )}
    </div>
  )
}

// The first slipping member, or any member, for the preview.
function useSampleMember() {
  const slipping = useApi('/members?status=slipping')
  const none = slipping.data && !slipping.data.length
  const any = useApi(none ? '/members' : null)
  return slipping.data?.[0] ?? any.data?.[0] ?? null
}
