import BelgeFieldInput from './BelgeFieldInput'

// Broker: "doldurma alanları çok karışık görünüyor" — 16-47 alanlı
// şablonlar düz bir 2 sütunlu ızgarada hepsi aynı ağırlıkta görünüyordu.
// Burada tek somut, veri odaklı (Türkçe anlam tahmini gerektirmeyen)
// iyileştirme: art arda gelen onay kutuları (ör. "Konut/Arsa/Fabrika",
// "Satış/Kiralama") artık tek tek satır kaplamıyor, kompakt bir "seçenek
// grubu" olarak gruplanıyor. Ayrıca üstte kaç alanın dolduğunu gösteren
// bir sayaç var — 30+ alanlı bir formda "ne kadar kaldı" hissi veriyor.
function groupFields(fields) {
  const groups = []
  let run = null
  for (const field of fields) {
    if (field.fieldType === 'checkbox') {
      if (!run) {
        run = { type: 'checkboxGroup', fields: [] }
        groups.push(run)
      }
      run.fields.push(field)
    } else {
      run = null
      groups.push({ type: 'field', field })
    }
  }
  return groups
}

function isFilled(field, value) {
  return field.fieldType === 'checkbox' ? value === true : Boolean(value && String(value).trim())
}

export default function BelgeFieldList({ fields, formData, onChange, disabled }) {
  const groups = groupFields(fields)
  const filledCount = fields.filter((f) => isFilled(f, formData[f.fieldKey])).length

  return (
    <div>
      {fields.length > 0 && (
        <p className="mb-3 text-xs text-text-disabled">
          {filledCount} / {fields.length} alan dolduruldu
        </p>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {groups.map((group, idx) =>
          group.type === 'checkboxGroup' ? (
            <div
              key={`cbgroup-${idx}`}
              className="flex flex-wrap gap-2 rounded-lg border border-border-default bg-surface-sunken px-3 py-2.5 sm:col-span-2"
            >
              {group.fields.map((field) => {
                const checked = formData[field.fieldKey] === true
                return (
                  <label
                    key={field.id ?? field.fieldKey}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      checked
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-border-default bg-white text-text-secondary hover:bg-border-subtle'
                    } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onChange(field.fieldKey, e.target.checked)}
                      disabled={disabled}
                      className="sr-only"
                    />
                    {field.label}
                  </label>
                )
              })}
            </div>
          ) : (
            <div
              key={group.field.id ?? group.field.fieldKey}
              className={group.field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}
            >
              <BelgeFieldInput
                field={group.field}
                value={formData[group.field.fieldKey]}
                onChange={(v) => onChange(group.field.fieldKey, v)}
                disabled={disabled}
              />
            </div>
          ),
        )}
      </div>
    </div>
  )
}
