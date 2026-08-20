import { useState } from 'react'
import { Info } from 'lucide-react'
import Modal from '../common/Modal'

function FieldInput({ field, value, onChange }) {
  const id = `belge-field-${field.fieldKey}`
  if (field.fieldType === 'checkbox') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-text-primary">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-border-default text-brand-600"
        />
        {field.label}
      </label>
    )
  }

  const commonProps = {
    id,
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
    className:
      'w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-400 focus:outline-none',
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-text-secondary">
        {field.label}
      </label>
      {field.fieldType === 'textarea' ? (
        <textarea {...commonProps} rows={2} />
      ) : (
        <input {...commonProps} type={field.fieldType === 'date' ? 'date' : 'text'} />
      )}
    </div>
  )
}

// Taslak kaydetme (data'yı Supabase'e yazma) çalışıyor — belge PDF üretimi
// (Vercel tarafındaki render fonksiyonu) henüz bağlanmadı, o yüzden "Oluştur
// ve Kilitle" düğmesi şimdilik bilgilendirme gösteriyor (2026-08-20).
export default function BelgeDoldurForm({ template, fields, instance, onClose, onSaveDraft, saving }) {
  const [formData, setFormData] = useState(() => ({ ...(instance?.data ?? {}) }))

  function handleChange(fieldKey, value) {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }))
  }

  return (
    <Modal title={template.name} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.id} className={field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}>
              <FieldInput field={field} value={formData[field.fieldKey]} onChange={(v) => handleChange(field.fieldKey, v)} />
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-surface-sunken px-3 py-2.5 text-xs text-text-secondary">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Şimdilik doldurduğun bilgiler taslak olarak kaydediliyor. Kilitli PDF üretme adımı yakında eklenecek —
            hazır olunca aynı ekrandan "Oluştur ve Kilitle" ile PDF alabileceksin.
          </span>
        </div>

        <div className="flex justify-end gap-2 border-t border-border-default pt-3.5">
          <button
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
          >
            Vazgeç
          </button>
          <button
            onClick={() => onSaveDraft(formData)}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor…' : 'Taslağı Kaydet'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
