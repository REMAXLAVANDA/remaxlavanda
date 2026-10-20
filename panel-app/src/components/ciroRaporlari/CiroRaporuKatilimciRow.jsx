import { useState } from 'react'
import { Upload } from 'lucide-react'
import { formatDateOnly } from '../../lib/format'
import { faturaTutarsizMi } from '../../lib/ciroRaporlari'
import { validateFinansFile, uploadFinansFile, getSignedFinansUrl } from '../../lib/storage'
import { useToast } from '../../context/ToastContext'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Fatura alanları SADECE o katılımcının kendisi tarafından düzenlenir
// (co-listing'de her danışman kendi vergi no'suyla ayrı fatura keser —
// bkz. migration 20261008120000, ciro_raporu_katilimcilari_update RLS'i).
// odemeDurumu farklı: ofise paranın gelip gelmediğini broker/owner işaretler,
// danışman değil — bu yüzden onToggleOdeme sadece canToggleOdeme true'yken verilir.
//
// RT Payı/Ofis Payı 2026-10-11'de kaldırıldı (bkz. aşağıdaki not) — RT
// Payı artık danışmanın kendi fatura formunda hiç düzenlenmiyor, tamamen
// profildeki tier'dan (Rap/Max) otomatik geliyor.
//
// 2026-10-17 /kurul denetimi (görsel+veri-zinciri): bu kart aynı parayı
// 3 farklı rozette tekrar ediyordu — "Hakediş" (her zaman komisyon
// önerisi), "Çalışan Payı" (fatura girilene kadar Hakediş'le birebir
// aynı), "GD Cirosu" (bu danışmanın payı her zaman üstteki taraf
// bloğundaki "Hizmet bedeli alındı" ile birebir aynı çıkıyor — model
// satıcı/alıcıyı TEK danışman temsil ettiği için). Üstelik GD Cirosu'nun
// ekrana çevrilmesi sabit ×1,2 (KDV %20 varsayımı) kullanıyordu, oysa
// gerçek KDV oranı değişebiliyor (bkz. CiroRaporuFormModal kdvOrani) —
// gerçek değerden sapabilen bir rakamdı. Üçü TEK rozete indirildi: fatura
// girilmemişse "Hakediş (öneri)", girilmişse "Kesilen Fatura" (gerçek
// tutar) — sapma varsa zaten aşağıdaki kırmızı uyarı devreye giriyor.
// gd_cirosu veritabanı kolonu SİLİNMEDİ (Kârlılık sekmesinin tabanı,
// KarlilikPanel.jsx) — sadece bu karttaki tekrarlı gösterimi kaldırıldı.
export default function CiroRaporuKatilimciRow({ k, userName, isOwnRow, canToggleOdeme, eslesenTutar, onSaveFatura, onToggleOdeme, onTeyitEt, submitting }) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    faturaNo: k.faturaNo ?? '',
    faturaTarihi: k.faturaTarihi ?? '',
    faturaTutari: k.faturaTutari ?? '',
    kdvOrani: k.kdvOrani ?? '',
    vergiNo: k.vergiNo ?? '',
  })
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [viewingFile, setViewingFile] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const tutarsiz = faturaTutarsizMi(k.faturaTutari, k.komisyonTutariOnerisi)

  function handleFileChange(e) {
    const selected = e.target.files?.[0] ?? null
    if (!selected) {
      setFile(null)
      setFileError(null)
      return
    }
    const check = validateFinansFile(selected)
    if (!check.ok) {
      setFile(null)
      setFileError(check.reason)
      return
    }
    setFile(selected)
    setFileError(null)
  }

  // Fatura dosyası private bucket'ta (bkz. migration 20261011100000) —
  // doğrudan link yok, her açışta imzalı URL istenir (Rehber'deki
  // PreviewModal ile AYNI desen).
  async function handleViewFile() {
    setViewingFile(true)
    try {
      const url = await getSignedFinansUrl(k.faturaDosyaUrl)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      showToast('Dosya açılamadı, tekrar dene.', 'error')
    } finally {
      setViewingFile(false)
    }
  }

  async function handleSave() {
    if (fileError) return
    setUploading(true)
    try {
      const faturaDosyaUrl = file ? await uploadFinansFile(file, k.danismanId) : undefined
      await onSaveFatura(k.id, { ...form, ...(faturaDosyaUrl !== undefined ? { faturaDosyaUrl } : {}) })
      setEditing(false)
      setFile(null)
    } catch (err) {
      showToast(err.message ?? 'Dosya yüklenemedi, tekrar dene.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-text-primary">
          <span className="font-medium">{userName(k.danismanId)}</span>
          <span className="text-text-muted"> — pay %{k.payOrani}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {tutarsiz && (
            <span className="rounded-full bg-tint-amber px-2 py-0.5 font-medium text-tint-amber-text" title="Girilen fatura tutarı önerilen tutardan farklı">
              Oran Uyarısı
            </span>
          )}
          {canToggleOdeme && (
            <button
              onClick={() => onToggleOdeme(k.id, k.odemeDurumu === 'alindi' ? 'bekliyor' : 'alindi')}
              className={`rounded-full px-2 py-0.5 font-medium ${
                k.odemeDurumu === 'alindi' ? 'bg-tint-green text-tint-green-text' : 'bg-tint-amber text-tint-amber-text'
              }`}
            >
              {k.odemeDurumu === 'alindi' ? 'Ödeme alındı' : 'Ödeme bekliyor'}
            </button>
          )}
          {/* Fatura Kontrol'den (Finans > Raporlar) taşındı — broker,
              2026-10-17: "fatura kontrolü de ciro ekranına al içine
              yerleştir", ayrı sekmeye gitmeden burada teyit edilsin. */}
          {canToggleOdeme && k.faturaNo && (
            <button
              disabled={submitting}
              onClick={() => onTeyitEt(k.id, !k.teyitEdildi)}
              className={`rounded-full px-2 py-0.5 font-medium disabled:opacity-50 ${
                k.teyitEdildi ? 'bg-tint-green text-tint-green-text' : 'bg-tint-amber text-tint-amber-text'
              }`}
            >
              {k.teyitEdildi ? 'Fatura Teyit Edildi' : 'Fatura Teyit Et'}
            </button>
          )}
        </div>
      </div>

      {/* 2026-10-20 broker düzeltmesi: eskiden "bankadan eşleşen" (brüt
          hizmet bedeli payı) üstteki rozetteki "kesmesi gereken fatura"
          (net, ofis payı düşülmüş) ile aynı satırda "beklenen" diye tekrar
          karşılaştırılıyordu — ikisi farklı aşama/birim, yan yana koymak
          sanki eşleşiyormuş hissi veriyordu. Artık TEK satırda, ikisi de
          kendi adıyla, tekrarsız: bankadan tahsil edilen (gdCirosu'yla
          kıyaslı, broker'a özel) + kesilen/kesmesi gereken fatura (herkese
          görünür). "Ödeme alındı" son onayını hâlâ broker yukarıdaki
          düğmeyle elle veriyor, bu satır SADECE bilgi amaçlı. */}
      <p className="mt-1.5 text-xs text-text-muted">
        {canToggleOdeme && eslesenTutar != null && (
          <>
            Bankadan tahsil edilen: <span className="font-medium text-text-primary">{tl(eslesenTutar)}</span>
            {' — '}
          </>
        )}
        {k.faturaTutari != null ? (
          <>
            Kesilen Fatura: <span className="font-medium text-text-primary">{tl(k.faturaTutari)}</span>
          </>
        ) : (
          <>
            Kesmesi gereken fatura (öneri): <span className="font-medium text-text-primary">{tl(k.komisyonTutariOnerisi)}</span>
            {k.anlasmaOraniSnapshot != null && ` (%${k.anlasmaOraniSnapshot} paylaşım oranı)`}
          </>
        )}
      </p>

      {!editing && (k.faturaNo || k.faturaTutari) && (
        <div className="mt-2 text-xs text-text-muted">
          {/* Broker, 2026-10-20: "boş tireler neyin eksik olduğunu
              göstermiyor" — eksik alan hiç gösterilmiyor, placeholder tire
              konmuyor. */}
          Fatura{' '}
          {[k.faturaNo, k.faturaTarihi ? formatDateOnly(k.faturaTarihi) : null, k.faturaTutari != null ? tl(k.faturaTutari) : null]
            .filter(Boolean)
            .join(' · ')}
          {k.kdvOrani != null && ` · KDV %${k.kdvOrani}`}
          {k.faturaDosyaUrl && (
            <button onClick={handleViewFile} disabled={viewingFile} className="ml-1.5 font-medium text-brand-700 hover:underline disabled:opacity-50">
              {viewingFile ? 'Açılıyor...' : 'Dosyayı görüntüle'}
            </button>
          )}
        </div>
      )}

      {isOwnRow && !editing && (
        <button onClick={() => setEditing(true)} className="mt-2 text-xs font-medium text-brand-700 hover:underline">
          {k.faturaNo || k.faturaTutari ? 'Fatura bilgisini düzenle' : 'Fatura bilgisi ekle'}
        </button>
      )}

      {isOwnRow && editing && (
        <div className="mt-3 space-y-2 rounded-lg bg-surface-sunken p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.faturaNo}
              onChange={(e) => set({ faturaNo: e.target.value })}
              placeholder="Fatura no"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              type="date"
              value={form.faturaTarihi}
              onChange={(e) => set({ faturaTarihi: e.target.value })}
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              inputMode="numeric"
              value={form.faturaTutari}
              onChange={(e) => set({ faturaTutari: e.target.value })}
              placeholder="Fatura tutarı (₺)"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              inputMode="numeric"
              value={form.kdvOrani}
              onChange={(e) => set({ kdvOrani: e.target.value })}
              placeholder="KDV oranı (%)"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              value={form.vergiNo}
              onChange={(e) => set({ vergiNo: e.target.value })}
              placeholder="Vergi no"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <div className="col-span-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-default bg-white px-2 py-2 text-xs text-text-secondary hover:bg-surface-sunken">
                <Upload size={14} className="shrink-0 text-text-muted" />
                <span className="truncate">
                  {file
                    ? `${file.name} (${formatSize(file.size)})`
                    : k.faturaDosyaUrl
                      ? 'Dosya yüklü — değiştirmek için seç (PDF/görsel)'
                      : 'Fatura dosyası seç (PDF/görsel, opsiyonel)'}
                </span>
                <input type="file" onChange={handleFileChange} className="hidden" />
              </label>
              {fileError && <p className="mt-1 text-brand-700">{fileError}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-border-subtle"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={submitting || uploading}
              onClick={handleSave}
              className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? 'Yükleniyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
