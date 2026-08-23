// BelgeDoldurForm (portal içi) ve müşterinin girişsiz doldurma sayfası
// (MusteriBelgeDoldur) arasında paylaşılan tek alan bileşeni — aynı form
// iki farklı yerde render ediliyor, tekrar yazılmasın diye.
export default function BelgeFieldInput({ field, value, onChange, disabled }) {
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
