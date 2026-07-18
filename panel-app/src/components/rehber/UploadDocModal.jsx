import { useState } from 'react'
import { Upload } from 'lucide-react'
import Modal from '../common/Modal'
import { validateFile } from '../../lib/storage'

const NEW_DOC = '__new__'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Üç kullanım: (1) yeni dosya yükleme (Storage'a), (2) yeni yazı girme
// (docs.content_text — dosya gerektirmeyen şirket bilgisi gibi içerikler
// için), (3) var olan bir dokümanı düzenleme (editingDoc) — başlık HER
// zaman düzenlenebilir, içerik SADECE metin dokümanlarında (contentText
// dolu olanlarda) düzenlenebilir; dosya dokümanlarında yeni dosya/versiyon
// eklemek ayrı bir akış (bkz. "+ Yeni doküman" altındaki mevcut doküman
// seçimi), burada sadece başlık düzeltilir.
export default function UploadDocModal({
  onClose,
  onSubmit,
  submitting,
  docsInCategory,
  defaultCategory,
  categories,
  editingDoc,
}) {
  const isEditingText = Boolean(editingDoc) && editingDoc.contentText != null
  const isEditingFile = Boolean(editingDoc) && editingDoc.contentText == null
  const [mode, setMode] = useState(isEditingText ? 'text' : 'file')
  const [categoryKey, setCategoryKey] = useState(editingDoc?.categoryKey ?? defaultCategory ?? categories[0]?.key ?? '')
  const [docId, setDocId] = useState(editingDoc?.id ?? NEW_DOC)
  const [baslik, setBaslik] = useState(editingDoc?.baslik ?? '')
  const [contentText, setContentText] = useState(editingDoc?.contentText ?? '')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)

  const isNewDoc = docId === NEW_DOC
  const canSubmit = isEditingFile
    ? baslik.trim().length > 0
    : mode === 'file'
      ? Boolean(file) && (isNewDoc ? baslik.trim().length > 0 : true)
      : baslik.trim().length > 0 && contentText.trim().length > 0

  function handleFileChange(e) {
    const selected = e.target.files?.[0] ?? null
    if (!selected) {
      setFile(null)
      setFileError(null)
      return
    }
    const check = validateFile(selected)
    if (!check.ok) {
      setFile(null)
      setFileError(check.reason)
      return
    }
    setFile(selected)
    setFileError(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    if (isEditingFile) {
      onSubmit({ mode: 'rename', docId: editingDoc.id, baslik: baslik.trim() })
    } else if (isEditingText) {
      onSubmit({ mode: 'text', categoryKey: editingDoc.categoryKey, docId: editingDoc.id, baslik: baslik.trim(), contentText: contentText.trim() })
    } else if (mode === 'file') {
      onSubmit({ mode: 'file', categoryKey, docId: isNewDoc ? null : docId, baslik: isNewDoc ? baslik : null, file })
    } else {
      onSubmit({ mode: 'text', categoryKey, docId: isNewDoc ? null : docId, baslik: isNewDoc ? baslik : null, contentText: contentText.trim() })
    }
  }

  return (
    <Modal title={editingDoc ? (isEditingFile ? 'Başlığı Düzenle' : 'Metni Düzenle') : 'Doküman Ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!editingDoc && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'file' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              Dosya Yükle
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'text' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              Yazı Yaz
            </button>
          </div>
        )}

        {!editingDoc && (
          <select
            value={categoryKey}
            onChange={(e) => {
              setCategoryKey(e.target.value)
              setDocId(NEW_DOC)
            }}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        {mode === 'file' && !editingDoc && (
          <select
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            <option value={NEW_DOC}>+ Yeni doküman</option>
            {docsInCategory
              .filter((d) => !d.contentText)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.baslik} (yeni versiyon ekle)
                </option>
              ))}
          </select>
        )}

        {(isEditingFile || isEditingText || isNewDoc) && (
          <input
            required
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Doküman başlığı"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        )}

        {isEditingFile ? null : mode === 'file' ? (
          <div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-300 bg-ink-50 px-3 py-3 text-sm text-ink-600 hover:bg-ink-100">
              <Upload size={16} className="shrink-0 text-ink-400" />
              <span className="truncate">{file ? `${file.name} (${formatSize(file.size)})` : 'Dosya seç (PDF, resim, Office, ZIP — 20 MB\'a kadar)'}</span>
              <input type="file" onChange={handleFileChange} className="hidden" />
            </label>
            {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          </div>
        ) : (
          <textarea
            required
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Metni buraya yaz..."
            rows={8}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
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
