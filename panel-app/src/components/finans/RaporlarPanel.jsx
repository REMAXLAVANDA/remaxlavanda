import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { canManageMasraflar } from '../../lib/islemMasraflari'
import { canApproveCiroRaporu } from '../../lib/ciroRaporlari'
import CariHesapPanel from './CariHesapPanel'
import MasraflarPanel from './MasraflarPanel'
import KarlilikPanel from './KarlilikPanel'

// Finans > Raporlar — Cari Hesap ve Masraflar burada toplandı (2026-10-09
// broker: "rapor demiştim ama sen masraflar menüsüne eklemişsin, rapor
// menüsü ekle, cari hesap ve masraflar onun içine ekle"). Cari Hesap
// HERKESE görünür (danışman kendi bakiyesini görür, bkz. CariHesapPanel
// içindeki ayrım), Masraflar sadece broker'a (bkz.
// lib/islemMasraflari.js canManageMasraflar) — iç sekme burada,
// dış Finans.jsx sekme mantığıyla AYNI desen. Kârlılık (2026-10-11
// eklendi) ofis payı gibi hassas iç veriyi topluyor — CiroRaporuKatilimciRow'daki
// AYNI yetki sınırı (canApproveCiroRaporu/broker+owner), danışman
// başkasının/ofisin kârlılığını görmemeli.
// Fatura Kontrol 2026-10-17'de Ciro Raporları ekranının içine taşındı,
// Dekont Kontrol de aynı gün Banka Hareketleri ekranının içine taşındı
// (broker: "dekont kontrolünü de banka hareketlerine taşıyalım") — bu
// sekme artık yok, bkz. BankaHareketleriPanel.jsx.
const TABS = [
  { key: 'cari', label: 'Cari Hesap' },
  { key: 'masraflar', label: 'Masraflar' },
  { key: 'karlilik', label: 'Kârlılık' },
]

export default function RaporlarPanel() {
  const { role } = useAuth()
  const [tab, setTab] = useState('cari')
  const showMasraflar = canManageMasraflar(role)
  const showKarlilik = canApproveCiroRaporu(role)
  const visibleTabs = TABS.filter((t) => (t.key === 'masraflar' ? showMasraflar : t.key === 'karlilik' ? showKarlilik : true))

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
      {showKarlilik && tab === 'karlilik' && <KarlilikPanel />}
    </div>
  )
}
