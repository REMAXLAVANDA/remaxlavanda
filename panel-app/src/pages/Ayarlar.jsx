import { useMemo, useState } from 'react'
import { Users, Shield, Tag, ScrollText, Plus, Webhook, Percent, Handshake } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import {
  users as usersProvider,
  categories as categoriesProvider,
  calendarEvents as calendarProvider,
  auditLog as auditLogProvider,
  metaWebhookErrors as metaWebhookErrorsProvider,
  telsamWebhookErrors as telsamWebhookErrorsProvider,
  metaCapiErrors as metaCapiErrorsProvider,
  callLogs as callLogsProvider,
  opportunities as opportunitiesProvider,
  league as leagueProvider,
  mentorPrimi as mentorPrimiProvider,
  danismanAnlasmalari as danismanAnlasmalariProvider,
} from '../lib/dataProvider'
import { canManageUsers, canViewAuditLog, canViewMentorPrimi, ROLE_LABELS } from '../lib/roles'
import { canApproveCiroRaporu } from '../lib/ciroRaporlari'
import { nextBirthdayDate } from '../lib/calendar'
import { slugify } from '../lib/categories'
import { callNeedsTracking } from '../lib/callLogs'
import { mentorPrimiRows, mentorPrimiToplam, MENTOR_PRIMI_DEFAULT_ORAN, MENTOR_PRIMI_DEFAULT_GUN } from '../lib/mentorPrimi'
import { currentMonthKey, monthRangeFor } from '../components/common/MonthFilter'
import UsersTable from '../components/settings/UsersTable'
import CreateUserModal from '../components/settings/CreateUserModal'
import EditUserModal from '../components/settings/EditUserModal'
import ResetPasswordModal from '../components/settings/ResetPasswordModal'
import DevretModal from '../components/settings/DevretModal'
import CategoryManager from '../components/settings/CategoryManager'
import PermissionMatrix from '../components/settings/PermissionMatrix'
import AuditLogTable from '../components/settings/AuditLogTable'
import WebhookErrorsTable from '../components/settings/WebhookErrorsTable'
import TelsamWebhookErrorsTable from '../components/settings/TelsamWebhookErrorsTable'
import MetaCapiErrorsTable from '../components/settings/MetaCapiErrorsTable'
import MentorPrimiPanel from '../components/settings/MentorPrimiPanel'
import DanismanAnlasmalariPanel from '../components/settings/DanismanAnlasmalariPanel'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { LoadingState, ErrorState, RestrictedAccess } from '../components/common/AsyncState'

const TABS = [
  { key: 'kullanicilar', label: 'Kullanıcılar', icon: Users },
  { key: 'yetki', label: 'Yetki', icon: Shield },
  { key: 'kategori', label: 'Kategori', icon: Tag },
  { key: 'log', label: 'Log', icon: ScrollText },
  { key: 'webhook', label: 'Webhook Hataları', icon: Webhook },
  { key: 'mentor-primi', label: 'Mentor Primi', icon: Percent },
  { key: 'danisman-anlasmalari', label: 'Danışman Anlaşmaları', icon: Handshake },
]

