import { useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '../common/Modal'
import { formatDateOnly } from '../../lib/format'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const YENI_KATEGORI = '__yeni__'

// Eşleşmemiş bir banka çıkışını masraf olarak sınıflandırır (2026-10-09
// broker kararı: "masraflar manuel girilen bir alan değil, bankadan gelen
// bilgiler doğrultusunda atananların olduğu alan olacak") — danışmana
// bağlanırsa Cari Hesabına otomatik borç yazılır (bkz.
// bankaHareketleri.js masrafOlarakIsaretle). Kategori listesi sabit
// değil — broker burada ("yeni kalem olunca da ekleme yapabileyim")
// doğrudan yeni bir kategori ekleyip onu seçebilir, bkz.
// onKategoriEkle (BankaHareketleriPanel'den categoriesProvider.create).
export default function MasrafIsaretleModal({ hareket, kategoriler, danismanOptions, onClose, onSubmit, onKategoriEkle, submitting }) {
  const [tur, setTur] = useState(kategoriler[0]?.key ?? '')
  const [danismanId, setDanismanId] = useState('')
  const [aciklama, setAciklama] = useState(hareket.aciklama ?? '')
  const [yeniKategoriAdi, setYeniKategoriAdi] = useState('')
  const [kategoriEkleniyor, setKategoriEkleniyor] = useState(false)

  const yeniKategoriModu = tur === YENI_KATEGORI

  async function handleKategoriEkle() {
    if (!yeniKategoriAdi.trim()) return
    setKategoriEkleniyor(true)
    try {
      const yeni = await onKategoriEkle(yeniKategoriAdi.trim())
      setTur(yeni.key)
      setYeniKategoriAdi('')
    } finally {
      setKategoriEkleniyor(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!tur || yeniKategoriModu) return
    onSubmit({ tur, aciklama: aciklama.trim(), danismanId: danismanId || null })
  }

  return (
    <Modal title="Masraf Olarak İşaretle" onClose={onClose} maxWidth="max-w-md">
      <p className="mb-4 text-sm text-text-muted">
        {tl(hareket.tutar)} · {formatDateOnly(hareket.tarih)} · {hareket.gonderenAdi || 'Açıklama yok'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Masraf kategorisi</label>
          <select
            value={tur}
            onChange={(e) => setTur(e.target.value)}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          >
            {kategoriler.length === 0 && <option value="">Önce bir kategori ekle</option>}
            {kategoriler.map((k) => (
              <option key={k.id} value={k.key}>
                {k.label}
              </option>
            ))}
            <option value={YENI_KATEGORI}>+ Yeni kategori ekle…</option>
          </select>
          {yeniKategoriModu && (
            <div className="mt-2 flex gap-2">
              <input
                autoFocus
                value={yeniKategoriAdi}
                onChange={(e) => setYeniKategoriAdi(e.target.value)}
                placeholder="Kategori adı (ör. Meta Reklam)"
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
              <button
                type="button"
                onClick={handleKategoriEkle}
                disabled={!yeniKategoriAdi.trim() || kategoriEkleniyor}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <Plus size={14} /> Ekle
              </button>
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Bir danışmana bağlansın mı (opsiyonel)</label>
          <select
            value={danismanId}
            onChange={(e) => setDanismanId(e.target.value)}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          >
            <option value="">Kimseye bağlanmasın — genel ofis gideri</option>
            {danismanOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — Cari Hesabına borç yazılır
              </option>
            ))}
          </select>
        </div>
        <input
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Açıklama (opsiyonel)"
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={submitting || !tur || yeniKategoriModu}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Masraf Olarak Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
