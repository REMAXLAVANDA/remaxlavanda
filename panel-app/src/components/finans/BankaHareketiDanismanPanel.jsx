import { useState } from 'react'
import { Plus, Upload, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { bankaHareketleri as bankaHareketleriProvider } from '../../lib/dataProvider'
import { BANKA_HAREKETI_DURUM_LABELS, BANKA_HAREKETI_DURUM_STYLES, BANKA_HAREKETI_TUR_LABELS } from '../../lib/bankaHareketleri'
import { formatDateOnly, formatThousands, parseThousands } from '../../lib/format'
import { validateFinansFile, uploadFinansFile, getSignedFinansUrl } from '../../lib/storage'
import { LoadingState, ErrorState } from '../common/AsyncState'
import ConfirmDialog from '../common/ConfirmDialog'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const today = () => new Date().toISOString().slice(0, 10)

// Danışman/ofis'in KENDİ dekontunu ekleyip görebildiği, broker'ın tam
// yönetim ekranından (BankaHareketleriPanel) BİLİNÇLİ olarak AYRI, sade bir
// görünüm — 2026-10-11 broker kararı: "danışman girsin ... istediği kadar
// girebilsin, parçalı işlemler olabiliyor". Eşleştirme/"ödeme alındı" son
// onayı burada YOK — o hâlâ sadece broker'ın ekranında (bkz.
// lib/bankaHareketleri.js canSubmitBankaHareketi/canManageBankaHareketleri
// notu, migration 20261011093000 RLS'i zaten eşleşmiş bir kaydı buradan
// düzenletmiyor/sildirmiyor).
export default function BankaHareketiDanismanPanel() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, setData, loading, error, reload } = useAsyncList(() => bankaHareketleriProvider.list(), [])
  const [form, setForm] = useState({ tutar: '', tarih: today(), aciklama: '', tur: 'hizmet_bedeli', bankaAdi: '' })
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const ownHareketler = (data ?? []).filter((h) => h.olusturanId === user.id)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const parsedTutar = parseThousands(form.tutar)
  const canSubmit = parsedTutar !== null && parsedTutar > 0 && form.tarih

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

  async function handleCreate(e) {
    e.preventDefault()
    if (!canSubmit || fileError) return
    setSubmitting(true)
    try {
      const dekontDosyaUrl = file ? await uploadFinansFile(file, user.id) : null
      const created = await bankaHareketleriProvider.create(
        {
          tutar: parsedTutar,
          tarih: form.tarih,
          aciklama: form.aciklama.trim(),
          tur: form.tur,
          bankaAdi: form.bankaAdi.trim(),
          dekontDosyaUrl,
        },
        user.id,
      )
      setData((prev) => [created, ...(prev ?? [])])
      setForm({ tutar: '', tarih: today(), aciklama: '', tur: 'hizmet_bedeli', bankaAdi: '' })
      setFile(null)
      showToast('Dekont kaydedildi, broker eşleştirip onaylayacak.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleView(path) {
    try {
      const url = await getSignedFinansUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      showToast('Dosya açılamadı, tekrar dene.', 'error')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await bankaHareketleriProvider.remove(deleteTarget)
      setData((prev) => (prev ?? []).filter((h) => h.id !== deleteTarget))
      setDeleteTarget(null)
      showToast('Kayıt silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <p className="mb-5 text-sm text-text-muted">
        Sana gelen ödemenin dekont bilgisini buraya gir — parçalı geldiyse her parçayı ayrı ayrı ekleyebilirsin. Broker
        bunları bekleyen faturalarla eşleştirip son onayı verir.
      </p>

      <form onSubmit={handleCreate} className="mb-6 space-y-2 rounded-2xl border border-border-default bg-surface-raised p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            inputMode="numeric"
            value={form.tutar}
            onChange={(e) => set({ tutar: formatThousands(e.target.value) })}
            placeholder="Tutar (₺)"
            className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <input
            required
            type="date"
            value={form.tarih}
            onChange={(e) => set({ tarih: e.target.value })}
            className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          />
          <select
            value={form.tur}
            onChange={(e) => set({ tur: e.target.value })}
            className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
          >
            {Object.entries(BANKA_HAREKETI_TUR_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={form.bankaAdi}
            onChange={(e) => set({ bankaAdi: e.target.value })}
            placeholder="Banka adı"
            className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <input
            value={form.aciklama}
            onChange={(e) => set({ aciklama: e.target.value })}
            placeholder="Açıklama (opsiyonel)"
            className="sm:col-span-2 rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>
        <div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-default bg-surface-sunken px-3 py-2.5 text-sm text-text-secondary hover:bg-border-subtle">
            <Upload size={16} className="shrink-0 text-text-muted" />
            <span className="truncate">{file ? `${file.name} (${formatSize(file.size)})` : 'Dekont dosyası seç (PDF/görsel, opsiyonel)'}</span>
            <input type="file" onChange={handleFileChange} className="hidden" />
          </label>
          {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus size={16} /> {submitting ? 'Kaydediliyor...' : 'Ekle'}
          </button>
        </div>
      </form>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="space-y-2">
          {ownHareketler.length === 0 ? (
            <p className="text-sm text-text-muted">Henüz dekont eklemedin.</p>
          ) : (
            ownHareketler.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-text-primary">
                    <span className="font-medium">{tl(h.tutar)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BANKA_HAREKETI_DURUM_STYLES[h.durum]}`}>
                      {BANKA_HAREKETI_DURUM_LABELS[h.durum]}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {formatDateOnly(h.tarih)} · {BANKA_HAREKETI_TUR_LABELS[h.tur] ?? h.tur}
                    {h.bankaAdi && ` · ${h.bankaAdi}`}
                    {h.aciklama && ` · ${h.aciklama}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {h.dekontDosyaUrl && (
                    <button onClick={() => handleView(h.dekontDosyaUrl)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
                      Dekontu görüntüle
                    </button>
                  )}
                  {h.durum === 'eslesmedi' && (
                    <button
                      onClick={() => setDeleteTarget(h.id)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} /> Sil
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Kaydı sil"
          message="Bu dekont kaydı kalıcı olarak silinecek."
          confirmLabel="Evet, sil"
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirming={deleting}
        />
      )}
    </div>
  )
}
