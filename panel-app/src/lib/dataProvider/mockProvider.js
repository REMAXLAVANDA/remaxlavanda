// Mock veri sağlayıcı — SADECE development'ta kullanılır (bkz. lib/env.js,
// production build'de bu dosya hiç çağrılmaz). Arayüz supabaseProvider.js
// ile birebir aynı: her fonksiyon aynı isim/parametre/dönüş şeklini taşır,
// böylece sayfalar hangi provider'ın aktif olduğunu bilmek zorunda kalmaz.

import { MOCK_OPPORTUNITIES } from '../../data/mockOpportunities'
import { MOCK_EVENTS, MOCK_ATTENDANCE } from '../../data/mockCalendarEvents'
import {
  MOCK_MODULES,
  MOCK_PROGRESS,
  MOCK_BADGES,
  MOCK_USER_BADGES,
  MOCK_CHECKLIST_ITEMS,
  MOCK_CHECKLIST_STATUS,
} from '../../data/mockEducation'
import { MOCK_CALLS } from '../../data/mockCallLogs'
import { MOCK_DOCS, MOCK_DOC_VERSIONS } from '../../data/mockDocs'
import { MOCK_CATEGORIES } from '../../data/mockCategories'
import { MOCK_PORTAL_USAGE, MOCK_CUSTOMER_REVIEW, MOCK_BROKER_NOTES } from '../../data/mockTakip'
import {
  MOCK_PERIODS,
  MOCK_SCORES,
  MOCK_REVIEW_CREDITS,
  MOCK_ACTIVITY_TYPES,
  MOCK_ACTIVITY_LOG,
} from '../../data/mockLeague'
import { MOCK_USERS } from '../../context/AuthContext'
import { OTHER_USERS } from '../../data/mockOpportunities'
import { canRevealContact } from '../opportunities'

const LATENCY_MS = 250
const delay = (value, ms = LATENCY_MS) => new Promise((resolve) => setTimeout(() => resolve(value), ms))

// opportunity_interest tablosunun mock karşılığı — {opportunityId, userId, createdAt}
const MOCK_OPPORTUNITY_INTEREST = []

