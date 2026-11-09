import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  kasalar as kasalarProvider,
  genelGiderler as genelGiderlerProvider,
  tedarikciOdemeleri as tedarikciOdemeleriProvider,
  ortakHesabiHareketleri as ortakHesabiHareketleriProvider,
  kasaTransferleri as kasaTransferleriProvider,
  cariHesapOdemeleri as cariHesapOdemeleriProvider,
  bankaHareketleri as bankaHareketleriProvider,
} from '../../lib/dataProvider'
import { formatDateOnly } from '../../lib/format'
import { DATE_RANGES, isWithinRange } from '../../lib/dateRange'
import { LoadingState, ErrorState } from '../common/AsyncState'
import DateRangeFilter from '../common/DateRangeFilter'
import Modal from '../common/Modal'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const ANA_KATEGORI_LABELS = { personel: 'Personel Gideri', isletme: 'İşletme Gideri', arac: 'Araç Gideri' }
const PERSONEL_ALT_KATEGORILERI = ['Maaş', 'Vergi/SSK', 'Prim', 'Avans']
const ISLETME_ALT_KATEGORILERI = ['Kira', 'Reklam', 'Yemek', 'Temizlik', 'İletişim', 'Kargo', 'Diğer']

const HAREKET_TIPLERI = {
  genel_gider: 'Genel Gider',
  tedarikci: 'Tedarikçi Ödemesi',
  ortak_hesabi: 'Ortak Hesabı Çekişi',
  transfer_cikis: 'Kasa Transferi (Çıkış)',
  transfer_giris: 'Kasa Transferi (Giriş)',
  cari_odeme: 'Danışman Hakedişi Ödemesi',
  banka_hareketi: 'Banka Hareketi',
}

async function loadAll() {
  const [kasalar, genelGiderler, tedarikciOdemeleri, ortakHesabiHareketleri, kasaTransferleri, cariHesapOdemeleri, bankaHareketleriTumu] = await Promise.all([
    kasalarProvider.list(),
    genelGiderlerProvider.list(),
    tedarikciOdemeleriProvider.list(),
    ortakHesabiHareketleriProvider.list(),
    kasaTransferleriProvider.list(),
    cariHesapOdemeleriProvider.list(),
    bankaHareketleriProvider.list(),
  ])
  // Broker, 2026-11-09: Kasa Raporu'na bankaHareketleri de eklenmeli — ama
  // sadece kasa_id atanmış olanlar (henüz atanmamışları raporda GÖSTERMİYORUZ,
  // sayısını ayrıca kontrol edip broker'a bildiriyoruz, bkz. kasasizBankaHareketiSayisi).
  const bankaHareketleri = bankaHareketleriTumu.filter((h) => h.kasaId != null)
  return { kasalar, genelGiderler, tedarikciOdemeleri, ortakHesabiHareketleri, kasaTransferleri, cariHesapOdemeleri, bankaHareketleri, kasasizBankaHareketiSayisi: bankaHareketleriTumu.length - bankaHareketleri.length }
}

