import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../common/Modal'
import OpportunityTable from './OpportunityTable'

// "Diğer" kategorisi kaldırıldı (broker isteği, 2026-09-17) ama eski
// kayıtlar (prod'da 25 açık kayıt tespit edildi) sessizce kaybolmasın diye
// — sadece yönetim rollerine görünen küçük bir bant, tıklanınca bu
// kayıtların düz tablosunu açar. Broker/ofis mevcut Düzenle akışıyla
// gerçek bir kategoriye taşıyabilir; sayı sıfıra inince bant kendiliğinden
// kaybolur (bkz. lib/opportunities.js legacyCategoryOpportunities).
export default function LegacyCategoryReview({ opportunities, onRowClick, onExpressInterest, expressingId, user, interestedIds }) {
  const [open, setOpen] = useState(false)
  if (opportunities.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 hover:bg-amber-100"
      >
        <AlertTriangle size={16} className="shrink-0" />
        <span>
          <strong>{opportunities.length} kayıt</strong> kategorisi belirsiz (eski "Diğer") — gözden geçir ve
          gerçek bir kategoriye taşı.
        </span>
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