// --- Opportunities (Fırsatlar) ----------------------------------------------
export const opportunities = {
  // supabaseProvider.opportunities.list() lead_ad/lead_telefon'u SEÇMİYOR
  // (network seviyesinde gizlilik). Mock'ta da aynı şekli vermezsek, sadece
  // mock modda çalışan ama üretimde undefined dönecek bir "o.leadAd" okuması
  // fark edilmeden yazılabilir. Bu yüzden burada da bilinçli olarak siliniyor
  // — gerçek isim/telefon SADECE getContact() üzerinden (izin kontrolüyle)
  // döner.
  async list() {
    return delay(MOCK_OPPORTUNITIES.map(({ leadAd: _leadAd, leadTelefon: _leadTelefon, ...rest }) => ({ ...rest })))
  },
  async create(payload, ownerId, selfClaim = false) {
    const row = {
      id: `opp-${Date.now()}`,
      ...payload,
      status: selfClaim ? 'claimed' : 'acik',
      ownerId,
      claimerId: selfClaim ? ownerId : null,
      claimedAt: selfClaim ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    }
    MOCK_OPPORTUNITIES.unshift(row)
    // supabaseProvider.create() da insert sonucunu mapOpportunity() ile
    // döndürür — leadAd/leadTelefon orada da dönmez (bkz. list() notu).
    // Kayıt sahibi kendi girdiği bilgiyi zaten formda görmüştü; liste
    // state'inde tutmuyoruz ki iki sağlayıcı arasında şekil farkı olmasın.
    const { leadAd: _leadAd, leadTelefon: _leadTelefon, ...publicRow } = row
    return delay(publicRow)
  },
  // supabaseProvider.update() ile birebir aynı davranış: sadece "detay"
  // alanları düzeltilebilir, type/category değişmez.
  async update(id, patch) {
    const row = MOCK_OPPORTUNITIES.find((o) => o.id === id)
    if (!row) throw new Error('Fırsat bulunamadı.')
    Object.assign(row, patch)
    const { leadAd: _leadAd, leadTelefon: _leadTelefon, ...publicRow } = row
    return delay(publicRow)
  },
  // "İlgileniyorum" artık exclusive claim değil — müşteri bilgisini AÇMAZ,
  // sadece kim ilgilendiğini kaydeder (fırsatı giren kişi bunu görüp arar).
  async expressInterest(opportunityId, userId) {
    const exists = MOCK_OPPORTUNITY_INTEREST.some(
      (r) => r.opportunityId === opportunityId && r.userId === userId,
    )
    if (exists) throw new Error('Bu fırsata zaten ilgi göstermiştin.')
    MOCK_OPPORTUNITY_INTEREST.push({ opportunityId, userId, createdAt: new Date().toISOString() })
    return delay(null)
  },
  async withdrawInterest(opportunityId, userId) {
    const idx = MOCK_OPPORTUNITY_INTEREST.findIndex(
      (r) => r.opportunityId === opportunityId && r.userId === userId,
    )
    if (idx !== -1) MOCK_OPPORTUNITY_INTEREST.splice(idx, 1)
    return delay(null)
  },
  async listInterest(opportunityId) {
    return delay(
      MOCK_OPPORTUNITY_INTEREST.filter((r) => r.opportunityId === opportunityId).map((r) => ({
        userId: r.userId,
        createdAt: r.createdAt,
      })),
    )
  },
  // supabaseProvider.opportunities.getContact() ile birebir aynı davranış:
  // izinli değilse leadAd/leadTelefon null döner — mock modunda da UI'ın
  // "gerçek network sınırı varmış gibi" test edilebilmesi için.
  async getContact(id, user) {
    const row = MOCK_OPPORTUNITIES.find((o) => o.id === id)
    if (!row) return delay({ leadAd: null, leadTelefon: null })
    if (canRevealContact(row, user)) {
      return delay({ leadAd: row.leadAd, leadTelefon: row.leadTelefon })
    }
    return delay({ leadAd: null, leadTelefon: null })
  },
  // supabaseProvider.opportunities.remove()'daki call_logs.opportunity_id
  // FK kısıtını mock'ta da taklit ediyoruz — bağlı bir çağrı kaydı varsa
  // gerçek Postgres 23503 hatasıyla aynı 'in_use' mesajını fırlatır.
  async remove(id) {
    const inUse = MOCK_CALLS.some((c) => c.opportunityId === id)
    if (inUse) throw new Error('Bu kayıt hâlâ kullanımda olduğu için silinemedi — önce bağlı kayıtları taşı veya sil.')
    const idx = MOCK_OPPORTUNITIES.findIndex((o) => o.id === id)
    if (idx !== -1) MOCK_OPPORTUNITIES.splice(idx, 1)
    for (let i = MOCK_OPPORTUNITY_INTEREST.length - 1; i >= 0; i--) {
      if (MOCK_OPPORTUNITY_INTEREST[i].opportunityId === id) MOCK_OPPORTUNITY_INTEREST.splice(i, 1)
    }
    return delay(null)
  },
}

