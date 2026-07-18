import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { docs as docsProvider, categories as categoriesProvider } from '../lib/dataProvider'
import { canManageDocs, currentVersion, versionsForDoc } from '../lib/docs'
import { uploadDocFile } from '../lib/storage'
import FolderList from '../components/rehber/FolderList'
import DocCard from '../components/rehber/DocCard'
import PreviewModal from '../components/rehber/PreviewModal'
import UploadDocModal from '../components/rehber/UploadDocModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const EMPTY = []

async function loadAll() {
  const [docs, versions, categories] = await Promise.all([
    docsProvider.listDocs(),
    docsProvider.listVersions(),
    categoriesProvider.list('docs'),
  ])
  return { docs, versions, categories }
}

export default function Rehber() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [previewVersion, setPreviewVersion] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const canManage = canManageDocs(role)
  const docs = data?.docs ?? EMPTY
  const versions = data?.versions ?? EMPTY
  const categories = data?.categories ?? EMPTY
  const userName = (id) => knownUsers[id]?.name ?? '—'

  // Kategoriler yüklendikten sonra ilk klasör otomatik seçilsin.
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].key)
  }, [categories, selectedCategory])

  const docsInCategory = useMemo(
    () => docs.filter((d) => d.categoryKey === selectedCategory),
    [docs, selectedCategory],
  )

  function countFor(categoryKey) {
    return docs.filter((d) => d.categoryKey === categoryKey).length
  }

  async function handleSubmitDoc(form) {
    setSubmitting(true)
    try {
      let targetDocId = form.docId
      if (!targetDocId) {
        const created = await docsProvider.createDoc({ categoryKey: form.categoryKey, baslik: form.baslik }, user.id)
        targetDocId = created.id
        setData((prev) => ({ ...prev, docs: [...prev.docs, created] }))
      }

      if (form.mode === 'file') {
        const storagePath = await uploadDocFile(form.file, { categoryKey: form.categoryKey, docId: targetDocId })
        const version = await docsProvider.addVersion(
          { docId: targetDocId, filename: form.file.name, storagePath },
          user.id,
        )
        setData((prev) => ({
          ...prev,
          versions: [...prev.versions.map((v) => (v.docId === targetDocId ? { ...v, isCurrent: false } : v)), version],
        }))
        showToast('Dosya yüklendi.', 'success')
      } else {
        await docsProvider.setContentText(targetDocId, form.contentText)
        setData((prev) => ({
          ...prev,
          docs: prev.docs.map((d) => (d.id === targetDocId ? { ...d, contentText: form.contentText } : d)),
        }))
        showToast('Yazı kaydedildi.', 'success')
      }

      setSelectedCategory(form.categoryKey)
      setShowUpload(false)
      setEditingDoc(null)
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Ekle
          </button>
        </div>
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="grid gap-5 md:grid-cols-[200px_1fr]">
          <FolderList categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} countFor={countFor} />

          <div className="space-y-3">
            {docsInCategory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
                Bu klasörde henüz doküman yok.
              </div>
            ) : (
              docsInCategory.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  current={currentVersion(doc.id, versions)}
                  history={versionsForDoc(doc.id, versions)}
                  onPreview={setPreviewVersion}
                  resolveName={userName}
                  canManage={canManage}
                  onEditText={() => setEditingDoc(doc)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {previewVersion && <PreviewModal version={previewVersion} onClose={() => setPreviewVersion(null)} />}

      {showUpload && (
        <UploadDocModal
          onClose={() => setShowUpload(false)}
          onSubmit={handleSubmitDoc}
          submitting={submitting}
          docsInCategory={docsInCategory}
          defaultCategory={selectedCategory}
          categories={categories}
        />
      )}

      {editingDoc && (
        <UploadDocModal
          editingDoc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleSubmitDoc}
          submitting={submitting}
          docsInCategory={docsInCategory}
          categories={categories}
        />
      )}
    </div>
  )
}
