import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  documentTemplates as templatesProvider,
  documentFields as fieldsProvider,
  documentInstances as instancesProvider,
} from '../../lib/dataProvider'
import { canSeeAllDocumentInstances } from '../../lib/documents'
import { relativeTime } from '../../lib/format'
import BelgeSablonKart from './BelgeSablonKart'
import BelgeDoldurForm from './BelgeDoldurForm'
import { LoadingState, ErrorState } from '../common/AsyncState'

async function loadAll() {
  const [templates, instances] = await Promise.all([templatesProvider.list(), instancesProvider.list()])
  return { templates, instances }
}

const STATUS_LABELS = { draft: 'Taslak', completed: 'Tamamlandı' }
const STATUS_STYLES = { draft: 'bg-amber-50 text-amber-700', completed: 'bg-emerald-50 text-emerald-700' }

export default function BelgeOlusturTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [activeFields, setActiveFields] = useState([])
  const [activeInstance, setActiveInstance] = useState(null)
  const [saving, setSaving] = useState(false)

  const templates = data?.templates ?? []
  const instances = data?.instances ?? []
  const seeAll = canSeeAllDocumentInstances(role)
  const userName = (id) => (id === user.id ? 'Sen' : (knownUsers[id]?.name ?? '—'))

  async function openTemplate(template, instance = null) {
    try {
      const fields = await fieldsProvider.listByTemplate(template.id)
      setActiveTemplate(template)
      setActiveFields(fields)
      setActiveInstance(instance)
    } catch (err) {
      showToast(err.message ?? 'Alanlar yüklenemedi.', 'error')
    }
  }

  function closeForm() {
    setActiveTemplate(null)
    setActiveFields([])
    setActiveInstance(null)
  }

  async function handleSaveDraft(formData) {
    setSaving(true)
    try {
      if (activeInstance) {
        const updated = await instancesProvider.updateData(activeInstance.id, formData)
        setData((prev) => ({ ...prev, instances: prev.instances.map((i) => (i.id === updated.id ? updated : i)) }))
      } else {
        const created = await instancesProvider.create({ templateId: activeTemplate.id, data: formData }, user.id)
        setData((prev) => ({ ...prev, instances: [created, ...prev.instances] }))
      }
      showToast('Taslak kaydedildi.', 'success')
      closeForm()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Belge Şablonları</h3>
        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-10 text-center text-sm text-text-disabled">
            Henüz aktif belge şablonu eklenmedi.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {templates.map((t) => (
              <BelgeSablonKart key={t.id} template={t} onClick={() => openTemplate(t)} />
            ))}
          </div>
        )}
      </div>

      {instances.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">
            {seeAll ? 'Doldurulan Belgeler' : 'Doldurduğun Belgeler'}
          </h3>
          <div className="divide-y divide-border-default rounded-2xl border border-border-default bg-surface-raised">
            {instances.map((instance) => {
              const template = templates.find((t) => t.id === instance.templateId)
              return (
                <button
                  key={instance.id}
                  onClick={() => template && instance.status === 'draft' && openTemplate(template, instance)}
                  disabled={instance.status !== 'draft'}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-sunken disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <FileText size={16} className="shrink-0 text-text-disabled" />
                  <span className="flex-1 font-medium text-text-primary">{template?.name ?? '—'}</span>
                  {seeAll && <span className="text-xs text-text-disabled">{userName(instance.createdBy)}</span>}
                  <span className="text-xs text-text-disabled">{relativeTime(instance.createdAt)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[instance.status]}`}>
                    {STATUS_LABELS[instance.status]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {activeTemplate && (
        <BelgeDoldurForm
          template={activeTemplate}
          fields={activeFields}
          instance={activeInstance}
          onClose={closeForm}
          onSaveDraft={handleSaveDraft}
          saving={saving}
        />
      )}
    </div>
  )
}
