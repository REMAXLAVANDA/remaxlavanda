import { useMemo, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Check, X as XIcon, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  ciroRaporlari as ciroRaporlariProvider,
  danismanAnlasmalari as danismanAnlasmalariProvider,
  bankaHareketleri as bankaHareketleriProvider,
} from '../../lib/dataProvider'
import {
  CIRO_RAPORU_DURUM_LABELS,
  CIRO_RAPORU_DURUM_STYLES,
  ISLEM_TIPI_LABELS,
  canSubmitCiroRaporu,
  canApproveCiroRaporu,
  beklenenHizmetBedeli,
  hizmetBedeliStandartDisiMi,
  faturaTutarsizMi,
} from '../../lib/ciroRaporlari'

// Standart hizmet bedeli oranından (satışta %2+KDV, kiralamada 1 kira+KDV)
// sapan rapor — broker/owner listede tek bakışta görsün diye (broker,
// 2026-10-13: "alınmış hizmet bedeli de doğru mu teyidi kontrolü olsun...
// beni bilgilendirsin").
function hizmetBedeliUyarisiVar(r) {
  const beklenen = beklenenHizmetBedeli(r.islemTipi, r.mulkBedeli)
  if (beklenen == null) return false
  return (
    (r.saticiHizmetBedeliAlindi && hizmetBedeliStandartDisiMi(r.saticiHizmetBedeli, beklenen)) ||
    (r.aliciHizmetBedeliAlindi && hizmetBedeliStandartDisiMi(r.aliciHizmetBedeli, beklenen))
  )
}

// /kurul denetimi (2026-10-17, kod-güvenlik-denetçi): Onayla butonu sabit
// bir mesaj gösteriyordu, katılımcı satırlarındaki kırmızı "tutarsız
// fatura" uyarısını veya "Oran Uyarısı" rozetini tekrar etmiyordu — ekran
// kalabalıklaştıkça broker scroll ederken bu uyarıyı atlayıp yine de
// onaylayabilir. Onay diyaloğu artık bu uyarıyı kendisi de gösteriyor.
function raporOnayUyarisi(r) {
  if (hizmetBedeliUyarisiVar(r)) return 'Hizmet bedeli standart orandan farklı görünüyor.'
  const tutarsizKatilimci = (r?.katilimcilar ?? []).find((k) => faturaTutarsizMi(k.faturaTutari, k.komisyonTutariOnerisi))
  if (tutarsizKatilimci) return 'Bir katılımcının fatura tutarı önerilenden farklı — onaylamadan önce kontrol et.'
  return null
}
import { toplamEslesenTutar } from '../../lib/bankaHareketleri'
import { formatDateOnly } from '../../lib/format'
import { validateFinansFile, uploadFinansFile, getSignedFinansUrl } from '../../lib/storage'
import { LoadingState, ErrorState } from '../common/AsyncState'
import CiroRaporuFormModal from '../ciroRaporlari/CiroRaporuFormModal'
import CiroRaporuKatilimciRow from '../ciroRaporlari/CiroRaporuKatilimciRow'
import RejectCiroRaporuModal from '../ciroRaporlari/RejectCiroRaporuModal'
import ConfirmDialog from '../common/ConfirmDialog'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

async function loadAll() {
  const [raporlar, anlasmalar, hareketler] = await Promise.all([
    ciroRaporlariProvider.list(),
    danismanAnlasmalariProvider.list(),
    bankaHareketleriProvider.list(),
  ])
  return { raporlar, anlasmalar, hareketler }
}

