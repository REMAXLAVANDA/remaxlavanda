import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { canManageMasraflar } from '../../lib/islemMasraflari'
import CariHesapPanel from './CariHesapPanel'
import MasraflarPanel from './MasraflarPanel'

// Finans > Raporlar — Cari Hesap ve Masraflar burada toplandı (2026-10-09
// broker: "rapor demiştim ama sen masraflar menüsüne eklemişsin, rapor
// menüsü ekle, cari hesap ve masraflar onun içine ekle"). Cari Hesap
// HERKESE görünür (danışman kendi bakiyesini görür, bkz. CariHesapPanel
// içindeki ayrım), Masraflar sadece broker'a (bkz.
// lib/islemMasraflari.js canManageMasraflar) — iç sekme burada,
// dış Finans.jsx sekme mantığıyla AYNI desen.
const TABS = [
  { key: 'cari', label: 'Cari Hesap' },
  { key: 'masraflar', label: 'Masraflar' },
]

export default function RaporlarPanel() {
  const { role } = useAuth()
  const [tab, setTab] = useState('cari')
  const showMasraflar = canManageMasraflar(role)
  const visibleTabs = showMasraflar ? TABS : TABS.filter((t) => t.key === 'cari')

  return (
    <div>
      {visibleTabs.length > 1 && (
        <div className="mb-5 flex gap-1 border-b border-border-subtle">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'cari' && <CariHesapPanel />}
      {showMasraflar && tab === 'masraflar' && <MasraflarPanel />}
    </div>
  )
}