// --- Calendar events + attendance (Takvim) ----------------------------------
export const calendarEvents = {
  async list() {
    return delay([...MOCK_EVENTS])
  },
  async listAttendance() {
    return delay([...MOCK_ATTENDANCE])
  },
  async create(form, creatorId) {
    const startAt = new Date(`${form.date}T${form.startTime}`).toISOString()
    const endAt = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null
    const row = {
      id: `ev-${Date.now()}`,
      type: form.type,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      startAt,
      endAt,
      creatorId,
    }
    MOCK_EVENTS.push(row)
    if (form.inviteeIds?.length) {
      for (const userId of form.inviteeIds) {
        MOCK_ATTENDANCE.push({ eventId: row.id, userId, status: 'davetli' })
      }
    }
    return delay(row)
  },
  async updateAttendance(eventId, userId, status) {
    const row = MOCK_ATTENDANCE.find((a) => a.eventId === eventId && a.userId === userId)
    if (!row) throw new Error('Katılım kaydı bulunamadı.')
    row.status = status
    row.respondedAt = new Date().toISOString()
    // supabaseProvider.mapAttendance() sadece {eventId,userId,status} döner —
    // aynı şekli koruyoruz ki iki sağlayıcı arasında fark olmasın.
    return delay({ eventId: row.eventId, userId: row.userId, status: row.status })
  },
  async update(id, patch) {
    const row = MOCK_EVENTS.find((e) => e.id === id)
    if (!row) throw new Error('Etkinlik bulunamadı.')
    if ('type' in patch) row.type = patch.type
    if ('title' in patch) row.title = patch.title
    if ('description' in patch) row.description = patch.description || null
    if ('location' in patch) row.location = patch.location || null
    if ('date' in patch || 'startTime' in patch) row.startAt = new Date(`${patch.date}T${patch.startTime}`).toISOString()
    if ('date' in patch || 'endTime' in patch) {
      row.endAt = patch.endTime ? new Date(`${patch.date}T${patch.endTime}`).toISOString() : null
    }
    return delay({ ...row })
  },
  async remove(id) {
    const idx = MOCK_EVENTS.findIndex((e) => e.id === id)
    if (idx !== -1) MOCK_EVENTS.splice(idx, 1)
    for (let i = MOCK_ATTENDANCE.length - 1; i >= 0; i--) {
      if (MOCK_ATTENDANCE[i].eventId === id) MOCK_ATTENDANCE.splice(i, 1)
    }
    return delay(null)
  },
}

// --- Education (Eğitim) ------------------------------------------------------
export const education = {
  async listModules() {
    return delay([...MOCK_MODULES])
  },
  async listProgress() {
    return delay([...MOCK_PROGRESS])
  },
  async listBadges() {
    return delay([...MOCK_BADGES])
  },
  async listUserBadges() {
    return delay([...MOCK_USER_BADGES])
  },
  async listChecklistItems() {
    return delay([...MOCK_CHECKLIST_ITEMS])
  },
  async listChecklistStatus() {
    return delay([...MOCK_CHECKLIST_STATUS])
  },
  async toggleModuleProgress(moduleId, userId, done) {
    const idx = MOCK_PROGRESS.findIndex((p) => p.moduleId === moduleId && p.userId === userId)
    if (done && idx === -1) {
      MOCK_PROGRESS.push({ moduleId, userId, doneAt: new Date().toISOString() })
    } else if (!done && idx !== -1) {
      MOCK_PROGRESS.splice(idx, 1)
    }
    return delay({ moduleId, userId, done })
  },
  async toggleChecklistItem(itemId, userId, done, doneBy) {
    const idx = MOCK_CHECKLIST_STATUS.findIndex((s) => s.itemId === itemId && s.userId === userId)
    if (done && idx === -1) {
      MOCK_CHECKLIST_STATUS.push({ itemId, userId, doneAt: new Date().toISOString(), doneBy })
    } else if (!done && idx !== -1) {
      MOCK_CHECKLIST_STATUS.splice(idx, 1)
    }
    return delay({ itemId, userId, done })
  },
  async awardBadge(userId, badgeId) {
    const row = { userId, badgeId, earnedAt: new Date().toISOString() }
    MOCK_USER_BADGES.push(row)
    return delay(row)
  },
  async createChecklistItem({ tip, baslik, sortOrder }) {
    const item = { id: `chk-${Date.now()}`, tip, baslik, sortOrder }
    MOCK_CHECKLIST_ITEMS.push(item)
    return delay({ ...item })
  },
  async updateChecklistItemOrder(itemId, sortOrder) {
    const item = MOCK_CHECKLIST_ITEMS.find((i) => i.id === itemId)
    if (item) item.sortOrder = sortOrder
    return delay({ itemId, sortOrder })
  },
}

