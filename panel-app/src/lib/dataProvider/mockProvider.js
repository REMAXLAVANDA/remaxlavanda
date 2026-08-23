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
import { MOCK_LEADS } from '../../data/mockLeads'
import { MOCK_RECRUITING_CANDIDATES } from '../../data/mockRecruiting'
import { MOCK_TASKS } from '../../data/mockTasks'
import { MOCK_DOCS, MOCK_DOC_VERSIONS } from '../../data/mockDocs'
import { MOCK_CATEGORIES } from '../../data/mockCategories'
import { MOCK_BROKER_NOTES } from '../../data/mockTakip'
import {
  MOCK_PERIODS,
  MOCK_SCORES,
  MOCK_ACTIVITY_TYPES,
  MOCK_ACTIVITY_LOG,
  MOCK_CIRO_MUSTERILERI,
  MOCK_CIRO_GIRISLERI,
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
    return delay(
      MOCK_OPPORTUNITIES.map(({ leadAd: _leadAd, leadTelefon: _leadTelefon, ...rest }) => ({
        ...rest,
        islemTipi: rest.islemTipi ?? 'satilik',
      })),
    )
  },
  async create(payload, ownerId, selfClaim = false) {
    const row = {
      id: `opp-${Date.now()}`,
      ...payload,
      islemTipi: payload.islemTipi || 'satilik',
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
  // supabaseProvider.update() ile birebir aynı davranış: type/category
  // dahil her alan düzenlenebilir (bkz. o dosyadaki not) — Object.assign
  // zaten generic, ayrıca bir şey yapmaya gerek yok.
  async update(id, patch) {
    const row = MOCK_OPPORTUNITIES.find((o) => o.id === id)
    if (!row) throw new Error('Fırsat bulunamadı.')
    Object.assign(row, patch)
    const { leadAd: _leadAd, leadTelefon: _leadTelefon, ...publicRow } = row
    return delay(publicRow)
  },
  // supabaseProvider.close() ile birebir aynı davranış — yetki kontrolü
  // (canCloseOpportunity) UI tarafında zaten yapıldığı için burada tekrar
  // edilmiyor (update() ile aynı yaklaşım, bkz. yukarısı).
  async close(id, status) {
    const row = MOCK_OPPORTUNITIES.find((o) => o.id === id)
    if (!row) throw new Error('Fırsat bulunamadı.')
    if (row.status === 'kapandi' || row.status === 'iptal') throw new Error('Bu fırsat zaten kapatılmış.')
    row.status = status
    row.closedAt = new Date().toISOString()
    row.closedBy = 'mock-current-user'
    return delay({ id: row.id, status: row.status, closedAt: row.closedAt, closedBy: row.closedBy })
  },
  // supabaseProvider.assignTo() ile birebir aynı davranış — yetki kontrolü
  // (isManager) UI tarafında zaten yapıldığı için burada tekrar edilmiyor.
  async assignTo(id, userId) {
    const row = MOCK_OPPORTUNITIES.find((o) => o.id === id)
    if (!row) throw new Error('Fırsat bulunamadı.')
    if (row.claimerId || row.status !== 'acik') throw new Error('Bu fırsat artık uygun değil (zaten alınmış olabilir).')
    row.claimerId = userId
    row.claimedAt = new Date().toISOString()
    row.status = 'claimed'
    return delay({ id: row.id, status: row.status, claimerId: row.claimerId, claimedAt: row.claimedAt })
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
    // Owner'a broker'ın fiilen üstlendiği fırsatı gizleme kuralı burada da
    // (gerçek güvenlik sınırında) uygulanıyor — bkz. lib/opportunities.js notu.
    const resolveHolderRole = (holderId) => allMockUserRows().find((u) => u.id === holderId)?.role
    if (canRevealContact(row, user, resolveHolderRole)) {
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
    return delay(MOCK_ATTENDANCE.map((a) => ({ ...a, katilimTipi: a.katilimTipi ?? 'zorunlu' })))
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
      gorunurluk: form.gorunurluk ?? 'davetliler',
    }
    MOCK_EVENTS.push(row)
    // form.katilimTipleri: { [userId]: 'zorunlu'|'onerilen'|'istege_bagli' }
    for (const [userId, katilimTipi] of Object.entries(form.katilimTipleri ?? {})) {
      MOCK_ATTENDANCE.push({ eventId: row.id, userId, status: 'davetli', katilimTipi })
    }
    return delay(row)
  },
  async updateAttendance(eventId, userId, status, { mazeretText } = {}) {
    const row = MOCK_ATTENDANCE.find((a) => a.eventId === eventId && a.userId === userId)
    if (!row) throw new Error('Katılım kaydı bulunamadı.')
    row.status = status
    row.respondedAt = new Date().toISOString()
    if (status === 'mazeretli') {
      row.mazeretText = mazeretText
      row.mazeretStatus = 'bekliyor'
    }
    // supabaseProvider.mapAttendance() ile aynı şekli koruyoruz ki iki
    // sağlayıcı arasında fark olmasın.
    return delay({
      eventId: row.eventId,
      userId: row.userId,
      status: row.status,
      katilimTipi: row.katilimTipi ?? 'zorunlu',
      mazeretText: row.mazeretText ?? null,
      mazeretStatus: row.mazeretStatus ?? null,
      mazeretReviewedBy: row.mazeretReviewedBy ?? null,
      mazeretReviewedAt: row.mazeretReviewedAt ?? null,
    })
  },
  async resolveMazeret(eventId, userId, decision, reviewerId) {
    const row = MOCK_ATTENDANCE.find((a) => a.eventId === eventId && a.userId === userId)
    if (!row) throw new Error('Katılım kaydı bulunamadı.')
    row.mazeretStatus = decision
    row.mazeretReviewedBy = reviewerId
    row.mazeretReviewedAt = new Date().toISOString()
    return delay({
      eventId: row.eventId,
      userId: row.userId,
      status: row.status,
      katilimTipi: row.katilimTipi ?? 'zorunlu',
      mazeretText: row.mazeretText ?? null,
      mazeretStatus: row.mazeretStatus ?? null,
      mazeretReviewedBy: row.mazeretReviewedBy ?? null,
      mazeretReviewedAt: row.mazeretReviewedAt ?? null,
    })
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
    if ('gorunurluk' in patch) row.gorunurluk = patch.gorunurluk
    return delay({ ...row })
  },
  // Daha önce davetsiz kurulmuş bir etkinliğe (ör. "otomatik görünür" diye
  // davet edilmemiş zorunlu toplantı/eğitim) yönetim sonradan davetli
  // ekleyebilsin diye — create()'teki davetli ekleme mantığıyla aynı, sadece
  // mevcut bir etkinliğe uygulanıyor (bkz. Düzenle ekranı "Davetli Ekle").
  async addInvitees(eventId, katilimTipleri) {
    const rows = Object.entries(katilimTipleri ?? {}).map(([userId, katilimTipi]) => ({
      eventId,
      userId,
      status: 'davetli',
      katilimTipi,
    }))
    MOCK_ATTENDANCE.push(...rows)
    return delay(rows.map((r) => ({ ...r })))
  },
  // supabaseProvider.findBirthdayEvent() ile aynı davranış — bkz. o
  // dosyadaki not.
  async findBirthdayEvent(userId) {
    const attendance = MOCK_ATTENDANCE.find((a) => {
      if (a.userId !== userId) return false
      const event = MOCK_EVENTS.find((e) => e.id === a.eventId)
      return event && event.type === 'etkinlik' && event.title?.startsWith('🎂 ')
    })
    return delay(attendance?.eventId ?? null)
  },
  // supabaseProvider.joinEvent() ile aynı davranış — "herkese açık" bir
  // etkinliğe davet edilmemiş biri kendi kendine, sadece istege_bagli +
  // onayladi olarak katılabilir.
  async joinEvent(eventId, userId) {
    const row = { eventId, userId, status: 'onayladi', katilimTipi: 'istege_bagli', mazeretText: null, mazeretStatus: null }
    MOCK_ATTENDANCE.push(row)
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
      notlar: form.notlar || null,
      reklamKodu: form.reklamKodu || null,
      kaynakLeadId: form.kaynakLeadId ?? null,
      sonuc: null,
      portfoyAlindiMi: null,
      portfoyTalebiMi: form.portfoyTalebiMi ?? false,
      portfoyNo: form.portfoyNo || null,
      satildiMi: false,
      satisTarihi: null,
      donusYapildiMi: null,
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
  async remove(id) {
    const idx = MOCK_CALLS.findIndex((c) => c.id === id)
    if (idx !== -1) MOCK_CALLS.splice(idx, 1)
    return delay(null)
  },
}

// --- Leads (Lead Havuzu) ------------------------------------------------------
export const leads = {
  async list() {
    return delay([...MOCK_LEADS].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  },
  async create(form) {
    const row = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      tip: form.tip,
      kaynak: form.kaynak,
      adSoyad: form.adSoyad,
      telefon: form.telefon || null,
      email: form.email || null,
      atananDanismanId: form.atananDanismanId || null,
      durum: form.durum,
      ilkTemasAt: null,
      sonucAt: null,
      kayipNedeni: null,
      aciklama: form.aciklama || null,
      metaLeadId: null,
      kampanyaKodu: form.kampanyaKodu || null,
      reklamAdi: form.reklamAdi || null,
      metaAdId: null,
    }
    MOCK_LEADS.unshift(row)
    return delay(row)
  },
  async update(id, patch) {
    const row = MOCK_LEADS.find((l) => l.id === id)
    if (!row) throw new Error('Lead bulunamadı.')
    Object.assign(row, patch)
    return delay({ ...row })
  },
}

// --- Recruiting (Aday takibi) --------------------------------------------------
export const recruiting = {
  async list() {
    return delay([...MOCK_RECRUITING_CANDIDATES].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  },
  async create(form) {
    // supabaseProvider.create() ile aynı: hangi reklamdan geldiği
    // kaynak lead'den kopyalanır (bkz. o dosyadaki not).
    const sourceLead = form.kaynakLeadId ? MOCK_LEADS.find((l) => l.id === form.kaynakLeadId) : null
    const row = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      kaynakLeadId: form.kaynakLeadId ?? null,
      kaynak: form.kaynak,
      adSoyad: form.adSoyad,
      telefon: form.telefon || null,
      email: form.email || null,
      atananDanismanId: form.atananDanismanId || null,
      durum: form.durum,
      kayitTipi: form.kaynakLeadId ? 'lead' : 'manuel',
      yenidenAktifAt: null,
      aciklama: form.aciklama || null,
      reklamAdi: sourceLead?.reklamAdi ?? null,
      kampanyaKodu: sourceLead?.kampanyaKodu ?? null,
    }
    MOCK_RECRUITING_CANDIDATES.unshift(row)
    return delay(row)
  },
  async update(id, patch) {
    const row = MOCK_RECRUITING_CANDIDATES.find((c) => c.id === id)
    if (!row) throw new Error('Aday bulunamadı.')
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
    return delay([...MOCK_DOCS].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
  },
  async listVersions() {
    return delay([...MOCK_DOC_VERSIONS])
  },
  async createDoc({ categoryKey, baslik, sortOrder }, userId) {
    const row = { id: `doc-${Date.now()}`, categoryKey, baslik, contentText: null, createdBy: userId, sortOrder: sortOrder ?? 0 }
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
    if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder
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
// Portal kullanımı ve müşteri memnuniyeti artık gerçek verilerden hesaplanıyor
// (bkz. lib/takip.js) — users.listActivity() ve league.listCiroMusterileri()
// üzerinden. broker_notes şemada henüz bir tabloya karşılık gelmiyor, sabit
// mock değer olarak kalıyor.
export const takip = {
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
    const now = new Date().toISOString()

    // Ciro kümülatiftir: her giriş bir satıştır, dönem toplamı
    // ciro_girisleri'ndeki tüm satışların toplamıdır.
    if (type === 'ciro') {
      MOCK_CIRO_GIRISLERI.unshift({
        id: `ciro-giris-${Date.now()}`,
        userId,
        periodId: period.id,
        value: numValue,
        tarih,
        createdAt: now,
      })
      const total = MOCK_CIRO_GIRISLERI.filter((g) => g.userId === userId && g.periodId === period.id).reduce(
        (sum, g) => sum + Number(g.value),
        0,
      )
      const existingScore = MOCK_SCORES.find((s) => s.userId === userId && s.type === 'ciro' && s.periodId === period.id)
      if (existingScore) {
        existingScore.value = total
        existingScore.updatedAt = now
      } else {
        MOCK_SCORES.push({ userId, periodId: period.id, type: 'ciro', value: total, updatedAt: now })
      }
      return delay({ userId, periodId: period.id, type, value: total })
    }

    const existing = MOCK_SCORES.find((s) => s.userId === userId && s.type === type && s.periodId === period.id)
    if (existing) {
      existing.value = numValue
      existing.updatedAt = now
    } else {
      MOCK_SCORES.push({ userId, periodId: period.id, type, value: numValue, updatedAt: now })
    }
    return delay({ userId, periodId: period.id, type, value: numValue })
  },
  async listCiroGirisleri() {
    return delay([...MOCK_CIRO_GIRISLERI])
  },
  async listCiroMusterileri() {
    return delay([...MOCK_CIRO_MUSTERILERI])
  },
  // Mock modda RLS yok — supabaseProvider.listMusteriReviewCounts() ile aynı
  // şekli döndürmek için burada da aggregate ediyoruz.
  async listMusteriReviewCounts() {
    const counts = {}
    for (const m of MOCK_CIRO_MUSTERILERI) {
      const key = `${m.userId}|${m.periodId}`
      if (!counts[key]) counts[key] = { userId: m.userId, periodId: m.periodId, hakSayisi: 0, alinanSayisi: 0 }
      counts[key].hakSayisi += 1
      if (m.alindiMi) counts[key].alinanSayisi += 1
    }
    return delay(Object.values(counts))
  },
  async addCiroMusteri({ userId, periodId, adSoyad }, enteredBy) {
    const row = { id: `ciro-musteri-${Date.now()}`, userId, periodId, adSoyad, alindiMi: false, enteredBy, createdAt: new Date().toISOString() }
    MOCK_CIRO_MUSTERILERI.unshift(row)
    return delay(row)
  },
  async removeCiroMusteri(id) {
    const idx = MOCK_CIRO_MUSTERILERI.findIndex((r) => r.id === id)
    if (idx !== -1) MOCK_CIRO_MUSTERILERI.splice(idx, 1)
    return delay({ id })
  },
  async setCiroMusteriAlindi(id, alindiMi) {
    const row = MOCK_CIRO_MUSTERILERI.find((r) => r.id === id)
    if (row) row.alindiMi = alindiMi
    return delay({ id, alindiMi })
  },
  async listActivityTypes() {
    return delay([...MOCK_ACTIVITY_TYPES].sort((a, b) => a.sortOrder - b.sortOrder))
  },
  async updateActivityTypePoint(id, puan) {
    const type = MOCK_ACTIVITY_TYPES.find((t) => t.id === id)
    if (type) type.puan = Number(puan)
    return delay({ id, puan: Number(puan) })
  },
  async listSocialActivityLog() {
    return delay([...MOCK_ACTIVITY_LOG].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  },
  async logSocialActivity({ userId, activityTypeId, adet, tarih }, enteredBy) {
    const period = MOCK_PERIODS.find((p) => p.baslangic <= tarih && p.bitis >= tarih)
    if (!period) throw new Error('Bu tarihi kapsayan bir dönem yok — önce dönemi oluşturman gerekiyor.')
    MOCK_ACTIVITY_LOG.push({
      id: `activity-${Date.now()}`,
      userId,
      periodId: period.id,
      activityTypeId,
      adet: Number(adet),
      enteredBy,
      createdAt: new Date().toISOString(),
    })

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
const MOCK_PRIVATE_INFO = {}
const usersDaysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

function allMockUserRows() {
  return [
    ...Object.values(MOCK_USERS).map((u) => ({ id: u.id, name: u.name, email: `${u.id}@lavanda.dev`, role: u.role, durum: u.durum ?? 'aktif', createdAt: usersDaysAgo(240) })),
    ...Object.values(OTHER_USERS).map((u) => ({ id: u.id, name: u.name, email: `${u.id}@lavanda.dev`, role: u.role ?? 'danisman', durum: u.durum ?? 'aktif', createdAt: usersDaysAgo(180) })),
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

// Dijital kartvizit — telefon/avatar/sosyal medya/aktiflik, userId'ye göre
// in-memory. u-broker ve u-danisman için örnek dolu veriyle başlıyor ki
// mock modda kartvizit sayfası boş görünmesin.
const MOCK_KARTVIZIT = {
  'u-broker': {
    telefon: '0532 000 00 00',
    avatarUrl: null,
    sosyalMedya: { instagram: 'https://instagram.com/remaxlavanda', linkedin: '', whatsapp: '05320000000', web: 'https://remax.com.tr' },
    kartvizitAktif: true,
  },
  'u-danisman': {
    telefon: '0533 111 11 11',
    avatarUrl: null,
    sosyalMedya: { instagram: '', linkedin: '', whatsapp: '05331111111', web: '' },
    kartvizitAktif: true,
  },
}

function kartvizitFor(userId) {
  if (!MOCK_KARTVIZIT[userId]) {
    MOCK_KARTVIZIT[userId] = { telefon: null, avatarUrl: null, sosyalMedya: {}, kartvizitAktif: true }
  }
  return MOCK_KARTVIZIT[userId]
}

export const users = {
  // supabaseProvider.users.listKnown() sadece durum='aktif' kullanıcıları
  // döner — mock tarafında da aynı davranışı simüle ediyoruz (MOCK_USERS +
  // OTHER_USERS zaten hepsi "aktif" varsayılan mock kullanıcılar).
  async listKnown() {
    const map = {}
    for (const u of allMockUserRows()) {
      if (u.durum === 'aktif') map[u.id] = { id: u.id, name: u.name, role: u.role, testHesabi: u.testHesabi ?? false }
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
      if ('testHesabi' in patch) target.testHesabi = patch.testHesabi
    }
    return delay({ id, ...patch })
  },
  async createUser({ ad, email, password: _password, rol }) {
    const created = { id: `mock-user-${Date.now()}`, name: ad, email, role: rol, durum: 'aktif', createdAt: new Date().toISOString() }
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
  async upsertPrivateInfo(userId, { dogumTarihi, tcNo }) {
    MOCK_PRIVATE_INFO[userId] = { dogumTarihi: dogumTarihi ?? null, tcNo: tcNo ?? null }
    return delay({ userId, ...MOCK_PRIVATE_INFO[userId] })
  },
  async listAllPrivateInfo() {
    return delay(Object.entries(MOCK_PRIVATE_INFO).map(([userId, v]) => ({ userId, ...v })))
  },
  async deleteUser(id) {
    const idx = MOCK_EXTRA_USERS.findIndex((u) => u.id === id)
    if (idx !== -1) {
      MOCK_EXTRA_USERS.splice(idx, 1)
      return delay(null)
    }
    throw new Error('Mock modda sadece bu oturumda eklenen kullanıcılar silinebilir (dev sabit hesapları silinemez).')
  },
  // Mock modda gerçek auth yok — sadece akışın hata vermeden çalıştığını
  // doğrulamak için no-op.
  async resetPassword(_id, _password) {
    return delay(null)
  },
  // Push bildirimi aboneliği — mock modda gerçek bir Service Worker/PushManager
  // akışı test edilebilir olsun diye state'i in-memory tutuyoruz.
  async savePushSubscription(_subscription) {
    return delay(null)
  },
  async removePushSubscription(_endpoint) {
    return delay(null)
  },
  async getMyProfile(userId) {
    const row = allMockUserRows().find((u) => u.id === userId)
    if (!row) throw new Error('Kullanıcı bulunamadı.')
    const kv = kartvizitFor(userId)
    return delay({ id: row.id, name: row.name, email: row.email, role: row.role, ...kv })
  },
  async updateProfile(userId, patch) {
    const kv = kartvizitFor(userId)
    if ('telefon' in patch) kv.telefon = patch.telefon || null
    if ('avatarUrl' in patch) kv.avatarUrl = patch.avatarUrl || null
    if ('sosyalMedya' in patch) kv.sosyalMedya = patch.sosyalMedya ?? {}
    if ('kartvizitAktif' in patch) kv.kartvizitAktif = patch.kartvizitAktif
    return delay({ id: userId, ...patch })
  },
  async getPublicCard(userId) {
    const row = allMockUserRows().find((u) => u.id === userId)
    if (!row || row.durum !== 'aktif') return delay(null)
    const kv = kartvizitFor(userId)
    if (!kv.kartvizitAktif) return delay(null)
    return delay({ name: row.name, telefon: kv.telefon, email: row.email, avatarUrl: kv.avatarUrl, role: row.role, sosyalMedya: kv.sosyalMedya })
  },
}

// --- Audit Log (Ayarlar > Log) -----------------------------------------------
const MOCK_AUDIT_LOG = [
  { id: 'al-1', actorId: 'u-broker', action: 'UPDATE', tableName: 'users', recordId: 'ext-danisman-2', detay: { rol: 'danisman' }, createdAt: usersDaysAgo(1) },
  { id: 'al-2', actorId: 'u-ofis', action: 'INSERT', tableName: 'opportunities', recordId: 'opp-12', detay: { type: 'satici' }, createdAt: usersDaysAgo(2) },
  { id: 'al-3', actorId: 'u-broker', action: 'UPDATE', tableName: 'score_entries', recordId: 'se-4', detay: { type: 'ciro', value: 2530000 }, createdAt: usersDaysAgo(3) },
]

export const auditLog = {
  async list() {
    return delay([...MOCK_AUDIT_LOG])
  },
}

// --- Webhook Hataları (Ayarlar > Webhook Hataları) ----------------------------
const MOCK_META_WEBHOOK_ERRORS = [
  {
    id: 'mwe-1',
    tur: 'graph_api_hatasi',
    leadgenId: '1073507478692140',
    hataMesaji:
      'field_data çekilemedi: 400 {"error":{"message":"Error validating access token: Session has expired","type":"OAuthException","code":190}}',
    createdAt: usersDaysAgo(6),
  },
]

export const metaWebhookErrors = {
  async list() {
    return delay([...MOCK_META_WEBHOOK_ERRORS])
  },
}

const MOCK_TELSAM_WEBHOOK_ERRORS = [
  {
    id: 'twe-1',
    kaynak: 'cdr_sync',
    tur: 'yetkilendirme_hatasi',
    chanid: null,
    hataMesaji: 'x-cron-secret CRON_SECRET ile eşleşmedi',
    createdAt: usersDaysAgo(1),
  },
]

export const telsamWebhookErrors = {
  async list() {
    return delay([...MOCK_TELSAM_WEBHOOK_ERRORS])
  },
}

// --- Görevler (Planlama > Görevler) ------------------------------------------
export const tasks = {
  async list() {
    return delay([...MOCK_TASKS])
  },
  async create(form, createdBy) {
    const row = {
      id: `task-${Date.now()}`,
      title: form.title,
      description: form.description || null,
      assigneeId: form.assigneeId,
      createdBy,
      dueDate: form.dueDate || null,
      status: 'bekliyor',
      completedAt: null,
      createdAt: new Date().toISOString(),
    }
    MOCK_TASKS.unshift(row)
    return delay({ ...row })
  },
  async update(id, patch) {
    const task = MOCK_TASKS.find((t) => t.id === id)
    if (!task) throw new Error('Görev bulunamadı.')
    if ('title' in patch) task.title = patch.title
    if ('description' in patch) task.description = patch.description || null
    if ('assigneeId' in patch) task.assigneeId = patch.assigneeId
    if ('dueDate' in patch) task.dueDate = patch.dueDate || null
    if ('status' in patch) {
      task.status = patch.status
      task.completedAt = patch.status === 'tamamlandi' ? new Date().toISOString() : null
    }
    return delay({ ...task })
  },
  async remove(id) {
    const idx = MOCK_TASKS.findIndex((t) => t.id === id)
    if (idx !== -1) MOCK_TASKS.splice(idx, 1)
    return delay(null)
  },
}

// --- Belge Doldurma Platformu — dev/mock için 16 belgenin tamamı (2026-08-20) ---
// isFavorite: ekranda direkt görünen "sık kullanılan" belgeler (2026-08-22
// broker isteği) — gerisi "diğer belgeler" penceresinde.
const MOCK_DOCUMENT_TEMPLATES = [
  { id: 'doc-tpl-yetki-belgesi', slug: 'yetki-belgesi', name: 'Danışmanlık ve Yetki Belgesi', sortOrder: 1, isActive: true, isFavorite: true },
  { id: 'doc-tpl-yer-gosterme-belgesi', slug: 'yer-gosterme-belgesi', name: 'Yer Gösterme Belgesi', sortOrder: 2, isActive: true, isFavorite: true },
  { id: 'doc-tpl-baglanma-parasi-alici', slug: 'baglanma-parasi-alici', name: 'Bağlanma Parası Sözleşmesi (Alıcı)', sortOrder: 3, isActive: true, isFavorite: true },
  { id: 'doc-tpl-cayma-parasi-satici', slug: 'cayma-parasi-satici', name: 'Cayma Parası Sözleşmesi (Satıcı)', sortOrder: 4, isActive: true, isFavorite: false },
  { id: 'doc-tpl-cayma-parasi-alici-satici', slug: 'cayma-parasi-alici-satici', name: 'Cayma Parası Sözleşmesi (Alıcı-Satıcı)', sortOrder: 5, isActive: true, isFavorite: false },
  { id: 'doc-tpl-kira-sozlesmesi', slug: 'kira-sozlesmesi', name: 'Kira Sözleşmesi', sortOrder: 6, isActive: true, isFavorite: true },
  { id: 'doc-tpl-tahliye-taahhutnamesi', slug: 'tahliye-taahhutnamesi', name: 'Tahliye Taahhütnamesi', sortOrder: 7, isActive: true, isFavorite: false },
  { id: 'doc-tpl-demirbas-listesi', slug: 'demirbas-listesi', name: 'Demirbaş Listesi', sortOrder: 8, isActive: true, isFavorite: false },
  { id: 'doc-tpl-anahtar-teslim-tutanagi', slug: 'anahtar-teslim-tutanagi', name: 'Anahtar Teslim Tutanağı', sortOrder: 9, isActive: true, isFavorite: false },
  { id: 'doc-tpl-alici-tanitim-hizmet-bedeli', slug: 'alici-tanitim-hizmet-bedeli', name: 'Alıcı Tanıtım ve Hizmet Bedeli Taahhütnamesi', sortOrder: 10, isActive: true, isFavorite: false },
  { id: 'doc-tpl-tasinmaz-bulma-temsil', slug: 'tasinmaz-bulma-temsil', name: 'Taşınmaz Bulma ve Temsil Sözleşmesi', sortOrder: 11, isActive: true, isFavorite: false },
  { id: 'doc-tpl-teklif-formu', slug: 'teklif-formu', name: 'Teklif Formu', sortOrder: 12, isActive: true, isFavorite: true },
  { id: 'doc-tpl-musteri-memnuniyet-formu', slug: 'musteri-memnuniyet-formu', name: 'Müşteri Memnuniyet Formu', sortOrder: 13, isActive: true, isFavorite: false },
  { id: 'doc-tpl-islem-raporu', slug: 'islem-raporu', name: 'İşlem Raporu', sortOrder: 14, isActive: true, isFavorite: false },
  { id: 'doc-tpl-hizmet-bedeli-alici', slug: 'hizmet-bedeli-alici', name: 'Hizmet Bedeli Protokolü (Alıcı)', sortOrder: 15, isActive: true, isFavorite: true },
  { id: 'doc-tpl-hizmet-bedeli-satici', slug: 'hizmet-bedeli-satici', name: 'Hizmet Bedeli Protokolü (Satıcı)', sortOrder: 16, isActive: true, isFavorite: true },
]

const MOCK_DOCUMENT_FIELD_DEFS = {
  'yetki-belgesi': [
    ['d1_il', 'İl', 'text'],
    ['d1_ilce', 'İlçe', 'text'],
    ['d1_mahalle', 'Mahalle', 'text'],
    ['d1_ada', 'Ada', 'text'],
    ['d1_parsel', 'Parsel', 'text'],
    ['d1_bagimsiz_bolum', 'Bağımsız Bölüm', 'text'],
    ['d1_adres', 'Adres (Gayrimenkul)', 'text'],
    ['d1_nitelik_konut', 'Nitelik: Konut', 'checkbox'],
    ['d1_nitelik_arsa', 'Nitelik: Arsa', 'checkbox'],
    ['d1_nitelik_fabrika', 'Nitelik: Fabrika', 'checkbox'],
    ['d1_nitelik_diger', 'Nitelik: Diğer', 'checkbox'],
    ['d1_islem_satis', 'İşlem: Satış', 'checkbox'],
    ['d1_islem_kiralama', 'İşlem: Kiralama', 'checkbox'],
    ['d1_musteri_ad', 'Müşteri Adı Soyadı / Unvan', 'text'],
    ['d1_musteri_tc', 'Müşteri T.C. / VKN', 'text'],
    ['d1_musteri_tel', 'Müşteri Telefon', 'text'],
    ['d1_musteri_eposta', 'Müşteri E-Posta', 'text'],
    ['d1_musteri_adres', 'Müşteri Adresi', 'text'],
    ['d1_m16_tarih_1', 'Sözleşme Yürürlük Tarihi', 'date'],
    ['d1_m16_alan_2', 'Yetki Süresi (gün)', 'text'],
    ['d1_m21_alan_1', 'Yetkili Mahkeme (İl)', 'text'],
    ['d1_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d1_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d1_ozel_sart_3', 'Özel Şart 3', 'textarea'],
    ['d1_ozel_sart_4', 'Özel Şart 4', 'textarea'],
    ['d1_kapanis_tarih_1', 'Düzenleme Tarihi', 'date'],
    ['d1_kapanis_alan_2', 'Nüsha Sayısı', 'text'],
    ['d1_musteri_tarih', 'Müşteri İmza Tarihi', 'date'],
    ['d1_re_max_lavanda_ad', 'Danışman Adı Soyadı', 'text'],
    ['d1_re_max_lavanda_tarih', 'Danışman İmza Tarihi', 'date'],
  ],
  'yer-gosterme-belgesi': [
    ['d2_amac_satin_almak', 'Amaç: Satın Almak', 'checkbox'],
    ['d2_amac_kiralamak', 'Amaç: Kiralamak', 'checkbox'],
    ['d2_gorme_tarihi', 'Görme Tarihi', 'date'],
    ['d2_musteri_ad', 'Müşteri Adı Soyadı / Unvan', 'text'],
    ['d2_musteri_tc', 'Müşteri T.C. / VKN', 'text'],
    ['d2_musteri_tel', 'Müşteri Telefon', 'text'],
    ['d2_musteri_eposta', 'Müşteri E-Posta', 'text'],
    ['d2_musteri_adres', 'Müşteri Adresi', 'textarea'],
    ['d2_il', 'İl', 'text'],
    ['d2_ilce', 'İlçe', 'text'],
    ['d2_mahalle', 'Mahalle', 'text'],
    ['d2_ada', 'Ada', 'text'],
    ['d2_parsel', 'Parsel', 'text'],
    ['d2_adres', 'Taşınmaz Adresi', 'textarea'],
    ['d2d_p_alan_1', 'Yetkili Mahkeme İli', 'text'],
    ['d2_teklif_rakam', 'Teklif Bedeli (Rakam, TL)', 'text'],
    ['d2_teklif_yazi', 'Teklif Bedeli (Yazı ile)', 'text'],
    ['d2_alici_veya_kiraci_ad', 'Alıcı veya Kiracı Adı Soyadı / Unvan', 'text'],
    ['d2_alici_veya_kiraci_tarih', 'Alıcı veya Kiracı İmza Tarihi', 'date'],
    ['d2_re_max_lavanda_ad', 'Danışman Adı Soyadı', 'text'],
    ['d2_re_max_lavanda_tarih', 'Danışman İmza Tarihi', 'date'],
  ],
  'baglanma-parasi-alici': [
    ['d3_il', 'İl', 'text'],
    ['d3_ilce', 'İlçe', 'text'],
    ['d3_mahalle', 'Mahalle', 'text'],
    ['d3_ada', 'Ada', 'text'],
    ['d3_parsel', 'Parsel', 'text'],
    ['d3_adres', 'Taşınmaz Adresi', 'textarea'],
    ['d3_alici_ad', 'Alıcı Adı Soyadı / Unvan', 'text'],
    ['d3_alici_tc', 'Alıcı T.C. / VKN', 'text'],
    ['d3_alici_tel', 'Alıcı Telefon', 'text'],
    ['d3_alici_eposta', 'Alıcı E-Posta', 'text'],
    ['d3_alici_adres', 'Alıcı Adresi', 'textarea'],
    ['d3_m01_alan_1', 'Satış Bedeli (Rakam, TL)', 'text'],
    ['d3_m01_alan_2', 'Satış Bedeli (Yazı ile)', 'text'],
    ['d3_m02_tarih_1', 'Bağlanma Parası Ödeme Tarihi', 'date'],
    ['d3_m02_alan_2', 'Bağlanma Parası Tutarı (Rakam, TL)', 'text'],
    ['d3_m02_alan_3', 'Bağlanma Parası Tutarı (Yazı ile)', 'text'],
    ['d3_m03_tarih_1', 'Tapu Devri Tarihi (Son Ödeme)', 'date'],
    ['d3_m09_alan_1', 'Yetkili Mahkeme İli', 'text'],
    ['d3_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d3_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d3_ozel_sart_3', 'Özel Şart 3', 'textarea'],
    ['d3_kapanis_tarih_1', 'Sözleşme Düzenlenme Tarihi', 'date'],
    ['d3_kapanis_alan_2', 'Nüsha Sayısı', 'text'],
    ['d3_alici_tarih', 'Alıcı İmza Tarihi', 'date'],
    ['d3_re_max_lavanda_ad', 'Danışman Adı Soyadı', 'text'],
    ['d3_re_max_lavanda_tarih', 'Danışman İmza Tarihi', 'date'],
  ],
  'cayma-parasi-satici': [
    ['d4_il', 'İl', 'text'],
    ['d4_ilce', 'İlçe', 'text'],
    ['d4_mahalle', 'Mahalle', 'text'],
    ['d4_ada', 'Ada', 'text'],
    ['d4_parsel', 'Parsel', 'text'],
    ['d4_adres', 'Taşınmaz Adresi', 'textarea'],
    ['d4_satici_ad', 'Satıcı Adı Soyadı / Unvan', 'text'],
    ['d4_satici_tc', 'Satıcı T.C. / VKN', 'text'],
    ['d4_satici_tel', 'Satıcı Telefon', 'text'],
    ['d4_satici_eposta', 'Satıcı E-Posta', 'text'],
    ['d4_satici_adres', 'Satıcı Adresi', 'textarea'],
    ['d4_m01_alan_1', 'Satış Bedeli (Rakam, TL)', 'text'],
    ['d4_m01_alan_2', 'Satış Bedeli (Yazı ile)', 'text'],
    ['d4_m01_alan_3', 'Alıcının Adı Soyadı / Unvanı', 'text'],
    ['d4_m02_alan_2', 'Cayma Parası Tutarı (Rakam, TL)', 'text'],
    ['d4_m02_alan_3', 'Cayma Parası Tutarı (Yazı ile)', 'text'],
    ['d4_m02_tarih_1', 'Cayma Parası Teslim Tarihi', 'date'],
    ['d4_m03_alan_2', 'Tapuda Ödenecek Kalan Tutar (Rakam, TL)', 'text'],
    ['d4_m03_alan_3', 'Tapuda Ödenecek Kalan Tutar (Yazı ile)', 'text'],
    ['d4_m03_tarih_1', 'Tapu Devri Tarihi (Son Ödeme)', 'date'],
    ['d4_m10_alan_1', 'Yetkili Mahkeme İli', 'text'],
    ['d4_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d4_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d4_ozel_sart_3', 'Özel Şart 3', 'textarea'],
    ['d4_kapanis_tarih_1', 'Sözleşme Düzenlenme Tarihi', 'date'],
    ['d4_kapanis_alan_2', 'Nüsha Sayısı', 'text'],
    ['d4_satici_tarih', 'Satıcı İmza Tarihi', 'date'],
    ['d4_re_max_lavanda_ad', 'Danışman Adı Soyadı', 'text'],
    ['d4_re_max_lavanda_tarih', 'Danışman İmza Tarihi', 'date'],
  ],
  'cayma-parasi-alici-satici': [
    ['d5_il', 'İl', 'text'],
    ['d5_ilce', 'İlçe', 'text'],
    ['d5_mahalle', 'Mahalle', 'text'],
    ['d5_ada', 'Ada', 'text'],
    ['d5_parsel', 'Parsel', 'text'],
    ['d5_adres', 'Gayrimenkul Adresi', 'text'],
    ['d5_satici_ad', 'Satıcı Adı Soyadı / Unvanı', 'text'],
    ['d5_satici_tc', 'Satıcı T.C. Kimlik No / VKN', 'text'],
    ['d5_satici_tel', 'Satıcı Telefon', 'text'],
    ['d5_satici_eposta', 'Satıcı E-Posta', 'text'],
    ['d5_satici_adres', 'Satıcı Adresi', 'text'],
    ['d5_alici_ad', 'Alıcı Adı Soyadı / Unvanı', 'text'],
    ['d5_alici_tc', 'Alıcı T.C. Kimlik No / VKN', 'text'],
    ['d5_alici_tel', 'Alıcı Telefon', 'text'],
    ['d5_alici_eposta', 'Alıcı E-Posta', 'text'],
    ['d5_alici_adres', 'Alıcı Adresi', 'text'],
    ['d5_m01_alan_1', 'Satış Bedeli (TL, rakamla)', 'text'],
    ['d5_m01_alan_2', 'Satış Bedeli (yazıyla, Türk Lirası)', 'text'],
    ['d5_m02_alan_2', 'Cayma Parası Tutarı (TL, rakamla)', 'text'],
    ['d5_m02_alan_3', 'Cayma Parası Tutarı (yazıyla, Türk Lirası)', 'text'],
    ['d5_m02_tarih_1', 'Cayma Parasının Ödendiği Tarih', 'date'],
    ['d5_m03_alan_2', 'Tapu Devrinde Ödenecek Kalan Bakiye (TL, rakamla)', 'text'],
    ['d5_m03_alan_3', 'Tapu Devrinde Ödenecek Kalan Bakiye (yazıyla, Türk Lirası)', 'text'],
    ['d5_m03_tarih_1', 'Tapu Devri Tarihi (en geç)', 'date'],
    ['d5_m10_alan_1', 'Yetkili Mahkeme ve İcra Daireleri (İl/İlçe)', 'text'],
    ['d5_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d5_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d5_ozel_sart_3', 'Özel Şart 3', 'textarea'],
    ['d5_kapanis_tarih_1', 'Sözleşmenin Düzenlendiği Tarih', 'date'],
    ['d5_kapanis_alan_2', 'Nüsha Sayısı', 'text'],
    ['d5_satici_tarih', 'Satıcı İmza Tarihi', 'date'],
    ['d5_alici_tarih', 'Alıcı İmza Tarihi', 'date'],
    ['d5_re_max_lavanda_ad', 'RE/MAX Lavanda Danışman Adı Soyadı', 'text'],
    ['d5_re_max_lavanda_tarih', 'RE/MAX Lavanda İmza Tarihi', 'date'],
  ],
  'kira-sozlesmesi': [
    ['d6_gm_tapu_mudurlugu', 'Tapu Müdürlüğü', 'text'],
    ['d6_gm_i_l_i_lce_mahalle', 'İl / İlçe / Mahalle', 'text'],
    ['d6_gm_cadde_sokak', 'Cadde / Sokak', 'text'],
    ['d6_gm_blok_kapi_no', 'Blok / Kapı No', 'text'],
    ['d6_gm_kullanim_sekli', 'Kullanım Şekli', 'text'],
    ['d6_gm_demirbas_durumu', 'Demirbaş Durumu', 'text'],
    ['d6_cinsi_konut', 'Cinsi: Konut', 'checkbox'],
    ['d6_cinsi_i_syeri', 'Cinsi: İşyeri', 'checkbox'],
    ['d6_cinsi_diger', 'Cinsi: Diğer', 'checkbox'],
    ['d6_durum_bos', 'Durumu: Boş', 'checkbox'],
    ['d6_durum_kiracili', 'Durumu: Kiracılı', 'checkbox'],
    ['d6_kiraya_veren_adi_soyadi', 'Kiraya Veren - Adı Soyadı', 'text'],
    ['d6_kiraya_veren_t_c_gsm', 'Kiraya Veren - T.C. Kimlik No / GSM', 'text'],
    ['d6_kiraya_veren_adres', 'Kiraya Veren - Adres', 'text'],
    ['d6_kiraci_adi_soyadi', 'Kiracı - Adı Soyadı', 'text'],
    ['d6_kiraci_t_c_gsm', 'Kiracı - T.C. Kimlik No / GSM', 'text'],
    ['d6_kiraci_adres', 'Kiracı - Adres', 'text'],
    ['d6_kefil_adi_soyadi', 'Kefil - Adı Soyadı', 'text'],
    ['d6_kefil_t_c_gsm', 'Kefil - T.C. Kimlik No / GSM', 'text'],
    ['d6_kefil_adres', 'Kefil - Adres', 'text'],
    ['d6b_p_alan_1', 'El Yazısı Kefalet Beyanı - Azami Sorumluluk Tutarı (₺)', 'text'],
    ['d6b_p_alan_2', 'El Yazısı Kefalet Beyanı Tarihi - Gün', 'text'],
    ['d6b_p_alan_3', 'El Yazısı Kefalet Beyanı Tarihi - Ay', 'text'],
    ['d6b_p_alan_4', 'El Yazısı Kefalet Beyanı Tarihi - Yıl (20xx)', 'text'],
    ['d6_akit_baslangic_tarihi', 'Akit - Başlangıç Tarihi', 'date'],
    ['d6_akit_suresi', 'Akit - Süresi', 'text'],
    ['d6_akit_aylik_kira_bedeli_rakam', 'Akit - Aylık Kira Bedeli (Rakam)', 'text'],
    ['d6_akit_aylik_kira_bedeli_yaziyla', 'Akit - Aylık Kira Bedeli (Yazıyla)', 'text'],
    ['d6_akit_depozito', 'Akit - Depozito', 'text'],
    ['d6_akit_odeme_sekli_iban', 'Akit - Ödeme Şekli / IBAN', 'text'],
    ['d6_m12_alan_1', 'Madde 12 - Yetkili Mahkeme (Yer)', 'text'],
    ['d6_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d6_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d6_ozel_sart_3', 'Özel Şart 3', 'textarea'],
    ['d6_ozel_sart_4', 'Özel Şart 4', 'textarea'],
    ['d6_ozel_sart_5', 'Özel Şart 5', 'textarea'],
    ['d6_ozel_sart_6', 'Özel Şart 6', 'textarea'],
    ['d6_ozel_sart_7', 'Özel Şart 7', 'textarea'],
    ['d6_ozel_sart_8', 'Özel Şart 8', 'textarea'],
    ['d6_kapanis_tarih_1', 'Sözleşme Düzenlenme Tarihi', 'date'],
    ['d6_kapanis_alan_2', 'Sözleşme Nüsha Sayısı', 'text'],
    ['d6_kiraya_veren_ad', 'Kiraya Veren - Ad Soyad / Unvan (İmza)', 'text'],
    ['d6_kiraya_veren_tarih', 'Kiraya Veren - İmza Tarihi', 'date'],
    ['d6_kiraci_ad', 'Kiracı - Ad Soyad / Unvan (İmza)', 'text'],
    ['d6_kiraci_tarih', 'Kiracı - İmza Tarihi', 'date'],
    ['d6_kefil_ad', 'Kefil - Ad Soyad / Unvan (İmza)', 'text'],
    ['d6_kefil_tarih', 'Kefil - İmza Tarihi', 'date'],
  ],
  'tahliye-taahhutnamesi': [
    ['d7_kiraci_adi_soyadi', 'Kiracı Adı Soyadı', 'text'],
    ['d7_kiraci_t_c_kimlik_no', 'Kiracı T.C. Kimlik No', 'text'],
    ['d7_malik_adi_soyadi', 'Mülk Sahibi (Kiralayan) Adı Soyadı', 'text'],
    ['d7_malik_t_c_kimlik_no', 'Mülk Sahibi T.C. Kimlik No', 'text'],
    ['d7_gm_i_l_i_lce_mahalle', 'Taşınmaz İl / İlçe / Mahalle', 'text'],
    ['d7_gm_ada_parsel', 'Taşınmaz Ada / Parsel', 'text'],
    ['d7_gm_bagimsiz_bolum', 'Bağımsız Bölüm', 'text'],
    ['d7_gm_adres', 'Taşınmaz Adresi', 'text'],
    ['d7a_p_tarih_1', 'Dayanak Kira Sözleşmesi Tarihi', 'date'],
    ['d7_el_tahliye_tarihi_el_yazisi', 'Tahliye Tarihi (el yazısı ile doldurulacak)', 'text'],
    ['d7_el_taahhut_tarihi_el_yazisi', 'Taahhüt Tarihi (el yazısı ile doldurulacak)', 'text'],
    ['d7_el_adi_soyadi_el_yazisi', 'Kiracı Adı Soyadı (el yazısı ile doldurulacak)', 'text'],
    ['d7_kiraci_ad', 'Kiracı Ad Soyad / Unvan (İmza)', 'text'],
    ['d7_kiraci_tarih', 'Kiracı İmza Tarihi', 'date'],
    ['d7_mulk_sahibi_ad', 'Mülk Sahibi Ad Soyad / Unvan (İmza)', 'text'],
    ['d7_mulk_sahibi_tarih', 'Mülk Sahibi İmza Tarihi', 'date'],
  ],
  'demirbas-listesi': [
    ['d8_i_l_i_lce_mahalle', 'İl / İlçe / Mahalle', 'text'],
    ['d8_adres', 'Adres', 'text'],
    ['d8_kira_sozlesmesi_tarihi', 'Kira Sözleşmesi Tarihi', 'date'],
    ['d8_kiraya_veren', 'Kiraya Veren', 'text'],
    ['d8_kiraci', 'Kiracı', 'text'],
    ['d8_klima_adet', 'Klima - Adet', 'text'],
    ['d8_klima_durum', 'Klima - Durumu', 'text'],
    ['d8_kombi_adet', 'Kombi - Adet', 'text'],
    ['d8_kombi_durum', 'Kombi - Durumu', 'text'],
    ['d8_ankastre_adet', 'Ankastre - Adet', 'text'],
    ['d8_ankastre_durum', 'Ankastre - Durumu', 'text'],
    ['d8_mutfak_dolabi_adet', 'Mutfak Dolabı - Adet', 'text'],
    ['d8_mutfak_dolabi_durum', 'Mutfak Dolabı - Durumu', 'text'],
    ['d8_kapilar_adet', 'Kapılar - Adet', 'text'],
    ['d8_kapilar_durum', 'Kapılar - Durumu', 'text'],
    ['d8_pencereler_adet', 'Pencereler - Adet', 'text'],
    ['d8_pencereler_durum', 'Pencereler - Durumu', 'text'],
    ['d8_elektrik_tesisati_adet', 'Elektrik Tesisatı - Adet', 'text'],
    ['d8_elektrik_tesisati_durum', 'Elektrik Tesisatı - Durumu', 'text'],
    ['d8_su_tesisati_adet', 'Su Tesisatı - Adet', 'text'],
    ['d8_su_tesisati_durum', 'Su Tesisatı - Durumu', 'text'],
    ['d8_boya_adet', 'Boya - Adet', 'text'],
    ['d8_boya_durum', 'Boya - Durumu', 'text'],
    ['d8_diger_adet', 'Diğer - Adet', 'text'],
    ['d8_diger_durum', 'Diğer - Durumu', 'text'],
    ['d8_ek_aciklama', 'Ek Açıklamalar', 'textarea'],
    ['d8_kiraya_veren_ad', 'Kiraya Veren Ad Soyad / Unvan (İmza)', 'text'],
    ['d8_kiraya_veren_tarih', 'Kiraya Veren İmza Tarihi', 'date'],
    ['d8_kiraci_ad', 'Kiracı Ad Soyad / Unvan (İmza)', 'text'],
    ['d8_kiraci_tarih', 'Kiracı İmza Tarihi', 'date'],
  ],
  'anahtar-teslim-tutanagi': [
    ['d9_adres', 'Taşınmaz Adresi', 'text'],
    ['d9_kiraya_veren', 'Kiraya Veren', 'text'],
    ['d9_kiraci', 'Kiracı', 'text'],
    ['d9_teslim_tarihi', 'Teslim Tarihi', 'date'],
    ['d9_daire_kapisi_adet', 'Daire Kapısı Anahtarı - Adet', 'text'],
    ['d9_daire_kapisi_not', 'Daire Kapısı Anahtarı - Not', 'textarea'],
    ['d9_bina_kapisi_adet', 'Bina Kapısı Anahtarı - Adet', 'text'],
    ['d9_bina_kapisi_not', 'Bina Kapısı Anahtarı - Not', 'textarea'],
    ['d9_garaj_adet', 'Garaj Anahtarı - Adet', 'text'],
    ['d9_garaj_not', 'Garaj Anahtarı - Not', 'textarea'],
    ['d9_depo_adet', 'Depo Anahtarı - Adet', 'text'],
    ['d9_depo_not', 'Depo Anahtarı - Not', 'textarea'],
    ['d9_diger_adet', 'Diğer Anahtar - Adet', 'text'],
    ['d9_diger_not', 'Diğer Anahtar - Not', 'textarea'],
    ['d9_kiraya_veren_ad', 'Kiraya Veren - Ad Soyad / Unvan (İmza)', 'text'],
    ['d9_kiraya_veren_tarih', 'Kiraya Veren - İmza Tarihi', 'date'],
    ['d9_kiraci_ad', 'Kiracı - Ad Soyad / Unvan (İmza)', 'text'],
    ['d9_kiraci_tarih', 'Kiracı - İmza Tarihi', 'date'],
  ],
  'alici-tanitim-hizmet-bedeli': [
    ['d10_malik_ad', 'Malik Adı Soyadı / Unvan', 'text'],
    ['d10_malik_tc', 'Malik T.C. Kimlik No / VKN', 'text'],
    ['d10_malik_tel', 'Malik Telefon', 'text'],
    ['d10_malik_eposta', 'Malik E-Posta', 'text'],
    ['d10_malik_adres', 'Malik Adres', 'text'],
    ['d10_il', 'Taşınmaz İl', 'text'],
    ['d10_ilce', 'Taşınmaz İlçe', 'text'],
    ['d10_mahalle', 'Taşınmaz Mahalle', 'text'],
    ['d10_ada', 'Ada No', 'text'],
    ['d10_parsel', 'Parsel No', 'text'],
    ['d10_bagimsiz_bolum', 'Bağımsız Bölüm No', 'text'],
    ['d10_adres', 'Taşınmaz Adresi', 'text'],
    ['d10_nitelik_konut', 'Taşınmaz Niteliği: Konut', 'checkbox'],
    ['d10_nitelik_i_syeri', 'Taşınmaz Niteliği: İşyeri', 'checkbox'],
    ['d10_nitelik_arsa', 'Taşınmaz Niteliği: Arsa', 'checkbox'],
    ['d10_nitelik_ticari_endustriyel', 'Taşınmaz Niteliği: Ticari / Endüstriyel', 'checkbox'],
    ['d10_m07_alan_1', 'Yetkili Mahkeme Yeri (Madde 07 - Uyuşmazlıklarda ___ Mahkemeleri ve İcra Daireleri yetkilidir)', 'text'],
    ['d10_m08_tarih_1', 'Sözleşme Yürürlük Tarihi (Madde 08)', 'date'],
    ['d10_m08_alan_2', 'Nüsha Sayısı (Madde 08 - ___ nüsha olarak düzenlenmiştir)', 'text'],
    ['d10_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d10_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d10_ozel_sart_3', 'Özel Şart 3', 'textarea'],
    ['d10_musteri_ad', 'Müşteri (Malik) İmza Bloğu: Ad Soyad / Unvan', 'text'],
    ['d10_musteri_tarih', 'Müşteri (Malik) İmza Tarihi', 'date'],
    ['d10_re_max_lavanda_ad', 'RE/MAX Lavanda (Gayrimenkul Danışmanı) Ad Soyad', 'text'],
    ['d10_re_max_lavanda_tarih', 'RE/MAX Lavanda İmza Tarihi', 'date'],
  ],
  'tasinmaz-bulma-temsil': [
    ['d11_musteri_ad', 'Müşteri Adı Soyadı / Unvan', 'text'],
    ['d11_musteri_tc', 'Müşteri T.C. Kimlik No / VKN', 'text'],
    ['d11_musteri_tel', 'Müşteri Telefon', 'text'],
    ['d11_musteri_eposta', 'Müşteri E-Posta', 'text'],
    ['d11_musteri_adres', 'Müşteri Adres', 'text'],
    ['d11_m06_tarih_1', 'Sözleşme Yürürlük Tarihi (Madde 06)', 'date'],
    ['d11_m06_alan_2', 'Yetki Süresi (Madde 06 - Yetki süresi ___ gündür)', 'text'],
    ['d11_m10_alan_1', 'Yetkili Mahkeme Yeri (Madde 10 - Uyuşmazlıklarda ___ Mahkemeleri ve İcra Daireleri yetkilidir)', 'text'],
    ['d11_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d11_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d11_ozel_sart_3', 'Özel Şart 3', 'textarea'],
    ['d11_kapanis_tarih_1', 'Sözleşme Düzenlenme Tarihi (kapanış - Bu sözleşme ___ tarihinde düzenlenmiştir)', 'date'],
    ['d11_kapanis_alan_2', 'Nüsha Sayısı (kapanış - ___ nüsha olarak düzenlenmiştir)', 'text'],
    ['d11_musteri_tarih', 'Müşteri İmza Tarihi', 'date'],
    ['d11_re_max_lavanda_ad', 'RE/MAX Lavanda (Gayrimenkul Danışmanı) Ad Soyad', 'text'],
    ['d11_re_max_lavanda_tarih', 'RE/MAX Lavanda İmza Tarihi', 'date'],
  ],
  'teklif-formu': [
    ['d12_il', 'Taşınmaz İl', 'text'],
    ['d12_ilce', 'Taşınmaz İlçe', 'text'],
    ['d12_mahalle', 'Taşınmaz Mahalle', 'text'],
    ['d12_ada', 'Ada No', 'text'],
    ['d12_parsel', 'Parsel No', 'text'],
    ['d12_adres', 'Taşınmaz Adresi', 'text'],
    ['d12_alici_ad', 'Alıcı (Teklif Veren) Adı Soyadı / Unvan', 'text'],
    ['d12_alici_tc', 'Alıcı T.C. Kimlik No / VKN', 'text'],
    ['d12_alici_tel', 'Alıcı Telefon', 'text'],
    ['d12_alici_eposta', 'Alıcı E-Posta', 'text'],
    ['d12_alici_adres', 'Alıcı Adres', 'text'],
    ['d12_teklif_rakam', 'Teklif Bedeli - Rakam (TL)', 'text'],
    ['d12_teklif_yazi', 'Teklif Bedeli - Yazı ile (Türk Lirası)', 'text'],
    ['d12_m01_tarih_1', 'Teklif Geçerlilik Tarihi (Madde 01 - İşbu teklif ___ tarihine kadar geçerlidir)', 'date'],
    ['d12_beyan_kabul', 'Satıcı Beyanı: Kabul Ediyorum', 'checkbox'],
    ['d12_beyan_red', 'Satıcı Beyanı: Reddediyorum', 'checkbox'],
    ['d12_kapanis_tarih_1', 'Sözleşme Düzenlenme Tarihi (kapanış - Bu sözleşme ___ tarihinde düzenlenmiştir)', 'date'],
    ['d12_kapanis_alan_2', 'Nüsha Sayısı (kapanış - ___ nüsha olarak düzenlenmiştir)', 'text'],
    ['d12_satici_ad', 'Satıcı İmza Bloğu: Ad Soyad / Unvan', 'text'],
    ['d12_satici_tarih', 'Satıcı İmza Tarihi', 'date'],
    ['d12_alici_tarih', 'Alıcı İmza Tarihi', 'date'],
    ['d12_re_max_lavanda_ad', 'RE/MAX Lavanda (Danışman) Ad Soyad', 'text'],
    ['d12_re_max_lavanda_tarih', 'RE/MAX Lavanda İmza Tarihi', 'date'],
  ],
  'musteri-memnuniyet-formu': [
    ['d13_gayrimenkul_danismani', 'Gayrimenkul Danışmanı', 'text'],
    ['d13_i_slem_tarihi', 'İşlem Tarihi', 'date'],
    ['d13_duzenli_bilgilendirme_1', 'Düzenli Bilgilendirme: 1 puan (çok kötü)', 'checkbox'],
    ['d13_duzenli_bilgilendirme_2', 'Düzenli Bilgilendirme: 2 puan (kötü)', 'checkbox'],
    ['d13_duzenli_bilgilendirme_3', 'Düzenli Bilgilendirme: 3 puan (vasat)', 'checkbox'],
    ['d13_duzenli_bilgilendirme_4', 'Düzenli Bilgilendirme: 4 puan (iyi)', 'checkbox'],
    ['d13_duzenli_bilgilendirme_5', 'Düzenli Bilgilendirme: 5 puan (çok iyi)', 'checkbox'],
    ['d13_hiz_1', 'Hız: 1 puan (çok kötü)', 'checkbox'],
    ['d13_hiz_2', 'Hız: 2 puan (kötü)', 'checkbox'],
    ['d13_hiz_3', 'Hız: 3 puan (vasat)', 'checkbox'],
    ['d13_hiz_4', 'Hız: 4 puan (iyi)', 'checkbox'],
    ['d13_hiz_5', 'Hız: 5 puan (çok iyi)', 'checkbox'],
    ['d13_profesyonel_deneyim_1', 'Profesyonel Deneyim: 1 puan (çok kötü)', 'checkbox'],
    ['d13_profesyonel_deneyim_2', 'Profesyonel Deneyim: 2 puan (kötü)', 'checkbox'],
    ['d13_profesyonel_deneyim_3', 'Profesyonel Deneyim: 3 puan (vasat)', 'checkbox'],
    ['d13_profesyonel_deneyim_4', 'Profesyonel Deneyim: 4 puan (iyi)', 'checkbox'],
    ['d13_profesyonel_deneyim_5', 'Profesyonel Deneyim: 5 puan (çok iyi)', 'checkbox'],
    ['d13_sektor_bilgisi_1', 'Sektör Bilgisi: 1 puan (çok kötü)', 'checkbox'],
    ['d13_sektor_bilgisi_2', 'Sektör Bilgisi: 2 puan (kötü)', 'checkbox'],
    ['d13_sektor_bilgisi_3', 'Sektör Bilgisi: 3 puan (vasat)', 'checkbox'],
    ['d13_sektor_bilgisi_4', 'Sektör Bilgisi: 4 puan (iyi)', 'checkbox'],
    ['d13_sektor_bilgisi_5', 'Sektör Bilgisi: 5 puan (çok iyi)', 'checkbox'],
    ['d13_guvenilirlik_1', 'Güvenilirlik: 1 puan (çok kötü)', 'checkbox'],
    ['d13_guvenilirlik_2', 'Güvenilirlik: 2 puan (kötü)', 'checkbox'],
    ['d13_guvenilirlik_3', 'Güvenilirlik: 3 puan (vasat)', 'checkbox'],
    ['d13_guvenilirlik_4', 'Güvenilirlik: 4 puan (iyi)', 'checkbox'],
    ['d13_guvenilirlik_5', 'Güvenilirlik: 5 puan (çok iyi)', 'checkbox'],
    ['d13_yorum', 'Yorumunuz', 'textarea'],
    ['d13_musteri_ad', 'Müşteri Adı Soyadı / Unvan', 'text'],
    ['d13_musteri_tc', 'Müşteri T.C. Kimlik No / VKN', 'text'],
    ['d13_musteri_tel', 'Müşteri Telefon', 'text'],
    ['d13_musteri_eposta', 'Müşteri E-Posta', 'text'],
    ['d13_musteri_adres', 'Müşteri Adres', 'text'],
    ['d13_musteri_tarih', 'Müşteri İmza Tarihi', 'date'],
    ['d13_re_max_lavanda_ad', 'RE/MAX Lavanda (Gayrimenkul Danışmanı) Ad Soyad', 'text'],
    ['d13_re_max_lavanda_tarih', 'RE/MAX Lavanda İmza Tarihi', 'date'],
  ],
  'islem-raporu': [
    ['d14_i_slem_turu', 'İşlem Türü', 'text'],
    ['d14_i_slem_tarihi', 'İşlem Tarihi', 'date'],
    ['d14_i_lan_no', 'İlan No', 'text'],
    ['d14_satis_fiyati', 'Satış Fiyatı', 'text'],
    ['d14_kira_fiyati', 'Kira Fiyatı', 'text'],
    ['d14_komisyon_alici', 'Alıcı Komisyon', 'text'],
    ['d14_komisyon_satici', 'Satıcı Komisyon', 'text'],
    ['d14_komisyon_toplam', 'Toplam Komisyon', 'text'],
    ['d14_temsil_ettigi_musteri', 'Temsil Ettiği Müşteri', 'text'],
    ['d14_adres', 'Adres', 'text'],
    ['d14_yonlendirme_bilgileri', 'Yönlendirme Bilgileri', 'text'],
    ['d14_portfoy_sahibi_danisman', 'Portföy Sahibi Danışman', 'text'],
    ['d14_rapor_tarihi', 'Rapor Tarihi', 'date'],
    ['d14_duzenleyen_danisman_ad', 'Düzenleyen Danışman - Ad Soyad / Unvan', 'text'],
    ['d14_duzenleyen_danisman_tarih', 'Düzenleyen Danışman - Tarih', 'date'],
    ['d14_ofis_onayi_ad', 'Ofis Onayı (Broker) - Ad Soyad / Unvan', 'text'],
    ['d14_ofis_onayi_tarih', 'Ofis Onayı (Broker) - Tarih', 'date'],
  ],
  'hizmet-bedeli-alici': [
    ['d15_il', 'İl', 'text'],
    ['d15_ilce', 'İlçe', 'text'],
    ['d15_mahalle', 'Mahalle', 'text'],
    ['d15_ada', 'Ada', 'text'],
    ['d15_parsel', 'Parsel', 'text'],
    ['d15_adres', 'Gayrimenkul Adresi', 'text'],
    ['d15_taraf_ad', 'Alıcı - Adı Soyadı / Unvan', 'text'],
    ['d15_taraf_tc', 'Alıcı - T.C. / VKN', 'text'],
    ['d15_taraf_tel', 'Alıcı - Telefon', 'text'],
    ['d15_taraf_eposta', 'Alıcı - E-Posta', 'text'],
    ['d15_taraf_adres', 'Alıcı - Adres', 'text'],
    ['d15a_p_alan_1', 'Satış Bedeli (Rakamla, TL)', 'text'],
    ['d15a_p_alan_2', 'Satış Bedeli (Yazıyla)', 'text'],
    ['d15b_p_tarih_1', 'Hizmet Bedeli Ödeme Tarihi (Tapuda)', 'date'],
    ['d15b_p_alan_2', 'Hizmet Bedeli - %2 + KDV Tutarı (Rakamla, TL)', 'text'],
    ['d15b_p_alan_3', 'Hizmet Bedeli - %2 + KDV Tutarı (Yazıyla)', 'text'],
    ['d15_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d15_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d15_kapanis_tarih_1', 'Sözleşme Düzenlenme Tarihi', 'date'],
    ['d15_kapanis_alan_2', 'Nüsha Sayısı', 'text'],
    ['d15_alici_ad', 'Alıcı - İmza: Ad Soyad / Unvan', 'text'],
    ['d15_alici_tarih', 'Alıcı - İmza Tarihi', 'date'],
    ['d15_re_max_lavanda_ad', 'RE/MAX Lavanda Danışmanı - Ad Soyad / Unvan', 'text'],
    ['d15_re_max_lavanda_tarih', 'RE/MAX Lavanda Danışmanı - İmza Tarihi', 'date'],
  ],
  'hizmet-bedeli-satici': [
    ['d16_il', 'İl', 'text'],
    ['d16_ilce', 'İlçe', 'text'],
    ['d16_mahalle', 'Mahalle', 'text'],
    ['d16_ada', 'Ada', 'text'],
    ['d16_parsel', 'Parsel', 'text'],
    ['d16_adres', 'Gayrimenkul Adresi', 'text'],
    ['d16_taraf_ad', 'Satıcı - Adı Soyadı / Unvan', 'text'],
    ['d16_taraf_tc', 'Satıcı - T.C. / VKN', 'text'],
    ['d16_taraf_tel', 'Satıcı - Telefon', 'text'],
    ['d16_taraf_eposta', 'Satıcı - E-Posta', 'text'],
    ['d16_taraf_adres', 'Satıcı - Adres', 'text'],
    ['d16a_p_alan_1', 'Satış Bedeli (Rakamla, TL)', 'text'],
    ['d16a_p_alan_2', 'Satış Bedeli (Yazıyla)', 'text'],
    ['d16b_p_tarih_1', 'Hizmet Bedeli Ödeme Tarihi (Tapuda)', 'date'],
    ['d16b_p_alan_2', 'Hizmet Bedeli - %2 + KDV Tutarı (Rakamla, TL)', 'text'],
    ['d16b_p_alan_3', 'Hizmet Bedeli - %2 + KDV Tutarı (Yazıyla)', 'text'],
    ['d16_ozel_sart_1', 'Özel Şart 1', 'textarea'],
    ['d16_ozel_sart_2', 'Özel Şart 2', 'textarea'],
    ['d16_kapanis_tarih_1', 'Sözleşme Düzenlenme Tarihi', 'date'],
    ['d16_kapanis_alan_2', 'Nüsha Sayısı', 'text'],
    ['d16_satici_ad', 'Satıcı - İmza: Ad Soyad / Unvan', 'text'],
    ['d16_satici_tarih', 'Satıcı - İmza Tarihi', 'date'],
    ['d16_re_max_lavanda_ad', 'RE/MAX Lavanda Danışmanı - Ad Soyad / Unvan', 'text'],
    ['d16_re_max_lavanda_tarih', 'RE/MAX Lavanda Danışmanı - İmza Tarihi', 'date'],
  ],
}

const MOCK_DOCUMENT_FIELDS = MOCK_DOCUMENT_TEMPLATES.flatMap((template) =>
  (MOCK_DOCUMENT_FIELD_DEFS[template.slug] ?? []).map(([fieldKey, label, fieldType], index) => ({
    id: `doc-fld-${fieldKey}`,
    templateId: template.id,
    fieldKey,
    label,
    fieldType,
    required: false,
    sortOrder: index + 1,
  })),
)

const MOCK_DOCUMENT_INSTANCES = []

export const documentTemplates = {
  async list() {
    return delay(MOCK_DOCUMENT_TEMPLATES.filter((t) => t.isActive))
  },
}

export const documentFields = {
  async listByTemplate(templateId) {
    return delay(MOCK_DOCUMENT_FIELDS.filter((f) => f.templateId === templateId))
  },
}

export const documentInstances = {
  async list() {
    return delay([...MOCK_DOCUMENT_INSTANCES])
  },
  async get(id) {
    const row = MOCK_DOCUMENT_INSTANCES.find((i) => i.id === id)
    if (!row) throw new Error('Belge kaydı bulunamadı.')
    return delay({ ...row })
  },
  async create({ templateId, data }, userId) {
    const row = {
      id: `doc-inst-${Date.now()}`,
      templateId,
      createdBy: userId,
      data: data ?? {},
      status: 'draft',
      pdfStoragePath: null,
      downloadToken: null,
      downloadExpiresAt: null,
      lockedAt: null,
      createdAt: new Date().toISOString(),
    }
    MOCK_DOCUMENT_INSTANCES.unshift(row)
    return delay({ ...row })
  },
  async updateData(id, data) {
    const row = MOCK_DOCUMENT_INSTANCES.find((i) => i.id === id)
    if (!row) throw new Error('Belge kaydı bulunamadı.')
    if (row.lockedAt) throw new Error('Bu belge kilitlendi, değiştirilemez.')
    row.data = data
    return delay({ ...row })
  },
  async send(id, data) {
    const row = MOCK_DOCUMENT_INSTANCES.find((i) => i.id === id)
    if (!row) throw new Error('Belge kaydı bulunamadı.')
    row.data = data
    row.status = 'sent'
    return delay({ ...row })
  },
  async createShareLink(id) {
    const row = MOCK_DOCUMENT_INSTANCES.find((i) => i.id === id)
    if (!row) throw new Error('Belge kaydı bulunamadı.')
    row.fillToken = `mock-fill-${id}`
    row.fillExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    return delay({ ...row })
  },
  async remove(id) {
    const idx = MOCK_DOCUMENT_INSTANCES.findIndex((i) => i.id === id)
    if (idx !== -1) MOCK_DOCUMENT_INSTANCES.splice(idx, 1)
    return delay(null)
  },
  // Dev modda gerçek Vercel/Chromium yok — akışı test edebilmek için
  // kaydı sahte bir PDF yoluyla kilitler.
  async generatePdf(instanceId) {
    const row = MOCK_DOCUMENT_INSTANCES.find((i) => i.id === instanceId)
    if (!row) throw new Error('Belge kaydı bulunamadı.')
    row.status = 'completed'
    row.pdfStoragePath = `${instanceId}.pdf`
    row.downloadToken = `mock-token-${instanceId}`
    row.downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    row.lockedAt = new Date().toISOString()
    return delay({ downloadToken: row.downloadToken, downloadExpiresAt: row.downloadExpiresAt })
  },
}
