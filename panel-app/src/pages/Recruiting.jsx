import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { recruiting as recruitingProvider, calendarEvents as calendarProvider } from '../lib/dataProvider'
import { canManageRecruiting, matchesKayitTipiFilter } from '../lib/recruiting'
import { addMinutesToTimeString } from '../lib/calendar'
import { sortByName } from '../lib/format'
import { ROLES } from '../lib/roles'
import RecruitingTable from '../components/recruiting/RecruitingTable'
import RecruitingFilters from '../components/recruiting/RecruitingFilters'
import RecruitingDetailModal from '../components/recruiting/RecruitingDetailModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

// kayitTipi varsayılan 'aktif' — arşiv taşımasıyla gelen ~421 'gecmis'
// kaydı listeyi kirletmesin diye (bkz. lib/recruiting.js
// matchesKayitTipiFilter, AI_NOTLARI.md).
const INITIAL_FILTERS = { durum: 'tumu', atananId: 'tumu', kayitTipi: 'aktif' }

// Adayın "Görüşme / Randevu Tarihi" alanı doldurulunca Takvim'de bir
// 'recruiting_gorusmesi' etkinliği oluşuyor/güncelleniyor — candidate +
// events BİRLİKTE yükleniyor ki düzenlerken var olan tarih önceden dolu
// gelsin (bkz. RecruitingDetailModal interviewEvent notu).
async function loadAll() {
  const [candidates, events] = await Promise.all([recruitingProvider.list(), calendarProvider.list()])
  return { candidates, events }
}

