import { useMemo, useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MOCK_DOCS, MOCK_DOC_VERSIONS } from '../data/mockDocs'
import { DOC_CATEGORIES } from '../lib/categories'
import { canManageDocs, currentVersion, nextVersionNo, versionsForDoc } from '../lib/docs'
import { userName } from '../lib/knownUsers'
import { mutate } from '../lib/api'
import FolderList from '../components/rehber/FolderList'
import DocCard from '../components/rehber/DocCard'
import PreviewModal from '../components/rehber/PreviewModal'
import UploadDocModal from '../components/rehber/UploadDocModal'

export default function Rehber() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [docs, setDocs] = useState(MOCK_DOCS)
  const [versions, setVersions] = useState(MOCK_DOC_VERSIONS)
  const [selectedCategory, setSelectedCategory] = useState(DOC_CATEGORIES[0].key)
  const [previewVersion, setPreviewVersion] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canManage = canManageDocs(role)

  const docsInCategory = useMemo(
    () => docs.filter((d) => d.categoryKey === selectedCategory),
    [docs, selectedCategory],
  )

  function countFor(categoryKey) {
    return docs.filter((d) => d.categoryKey === categoryKey).length
  }

  async function handleUpload({ categoryKey, docId, baslik, filename }) {
    setSubmitting(true)
    try {
      await mutate('docs.upload', { categoryKey, docId, baslik, filename })

      let targetDocId = docId
      if (!targetDocId) {
        targetDocId = `doc-${Date.now()}`
        setDocs((prev) => [...prev, { id: targetDocId, categoryKey, baslik, createdBy: user.id }])
      }

      const versionNo = nextVersionNo(targetDocId, versions)
      setVersions((prev) => [
        ...prev.map((v) => (v.docId === targetDocId ? { ...v, isCurrent: false } : v)),
        {
          id: `v-${Date.now()}`,
          docId: targetDocId,
          versionNo,
          filename,
          url: '#',
          isCurrent: true,
          uploadedBy: user.id,
          uploadedAt: new Date().toISOString(),
        },
      ])
      setSelectedCategory(categoryKey)
      setShowUpload(false)
      showToast('Dosya yüklendi.', 'success')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavanda-50 text-lavanda-600">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Rehber</h1>
            <p className="text-xs text-ink-400">Ofis dokümanları ve hazır metinler</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 rounded-lg bg-lavanda-600 px-3 py-2 text-sm font-medium text-white hover:bg-lavanda-700"
          >
            <Plus size={16} /> Dosya Yükle
          </button>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        <FolderList selected={selectedCategory} onSelect={setSelectedCategory} countFor={countFor} />

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
              />
            ))
          )}
        </div>
      </div>

      {previewVersion && <PreviewModal version={previewVersion} onClose={() => setPreviewVersion(null)} />}

      {showUpload && (
        <UploadDocModal
          onClose={() => setShowUpload(false)}
          onSubmit={handleUpload}
          submitting={submitting}
          docsInCategory={docsInCategory}
          defaultCategory={selectedCategory}
        />
      )}
    </div>
  )
}
