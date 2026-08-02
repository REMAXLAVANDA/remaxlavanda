import { useState } from 'react'
import Modal from '../common/Modal'

// Lead Havuzu'ndan Portföy'e giden bir lead'i yönlendirirken NewOpportunityModal'ın
// koca formu AÇILMIYOR — broker property'i hiç tanımıyor (mahalle/fiyat/m²/
// oda), hatta alıcı mı satıcı mı olduğunu bile bilmiyor ("biz reklamlarda
// ikisini de topluyoruz"). Broker'ın burada tek işi: reklam kampanya/reklam
// seti başlığına bakıp hangi danışmanın reklamı olduğunu tanıyıp SEÇMEK.
// Bu, doğrudan bir Fırsat DEĞİL, Operasyon'a diğer reklam çağrıları gibi
// bir çağrı düşürür (bkz. Leads.jsx handleAssignPortfolioLead) — danışman
// Operasyon'dan görüşüp işi netleştirdiğinde kendisi Fırsata çevirir.
export default function AssignPortfolioLeadModal({ lead, assignableOptions, onClose, onSubmit, submitting }) {
  const [assignToId, setAssignToId] = useState('')

  return (
    <Modal title="Danışmana Ata" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!assignToId) return
          onSubmit(assignToId)
        }}
        className="space-y-3"
      >
        <div className="rounded-lg bg-ink-50 p-3 text-sm">
          <p className="font-medium text-ink-800">{lead.adSoyad}</p>
          {lead.telefon && <p className="text-ink-500">{lead.telefon}</p>}
          {(lead.kampanyaKodu || lead.reklamAdi) && (
            <p className="mt-1.5 border-t border-ink-100 pt-1.5 text-xs text-ink-400">
              {[lead.kampanyaKodu, lead.reklamAdi].filter(Boolean).join(' — ')}
            </p>
          )}
        </div>

        <select
          required
          value={assignToId}
          onChange={(e) => setAssignToId(e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          <option value="">Hangi danışmana atansın?</option>
          {assignableOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <p className="text-xs text-ink-400">
          Operasyon'a reklam çağrısı olarak düşecek — danışman görüşüp portföyü aldığında kendisi Fırsata çevirecek.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!assignToId || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Atanıyor...' : 'Ata ve Gönder'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