export default function CiroRaporlariPanel() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [showFormModal, setShowFormModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  // Broker, 2026-10-20: "muhasebe de müşteriye kesilen faturayı sisteme
  // yüklemeli" — CiroRaporuKatilimciRow'daki AYNI dosya yükleme deseni
  // (danışmanın kendi faturası), burada satıcı/alıcı ofis faturası için.
  const [ofisFiles, setOfisFiles] = useState({})
  const [ofisFileErrors, setOfisFileErrors] = useState({})
  const [ofisUploadingKey, setOfisUploadingKey] = useState(null)
  const [ofisViewingKey, setOfisViewingKey] = useState(null)
  // /kurul denetimi (2026-10-17, kullanılabilirlik+görsel): Ofis/Muhasebe
  // bloğu rapor genişletilir genişletilmez her zaman açık duruyordu —
  // broker'ın raporu onaylarken asıl bakması gereken (müşteri bilgisi,
  // katılımcı payları) ile muhasebenin sonradan dolduracağı alanlar aynı
  // görsel ağırlıktaydı. Artık varsayılan kapalı, kendi başlığına tıklanınca açılıyor.
  const [ofisMuhasebeAcikId, setOfisMuhasebeAcikId] = useState(null)

  const isDanisman = canSubmitCiroRaporu(role)
  const isApprover = canApproveCiroRaporu(role)
  const userName = (id) => knownUsers[id]?.name ?? '—'

  const danismanOptions = useMemo(
    () => Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi && u.id !== user.id),
    [knownUsers, user.id],
  )

  // Danışman: kendi oluşturduğu ya da ortak katılımcısı olduğu raporlar.
  // Broker/owner: RLS zaten herkesinkini döndürüyor, filtre gereksiz.
  const visibleReports = useMemo(() => {
    const all = data?.raporlar ?? []
    if (isApprover) return all
    return all.filter((r) => r.olusturanId === user.id || r.katilimcilar?.some((k) => k.danismanId === user.id))
  }, [data, isApprover, user.id])

  // Taslaklarım: SADECE kendi oluşturduğun, henüz onaya göndermediğin
  // raporlar — fatura no'nu girip "Onaya Gönder"e basana kadar burada
  // bekler (2026-10-09 broker kararı: "fatura kestikten sonra asıl o
  // zaman onaya göndermiş olmalı" — create() artık submit() ÇAĞIRMIYOR,
  // bkz. handleCreate).
  const taslakReports = useMemo(
    () => visibleReports.filter((r) => r.durum === 'taslak' && r.olusturanId === user.id),
    [visibleReports, user.id],
  )
  const pendingReports = useMemo(() => visibleReports.filter((r) => r.durum === 'onay_bekliyor'), [visibleReports])
  // Broker/owner: "Diğer Raporlar" sadece sonuçlanmışları gösterir (onay
  // bekleyenler ayrı bölümde, taslaklar henüz gönderilmediği için ilgisiz).
  // Danışman: "Raporlarım" taslak HARİÇ her şeyi gösterir — kendi onay
  // bekleyeni de (ayrı bir "bekleyenler" bölümü danışman için yok) burada.
  const otherReports = useMemo(
    () => visibleReports.filter((r) => r.durum !== 'onay_bekliyor' && r.durum !== 'taslak'),
    [visibleReports],
  )
  const danismanRaporlarim = useMemo(() => visibleReports.filter((r) => r.durum !== 'taslak'), [visibleReports])

  // Onaya gönderebilmek için kendi katılımcı satırında fatura no gerekli
  // (2026-10-09 broker kararı: "fatura numarasını yazacağı alan olsun",
  // "kestikten sonra onaya göndermiş olmalı") — ortak çalışmada partner'ın
  // kendi faturası ayrı, bu kontrolü etkilemiyor.
  function ownFaturaNoVar(r) {
    return !!r.katilimcilar?.find((k) => k.danismanId === r.olusturanId)?.faturaNo
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.create(form, user.id)
      setShowFormModal(false)
      showToast('Taslak kaydedildi — fatura no\'nu girip onaya gönder.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Broker, 2026-10-11: "sil ve düzenle diye seçim olmalı".
  async function handleUpdate(form) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.update(editTarget.id, form, user.id)
      setEditTarget(null)
      showToast('Rapor güncellendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.remove(deleteTarget)
      setDeleteTarget(null)
      showToast('Rapor silindi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitTaslak(r) {
    if (!ownFaturaNoVar(r)) {
      showToast('Onaya göndermeden önce fatura no\'nu gir.', 'error')
      return
    }
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.submit(r.id)
      showToast('Ciro raporu onaya gönderildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Gönderilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // 2026-10-17 /kurul düzeltmesi: geri alınamaz bir işlem artık tek tıkla
  // kesinleşmiyor — "Sil" ile aynı ConfirmDialog deseni (approveTarget).
  async function handleApprove(id) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.approve(id, user.id)
      setApproveTarget(null)
      showToast('Rapor onaylandı — Lig ve Mentor Primi güncellendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Onaylanamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject(redSebebi) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.reject(rejectTarget, redSebebi)
      setRejectTarget(null)
      showToast('Rapor reddedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Reddedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResubmit(id) {
    try {
      await ciroRaporlariProvider.submit(id)
      showToast('Rapor yeniden onaya gönderildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Gönderilemedi, tekrar dene.', 'error')
    }
  }

  async function handleSaveFatura(katilimciId, form) {
    const faturaTutari = form.faturaTutari ? Number(form.faturaTutari) : null
    const kdvOrani = form.kdvOrani !== '' ? Number(form.kdvOrani) : null
    const kdvHaricTutar = faturaTutari != null && kdvOrani != null ? Math.round((faturaTutari / (1 + kdvOrani / 100)) * 100) / 100 : null
    try {
      await ciroRaporlariProvider.updateKatilimciFatura(katilimciId, {
        faturaNo: form.faturaNo || null,
        faturaTarihi: form.faturaTarihi || null,
        faturaTutari,
        kdvOrani,
        kdvHaricTutar,
        vergiNo: form.vergiNo || null,
        // Sadece yeni bir dosya yüklendiyse gönderilir (bkz.
        // CiroRaporuKatilimciRow handleSave) — yoksa var olan
        // fatura_dosya_url'in üzerine boş yazılmasın.
        ...('faturaDosyaUrl' in form ? { faturaDosyaUrl: form.faturaDosyaUrl || null } : {}),
      })
      showToast('Fatura bilgisi kaydedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    }
  }

  // --- Fatura Kontrol'den (Finans > Raporlar) taşındı — broker, 2026-10-17:
  // "fatura kontrolü de ciro ekranına al içine yerleştir". Ofis faturası
  // 2026-10-17'den beri satıcı/alıcı için AYRI (broker: "alıcı yeri ayrı
  // satıcı yeri ayrı fatura bilgileri girmek gerekmez mi") — satıcı ve
  // alıcıdan bağımsız olarak hizmet bedeli alınabildiği için tek alan
  // ikisini birden tutamıyordu, bkz. migration
  // 20261017160000_ofis_faturasi_satici_alici_ayrimi. ---
  async function handleTeyit(katilimciId, deger) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.katilimciTeyitEt(katilimciId, user.id, deger)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  function handleOfisFaturaFileChange(raporId, taraf, e) {
    const key = `${raporId}:${taraf}`
    const selected = e.target.files?.[0] ?? null
    if (!selected) {
      setOfisFiles((f) => ({ ...f, [key]: null }))
      setOfisFileErrors((f) => ({ ...f, [key]: null }))
      return
    }
    const check = validateFinansFile(selected)
    if (!check.ok) {
      setOfisFiles((f) => ({ ...f, [key]: null }))
      setOfisFileErrors((f) => ({ ...f, [key]: check.reason }))
      return
    }
    setOfisFiles((f) => ({ ...f, [key]: selected }))
    setOfisFileErrors((f) => ({ ...f, [key]: null }))
  }
  // Fatura dosyası private bucket'ta — CiroRaporuKatilimciRow'daki AYNI
  // desen, her açışta imzalı URL istenir.
  async function handleOfisFaturaGoruntule(dosyaUrl, raporId, taraf) {
    const key = `${raporId}:${taraf}`
    setOfisViewingKey(key)
    try {
      const url = await getSignedFinansUrl(dosyaUrl)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      showToast('Dosya açılamadı, tekrar dene.', 'error')
    } finally {
      setOfisViewingKey(null)
    }
  }
  async function handleOfisFaturasiKaydet(raporId, taraf) {
    const key = `${raporId}:${taraf}`
    if (ofisFileErrors[key]) return
    const file = ofisFiles[key]
    if (!file) return
    setSubmitting(true)
    setOfisUploadingKey(key)
    try {
      const dosyaUrl = await uploadFinansFile(file, user.id)
      await ciroRaporlariProvider.ofisFaturasiKaydet(raporId, taraf, { dosyaUrl })
      setOfisFiles((f) => ({ ...f, [key]: null }))
      showToast('Fatura yüklendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Yüklenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
      setOfisUploadingKey(null)
    }
  }
  // Broker, 2026-10-20: "fatura bilgilerini değil direk faturaları
  // yükleyelim" — no/tarih/tutar yazma alanları kaldırıldı, sadece
  // gerçek fatura PDF'i yükleniyor (ofis_fatura_*_no/tarihi/tutari
  // kolonları DB'de duruyor ama artık hiçbir ekranda kullanılmıyor).
  function renderOfisFaturaSatiri(rapor, taraf, label) {
    const key = `${rapor.id}:${taraf}`
    const onEki = taraf === 'satici' ? 'ofisFaturaSatici' : 'ofisFaturaAlici'
    const dosyaUrl = rapor[`${onEki}DosyaUrl`]
    const file = ofisFiles[key]
    const fileError = ofisFileErrors[key]
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-text-muted">{label}</span>
        <label className="flex max-w-[14rem] cursor-pointer items-center gap-1 rounded-lg border border-dashed border-border-default bg-white px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-sunken">
          <span className="truncate">{file ? `${file.name} (${formatSize(file.size)})` : dosyaUrl ? 'Dosyayı değiştir' : 'Fatura PDF ekle'}</span>
          <input type="file" onChange={(e) => handleOfisFaturaFileChange(rapor.id, taraf, e)} className="hidden" />
        </label>
        {dosyaUrl && (
          <button
            type="button"
            disabled={ofisViewingKey === key}
            onClick={() => handleOfisFaturaGoruntule(dosyaUrl, rapor.id, taraf)}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-tint-red disabled:opacity-50"
          >
            Faturayı görüntüle
          </button>
        )}
        <button
          type="button"
          disabled={submitting || !file || !!fileError}
          onClick={() => handleOfisFaturasiKaydet(rapor.id, taraf)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {ofisUploadingKey === key ? 'Yükleniyor...' : 'Yükle'}
        </button>
        {fileError && <p className="w-full text-xs text-brand-700">{fileError}</p>}
      </div>
    )
  }

  async function handleMyremax(raporId, deger) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.setMyremaxGirildi(raporId, deger)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  async function handleTamamlandi(raporId, deger) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.setMuhasebeTamamlandi(raporId, deger, user.id)
      showToast(deger ? 'İşlem tamamlandı olarak işaretlendi.' : 'İşlem tamamlandı işareti kaldırıldı.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  // --- /Fatura Kontrol'den taşındı ---

  // Broker, 2026-10-20: "para alışverişleri, hizmet bedelleri, iadeler
  // sırayla alt alta olsun, biz tikleyeceğiz kontrol ederek" — bu raporun
  // Para Hareketleri satırları (CiroRaporuFormModal'da girilenler) artık
  // onay ekranında bu sabit sırayla grupla gösteriliyor. Buradaki tik,
  // Banka Hareketleri'ndeki AYNI teyitEt alanını kullanıyor — iki ekran
  // senkron.
  const PARA_HAREKETI_GRUP_SIRASI = [
    { tur: 'diger', baslik: 'Para Alışverişleri' },
    { tur: 'hizmet_bedeli', baslik: 'Hizmet Bedelleri' },
    { tur: 'iade', baslik: 'İadeler' },
  ]

  async function handleHareketTeyit(hareketId, deger) {
    try {
      await bankaHareketleriProvider.teyitEt(hareketId, user.id, deger)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    }
  }

  // Broker, 2026-10-20: "banka kontrol / müşteri fatura / danışman
  // fatura / myremax — bu başlıklar tikler olsun, içinde işlem yapınca
  // tiklensin. hepsi tamamsa tek bir tik olsun, eksik varsa görünsün."
  // Dördü de mevcut verilerden otomatik hesaplanıyor, elle işaretlenen
  // bir alan değil.
  function muhasebeDurumu(r) {
    const hareketler = (data?.hareketler ?? []).filter((h) => h.ciroRaporuId === r.id)
    const katilimcilar = r.katilimcilar ?? []
    return {
      bankaKontrol: hareketler.length > 0 && hareketler.every((h) => h.teyitEdildi),
      musteriFatura: (!r.saticiHizmetBedeliAlindi || !!r.ofisFaturaSaticiDosyaUrl) && (!r.aliciHizmetBedeliAlindi || !!r.ofisFaturaAliciDosyaUrl),
      danismanFatura: katilimcilar.length > 0 && katilimcilar.every((k) => k.faturaDosyaUrl),
      myremax: !!r.myremaxGirildi,
    }
  }

  function renderMuhasebeDurumSatiri(r) {
    const durum = muhasebeDurumu(r)
    const kalemler = [
      { key: 'bankaKontrol', label: 'Banka Kontrol' },
      { key: 'musteriFatura', label: 'Müşteri Fatura' },
      { key: 'danismanFatura', label: 'Danışman Fatura' },
      { key: 'myremax', label: 'MyRemax' },
    ]
    const hepsiTamam = kalemler.every((k) => durum[k.key])
    if (hepsiTamam) {
      return (
        <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-tint-green-text">
          <Check size={13} /> Muhasebe Tamam
        </div>
      )
    }
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {kalemler.map((k) => (
          <span
            key={k.key}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              durum[k.key] ? 'bg-tint-green text-tint-green-text' : 'bg-tint-amber text-tint-amber-text'
            }`}
          >
            {durum[k.key] ? <Check size={11} /> : null} {k.label}
          </span>
        ))}
      </div>
    )
  }

  function renderParaHareketleri(r) {
    const hareketler = (data?.hareketler ?? []).filter((h) => h.ciroRaporuId === r.id)
    if (hareketler.length === 0) return null
    return (
      <div className="space-y-2 rounded-lg bg-surface-sunken p-3">
        <p className="text-xs font-medium text-text-primary">Para Hareketleri</p>
        {PARA_HAREKETI_GRUP_SIRASI.map(({ tur, baslik }) => {
          const grup = hareketler.filter((h) => h.tur === tur)
          if (grup.length === 0) return null
          return (
            <div key={tur}>
              <p className="mb-1 text-[11px] font-medium text-text-muted">{baslik}</p>
              <div className="space-y-1">
                {grup.map((h) => (
                  <label key={h.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={!!h.teyitEdildi}
                      disabled={!isApprover}
                      onChange={(e) => handleHareketTeyit(h.id, e.target.checked)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-border-default"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {h.tip === 'cikis' ? 'Çıkış' : 'Giriş'} · {tl(h.tutar)} · {h.gonderenAdi || '—'} · {formatDateOnly(h.tarih)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  async function handleToggleOdeme(katilimciId, odemeDurumu) {
    try {
      await ciroRaporlariProvider.updateKatilimciFatura(katilimciId, { odemeDurumu })
      reload()
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    }
  }

  function renderReportRow(r) {
    const isExpanded = expandedId === r.id
    const isOwner = r.olusturanId === user.id
    return (
      <div key={r.id} className="rounded-2xl border border-border-default bg-surface-raised p-4">
        <button onClick={() => setExpandedId(isExpanded ? null : r.id)} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="min-w-0 flex-1">
            {/* Broker, 2026-10-20: "danışman ve beyan tarihi yer alsın,
                bir de ciro bir de portföy no" + "alt üst yapman lazım,
                alttakini üste üsttekini alta" — detaylar üstte, alt alta;
                portföy tipi/beyan kodu + durum rozetleri altta. */}
            <div className="space-y-0.5 text-xs text-text-muted">
              <p>{ISLEM_TIPI_LABELS[r.islemTipi]}</p>
              <p>
                Danışman: <span className="font-medium text-text-primary">{(r.katilimcilar ?? []).map((k) => userName(k.danismanId)).join(' / ') || '—'}</span>
              </p>
              <p>
                Beyan: <span className="font-medium text-text-primary">{formatDateOnly(r.createdAt)}</span>
              </p>
              <p>
                Ciro: <span className="font-medium text-text-primary">{tl(r.islemTutari)}</span>
              </p>
              <p>
                Portföy No: <span className="font-medium text-text-primary">{r.disBeyanKodu ?? '—'}</span>
              </p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CIRO_RAPORU_DURUM_STYLES[r.durum]}`}>
                {CIRO_RAPORU_DURUM_LABELS[r.durum]}
              </span>
              {hizmetBedeliUyarisiVar(r) && (
                <span
                  title="Hizmet bedeli standart orandan (satışta %2+KDV, kiralamada 1 kira+KDV) farklı"
                  className="shrink-0 rounded-full bg-tint-amber px-2 py-0.5 text-xs font-medium text-tint-amber-text"
                >
                  Oran Uyarısı
                </span>
              )}
              {r.muhasebeTamamlandi && (
                <span className="shrink-0 rounded-full bg-tint-green px-2 py-0.5 text-xs font-medium text-tint-green-text">
                  İşlem Tamamlandı
                </span>
              )}
            </div>
            {renderMuhasebeDurumSatiri(r)}
          </div>
          {isExpanded ? <ChevronUp size={16} className="shrink-0 text-text-muted" /> : <ChevronDown size={16} className="shrink-0 text-text-muted" />}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
            {/* Müşteri bilgileri + beyan — form doldurulurken kaydediliyor
                ama bu ekranda hiç gösterilmiyordu (broker, 2026-10-17:
                "dün girilen ciro ile ilgili müşteri bilgileri ve beyan
                kısmı bende yok"). Tutarlar KDV DAHİL gösteriliyor —
                Hakediş de artık KDV dahil (bkz. lib/ciroRaporlari.js
                komisyonTutariOnerisi notu), ekranda tek format. */}
            <div className="grid grid-cols-1 gap-2 rounded-lg bg-surface-sunken p-3 text-xs text-text-secondary sm:grid-cols-2">
              <div>
                <p className="mb-0.5 font-medium text-text-primary">Satıcı</p>
                <p>{r.saticiAdSoyad} · {r.saticiTelefon} · {r.saticiKimlikNo}</p>
                <p className="mt-0.5 text-text-muted">
                  {r.saticiHizmetBedeliAlindi ? `Hizmet bedeli alındı: ${tl(r.saticiHizmetBedeli)}` : 'Hizmet bedeli alınmadı'}
                </p>
                {r.saticiDigerKisiler?.map((k, i) => (
                  <p key={i} className="mt-0.5 text-text-muted">+ {k.adSoyad} · {k.telefon} · {k.kimlikNo}</p>
                ))}
              </div>
              <div>
                <p className="mb-0.5 font-medium text-text-primary">Alıcı/Kiracı</p>
                <p>{r.aliciAdSoyad} · {r.aliciTelefon} · {r.aliciKimlikNo}</p>
                <p className="mt-0.5 text-text-muted">
                  {r.aliciHizmetBedeliAlindi ? `Hizmet bedeli alındı: ${tl(r.aliciHizmetBedeli)}` : 'Hizmet bedeli alınmadı'}
                </p>
                {r.aliciDigerKisiler?.map((k, i) => (
                  <p key={i} className="mt-0.5 text-text-muted">+ {k.adSoyad} · {k.telefon} · {k.kimlikNo}</p>
                ))}
              </div>
              {r.mulkBedeli != null && (
                <p className="sm:col-span-2">
                  <span className="font-medium text-text-primary">Anlaşılan Bedel:</span> {tl(r.mulkBedeli)}
                  {r.islemTipi === 'kiralama' ? ' / ay' : ''}
                </p>
              )}
              {r.tapuBilgileri && (
                <p className="sm:col-span-2"><span className="font-medium text-text-primary">Tapu Bilgileri:</span> {r.tapuBilgileri}</p>
              )}
              <p className="sm:col-span-2">
                <span className="font-medium text-text-primary">Ödeme:</span>{' '}
                {r.krediDurumu === 'kredi' ? `Kredi (${r.krediBankasi || '—'})` : 'Nakit'}
              </p>
            </div>
            {r.notlar && <p className="text-xs text-text-muted">Not: {r.notlar}</p>}
            {r.durum === 'reddedildi' && r.redSebebi && (
              <p className="rounded-lg bg-tint-red p-2 text-xs text-brand-700">Red sebebi: {r.redSebebi}</p>
            )}
            {isDanisman && isOwner && r.durum === 'taslak' && !ownFaturaNoVar(r) && (
              <p className="rounded-lg bg-tint-amber p-2 text-xs text-tint-amber-text">
                Onaya göndermeden önce aşağıdan kendi fatura no'nu gir.
              </p>
            )}
            {(r.katilimcilar ?? []).map((k) => (
              <CiroRaporuKatilimciRow
                key={k.id}
                k={k}
                userName={userName}
                isOwnRow={k.danismanId === user.id}
                canToggleOdeme={isApprover}
                eslesenTutar={toplamEslesenTutar(k.id, data?.hareketler)}
                onSaveFatura={handleSaveFatura}
                onToggleOdeme={handleToggleOdeme}
                onTeyitEt={handleTeyit}
                submitting={submitting}
              />
            ))}

            {renderParaHareketleri(r)}

            {/* Broker, 2026-10-20: "danışman müşterisine kesilen faturayı
                görebilsin" — isApprover olmayan (danışman) kendi
                raporundaki ofis faturasını salt okunur görür, yükleme/
                değiştirme yetkisi hâlâ sadece yönetimde (aşağıdaki
                Ofis/Muhasebe bloğu). Storage erişimi finans_bucket_
                select_musteri_faturasi RLS'iyle sağlanıyor (migration
                20261020120000). */}
            {!isApprover && (r.ofisFaturaSaticiDosyaUrl || r.ofisFaturaAliciDosyaUrl) && (
              <div className="space-y-1 rounded-lg bg-surface-sunken p-3">
                <p className="text-xs font-medium text-text-primary">Müşteriye Kesilen Fatura</p>
                {r.ofisFaturaSaticiDosyaUrl && (
                  <button
                    type="button"
                    onClick={() => handleOfisFaturaGoruntule(r.ofisFaturaSaticiDosyaUrl, r.id, 'satici')}
                    className="block text-xs font-medium text-brand-700 hover:underline"
                  >
                    Satıcı faturasını görüntüle
                  </button>
                )}
                {r.ofisFaturaAliciDosyaUrl && (
                  <button
                    type="button"
                    onClick={() => handleOfisFaturaGoruntule(r.ofisFaturaAliciDosyaUrl, r.id, 'alici')}
                    className="block text-xs font-medium text-brand-700 hover:underline"
                  >
                    Alıcı faturasını görüntüle
                  </button>
                )}
              </div>
            )}

            {/* Fatura Kontrol'den (Finans > Raporlar) taşındı — broker,
                2026-10-17: "fatura kontrolü de ciro ekranına al içine
                yerleştir". Sadece onaya gönderilmiş/onaylanmış raporlarda
                anlamlı (taslak/reddedildi'de henüz muhasebe işi yok). */}
            {isApprover && (r.durum === 'onay_bekliyor' || r.durum === 'onaylandi') && (
              <div className="rounded-lg bg-surface-sunken p-3">
                <button
                  type="button"
                  onClick={() => setOfisMuhasebeAcikId(ofisMuhasebeAcikId === r.id ? null : r.id)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-xs font-medium text-text-primary">
                    Ofis / Muhasebe
                    {r.muhasebeTamamlandi && <span className="ml-1.5 font-normal text-tint-green-text">· Tamamlandı</span>}
                  </span>
                  {ofisMuhasebeAcikId === r.id ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                </button>
                {ofisMuhasebeAcikId === r.id && (
                  <div className="mt-2">
                    {/* Broker, 2026-10-20: "GD de bize kestiği faturayı
                        burada görelim" — danışmanın kendi faturası
                        (CiroRaporuKatilimciRow'da zaten var) muhasebenin
                        işini tek ekranda toplamak için burada da salt
                        okunur gösteriliyor. */}
                    {(r.katilimcilar ?? []).some((k) => k.faturaDosyaUrl) && (
                      <div className="mb-2 space-y-1">
                        <p className="text-[11px] font-medium text-text-muted">GD Faturaları</p>
                        {(r.katilimcilar ?? [])
                          .filter((k) => k.faturaDosyaUrl)
                          .map((k) => (
                            <div key={k.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs text-text-secondary">
                              <span className="min-w-0 flex-1 truncate">
                                {userName(k.danismanId)} · {k.faturaNo || 'Fatura no yok'} {k.faturaTutari != null && `· ${tl(k.faturaTutari)}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOfisFaturaGoruntule(k.faturaDosyaUrl, r.id, `gd-${k.id}`)}
                                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-tint-red"
                              >
                                Görüntüle
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      {r.saticiHizmetBedeliAlindi && renderOfisFaturaSatiri(r, 'satici', 'Satıcı')}
                      {r.aliciHizmetBedeliAlindi && renderOfisFaturaSatiri(r, 'alici', 'Alıcı')}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={!!r.myremaxGirildi}
                          onChange={(e) => handleMyremax(r.id, e.target.checked)}
                          disabled={submitting}
                        />
                        MyRemax'a girildi
                      </label>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleTamamlandi(r.id, !r.muhasebeTamamlandi)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                          r.muhasebeTamamlandi ? 'bg-surface-sunken text-text-secondary' : 'bg-tint-green-text text-white hover:bg-tint-green-text/90'
                        }`}
                      >
                        {r.muhasebeTamamlandi ? 'Tamamlandı İşaretini Kaldır' : 'İşlem Tamamlandı'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {isDanisman && isOwner && (r.durum === 'taslak' || r.durum === 'reddedildi') && (
                <>
                  <button
                    onClick={() => setDeleteTarget(r.id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-tint-red"
                  >
                    <Trash2 size={13} /> Sil
                  </button>
                  <button
                    onClick={() => setEditTarget(r)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-sunken"
                  >
                    <Pencil size={13} /> Düzenle
                  </button>
                </>
              )}
              {isDanisman && isOwner && r.durum === 'taslak' && (
                <button
                  onClick={() => handleSubmitTaslak(r)}
                  disabled={!ownFaturaNoVar(r) || submitting}
                  title={!ownFaturaNoVar(r) ? 'Önce fatura no\'nu gir' : undefined}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={13} /> Onaya Gönder
                </button>
              )}
              {isDanisman && isOwner && r.durum === 'reddedildi' && (
                <button
                  onClick={() => handleResubmit(r.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-border-subtle"
                >
                  <RotateCcw size={13} /> Yeniden Gönder
                </button>
              )}
              {isApprover && r.durum === 'onay_bekliyor' && (
                <>
                  <button
                    onClick={() => setRejectTarget(r.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-tint-red"
                  >
                    <XIcon size={13} /> Reddet
                  </button>
                  <button
                    onClick={() => setApproveTarget(r.id)}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-lg bg-tint-green-text px-3 py-1.5 text-xs font-medium text-white hover:bg-tint-green-text/90 disabled:opacity-50"
                  >
                    <Check size={13} /> Onayla
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">
          {isDanisman ? 'Kapattığın işlemleri raporla, broker onayladığında Lig ve Mentor Primi otomatik güncellenir.' : 'Danışmanların gönderdiği ciro raporlarını onayla/reddet.'}
        </p>
        {isDanisman && (
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Ciro Raporu
          </button>
        )}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="space-y-5">
          {isDanisman && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-text-primary">Taslaklarım ({taslakReports.length})</h2>
              {taslakReports.length === 0 ? (
                <p className="text-sm text-text-muted">Taslak rapor yok.</p>
              ) : (
                <div className="space-y-2">{taslakReports.map(renderReportRow)}</div>
              )}
            </div>
          )}

          {isApprover && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-text-primary">Onay Bekleyenler ({pendingReports.length})</h2>
              {pendingReports.length === 0 ? (
                <p className="text-sm text-text-muted">Onay bekleyen rapor yok.</p>
              ) : (
                <div className="space-y-2">{pendingReports.map(renderReportRow)}</div>
              )}
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold text-text-primary">{isApprover ? 'Diğer Raporlar' : 'Raporlarım'}</h2>
            {(isApprover ? otherReports : danismanRaporlarim).length === 0 ? (
              <p className="text-sm text-text-muted">Henüz rapor yok.</p>
            ) : (
              <div className="space-y-2">{(isApprover ? otherReports : danismanRaporlarim).map(renderReportRow)}</div>
            )}
          </div>
        </div>
      )}

      {showFormModal && (
        <CiroRaporuFormModal
          onClose={() => setShowFormModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          danismanOptions={danismanOptions}
          anlasmalar={data?.anlasmalar ?? []}
          user={user}
        />
      )}

      {editTarget && (
        <CiroRaporuFormModal
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          submitting={submitting}
          danismanOptions={danismanOptions}
          anlasmalar={data?.anlasmalar ?? []}
          user={user}
          editing={editTarget}
          existingParaHareketleri={(data?.hareketler ?? []).filter((h) => h.ciroRaporuId === editTarget.id)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Raporu sil"
          message="Bu ciro raporu taslağı kalıcı olarak silinecek."
          confirmLabel="Evet, sil"
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirming={submitting}
        />
      )}

      {rejectTarget && (
        <RejectCiroRaporuModal onClose={() => setRejectTarget(null)} onSubmit={handleReject} submitting={submitting} />
      )}

      {approveTarget && (
        <ConfirmDialog
          title="Raporu onayla"
          message={(() => {
            const uyari = raporOnayUyarisi((data?.raporlar ?? []).find((r) => r.id === approveTarget))
            const temel = 'Onaylanınca Lig ve Mentor Primi otomatik güncellenir — bu işlem geri alınamaz.'
            return uyari ? `${uyari} ${temel}` : temel
          })()}
          confirmLabel="Evet, onayla"
          onConfirm={() => handleApprove(approveTarget)}
          onCancel={() => setApproveTarget(null)}
          confirming={submitting}
        />
      )}
    </div>
  )
}
