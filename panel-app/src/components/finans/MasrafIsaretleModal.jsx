import { useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '../common/Modal'
import { formatDateOnly } from '../../lib/format'
import { OFIS_GIDER_KATEGORILERI } from '../../lib/bankaHareketleri'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const YENI_KATEGORI = '__yeni__'

// Broker, 2026-11-22 (madde 1.2): "İşlem Masrafları" ile "Ofis Gideri"
// ayrı iki seçenek olsun, hangisinin seçildiği net görünsün. Eskiden
// burada 3 seçenek vardı ("sonra karar verilecek" dahil) — o seçenek
// kaldırıldı, her yeni masraf artık bu ikisinden birine girmek zorunda.
// Kategorisi hiç girilmemiş ESKİ kayıtlar için ayrı bir akış var (bkz.
// BankaHareketleriPanel "kategorisi boş masraflar" filtresi).
const SECIM_ISLEM_MASRAFI = 'islem_masrafi'
const SECIM_OFIS_GIDERI = 'ofis_gideri'

export default function MasrafIsaretleModal({ hareket, kategoriler, danismanOptions, onClose, onSubmit, onKategoriEkle, submitting }) {
  const [secim, setSecim] = useState(SECIM_ISLEM_MASRAFI)
  const [tur, setTur] = useState(kategoriler[0]?.key ?? '')
  const [danismanId, setDanismanId] = useState('')
  const [ofisKategori, setOfisKategori] = useState(OFIS_GIDER_KATEGORILERI[0]?.label ?? '')
  const [aciklama, setAciklama] = useState(hareket.aciklama ?? '')
  const [yeniKategoriAdi, setYeniKategoriAdi] = useState('')
  const [kategoriEkleniyor, setKategoriEkleniyor] = useState(false)
  const [cozumNotu, setCozumNotu] = useState('')

  const islemMasrafiModu = secim === SECIM_ISLEM_MASRAFI
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

  const canSubmit =
    cozumNotu.trim().length > 0 &&
    (islemMasrafiModu ? !!tur && !yeniKategoriModu && !!danismanId : !!ofisKategori)

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    if (islemMasrafiModu) {
      onSubmit({
        secim: SECIM_ISLEM_MASRAFI,
        tur,
        aciklama: aciklama.trim(),
        siniflandirma: 'danisman_cari',
        danismanId,
        cozumNotu: cozumNotu.trim(),
      })
    } else {
      const kategori = OFIS_GIDER_KATEGORILERI.find((k) => k.label === ofisKategori)
      onSubmit({
        secim: SECIM_OFIS_GIDERI,
        anaKategori: kategori?.anaKategori ?? 'isletme',
        altKategori: ofisKategori,
        aciklama: aciklama.trim(),
        cozumNotu: cozumNotu.trim(),
      })
    }
  }

  return (
    <Modal title="Masraf Olarak İşaretle" onClose={onClose} maxWidth="max-w-md">
      <p className="mb-4 text-sm text-text-muted">
        {tl(hareket.tutar)} · {formatDateOnly(hareket.tarih)} · {hareket.gonderenAdi || 'Açıklama yok'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Bu masraf ne için?</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 rounded-lg border border-border-default p-2.5 text-sm has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50">
              <input type="radio" name="secim" checked={islemMasrafiModu} onChange={() => setSecim(SECIM_ISLEM_MASRAFI)} />
              <span>
                <span className="block font-medium text-text-primary">İşlem Masrafı</span>
                <span className="block text-xs text-text-muted">Bir danışmanın cari hesabına borç yazılır</span>
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border-default p-2.5 text-sm has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50">
              <input type="radio" name="secim" checked={!islemMasrafiModu} onChange={() => setSecim(SECIM_OFIS_GIDERI)} />
              <span>
                <span className="block font-medium text-text-primary">Ofis Gideri</span>
                <span className="block text-xs text-text-muted">Genel gider kaydı açılır, Kasa Raporu'nda görünür — hiçbir danışmanın carisine yazılmaz</span>
              </span>
            </label>
          </div>
        </div>

        {islemMasrafiModu ? (
          <>
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
            <select
              required
              value={danismanId}
              onChange={(e) => setDanismanId(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Danışman seç</option>
              {danismanOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — Cari Hesabına borç yazılır
                </option>
              ))}
            </select>
          </>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Gider kategorisi</label>
            <select
              value={ofisKategori}
              onChange={(e) => setOfisKategori(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            >
              {OFIS_GIDER_KATEGORILERI.map((k) => (
                <option key={k.label} value={k.label}>
                  {k.label}
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
            {submitting ? 'Kaydediliyor...' : 'Masraf Olarak Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
