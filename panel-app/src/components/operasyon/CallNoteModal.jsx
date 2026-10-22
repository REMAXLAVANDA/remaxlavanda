import { useState } from 'react'
import Modal from '../common/Modal'
import { capitalizeFirst } from '../../lib/format'

// "Bilgileri Düzenle" (EditCallDetailsModal) kaynak/portföy no/satış tarihi
// gibi ofis alanlarını da içerdiği için sadece broker/owner/ofis'e açık
// (bkz. canEditCallDetails) — ama danışman kendine atanan çağrıda müşteriyle
// ilgili not tutmak istiyor (bkz. broker isteği). Bu modal BİLEREK dar
// tutuldu, sadece notlar alanını günceller — call_logs_update_own RLS'i
// zaten danışmanın kendine atanan satırın HER kolonunu güncellemesine izin
// veriyor, burada sadece notlar'a daraltıyoruz ki danışman yanlışlıkla
// kaynak/portföy no gibi ofis alanlarını değiştiremesin.
//
// requireDurum (broker kararı, 2026-10-22): lead dönüş oranı sadece
// "Görüşüldü" (donusYapildiMi=true) işaretini sayıyor, notlar'a hiç
// bakmıyor — danışman not yazıp durumu işaretlemeyi unutunca gerçekte
// aranmış bir çağrı "dönüş yapılmadı" gibi görünüyordu. OperasyonTab.jsx
// bu alanı SADECE çağrı takip edilmesi gereken türdense VE durum hiç
// işaretlenmemişse true geçiyor (callSurecDurumu === 'gorusme_bekliyor') —
// zaten işaretli bir çağrıda ya da Santral bilgi amaçlı çağrıda bu seçim
// hiç çıkmıyor, not eskisi gibi serbestçe yazılabiliyor ("Bilgileri
// Düzenle" formuna BİLİNÇLİ olarak bu kural uygulanmadı, oradaki not
// henüz arama yapılmadan da yazılabilen bir talimat notu — bkz. o
// dosyadaki not).
export default function CallNoteModal({ call, requireDurum, onClose, onSubmit, submitting }) {
  const [notlar, setNotlar] = useState(call.notlar ?? '')
  const [durum, setDurum] = useState(null)
  const canSubmit = !requireDurum || durum != null

  return (
    <Modal title="Müşteri Notu" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit(capitalizeFirst(notlar.trim()), durum)
        }}
        className="space-y-3"
      >
        <p className="text-xs text-ink-400">{call.arayanAd} ile ilgili not — bütçe, ihtiyaç, sonraki adım vb.</p>
        <textarea
          value={notlar}
          onChange={(e) => setNotlar(e.target.value)}
          onBlur={(e) => setNotlar(capitalizeFirst(e.target.value))}
          placeholder="Müşteri hakkında not..."
          rows={4}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        {requireDurum && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-600">Görüşüldü mü?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDurum(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  durum === true ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                Görüşüldü
              </button>
              <button
                type="button"
                onClick={() => setDurum(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  durum === false ? 'border-red-300 bg-red-50 text-red-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                Ulaşılamadı
              </button>
            </div>
            {durum == null && <p className="mt-1 text-xs text-amber-600">Not kaydetmeden önce birini seç.</p>}
          </div>
        )}
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
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
