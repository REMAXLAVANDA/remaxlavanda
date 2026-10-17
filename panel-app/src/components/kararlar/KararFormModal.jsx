import { useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '../common/Modal'

const YENI_KATEGORI = '__yeni__'
const today = () => new Date().toISOString().slice(0, 10)

// Yeni kategori ekleme deseni MasrafIsaretleModal.jsx ile AYNI (bkz. o
// dosyadaki not) — broker burada da serbestçe yeni bir kategori
// ekleyip onu seçebilir.
export default function KararFormModal({ editing, kategoriler, kararAlanOptions, defaultKararAlanId, onClose, onSubmit, onKategoriEkle, submitting }) {
  const [baslik, setBaslik] = useState(editing?.baslik ?? '')
  const [icerik, setIcerik] = useState(editing?.icerik ?? '')
  const [kategoriKey, setKategoriKey] = useState(editing?.kategoriKey ?? kategoriler[0]?.key ?? '')
  const [tarih, setTarih] = useState(editing?.tarih ?? today())
  const [kararAlanId, setKararAlanId] = useState(editing?.kararAlanId ?? defaultKararAlanId ?? '')
  const [yeniKategoriAdi, setYeniKategoriAdi] = useState('')
  const [kategoriEkleniyor, setKategoriEkleniyor] = useState(false)

  const yeniKategoriModu = kategoriKey === YENI_KATEGORI
  const canSubmit = baslik.trim() && icerik.trim() && tarih && !yeniKategoriModu

  async function handleKategoriEkle() {
    if (!yeniKategoriAdi.trim()) return
    setKategoriEkleniyor(true)
    try {
      const yeni = await onKategoriEkle(yeniKategoriAdi.trim())
      setKategoriKey(yeni.key)
      setYeniKategoriAdi('')
    } finally {
      setKategoriEkleniyor(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      baslik: baslik.trim(),
      icerik: icerik.trim(),
      kategoriKey: kategoriKey || null,
      tarih,
      kararAlanId: kararAlanId || null,
    })
  }

  return (
    <Modal title={editing ? 'Kararı Düzenle' : 'Yeni Karar'} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          autoFocus
          required
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          placeholder="Başlık"
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <textarea
          required
          value={icerik}
          onChange={(e) => setIcerik(e.target.value)}
          placeholder="Karar metni — ne karar verildi, neden?"
          rows={5}
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />

        <div>
          <label className="mb-1 block text-xs text-text-secondary">Kategori</label>
          <select
            value={kategoriKey}
            onChange={(e) => setKategoriKey(e.target.value)}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          >
            {kategoriler.length === 0 && <option value="">Kategorisiz</option>}
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
                placeholder="Kategori adı (ör. Operasyon)"
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Tarih</label>
            <input
              required
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Kararı alan</label>
            <select
              value={kararAlanId}
              onChange={(e) => setKararAlanId(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Belirtilmemiş</option>
              {kararAlanOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
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
