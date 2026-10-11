import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { canSubmitBankaHareketi } from '../lib/bankaHareketleri'
import CiroRaporlariPanel from '../components/finans/CiroRaporlariPanel'
import BankaHareketleriPanel from '../components/finans/BankaHareketleriPanel'
import RaporlarPanel from '../components/finans/RaporlarPanel'

// Finans TEK menü girdisi, sekmeli — önceden Banka Hareketleri/Masraflar/
// Cari Hesap ayrı sidebar maddeleriydi, broker "yanlış kurgu, hepsi
// Finans'ın içine gömülsün" dedi (2026-10-09). Masraflar ve Cari Hesap
// artık ayrı üst sekme değil, "Raporlar" sekmesinin İÇİNDE (2026-10-09
// broker: "rapor demiştim, masraflar ve cari hesabı onun içine ekle" —
// bkz. components/finans/RaporlarPanel.jsx). Banka Hareketleri sekmesi
// eskiden SADECE broker'a açıktı (owner sadece ciro/cari görsün); 2026-10-11
// broker kararıyla danışman/ofis de kendi dekontunu girebilsin diye açıldı
// — BankaHareketleriPanel içeride rol'e göre tam yönetim ekranını mı yoksa
// sade "kendi dekontum" görünümünü mü (BankaHareketiDanismanPanel)
// göstereceğine kendi karar veriyor, bkz. lib/bankaHareketleri.js
// canSubmitBankaHareketi/canManageBankaHareketleri notu. Owner hâlâ
// göremiyor (canSubmitBankaHareketi owner için false). Raporlar sekmesi
// herkese açık — içindeki Cari Hesap danışmana da kendi bakiyesini
// gösteriyor (RaporlarPanel'in kendi iç ayrımı).
const TABS = [
  { key: 'ciro', label: 'Ciro Raporları' },
  { key: 'banka', label: 'Banka Hareketleri' },
  { key: 'raporlar', label: 'Raporlar' },
]

export default function Finans() {
  const { role } = useAuth()
  const [tab, setTab] = useState('ciro')
  const showBankaTab = canSubmitBankaHareketi(role)
  const visibleTabs = showBankaTab ? TABS : TABS.filter((t) => t.key === 'ciro' || t.key === 'raporlar')

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
      {showBankaTab && tab === 'banka' && <BankaHareketleriPanel />}
      {tab === 'raporlar' && <RaporlarPanel />}
    </div>
  )
}
