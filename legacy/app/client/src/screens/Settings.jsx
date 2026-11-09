import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PageTitle } from '../components'
import { useApi } from '../api.js'
import { t } from '../copy.js'
import { GymPanel, KioskPanel, LoadError, PhonePanel, StaffPanel } from '../components/admin/SettingsPanels.jsx'
import ImportPanel from '../components/admin/ImportPanel.jsx'
import '../components/admin/admin.css'

// Settings (owner, COPY §11): gym name and timezone, staff and invites, open on a phone, kiosk, import.
export default function Settings() {
  const { data, error, setData } = useApi('/settings')
  const { hash } = useLocation()
  // /settings#import (the empty Today screen links here): the section only exists once the settings have loaded.
  useEffect(() => { if (data && hash === '#import') document.getElementById('import')?.scrollIntoView() }, [data, hash])
  return (
    <div className="admin">
      <PageTitle>{t('settings.title')}</PageTitle>
      <LoadError error={error} />
      {data && (
        <div className="admin-grid">
          <GymPanel settings={data} onSaved={setData} />
          <StaffPanel />
          <PhonePanel urls={data.phoneUrls} />
          <KioskPanel url={data.kioskUrl} />
          <div className="span-2" id="import" style={{ scrollMarginTop: 16 }}><ImportPanel /></div>
        </div>
      )}
    </div>
  )
}
