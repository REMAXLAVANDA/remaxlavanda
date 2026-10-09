import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { canManageBankaHareketleri } from '../lib/bankaHareketleri'
import CiroRaporlariPanel from '../components/finans/CiroRaporlariPanel'
import BankaHareketleriPanel from '../components/finans/BankaHareketleriPanel'
import MasraflarPanel from '../components/finans/MasraflarPanel'
import CariHesapPanel from '../components/finans/CariHesapPanel'

// Finans artık TEK menü girdisi, sekmeli — önceden Banka Hareketleri/
// Masraflar/Cari Hesap ayrı sidebar maddeleriydi, broker "yanlış kurgu,
// hepsi Finans'ın içine gömülsün" dedi (2026-10-09). Banka/Masraflar/
// Cari sekmeleri hep aynı role açık (bkz. lib/bankaHareketleri.js
// canManageBankaHareketleri) — tek kontrolle hepsi birlikte gizlenir.
// Danışman sadece Ciro Raporları sekmesini görür (kendi cirosunu girer).
const TABS = [
  { key: 'ciro', label: 'Ciro Raporları' },
  { key: 'banka', label: 'Banka Hareketleri' },
  { key: 'masraflar', label: 'Masraflar' },
  { key: 'cari', label: 'Cari Hesap' },
]

export default function Finans() {
  const { role } = useAuth()
  const [tab, setTab] = useState('ciro')
  const showYonetimTabs = canManageBankaHareketleri(role)
  const visibleTabs = showYonetimTabs ? TABS : TABS.filter((t) => t.key === 'ciro')

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

      {(!showYonetimTabs || tab === 'ciro') && <CiroRaporlariPanel />}
      {showYonetimTabs && tab === 'banka' && <BankaHareketleriPanel />}
      {showYonetimTabs && tab === 'masraflar' && <MasraflarPanel />}
      {showYonetimTabs && tab === 'cari' && <CariHesapPanel />}
    </div>
  )
}
