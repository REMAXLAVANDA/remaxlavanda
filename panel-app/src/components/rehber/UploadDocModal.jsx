import { useState } from 'react'
import Modal from '../common/Modal'

const NEW_DOC = '__new__'

export default function UploadDocModal({ onClose, onSubmit, submitting, docsInCategory, defaultCategory, categories }) {
  const [categoryKey, setCategoryKey] = useState(defaultCategory ?? categories[0]?.key ?? '')
  const [docId, setDocId] = useState(NEW_DOC)
  const [baslik, setBaslik] = useState('')
  const [filename, setFilename] = useState('')

  const isNewDoc = docId === NEW_DOC
  const canSubmit = filename.trim().length > 0 && (isNewDoc ? baslik.trim().length > 0 : true)

  return (
    <Modal title="Dosya Yükle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ categoryKey, docId: isNewDoc ? null : docId, baslik: isNewDoc ? baslik : null, filename })
        }}
        className="space-y-3"
      >
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

        <select
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          <option value={NEW_DOC}>+ Yeni doküman</option>
          {docsInCategory.map((d) => (
            <option key={d.id} value={d.id}>
              {d.baslik} (yeni versiyon ekle)
            </option>
          ))}
        </select>

        {isNewDoc && (
          <input
            required
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Doküman başlığı"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        )}

        <input
          required
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="Dosya adı (ör. sozlesme-v3.pdf)"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <p className="text-xs text-ink-400">Demo ortamında gerçek dosya yüklenmiyor, sadece kayıt oluşturuluyor.</p>

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
            {submitting ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
