// Mock veri sağlayıcı — SADECE development'ta kullanılır (bkz. lib/env.js,
// production build'de bu dosya hiç çağrılmaz). Arayüz supabaseProvider.js
// ile birebir aynı: her fonksiyon aynı isim/parametre/dönüş şeklini taşır,
// böylece sayfalar hangi provider'ın aktif olduğunu bilmek zorunda kalmaz.

import { MOCK_OPPORTUNITIES } from '../../data/mockOpportunities'
import { MOCK_EVENTS, MOCK_ATTENDANCE } from '../../data/mockCalendarEvents'
import { MOCK_CHECKLIST_ITEMS, MOCK_CHECKLIST_STATUS } from '../../data/mockEducation'
import { MOCK_CALLS } from '../../data/mockCallLogs'
import { MOCK_LEADS } from '../../data/mockLeads'
import { MOCK_RECRUITING_CANDIDATES, MOCK_RECRUITING_NOTES } from '../../data/mockRecruiting'
import { MOCK_TASKS } from '../../data/mockTasks'
import { MOCK_COACHING_NOTES } from '../../data/mockCoachingNotes'
import { MOCK_DOCS, MOCK_DOC_VERSIONS } from '../../data/mockDocs'
import { MOCK_CATEGORIES } from '../../data/mockCategories'
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

// addScore(ciro)/removeCiroGiris ve logSocialActivity/removeSocialActivity
// ORTAK — bkz. supabaseProvider.js'teki recomputeCiroTotal/recomputeSocialTotal.
// Son satış/giriş de silinince toplam satırı da silinir — bkz.
// supabaseProvider.js'teki aynı isimli fonksiyonlardaki not.
function recomputeMockCiroTotal(userId, periodId) {
  const now = new Date().toISOString()
  const rows = MOCK_CIRO_GIRISLERI.filter((g) => g.userId === userId && g.periodId === periodId)
  const existingIndex = MOCK_SCORES.findIndex((s) => s.userId === userId && s.type === 'ciro' && s.periodId === periodId)
  if (rows.length === 0) {
    if (existingIndex !== -1) MOCK_SCORES.splice(existingIndex, 1)
    return
  }
  const total = rows.reduce((sum, g) => sum + Number(g.value), 0)
  if (existingIndex !== -1) {
    MOCK_SCORES[existingIndex].value = total
    MOCK_SCORES[existingIndex].updatedAt = now
  } else {
    MOCK_SCORES.push({ userId, periodId, type: 'ciro', value: total, updatedAt: now })
  }
}

