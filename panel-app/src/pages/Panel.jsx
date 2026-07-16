import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, PhoneCall, Inbox } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { callLogs as callLogsProvider } from '../lib/dataProvider'
import { canManageCalls, maskPhone } from '../lib/callLogs'
import { relativeTime } from '../lib/format'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

export default function Panel() {
  const { user, role } = useAuth()
  const { data: calls, loading, error, reload } = useAsyncList(() => callLogsProvider.list(), [])
  const isManager = canManageCalls(role)

  const pending = useMemo(() => {
    if (!calls) return []
    const list = isManager
      ? calls.filter((c) => !c.assignedTo)
      : calls.filter((c) => c.assignedTo === user.id && !c.donusYapildiMi)
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [calls, isManager, user.id])

  const title = isManager ? 'Atanmamış Çağrılar' : 'Sana Atanan Çağrılar'
  const description = isManager
    ? 'Henüz bir danışmana atanmamış, dağıtım bekleyen çağrılar'
    : 'Santralden sana yönlendirilen, dönüş yapman gereken çağrılar'

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-ink-900">Panel</h1>
          <p className="text-xs text-ink-400">Bugün yapman gerekenler</p>
        </div>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall size={16} className="text-brand-600" />
              <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                  {pending.length}
                </span>
              )}
            </div>
            <Link to="/operasyon" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Operasyon'a git →
            </Link>
          </div>
          <p className="mb-4 text-xs text-ink-400">{description}</p>

          {pending.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-6 text-sm text-ink-400">
              <Inbox size={16} /> Bekleyen çağrı yok, harika!
            </div>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 8).map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-900">{call.arayanAd}</p>
                    <p className="text-xs text-ink-400">
                      {call.kaynak} · {maskPhone(call.arayanTelefon)}
                    </p>
                  </div>
                  <span className="text-xs text-ink-400">{relativeTime(call.createdAt)}</span>
                </div>
              ))}
              {pending.length > 8 && (
                <p className="pt-1 text-center text-xs text-ink-400">
                  +{pending.length - 8} tane daha — Operasyon'da gör
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
