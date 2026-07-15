import { OPPORTUNITY_TYPE_LABELS } from '../../lib/opportunities'

export default function OpportunityBoxGrid({ boxes, active, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {boxes.map((b) => {
        const isActive = active.type === b.type && active.category === b.category
        return (
          <button
            key={`${b.type}-${b.category}`}
            onClick={() => onSelect(isActive ? { type: 'tumu', category: 'tumu' } : { type: b.type, category: b.category })}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              isActive ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white hover:border-brand-200'
            }`}
          >
            <p className="text-xs font-medium text-ink-400">
              {OPPORTUNITY_TYPE_LABELS[b.type]} · {b.categoryLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">{b.total}</p>
            {b.today > 0 && <p className="mt-0.5 text-xs font-medium text-emerald-600">Bugün +{b.today}</p>}
          </button>
        )
      })}
    </div>
  )
}
