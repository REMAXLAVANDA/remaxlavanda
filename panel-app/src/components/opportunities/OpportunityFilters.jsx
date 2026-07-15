import { Search } from 'lucide-react'
import DateRangeFilter from '../common/DateRangeFilter'

// Tip/kategori seçimi Satıcılar/Alıcılar akordeonlarındaki kategori
// kutularından yapılıyor (OpportunitySection); burada sadece arama ve
// tarih aralığı kalıyor — her iki akordeona da uygulanan global filtre.
export default function OpportunityFilters({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
        <Search size={16} className="text-ink-400" />
        <input
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="İsim veya konuma göre ara..."
          className="w-full bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400"
        />
      </div>

      <DateRangeFilter value={filters} onChange={onChange} />
    </div>
  )
}
