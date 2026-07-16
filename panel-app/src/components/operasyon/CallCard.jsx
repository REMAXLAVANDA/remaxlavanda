import { useState } from 'react'
import { Eye, EyeOff, Phone, Target } from 'lucide-react'
import { CALL_RESULT_LABELS, CALL_RESULT_STYLES, maskPhone } from '../../lib/callLogs'
import { relativeTime } from '../../lib/format'

export default function CallCard({
  call,
  assignedName,
  isManager,
  canEditOwn,
  inviteeOptions,
  onAssign,
  onSetResult,
  onToggle,
}) {
  const [revealed, setRevealed] = useState(false)
  const canEditResult = isManager || canEditOwn

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">{call.kaynak}</span>
            {call.opportunityId && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                <Target size={11} /> Fırsata dönüştü
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-ink-900">{call.arayanAd}</h3>
        </div>
        <span className="text-xs text-ink-400">{relativeTime(call.createdAt)}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-ink-600">
        <Phone size={13} className="text-ink-400" />
        <span>{revealed ? call.arayanTelefon : maskPhone(call.arayanTelefon)}</span>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-ink-400 hover:text-brand-700"
          title={revealed ? 'Gizle' : 'Göster'}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {call.sonuc ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CALL_RESULT_STYLES[call.sonuc]}`}>
            {CALL_RESULT_LABELS[call.sonuc]}
          </span>
        ) : (
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500">Değerlendirilmedi</span>
        )}
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            call.portfoyAlindiMi ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-500'
          }`}
        >
          Portföy: {call.portfoyAlindiMi ? 'Alındı' : 'Alınmadı'}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            call.donusYapildiMi ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          Dönüş: {call.donusYapildiMi ? 'Yapıldı' : 'Bekliyor'}
        </span>
      </div>

      {call.notlar && <p className="mt-3 whitespace-pre-line text-xs text-ink-500">{call.notlar}</p>}

      <div className="mt-4 border-t border-ink-50 pt-3">
        {canEditResult ? (
          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <select
                value={call.assignedTo ?? ''}
                onChange={(e) => onAssign(e.target.value || null)}
                className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-600"
              >
                <option value="">Atanmadı</option>
                {inviteeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={call.sonuc ?? ''}
              onChange={(e) => onSetResult(e.target.value || null)}
              className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-600"
            >
              <option value="">Sonuç seç</option>
              {Object.entries(CALL_RESULT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={() => onToggle('portfoyAlindiMi')}
              className="rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
            >
              Portföy {call.portfoyAlindiMi ? '✕' : '✓'}
            </button>
            <button
              onClick={() => onToggle('donusYapildiMi')}
              className="rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
            >
              Dönüş {call.donusYapildiMi ? '✕' : '✓'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-ink-400">Atanan: {assignedName ?? 'Atanmadı'}</p>
        )}
      </div>
    </div>
  )
}
