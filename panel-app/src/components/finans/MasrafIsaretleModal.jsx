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
// Sınıflandırma (madde 5, broker onayı 2026-11-06): danisman_id'den
// TÜRETİLMİYOR, bilerek 3 açık seçenek — boş danışman her zaman "ofis
// gideri" anlamına gelmeyebilir, "henüz sınıflandırılmadı" da olabilir.
const SINIFLANDIRMA_SECENEKLERI = [
  { key: 'siniflandirilmamis', label: 'Şimdilik sınıflandırma (sonra karar verilecek)' },
  { key: 'ofis_gideri', label: 'Genel ofis gideri' },
  { key: 'danisman_cari', label: 'Bir danışmanın cari hesabına yazılsın' },
]

export default function MasrafIsaretleModal({ hareket, kategoriler, danismanOptions, onClose, onSubmit, onKategoriEkle, submitting }) {
  const [tur, setTur] = useState(kategoriler[0]?.key ?? '')
  const [siniflandirma, setSiniflandirma] = useState('siniflandirilmamis')
  const [danismanId, setDanismanId] = useState('')
  const [aciklama, setAciklama] = useState(hareket.aciklama ?? '')
  const [yeniKategoriAdi, setYeniKategoriAdi] = useState('')
  const [kategoriEkleniyor, setKategoriEkleniyor] = useState(false)

  const yeniKategoriModu = tur === YENI_KATEGORI
  const danismanCariModu = siniflandirma === 'danisman_cari'

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
    if (danismanCariModu && !danismanId) return
    onSubmit({ tur, aciklama: aciklama.trim(), siniflandirma, danismanId: danismanCariModu ? danismanId : null })
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
          <label className="mb-1 block text-xs text-text-secondary">Sınıflandırma</label>
          <div className="space-y-1.5">
            {SINIFLANDIRMA_SECENEKLERI.map((s) => (
              <label
                key={s.key}
                className="flex items-center gap-2 rounded-lg border border-border-default p-2.5 text-sm has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  name="siniflandirma"
                  value={s.key}
                  checked={siniflandirma === s.key}
                  onChange={() => setSiniflandirma(s.key)}
                />
                {s.label}
              </label>
            ))}
          </div>
          {danismanCariModu && (
            <select
              required
              value={danismanId}
              onChange={(e) => setDanismanId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Danışman seç</option>
              {danismanOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — Cari Hesabına borç yazılır
                </option>
              ))}
            </select>
          )}
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
            disabled={submitting || !tur || yeniKategoriModu || (danismanCariModu && !danismanId)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Masraf Olarak Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
