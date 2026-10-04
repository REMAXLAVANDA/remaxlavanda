import { Check } from 'lucide-react'

export default function ModuleProgressList({ modules, isDone, onToggle }) {
  return (
    <div className="space-y-2">
      {modules.map((m) => {
        const done = isDone(m.id)
        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 text-left transition-colors hover:border-brand-200"
          >
            {/* "Tamamlandı" rengi BİLEREK yeşil (emerald), marka kırmızısı
                değil — bu ekranda (Takip > Eğitim) kırmızı başka yerlerde
                "kritik/dikkat" anlamına geliyor, modül onayı için kırmızı
                kullanmak checklist'teki (ChecklistPanel.jsx) yeşil
                "tamamlandı" ile çelişip kafa karıştırıyordu (bkz. /kurul
                "danışman takip menüleri" denetimi, görsel bulgu #9). */}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-ink-200 text-transparent'
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="min-w-0">
              <p className={`text-sm font-medium ${done ? 'text-ink-900' : 'text-ink-700'}`}>{m.title}</p>
              {m.description && <p className="truncate text-xs text-ink-400">{m.description}</p>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
