import { Folder } from 'lucide-react'

export default function FolderList({ categories, selected, onSelect, countFor }) {
  return (
    <div className="space-y-1">
      {categories.map((c) => (
        <button
          key={c.key}
          onClick={() => onSelect(c.key)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            selected === c.key ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50'
          }`}
        >
          <Folder size={16} />
          <span className="flex-1">{c.label}</span>
          <span className="text-xs text-ink-400">{countFor(c.key)}</span>
        </button>
      ))}
    </div>
  )
}