// Her kaynaktan gelen farklı şekildeki satırları tek bir ortak forma
// (tarih/tip/açıklama/kasaId/giris/cikis) çeviriyor — kasa raporu bunun
// üstünde filtreleme/toplama yapıyor. Para birimi anlamı bilerek
// Borç/Alacak değil Giriş/Çıkış — muhasebe terimi yerine danışmanın da
// anlayacağı düz Türkçe (broker, 2026-10-17 kuralı: "teknik terim kullanma").
function ortakForma(data) {
  const satirlar = []
  for (const g of data.genelGiderler) {
    satirlar.push({
      id: `gg-${g.id}`,
      tarih: g.tarih,
      tip: HAREKET_TIPLERI.genel_gider,
      aciklama: `${ANA_KATEGORI_LABELS[g.anaKategori] ?? g.anaKategori} · ${g.altKategori}${g.aciklama ? ' — ' + g.aciklama : ''}`,
      kasaId: g.kasaId,
      kullaniciId: g.createdBy,
      cikis: g.tutar,
      giris: 0,
    })
  }
  for (const t of data.tedarikciOdemeleri) {
    satirlar.push({
      id: `to-${t.id}`,
      tarih: t.tarih,
      tip: HAREKET_TIPLERI.tedarikci,
      aciklama: `${t.tedarikciAdi}${t.faturaNo ? ' · Fatura: ' + t.faturaNo : ''}${t.aciklama ? ' — ' + t.aciklama : ''}`,
      kasaId: t.kasaId,
      kullaniciId: t.createdBy,
      cikis: t.tutar,
      giris: 0,
    })
  }
  for (const o of data.ortakHesabiHareketleri) {
    satirlar.push({
      id: `oh-${o.id}`,
      tarih: o.tarih,
      tip: HAREKET_TIPLERI.ortak_hesabi,
      aciklama: o.aciklama || '—',
      kasaId: o.kasaId,
      kullaniciId: o.createdBy,
      cikis: o.tutar,
      giris: 0,
    })
  }
  for (const c of data.cariHesapOdemeleri) {
    satirlar.push({
      id: `cho-${c.id}`,
      tarih: c.tarih,
      tip: HAREKET_TIPLERI.cari_odeme,
      aciklama: c.aciklama || '—',
      kasaId: c.kasaId,
      kullaniciId: null,
      cikis: c.tutar,
      giris: 0,
    })
  }
  for (const h of data.bankaHareketleri) {
    satirlar.push({
      id: `bh-${h.id}`,
      tarih: h.tarih,
      tip: HAREKET_TIPLERI.banka_hareketi,
      aciklama: h.aciklama || h.gonderenAdi || '—',
      kasaId: h.kasaId,
      kullaniciId: h.olusturanId,
      cikis: h.tip === 'cikis' ? h.tutar : 0,
      giris: h.tip === 'giris' ? h.tutar : 0,
    })
  }
  for (const t of data.kasaTransferleri) {
    satirlar.push({
      id: `kt-cikis-${t.id}`,
      tarih: t.tarih,
      tip: HAREKET_TIPLERI.transfer_cikis,
      aciklama: t.aciklama || '—',
      kasaId: t.cikisKasaId,
      kullaniciId: t.createdBy,
      cikis: t.tutar,
      giris: 0,
    })
    satirlar.push({
      id: `kt-giris-${t.id}`,
      tarih: t.tarih,
      tip: HAREKET_TIPLERI.transfer_giris,
      aciklama: t.aciklama || '—',
      kasaId: t.girisKasaId,
      kullaniciId: t.createdBy,
      cikis: 0,
      giris: t.tutar,
    })
  }
  return satirlar.sort((a, b) => new Date(a.tarih) - new Date(b.tarih))
}

