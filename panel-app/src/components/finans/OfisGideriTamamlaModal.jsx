import { useState } from 'react'
import Modal from '../common/Modal'
import { formatDateOnly } from '../../lib/format'
import { OFIS_GIDER_KATEGORILERI } from '../../lib/bankaHareketleri'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

// Broker, 2026-11-22 (madde 1.2): "Mevcut 'masraf' durumundaki banka
// kayıtları için otomatik gider kaydı OLUŞTURMA. Bu kayıtlara kategoriyi
// ve notu ben dolduracağım." — bu modal tam o iş için: "kategorisi boş
// masraflar" filtresinden açılan, kategorisi/notu hiç girilmemiş ESKİ
// bir masraf kaydına broker'ın kategori + not eklemesi. Fonksiyon
// tarafı MasrafIsaretleModal'daki "Ofis Gideri" seçimiyle AYNI RPC
// (bkz. bankaHareketleri.js ofisGideriIsaretle) — tek fark burada
// durum zaten 'masraf', fonksiyon onu değiştirmiyor.
export default function OfisGideriTamamlaModal({ hareket, kasalar, onClose, onSubmit, submitting }) {
  const [altKategori, setAltKategori] = useState(OFIS_GIDER_KATEGORILERI[0]?.label ?? '')
  const [aciklama, setAciklama] = useState(hareket.aciklama ?? '')
  const [cozumNotu, setCozumNotu] = useState(hareket.cozumNotu ?? '')
  // Eski kayıtlarda kasa_id hiç olmayabilir (kasa_id kolonu sonradan
  // eklendi) — bu durumda broker burada seçmek zorunda.
  const [kasaId, setKasaId] = useState(hareket.kasaId ?? '')

  const canSubmit = !!altKategori && cozumNotu.trim().length > 0 && !!kasaId

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const kategori = OFIS_GIDER_KATEGORILERI.find((k) => k.label === altKategori)
    onSubmit({
      anaKategori: kategori?.anaKategori ?? 'isletme',
      altKategori,
      aciklama: aciklama.trim(),
      cozumNotu: cozumNotu.trim(),
      kasaId,
    })
  }

  return (
    <Modal title="Gider Kategorisi Ekle" onClose={onClose} maxWidth="max-w-md">
      <p className="mb-4 text-sm text-text-muted">
        {tl(hareket.tutar)} · {formatDateOnly(hareket.tarih)} · {hareket.gonderenAdi || 'Açıklama yok'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Gider kategorisi</label>
          <select
            value={altKategori}
            onChange={(e) => setAltKategori(e.target.value)}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          >
            {OFIS_GIDER_KATEGORILERI.map((k) => (
              <option key={k.label} value={k.label}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        {!hareket.kasaId && (
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Kasa (eski kayıtta boş, seçilmeli)</label>
            <select
              required
              value={kasaId}
              onChange={(e) => setKasaId(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Kasa seç</option>
              {(kasalar ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </select>
          </div>
        )}
        <input
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Açıklama (opsiyonel)"
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Çözüm notu (zorunlu)</label>
          <textarea
            required
            rows={2}
            value={cozumNotu}
            onChange={(e) => setCozumNotu(e.target.value)}
            placeholder="Bu masrafla ilgili kısa not"
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
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
