import { useState } from 'react'
import { Info, Lock, Download } from 'lucide-react'
import Modal from '../common/Modal'
import ConfirmDialog from '../common/ConfirmDialog'
import { SUPABASE_URL } from '../../lib/env'
import { formatDateOnly } from '../../lib/format'

function FieldInput({ field, value, onChange, disabled }) {
  const id = `belge-field-${field.fieldKey}`
  if (field.fieldType === 'checkbox') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-text-primary">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
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
    disabled,
    className:
      'w-full rounded-lg border border-border-default bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-400 focus:outline-none disabled:bg-surface-sunken disabled:text-text-disabled',
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

export default function BelgeDoldurForm({ template, fields, instance, onClose, onSaveDraft, onGenerate, saving, generating }) {
  const [formData, setFormData] = useState(() => ({ ...(instance?.data ?? {}) }))
  const [confirmingGenerate, setConfirmingGenerate] = useState(false)
  const isLocked = instance?.status === 'completed'

  function handleChange(fieldKey, value) {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }))
  }

  if (isLocked) {
    const downloadUrl = `${SUPABASE_URL}/functions/v1/download-document?token=${instance.downloadToken}`
    return (
      <Modal title={template.name} onClose={onClose} maxWidth="max-w-md">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Lock size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Bu belge kilitlendi</p>
            <p className="mt-1 text-xs text-text-secondary">
              Artık düzenlenemez. Karşı tarafa aşağıdaki linki paylaşarak indirmesini sağlayabilirsin — link{' '}
              {instance.downloadExpiresAt ? formatDateOnly(instance.downloadExpiresAt) : '7 gün'} tarihine kadar geçerli.
            </p>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Download size={15} /> PDF'i İndir
          </a>
        </div>
      </Modal>
    )
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
          <span>"Oluştur ve Kilitle" ile üretilen PDF artık değiştirilemez — yanlışsa yeni bir kayıt açman gerekir.</span>
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
            disabled={saving || generating}
            className="rounded-lg border border-border-default px-3.5 py-2 text-sm font-medium text-text-primary hover:bg-surface-sunken disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor…' : 'Taslağı Kaydet'}
          </button>
          <button
            onClick={() => setConfirmingGenerate(true)}
            disabled={saving || generating}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {generating ? 'Oluşturuluyor…' : 'Oluştur ve Kilitle'}
          </button>
        </div>
      </div>

      {confirmingGenerate && (
        <ConfirmDialog
          title="Belgeyi oluşturup kilitleyelim mi?"
          message="PDF üretildikten sonra bu kayıt artık düzenlenemez. Alanları kontrol ettin mi?"
          confirmLabel="Evet, oluştur"
          onConfirm={() => {
            setConfirmingGenerate(false)
            onGenerate(formData)
          }}
          onCancel={() => setConfirmingGenerate(false)}
        />
      )}
    </Modal>
  )
}
