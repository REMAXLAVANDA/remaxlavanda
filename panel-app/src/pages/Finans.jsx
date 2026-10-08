import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { canManageBankaHareketleri } from '../lib/bankaHareketleri'
import CiroRaporlariPanel from '../components/finans/CiroRaporlariPanel'
import BankaHareketleriPanel from '../components/finans/BankaHareketleriPanel'

// Ciro Raporları ve Banka Hareketleri tek sayfada, sekmeli — broker
// eşleştirme yaparken ikisi arasında gidip gelmesin diye (2026-10-09
// broker isteği: "eşleştirme yapacağız, aynı sayfada konumlandırsak daha
// mantıklı"). Danışman Banka Hareketleri sekmesini hiç görmüyor (yetkisi
// yok, bkz. lib/bankaHareketleri.js canManageBankaHareketleri).
const TABS = [
  { key: 'ciro', label: 'Ciro Raporları' },
  { key: 'banka', label: 'Banka Hareketleri' },
]

export default function Finans() {
  const { role } = useAuth()
  const [tab, setTab] = useState('ciro')
  const showBankaTab = canManageBankaHareketleri(role)
  const visibleTabs = showBankaTab ? TABS : TABS.filter((t) => t.key === 'ciro')

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-text-primary">Finans</h1>

      {visibleTabs.length > 1 && (
        <div className="mb-5 flex gap-1 border-b border-border-default">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {(!showBankaTab || tab === 'ciro') && <CiroRaporlariPanel />}
      {showBankaTab && tab === 'banka' && <BankaHareketleriPanel />}
    </div>
  )
}
