import { useState } from 'react'
import { FileText, Inbox } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  documentTemplates as templatesProvider,
  documentFields as fieldsProvider,
  documentInstances as instancesProvider,
} from '../../lib/dataProvider'
import { canSeeAllDocumentInstances, canConvertToPdf } from '../../lib/documents'
import { ROLES } from '../../lib/roles'
import { relativeTime } from '../../lib/format'
import BelgeSablonKart from './BelgeSablonKart'
import BelgeDoldurForm from './BelgeDoldurForm'
import Modal from '../common/Modal'
import { LoadingState, ErrorState } from '../common/AsyncState'

async function loadAll() {
  const [templates, instances] = await Promise.all([templatesProvider.list(), instancesProvider.list()])
  return { templates, instances }
}

const STATUS_LABELS = { draft: 'Taslak', sent: 'Gönderildi', completed: 'Tamamlandı' }
const STATUS_STYLES = {
  draft: 'bg-amber-50 text-amber-700',
  sent: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
}
const RECENT_LIMIT = 5

function InstanceRow({ instance, template, showOwner, userName, onOpen }) {
  return (
    <button
      onClick={() => template && onOpen(template, instance)}
      disabled={!template}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-sunken disabled:cursor-default disabled:hover:bg-transparent"
    >
      <FileText size={16} className="shrink-0 text-text-disabled" />
      <span className="flex-1 font-medium text-text-primary">{template?.name ?? '—'}</span>
      {showOwner && <span className="text-xs text-text-disabled">{userName(instance.createdBy)}</span>}
      <span className="text-xs text-text-disabled">{relativeTime(instance.createdAt)}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[instance.status]}`}>
        {STATUS_LABELS[instance.status]}
      </span>
    </button>
  )
}

export default function BelgeOlusturTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [activeFields, setActiveFields] = useState([])
  const [activeInstance, setActiveInstance] = useState(null)
  const [showOtherTemplates, setShowOtherTemplates] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)

  const templates = data?.templates ?? []
  const instances = data?.instances ?? []
  const seeAll = canSeeAllDocumentInstances(role)
  // "Kendi belgeni çevirebilirsin" rolleri (broker/owner/ofis) — ama ORTAK
  // kuyruğu (herkesin gönderdiği) sadece ofis işler, bkz. pendingQueue.
  const canConvertOwn = canConvertToPdf(role)
  const isQueueProcessor = role === ROLES.OFIS
  const userName = (id) => (id === user.id ? 'Sen' : (knownUsers[id]?.name ?? '—'))

  // RLS'in yaptığını mock/dev'de de simüle ediyoruz: danışman sadece kendi
  // kayıtlarını görür, ofis/broker/owner hepsini (bkz. document_instances_select).
  const visibleInstances = seeAll || isQueueProcessor ? instances : instances.filter((i) => i.createdBy === user.id)
  const pendingQueue = isQueueProcessor ? visibleInstances.filter((i) => i.status === 'sent') : []
  const recentInstances = visibleInstances
    .filter((i) => !(isQueueProcessor && i.status === 'sent'))
    .slice(0, RECENT_LIMIT)

  const favoriteTemplates = templates.filter((t) => t.isFavorite)
  const otherTemplates = templates.filter((t) => !t.isFavorite)

  function findTemplate(id) {
    return templates.find((t) => t.id === id)
  }

  async function openTemplate(template, instance = null) {
    try {
      const fields = await fieldsProvider.listByTemplate(template.id)
      setActiveTemplate(template)
      setActiveFields(fields)
      setActiveInstance(instance)
      setShowOtherTemplates(false)
    } catch (err) {
      showToast(err.message ?? 'Alanlar yüklenemedi.', 'error')
    }
  }

  function closeForm() {
    setActiveTemplate(null)
    setActiveFields([])
    setActiveInstance(null)
  }

  function upsertInstance(updated) {
    setData((prev) => ({
      ...prev,
      instances: prev.instances.some((i) => i.id === updated.id)
        ? prev.instances.map((i) => (i.id === updated.id ? updated : i))
        : [updated, ...prev.instances],
    }))
  }

  async function ensureInstance(formData) {
    if (activeInstance) return instancesProvider.updateData(activeInstance.id, formData)
    return instancesProvider.create({ templateId: activeTemplate.id, data: formData }, user.id)
  }

  async function handleSaveDraft(formData) {
    setSaving(true)
    try {
      const updated = await ensureInstance(formData)
      upsertInstance(updated)
      setActiveInstance(updated)
      showToast('Taslak kaydedildi.', 'success')
      closeForm()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSend(formData) {
    setSending(true)
    try {
      const inst = activeInstance ?? (await instancesProvider.create({ templateId: activeTemplate.id, data: formData }, user.id))
      const updated = await instancesProvider.send(inst.id, formData)
      upsertInstance(updated)
      showToast('Belge gönderildi, ofis PDF\'e çevirecek.', 'success')
      closeForm()
    } catch (err) {
      showToast(err.message ?? 'Gönderilemedi, tekrar dene.', 'error')
    } finally {
      setSending(false)
    }
  }

  async function handleCreateShareLink(formData) {
    setSharing(true)
    try {
      const inst = activeInstance ?? (await instancesProvider.create({ templateId: activeTemplate.id, data: formData }, user.id))
      await instancesProvider.updateData(inst.id, formData)
      const updated = await instancesProvider.createShareLink(inst.id)
      upsertInstance(updated)
      setActiveInstance(updated)
      showToast('Müşteri linki hazır.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Link oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSharing(false)
    }
  }

  async function handleGenerate(formData) {
    setGenerating(true)
    try {
      let inst = activeInstance
      if (inst) {
        inst = await instancesProvider.updateData(inst.id, formData)
      } else {
        inst = await instancesProvider.create({ templateId: activeTemplate.id, data: formData }, user.id)
      }
      const result = await instancesProvider.generatePdf(inst.id)
      const completed = { ...inst, status: 'completed', lockedAt: new Date().toISOString(), ...result }
      upsertInstance(completed)
      setActiveInstance(completed)
      showToast('Belge oluşturuldu ve kilitlendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'PDF oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Belge Şablonları</h3>
          {otherTemplates.length > 0 && (
            <button
              onClick={() => setShowOtherTemplates(true)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Diğer Belgeler ({otherTemplates.length})
            </button>
          )}
        </div>
        {favoriteTemplates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-10 text-center text-sm text-text-disabled">
            Henüz aktif belge şablonu eklenmedi.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {favoriteTemplates.map((t) => (
              <BelgeSablonKart key={t.id} template={t} onClick={() => openTemplate(t)} />
            ))}
          </div>
        )}
      </div>

      {pendingQueue.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Inbox size={15} /> PDF'e Çevrilmeyi Bekleyenler ({pendingQueue.length})
          </h3>
          <div className="divide-y divide-border-default rounded-2xl border border-brand-200 bg-brand-50/30">
            {pendingQueue.map((instance) => (
              <InstanceRow
                key={instance.id}
                instance={instance}
                template={findTemplate(instance.templateId)}
                showOwner
                userName={userName}
                onOpen={openTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {recentInstances.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">
            {seeAll || isQueueProcessor ? 'Doldurulan Belgeler' : 'Doldurduğun Belgeler'}
          </h3>
          <div className="divide-y divide-border-default rounded-2xl border border-border-default bg-surface-raised">
            {recentInstances.map((instance) => (
              <InstanceRow
                key={instance.id}
                instance={instance}
                template={findTemplate(instance.templateId)}
                showOwner={seeAll || isQueueProcessor}
                userName={userName}
                onOpen={openTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {showOtherTemplates && (
        <Modal title="Diğer Belgeler" onClose={() => setShowOtherTemplates(false)} maxWidth="max-w-md">
          <div className="space-y-2">
            {otherTemplates.map((t) => (
              <BelgeSablonKart key={t.id} template={t} onClick={() => openTemplate(t)} />
            ))}
          </div>
        </Modal>
      )}

      {activeTemplate && (
        <BelgeDoldurForm
          template={activeTemplate}
          fields={activeFields}
          instance={activeInstance}
          // Ofis her kaydı çevirebilir (kuyruk); broker/owner SADECE kendi
          // oluşturduğunu (bkz. canConvertToPdf + generate-document-pdf'teki
          // aynı kural) — danışman hiçbir zaman.
          canConvert={canConvertOwn && (isQueueProcessor || !activeInstance || activeInstance.createdBy === user.id)}
          isOwner={!activeInstance || activeInstance.createdBy === user.id}
          onClose={closeForm}
          onSaveDraft={handleSaveDraft}
          onSend={handleSend}
          onGenerate={handleGenerate}
          onCreateShareLink={handleCreateShareLink}
          saving={saving}
          sending={sending}
          generating={generating}
          sharing={sharing}
        />
      )}
    </div>
  )
}
