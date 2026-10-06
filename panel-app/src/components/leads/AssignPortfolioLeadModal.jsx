import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../common/Modal'
import { YONLENDIRME_DURUM_LABELS, sortBySiralamaPuani } from '../../lib/yonlendirme'

// Lead Havuzu'ndan Portföy'e giden bir lead'i yönlendirirken NewOpportunityModal'ın
// koca formu AÇILMIYOR — broker property'i hiç tanımıyor (mahalle/fiyat/m²/
// oda), hatta alıcı mı satıcı mı olduğunu bile bilmiyor ("biz reklamlarda
// ikisini de topluyoruz"). Broker'ın burada tek işi: reklam kampanya/reklam
// seti başlığına bakıp hangi danışmanın reklamı olduğunu tanıyıp SEÇMEK.
// Bu, doğrudan bir Fırsat DEĞİL, Operasyon'a diğer reklam çağrıları gibi
// bir çağrı düşürür (bkz. Leads.jsx handleAssignPortfolioLead) — danışman
// Operasyon'dan görüşüp işi netleştirdiğinde kendisi Fırsata çevirir.
//
// Yönlendirme Puanı (2026-10-06): seçenekler sıralama puanına göre sıralı
// (bkz. lib/yonlendirme.js), "Kapalı" olan bir danışman seçilirse gerekçe
// kutusu ZORUNLU olarak çıkar — onSubmit'e (assignToId, gerekce) ikilisi
// gider, gerekçe yoksa ikinci parametre undefined kalır.
export default function AssignPortfolioLeadModal({ lead, assignableOptions, yonlendirmeMap = {}, onClose, onSubmit, submitting }) {
  const [assignToId, setAssignToId] = useState('')
  const [gerekce, setGerekce] = useState('')
  const sortedOptions = sortBySiralamaPuani(assignableOptions, yonlendirmeMap)
  const selectedDurum = assignToId ? yonlendirmeMap[assignToId]?.durum : null
  const kapali = selectedDurum === 'kapali'
  const canSubmit = assignToId && (!kapali || gerekce.trim().length > 0)

  return (
    <Modal title="Danışmana Ata" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit(assignToId, kapali ? gerekce.trim() : undefined)
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
          onChange={(e) => {
            setAssignToId(e.target.value)
            setGerekce('')
          }}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          <option value="">Hangi danışmana atansın?</option>
          {sortedOptions.map((u) => {
            const durum = yonlendirmeMap[u.id]?.durum
            return (
              <option key={u.id} value={u.id}>
                {u.name}
                {durum && durum !== 'acik' ? ` — ${YONLENDIRME_DURUM_LABELS[durum]}` : ''}
              </option>
            )
          })}
        </select>

        {kapali && (
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="mb-2 flex items-start gap-1.5 text-xs text-amber-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Bu danışmanın Yönlendirme Durumu Kapalı — devam etmek için bir gerekçe yaz.
            </p>
            <textarea
              autoFocus
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              rows={2}
              placeholder="Örn. bölgeye en yakın tek uygun danışman"
              className="w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs text-ink-800 placeholder:text-ink-300"
            />
          </div>
        )}

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
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Atanıyor...' : kapali ? 'Gerekçeyle Ata' : 'Ata ve Gönder'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
