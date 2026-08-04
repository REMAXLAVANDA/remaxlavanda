import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { callLogs as callLogsProvider, opportunities as opportunitiesProvider } from '../../lib/dataProvider'
import { CALL_SOURCE_CODES, canManageCalls, canViewCall, computeCallStats, generateTalepKodu } from '../../lib/callLogs'
import { isWithinRange } from '../../lib/dateRange'
import { isStaleReturn } from '../../lib/attention'
import { parseThousands, sortByName } from '../../lib/format'
import { formatPhoneInput } from '../../lib/phone'
import FocusBanner from '../../components/common/FocusBanner'
import CallTable from '../../components/operasyon/CallTable'
import CallFilters from '../../components/operasyon/CallFilters'
import StatsCards from '../../components/operasyon/StatsCards'
import NewCallModal from '../../components/operasyon/NewCallModal'
import EditCallDetailsModal from '../../components/operasyon/EditCallDetailsModal'
import NewOpportunityModal from '../../components/opportunities/NewOpportunityModal'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

const INITIAL_FILTERS = { kaynak: 'tumu', dateRange: '7g', customFrom: '', customTo: '' }

// Yükleme bitmeden önce data null olur — useMemo bağımlılıklarının her
// render'da referans değiştirmemesi için sabit, boş bir dizi kullanılır.
const EMPTY = []

