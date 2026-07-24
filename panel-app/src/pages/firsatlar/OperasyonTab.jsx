import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { callLogs as callLogsProvider } from '../../lib/dataProvider'
import { CALL_SOURCE_CODES, canManageCalls, canViewCall, computeCallStats, generatePortfoyKodu } from '../../lib/callLogs'
import { isWithinRange } from '../../lib/dateRange'
import { isStaleReturn } from '../../lib/attention'
import FocusBanner from '../../components/common/FocusBanner'
import CallTable from '../../components/operasyon/CallTable'
import CallFilters from '../../components/operasyon/CallFilters'
import StatsCards from '../../components/operasyon/StatsCards'
import NewCallModal from '../../components/operasyon/NewCallModal'
import EditCallDetailsModal from '../../components/operasyon/EditCallDetailsModal'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

const INITIAL_FILTERS = { kaynak: 'tumu', dateRange: '7g', customFrom: '', customTo: '' }

export default function OperasyonTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data: calls, setData: setCalls, loading, error, reload } = useAsyncList(
    () => callLogsProvider.list(),
    [],
  )
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showModal, setShowModal] = useState(false)
  const [editingCall, setEditingCall] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const isManager = canManageCalls(role)
  const userName = (id) => knownUsers[id]?.name ?? '—'

  // Panel'in "Dikkat Gerekiyor" bölümünden ?odak=1 ile gelindiğinde, normal
  // kaynak/tarih filtrelerini görmezden gelip SADECE gecikmiş kayıtları
  // gösteriyoruz — aksi halde kullanıcı "İncele"ye basıp genel listede
  // gecikmiş kaydı aramak zorunda kalıyordu.
  const odakActive = searchParams.get('odak') === 'cagri'

  const visible = useMemo(() => {
    const roleFiltered = (calls ?? []).filter((c) => canViewCall(c, user))
    if (odakActive) {
      return roleFiltered.filter((c) => isStaleReturn(c)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }
    return roleFiltered
      .filter((c) => filters.kaynak === 'tumu' || c.kaynak === filters.kaynak)
      .filter((c) => isWithinRange(c.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      // Sadece tarihe göre, en yeni üstte — bir durumu (Görüşüldü/Portföy)
      // işaretlemek satırı listede yukarı/aşağı sıçratmasın istendi (bkz.
      // "seçince en üste çıkıyor, tarih sıralaması bozulmasın" isteği).
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [calls, user, filters, odakActive])

  const stats = useMemo(() => computeCallStats(visible), [visible])

  // Broker de kendi portföy/çağrılarını takip edip veri girebilmek için
  // atama listesinde görünür — ama Lig sıralamaları/Sağlık Skoru gibi
  // yerlerdeki "danışman listesi" filtreleri bilerek AYRI tutuluyor (bkz.
  // Lig.jsx/Panel.jsx/TakipTab.jsx), broker orada YAYINLANMAK istemiyor.
  const inviteeOptions = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman' || u.role === 'broker')

  async function updateCall(id, patch) {
    try {
      const updated = await callLogsProvider.update(id, patch)
      setCalls((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch (err) {
      showToast(err.message ?? 'Çağrı güncellenemedi, tekrar dene.', 'error')
    }
  }

  function handleAssign(id, assignedTo) {
    updateCall(id, { assignedTo })
  }

  // CallTable zaten bir sonraki durumu (3'lü döngü) hesaplayıp gönderiyor —
  // burada sadece kaydediyoruz. "Görüşüldü"ye geçince donusAt otomatik
  // dolsun, diğer durumlarda (Bekliyor/Ulaşılamadı) boşalsın — "satisTarihi"
  // ile aynı desen (bkz. handleEditDetails).
  function handleToggle(id, field, nextValue) {
    const patch = { [field]: nextValue }
    if (field === 'donusYapildiMi') patch.donusAt = nextValue === true ? new Date().toISOString() : null
    // Portföy "Alındı" işaretlenince kod otomatik verilsin — elle
    // unutulup karışıklık olmasın (bkz. "her eklenen portföye bir kod
    // veriyorduk" isteği). Zaten bir kodu varsa (örn. eskiden elle
    // girilmişse) üstüne yazmıyoruz.
    if (field === 'portfoyAlindiMi' && nextValue === true) {
      const call = (calls ?? []).find((c) => c.id === id)
      if (!call?.portfoyNo) patch.portfoyNo = generatePortfoyKodu()
    }
    updateCall(id, patch)
  }

  // "Dönüş Yapıldı" için donusAt nasıl otomatik set ediliyorsa, "Satıldı"
  // işaretlenince de satisTarihi aynı şekilde otomatik dolsun — satışın NE
  // ZAMAN olduğu elle ayrıca girilmesin.
  async function handleEditDetails(form) {
    if (!editingCall) return
    setSubmitting(true)
    try {
      const patch = { ...form }
      if (form.satildiMi !== editingCall.satildiMi) {
        patch.satisTarihi = form.satildiMi ? new Date().toISOString() : null
      }
      const updated = await callLogsProvider.update(editingCall.id, patch)
      setCalls((prev) => prev.map((c) => (c.id === editingCall.id ? updated : c)))
      setEditingCall(null)
      showToast('Çağrı bilgileri güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const created = await callLogsProvider.create(form)
      setCalls((prev) => [created, ...prev])
      setShowModal(false)
      showToast('Çağrı kaydedildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Çağrı kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {odakActive ? (
            <FocusBanner
              text={`${visible.length} çağrıda 2 günden uzun süredir dönüş yapılmadı — sadece bunlar gösteriliyor.`}
              onClear={() => setSearchParams({})}
            />
          ) : (
            <>
              <div className="mb-5">
                <StatsCards stats={stats} />
              </div>

              <div className="mb-5">
                <CallFilters
                  filters={filters}
                  onChange={setFilters}
                  showKaynak={isManager}
                  onNewCallClick={isManager ? () => setShowModal(true) : undefined}
                />
              </div>

              {isManager && (
                <p className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                  {Object.entries(CALL_SOURCE_CODES).map(([name, { code }]) => (
                    <span key={name}>
                      <strong className="text-ink-500">{code}</strong>: {name}
                    </span>
                  ))}
                </p>
              )}
            </>
          )}

          <CallTable
            calls={visible}
            currentUserId={user.id}
            currentRole={role}
            isManager={isManager}
            inviteeOptions={inviteeOptions}
            resolveName={userName}
            onAssign={handleAssign}
            onToggle={handleToggle}
            onEditDetails={setEditingCall}
          />
        </>
      )}

      {showModal && (
        <NewCallModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          inviteeOptions={inviteeOptions}
        />
      )}

      {editingCall && (
        <EditCallDetailsModal
          call={editingCall}
          onClose={() => setEditingCall(null)}
          onSubmit={handleEditDetails}
          submitting={submitting}
        />
      )}
    </div>
  )
}
