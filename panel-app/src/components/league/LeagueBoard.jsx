import { useState } from 'react'
import { Crown, ChevronDown, ChevronRight, X, Plus } from 'lucide-react'
import { MEDALS, formatDiff, formatLeadMargin } from '../../lib/league'
import { capitalizeWords } from '../../lib/format'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('tr-TR')
}

// historyByUser (Ciro) VE reviewByUser (Memnuniyet) BİRBİRİNİN AYNI
// deseni — satıra tıklanınca o danışmana özel detay açılır. Ciro'da bu
// salt-okunur bir geçmiş (score_entries.value üstüne yazıldığı için tek
// yolu bu); Memnuniyet'te ise interaktif — müşteri ekle/sil/işaretle
// (eskiden ayrı bir "Yorum Hakkı" paneliydi, broker: "her danışmanın
// ciroda açılan bir penceresi olduğu gibi memnuniyette de yapalım").
// İkisi aynı anda verilmez (sekmeye göre biri null).
export default function LeagueBoard({
  rankings,
  unit,
  historyByUser,
  reviewByUser,
  onAddMusteri,
  onRemoveMusteri,
  onToggleAlindi,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [nameDraft, setNameDraft] = useState('')

  if (rankings.length === 0) {
    return <p className="py-8 text-center text-sm text-text-disabled">Bu kategoride henüz veri yok.</p>
  }

  function submitName(userId) {
    const trimmed = capitalizeWords(nameDraft.trim())
    if (!trimmed) return
    onAddMusteri(userId, trimmed)
    setNameDraft('')
  }

  return (
    <div className="space-y-2">
      {rankings.map((r) => {
        const history = historyByUser?.[r.userId] ?? []
        const review = reviewByUser?.[r.userId]
        const musteriler = review?.musteriler ?? []
        const canExpand = Boolean(historyByUser) || Boolean(reviewByUser)
        const isExpanded = canExpand && expandedId === r.userId
        return (
          <div
            key={r.userId}
            className={`rounded-xl border ${r.isLeader ? 'border-brand-200 bg-brand-50' : 'border-border-default bg-surface-raised'}`}
          >
            <div
              role={canExpand ? 'button' : undefined}
              onClick={canExpand ? () => setExpandedId(isExpanded ? null : r.userId) : undefined}
              className={`flex items-center gap-3 p-4 ${canExpand ? 'cursor-pointer' : ''}`}
            >
              {canExpand &&
                (isExpanded ? (
                  <ChevronDown size={14} className="shrink-0 text-text-disabled" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-text-disabled" />
                ))}
              <span className="w-7 shrink-0 text-center text-lg">{MEDALS[r.rank - 1] ?? r.rank}</span>
              <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">{r.name}</span>
              {r.isLeader ? (
                <span className="flex items-center gap-1.5">
                  {formatLeadMargin(r.diff, unit) && (
                    <span className="text-xs font-medium text-text-muted">{formatLeadMargin(r.diff, unit)}</span>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
                    <Crown size={12} /> Lider
                  </span>
                </span>
              ) : (
                <span className="text-xs font-medium text-text-muted">{formatDiff(r.diff, unit)}</span>
              )}
            </div>

            {isExpanded && historyByUser && (
              <div className="border-t border-border-default px-4 py-2">
                {history.length === 0 ? (
                  <p className="py-1 text-xs text-text-disabled">Bu dönem için giriş kaydı yok.</p>
                ) : (
                  <div className="space-y-1">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs text-text-secondary">
                        <span>{formatDate(h.tarih)}</span>
                        <span className="font-medium text-text-primary">{Number(h.value).toLocaleString('tr-TR')} TL</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isExpanded && reviewByUser && (
              <div className="space-y-1.5 border-t border-border-default px-4 py-3">
                <p className="text-xs text-text-disabled">
                  {review?.hakSayisi ?? 0} hak · {review?.alinanSayisi ?? 0} alındı · %
                  {(review?.hakSayisi ?? 0) === 0 ? 0 : Math.round(((review?.alinanSayisi ?? 0) / review.hakSayisi) * 100)}
                </p>
                {musteriler.length === 0 && <p className="py-1 text-xs text-text-disabled">Bu dönem için müşteri girilmedi.</p>}
                {musteriler.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs">
                    <label className="flex min-w-0 flex-1 items-center gap-1.5 text-text-secondary">
                      <input
                        type="checkbox"
                        checked={m.alindiMi}
                        onChange={(e) => onToggleAlindi(m.id, e.target.checked)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-border-default"
                      />
                      <span className={`min-w-0 flex-1 truncate ${m.alindiMi ? 'text-text-disabled line-through' : ''}`}>
                        {m.adSoyad}
                      </span>
                    </label>
                    <button
                      onClick={() => onRemoveMusteri(m.id)}
                      className="shrink-0 rounded p-0.5 text-text-disabled hover:bg-surface-sunken hover:text-text-secondary"
                      title="Sil"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
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
                    className="w-full rounded-lg border border-border-default px-2 py-1 text-xs text-text-primary placeholder:text-text-disabled"
                  />
                  <button
                    onClick={() => submitName(r.userId)}
                    className="shrink-0 rounded-lg bg-brand-50 p-1.5 text-brand-700 hover:bg-brand-100"
                    title="Ekle"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
