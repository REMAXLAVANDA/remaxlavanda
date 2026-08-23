import BelgeFieldInput from './BelgeFieldInput'

// Broker: "doldurma alanları çok karışık görünüyor / kafa karışıklığına
// sebep oluyor" — 16-47 alanlı şablonlar düz, bölümsüz bir ızgarada hepsi
// aynı ağırlıkta arka arkaya sıralanıyordu (bkz. ekran görüntüsü: "İl"
// ile "Özel Şart 4" görsel olarak ayırt edilemiyor). Etiketler zaten temiz
// Türkçe (ör. "Müşteri Adı Soyadı", "Özel Şart 1") — field_key'e göre değil
// bu etiket metnine göre anahtar kelimelerle bölümlere ayırıyoruz. 16
// şablonun hepsinde aynı kelime kalıpları geçiyor (Müşteri/Alıcı/Satıcı/
// Kiracı/Malik/Taraf, Özel Şart, RE/MAX/Danışman, İl/İlçe/.../Taşınmaz) —
// eşleşmeyen alanlar (ör. "Madde 16 Tarihi" gibi maddeye özgü alanlar)
// yeni bir başlık AÇMIYOR, bir önceki bölümün içinde akmaya devam ediyor;
// yanlış etiketlemektense etiketsiz bırakmayı tercih ediyoruz.
const SECTION_RULES = [
  { test: /özel şart/i, label: 'Özel Şartlar' },
  { test: /(re\/max|lavanda|danışman)/i, label: 'RE/MAX Lavanda Bilgileri' },
  { test: /(müşteri|alıcı|satıcı|kiracı|malik|kiraya veren|mülk sahibi|taraf|kefil)/i, label: 'Karşı Taraf Bilgileri' },
  {
    test: /(^il$|ilçe|mahalle|^ada$|parsel|bağımsız bölüm|gayrimenkul|taşınmaz|nitelik|işlem)/i,
    label: 'Taşınmaz Bilgileri',
  },
]

function sectionFor(label) {
  const match = SECTION_RULES.find((rule) => rule.test.test(label ?? ''))
  return match?.label ?? null
}

// Alanları hem onay-kutusu gruplarına (kompakt "seçenek" pill'leri) hem de
// bölüm başlıklarına göre render edilecek tek bir akışa çeviriyor.
function buildItems(fields) {
  const items = []
  let checkboxRun = null
  let currentSection = null

  for (const field of fields) {
    const section = sectionFor(field.label)
    if (section && section !== currentSection) {
      currentSection = section
      checkboxRun = null
      items.push({ kind: 'header', label: section })
    }

    if (field.fieldType === 'checkbox') {
      if (!checkboxRun) {
        checkboxRun = { kind: 'checkboxGroup', fields: [] }
        items.push(checkboxRun)
      }
      checkboxRun.fields.push(field)
    } else {
      checkboxRun = null
      items.push({ kind: 'field', field })
    }
  }
  return items
}

function isFilled(field, value) {
  return field.fieldType === 'checkbox' ? value === true : Boolean(value && String(value).trim())
}

export default function BelgeFieldList({ fields, formData, onChange, disabled }) {
  const items = buildItems(fields)
  const filledCount = fields.filter((f) => isFilled(f, formData[f.fieldKey])).length

  return (
    <div>
      {fields.length > 0 && (
        <p className="mb-3 text-xs text-text-disabled">
          {filledCount} / {fields.length} alan dolduruldu
        </p>
      )}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {items.map((item, idx) => {
          if (item.kind === 'header') {
            return (
              <p
                key={`header-${idx}`}
                className={`text-xs font-semibold uppercase tracking-wide text-brand-600 sm:col-span-2 ${idx === 0 ? '' : 'mt-1 border-t border-border-subtle pt-3.5'}`}
              >
                {item.label}
              </p>
            )
          }

          if (item.kind === 'checkboxGroup') {
            return (
              <div
                key={`cbgroup-${idx}`}
                className="flex flex-wrap gap-2 rounded-lg border border-border-default bg-surface-sunken px-3 py-2.5 sm:col-span-2"
              >
                {item.fields.map((field) => {
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
            )
          }

          return (
            <div
              key={item.field.id ?? item.field.fieldKey}
              className={item.field.fieldType === 'textarea' ? 'sm:col-span-2' : ''}
            >
              <BelgeFieldInput
                field={item.field}
                value={formData[item.field.fieldKey]}
                onChange={(v) => onChange(item.field.fieldKey, v)}
                disabled={disabled}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
