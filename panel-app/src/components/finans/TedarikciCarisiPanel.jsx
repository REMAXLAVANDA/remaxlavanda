import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { kasalar as kasalarProvider, tedarikciFaturalari as tedarikciFaturalariProvider, tedarikciOdemeleri as tedarikciOdemeleriProvider } from '../../lib/dataProvider'
import { faturaKalan, tedarikciOzeti } from '../../lib/tedarikciCarisi'
import { validateFinansFile, uploadFinansFile, getSignedFinansUrl } from '../../lib/storage'
import { formatDateOnly } from '../../lib/format'
import { LoadingState, ErrorState } from '../common/AsyncState'
import Modal from '../common/Modal'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

async function loadAll() {
  const [kasalar, faturalar, odemeler] = await Promise.all([kasalarProvider.list(), tedarikciFaturalariProvider.list(), tedarikciOdemeleriProvider.list()])
  return { kasalar, faturalar, odemeler }
}

// 2. Aşama Adım 2 (docs/muhasebe-tasarim.md madde f) — bugüne kadar
// sadece tedarikçiye yapılan ÖDEME tutuluyordu (Kasa Raporu'ndan),
// gelen faturanın borç tarafı hiç kayıtlı değildi. Bu ekran ikisini bir
// araya getirip "bu tedarikçiye ne kadar borcumuz var" sorusuna cevap
// veriyor. Kasa Raporu/Masraflar'la AYNI görünürlük (broker/owner/
// muhasebe) — danışman/ofis tedarikçi borcunu görmez.
export default function TedarikciCarisiPanel() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [expandedKey, setExpandedKey] = useState(null)
  const [showFaturaModal, setShowFaturaModal] = useState(false)
  const [odemeModalFatura, setOdemeModalFatura] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const kasalar = data?.kasalar ?? []
  const odemeler = data?.odemeler ?? []
  const ozet = useMemo(() => tedarikciOzeti(data?.faturalar, odemeler), [data, odemeler])

  async function handleFaturaSubmit(payload) {
    setSubmitting(true)
    try {
      await tedarikciFaturalariProvider.create(payload, user.id)
      showToast('Fatura eklendi.', 'success')
      setShowFaturaModal(false)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Fatura eklenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOdemeSubmit(payload) {
    setSubmitting(true)
    try {
      await tedarikciOdemeleriProvider.create(payload, user.id)
      showToast('Ödeme kaydedildi.', 'success')
      setOdemeModalFatura(null)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Ödeme kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-text-muted">Her tedarikçinin fatura/ödeme durumu — pozitif bakiye tedarikçiye borcumuz olduğu anlamına gelir.</p>
        <button
          onClick={() => setShowFaturaModal(true)}
          className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700"
        >
          Fatura Ekle
        </button>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="space-y-2">
          {ozet.length === 0 && <p className="text-sm text-text-muted">Henüz tedarikçi fatura/ödeme kaydı yok.</p>}
          {ozet.map((t) => {
            const isExpanded = expandedKey === t.key
            return (
              <div key={t.key} className="rounded-2xl border border-border-default bg-surface-raised p-4">
                <button onClick={() => setExpandedKey(isExpanded ? null : t.key)} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="text-sm font-medium text-text-primary">{t.tedarikciAdi}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-text-secondary">Fatura: {tl(t.toplamFatura)}</span>
                    <span className="text-text-secondary">Ödeme: {tl(t.toplamOdeme)}</span>
                    <span className={`font-semibold ${t.bakiye > 0 ? 'text-red-600' : 'text-emerald-700'}`}>Borç: {tl(t.bakiye)}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
                    {t.faturalar.length === 0 && <p className="text-xs text-text-muted">Fatura kaydı yok, sadece ödeme yapılmış.</p>}
                    {t.faturalar.map((f) => {
                      const kalan = faturaKalan(f, odemeler)
                      return (
                        <FaturaSatiri key={f.id} fatura={f} kalan={kalan} onOde={() => setOdemeModalFatura(f)} />
                      )
                    })}
                    {t.odemeler.filter((o) => !o.tedarikciFaturaId).length > 0 && (
                      <div className="mt-2 border-t border-border-subtle pt-2">
                        <p className="mb-1 text-xs font-medium text-text-secondary">Faturaya bağlı olmayan ödemeler</p>
                        {t.odemeler
                          .filter((o) => !o.tedarikciFaturaId)
                          .map((o) => (
                            <div key={o.id} className="flex items-center justify-between py-1 text-xs text-text-muted">
                              <span>{formatDateOnly(o.tarih)} · {o.faturaNo ? `Fatura No: ${o.faturaNo}` : o.aciklama || '—'}</span>
                              <span className="font-medium text-text-primary">{tl(o.tutar)}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showFaturaModal && <FaturaEkleModal userId={user.id} onClose={() => setShowFaturaModal(false)} onSubmit={handleFaturaSubmit} submitting={submitting} />}
      {odemeModalFatura && (
        <FaturaOdeModal
          fatura={odemeModalFatura}
          kalan={faturaKalan(odemeModalFatura, odemeler)}
          kasalar={kasalar}
          onClose={() => setOdemeModalFatura(null)}
          onSubmit={handleOdemeSubmit}
          submitting={submitting}
          showToast={showToast}
        />
      )}
    </div>
  )
}

function FaturaSatiri({ fatura, kalan, onOde }) {
  const [viewingFile, setViewingFile] = useState(false)
  const { showToast } = useToast()
  const odendi = kalan <= 0

  async function handleViewFile() {
    setViewingFile(true)
    try {
      const url = await getSignedFinansUrl(fatura.faturaDosyaUrl)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      showToast('Dosya açılamadı, tekrar dene.', 'error')
    } finally {
      setViewingFile(false)
    }
  }

  return (
    <div className="rounded-xl border border-border-subtle p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-text-primary">
          {formatDateOnly(fatura.faturaTarihi)}
          {fatura.faturaNo ? ` · Fatura No: ${fatura.faturaNo}` : ''}
          {fatura.vadeTarihi ? ` · Vade: ${formatDateOnly(fatura.vadeTarihi)}` : ''}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${odendi ? 'bg-tint-green text-tint-green-text' : 'bg-tint-amber text-tint-amber-text'}`}>
          {odendi ? 'Ödendi' : `Kalan: ${tl(kalan)}`}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-text-primary">{tl(fatura.tutar)}{fatura.aciklama ? ` — ${fatura.aciklama}` : ''}</span>
        <div className="flex items-center gap-3">
          {fatura.faturaDosyaUrl && (
            <button onClick={handleViewFile} disabled={viewingFile} className="font-medium text-brand-700 hover:underline disabled:opacity-50">
              {viewingFile ? 'Açılıyor...' : 'Dosyayı görüntüle'}
            </button>
          )}
          {!odendi && (
            <button onClick={onOde} className="font-medium text-brand-700 hover:underline">
              Öde
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FaturaEkleModal({ userId, onClose, onSubmit, submitting }) {
  const { showToast } = useToast()
  const [tedarikciAdi, setTedarikciAdi] = useState('')
  const [vergiNo, setVergiNo] = useState('')
  const [faturaNo, setFaturaNo] = useState('')
  const [faturaTarihi, setFaturaTarihi] = useState(new Date().toISOString().slice(0, 10))
  const [vadeTarihi, setVadeTarihi] = useState('')
  const [tutar, setTutar] = useState('')
  const [kdvTutari, setKdvTutari] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [uploading, setUploading] = useState(false)

  const canSubmit = tedarikciAdi.trim().length > 0 && Number(tutar) > 0 && !!faturaTarihi

  function handleFileChange(e) {
    const selected = e.target.files?.[0]
    if (!selected) return
    const check = validateFinansFile(selected)
    if (!check.ok) {
      setFile(null)
      setFileError(check.reason)
      return
    }
    setFile(selected)
    setFileError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setUploading(true)
    try {
      let faturaDosyaUrl = null
      if (file) faturaDosyaUrl = await uploadFinansFile(file, userId)
      onSubmit({
        tedarikciAdi: tedarikciAdi.trim(),
        vergiNo: vergiNo.trim() || null,
        faturaNo: faturaNo.trim() || null,
        faturaTarihi,
        vadeTarihi: vadeTarihi || null,
        tutar: Number(tutar),
        kdvTutari: kdvTutari ? Number(kdvTutari) : null,
        faturaDosyaUrl,
        aciklama: aciklama.trim() || null,
      })
    } catch (err) {
      showToast(err.message ?? 'Dosya yüklenemedi, tekrar dene.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal title="Tedarikçi Faturası Ekle" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Fatura Tarihi *</label>
            <input
              type="date"
              value={faturaTarihi}
              onChange={(e) => setFaturaTarihi(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Vade Tarihi (opsiyonel)</label>
            <input
              type="date"
              value={vadeTarihi}
              onChange={(e) => setVadeTarihi(e.target.value)}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Tutar (KDV dahil, ₺) *</label>
            <input
              inputMode="numeric"
              value={tutar}
              onChange={(e) => setTutar(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">KDV Tutarı (opsiyonel)</label>
            <input
              inputMode="numeric"
              value={kdvTutari}
              onChange={(e) => setKdvTutari(e.target.value.replace(/[^0-9]/g, ''))}
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

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-default bg-white px-2 py-2 text-xs text-text-secondary hover:bg-surface-sunken">
          <Upload size={14} className="shrink-0 text-text-muted" />
          <span className="truncate">{file ? `${file.name} (${formatSize(file.size)})` : 'Fatura dosyasını seç (opsiyonel, PDF/görsel)'}</span>
          <input type="file" onChange={handleFileChange} className="hidden" />
        </label>
        {fileError && <p className="text-xs text-brand-700">{fileError}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting || uploading || !!fileError}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting || uploading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FaturaOdeModal({ fatura, kalan, kasalar, onClose, onSubmit, submitting }) {
  const [tutar, setTutar] = useState(String(kalan))
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10))
  const [kasaId, setKasaId] = useState('')

  const canSubmit = Number(tutar) > 0 && !!tarih && !!kasaId

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      tedarikciAdi: fatura.tedarikciAdi,
      vergiNo: fatura.vergiNo,
      tutar: Number(tutar),
      tarih,
      kasaId,
      faturaNo: fatura.faturaNo,
      tedarikciFaturaId: fatura.id,
      aciklama: null,
    })
  }

  return (
    <Modal title={`${fatura.tedarikciAdi} — Fatura Ödemesi`} onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-text-muted">Fatura kalan tutarı: {tl(kalan)}</p>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Kasa *</label>
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
