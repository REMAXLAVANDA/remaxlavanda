import { useEffect, useState } from 'react'
import { Lock, MapPin, Phone, User } from 'lucide-react'
import Modal from '../common/Modal'
import { categoryLabel } from '../../lib/categories'
import {
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  OPPORTUNITY_TYPE_LABELS,
  canClaim,
  canRevealContact,
  formatPrice,
  relativeTime,
} from '../../lib/opportunities'

// GÜVENLİK NOTU: Bu bileşen artık opportunity.leadAd/leadTelefon'a
// GÜVENMİYOR — çünkü dataProvider.opportunities.list() bu alanları hiç
// döndürmüyor (network seviyesinde gizlilik, bkz. supabaseProvider.js).
// Gerçek isim/telefon SADECE bu modal açıldığında, ayrı bir çağrıyla
// (fetchContact — supabase modunda get_opportunity_contact() RPC'si)
// istenir; sunucu tarafı (RLS/SECURITY DEFINER) yetkisi olmayana zaten
// null döner. Buradaki canRevealContact() kontrolü SADECE gereksiz network
// isteğini önlemek için bir optimizasyondur — gerçek güvenlik sınırı
// değildir, o sunucu tarafındadır.
export default function OpportunityDetailModal({
  opportunity: opp,
  user,
  ownerName,
  claimerName,
  fetchContact,
  onClose,
  onClaim,
  claiming,
}) {
  const [contact, setContact] = useState(null)
  const [loadingContact, setLoadingContact] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingContact(true)
    setContact(null)

    const canSkipNetwork = !canRevealContact(opp, user)
    if (canSkipNetwork) {
      setLoadingContact(false)
      return
    }

    fetchContact()
      .then((result) => {
        if (!cancelled) setContact(result)
      })
      .catch(() => {
        if (!cancelled) setContact({ leadAd: null, leadTelefon: null })
      })
      .finally(() => {
        if (!cancelled) setLoadingContact(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opp.id])

  const hasContact = Boolean(contact?.leadAd)
  const showClaim = canClaim(opp)

  return (
    <Modal title="Fırsat Detayı" onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
          {OPPORTUNITY_TYPE_LABELS[opp.type]}
        </span>
        <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-500">
          {categoryLabel(opp.category)}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[opp.status]}`}>
          {OPPORTUNITY_STATUS_LABELS[opp.status]}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="flex items-center gap-2 text-ink-600">
          <MapPin size={14} className="text-ink-400" /> {opp.konum || '—'}
          <span className="mx-1 text-ink-300">·</span>
          {relativeTime(opp.createdAt)}
        </p>
        <p className="text-base font-semibold text-ink-900">{formatPrice(opp.fiyat)}</p>
        {opp.ozet && <p className="text-ink-600">{opp.ozet}</p>}
      </div>

      <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
        {loadingContact ? (
          <p className="text-xs text-ink-400">Yükleniyor...</p>
        ) : hasContact ? (
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 font-medium text-ink-900">
              <User size={14} className="text-ink-400" /> {contact.leadAd}
            </p>
            {contact.leadTelefon && (
              <a href={`tel:${contact.leadTelefon}`} className="flex items-center gap-2 text-brand-700 hover:underline">
                <Phone size={14} /> {contact.leadTelefon}
              </a>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-ink-400">
            <Lock size={14} /> Müşteri bilgileri gizli — bu fırsatı üstlendiğinde açılır.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-50 pt-3 text-xs text-ink-400">
        <span>Kaydeden: {ownerName ?? '—'}</span>
        {opp.claimerId && <span className="font-medium text-ink-600">Üstlenen: {claimerName ?? '—'}</span>}
      </div>

      {showClaim && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClaim}
            disabled={claiming}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {claiming ? 'Gönderiliyor...' : 'İlgileniyorum'}
          </button>
        </div>
      )}
    </Modal>
  )
}