// Broker, 2026-11-09: Excel/BizimHesap'ı tamamen bırakıp tek takip
// yerinin Portal olması için — kasa bazlı gider/ödeme/transfer girişi +
// mutabakat raporu. Danışman hiç görmez (bkz. RaporlarPanel.jsx
// canViewAllCiroRaporlari koşulu).
export default function KasaRaporuPanel() {
  const { user } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [kasaFiltre, setKasaFiltre] = useState('')
  const [tarihFiltre, setTarihFiltre] = useState({ dateRange: '30g', customFrom: '', customTo: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAcilisModal, setShowAcilisModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const kasalar = data?.kasalar ?? []
  const kasasizBankaHareketiSayisi = data?.kasasizBankaHareketiSayisi ?? 0
  const tumSatirlar = useMemo(() => (data ? ortakForma(data) : []), [data])

  const kasayaGoreSatirlar = useMemo(
    () => (kasaFiltre ? tumSatirlar.filter((s) => s.kasaId === kasaFiltre) : tumSatirlar),
    [tumSatirlar, kasaFiltre],
  )

  // Dönem başı bakiye = seçilen aralığın başlangıcından ÖNCEKİ tüm
  // hareketlerin toplamı — "Özel" seçiliyse customFrom'dan önceki her şey.
  const araligiBaslangici = useMemo(() => {
    const { dateRange, customFrom } = tarihFiltre
    if (dateRange === 'tumu') return null
    if (dateRange === 'yil') return new Date(new Date().getFullYear(), 0, 1)
    if (dateRange === 'ozel') return customFrom ? new Date(customFrom) : null
    const gun = DATE_RANGES.find((r) => r.key === dateRange)?.days
    return gun != null ? new Date(Date.now() - gun * 24 * 60 * 60 * 1000) : null
  }, [tarihFiltre])

  const seciliKasa = useMemo(() => kasalar.find((k) => k.id === kasaFiltre) ?? null, [kasalar, kasaFiltre])

  // Broker, 2026-11-09: açılış bakiyesi devreye girdi — dönem başı artık
  // sıfırdan değil, kasanın acilisBakiyesi'nden başlıyor. "Tümü" seçiliyse
  // direkt acilisBakiyesi (zaten en baştan gösteriliyor). Aralık başı
  // açılış tarihinden ÖNCEYSE direkt acilisBakiyesi; SONRAYSA
  // acilisBakiyesi + açılış tarihinden aralık başına kadarki hareketler.
  // Açılış tarihi hiç girilmemiş kasalarda (6'sı) eski davranış (sıfırdan
  // toplam) aynen devam ediyor.
  const donemBasiBakiye = useMemo(() => {
    if (!kasaFiltre) return 0
    const acilisBakiyesi = seciliKasa?.acilisBakiyesi ?? 0
    const acilisTarihi = seciliKasa?.acilisTarihi ? new Date(seciliKasa.acilisTarihi) : null
    if (!araligiBaslangici) return acilisBakiyesi
    if (acilisTarihi && araligiBaslangici <= acilisTarihi) return acilisBakiyesi
    const baslangicNoktasi = acilisTarihi ?? new Date(0)
    const baslangicDeger = acilisTarihi ? acilisBakiyesi : 0
    return kasayaGoreSatirlar
      .filter((s) => new Date(s.tarih) >= baslangicNoktasi && new Date(s.tarih) < araligiBaslangici)
      .reduce((top, s) => top + s.giris - s.cikis, baslangicDeger)
  }, [kasayaGoreSatirlar, araligiBaslangici, kasaFiltre, seciliKasa])

  const gosterilenSatirlar = useMemo(
    () => kasayaGoreSatirlar.filter((s) => isWithinRange(s.tarih, tarihFiltre.dateRange, tarihFiltre.customFrom, tarihFiltre.customTo)),
    [kasayaGoreSatirlar, tarihFiltre],
  )

  let kosullu = donemBasiBakiye ?? 0
  const satirlarBakiyeli = gosterilenSatirlar.map((s) => {
    kosullu = kosullu + s.giris - s.cikis
    return { ...s, bakiye: kosullu }
  })

  async function handleAddSubmit(payload) {
    setSubmitting(true)
    try {
      if (payload.hareketTipi === 'genel_gider') {
        await genelGiderlerProvider.create(payload, user.id)
      } else if (payload.hareketTipi === 'tedarikci') {
        await tedarikciOdemeleriProvider.create(payload, user.id)
      } else if (payload.hareketTipi === 'ortak_hesabi') {
        await ortakHesabiHareketleriProvider.create({ ...payload, ortakId: user.id }, user.id)
      } else if (payload.hareketTipi === 'transfer') {
        await kasaTransferleriProvider.create(payload, user.id)
      }
      setShowAddModal(false)
      showToast('Hareket eklendi.', 'success')
      await reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAcilisSubmit({ acilisBakiyesi, acilisTarihi }) {
    setSubmitting(true)
    try {
      await kasalarProvider.setAcilisBakiyesi(kasaFiltre, { acilisBakiyesi, acilisTarihi })
      setShowAcilisModal(false)
      showToast('Açılış bakiyesi güncellendi.', 'success')
      await reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Kasa raporu yükleniyor..." />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={kasaFiltre}
          onChange={(e) => setKasaFiltre(e.target.value)}
          className="rounded-lg border border-border-default bg-white px-3 py-1.5 text-xs text-text-primary"
        >
          <option value="">Tüm kasalar</option>
          {kasalar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.ad}
            </option>
          ))}
        </select>
        <DateRangeFilter value={tarihFiltre} onChange={setTarihFiltre} />
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          <Plus size={14} /> Hareket Ekle
        </button>
      </div>

      {kasaFiltre && (
        <p className="mb-2 flex items-center gap-2 text-xs text-text-muted">
          Dönem başı bakiye: <span className="font-medium text-text-primary">{tl(donemBasiBakiye)}</span>
          <button type="button" onClick={() => setShowAcilisModal(true)} className="font-medium text-brand-700 hover:underline">
            Açılış Bakiyesini Düzenle
          </button>
        </p>
      )}

      {kasasizBankaHareketiSayisi > 0 && (
        <p className="mb-2 rounded-lg bg-tint-amber px-3 py-2 text-xs text-tint-amber-text">
          {kasasizBankaHareketiSayisi} banka hareketinde kasa seçilmemiş — bu rapora hiç girmiyorlar, bakiye eksik
          görünebilir. Banka Hareketleri ekranında bunları kasaya bağlamak gerekiyor.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border-default bg-surface-raised">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-sunken text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2.5">Tarih</th>
              <th className="px-4 py-2.5">Tip</th>
              <th className="px-4 py-2.5">Açıklama</th>
              <th className="px-4 py-2.5">Kullanıcı</th>
              <th className="px-4 py-2.5 text-right">Çıkış</th>
              <th className="px-4 py-2.5 text-right">Giriş</th>
              {kasaFiltre && <th className="px-4 py-2.5 text-right">Bakiye</th>}
            </tr>
          </thead>
          <tbody>
            {satirlarBakiyeli.length === 0 && (
              <tr>
                <td colSpan={kasaFiltre ? 7 : 6} className="px-4 py-6 text-center text-sm text-text-muted">
                  Bu aralıkta hareket yok.
                </td>
              </tr>
            )}
            {satirlarBakiyeli.map((s) => (
              <tr key={s.id} className="border-b border-border-subtle last:border-0">
                <td className="px-4 py-2 text-text-secondary">{formatDateOnly(s.tarih)}</td>
                <td className="px-4 py-2 text-text-secondary">{s.tip}</td>
                <td className="px-4 py-2 text-text-primary">{s.aciklama}</td>
                <td className="px-4 py-2 text-text-secondary">{knownUsers[s.kullaniciId]?.name ?? '—'}</td>
                <td className="px-4 py-2 text-right text-brand-700">{s.cikis > 0 ? tl(s.cikis) : '—'}</td>
                <td className="px-4 py-2 text-right text-tint-green-text">{s.giris > 0 ? tl(s.giris) : '—'}</td>
                {kasaFiltre && <td className="px-4 py-2 text-right font-medium text-text-primary">{tl(s.bakiye)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && <HareketEkleModal kasalar={kasalar} onClose={() => setShowAddModal(false)} onSubmit={handleAddSubmit} submitting={submitting} />}
      {showAcilisModal && (
        <AcilisBakiyesiModal kasa={seciliKasa} onClose={() => setShowAcilisModal(false)} onSubmit={handleAcilisSubmit} submitting={submitting} />
      )}
    </div>
  )
}

function AcilisBakiyesiModal({ kasa, onClose, onSubmit, submitting }) {
  const [tutar, setTutar] = useState(kasa?.acilisBakiyesi ? String(kasa.acilisBakiyesi) : '')
  const [tarih, setTarih] = useState(kasa?.acilisTarihi ?? '')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ acilisBakiyesi: tutar ? Number(tutar) : 0, acilisTarihi: tarih || null })
  }

  return (
    <Modal title={`${kasa?.ad ?? 'Kasa'} — Açılış Bakiyesi`} onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Açılış Bakiyesi (₺)</label>
          <input
            inputMode="decimal"
            value={tutar}
            onChange={(e) => setTutar(e.target.value.replace(/[^0-9.,-]/g, ''))}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Açılış Tarihi</label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function HareketEkleModal({ kasalar, onClose, onSubmit, submitting }) {
  const [hareketTipi, setHareketTipi] = useState('genel_gider')
  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10))
  const [kasaId, setKasaId] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [anaKategori, setAnaKategori] = useState('isletme')
  const [altKategori, setAltKategori] = useState('')
  const [tedarikciAdi, setTedarikciAdi] = useState('')
  const [vergiNo, setVergiNo] = useState('')
  const [faturaNo, setFaturaNo] = useState('')
  const [cikisKasaId, setCikisKasaId] = useState('')
  const [girisKasaId, setGirisKasaId] = useState('')

  const altKategoriSecenekleri = anaKategori === 'personel' ? PERSONEL_ALT_KATEGORILERI : anaKategori === 'isletme' ? ISLETME_ALT_KATEGORILERI : []

  const canSubmit =
    Number(tutar) > 0 &&
    !!tarih &&
    (hareketTipi === 'transfer' ? !!cikisKasaId && !!girisKasaId && cikisKasaId !== girisKasaId : !!kasaId) &&
    (hareketTipi !== 'genel_gider' || (anaKategori === 'arac' || altKategori.trim().length > 0)) &&
    (hareketTipi !== 'tedarikci' || tedarikciAdi.trim().length > 0)

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      hareketTipi,
      tutar: Number(tutar),
      tarih,
      kasaId: kasaId || null,
      aciklama: aciklama.trim() || null,
      anaKategori,
      altKategori: anaKategori === 'arac' ? 'Araç Gideri' : altKategori,
      tedarikciAdi: tedarikciAdi.trim(),
      vergiNo: vergiNo.trim() || null,
      faturaNo: faturaNo.trim() || null,
      cikisKasaId,
      girisKasaId,
    })
  }

  return (
    <Modal title="Kasa Hareketi Ekle" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Hareket Tipi</label>
          <div className="flex flex-wrap gap-2">
            {[
              ['genel_gider', 'Genel Gider'],
              ['tedarikci', 'Tedarikçi Ödemesi'],
              ['ortak_hesabi', 'Ortak Hesabı Çekişi'],
              ['transfer', 'Kasalar Arası Transfer'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHareketTipi(key)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  hareketTipi === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {hareketTipi === 'genel_gider' && (
          <>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Kategori</label>
              <div className="flex gap-2">
                {Object.entries(ANA_KATEGORI_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setAnaKategori(key)
                      setAltKategori('')
                    }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                      anaKategori === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {altKategoriSecenekleri.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Alt Kategori</label>
                <select
                  value={altKategori}
                  onChange={(e) => setAltKategori(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary"
                >
                  <option value="">Seç</option>
                  {altKategoriSecenekleri.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {hareketTipi === 'tedarikci' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={tedarikciAdi}
              onChange={(e) => setTedarikciAdi(e.target.value)}
              placeholder="Tedarikçi adı *"
              className="col-span-2 rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
            <input
              value={vergiNo}
              onChange={(e) => setVergiNo(e.target.value)}
              placeholder="Vergi No (opsiyonel)"
              className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
            <input
              value={faturaNo}
              onChange={(e) => setFaturaNo(e.target.value)}
              placeholder="Fatura No (opsiyonel)"
              className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>
        )}

        {hareketTipi === 'transfer' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Çıkış Kasası</label>
              <select
                value={cikisKasaId}
                onChange={(e) => setCikisKasaId(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary"
              >
                <option value="">Seç</option>
                {kasalar.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Giriş Kasası</label>
              <select
                value={girisKasaId}
                onChange={(e) => setGirisKasaId(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary"
              >
                <option value="">Seç</option>
                {kasalar.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Kasa</label>
            <select
              value={kasaId}
              onChange={(e) => setKasaId(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Seç</option>
              {kasalar.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Tutar (₺) *</label>
            <input
              inputMode="numeric"
              value={tutar}
              onChange={(e) => setTutar(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Tarih *</label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
        </div>

        <textarea
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Açıklama (opsiyonel)"
          rows={2}
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />

        <div className="flex justify-end gap-2 pt-1">
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
