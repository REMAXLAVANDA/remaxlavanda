import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, MapPin, Pencil, Phone, Trash2, Undo2, User, Users, XCircle } from 'lucide-react'
import Modal from '../common/Modal'
import ConfirmDialog from '../common/ConfirmDialog'
import DusukPuanGerekceDialog from '../common/DusukPuanGerekceDialog'
import { useToast } from '../../context/ToastContext'
import { categoryLabel } from '../../lib/categories'
import { formatDateOnly } from '../../lib/format'
import { YONLENDIRME_DURUM_LABELS, sortBySiralamaPuani } from '../../lib/yonlendirme'
import { telHref, whatsappHref } from '../../lib/phone'
import { WhatsappIcon } from '../kartvizit/BrandIcons'
import {
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
  ISLEM_TIPI_LABELS,
  ISLEM_TIPI_STYLES,
  canExpressInterest,
  canRevealContact,
  formatPrice,
  relativeTime,
  tarafLabel,
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
  canClose,
  canAssign,
  canRelease,
  assignableOptions,
  yonlendirmeMap = {},
  fetchContact,
  fetchInterestList,
  onClose,
  onExpressInterest,
  onDeleteRequest,
  onEditRequest,
  onCloseRequest,
  onAssignRequest,
  onReleaseRequest,
  expressing,
  closing,
  assigning,
  releasing,
}) {
  const { showToast } = useToast()
  const [contact, setContact] = useState(null)
  const [loadingContact, setLoadingContact] = useState(true)
  const [interestList, setInterestList] = useState(null)
  const [assignDraft, setAssignDraft] = useState('')
  // Native window.confirm() yerine portalın kendi ConfirmDialog'u — bkz. render'daki kullanım.
  const [assignConfirm, setAssignConfirm] = useState(null)
  // Kapatma (Müşteri Bulundu/Bulunamadı) kalıcı ve geri alınamaz bir işlem —
  // önceden tek dokunuşla, onaysız yapılıyordu (bkz. /kurul görsel+
  // kullanılabilirlik raporu, 2026-10-04, madde 2). Atama onayıyla AYNI desen.
  const [closeConfirm, setCloseConfirm] = useState(null)
  // Havuza bırakma — "havuza ekleme tikini yanlışlıkla tıklamadım" hatasının
  // telafisi (bkz. release_opportunity_to_pool RPC). Kapatma kadar kalıcı
  // bir işlem değil (tekrar üstlenilebilir) ama yine de yanlış tıklamaya
  // karşı aynı ConfirmDialog deseni kullanılıyor.
  const [releaseConfirm, setReleaseConfirm] = useState(false)

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
        // Yetkisiz erişimde sunucu zaten null/boş döner (bkz. yukarıdaki
        // GÜVENLİK NOTU) — burası GERÇEK bir hata (ağ/RLS sorunu). Sessizce
        // "bilgi yok" göstermek yanıltıcı olabileceği için ayrıca uyarıyoruz.
        if (!cancelled) {
          setContact({ leadAd: null, leadTelefon: null })
          showToast('İletişim bilgisi yüklenemedi, tekrar dene.', 'error')
        }
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
        // Boş listeyle "kimse ilgilenmemiş" izlenimi vermemek için — bu
        // gerçek bir yükleme hatası, veri eksikliği değil.
        if (!cancelled) {
          setInterestList([])
          showToast('İlgilenen listesi yüklenemedi, tekrar dene.', 'error')
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opp.id, isOwnerOrManager])

  const hasContact = Boolean(contact?.leadAd)
  const showInterestButton = !isOwnerOrManager && canExpressInterest(opp, user) && !alreadyInterested

  return (
    <>
    <Modal title="Fırsat Detayı" onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
          {tarafLabel(opp.category, opp.islemTipi, opp.type)}
        </span>
        <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-500">
          {categoryLabel(opp.category)}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ISLEM_TIPI_STYLES[opp.islemTipi]}`}>
          {ISLEM_TIPI_LABELS[opp.islemTipi] ?? ISLEM_TIPI_LABELS.satilik}
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
          {opp.islemTipi === 'kiralik' && <span className="text-sm font-normal text-ink-400"> / ay</span>}
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
              <div className="flex items-center gap-3">
                <a href={telHref(contact.leadTelefon)} className="flex items-center gap-2 text-brand-700 hover:underline">
                  <Phone size={14} /> {contact.leadTelefon}
                </a>
                <a
                  href={whatsappHref(contact.leadTelefon)}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp'ta aç"
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <WhatsappIcon size={15} />
                </a>
              </div>
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

      {/* "Önceki sahip" izi (2026-10-06 broker isteği, madde 4) — pasife
          alınan bir danışmandan devredilen kayıtta, bu daha önce kimdeyken
          devredildiğini görünür kılar. Sadece son devri gösterir (broker
          onayı), tam zincir audit_log'da duruyor. */}
      {opp.oncekiSahipId && (
        <p className="mt-3 text-xs text-ink-400">
          Önceki sorumlu: {resolveName(opp.oncekiSahipId)}
          {opp.devirTarihi && <> ({formatDateOnly(opp.devirTarihi)}'de devredildi)</>}
        </p>
      )}

      {isOwnerOrManager && (
        <div className="mt-4 rounded-xl border border-ink-100 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <Users size={14} /> İlgilenen danışmanlar
          </p>
          {opp.claimerId && (
            // "Üstlenildi" durumu broker'ın danışmana DOĞRUDAN ataması
            // (assignTo) ile oluşur — bu, "İlgileniyorum" (opportunity_interest)
            // ile ayrı bir mekanizma, o yüzden üstlenen kişi ilgi listesinde
            // görünmeyebilir. Kim üstlendiğini burada ayrıca gösteriyoruz ki
            // liste boş görününce "kimse ilgilenmedi" sanılmasın.
            <p className="mb-2 flex items-center gap-1.5 text-sm text-ink-700">
              <CheckCircle2 size={14} className="text-emerald-600" /> Üstlenen: {resolveName(opp.claimerId)}
            </p>
          )}
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

      {canRelease && (
        <div className="mt-4 rounded-xl border border-ink-100 p-4">
          <p className="mb-2 text-xs font-medium text-ink-500">
            Yanlışlıkla üstlenilmiş/havuza atılmamış mı? Geri bırakabilirsin.
          </p>
          <button
            onClick={() => setReleaseConfirm(true)}
            disabled={releasing}
            className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-200 disabled:opacity-50"
          >
            <Undo2 size={14} /> {releasing ? 'Bırakılıyor...' : 'Havuza Bırak'}
          </button>
        </div>
      )}

      {canAssign && (
        <div className="mt-4 rounded-xl border border-ink-100 p-4">
          <p className="mb-2 text-xs font-medium text-ink-500">Bir danışmana ata</p>
          <div className="flex gap-2">
            <select
              value={assignDraft}
              onChange={(e) => setAssignDraft(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-2 py-1.5 text-sm text-ink-700"
            >
              <option value="">Danışman seç</option>
              {sortBySiralamaPuani(assignableOptions, yonlendirmeMap).map((u) => {
                const durum = yonlendirmeMap[u.id]?.durum
                return (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {durum && durum !== 'acik' ? ` — ${YONLENDIRME_DURUM_LABELS[durum]}` : ''}
                  </option>
                )
              })}
            </select>
            <button
              onClick={() => {
                if (!assignDraft) return
                const name = assignableOptions.find((u) => u.id === assignDraft)?.name
                setAssignConfirm({ id: assignDraft, name, durum: yonlendirmeMap[assignDraft]?.durum })
              }}
              disabled={!assignDraft || assigning}
              className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {assigning ? 'Atanıyor...' : 'Ata'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-50 pt-3 text-xs text-ink-400">
        {/* Havuzda kaydeden kişinin adı BİLEREK gizli — ilk bakışta kim
            girdiğini görmek yerine, ilgilenen danışman "İlgileniyorum"
            dedikten SONRA görmeli (bkz. broker isteği: "havuzda ismi
            görünmemeli ... ilgileniyorum diyen danışman açtığında kime ait
            olduğunu görmeli"). canEdit/canDelete zaten aynı owner/manager
            koşuluna bağlı, o yüzden bu satırın boş kalması bir tutarsızlık
            yaratmıyor — o durumda ikisi de zaten görünmüyor. */}
        {(isOwnerOrManager || alreadyInterested) && <span>Kaydeden: {ownerName ?? '—'}</span>}
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

      {canClose && (
        <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
          <p className="mb-2 text-xs font-medium text-ink-500">
            Bu fırsattan müşteri bulundu mu? Havuzun ne kadar işe yaradığını görebilmemiz için gerçek sonucu işaretle.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCloseConfirm('kapandi')}
              disabled={closing}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> Müşteri Bulundu
            </button>
            <button
              onClick={() => setCloseConfirm('iptal')}
              disabled={closing}
              className="flex items-center gap-1.5 rounded-lg bg-ink-200 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-300 disabled:opacity-50"
            >
              <XCircle size={14} /> Müşteri Bulunamadı
            </button>
          </div>
        </div>
      )}
    </Modal>
    {assignConfirm && assignConfirm.durum === 'kapali' ? (
      <DusukPuanGerekceDialog
        targetName={assignConfirm.name}
        onConfirm={(gerekce) => {
          onAssignRequest(assignConfirm.id, gerekce)
          setAssignConfirm(null)
        }}
        onCancel={() => setAssignConfirm(null)}
        confirming={assigning}
      />
    ) : (
      assignConfirm && (
        <ConfirmDialog
          title="Fırsatı ata"
          message={`Bu fırsat "${assignConfirm.name}" kişisine atansın mı?`}
          confirmLabel="Evet, ata"
          onConfirm={() => {
            onAssignRequest(assignConfirm.id)
            setAssignConfirm(null)
          }}
          onCancel={() => setAssignConfirm(null)}
          confirming={assigning}
        />
      )
    )}
    {closeConfirm && (
      <ConfirmDialog
        title={closeConfirm === 'kapandi' ? 'Fırsatı kapat' : 'Fırsatı iptal et'}
        message={
          closeConfirm === 'kapandi'
            ? 'Bu fırsat "müşteri bulundu" olarak kapatılsın mı? Bu işlem geri alınamaz.'
            : 'Bu fırsat "müşteri bulunamadı" olarak iptal edilsin mi? Bu işlem geri alınamaz.'
        }
        confirmLabel={closeConfirm === 'kapandi' ? 'Evet, kapat' : 'Evet, iptal et'}
        tone={closeConfirm === 'kapandi' ? 'primary' : 'danger'}
        onConfirm={() => {
          onCloseRequest(closeConfirm)
          setCloseConfirm(null)
        }}
        onCancel={() => setCloseConfirm(null)}
        confirming={closing}
      />
    )}
    {releaseConfirm && (
      <ConfirmDialog
        title="Fırsatı havuza bırak"
        message="Bu fırsat üstlenilmemiş hale gelip açık havuza dönecek — herkes görebilir ve ilgi gösterebilir."
        confirmLabel="Evet, havuza bırak"
        onConfirm={() => {
          onReleaseRequest()
          setReleaseConfirm(false)
        }}
        onCancel={() => setReleaseConfirm(false)}
        confirming={releasing}
      />
    )}
    </>
  )
}
