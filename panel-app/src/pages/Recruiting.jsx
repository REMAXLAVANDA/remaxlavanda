import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { recruiting as recruitingProvider, calendarEvents as calendarProvider, users as usersProvider } from '../lib/dataProvider'
import { canManageRecruiting, candidateKaynakOzeti } from '../lib/recruiting'
import { isWithinRange } from '../lib/dateRange'
import { addMinutesToTimeString } from '../lib/calendar'
import { sortByName } from '../lib/format'
import { ROLES } from '../lib/roles'
import RecruitingBoard from '../components/recruiting/RecruitingBoard'
import RecruitingFilters from '../components/recruiting/RecruitingFilters'
import RecruitingDetailModal from '../components/recruiting/RecruitingDetailModal'
import CreateUserModal from '../components/settings/CreateUserModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

// "Aktif/Geçmiş/Tümü" (kayıt tipi) filtresi yerine standart tarih filtresi
// geldi (2026-09-27, broker: "7 gün 30 gün gibi seçimler olmalı, diğerleri
// çok mantıksız artık") — Panel/Operasyon ile AYNI desen (bkz. lib/dateRange,
// DateRangeFilter). Arşivden taşınan ~421 'gecmis' kaydın created_at'i
// import tarihine (2026-07-07/14) sabit — bugünden en az ~75 gün eski,
// yani varsayılan '7g' penceresi onları zaten doğal olarak dışarıda
// bırakıyor, ayrı bir kayıt-tipi filtresine gerek kalmadı. "Tümü" seçilirse
// arşiv de dahil her şey görünür.
const INITIAL_FILTERS = { durum: 'tumu', atananId: 'tumu', dateRange: '7g', customFrom: '', customTo: '' }
// noteCounts useMemo'nun deps'i her render'da yeni bir [] referansıyla
// "değişti" sanmasın diye — data henüz yüklenmemişken sabit bir referans.
const EMPTY_NOTES = []

// Adayın "Görüşme / Randevu Tarihi" alanı doldurulunca Takvim'de bir
// 'recruiting_gorusmesi' etkinliği oluşuyor/güncelleniyor — candidate +
// events BİRLİKTE yükleniyor ki düzenlerken var olan tarih önceden dolu
// gelsin (bkz. RecruitingDetailModal interviewEvent notu). notes de aynı
// mantıkla BİRLİKTE yükleniyor — TÜM adayların notları tek seferde gelir
// (candidates gibi), hem kart rozetindeki sayı hem detaydaki liste aynı
// state'ten türer, ayrı bir "notu şimdi yükle" adımı yok (bkz. broker
// kararı: "ne yaptı kaç görüşme yapıldı görülmeli").
async function loadAll() {
  const [candidates, events, notes] = await Promise.all([
    recruitingProvider.list(),
    calendarProvider.list(),
    recruitingProvider.listNotes(),
  ])
  return { candidates, events, notes }
}

export default function Recruiting() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const candidates = data?.candidates ?? []
  const events = data?.events ?? []
  const notes = data?.notes ?? EMPTY_NOTES
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showModal, setShowModal] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [convertingCandidate, setConvertingCandidate] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [noteSubmitting, setNoteSubmitting] = useState(false)

  const resolveName = (id) => knownUsers[id]?.name ?? '—'
  // Kart rozetindeki "kaç görüşme yapıldı" sayısı — notes tek seferde
  // yüklenen TAM listeden türetiliyor (bkz. loadAll notu), candidateId'ye
  // göre gruplanıyor.
  const noteCounts = useMemo(() => {
    const counts = {}
    for (const n of notes) counts[n.candidateId] = (counts[n.candidateId] ?? 0) + 1
    return counts
  }, [notes])
  const editingCandidateNotes = editingCandidate ? notes.filter((n) => n.candidateId === editingCandidate.id) : []
  // Silme SADECE broker/owner (bkz. migration recruiting_notes_delete RLS'i
  // — ofis'ten gelen bir silme isteği sunucuda zaten reddedilir, buradaki
  // kontrol sadece butonu göstermemek için, ikinci savunma katmanı DB'de).
  const canDeleteNotes = role === ROLES.BROKER || role === ROLES.OWNER
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
      // "Yeniden Aktifleştir" ile geri dönen arşiv kayıtları TAZE sayılsın
      // diye createdAt yerine (varsa) yenidenAktifAt baz alınıyor — yoksa
      // arşivden dönen bir kayıt "7 gün/30 gün" penceresinde hep eski
      // görünüp kaybolurdu.
      .filter((c) => isWithinRange(c.yenidenAktifAt || c.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
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

  // "Olumlu" artık formdan seçilemiyor (bkz. lib/recruiting.js
  // RECRUITING_DURUM_SECILEBILIR) — TEK yol burası: gerçek bir danışman
  // hesabı açılınca aday otomatik "Olumlu"ya geçer (broker kararı:
  // "seçim olumlu olunca direkt yeni danışman kaydına atsın").
  function handleConvertToDanisman(candidate) {
    setEditingCandidate(null)
    setConvertingCandidate(candidate)
  }

  async function handleCreateDanisman(form) {
    setSubmitting(true)
    try {
      const created = await usersProvider.createUser({ ...form, kaynak: candidateKaynakOzeti(convertingCandidate) })
      const updated = await recruitingProvider.update(convertingCandidate.id, { durum: 'olumlu', olumsuzSebebi: null })
      setData((prev) => ({ ...prev, candidates: prev.candidates.map((c) => (c.id === updated.id ? updated : c)) }))
      setConvertingCandidate(null)
      showToast(`${created.name} danışman olarak eklendi.`, 'success')
    } catch (err) {
      showToast(err.message ?? 'Danışman oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Görüşme notları — açıklama alanından AYRI, birikimli günlük (bkz.
  // migration 20260927190000, broker: "parça parça ekleyelim, ne yaptı
  // kaç görüşme yapıldı görülmeli"). Kaydet/submitting'ten AYRI bir
  // noteSubmitting kullanılıyor ki not eklerken ana "Kaydet" butonu
  // gereksiz yere pasifleşmesin.
  async function handleAddNote(notMetni) {
    if (!editingCandidate) return
    setNoteSubmitting(true)
    try {
      const created = await recruitingProvider.addNote({ candidateId: editingCandidate.id, notMetni }, user.id)
      setData((prev) => ({ ...prev, notes: [created, ...prev.notes] }))
    } catch (err) {
      showToast(err.message ?? 'Not eklenemedi, tekrar dene.', 'error')
    } finally {
      setNoteSubmitting(false)
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await recruitingProvider.deleteNote(noteId)
      setData((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== noteId) }))
    } catch (err) {
      showToast(err.message ?? 'Not silinemedi, tekrar dene.', 'error')
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

          <RecruitingBoard
            candidates={visible}
            resolveName={resolveName}
            onCardClick={setEditingCandidate}
            showCampaign={showCampaign}
            noteCounts={noteCounts}
          />
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
          onConvertToDanisman={handleConvertToDanisman}
          submitting={submitting}
          notes={editingCandidateNotes}
          resolveName={resolveName}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          noteSubmitting={noteSubmitting}
          canDeleteNotes={canDeleteNotes}
        />
      )}

      {convertingCandidate && (
        <CreateUserModal
          initialValues={{
            ad: convertingCandidate.adSoyad,
            telefon: convertingCandidate.telefon ?? '',
            email: convertingCandidate.email ?? '',
          }}
          onClose={() => setConvertingCandidate(null)}
          onSubmit={handleCreateDanisman}
          submitting={submitting}
        />
      )}
    </div>
  )
}