export default function OperasyonTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  // Fırsatlar da (sadece islem_tipi'ni okumak için) çekiliyor — dönüştürülmüş
  // bir çağrının yanında Satılık/Kiralık ikonu gösterebilmek için (bkz.
  // "lead'in yanında bir ikon olsun" isteği). RLS izin vermediği kayıtlar
  // için ikon sessizce gösterilmez (diğer sayfalardaki aynı davranış).
  const { data, setData, loading, error, reload } = useAsyncList(
    () =>
      Promise.all([callLogsProvider.list(), opportunitiesProvider.list()]).then(([calls, opportunities]) => ({
        calls,
        opportunities,
      })),
    [],
  )
  const calls = data?.calls ?? EMPTY
  const opportunities = data?.opportunities ?? EMPTY
  function setCalls(updater) {
    setData((prev) => ({ ...prev, calls: typeof updater === 'function' ? updater(prev.calls) : updater }))
  }
  const islemTipiByOpportunityId = useMemo(() => {
    const map = {}
    for (const o of opportunities) map[o.id] = o.islemTipi
    return map
  }, [opportunities])
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  // Broker/owner/ofis (isManager) RLS gereği ofisteki HER çağrıyı görür —
  // kendine atanan çağrıları o kalabalığın içinde ayırt etmek zordu (bkz.
  // "sadece ekledigim bana atanan çağrıları görebileyim" isteği). Şema'da
  // "kim ekledi" diye ayrı bir alan yok, bu yüzden "atanan" (assignedTo)
  // üzerinden filtreleniyor — danışman zaten RLS'te sadece kendine atananı
  // görüyor, bu toggle onun için bir şey değiştirmez.
  const [onlyMine, setOnlyMine] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCall, setEditingCall] = useState(null)
  const [convertingCall, setConvertingCall] = useState(null)
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
    const roleFiltered = (calls ?? []).filter((c) => canViewCall(c, user)).filter((c) => !onlyMine || c.assignedTo === user.id)
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
  }, [calls, user, filters, odakActive, onlyMine])

  const stats = useMemo(() => computeCallStats(visible), [visible])

  // Broker de kendi portföy/çağrılarını takip edip veri girebilmek için
  // atama listesinde görünür — ama Lig sıralamaları/Sağlık Skoru gibi
  // yerlerdeki "danışman listesi" filtreleri bilerek AYRI tutuluyor (bkz.
  // Lig.jsx/Panel.jsx/TakipTab.jsx), broker orada YAYINLANMAK istemiyor.
  const inviteeOptions = sortByName(Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman' || u.role === 'broker'))

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

  // call_logs_manage RLS'i zaten broker/owner/ofis dışını engelliyor —
  // CallTable buton dahi göstermiyor ama double-check burada da var.
  async function handleDelete(call) {
    if (!canManageCalls(role)) return
    if (!window.confirm(`"${call.arayanAd}" çağrısı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return
    try {
      await callLogsProvider.remove(call.id)
      setCalls((prev) => prev.filter((c) => c.id !== call.id))
      showToast('Çağrı silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Çağrı silinemedi, tekrar dene.', 'error')
    }
  }

  // CallTable zaten bir sonraki durumu (3'lü döngü) hesaplayıp gönderiyor —
  // burada sadece kaydediyoruz. "Görüşüldü"ye geçince donusAt otomatik
  // dolsun, diğer durumlarda (Bekliyor/Ulaşılamadı) boşalsın — "satisTarihi"
  // ile aynı desen (bkz. handleEditDetails).
  function handleToggle(id, field, nextValue) {
    const patch = { [field]: nextValue }
    if (field === 'donusYapildiMi') patch.donusAt = nextValue === true ? new Date().toISOString() : null
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

  // Santral/Reklam/Web Sitesi'nden gelen bir çağrı zaten arayan ad/telefonu
  // otomatik tutuyor — danışman "Fırsata Dönüştür" deyince bunları tekrar
  // yazmasın diye NewOpportunityModal'a ön-dolu açılıyor (Lead Havuzu'ndaki
  // "Fırsata Dönüştür" ile AYNI desen, bkz. Leads.jsx handleConvertToOpportunity).
  function handleConvertToOpportunity(call) {
    setConvertingCall(call)
  }

  async function handleOpportunitySubmit(form) {
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        fiyat: parseThousands(form.fiyat),
        fiyatMin: parseThousands(form.fiyatMin),
        fiyatMax: parseThousands(form.fiyatMax),
        m2: form.m2 ? Number(form.m2) : null,
      }
      // Çağrı zaten bir danışmana atanmışsa fırsat da ONA ait olmalı —
      // dönüştüren kişi (broker/ofis) kim olursa olsun, işi fiilen yapan
      // danışmandan "çalınmasın" (bulunan hata: broker dönüştürünce sessizce
      // kendine atanıyordu, atanan danışmanın adı hiç geçmiyordu). Çağrının
      // ataması yoksa dönüştüren kişi kendine alır (eski davranış, "ben onu
      // direkt oradan havuza atabilir miyim" isteğiyle aynı).
      const targetOwnerId = convertingCall.assignedTo || user.id
      const selfClaim = !form.havuzaAt
      const created = await opportunitiesProvider.create(payload, targetOwnerId, selfClaim)
      // Çağrı zaten portföye dönüştüğü için "Portföy" durumu da otomatik
      // "Alındı" oluyor — Fırsat oluşup Portföy hâlâ "Bekliyor" görünmesin diye.
      // portfoyTalebiMi de true'ya çekilir — "bilgi amaçlı" işaretlenmiş bir
      // Santral çağrısı fiilen portföye dönüşürse Süreç zinciri (Portföy/
      // Satış) artık görünmeli, "Bilgi amaçlı" rozetinde takılı kalmamalı.
      const updated = await callLogsProvider.update(convertingCall.id, {
        opportunityId: created.id,
        portfoyAlindiMi: true,
        portfoyTalebiMi: true,
      })
      // İkon hemen görünsün diye yeni fırsat da lokal listeye ekleniyor —
      // sayfa yenilenmeden (bkz. islemTipiByOpportunityId).
      setData((prev) => ({
        calls: prev.calls.map((c) => (c.id === updated.id ? updated : c)),
        opportunities: [created, ...prev.opportunities],
      }))
      setConvertingCall(null)
      showToast("Fırsatlar'a gönderildi.", 'success')
    } catch (err) {
      showToast(err.message ?? 'Dönüştürülemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      // Talep no portföy alınmasını beklemeden, çağrı oluşturulur oluşturulmaz
      // veriliyor — müşteriden gelen tapu vs. belgeleri danışmana bu numarayla
      // yönlendirebilelim diye (bkz. "Portföy alanında değil ... yeni
      // çağrılara" isteği).
      const created = await callLogsProvider.create({ ...form, portfoyNo: generateTalepKodu(form.kaynak) })
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
                  onlyMine={onlyMine}
                  onOnlyMineChange={isManager ? setOnlyMine : undefined}
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
            onDelete={handleDelete}
            onConvertToOpportunity={handleConvertToOpportunity}
            islemTipiByOpportunityId={islemTipiByOpportunityId}
          />
        </>
      )}

      {convertingCall && (
        <NewOpportunityModal
          initialValues={{
            type: null,
            leadAd: convertingCall.arayanAd,
            leadTelefon: convertingCall.arayanTelefon ? formatPhoneInput(convertingCall.arayanTelefon) : '',
          }}
          showPoolToggle
          poolToggleNote={
            convertingCall.assignedTo && convertingCall.assignedTo !== user.id
              ? `Tik kapalıysa fırsat direkt ${userName(convertingCall.assignedTo)} adına kaydedilir.`
              : undefined
          }
          onClose={() => setConvertingCall(null)}
          onSubmit={handleOpportunitySubmit}
          submitting={submitting}
        />
      )}

      {showModal && (
        <NewCallModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          inviteeOptions={inviteeOptions}
          existingCalls={calls ?? []}
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