export default function Recruiting() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const candidates = data?.candidates ?? []
  const events = data?.events ?? []
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showModal, setShowModal] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const resolveName = (id) => knownUsers[id]?.name ?? '—'
  // Reklam/kampanya bilgisi SADECE broker/owner'a görünsün — ofis Recruiting'e
  // erişebiliyor (canManageRecruiting) ama bu bilgi onun işi değil (bkz.
  // "danışman görmesine gerek yok, broker ve owner görebilsin" isteği —
  // danışman zaten sayfaya hiç giremiyor, asıl kısıt burada ofis için).
  const showCampaign = role === ROLES.BROKER || role === ROLES.OWNER
  const danismanOptions = sortByName(Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi))

  const visible = useMemo(() => {
    return candidates
      .filter((c) => filters.durum === 'tumu' || c.durum === filters.durum)
      .filter((c) => {
        if (filters.atananId === 'tumu') return true
        if (filters.atananId === 'atanmadi') return !c.atananDanismanId
        return c.atananDanismanId === filters.atananId
      })
      .filter((c) => matchesKayitTipiFilter(c, filters.kayitTipi))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, filters])

  const editingInterviewEvent = editingCandidate
    ? events.find((e) => e.id === editingCandidate.gorusmeEventId)
    : null

  // Adayın kendi görüşme etkinliğini oluşturur/günceller/siler — candidate
  // kaydının kendisinden AYRI bir adım, çünkü etkinlik id'si ancak
  // oluşturulduktan sonra belli olur (bkz. Migration Onay Kuralı notu:
  // recruiting_candidates.gorusme_event_id, calendar_events'e FK).
  async function syncInterviewEvent(savedCandidate, form) {
    const hasNewSchedule = Boolean(form.gorusmeTarih && form.gorusmeSaat)
    const existingEventId = savedCandidate.gorusmeEventId

    if (!hasNewSchedule) {
      if (existingEventId) {
        await calendarProvider.remove(existingEventId)
        const cleared = await recruitingProvider.update(savedCandidate.id, { gorusmeEventId: null })
        setData((prev) => ({
          candidates: prev.candidates.map((c) => (c.id === cleared.id ? cleared : c)),
          events: prev.events.filter((e) => e.id !== existingEventId),
        }))
        return cleared
      }
      return savedCandidate
    }

    // endTime, süre formda seçilmemişse (eski çağrılar/geriye dönük
    // uyumluluk) varsayılan 30 dakika kullanılarak başlangıçtan hesaplanır
    // — önceden hep null gönderiliyordu, Takvim'de sadece başlangıç saati
    // görünüp süre/bitiş hiç görünmüyordu.
    const eventForm = {
      type: 'recruiting_gorusmesi',
      title: `Görüşme — ${savedCandidate.adSoyad}`,
      date: form.gorusmeTarih,
      startTime: form.gorusmeSaat,
      endTime: addMinutesToTimeString(form.gorusmeSaat, form.gorusmeSure ?? 30),
      gorunurluk: 'davetliler',
    }

    if (existingEventId) {
      const updatedEvent = await calendarProvider.update(existingEventId, eventForm)
      setData((prev) => ({
        ...prev,
        events: prev.events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
      }))
      return savedCandidate
    }

    const createdEvent = await calendarProvider.create(eventForm, user.id)
    const linked = await recruitingProvider.update(savedCandidate.id, { gorusmeEventId: createdEvent.id })
    setData((prev) => ({
      candidates: prev.candidates.map((c) => (c.id === linked.id ? linked : c)),
      events: [...prev.events, createdEvent],
    }))
    return linked
  }

  async function handleSave(form) {
    setSubmitting(true)
    try {
      let saved
      if (editingCandidate) {
        saved = await recruitingProvider.update(editingCandidate.id, form)
        setData((prev) => ({ ...prev, candidates: prev.candidates.map((c) => (c.id === saved.id ? saved : c)) }))
      } else {
        saved = await recruitingProvider.create(form)
        setData((prev) => ({ ...prev, candidates: [saved, ...prev.candidates] }))
      }
      await syncInterviewEvent(saved, form)
      showToast(editingCandidate ? 'Aday güncellendi.' : 'Aday eklendi.', 'success')
      setEditingCandidate(null)
      setShowModal(false)
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // kayit_tipi='gecmis' olan HER kayıtta görünür (durum fark etmez) —
  // 358 "Beklemede" arşiv kaydı zaten yeni_basvuru olarak gelecek, onları
  // raporlu sürece almak tam olarak bu demek. Sadece 'olumsuz' ise
  // 'yeni_basvuru'ya çekilir, değilse durum korunur (bkz. AI_NOTLARI.md).
  async function handleReactivate(candidate) {
    setSubmitting(true)
    try {
      const patch = {
        kayitTipi: 'manuel',
        yenidenAktifAt: new Date().toISOString(),
      }
      if (candidate.durum === 'olumsuz') patch.durum = 'yeni_basvuru'
      const updated = await recruitingProvider.update(candidate.id, patch)
      setData((prev) => ({ ...prev, candidates: prev.candidates.map((c) => (c.id === candidate.id ? updated : c)) }))
      setEditingCandidate(null)
      showToast('Aday yeniden aktifleştirildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Aktifleştirilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Lead Havuzu ile aynı ikinci savunma katmanı — recruiting_manage RLS'i
  // zaten veriyi engelliyor (bkz. lib/recruiting.js canManageRecruiting).
  if (!canManageRecruiting(role)) return <Navigate to="/panel" replace />

  return (
    <div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="mb-5">
            <RecruitingFilters
              filters={filters}
              onChange={setFilters}
              danismanOptions={danismanOptions}
              onNewCandidateClick={() => setShowModal(true)}
            />
          </div>

          <RecruitingTable candidates={visible} resolveName={resolveName} onRowClick={setEditingCandidate} showCampaign={showCampaign} />
        </>
      )}

      {(showModal || editingCandidate) && (
        <RecruitingDetailModal
          candidate={editingCandidate}
          existingCandidates={candidates}
          interviewEvent={editingInterviewEvent}
          onClose={() => {
            setShowModal(false)
            setEditingCandidate(null)
          }}
          onSubmit={handleSave}
          onReactivate={handleReactivate}
          submitting={submitting}
        />
      )}
    </div>
  )
}
