import { MapPin, Phone, User } from 'lucide-react'
import { categoryLabel } from '../../lib/categories'
import {
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  OPPORTUNITY_TYPE_LABELS,
  canClaim,
  relativeTime,
} from '../../lib/opportunities'

export default function OpportunityCard({ opportunity: opp, ownerName, claimerName, isMine, onClaim, claiming }) {
  const showClaim = canClaim(opp)

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink-900">{opp.leadAd}</h3>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
              {OPPORTUNITY_TYPE_LABELS[opp.type]}
            </span>
            <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-500">
              {categoryLabel(opp.category)}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
            <MapPin size={12} /> {opp.konum}
            <span className="mx-1">·</span>
            {relativeTime(opp.createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[opp.status]}`}
        >
          {OPPORTUNITY_STATUS_LABELS[opp.status]}
        </span>
      </div>

      {opp.ozet && <p className="mt-3 text-sm text-ink-600">{opp.ozet}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-50 pt-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
          {opp.leadTelefon && (
            <a href={`tel:${opp.leadTelefon}`} className="flex items-center gap-1 hover:text-brand-700">
              <Phone size={12} /> {opp.leadTelefon}
            </a>
          )}
          <span className="flex items-center gap-1">
            <User size={12} /> Kaydeden: {ownerName ?? '—'}
          </span>
          {opp.claimerId && (
            <span className="flex items-center gap-1 font-medium text-ink-600">
              Üstlenen: {isMine ? 'Sen' : (claimerName ?? '—')}
            </span>
          )}
        </div>

        {showClaim && (
          <button
            onClick={onClaim}
            disabled={claiming}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {claiming ? 'Gönderiliyor...' : 'İlgileniyorum'}
          </button>
        )}
      </div>
    </div>
  )
}
