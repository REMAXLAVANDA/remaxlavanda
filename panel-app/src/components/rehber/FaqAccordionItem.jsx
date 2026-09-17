import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import FormattedText from '../common/FormattedText'

// SSS kategorisi için DocCard yerine kullanılan akordiyon görünümü (bkz.
// Rehber.jsx — selectedCategory === 'sss'). Veri modeli DocCard ile
// birebir aynı: doc.baslik = soru (her zaman görünür başlık), doc.contentText
// = cevap (tıklayınca açılır) — broker mevcut "Ekle" akışıyla yeni soru
// eklemeye devam ediyor, sadece bu kategoride render farklı.
export default function FaqAccordionItem({ doc, canManage, onEdit, onDeleteRequest, onMove, isFirst, isLast }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-border-default bg-surface-raised">
      <div className="flex items-center gap-2 px-4 py-3">
        {canManage && (
          <div className="flex shrink-0 flex-col">
            <button
              onClick={() => onMove('up')}
              disabled={isFirst}
              aria-label="Yukarı taşı"
              className="rounded p-0.5 text-text-disabled hover:bg-surface-sunken hover:text-text-secondary disabled:opacity-30"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => onMove('down')}
              disabled={isLast}
              aria-label="Aşağı taşı"
              className="rounded p-0.5 text-text-disabled hover:bg-surface-sunken hover:text-text-secondary disabled:opacity-30"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="text-sm font-semibold text-text-primary">{doc.baslik}</span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-text-disabled transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={onEdit}
              title="Düzenle"
              className="rounded-lg p-1.5 text-text-disabled hover:bg-tint-red hover:text-brand-600"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDeleteRequest}
              title="Sil"
              className="rounded-lg p-1.5 text-text-disabled hover:bg-tint-red hover:text-brand-700"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="border-t border-border-subtle px-4 py-3 text-sm text-text-secondary">
          <FormattedText text={doc.contentText} />
        </div>
      )}
    </div>
  )
}
