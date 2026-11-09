import { useState } from 'react'
import Modal from '../common/Modal'
import { ISLEM_TIPI_LABELS, RAPOR_KATEGORI_LABELS } from '../../lib/ciroRaporlari'

// Broker, 2026-11-09: onaylanmış raporda SADECE sınıflandırma alanlarını
// düzeltme — tutar/katılımcı/pay oranı burada YOK (bkz. migration
// 20261109130000 notu, o alanlar zaten Cari Hesap'a/Lig'e yazılmış,
// değiştirmek ayrı/çok daha riskli bir karar).
export default function DuzeltCiroRaporuModal({ rapor, onClose, onSubmit, submitting }) {
  const [islemTipi, setIslemTipi] = useState(rapor.islemTipi)
  const [raporKategori, setRaporKategori] = useState(rapor.raporKategori ?? '')
  const [siteAdi, setSiteAdi] = useState(rapor.siteAdi ?? '')
  const [tapuBilgileri, setTapuBilgileri] = useState(rapor.tapuBilgileri ?? '')

  const canSubmit = siteAdi.trim().length > 0 && tapuBilgileri.trim().length > 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ islemTipi, raporKategori, siteAdi: siteAdi.trim(), tapuBilgileri: tapuBilgileri.trim() })
  }

  return (
    <Modal title="Raporu Düzelt" onClose={onClose} maxWidth="max-w-lg">
      <p className="mb-3 text-xs text-text-muted">
        Sadece sınıflandırma bilgisi değişir — tutar, katılımcı ve pay oranı burada değiştirilemez. Her değişiklik
        kayda geçer.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">İşlem Tipi</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ISLEM_TIPI_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIslemTipi(key)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  islemTipi === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Kategori</label>
          <div className="flex gap-2">
            {Object.entries(RAPOR_KATEGORI_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRaporKategori(key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  raporKategori === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Site/Bina Adı</label>
          <input
            value={siteAdi}
            onChange={(e) => setSiteAdi(e.target.value)}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Tapu Bilgileri</label>
          <textarea
            rows={2}
            value={tapuBilgileri}
            onChange={(e) => setTapuBilgileri(e.target.value)}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Düzelt'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
