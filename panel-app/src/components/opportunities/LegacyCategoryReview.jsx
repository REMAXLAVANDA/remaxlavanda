import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../common/Modal'
import OpportunityTable from './OpportunityTable'

// "Diğer" kategorisi kaldırıldı (broker isteği, 2026-09-17) ama eski
// kayıtlar (prod'da 25 açık kayıt tespit edildi) sessizce kaybolmasın diye
// — sadece yönetim rollerine görünen bir kutu, diğer kategori kutularıyla
// aynı ızgarada (bkz. OpportunityCategoryTree, broker 2026-10-10: "konut
// arsa ticari diğer"). Tıklanınca bu kayıtların düz tablosu modalda açılır.
// Broker/ofis mevcut Düzenle akışıyla gerçek bir kategoriye taşıyabilir;
// sayı sıfıra inince kutu kendiliğinden kaybolur (bkz. lib/opportunities.js
// legacyCategoryOpportunities).
export default function LegacyCategoryReview({ opportunities, onRowClick, onExpressInterest, expressingId, user, interestedIds }) {
  const [open, setOpen] = useState(false)
  if (opportunities.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:border-amber-300"
      >
        <p className="text-2xl font-semibold text-amber-800">{opportunities.length}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
          <AlertTriangle size={12} className="shrink-0" />
          Diğer
        </p>
      </button>

      {open && (
        <Modal title="Kategorisi belirsiz kayıtlar" onClose={() => setOpen(false)} maxWidth="max-w-3xl">
          <p className="mb-3 text-xs text-ink-500">
            Bu kayıtlar eski "Diğer" kategorisinde — artık Konut/Arsa/Ticari dışında bir dal yok, bu yüzden ana
            listede görünmüyorlar. Satıra tıklayıp "Düzenle" ile gerçek bir kategoriye taşıyabilirsin.
          </p>
          <OpportunityTable
            opportunities={opportunities}
            onRowClick={(opp) => {
              setOpen(false)
              onRowClick(opp)
            }}
            onExpressInterest={onExpressInterest}
            expressingId={expressingId}
            user={user}
            interestedIds={interestedIds}
          />
        </Modal>
      )}
    </>
  )
}
