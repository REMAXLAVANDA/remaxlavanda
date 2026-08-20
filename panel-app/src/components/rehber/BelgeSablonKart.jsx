import { FileText, ChevronRight } from 'lucide-react'

export default function BelgeSablonKart({ template, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border-default bg-surface-raised px-4 py-3.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <FileText size={17} />
      </div>
      <span className="flex-1 text-sm font-medium text-text-primary">{template.name}</span>
      <ChevronRight size={16} className="shrink-0 text-text-disabled" />
    </button>
  )
}