// --- Call logs (Operasyon) ---------------------------------------------------
export const callLogs = {
  async list() {
    return delay([...MOCK_CALLS])
  },
  async create(form) {
    const row = {
      id: `call-${Date.now()}`,
      kaynak: form.kaynak,
      arayanAd: form.arayanAd,
      arayanTelefon: form.arayanTelefon || null,
      assignedTo: form.assignedTo || null,
      sonuc: null,
      portfoyAlindiMi: false,
      donusYapildiMi: false,
      donusAt: null,
      opportunityId: null,
      createdAt: new Date().toISOString(),
    }
    MOCK_CALLS.unshift(row)
    return delay(row)
  },
  async update(id, patch) {
    const row = MOCK_CALLS.find((c) => c.id === id)
    if (!row) throw new Error('Çağrı kaydı bulunamadı.')
    Object.assign(row, patch)
    return delay({ ...row })
  },
}

// --- Categories (Rehber klasörleri) --------------------------------------
export const categories = {
  async list(module) {
    return delay(
      MOCK_CATEGORIES.filter((c) => c.module === module).sort((a, b) => a.sortOrder - b.sortOrder),
    )
  },
  async create({ module, key, label, sortOrder }) {
    const row = { id: `cat-${Date.now()}`, module, key, label, sortOrder, isActive: true }
    MOCK_CATEGORIES.push(row)
    return delay({ ...row })
  },
  async update(id, patch) {
    const row = MOCK_CATEGORIES.find((c) => c.id === id)
    if (!row) throw new Error('Kategori bulunamadı.')
    Object.assign(row, patch)
    return delay({ ...row })
  },
  async remove(id) {
    const inUse = MOCK_DOCS.some((d) => {
      const cat = MOCK_CATEGORIES.find((c) => c.id === id)
      return cat && d.categoryKey === cat.key
    })
    if (inUse) throw new Error('Bu kayıt hâlâ kullanımda olduğu için silinemedi — önce bağlı kayıtları taşı veya sil.')
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id)
    if (idx !== -1) MOCK_CATEGORIES.splice(idx, 1)
    return delay(null)
  },
}

// --- Docs (Rehber) ------------------------------------------------------------
export const docs = {
  async listDocs() {
    return delay([...MOCK_DOCS])
  },
  async listVersions() {
    return delay([...MOCK_DOC_VERSIONS])
  },
  async createDoc({ categoryKey, baslik }, userId) {
    const row = { id: `doc-${Date.now()}`, categoryKey, baslik, contentText: null, createdBy: userId }
    MOCK_DOCS.push(row)
    return delay({ ...row })
  },
  async addVersion({ docId, filename, storagePath }, userId) {
    const existing = MOCK_DOC_VERSIONS.filter((v) => v.docId === docId)
    for (const v of existing) v.isCurrent = false
    const versionNo = existing.length === 0 ? 1 : Math.max(...existing.map((v) => v.versionNo)) + 1
    const versionRow = {
      id: `v-${Date.now()}`,
      docId,
      versionNo,
      filename,
      url: storagePath,
      isCurrent: true,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    }
    MOCK_DOC_VERSIONS.push(versionRow)
    return delay(versionRow)
  },
  async update(docId, patch) {
    const row = MOCK_DOCS.find((d) => d.id === docId)
    if (!row) throw new Error('Doküman bulunamadı.')
    if (patch.baslik !== undefined) row.baslik = patch.baslik
    if (patch.contentText !== undefined) row.contentText = patch.contentText
    return delay(null)
  },
  async remove(docId) {
    const idx = MOCK_DOCS.findIndex((d) => d.id === docId)
    if (idx !== -1) MOCK_DOCS.splice(idx, 1)
    for (let i = MOCK_DOC_VERSIONS.length - 1; i >= 0; i--) {
      if (MOCK_DOC_VERSIONS[i].docId === docId) MOCK_DOC_VERSIONS.splice(i, 1)
    }
    return delay(null)
  },
}

