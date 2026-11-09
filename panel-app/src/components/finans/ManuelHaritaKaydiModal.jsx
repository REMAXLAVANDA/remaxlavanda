import { useState } from 'react'
import Modal from '../common/Modal'
import SiteKonumSecici from '../common/SiteKonumSecici'
import { formatThousands, parseThousands } from '../../lib/format'
import { ISLEM_TIPI_LABELS, RAPOR_KATEGORI_LABELS } from '../../lib/ciroRaporlari'

// Sadece Satış/Kiralama gösteriliyor — Referral/Co-operation ciro
// raporunun komisyon paylaşım mekaniğiyle ilgili, basit bir geçmiş
// notunda anlamsız (bkz. migration 20261108120000).
const MANUEL_ISLEM_TIPI_LABELS = { satis: ISLEM_TIPI_LABELS.satis, kiralama: ISLEM_TIPI_LABELS.kiralama }

// Broker'ın geçmişe dönük, sisteme hiç ciro raporu olarak girilmemiş
// eski/bilinen satışları elle haritaya eklemesi için (2026-11-08) — tam
// bir Ciro Raporu DEĞİL: fatura/katılımcı/hizmet bedeli hesaplaması yok,
// sadece bilgi amaçlı (bkz. migration 20261108100000). Sadece Site/Bina
// Adı ve konum zorunlu, geri kalanı broker ne biliyorsa o kadarı.
export default function ManuelHaritaKaydiModal({ onClose, onSubmit, submitting, danismanOptions }) {
  const [siteAdi, setSiteAdi] = useState('')
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState('')
  const [danismanId, setDanismanId] = useState('')
  const [kategori, setKategori] = useState('')
  const [islemTipi, setIslemTipi] = useState('')
  const [m2, setM2] = useState('')
  const [odaSayisi, setOdaSayisi] = useState('')
  const [aciklama, setAciklama] = useState('')

  const canSubmit = siteAdi.trim().length > 0 && lat != null && lng != null

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      siteAdi: siteAdi.trim(),
      lat,
      lng,
      tutar: parseThousands(tutar),
      tarih: tarih || null,
      danismanId: danismanId || null,
      kategori: kategori || null,
      islemTipi: islemTipi || null,
      m2: m2 ? Number(m2) : null,
      odaSayisi: odaSayisi.trim() || null,
      aciklama: aciklama.trim() || null,
    })
  }

  return (
    <Modal title="Manuel Kayıt Ekle" onClose={onClose} maxWidth="max-w-lg">
      <p className="mb-3 text-xs text-text-muted">
        Sistemde ciro raporu hiç olmayan, eski/bilinen bir satışı haritaya ve "bu sitede önceki satışlar"
        listesine eklemek için. Tam bir ciro raporu değil — fatura/hakediş hesabı girmez.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <SiteKonumSecici siteAdi={siteAdi} onSiteAdiChange={setSiteAdi} lat={lat} lng={lng} onLocationChange={(y, x) => { setLat(y); setLng(x) }} required />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-ink-500">Tutar (₺) — bilinmiyorsa boş bırak</label>
            <input
              inputMode="numeric"
              value={tutar}
              onChange={(e) => setTutar(formatThousands(e.target.value))}
              placeholder="ör. 1.000.000"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">Tarih — bilinmiyorsa boş bırak</label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">Kategori — biliniyorsa seç</label>
          <div className="flex gap-2">
            {Object.entries(RAPOR_KATEGORI_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setKategori(kategori === key ? '' : key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  kategori === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">İşlem Tipi — biliniyorsa seç</label>
          <div className="flex gap-2">
            {Object.entries(MANUEL_ISLEM_TIPI_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIslemTipi(islemTipi === key ? '' : key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  islemTipi === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-ink-500">m² — biliniyorsa yaz</label>
            <input
              inputMode="numeric"
              value={m2}
              onChange={(e) => setM2(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="ör. 120"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">Oda Sayısı — biliniyorsa yaz</label>
            <input
              value={odaSayisi}
              onChange={(e) => setOdaSayisi(e.target.value)}
              placeholder="ör. 3+1"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">Danışman — biliniyorsa seç</label>
          <select
            value={danismanId}
            onChange={(e) => setDanismanId(e.target.value)}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800"
          >
            <option value="">Bilinmiyor</option>
            {danismanOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Not (opsiyonel) — ör. 2019'da satıldı, sistem öncesi"
          rows={2}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
