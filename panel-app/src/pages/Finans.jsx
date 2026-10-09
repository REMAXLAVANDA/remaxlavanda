import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { canManageBankaHareketleri } from '../lib/bankaHareketleri'
import CiroRaporlariPanel from '../components/finans/CiroRaporlariPanel'
import BankaHareketleriPanel from '../components/finans/BankaHareketleriPanel'
import MasraflarPanel from '../components/finans/MasraflarPanel'
import CariHesapPanel from '../components/finans/CariHesapPanel'

// Finans TEK menü girdisi, sekmeli — önceden Banka Hareketleri/Masraflar/
// Cari Hesap ayrı sidebar maddeleriydi, broker "yanlış kurgu, hepsi
// Finans'ın içine gömülsün" dedi (2026-10-09). Banka/Masraflar SADECE
// broker'a açık (2026-10-09: "owner sadece ciro ve cari kısmını görsün" —
// bkz. lib/bankaHareketleri.js canManageBankaHareketleri). Cari Hesap
// sekmesi İSTİSNA: danışman da görür ama sadece kendi bakiyesini,
// salt-okunur (2026-10-09 broker kararı: "kendininkini görsün cari
// alacak borcu") — ayrım CariHesapPanel'in içinde (lib/cariHesap.js
// canManageCariHesap, hâlâ broker/owner).
const TABS = [
  { key: 'ciro', label: 'Ciro Raporları' },
  { key: 'banka', label: 'Banka Hareketleri' },
  { key: 'masraflar', label: 'Masraflar' },
  { key: 'cari', label: 'Cari Hesap' },
]

export default function Finans() {
  const { role } = useAuth()
  const [tab, setTab] = useState('ciro')
  const showBrokerOnlyTabs = canManageBankaHareketleri(role)
  const visibleTabs = showBrokerOnlyTabs ? TABS : TABS.filter((t) => t.key === 'ciro' || t.key === 'cari')

  return (
    <div>
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

      {tab === 'ciro' && <CiroRaporlariPanel />}
      {showBrokerOnlyTabs && tab === 'banka' && <BankaHareketleriPanel />}
      {showBrokerOnlyTabs && tab === 'masraflar' && <MasraflarPanel />}
      {tab === 'cari' && <CariHesapPanel />}
    </div>
  )
}