// --- Takip (360° sağlık skoru) -----------------------------------------------
// portal_usage / customer_review şemada henüz bir tabloya karşılık gelmiyor
// (bkz. supabaseProvider.js aynı bölümdeki not) — ikisi de burada sabit mock
// değer olarak tutuluyor; broker_notes de aynı sebeple henüz mock.
export const takip = {
  async listUsage() {
    return delay({ ...MOCK_PORTAL_USAGE })
  },
  async listReviews() {
    return delay({ ...MOCK_CUSTOMER_REVIEW })
  },
  async listBrokerNotes() {
    return delay({ ...MOCK_BROKER_NOTES })
  },
}

// --- League (Lig) --------------------------------------------------------------
export const league = {
  async getPeriod() {
    return delay({ ...MOCK_PERIODS[MOCK_PERIODS.length - 1] })
  },
  async listPeriods() {
    return delay([...MOCK_PERIODS].sort((a, b) => new Date(b.baslangic) - new Date(a.baslangic)))
  },
  async createPeriod({ ad, baslangic, bitis }) {
    const period = { id: `period-${Date.now()}`, ad, baslangic, bitis }
    MOCK_PERIODS.push(period)
    return delay({ ...period })
  },
  async listScores() {
    return delay([...MOCK_SCORES])
  },
  async addScore({ userId, type, value, tarih }) {
    const numValue = Number(value)
    const period = MOCK_PERIODS.find((p) => p.baslangic <= tarih && p.bitis >= tarih)
    if (!period) throw new Error('Bu tarihi kapsayan bir dönem yok — önce dönemi oluşturman gerekiyor.')
    const existing = MOCK_SCORES.find((s) => s.userId === userId && s.type === type && s.periodId === period.id)
    const now = new Date().toISOString()
    if (existing) {
      existing.value = numValue
      existing.updatedAt = now
    } else {
      MOCK_SCORES.push({ userId, periodId: period.id, type, value: numValue, updatedAt: now })
    }
    if (type === 'ciro') {
      const credit = MOCK_REVIEW_CREDITS.find((r) => r.userId === userId && r.periodId === period.id)
      if (credit) credit.hakSayisi += 2
      else MOCK_REVIEW_CREDITS.push({ userId, periodId: period.id, hakSayisi: 2, alinanSayisi: 0 })
    }
    return delay({ userId, periodId: period.id, type, value: numValue })
  },
  async listReviewCredits() {
    return delay([...MOCK_REVIEW_CREDITS])
  },
  async setReceivedReviews(userId, periodId, alinanSayisi) {
    const credit = MOCK_REVIEW_CREDITS.find((r) => r.userId === userId && r.periodId === periodId)
    if (credit) credit.alinanSayisi = alinanSayisi
    else MOCK_REVIEW_CREDITS.push({ userId, periodId, hakSayisi: 0, alinanSayisi })
    return delay({ userId, periodId, alinanSayisi })
  },
  async listActivityTypes() {
    return delay([...MOCK_ACTIVITY_TYPES].sort((a, b) => a.sortOrder - b.sortOrder))
  },
  async updateActivityTypePoint(id, puan) {
    const type = MOCK_ACTIVITY_TYPES.find((t) => t.id === id)
    if (type) type.puan = Number(puan)
    return delay({ id, puan: Number(puan) })
  },
  async logSocialActivity({ userId, activityTypeId, adet, tarih }) {
    const period = MOCK_PERIODS.find((p) => p.baslangic <= tarih && p.bitis >= tarih)
    if (!period) throw new Error('Bu tarihi kapsayan bir dönem yok — önce dönemi oluşturman gerekiyor.')
    MOCK_ACTIVITY_LOG.push({ userId, periodId: period.id, activityTypeId, adet: Number(adet) })

    const total = MOCK_ACTIVITY_LOG.filter((l) => l.userId === userId && l.periodId === period.id).reduce(
      (sum, l) => sum + l.adet * (MOCK_ACTIVITY_TYPES.find((t) => t.id === l.activityTypeId)?.puan ?? 0),
      0,
    )
    const existingScore = MOCK_SCORES.find(
      (s) => s.userId === userId && s.periodId === period.id && s.type === 'sosyal_medya',
    )
    const now = new Date().toISOString()
    if (existingScore) {
      existingScore.value = total
      existingScore.updatedAt = now
    } else {
      MOCK_SCORES.push({ userId, periodId: period.id, type: 'sosyal_medya', value: total, updatedAt: now })
    }
    return delay({ userId, periodId: period.id, total })
  },
}

