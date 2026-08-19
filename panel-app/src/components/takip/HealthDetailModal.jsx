import { useMemo } from 'react'
import Modal from '../common/Modal'
import { METRIC_LABELS, STATUS_LABELS, STATUS_STYLES } from '../../lib/takip'
import { relativeTime, formatDateOnly } from '../../lib/format'
import { OPPORTUNITY_TYPE_LABELS, OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_STYLES, formatPrice } from '../../lib/opportunities'

export default function HealthDetailModal({
  user,
  score,
  status,
  metrics,
  notes,
  onClose,
  resolveName,
  canSeeOpportunities,
  opportunities,
  calls,
}) {
  const opps = useMemo(
    () => (canSeeOpportunities ? (opportunities ?? []).filter((o) => o.ownerId === user.id || o.claimerId === user.id) : []),
    [canSeeOpportunities, opportunities, user.id],
  )
  const userCalls = useMemo(
    () => (canSeeOpportunities ? (calls ?? []).filter((c) => c.assignedTo === user.id) : []),
    [canSeeOpportunities, calls, user.id],
  )

  return (
    <Modal title={user.name} onClose={onClose} maxWidth="max-w-2xl">
      <span className={`mb-4 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
        Skor {score} · {STATUS_LABELS[status]}
      </span>

      <div className="space-y-3">
        {Object.entries(METRIC_LABELS).map(([key, label]) => {
          const value = metrics[key]
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink-500">{label}</span>
                <span className="font-medium text-ink-700">{value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${value}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 border-t border-ink-100 pt-4">
        <p className="mb-2 text-xs font-medium text-ink-400">Broker Notları</p>
        {notes.length === 0 ? (
          <p className="text-sm text-ink-400">Henüz not eklenmedi.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {resolveName(n.author)} · {relativeTime(n.date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ofis/danışman bu bölümü hiç görmez — sadece yönetim (broker/owner)
          "bu danışmana ne yönlendirdik, ne yapmış" diye inceleyebilir (bkz.
          "yönetim olarak danışmanları filtreleyebilelim" isteği). */}
      {canSeeOpportunities && (
        <div className="mt-5 border-t border-ink-100 pt-4">
          <p className="mb-2 text-xs font-medium text-ink-400">Fırsatlar ({opps.length})</p>
          {opps.length === 0 ? (
            <p className="mb-4 text-sm text-ink-400">Bu danışmana ait fırsat yok.</p>
          ) : (
            <div className="mb-4 space-y-1.5">
              {opps.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs">
                  <span className="shrink-0 text-ink-500">{OPPORTUNITY_TYPE_LABELS[o.type] ?? o.type}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-700">{o.konum || '—'}</span>
                  <span className="shrink-0 text-ink-500">{formatPrice(o.fiyat)}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${OPPORTUNITY_STATUS_STYLES[o.status] ?? 'bg-ink-100 text-ink-600'}`}
                  >
                    {OPPORTUNITY_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <span className="shrink-0 text-ink-400">{formatDateOnly(o.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mb-2 text-xs font-medium text-ink-400">Çağrı Kayıtları ({userCalls.length})</p>
          {userCalls.length === 0 ? (
            <p className="text-sm text-ink-400">Bu danışmana atanan çağrı yok.</p>
          ) : (
            <div className="space-y-1.5">
              {userCalls.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs">
                  <span className="shrink-0 text-ink-500">{c.kaynak || '—'}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-700">
                    {c.arayanAd || '—'}
                    {c.arayanTelefon && <span className="ml-1 text-ink-400">({c.arayanTelefon})</span>}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${
                      c.donusYapildiMi ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {c.donusYapildiMi ? 'Dönüş Yapıldı' : 'Dönüş Yapılmadı'}
                  </span>
                  <span className="shrink-0 text-ink-400">{formatDateOnly(c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
