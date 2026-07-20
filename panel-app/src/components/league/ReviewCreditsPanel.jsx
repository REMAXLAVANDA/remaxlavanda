import { useState } from 'react'
import { MessageSquareText, ChevronDown, ChevronRight, X, Plus } from 'lucide-react'
import { capitalizeWords } from '../../lib/format'

// Ciro'ya dönen her müşteri isim isim kaydedilir — yorum hakkı sabit "her
// girişte +2" değil, o dönem o danışman için kaç isim girilmişse o kadar.
// Satır tıklanınca isim listesi açılır: hangi müşteriden gerçekten yorum
// alındığı burada tek tek işaretlenir (checkbox), "alındı" sayısı ve yüzdesi
// bundan otomatik hesaplanır — işaretsiz kalanlar açıkta kalan/eksik
// müşteriler olarak görülür (satır varsayılan tek satır kalsın diye liste
// kapalı başlar).
export default function ReviewCreditsPanel({
  rows,
  isManager,
  onAddMusteri,
  onRemoveMusteri,
  onToggleAlindi,
  expandedId,
  onToggleExpand,
}) {
  const [nameDraft, setNameDraft] = useState('')

  if (rows.length === 0) {
    return null
  }

  function submitName(userId) {
    const trimmed = capitalizeWords(nameDraft.trim())
    if (!trimmed) return
    onAddMusteri(userId, trimmed)
    setNameDraft('')
  }

  return (
    <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareText size={16} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-ink-900">Yorum Hakkı</h3>
        <span className="text-xs text-ink-400">Girilen her müşteri 1 hak getirir</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const percent = r.hakSayisi === 0 ? 0 : Math.round((r.alinanSayisi / r.hakSayisi) * 100)
          const isExpanded = expandedId === r.userId
          return (
            <div key={r.userId} className="rounded-lg">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <button
                  onClick={() => onToggleExpand(isExpanded ? null : r.userId)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="shrink-0 text-ink-400" />
                  ) : (
                    <ChevronRight size={14} className="shrink-0 text-ink-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{r.name}</span>
                </button>
                <span className="shrink-0 text-xs text-ink-400">{r.hakSayisi} hak</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    percent >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {r.alinanSayisi} alındı · %{percent}
                </span>
              </div>

              {isExpanded && (
                <div className="ml-5 mb-2 space-y-1.5 border-l border-ink-100 pl-3">
                  {r.musteriler.length === 0 && <p className="text-xs text-ink-400">Henüz müşteri girilmedi.</p>}
                  {r.musteriler.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <label className="flex min-w-0 flex-1 items-center gap-1.5 text-ink-600">
                        <input
                          type="checkbox"
                          checked={m.alindiMi}
                          disabled={!isManager}
                          onChange={(e) => onToggleAlindi(m.id, e.target.checked)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-ink-300"
                        />
                        <span className={`min-w-0 flex-1 truncate ${m.alindiMi ? 'text-ink-400 line-through' : ''}`}>
                          {m.adSoyad}
                        </span>
                      </label>
                      {isManager && (
                        <button
                          onClick={() => onRemoveMusteri(m.id)}
                          className="shrink-0 rounded p-0.5 text-ink-300 hover:bg-ink-100 hover:text-ink-600"
                          title="Sil"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {isManager && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            submitName(r.userId)
                          }
                        }}
                        placeholder="İsim soyisim"
                        className="w-full rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-800 placeholder:text-ink-400"
                      />
                      <button
                        onClick={() => submitName(r.userId)}
                        className="shrink-0 rounded-lg bg-brand-50 p-1.5 text-brand-700 hover:bg-brand-100"
                        title="Ekle"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