// --- Users -------------------------------------------------------------------
// Ayarlar > Kullanıcılar'dan mock modda eklenen/düzenlenen kullanıcılar —
// MOCK_USERS/OTHER_USERS sabit dev hesapları olduğu için ayrı tutuluyor.
const MOCK_EXTRA_USERS = []

function allMockUserRows() {
  return [
    ...Object.values(MOCK_USERS).map((u) => ({ id: u.id, name: u.name, email: `${u.id}@lavanda.dev`, role: u.role, durum: u.durum ?? 'aktif' })),
    ...Object.values(OTHER_USERS).map((u) => ({ id: u.id, name: u.name, email: `${u.id}@lavanda.dev`, role: u.role ?? 'danisman', durum: u.durum ?? 'aktif' })),
    ...MOCK_EXTRA_USERS,
  ]
}

// list_user_activity() RPC'sinin mock karşılığı — gerçek auth.users.
// last_sign_in_at'a denk düşer. ext-danisman-3 kasıtlı olarak hiç giriş
// yapmamış (null) — "hiç giriş yapmadı" durumunu test etmek için.
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString()
const MOCK_USER_ACTIVITY = {
  'u-broker': hoursAgo(1),
  'u-owner': hoursAgo(5),
  'u-ofis': hoursAgo(2),
  'u-danisman': hoursAgo(30),
  'ext-danisman-2': hoursAgo(0.5),
  'ext-danisman-3': null,
}

export const users = {
  // supabaseProvider.users.listKnown() sadece durum='aktif' kullanıcıları
  // döner — mock tarafında da aynı davranışı simüle ediyoruz (MOCK_USERS +
  // OTHER_USERS zaten hepsi "aktif" varsayılan mock kullanıcılar).
  async listKnown() {
    const map = {}
    for (const u of allMockUserRows()) {
      if (u.durum === 'aktif') map[u.id] = { id: u.id, name: u.name, role: u.role }
    }
    return delay(map)
  },
  async listAll() {
    return delay(allMockUserRows())
  },
  async updateUser(id, patch) {
    const target =
      Object.values(MOCK_USERS).find((u) => u.id === id) ??
      Object.values(OTHER_USERS).find((u) => u.id === id) ??
      MOCK_EXTRA_USERS.find((u) => u.id === id)
    if (target) {
      if ('name' in patch) target.name = patch.name
      if ('role' in patch) target.role = patch.role
      if ('durum' in patch) target.durum = patch.durum
    }
    return delay({ id, ...patch })
  },
  async createUser({ ad, email, password: _password, rol }) {
    const created = { id: `mock-user-${Date.now()}`, name: ad, email, role: rol, durum: 'aktif' }
    MOCK_EXTRA_USERS.push(created)
    return delay({ ...created })
  },
  async listActivity() {
    return delay(
      allMockUserRows()
        .filter((u) => u.durum === 'aktif')
        .map((u) => ({ userId: u.id, lastSignInAt: MOCK_USER_ACTIVITY[u.id] ?? null })),
    )
  },
}