function recomputeMockSocialTotal(userId, periodId) {
  const now = new Date().toISOString()
  const logs = MOCK_ACTIVITY_LOG.filter((l) => l.userId === userId && l.periodId === periodId)
  const existingIndex = MOCK_SCORES.findIndex((s) => s.userId === userId && s.type === 'sosyal_medya' && s.periodId === periodId)
  if (logs.length === 0) {
    if (existingIndex !== -1) MOCK_SCORES.splice(existingIndex, 1)
    return
  }
  const total = logs.reduce((sum, l) => sum + l.adet * (MOCK_ACTIVITY_TYPES.find((t) => t.id === l.activityTypeId)?.puan ?? 0), 0)
  if (existingIndex !== -1) {
    MOCK_SCORES[existingIndex].value = total
    MOCK_SCORES[existingIndex].updatedAt = now
  } else {
    MOCK_SCORES.push({ userId, periodId, type: 'sosyal_medya', value: total, updatedAt: now })
  }
}

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
    // bkz. supabaseProvider.create() — tip (satıcı/alıcı) hangi fiyat
    // alanının geçerli olduğunu belirler, gizlenen alan burada da
    // temizlenir (opportunities_fiyat_tip_tutarliligi CHECK'iyle aynı kural).
    const isAlici = payload.type === 'alici'
    const row = {
      id: `opp-${Date.now()}`,
      ...payload,
      fiyat: isAlici ? null : (payload.fiyat ?? null),
      fiyatMin: isAlici ? (payload.fiyatMin ?? null) : null,
      fiyatMax: isAlici ? (payload.fiyatMax ?? null) : null,
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
    // bkz. create() — tip değişiyorsa ilgisiz fiyat alanı burada da temizlenir.
    if ('type' in patch) {
      if (patch.type === 'alici') row.fiyat = null
      else {
        row.fiyatMin = null
        row.fiyatMax = null
      }
    }
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
  // supabaseProvider.reassignOpen() ile birebir aynı davranış.
  async reassignOpen(fromUserId, toUserId) {
    const now = new Date().toISOString()
    for (const row of MOCK_OPPORTUNITIES) {
      if (row.status !== 'acik' && row.status !== 'claimed') continue
      if (row.ownerId === fromUserId) {
        row.ownerId = toUserId
        row.oncekiSahipId = fromUserId
        row.devirTarihi = now
      }
      if (row.claimerId === fromUserId) {
        row.claimerId = toUserId
        row.oncekiSahipId = fromUserId
        row.devirTarihi = now
      }
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

// --- Education (Checklist) ----------------------------------------------
// Power Camp modülleri/rozetleri kaldırıldı (2026-10-07, broker kararı —
// "işimize yaramıyor, süreç içine dahil edeceğim"). Sadece süreç/ayrılış
// checklist'i kaldı.
export const education = {
  async listChecklistItems() {
    return delay([...MOCK_CHECKLIST_ITEMS])
  },
  async listChecklistStatus() {
    return delay([...MOCK_CHECKLIST_STATUS])
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
  async updateChecklistItem(itemId, baslik) {
    const item = MOCK_CHECKLIST_ITEMS.find((i) => i.id === itemId)
    if (item) item.baslik = baslik
    return delay({ ...item })
  },
  // supabaseProvider.deleteChecklistItem() ile aynı davranış —
  // onboarding_checklist_status'taki satırlar "on delete cascade" ile
  // gerçek DB'de otomatik silinir, mock'ta da aynı şekilde elle temizleniyor.
  async deleteChecklistItem(itemId) {
    const idx = MOCK_CHECKLIST_ITEMS.findIndex((i) => i.id === itemId)
    if (idx !== -1) MOCK_CHECKLIST_ITEMS.splice(idx, 1)
    for (let i = MOCK_CHECKLIST_STATUS.length - 1; i >= 0; i--) {
      if (MOCK_CHECKLIST_STATUS[i].itemId === itemId) MOCK_CHECKLIST_STATUS.splice(i, 1)
    }
    return delay(null)
  },
}

// --- Call logs (Operasyon) ---------------------------------------------------
export const callLogs = {
  async list() {
    return delay([...MOCK_CALLS])
  },
  // supabaseProvider.listSummary() ile AYNI arayüz — Panel açılışında
  // kullanılıyor (bkz. o dosyadaki not).
  async listSummary() {
    return delay(
      MOCK_CALLS.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        assignedTo: c.assignedTo,
        donusYapildiMi: c.donusYapildiMi,
        portfoyAlindiMi: c.portfoyAlindiMi,
        satildiMi: c.satildiMi,
        kaynak: c.kaynak,
        reklamKodu: c.reklamKodu,
        portfoyTalebiMi: c.portfoyTalebiMi,
        arayanAd: c.arayanAd,
        arayanTelefon: c.arayanTelefon,
      })),
    )
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
  // supabaseProvider.reassignPending() ile birebir aynı davranış.
  async reassignPending(callIds, toUserId, fromUserId) {
    const now = new Date().toISOString()
    for (const row of MOCK_CALLS) {
      if (callIds.includes(row.id)) {
        row.assignedTo = toUserId
        row.oncekiSahipId = fromUserId
        row.devirTarihi = now
      }
    }
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
      olumsuzSebebi: form.olumsuzSebebi ?? null,
      kayitTipi: form.kaynakLeadId ? 'lead' : 'manuel',
      yenidenAktifAt: null,
      aciklama: form.aciklama || null,
      reklamAdi: sourceLead?.reklamAdi ?? null,
      kampanyaKodu: sourceLead?.kampanyaKodu ?? null,
      sorumluId: form.sorumluId || null,
      ilkGorusmeTarihi: null,
      sonucTarihi: null,
    }
    MOCK_RECRUITING_CANDIDATES.unshift(row)
    return delay(row)
  },
  async update(id, patch) {
    const row = MOCK_RECRUITING_CANDIDATES.find((c) => c.id === id)
    if (!row) throw new Error('Aday bulunamadı.')
    // Gerçek Supabase'teki stamp_recruiting_milestone_dates trigger'ıyla
    // AYNI mantık, burada elle — mock modda DB trigger'ı yok (bkz.
    // migration 20261006100000 notu).
    if ('durum' in patch && patch.durum !== row.durum) {
      const gorusmeDurumlari = ['ilk_gorusme', 'ikinci_gorusme', 'olumlu']
      if (gorusmeDurumlari.includes(patch.durum) && !gorusmeDurumlari.includes(row.durum) && !row.ilkGorusmeTarihi) {
        row.ilkGorusmeTarihi = new Date().toISOString()
      }
      if (['olumlu', 'olumsuz', 'yanlis_basvuru'].includes(patch.durum)) {
        row.sonucTarihi = new Date().toISOString()
      }
    }
    Object.assign(row, patch)
    return delay({ ...row })
  },
  // Görüşme notları günlüğü — açıklama alanından AYRI, birikimli (bkz.
  // mockRecruiting.js notu). listNotes() TÜM adayların notlarını döner
  // (candidates ile aynı desen), sayfa tarafında candidateId'ye göre
  // filtrelenir — hem kart rozetindeki sayı hem detaydaki liste aynı
  // veriden türer.
  async listNotes() {
    return delay([...MOCK_RECRUITING_NOTES].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  },
  async addNote({ candidateId, notMetni }, createdBy) {
    const row = { id: Date.now(), candidateId, notMetni, createdBy, createdAt: new Date().toISOString() }
    MOCK_RECRUITING_NOTES.unshift(row)
    return delay(row)
  },
  async deleteNote(id) {
    const idx = MOCK_RECRUITING_NOTES.findIndex((n) => n.id === id)
    if (idx !== -1) MOCK_RECRUITING_NOTES.splice(idx, 1)
    return delay({ id })
  },
}

// --- Categories (Rehber klasörleri) --------------------------------------
export const categories = {
  async list(module) {
    return delay(
      MOCK_CATEGORIES.filter((c) => c.module === module).sort((a, b) => a.sortOrder - b.sortOrder),
    )
  },
  async create({ module, key, label, sortOrder, visibility, parentId }) {
    const row = {
      id: `cat-${Date.now()}`,
      module,
      key,
      label,
      sortOrder,
      isActive: true,
      visibility: visibility ?? 'herkes',
      parentId: parentId ?? null,
    }
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

// --- League (Lig) --------------------------------------------------------------
export const league = {
  async getPeriod() {
    return delay({ ...MOCK_PERIODS[MOCK_PERIODS.length - 1] })
  },
  async listPeriods() {
    return delay([...MOCK_PERIODS].sort((a, b) => new Date(b.baslangic) - new Date(a.baslangic)))
  },
  async createPeriod({ ad, baslangic, bitis }) {
    const period = { id: `period-${Date.now()}`, ad, baslangic, bitis, durum: 'acik' }
    MOCK_PERIODS.push(period)
    return delay({ ...period })
  },
  async announcePeriod(id) {
    const period = MOCK_PERIODS.find((p) => p.id === id)
    if (!period) throw new Error('Dönem bulunamadı.')
    period.durum = 'aciklandi'
    return delay({ ...period })
  },
  async listScores() {
    return delay([...MOCK_SCORES])
  },
  async addScore({ userId, type, value, tarih }, enteredBy) {
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
        enteredBy,
        createdAt: now,
      })
      recomputeMockCiroTotal(userId, period.id)
      return delay({ userId, periodId: period.id, type })
    }

    const existing = MOCK_SCORES.find((s) => s.userId === userId && s.type === type && s.periodId === period.id)
    if (existing) {
      existing.value = numValue
      existing.updatedAt = now
    } else {
      MOCK_SCORES.push({ userId, periodId: period.id, type, value: numValue, enteredBy, updatedAt: now })
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

    recomputeMockSocialTotal(userId, period.id)
    return delay({ userId, periodId: period.id })
  },
  async removeCiroGiris(id) {
    const row = MOCK_CIRO_GIRISLERI.find((g) => g.id === id)
    if (!row) throw new Error('Kayıt bulunamadı.')
    const index = MOCK_CIRO_GIRISLERI.indexOf(row)
    MOCK_CIRO_GIRISLERI.splice(index, 1)
    recomputeMockCiroTotal(row.userId, row.periodId)
    return delay({ id })
  },
  async removeSocialActivity(id) {
    const row = MOCK_ACTIVITY_LOG.find((l) => l.id === id)
    if (!row) throw new Error('Kayıt bulunamadı.')
    const index = MOCK_ACTIVITY_LOG.indexOf(row)
    MOCK_ACTIVITY_LOG.splice(index, 1)
    recomputeMockSocialTotal(row.userId, row.periodId)
    return delay({ id })
  },
}

// --- Ciro Raporu (danışman kendi ciro/fatura raporunu girer, broker
// onaylar — eski "Ciro Gir" akışının YERİNE geçti) --------------------------
const ciroRaporuDaysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
const MOCK_CIRO_RAPORLARI = [
  {
    id: 'cr-1',
    opportunityId: 'opp-1',
    islemTipi: 'satis',
    islemTutari: 1000000,
    islemTarihi: ciroRaporuDaysAgo(10).slice(0, 10),
    durum: 'onay_bekliyor',
    redSebebi: null,
    olusturanId: 'u-danisman',
    onaylayanId: null,
    onayTarihi: null,
    notlar: null,
    createdAt: ciroRaporuDaysAgo(10),
    updatedAt: ciroRaporuDaysAgo(10),
  },
]
const MOCK_CIRO_RAPORU_KATILIMCILARI = [
  {
    id: 'crk-1',
    ciroRaporuId: 'cr-1',
    danismanId: 'u-danisman',
    payOrani: 100,
    anlasmaOraniSnapshot: 48,
    komisyonTutariOnerisi: 480000,
    faturaNo: null,
    faturaTarihi: null,
    faturaTutari: null,
    kdvOrani: null,
    kdvHaricTutar: null,
    vergiNo: null,
    faturaDosyaUrl: null,
    odemeDurumu: 'bekliyor',
    notlar: null,
  },
]

function mockCiroRaporuWithKatilimcilar(r) {
  return { ...r, katilimcilar: MOCK_CIRO_RAPORU_KATILIMCILARI.filter((k) => k.ciroRaporuId === r.id) }
}

// Cari Hesap (danışman borç/alacak defteri) + İşlem Masrafları — Ciro
// Raporu onaylanınca/fatura girilince ve masraf/aylık ofis faturası
// kaydedilince otomatik beslenir (bkz. approve()/updateKatilimciFatura()
// aşağıda ve islemMasraflari.create()).
const MOCK_CARI_HAREKETLER = [
  {
    id: 'ch-1',
    danismanId: 'u-danisman',
    tarih: ciroRaporuDaysAgo(5).slice(0, 10),
    tur: 'borc',
    tutar: 3000,
    kategori: 'sahibinden_bedeli',
    aciklama: 'Ekim ayı sahibinden.com ilan bedeli',
    kaynakTip: 'manuel',
    kaynakId: null,
    durum: 'acik',
    createdBy: 'u-broker',
    createdAt: ciroRaporuDaysAgo(5),
  },
]
const MOCK_ISLEM_MASRAFLARI = []

export const ciroRaporlari = {
  async list() {
    return delay(MOCK_CIRO_RAPORLARI.map(mockCiroRaporuWithKatilimcilar).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  },
  async create(
    {
      opportunityId,
      islemTipi,
      islemTutari,
      islemTarihi,
      notlar,
      portfoyTipi,
      disBeyanKodu,
      saticiHizmetBedeliAlindi,
      saticiAdSoyad,
      saticiTelefon,
      saticiKimlikNo,
      saticiHizmetBedeli,
      saticiEkHizmetBedeli,
      aliciHizmetBedeliAlindi,
      aliciAdSoyad,
      aliciTelefon,
      aliciKimlikNo,
      aliciHizmetBedeli,
      aliciEkHizmetBedeli,
      katilimcilar,
    },
    olusturanId,
  ) {
    const now = new Date().toISOString()
    const rapor = {
      id: `cr-${Date.now()}`,
      opportunityId: opportunityId || null,
      islemTipi,
      islemTutari: Number(islemTutari),
      islemTarihi,
      durum: 'taslak',
      redSebebi: null,
      olusturanId,
      onaylayanId: null,
      onayTarihi: null,
      notlar: notlar || null,
      createdAt: now,
      updatedAt: now,
      portfoyTipi: portfoyTipi ?? 'portfoyum',
      disBeyanKodu: disBeyanKodu || null,
      saticiHizmetBedeliAlindi: !!saticiHizmetBedeliAlindi,
      saticiAdSoyad: saticiHizmetBedeliAlindi ? saticiAdSoyad || null : null,
      saticiTelefon: saticiHizmetBedeliAlindi ? saticiTelefon || null : null,
      saticiKimlikNo: saticiHizmetBedeliAlindi ? saticiKimlikNo || null : null,
      saticiHizmetBedeli: saticiHizmetBedeliAlindi ? (saticiHizmetBedeli ?? null) : null,
      saticiEkHizmetBedeli: saticiHizmetBedeliAlindi ? (saticiEkHizmetBedeli ?? null) : null,
      aliciHizmetBedeliAlindi: !!aliciHizmetBedeliAlindi,
      aliciAdSoyad: aliciHizmetBedeliAlindi ? aliciAdSoyad || null : null,
      aliciTelefon: aliciHizmetBedeliAlindi ? aliciTelefon || null : null,
      aliciKimlikNo: aliciHizmetBedeliAlindi ? aliciKimlikNo || null : null,
      aliciHizmetBedeli: aliciHizmetBedeliAlindi ? (aliciHizmetBedeli ?? null) : null,
      aliciEkHizmetBedeli: aliciHizmetBedeliAlindi ? (aliciEkHizmetBedeli ?? null) : null,
    }
    MOCK_CIRO_RAPORLARI.unshift(rapor)
    katilimcilar.forEach((k, i) => {
      MOCK_CIRO_RAPORU_KATILIMCILARI.push({
        id: `crk-${Date.now()}-${i}`,
        ciroRaporuId: rapor.id,
        danismanId: k.danismanId,
        payOrani: Number(k.payOrani),
        anlasmaOraniSnapshot: k.anlasmaOraniSnapshot ?? null,
        komisyonTutariOnerisi: k.komisyonTutariOnerisi ?? null,
        faturaNo: null,
        faturaTarihi: null,
        faturaTutari: null,
        kdvOrani: null,
        kdvHaricTutar: null,
        vergiNo: null,
        faturaDosyaUrl: null,
        odemeDurumu: 'bekliyor',
        notlar: null,
        gdCirosu: k.gdCirosu ?? null,
        rtPayOraniSnapshot: k.rtPayOraniSnapshot ?? null,
        rtPayiTutari: k.rtPayiTutari ?? null,
        ofisPayiTutari: k.ofisPayiTutari ?? null,
      })
    })
    return delay(mockCiroRaporuWithKatilimcilar(rapor))
  },
  async update(id, { islemTipi, islemTutari, islemTarihi, notlar }) {
    const rapor = MOCK_CIRO_RAPORLARI.find((r) => r.id === id)
    if (!rapor) throw new Error('Rapor bulunamadı.')
    Object.assign(rapor, { islemTipi, islemTutari: Number(islemTutari), islemTarihi, notlar: notlar || null, updatedAt: new Date().toISOString() })
    return delay(mockCiroRaporuWithKatilimcilar(rapor))
  },
  async submit(id) {
    const rapor = MOCK_CIRO_RAPORLARI.find((r) => r.id === id)
    if (!rapor) throw new Error('Rapor bulunamadı.')
    rapor.durum = 'onay_bekliyor'
    return delay({ id })
  },
  async updateKatilimciFatura(id, patch) {
    const row = MOCK_CIRO_RAPORU_KATILIMCILARI.find((k) => k.id === id)
    if (!row) throw new Error('Katılımcı bulunamadı.')
    Object.assign(row, patch)
    // Çalışan Payı (fatura) veya RT Payı değiştiyse, Ofis Payı (hep kalan)
    // yeniden hesaplanır — üçü GD Cirosu'na eşit kalsın garantisi burada
    // (bkz. supabaseProvider.js'deki aynı mantık).
    if (('faturaTutari' in patch || 'rtPayiTutari' in patch) && row.gdCirosu != null) {
      row.ofisPayiTutari = Number(row.gdCirosu) - Number(row.faturaTutari || 0) - Number(row.rtPayiTutari || 0)
    }
    // Cari Hesap senkronu: approve()'da bu katılımcı için bir "alacak"
    // satırı oluşmuşsa (kaynakId=katilimci.id), fatura tutarı/ödeme
    // durumu değişince o satır da güncellenir.
    const cariSatir = MOCK_CARI_HAREKETLER.find((c) => c.kaynakTip === 'ciro_raporu_katilimcisi' && c.kaynakId === id)
    if (cariSatir) {
      if ('faturaTutari' in patch && patch.faturaTutari != null) cariSatir.tutar = Number(patch.faturaTutari)
      if ('odemeDurumu' in patch) cariSatir.durum = patch.odemeDurumu === 'alindi' ? 'kapandi' : 'acik'
    }
    return delay({ ...row })
  },
  async approve(id, approverId) {
    const rapor = MOCK_CIRO_RAPORLARI.find((r) => r.id === id)
    if (!rapor) throw new Error('Rapor bulunamadı.')
    const katilimcilar = MOCK_CIRO_RAPORU_KATILIMCILARI.filter((k) => k.ciroRaporuId === id)
    for (const k of katilimcilar) {
      const value = Number(rapor.islemTutari) * (Number(k.payOrani) / 100)
      await league.addScore({ userId: k.danismanId, type: 'ciro', value, tarih: rapor.islemTarihi }, approverId)
    }
    rapor.durum = 'onaylandi'
    rapor.onaylayanId = approverId
    rapor.onayTarihi = new Date().toISOString()
    // Cari Hesap: her katılımcı için hak ediş kadar "alacak" satırı.
    katilimcilar.forEach((k, i) => {
      const tutar = Number(k.faturaTutari ?? k.komisyonTutariOnerisi ?? 0)
      if (tutar <= 0) return
      MOCK_CARI_HAREKETLER.push({
        id: `ch-${Date.now()}-${i}`,
        danismanId: k.danismanId,
        tarih: rapor.islemTarihi,
        tur: 'alacak',
        tutar,
        kategori: 'hizmet_bedeli',
        aciklama: null,
        kaynakTip: 'ciro_raporu_katilimcisi',
        kaynakId: k.id,
        durum: 'acik',
        createdBy: approverId,
        createdAt: new Date().toISOString(),
      })
    })
    return delay({ id })
  },
  async reject(id, redSebebi) {
    const rapor = MOCK_CIRO_RAPORLARI.find((r) => r.id === id)
    if (!rapor) throw new Error('Rapor bulunamadı.')
    rapor.durum = 'reddedildi'
    rapor.redSebebi = redSebebi
    return delay({ id })
  },
}

// --- Danışman Anlaşmaları (komisyon paylaşım oranı, tarih aralıklı) --------
const MOCK_DANISMAN_ANLASMALARI = [
  { id: 'da-1', danismanId: 'u-danisman', paylasimOrani: 48, rtPayOrani: 6, gecerlilikBaslangic: '2026-01-01', gecerlilikBitis: null, createdBy: 'u-broker', createdAt: ciroRaporuDaysAgo(200) },
]

export const danismanAnlasmalari = {
  async list() {
    return delay([...MOCK_DANISMAN_ANLASMALARI].sort((a, b) => new Date(b.gecerlilikBaslangic) - new Date(a.gecerlilikBaslangic)))
  },
  async create({ danismanId, paylasimOrani, rtPayOrani, gecerlilikBaslangic }, createdBy) {
    const acikSatir = MOCK_DANISMAN_ANLASMALARI.find((a) => a.danismanId === danismanId && !a.gecerlilikBitis)
    if (acikSatir) {
      acikSatir.gecerlilikBitis = new Date(new Date(gecerlilikBaslangic).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    }
    const row = {
      id: `da-${Date.now()}`,
      danismanId,
      paylasimOrani: Number(paylasimOrani),
      rtPayOrani: rtPayOrani == null || rtPayOrani === '' ? null : Number(rtPayOrani),
      gecerlilikBaslangic,
      gecerlilikBitis: null,
      createdBy,
      createdAt: new Date().toISOString(),
    }
    MOCK_DANISMAN_ANLASMALARI.unshift(row)
    return delay(row)
  },
}

// --- Banka Hareketleri (Vakıfbank API bağlanana kadar elle giriş +
// Ciro Raporu ödemeleriyle eşleştirme) --------------------------------------
const MOCK_BANKA_HAREKETLERI = [
  {
    id: 'bh-1',
    tutar: 480000,
    tarih: ciroRaporuDaysAgo(2).slice(0, 10),
    gonderenAdi: 'Mehmet Demir',
    aciklama: 'EFT',
    referansNo: null,
    kaynak: 'manuel',
    durum: 'eslesmedi',
    tip: 'giris',
    opportunityId: null,
    ustHareketId: null,
    tur: 'diger',
    mahsupTutari: null,
    eslesenKatilimciId: null,
    eslestirenId: null,
    eslesmeTarihi: null,
    olusturanId: 'u-broker',
    createdAt: ciroRaporuDaysAgo(2),
  },
  {
    id: 'bh-2',
    tutar: 300000,
    tarih: ciroRaporuDaysAgo(1).slice(0, 10),
    gonderenAdi: 'Ayşe Şahin',
    aciklama: 'Bağlanma parası',
    referansNo: null,
    kaynak: 'manuel',
    durum: 'blokede',
    tip: 'giris',
    opportunityId: 'opp-1',
    ustHareketId: null,
    tur: 'baglanma_parasi',
    mahsupTutari: null,
    eslesenKatilimciId: null,
    eslestirenId: null,
    eslesmeTarihi: null,
    olusturanId: 'u-broker',
    createdAt: ciroRaporuDaysAgo(1),
  },
]

function mockCariSatiriKapat(katilimciId, kapat) {
  const satir = MOCK_CARI_HAREKETLER.find((c) => c.kaynakTip === 'ciro_raporu_katilimcisi' && c.kaynakId === katilimciId)
  if (satir) satir.durum = kapat ? 'kapandi' : 'acik'
}

export const bankaHareketleri = {
  async list() {
    return delay([...MOCK_BANKA_HAREKETLERI].sort((a, b) => new Date(b.tarih) - new Date(a.tarih)))
  },
  async create({ tutar, tarih, gonderenAdi, aciklama, referansNo, opportunityId, bloke }, olusturanId) {
    const row = {
      id: `bh-${Date.now()}`,
      tutar: Number(tutar),
      tarih,
      gonderenAdi: gonderenAdi || null,
      aciklama: aciklama || null,
      referansNo: referansNo || null,
      kaynak: 'manuel',
      tip: 'giris',
      opportunityId: opportunityId || null,
      ustHareketId: null,
      tur: bloke ? 'baglanma_parasi' : 'diger',
      mahsupTutari: null,
      durum: bloke ? 'blokede' : 'eslesmedi',
      eslesenKatilimciId: null,
      eslestirenId: null,
      eslesmeTarihi: null,
      olusturanId,
      createdAt: new Date().toISOString(),
    }
    MOCK_BANKA_HAREKETLERI.unshift(row)
    return delay(row)
  },
  async eslestir(hareketId, katilimciId, eslestirenId) {
    const hareket = MOCK_BANKA_HAREKETLERI.find((h) => h.id === hareketId)
    if (!hareket) throw new Error('Hareket bulunamadı.')
    hareket.durum = 'eslesti'
    hareket.eslesenKatilimciId = katilimciId
    hareket.eslestirenId = eslestirenId
    hareket.eslesmeTarihi = new Date().toISOString()
    const katilimci = MOCK_CIRO_RAPORU_KATILIMCILARI.find((k) => k.id === katilimciId)
    if (katilimci) katilimci.odemeDurumu = 'alindi'
    mockCariSatiriKapat(katilimciId, true)
    return delay({ id: hareketId })
  },
  async eslesmeyiKaldir(hareketId) {
    const hareket = MOCK_BANKA_HAREKETLERI.find((h) => h.id === hareketId)
    if (!hareket) throw new Error('Hareket bulunamadı.')
    const katilimci = MOCK_CIRO_RAPORU_KATILIMCILARI.find((k) => k.id === hareket.eslesenKatilimciId)
    if (katilimci) katilimci.odemeDurumu = 'bekliyor'
    mockCariSatiriKapat(hareket.eslesenKatilimciId, false)
    hareket.durum = 'eslesmedi'
    hareket.eslesenKatilimciId = null
    hareket.eslestirenId = null
    hareket.eslesmeTarihi = null
    return delay({ id: hareketId })
  },
  // Bloke (bağlanma parası) çözümleme — 4 senaryo, bkz. supabaseProvider.js
  // aynı adlı fonksiyondaki açıklama.
  async blokeyiCozumle(blokeId, { aksiyon, katilimciId, mahsupTutari, aliciAdi }, kullaniciId) {
    const bloke = MOCK_BANKA_HAREKETLERI.find((h) => h.id === blokeId)
    if (!bloke) throw new Error('Bloke kaydı bulunamadı.')
    const mahsupVar = aksiyon === 'mahsup_et' || aksiyon === 'kismi_mahsup'
    const cikisVar = aksiyon === 'geri_gonder' || aksiyon === 'saticiya_gonder' || aksiyon === 'kismi_mahsup'
    const gercekMahsup = aksiyon === 'mahsup_et' ? Number(bloke.tutar) : Number(mahsupTutari || 0)
    const cikisTutari = aksiyon === 'kismi_mahsup' ? Number(bloke.tutar) - gercekMahsup : Number(bloke.tutar)

    if (mahsupVar && katilimciId) {
      const katilimci = MOCK_CIRO_RAPORU_KATILIMCILARI.find((k) => k.id === katilimciId)
      if (katilimci) katilimci.odemeDurumu = 'alindi'
      mockCariSatiriKapat(katilimciId, true)
    }
    if (cikisVar && cikisTutari > 0) {
      MOCK_BANKA_HAREKETLERI.unshift({
        id: `bh-${Date.now()}`,
        tutar: cikisTutari,
        tarih: new Date().toISOString().slice(0, 10),
        gonderenAdi: aliciAdi || null,
        aciklama: aksiyon === 'saticiya_gonder' ? 'Satıcıya gönderim' : 'Geri gönderim',
        referansNo: null,
        kaynak: 'manuel',
        tip: 'cikis',
        opportunityId: null,
        ustHareketId: blokeId,
        tur: 'diger',
        mahsupTutari: null,
        durum: 'eslesti',
        eslesenKatilimciId: null,
        eslestirenId: null,
        eslesmeTarihi: null,
        olusturanId: kullaniciId,
        createdAt: new Date().toISOString(),
      })
    }
    bloke.durum = 'cozuldu'
    bloke.eslesenKatilimciId = mahsupVar ? katilimciId : null
    bloke.mahsupTutari = aksiyon === 'kismi_mahsup' ? gercekMahsup : null
    bloke.eslestirenId = kullaniciId
    bloke.eslesmeTarihi = new Date().toISOString()
    return delay({ id: blokeId })
  },
}

export const cariHareketler = {
  async list() {
    return delay([...MOCK_CARI_HAREKETLER].sort((a, b) => new Date(b.tarih) - new Date(a.tarih)))
  },
  async create({ danismanId, tarih, tur, tutar, kategori, aciklama }, createdBy) {
    const row = {
      id: `ch-${Date.now()}`,
      danismanId,
      tarih,
      tur,
      tutar: Number(tutar),
      kategori,
      aciklama: aciklama || null,
      kaynakTip: 'manuel',
      kaynakId: null,
      durum: 'acik',
      createdBy,
      createdAt: new Date().toISOString(),
    }
    MOCK_CARI_HAREKETLER.unshift(row)
    return delay(row)
  },
}

export const islemMasraflari = {
  async list(ciroRaporuId) {
    return delay(MOCK_ISLEM_MASRAFLARI.filter((m) => m.ciroRaporuId === ciroRaporuId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  },
  async create({ ciroRaporuId, danismanId, tur, aciklama, tutar }, createdBy) {
    const row = {
      id: `im-${Date.now()}`,
      ciroRaporuId,
      danismanId: danismanId || null,
      tur,
      aciklama: aciklama || null,
      tutar: Number(tutar),
      createdBy,
      createdAt: new Date().toISOString(),
    }
    MOCK_ISLEM_MASRAFLARI.unshift(row)
    if (danismanId) {
      const rapor = MOCK_CIRO_RAPORLARI.find((r) => r.id === ciroRaporuId)
      MOCK_CARI_HAREKETLER.unshift({
        id: `ch-${Date.now()}-m`,
        danismanId,
        tarih: rapor?.islemTarihi ?? new Date().toISOString().slice(0, 10),
        tur: 'borc',
        tutar: Number(tutar),
        kategori: 'islem_masrafi',
        aciklama: aciklama || null,
        kaynakTip: 'islem_masrafi',
        kaynakId: row.id,
        durum: 'acik',
        createdBy,
        createdAt: new Date().toISOString(),
      })
    }
    return delay(row)
  },
}

// --- Users -------------------------------------------------------------------
// Ayarlar > Kullanıcılar'dan mock modda eklenen/düzenlenen kullanıcılar —
// MOCK_USERS/OTHER_USERS sabit dev hesapları olduğu için ayrı tutuluyor.
const MOCK_EXTRA_USERS = []
const MOCK_PRIVATE_INFO = {}
// endpoint benzersiz — supabaseProvider.savePushSubscription() ile aynı
// kural: aynı cihaz tekrar abone olursa üstüne yazılır, ikinci satır olmaz.
const MOCK_PUSH_SUBSCRIPTIONS = []
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
  async createUser({ ad, email, password: _password, rol, telefon, kaynak }) {
    const created = {
      id: `mock-user-${Date.now()}`,
      name: ad,
      email,
      telefon: telefon || null,
      role: rol,
      kaynak: kaynak || null,
      durum: 'aktif',
      createdAt: new Date().toISOString(),
    }
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
  async touchActivity() {
    return delay(null)
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
  // akışı test edilebilir olsun diye state'i in-memory tutuyoruz (bkz.
  // MOCK_PUSH_SUBSCRIPTIONS) — supabaseProvider.savePushSubscription() ile
  // aynı kural: endpoint benzersiz, tekrar abone olunca üstüne yazılır.
  async savePushSubscription(subscription, userId) {
    const idx = MOCK_PUSH_SUBSCRIPTIONS.findIndex((s) => s.endpoint === subscription.endpoint)
    const row = { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
    if (idx !== -1) MOCK_PUSH_SUBSCRIPTIONS[idx] = row
    else MOCK_PUSH_SUBSCRIPTIONS.push(row)
    return delay(null)
  },
  async removePushSubscription(endpoint) {
    const idx = MOCK_PUSH_SUBSCRIPTIONS.findIndex((s) => s.endpoint === endpoint)
    if (idx !== -1) MOCK_PUSH_SUBSCRIPTIONS.splice(idx, 1)
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

// --- Mentor Primi (Ayarlar, sadece broker) ----------------------------------
// supabaseProvider.mentorPrimi ile aynı şekil — mentor_primi_baslangic
// tablosunun mock karşılığı. 'u-danisman' bilerek izlenen bir danışman
// olarak seed'lendi (ciro girişleri MOCK_CIRO_GIRISLERI'nde zaten var),
// diğerleri BİLEREK boş — "henüz başlangıç tarihi atanmamış" satırını da
// test edebilmek için (bkz. MentorPrimiPanel).
const MOCK_MENTOR_PRIMI_BASLANGIC = [
  { userId: 'u-danisman', baslangicTarihi: usersDaysAgo(60).slice(0, 10), setBy: 'u-broker', updatedAt: usersDaysAgo(60) },
]

export const mentorPrimi = {
  async listBaslangicTarihleri() {
    return delay([...MOCK_MENTOR_PRIMI_BASLANGIC])
  },
  async upsertBaslangicTarihi(userId, baslangicTarihi, setBy) {
    const existing = MOCK_MENTOR_PRIMI_BASLANGIC.find((r) => r.userId === userId)
    if (existing) {
      existing.baslangicTarihi = baslangicTarihi
      existing.setBy = setBy
      existing.updatedAt = new Date().toISOString()
    } else {
      MOCK_MENTOR_PRIMI_BASLANGIC.push({ userId, baslangicTarihi, setBy, updatedAt: new Date().toISOString() })
    }
    return delay({ userId, baslangicTarihi })
  },
  async removeBaslangicTarihi(userId) {
    const idx = MOCK_MENTOR_PRIMI_BASLANGIC.findIndex((r) => r.userId === userId)
    if (idx !== -1) MOCK_MENTOR_PRIMI_BASLANGIC.splice(idx, 1)
    return delay(null)
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
  // supabaseProvider.auditLog.logDusukPuanAtama() ile aynı şekil — mock
  // modda gerçek auth.uid() olmadığı için actorId çağıran taraftan (useAuth
  // user.id) elle geçiriliyor, aynı coachingNotes.create() deseni.
  async logDusukPuanAtama({ tablo, kayitId, danismanId, gerekce, actorId }) {
    if (!gerekce || gerekce.trim().length === 0) throw new Error('Gerekçe boş olamaz.')
    MOCK_AUDIT_LOG.push({
      id: `al-${Date.now()}`,
      actorId,
      action: 'dusuk_puan_atama_override',
      tableName: tablo,
      recordId: kayitId,
      detay: { danisman_id: danismanId, gerekce: gerekce.trim() },
      createdAt: new Date().toISOString(),
    })
    return delay(null)
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

// Portal -> Meta CAPI (durum geri bildirimi) hataları — meta-leads-webhook'un
// TERSİ yönü (bkz. supabase/functions/send-meta-conversion).
const MOCK_META_CAPI_ERRORS = [
  {
    id: 'mce-1',
    tur: 'gonderim_hatasi',
    metaLeadId: '1073507478692140',
    eventName: 'ClosedWon',
    hataMesaji: "Meta CAPI 400 döndü",
    createdAt: usersDaysAgo(2),
  },
]

export const metaCapiErrors = {
  async list() {
    return delay([...MOCK_META_CAPI_ERRORS])
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

// --- Koçluk Notları (Takip) — gerçekte RLS'in yaptığı rol filtresini
// burada taklit EDİYORUZ (mock'ta sunucu tarafı kontrol yok): list() sadece
// yönetim çağırır (UI zaten canManageCoachingNotes ile kapalı), listMyTargets
// ise sadece o danışmanın "hedef_aksiyon" dolu satırlarını döner — gerçek
// coaching_note_hedefleri görünümüyle AYNI daralma, elle uygulanıyor.
export const coachingNotes = {
  async list() {
    return delay([...MOCK_COACHING_NOTES])
  },
  async listMyTargets(userId) {
    const rows = MOCK_COACHING_NOTES.filter((n) => n.danismanId === userId && n.portfoyHedefi != null)
    return delay(
      rows.map((n) => ({
        id: n.id,
        danismanId: n.danismanId,
        gorusmeTarihi: n.gorusmeTarihi,
        konu: n.konu,
        portfoyHedefi: n.portfoyHedefi,
        portfoySayisiOAn: n.portfoySayisiOAn,
        takipTarihi: n.takipTarihi,
        durum: n.durum,
      })),
    )
  },
  // portfoySayisiOAn: supabaseProvider.create() ile aynı desen — broker
  // elle yazmıyor, çağıran taraf (TakipTab) zaten yüklü opportunities'ten
  // hesaplayıp geçiriyor (bkz. lib/coachingNotes.js countActivePortfoy).
  async create(form) {
    const row = {
      id: `cn-${Date.now()}`,
      danismanId: form.danismanId,
      yazanId: form.yazanId,
      gorusmeTarihi: form.gorusmeTarihi || new Date().toISOString().slice(0, 10),
      gorusmeTuru: form.gorusmeTuru,
      konusulanlar: form.konusulanlar,
      konu: form.konu,
      portfoyHedefi: form.portfoyHedefi ?? null,
      portfoySayisiOAn: form.portfoySayisiOAn ?? null,
      sonuc: null,
      takipTarihi: form.takipTarihi || null,
      durum: 'acik',
      createdAt: new Date().toISOString(),
    }
    MOCK_COACHING_NOTES.unshift(row)
    return delay({ ...row })
  },
  async update(id, patch) {
    const note = MOCK_COACHING_NOTES.find((n) => n.id === id)
    if (!note) throw new Error('Koçluk notu bulunamadı.')
    if ('konusulanlar' in patch) note.konusulanlar = patch.konusulanlar
    if ('konu' in patch) note.konu = patch.konu
    if ('portfoyHedefi' in patch) note.portfoyHedefi = patch.portfoyHedefi ?? null
    if ('sonuc' in patch) note.sonuc = patch.sonuc ?? null
    if ('takipTarihi' in patch) note.takipTarihi = patch.takipTarihi || null
    if ('durum' in patch) note.durum = patch.durum
    if ('gorusmeTuru' in patch) note.gorusmeTuru = patch.gorusmeTuru
    return delay({ ...note })
  },
}