export default function Ayarlar() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers, patchKnownUser } = useKnownUsers()
  const [tab, setTab] = useState(TABS[0].key)
  const canManage = canManageUsers(role)
  // Log sekmesi 2026-10-08'den beri Ayarlar'ın genel (broker+owner)
  // kapısından ayrı, kendi başına daha sıkı bir kapı — owner artık bu
  // sekmeyi ne görür ne verisini çeker (bkz. lib/roles.js canViewAuditLog).
  const canViewLog = canViewAuditLog(role)
  // Mentor Primi: Selen'in (owner) kendi primine ait bir hesaplama —
  // "ayarlar bölümünde olsun ki açtığımda biri görmesin" (2026-10-08 broker
  // talebi) — bu yüzden owner DAHİL, sadece broker görür (bkz. lib/roles.js
  // canViewMentorPrimi, canViewLog'daki aynı sekme-gizleme deseni).
  const canViewMentor = canViewMentorPrimi(role)
  // Danışman Anlaşmaları (komisyon paylaşım oranı) — Ciro Raporu onay
  // yetkisiyle AYNI seviye (broker+owner), Mentor Primi'nin aksine
  // gizlilik isteği yok, owner da görebilir.
  const canManageAnlasmalar = canApproveCiroRaporu(role)
  const visibleTabs = TABS.filter(
    (t) =>
      (t.key !== 'log' || canViewLog) &&
      (t.key !== 'mentor-primi' || canViewMentor) &&
      (t.key !== 'danisman-anlasmalari' || canManageAnlasmalar),
  )
  const resolveName = (id) => knownUsers[id]?.name ?? '—'
  const [mentorPrimiForm, setMentorPrimiForm] = useState(() => {
    const monthKey = currentMonthKey()
    return { oran: MENTOR_PRIMI_DEFAULT_ORAN, gunSayisi: MENTOR_PRIMI_DEFAULT_GUN, monthKey, ...monthRangeFor(monthKey) }
  })

  const { data: allUsers, setData: setAllUsers, loading, error, reload } = useAsyncList(
    () => (canManage ? usersProvider.listAll() : Promise.resolve([])),
    [canManage],
  )
  const { data: privateInfoList, setData: setPrivateInfoList } = useAsyncList(
    () => (canManage ? usersProvider.listAllPrivateInfo() : Promise.resolve([])),
    [canManage],
  )
  // Pasif Danışmanın İşleri (2026-10-06, broker onayı — item 4): bu özellik
  // hayata geçmeden ÖNCE pasife alınmış danışmanlarda hâlâ kimsenin
  // göremediği açık çağrı/fırsat kalmış olabilir — requestToggleDurum'daki
  // zorunlu devret kontrolü sadece pasife alma ANINDA çalışıyor. Sadece
  // Kullanıcılar sekmesindeyken, sadece pasif kullanıcılar için hesaplanır.
  const { data: pendingWorkByUserId, reload: reloadPendingWork } = useAsyncList(async () => {
    if (!canManage || tab !== 'kullanicilar' || !allUsers) return {}
    const pasifUsers = allUsers.filter((u) => u.durum === 'pasif')
    if (pasifUsers.length === 0) return {}
    const [calls, opps] = await Promise.all([callLogsProvider.listSummary(), opportunitiesProvider.list()])
    const map = {}
    for (const u of pasifUsers) {
      const work = computePendingWork(u.id, calls, opps)
      if (work.pendingCallCount > 0 || work.pendingOpportunityCount > 0) map[u.id] = work
    }
    return map
  }, [canManage, tab, allUsers])
  const {
    data: docCategories,
    setData: setDocCategories,
    loading: loadingCategories,
    error: categoriesError,
    reload: reloadCategories,
  } = useAsyncList(() => (canManage ? categoriesProvider.list('docs') : Promise.resolve([])), [canManage])
  const {
    data: auditRows,
    loading: loadingAudit,
    error: auditError,
    reload: reloadAudit,
  } = useAsyncList(() => (canViewLog && tab === 'log' ? auditLogProvider.list() : Promise.resolve([])), [canViewLog, tab])
  const {
    data: webhookErrorRows,
    loading: loadingWebhookErrors,
    error: webhookErrorsError,
    reload: reloadWebhookErrors,
  } = useAsyncList(
    () => (canManage && tab === 'webhook' ? metaWebhookErrorsProvider.list() : Promise.resolve([])),
    [canManage, tab],
  )
  const {
    data: telsamWebhookErrorRows,
    loading: loadingTelsamWebhookErrors,
    error: telsamWebhookErrorsError,
    reload: reloadTelsamWebhookErrors,
  } = useAsyncList(
    () => (canManage && tab === 'webhook' ? telsamWebhookErrorsProvider.list() : Promise.resolve([])),
    [canManage, tab],
  )
  const {
    data: metaCapiErrorRows,
    loading: loadingMetaCapiErrors,
    error: metaCapiErrorsError,
    reload: reloadMetaCapiErrors,
  } = useAsyncList(
    () => (canManage && tab === 'webhook' ? metaCapiErrorsProvider.list() : Promise.resolve([])),
    [canManage, tab],
  )
  // Mentorluk başlangıç tarihi listesi HAFİF (sadece userId+tarih çifti) —
  // tab'dan bağımsız, broker Ayarlar'da olduğu sürece yüklü: hem Mentor
  // Primi sekmesindeki tabloda hem Kullanıcılar sekmesindeki Düzenle
  // formunda (mevcut değeri doldurmak için) kullanılıyor. Ciro girişleri
  // ise daha ağır bir sorgu — sadece Mentor Primi sekmesindeyken çekiliyor.
  const {
    data: mentorPrimiBaslangicList,
    setData: setMentorPrimiBaslangicList,
  } = useAsyncList(() => (canViewMentor ? mentorPrimiProvider.listBaslangicTarihleri() : Promise.resolve([])), [canViewMentor])
  const {
    data: mentorPrimiCiroGirisleri,
    loading: loadingMentorPrimi,
    error: mentorPrimiError,
    reload: reloadMentorPrimi,
  } = useAsyncList(
    () => (canViewMentor && tab === 'mentor-primi' ? leagueProvider.listCiroGirisleri() : Promise.resolve([])),
    [canViewMentor, tab],
  )
  const mentorPrimiData = useMemo(() => {
    const rows = mentorPrimiRows(allUsers, mentorPrimiCiroGirisleri, mentorPrimiBaslangicList, mentorPrimiForm)
    return { rows, toplam: mentorPrimiToplam(rows) }
  }, [allUsers, mentorPrimiCiroGirisleri, mentorPrimiBaslangicList, mentorPrimiForm])

  // CreateUserModal/EditUserModal'dan ("bence bunu danışman kaydettiğimiz
  // yere alalım", 2026-10-08) çağrılıyor — sadece broker (canViewMentor) ve
  // sadece gerçek, tam bir tarih girildiğinde. Boş/kısmi değerle hiç
  // çağrılmaz (bkz. o modallardaki form state — değer SADECE "Kaydet"e
  // basınca buraya geliyor, eski satır-içi anında-kaydeden kutudaki gibi
  // her tuşta ağa istek atmıyor).
  async function persistMentorBaslangic(userId, baslangicTarihi) {
    if (!canViewMentor || baslangicTarihi === undefined) return
    if (baslangicTarihi) {
      await mentorPrimiProvider.upsertBaslangicTarihi(userId, baslangicTarihi, user.id)
      setMentorPrimiBaslangicList((prev) => [...(prev ?? []).filter((b) => b.userId !== userId), { userId, baslangicTarihi }])
    } else {
      await mentorPrimiProvider.removeBaslangicTarihi(userId)
      setMentorPrimiBaslangicList((prev) => (prev ?? []).filter((b) => b.userId !== userId))
    }
  }

  const {
    data: danismanAnlasmalariList,
    loading: loadingAnlasmalar,
    error: anlasmalarError,
    reload: reloadAnlasmalar,
  } = useAsyncList(
    () => (canManageAnlasmalar && tab === 'danisman-anlasmalari' ? danismanAnlasmalariProvider.list() : Promise.resolve([])),
    [canManageAnlasmalar, tab],
  )
  const [savingAnlasma, setSavingAnlasma] = useState(false)

  async function handleCreateAnlasma(danismanId, paylasimOrani, gecerlilikBaslangic) {
    setSavingAnlasma(true)
    try {
      await danismanAnlasmalariProvider.create({ danismanId, paylasimOrani, gecerlilikBaslangic }, user.id)
      await reloadAnlasmalar()
      showToast('Komisyon oranı kaydedildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Oran kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSavingAnlasma(false)
    }
  }

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [roleChangeTarget, setRoleChangeTarget] = useState(null)
  const [changingRole, setChangingRole] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [devretTarget, setDevretTarget] = useState(null)
  const [devretting, setDevretting] = useState(false)

  // Rol değişikliği artık onaysız/anında uygulanmıyor (bkz. Portal Kurulu
  // /kurul yetki denetimi, 2026-09-30 — kullanilabilirlik-denetci [İhlal]
  // Kritik: onay yokluğu, broker kendini kazara kilitleyebilir). select'in
  // onChange'i sadece bunu ÇAĞIRIR — gerçek işlem handleChangeRole'de,
  // sadece ConfirmDialog onaylanınca çalışır.
  function requestRoleChange(id, role) {
    const target = allUsers?.find((u) => u.id === id)
    if (!target) return
    setRoleChangeTarget({ id, name: target.name, fromRole: target.role, toRole: role })
  }

  async function handleChangeRole() {
    if (!roleChangeTarget) return
    const { id, toRole } = roleChangeTarget
    setChangingRole(true)
    try {
      await usersProvider.updateUser(id, { role: toRole })
      setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: toRole } : u)))
      patchKnownUser(id, { role: toRole })
      showToast('Rol güncellendi.', 'success')
      setRoleChangeTarget(null)
    } catch (err) {
      // Aynı denetimde bulunan ikinci bulgu: hata durumunda state hiç
      // dokunulmuyordu, arayüz DB'deki gerçek durumu yanlış yansıtabiliyordu.
      // reload() ile sunucudaki gerçek veriyi zorla tazeliyoruz — varsayıma
      // (incidental re-render) güvenmek yerine garanti bir düzeltme.
      showToast(err.message ?? 'Rol güncellenemedi, tekrar dene.', 'error')
      reload()
    } finally {
      setChangingRole(false)
    }
  }

  // silentToast: devret akışı (handleDevretAndDeactivate) kendi özet
  // toast'ını gösteriyor — ikisi üst üste çıkmasın diye buradaki genel
  // mesaj o akışta bastırılıyor.
  async function handleToggleDurum(id, durum, { silentToast = false } = {}) {
    try {
      await usersProvider.updateUser(id, { durum })
      setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, durum } : u)))
      // Takvimde sadece AKTİF danışmanın doğum günü görünsün — pasife
      // alınca mevcut etkinliği kaldır, tekrar aktifleştirilince (doğum
      // tarihi hâlâ kayıtlıysa) yeniden oluştur (bkz. "aktif olanın doğum
      // günü görünsün" isteği).
      if (durum === 'pasif') {
        const existingEventId = await calendarProvider.findBirthdayEvent(id)
        if (existingEventId) await calendarProvider.remove(existingEventId)
      } else {
        const info = (privateInfoList ?? []).find((p) => p.userId === id)
        const targetName = allUsers?.find((u) => u.id === id)?.name
        if (info?.dogumTarihi && targetName) await syncBirthdayEvent(id, targetName, info.dogumTarihi)
      }
      if (!silentToast) {
        showToast(durum === 'aktif' ? 'Kullanıcı aktifleştirildi.' : 'Kullanıcı pasifleştirildi.', 'success')
      }
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    }
  }

  // requestToggleDurum (pasife alırken zorunlu devret) VE pasif danışmanlar
  // listesindeki rozet (bkz. pendingWorkByUserId) AYNI hesabı kullanır —
  // tek bir yerde tanımlı.
  function computePendingWork(id, calls, opps) {
    const pendingCalls = calls.filter((c) => c.assignedTo === id && !c.donusYapildiMi && callNeedsTracking(c))
    const pendingOpps = opps.filter(
      (o) => (o.ownerId === id || o.claimerId === id) && (o.status === 'acik' || o.status === 'claimed'),
    )
    return {
      pendingCallIds: pendingCalls.map((c) => c.id),
      pendingCallCount: pendingCalls.length,
      pendingOpportunityCount: pendingOpps.length,
    }
  }

  // Aktifleştirme her zaman anında olur (eskisi gibi) — sadece pasife
  // alırken önce açık iş var mı kontrol ediliyor (bkz. /kurul "danışman
  // takip menüleri" denetimi: pasife alma işi hiç devretmiyordu, kayıtlar
  // kimsenin göremediği bir danışmanın üzerinde asılı kalıyordu).
  async function requestToggleDurum(id, durum) {
    if (durum === 'aktif') return handleToggleDurum(id, durum)
    const target = allUsers?.find((u) => u.id === id)
    if (!target) return
    const [calls, opps] = await Promise.all([callLogsProvider.listSummary(), opportunitiesProvider.list()])
    const work = computePendingWork(id, calls, opps)
    if (work.pendingCallCount === 0 && work.pendingOpportunityCount === 0) {
      return handleToggleDurum(id, durum)
    }
    setDevretTarget({ id, name: target.name, alreadyPasif: false, ...work })
  }

  // 2026-10-06 broker isteği (madde 4, "Pasif Danışmanın İşleri"): bu
  // özellik hayata geçmeden ÖNCE pasife alınmış danışmanlarda hâlâ
  // kimsenin göremediği açık kayıtlar kalmış olabilir (requestToggleDurum
  // sadece pasife alma ANINDA çalışıyor). UsersTable'daki rozetten,
  // zaten pasif olan bir danışman için de aynı devret penceresi isteğe
  // bağlı olarak açılabiliyor — zorunlu değil, pasifleştirme tekrar
  // tetiklenmiyor (alreadyPasif: true).
  function handleDevretRequest(id) {
    const target = allUsers?.find((u) => u.id === id)
    const work = pendingWorkByUserId[id]
    if (!target || !work) return
    setDevretTarget({ id, name: target.name, alreadyPasif: true, ...work })
  }

  async function handleDevretAndDeactivate(toUserId) {
    if (!devretTarget) return
    setDevretting(true)
    try {
      await Promise.all([
        callLogsProvider.reassignPending(devretTarget.pendingCallIds, toUserId, devretTarget.id),
        opportunitiesProvider.reassignOpen(devretTarget.id, toUserId),
      ])
      const kayitSayisi = devretTarget.pendingCallCount + devretTarget.pendingOpportunityCount
      if (devretTarget.alreadyPasif) {
        showToast(`${kayitSayisi} kayıt devredildi.`, 'success')
      } else {
        await handleToggleDurum(devretTarget.id, 'pasif', { silentToast: true })
        showToast(`${kayitSayisi} kayıt devredildi, ${devretTarget.name} pasifleştirildi.`, 'success')
      }
      setDevretTarget(null)
      reloadPendingWork()
    } catch (err) {
      showToast(err.message ?? 'Devredilemedi, tekrar dene.', 'error')
    } finally {
      setDevretting(false)
    }
  }

  // Ayarlar'da doğum tarihi eklenip/değiştirilip/silinince Takvim'deki
  // "🎂 ... — Doğum Günü" etkinliğinin bundan bağımsız kalmaması için —
  // önceden sadece kullanıcı OLUŞTURULURKEN bir kere ekleniyordu, sonraki
  // düzenlemeler takvime hiç yansımıyordu (bkz. "güncelledim ama takvimde
  // görünmüyor" bildirimi).
  async function syncBirthdayEvent(userId, name, dogumTarihi) {
    try {
      const existingEventId = await calendarProvider.findBirthdayEvent(userId)
      if (dogumTarihi) {
        if (existingEventId) {
          await calendarProvider.update(existingEventId, {
            title: `🎂 ${name} — Doğum Günü`,
            date: nextBirthdayDate(dogumTarihi),
            startTime: '09:00',
            endTime: '',
          })
        } else {
          await calendarProvider.create(
            {
              type: 'etkinlik',
              title: `🎂 ${name} — Doğum Günü`,
              date: nextBirthdayDate(dogumTarihi),
              startTime: '09:00',
              endTime: '',
              katilimTipleri: { [userId]: 'istege_bagli' },
            },
            user.id,
          )
        }
      } else if (existingEventId) {
        // Doğum tarihi silindi — bir sonraki yıl artık görünmesin.
        await calendarProvider.remove(existingEventId)
      }
    } catch {
      // İkincil bir aksiyon — takvim senkronu başarısız olsa da asıl kayıt
      // (doğum tarihi/aktiflik) zaten kaydedildi, kullanıcıyı bloklamıyoruz.
    }
  }

  // Broker'ın kendi inceleme/test amaçlı açtığı hesapları Lig/Takip/Panel
  // gibi ekip performans listelerinden hariç tutmak için (bkz. "test hesabı
  // açtım, tablolarda görünmesin" isteği).
  async function handleToggleTestHesabi(id, testHesabi) {
    try {
      await usersProvider.updateUser(id, { testHesabi })
      setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, testHesabi } : u)))
      patchKnownUser(id, { testHesabi })
      showToast(testHesabi ? 'Test hesabı olarak işaretlendi.' : 'Test hesabı işareti kaldırıldı.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleCreateUser(form) {
    setSubmitting(true)
    try {
      const created = await usersProvider.createUser(form)
      setAllUsers((prev) => [...prev, { ...created, durum: 'aktif' }])
      setShowCreateModal(false)
      showToast('Kullanıcı oluşturuldu.', 'success')
      if (form.dogumTarihi || form.tcNo) {
        try {
          await usersProvider.upsertPrivateInfo(created.id, { dogumTarihi: form.dogumTarihi || null, tcNo: form.tcNo || null })
        } catch {
          showToast('Kullanıcı oluşturuldu ama doğum tarihi/TC no kaydedilemedi.', 'error')
        }
      }
      if (form.dogumTarihi) {
        try {
          await calendarProvider.create(
            {
              type: 'etkinlik',
              title: `🎂 ${created.name} — Doğum Günü`,
              date: nextBirthdayDate(form.dogumTarihi),
              startTime: '09:00',
              endTime: '',
              katilimTipleri: { [created.id]: 'istege_bagli' },
            },
            user.id,
          )
        } catch {
          // İkincil bir aksiyon — takvime eklenemese de kullanıcı oluşturma
          // akışını bloke etmiyoruz, sessizce vazgeçiyoruz.
        }
      }
      if (form.mentorBaslangicTarihi) {
        try {
          await persistMentorBaslangic(created.id, form.mentorBaslangicTarihi)
        } catch {
          showToast('Kullanıcı oluşturuldu ama Mentor Primi başlangıç tarihi kaydedilemedi.', 'error')
        }
      }
    } catch (err) {
      showToast(err.message ?? 'Kullanıcı oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditUser(patch) {
    if (!editingUser) return
    setSubmitting(true)
    try {
      await usersProvider.updateUser(editingUser.id, { name: patch.ad })
      setAllUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, name: patch.ad } : u)))
      await usersProvider.upsertPrivateInfo(editingUser.id, { dogumTarihi: patch.dogumTarihi, tcNo: patch.tcNo })
      setPrivateInfoList((prev) => [
        ...(prev ?? []).filter((p) => p.userId !== editingUser.id),
        { userId: editingUser.id, dogumTarihi: patch.dogumTarihi, tcNo: patch.tcNo },
      ])
      await syncBirthdayEvent(editingUser.id, patch.ad, patch.dogumTarihi)
      if (patch.mentorBaslangicTarihi !== undefined) {
        try {
          await persistMentorBaslangic(editingUser.id, patch.mentorBaslangicTarihi)
        } catch {
          showToast('Kullanıcı güncellendi ama Mentor Primi başlangıç tarihi kaydedilemedi.', 'error')
        }
      }
      setEditingUser(null)
      showToast('Kullanıcı güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await usersProvider.deleteUser(deleteTarget.id)
      setAllUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast('Kullanıcı silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kullanıcı silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleResetPassword(password) {
    if (!resetTarget) return
    setResetting(true)
    try {
      await usersProvider.resetPassword(resetTarget.id, password)
      showToast('Şifre sıfırlandı — yeni şifreyi kullanıcıya ilet, ilk girişte değiştirmesi zorunlu.', 'success')
      setResetTarget(null)
    } catch (err) {
      showToast(err.message ?? 'Şifre sıfırlanamadı, tekrar dene.', 'error')
    } finally {
      setResetting(false)
    }
  }

  async function handleAddCategory(label, visibility) {
    try {
      const maxOrder = (docCategories ?? []).reduce((max, c) => Math.max(max, c.sortOrder), 0)
      const created = await categoriesProvider.create({
        module: 'docs',
        key: slugify(label),
        label,
        sortOrder: maxOrder + 1,
        visibility,
      })
      setDocCategories((prev) => [...prev, created])
      showToast('Kategori eklendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kategori eklenemedi, tekrar dene.', 'error')
    }
  }

  async function handleToggleCategoryVisibility(id, visibility) {
    try {
      await categoriesProvider.update(id, { visibility })
      setDocCategories((prev) => prev.map((c) => (c.id === id ? { ...c, visibility } : c)))
      showToast(
        visibility === 'yonetim' ? 'Klasör yönetime özel yapıldı.' : 'Klasör herkese açıldı.',
        'success',
      )
    } catch (err) {
      showToast(err.message ?? 'Görünürlük değiştirilemedi, tekrar dene.', 'error')
    }
  }

  async function handleRenameCategory(id, label) {
    try {
      await categoriesProvider.update(id, { label })
      setDocCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
      showToast('Kategori güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kategori güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleDeleteCategory(id) {
    try {
      await categoriesProvider.remove(id)
      setDocCategories((prev) => prev.filter((c) => c.id !== id))
      showToast('Kategori silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kategori silinemedi, tekrar dene.', 'error')
    }
  }

  async function handleMoveCategory(id, direction) {
    const list = docCategories ?? []
    const index = list.findIndex((c) => c.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= list.length) return
    const a = list[index]
    const b = list[swapIndex]
    const aOrder = a.sortOrder
    const bOrder = b.sortOrder
    try {
      await Promise.all([
        categoriesProvider.update(a.id, { sortOrder: bOrder }),
        categoriesProvider.update(b.id, { sortOrder: aOrder }),
      ])
      setDocCategories((prev) =>
        prev
          .map((c) => {
            if (c.id === a.id) return { ...c, sortOrder: bOrder }
            if (c.id === b.id) return { ...c, sortOrder: aOrder }
            return c
          })
          .sort((x, y) => x.sortOrder - y.sortOrder),
      )
    } catch (err) {
      showToast(err.message ?? 'Sıra değiştirilemedi, tekrar dene.', 'error')
    }
  }

  if (!canManage) {
    return <RestrictedAccess message="Ayarlar sadece broker ve owner rollerine açıktır." />
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-border-default">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'kullanicilar' && canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="mb-2 flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Kullanıcı Ekle
          </button>
        )}
      </div>

      {tab === 'kullanicilar' && (
        <>
          {loading && <LoadingState />}
          {!loading && error && <ErrorState error={error} onRetry={reload} />}
          {!loading && !error && (
            <UsersTable
              rows={allUsers ?? []}
              canManage={canManage}
              currentUserId={user?.id}
              onChangeRole={requestRoleChange}
              onToggleDurum={requestToggleDurum}
              onToggleTestHesabi={handleToggleTestHesabi}
              onEdit={setEditingUser}
              onDeleteRequest={setDeleteTarget}
              onResetPasswordRequest={setResetTarget}
              pendingWorkByUserId={pendingWorkByUserId ?? {}}
              onDevretRequest={handleDevretRequest}
            />
          )}
        </>
      )}

      {tab === 'kategori' && (
        <>
          {loadingCategories && <LoadingState />}
          {!loadingCategories && categoriesError && <ErrorState error={categoriesError} onRetry={reloadCategories} />}
          {!loadingCategories && !categoriesError && (
            <>
              <p className="mb-4 text-xs text-text-muted">
                Rehber sayfasındaki klasörler — ekle, yeniden adlandır, sil veya sırasını değiştir.
              </p>
              <CategoryManager
                categories={docCategories ?? []}
                onAdd={handleAddCategory}
                onRename={handleRenameCategory}
                onDelete={handleDeleteCategory}
                onMove={handleMoveCategory}
                onToggleVisibility={handleToggleCategoryVisibility}
              />
            </>
          )}
        </>
      )}

      {tab === 'yetki' && <PermissionMatrix />}

      {tab === 'log' && canViewLog && (
        <>
          <p className="mb-4 text-xs text-text-muted">
            Kullanıcı, fırsat ve skor değişiklikleri — en son 200 kayıt.
          </p>
          {loadingAudit && <LoadingState />}
          {!loadingAudit && auditError && <ErrorState error={auditError} onRetry={reloadAudit} />}
          {!loadingAudit && !auditError && <AuditLogTable rows={auditRows ?? []} resolveName={resolveName} />}
        </>
      )}

      {tab === 'webhook' && (
        <>
          <div>
            <p className="mb-1 text-sm font-semibold text-text-primary">Meta (Facebook/Instagram) Lead Ads</p>
            <p className="mb-4 text-xs text-text-muted">
              Webhook'un işleyemediği kayıtlar — son 100 hata. "Lead kaybolmuş olabilir" etiketli kayıtlar en
              öncelikli: Meta lead verisini sınırlı süre saklıyor, gecikmeden incelenmeli.
            </p>
            {loadingWebhookErrors && <LoadingState />}
            {!loadingWebhookErrors && webhookErrorsError && (
              <ErrorState error={webhookErrorsError} onRetry={reloadWebhookErrors} />
            )}
            {!loadingWebhookErrors && !webhookErrorsError && <WebhookErrorsTable rows={webhookErrorRows ?? []} />}
          </div>

          <div className="mt-8 border-t border-border-subtle pt-6">
            <p className="mb-1 text-sm font-semibold text-text-primary">Santral (Telsam)</p>
            <p className="mb-4 text-xs text-text-muted">
              Santral webhook'u ve dakikalık CDR senkronizasyonunun hataları — son 100 hata.
            </p>
            {loadingTelsamWebhookErrors && <LoadingState />}
            {!loadingTelsamWebhookErrors && telsamWebhookErrorsError && (
              <ErrorState error={telsamWebhookErrorsError} onRetry={reloadTelsamWebhookErrors} />
            )}
            {!loadingTelsamWebhookErrors && !telsamWebhookErrorsError && (
              <TelsamWebhookErrorsTable rows={telsamWebhookErrorRows ?? []} />
            )}
          </div>

          <div className="mt-8 border-t border-border-subtle pt-6">
            <p className="mb-1 text-sm font-semibold text-text-primary">Portal → Meta (durum bildirimi)</p>
            <p className="mb-4 text-xs text-text-muted">
              Fırsat/aday durumu değiştiğinde Meta'ya gönderilen geri bildirimin başarısız olduğu kayıtlar — son 100
              hata. Meta kaynaklı olmayan lead'ler için bir şey gönderilmediğinden burada görünmez, bu normaldir.
            </p>
            {loadingMetaCapiErrors && <LoadingState />}
            {!loadingMetaCapiErrors && metaCapiErrorsError && (
              <ErrorState error={metaCapiErrorsError} onRetry={reloadMetaCapiErrors} />
            )}
            {!loadingMetaCapiErrors && !metaCapiErrorsError && (
              <MetaCapiErrorsTable rows={metaCapiErrorRows ?? []} />
            )}
          </div>
        </>
      )}

      {tab === 'mentor-primi' && canViewMentor && (
        <>
          {loadingMentorPrimi && <LoadingState />}
          {!loadingMentorPrimi && mentorPrimiError && <ErrorState error={mentorPrimiError} onRetry={reloadMentorPrimi} />}
          {!loadingMentorPrimi && !mentorPrimiError && (
            <MentorPrimiPanel
              form={mentorPrimiForm}
              onFormChange={setMentorPrimiForm}
              rows={mentorPrimiData.rows}
              toplam={mentorPrimiData.toplam}
              onGoToUsers={() => setTab('kullanicilar')}
            />
          )}
        </>
      )}

      {tab === 'danisman-anlasmalari' && canManageAnlasmalar && (
        <>
          {loadingAnlasmalar && <LoadingState />}
          {!loadingAnlasmalar && anlasmalarError && <ErrorState error={anlasmalarError} onRetry={reloadAnlasmalar} />}
          {!loadingAnlasmalar && !anlasmalarError && (
            <DanismanAnlasmalariPanel
              danismanlar={(allUsers ?? []).filter((u) => u.role === 'danisman' && u.durum === 'aktif')}
              anlasmalar={danismanAnlasmalariList ?? []}
              onCreate={handleCreateAnlasma}
              submitting={savingAnlasma}
            />
          )}
        </>
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
          submitting={submitting}
          canSetMentorPrimi={canViewMentor}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          privateInfo={(privateInfoList ?? []).find((p) => p.userId === editingUser.id)}
          mentorBaslangicTarihi={(mentorPrimiBaslangicList ?? []).find((b) => b.userId === editingUser.id)?.baslangicTarihi}
          canSetMentorPrimi={canViewMentor}
          onClose={() => setEditingUser(null)}
          onSubmit={handleEditUser}
          submitting={submitting}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSubmit={handleResetPassword}
          submitting={resetting}
        />
      )}

      {roleChangeTarget && (
        <ConfirmDialog
          title="Rolü değiştir"
          message={`${roleChangeTarget.name}: ${ROLE_LABELS[roleChangeTarget.fromRole] ?? roleChangeTarget.fromRole} → ${ROLE_LABELS[roleChangeTarget.toRole] ?? roleChangeTarget.toRole} olarak değiştirilecek. Emin misin?`}
          confirmLabel="Rolü Değiştir"
          onConfirm={handleChangeRole}
          onCancel={() => setRoleChangeTarget(null)}
          confirming={changingRole}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Kullanıcıyı sil"
          message={`${deleteTarget.name} kalıcı olarak silinecek — hesabı, TC no/doğum tarihi kaydı VE bu kullanıcıya bağlı tüm geçmiş (ciro müşterileri, katılım kayıtları, skor girişleri) birlikte silinir. Bu işlem geri alınamaz. Ayrılan bir danışman için "Pasif" yapmak daha güvenli bir alternatif.`}
          confirmLabel="Kalıcı Olarak Sil"
          tone="danger"
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
          confirming={deleting}
        />
      )}

      {devretTarget && (
        <DevretModal
          targetName={devretTarget.name}
          pendingCallCount={devretTarget.pendingCallCount}
          pendingOpportunityCount={devretTarget.pendingOpportunityCount}
          candidates={(allUsers ?? []).filter(
            (u) => u.id !== devretTarget.id && u.role === 'danisman' && u.durum === 'aktif',
          )}
          onSubmit={handleDevretAndDeactivate}
          onCancel={() => setDevretTarget(null)}
          submitting={devretting}
          alreadyPasif={devretTarget.alreadyPasif}
        />
      )}
    </div>
  )
}
