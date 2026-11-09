import { useState } from 'react'
import { Plus, Trash2, ArrowLeft, Save, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { belgeler as belgelerProvider } from '../../lib/dataProvider'
import { formatDateOnly } from '../../lib/format'
import { LoadingState, ErrorState } from '../common/AsyncState'
import ConfirmDialog from '../common/ConfirmDialog'

const YETKI_BELGESI_SLUG = 'yetki-belgesi'

async function loadAll() {
  const templates = await belgelerProvider.listTemplates()
  const template = templates.find((t) => t.slug === YETKI_BELGESI_SLUG) ?? null
  if (!template) return { template: null, fields: [], instances: [] }
  const [fields, instances] = await Promise.all([
    belgelerProvider.listFields(template.id),
    belgelerProvider.listInstances(template.id),
  ])
  return { template, fields, instances }
}

function instanceTitle(instance) {
  return instance.data?.d1_musteri_ad?.trim() || 'İsimsiz taslak'
}

// Rehber > Belge Oluştur — broker, 2026-11-05: danışmanlar yetki almak
// için müşteri/gayrimenkul bilgilerini WhatsApp'tan gönderiyordu, ofis
// elle hazırlıyordu; bir önceki deneme ("çift kayıt yapıyordu, sığmıyordu
// hata veriyordu") burada düzeltildi — "Yeni Belge" SADECE bir kez
// createInstance çağırır, sonraki her "Kaydet" aynı taslağı (id) update
// eder, yeni satır AÇMAZ. Şimdilik sadece Yetki Belgesi şablonu
// gösteriliyor (DB'de 15 şablon daha var ama UI'da doğrulanmadı).
// PDF oluşturma adımı bilerek bu increment'e dahil değil — gerçek Yetki
// Belgesi sözleşme metni (21+ madde) elimizde yok, broker'dan istenecek.
export default function BelgeOlusturPanel() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [activeInstance, setActiveInstance] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const template = data?.template ?? null
  const fields = data?.fields ?? []
  const instances = data?.instances ?? []

  async function handleYeniBelge() {
    setCreating(true)
    try {
      const created = await belgelerProvider.createInstance(template.id, user.id)
      setData((prev) => ({ ...prev, instances: [created, ...prev.instances] }))
      setActiveInstance(created)
      setFormValues(created.data ?? {})
    } catch (err) {
      showToast(err.message ?? 'Oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setCreating(false)
    }
  }

  function openInstance(instance) {
    setActiveInstance(instance)
    setFormValues(instance.data ?? {})
  }

  async function handleKaydet() {
    setSaving(true)
    try {
      const updated = await belgelerProvider.updateInstanceData(activeInstance.id, formValues)
      setData((prev) => ({ ...prev, instances: prev.instances.map((i) => (i.id === updated.id ? updated : i)) }))
      setActiveInstance(updated)
      showToast('Taslak kaydedildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await belgelerProvider.removeInstance(deleteTarget.id)
      setData((prev) => ({ ...prev, instances: prev.instances.filter((i) => i.id !== deleteTarget.id) }))
      if (activeInstance?.id === deleteTarget.id) setActiveInstance(null)
      showToast('Taslak silindi.', 'success')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={reload} />

  if (!template) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-muted">
        Yetki Belgesi şablonu henüz etkin değil.
      </div>
    )
  }

  if (activeInstance) {
    return (
      <div>
        <button
          onClick={() => setActiveInstance(null)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={15} /> Taslaklara dön
        </button>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">Bilgileri doldur, kaydet. İstediğin zaman geri dönüp devam edebilirsin.</p>
          <button
            onClick={handleKaydet}
            disabled={saving}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        <div className="space-y-4 rounded-2xl border border-border-default bg-surface-raised p-5">
          {fields.map((f) => (
            <div key={f.fieldKey}>
              {f.fieldType === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={!!formValues[f.fieldKey]}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [f.fieldKey]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border-default"
                  />
                  {f.label}
                </label>
              ) : (
                <>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">{f.label}</label>
                  {f.fieldType === 'textarea' ? (
                    <textarea
                      value={formValues[f.fieldKey] ?? ''}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [f.fieldKey]: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      type={f.fieldType === 'date' ? 'date' : 'text'}
                      value={formValues[f.fieldKey] ?? ''}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [f.fieldKey]: e.target.value }))}
                      className="w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm"
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-text-muted">
          PDF oluşturma bir sonraki adımda eklenecek — şimdilik bilgiler burada güvenle taslak olarak saklanıyor.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">Müşteri/gayrimenkul bilgilerini doldur, yetki sözleşmesi için taslak hazırla.</p>
        <button
          onClick={handleYeniBelge}
          disabled={creating}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus size={16} /> Yeni Belge
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-muted">
          Henüz hiç taslak oluşturulmamış.
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border-default bg-surface-raised p-4"
            >
              <button onClick={() => openInstance(i)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <FileText size={16} className="shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{instanceTitle(i)}</span>
                  <span className="block text-xs text-text-muted">{formatDateOnly(i.createdAt)}</span>
                </span>
              </button>
              <button
                onClick={() => setDeleteTarget(i)}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} /> Sil
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Bu taslağı silmek istiyor musun?"
          message={`"${instanceTitle(deleteTarget)}" kalıcı olarak silinecek, geri alınamaz.`}
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
