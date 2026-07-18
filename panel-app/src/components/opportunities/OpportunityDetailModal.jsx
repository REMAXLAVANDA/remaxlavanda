import { useEffect, useState } from 'react'
import { Lock, MapPin, Pencil, Phone, Trash2, User, Users } from 'lucide-react'
import Modal from '../common/Modal'
import { categoryLabel } from '../../lib/categories'
import {
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  OPPORTUNITY_TYPE_LABELS,
  canExpressInterest,
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
// değildir, o sunucu tarafındadır. Müşteri bilgisi SADECE fırsatı giren
// kişi (owner) ve broker/owner rolüne açılır — ilgi göstermek bunu ASLA
// açmaz (bkz. showInterestButton / interestList aşağıda).
export default function OpportunityDetailModal({
  opportunity: opp,
  user,
  ownerName,
  resolveName,
  isOwnerOrManager,
  alreadyInterested,
  canDelete,
  canEdit,
  fetchContact,
  fetchInterestList,
  onClose,
  onExpressInterest,
  onDeleteRequest,
  onEditRequest,
  expressing,
}) {
  const [contact, setContact] = useState(null)
  const [loadingContact, setLoadingContact] = useState(true)
  const [interestList, setInterestList] = useState(null)

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

  useEffect(() => {
    let cancelled = false
    if (!isOwnerOrManager) return undefined

    fetchInterestList()
      .then((rows) => {
        if (!cancelled) setInterestList(rows)
      })
      .catch(() => {
        if (!cancelled) setInterestList([])
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opp.id, isOwnerOrManager])

  const hasContact = Boolean(contact?.leadAd)
  const showInterestButton = !isOwnerOrManager && canExpressInterest(opp, user) && !alreadyInterested

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
        <p className="text-base font-semibold text-ink-900">
          {opp.type === 'alici' && (opp.fiyatMin || opp.fiyatMax)
            ? `${formatPrice(opp.fiyatMin)} – ${formatPrice(opp.fiyatMax)}`
            : formatPrice(opp.fiyat)}
        </p>
        {opp.ozet && <p className="text-ink-600">{opp.ozet}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-ink-500">
          {opp.m2 && <span>{opp.m2} m²</span>}
          {opp.odaSayisi && <span>{opp.odaSayisi}</span>}
        </div>
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
            <Lock size={14} />
            {alreadyInterested
              ? 'İlgin bildirildi — müşteri bilgisi sana açılmaz, fırsatı giren kişi seni arayacak.'
              : 'Müşteri bilgileri gizli — sadece fırsatı giren kişi görür.'}
          </p>
        )}
      </div>

      {isOwnerOrManager && (
        <div className="mt-4 rounded-xl border border-ink-100 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <Users size={14} /> İlgilenen danışmanlar
          </p>
          {interestList == null ? (
            <p className="text-xs text-ink-400">Yükleniyor...</p>
          ) : interestList.length === 0 ? (
            <p className="text-xs text-ink-400">Henüz kimse ilgi göstermedi.</p>
          ) : (
            <ul className="space-y-1 text-sm text-ink-700">
              {interestList.map((row) => (
                <li key={row.userId}>{resolveName(row.userId)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-50 pt-3 text-xs text-ink-400">
        <span>Kaydeden: {ownerName ?? '—'}</span>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={() => onEditRequest(contact)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              <Pencil size={13} /> Düzenle
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDeleteRequest}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Sil
            </button>
          )}
        </div>
      </div>

      {showInterestButton && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={onExpressInterest}
            disabled={expressing}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {expressing ? 'Gönderiliyor...' : 'İlgileniyorum'}
          </button>
        </div>
      )}
    </Modal>
  )
}
