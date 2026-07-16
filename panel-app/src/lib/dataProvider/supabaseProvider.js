// Gerçek Supabase sağlayıcı — mockProvider.js ile BİREBİR AYNI arayüz.
// Hiçbir sorgu ham SQL göndermez; hepsi Supabase'in parametreli
// query builder'ı veya RPC (SECURITY DEFINER fonksiyon) üzerinden gider.
//
// ÖNEMLİ GİZLİLİK KURALI: opportunities.list() bilerek lead_ad/lead_telefon
// SEÇMEZ — satır RLS ile görünür olsa bile bu iki alan network response'a
// hiç girmesin diye. Detay ekranı açıldığında ayrı bir çağrı ile
// get_opportunity_contact() RPC'si çağrılır; o fonksiyon sunucu tarafında
// (auth.uid() ile) yetki kontrolü yapıp ya gerçek değeri ya da null döner.
// Bu davranış mockProvider.getContact() ile de birebir simüle edilir.

import { getSupabaseClient } from '../supabaseClient'
import { mapSupabaseError } from '../errors'

function client() {
  return getSupabaseClient()
}

async function run(promise) {
  const { data, error } = await promise
  if (error) throw mapSupabaseError(error)
  return data
}

// --- Opportunities (Fırsatlar) ----------------------------------------------
function mapOpportunity(row) {
  return {
    id: row.id,
    type: row.type,
    category: row.categories?.key ?? row.category_id,
    konum: row.konum,
    fiyat: row.fiyat,
    ozet: row.ozet,
    status: row.status,
    ownerId: row.owner_id,
    claimerId: row.claimer_id,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
    // Bilinçli olarak leadAd/leadTelefon YOK — bkz. dosya başı not.
  }
}

export const opportunities = {
  async list() {
    const data = await run(
      client()
        .from('opportunities')
        .select(
          'id, type, category_id, konum, fiyat, ozet, status, owner_id, claimer_id, claimed_at, created_at, categories(key)',
        )
        .order('created_at', { ascending: false }),
    )
    return data.map(mapOpportunity)
  },
  async create(payload, ownerId) {
    // category anahtarını (ör. 'konut') categories.id'ye çevir.
    const categoryRow = await run(
      client().from('categories').select('id').eq('module', 'opportunities').eq('key', payload.category).single(),
    )
    const insertRow = {
      type: payload.type,
      category_id: categoryRow.id,
      lead_ad: payload.leadAd,
      lead_telefon: payload.leadTelefon || null,
      konum: payload.konum,
      fiyat: payload.fiyat ?? null,
      ozet: payload.ozet || null,
      owner_id: ownerId,
    }
    const data = await run(client().from('opportunities').insert(insertRow).select().single())
    return mapOpportunity(data)
  },
  async claim(id) {
    // claim_opportunity(uuid) RPC — auth.uid() kullanır, client'tan userId
    // parametresi ALMAZ (aksi IDOR'a açık olurdu).
    const data = await run(client().rpc('claim_opportunity', { p_opportunity_id: id }))
    return mapOpportunity(data)
  },
  async getContact(id) {
    const data = await run(client().rpc('get_opportunity_contact', { p_opportunity_id: id }))
    const row = Array.isArray(data) ? data[0] : data
    return { leadAd: row?.lead_ad ?? null, leadTelefon: row?.lead_telefon ?? null }
  },
}

// --- Calendar events + attendance (Takvim) ----------------------------------
function mapEvent(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.start_at,
    endAt: row.end_at,
    creatorId: row.creator_id,
  }
}

function mapAttendance(row) {
  return { eventId: row.event_id, userId: row.user_id, status: row.status }
}

export const calendarEvents = {
  async list() {
    const data = await run(client().from('calendar_events').select('*').order('start_at', { ascending: true }))
    return data.map(mapEvent)
  },
  async listAttendance() {
    const data = await run(client().from('event_attendance').select('*'))
    return data.map(mapAttendance)
  },
  async create(form, creatorId) {
    const startAt = new Date(`${form.date}T${form.startTime}`).toISOString()
    const endAt = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : null
    const eventRow = await run(
      client()
        .from('calendar_events')
        .insert({
          type: form.type,
          title: form.title,
          description: form.description || null,
          location: form.location || null,
          start_at: startAt,
          end_at: endAt,
          creator_id: creatorId,
        })
        .select()
        .single(),
    )
    if (form.inviteeIds?.length) {
      await run(
        client()
          .from('event_attendance')
          .insert(form.inviteeIds.map((userId) => ({ event_id: eventRow.id, user_id: userId, status: 'davetli' }))),
      )
    }
    return mapEvent(eventRow)
  },
  async updateAttendance(eventId, userId, status) {
    const data = await run(
      client()
        .from('event_attendance')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select()
        .single(),
    )
    return mapAttendance(data)
  },
}

// --- Education (Eğitim) ------------------------------------------------------
export const education = {
  async listModules() {
    const data = await run(
      client().from('education_modules').select('*').eq('is_active', true).order('sort_order'),
    )
    return data.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      sortOrder: m.sort_order,
      createdAt: m.created_at,
    }))
  },
  async listProgress() {
    const data = await run(client().from('education_progress').select('*'))
    return data.map((p) => ({ moduleId: p.module_id, userId: p.user_id, doneAt: p.done_at }))
  },
  async listBadges() {
    const data = await run(client().from('badges').select('*'))
    return data.map((b) => ({ id: b.id, ad: b.ad, aciklama: b.aciklama, icon: b.icon }))
  },
  async listUserBadges() {
    const data = await run(client().from('user_badges').select('*'))
    return data.map((b) => ({ userId: b.user_id, badgeId: b.badge_id, earnedAt: b.earned_at }))
  },
  async listChecklistItems() {
    const data = await run(client().from('onboarding_checklist_items').select('*').order('sort_order'))
    return data.map((i) => ({ id: i.id, tip: i.tip, baslik: i.baslik, sortOrder: i.sort_order }))
  },
  async listChecklistStatus() {
    const data = await run(client().from('onboarding_checklist_status').select('*'))
    return data.map((s) => ({ itemId: s.item_id, userId: s.user_id, doneAt: s.done_at, doneBy: s.done_by }))
  },
  async toggleModuleProgress(moduleId, userId, done) {
    if (done) {
      await run(
        client()
          .from('education_progress')
          .upsert({ module_id: moduleId, user_id: userId, done_at: new Date().toISOString() }),
      )
    } else {
      await run(
        client().from('education_progress').delete().eq('module_id', moduleId).eq('user_id', userId),
      )
    }
    return { moduleId, userId, done }
  },
  async toggleChecklistItem(itemId, userId, done, doneBy) {
    if (done) {
      await run(
        client()
          .from('onboarding_checklist_status')
          .upsert({ item_id: itemId, user_id: userId, done_at: new Date().toISOString(), done_by: doneBy }),
      )
    } else {
      await run(
        client().from('onboarding_checklist_status').delete().eq('item_id', itemId).eq('user_id', userId),
      )
    }
    return { itemId, userId, done }
  },
  async awardBadge(userId, badgeId) {
    const data = await run(
      client().from('user_badges').insert({ user_id: userId, badge_id: badgeId }).select().single(),
    )
    return { userId: data.user_id, badgeId: data.badge_id, earnedAt: data.earned_at }
  },
  // onboarding_items_manage RLS'i sadece broker/owner'a izin veriyor.
  async createChecklistItem({ tip, baslik, sortOrder }) {
    const data = await run(
      client()
        .from('onboarding_checklist_items')
        .insert({ tip, baslik, sort_order: sortOrder })
        .select()
        .single(),
    )
    return { id: data.id, tip: data.tip, baslik: data.baslik, sortOrder: data.sort_order }
  },
  async updateChecklistItemOrder(itemId, sortOrder) {
    await run(client().from('onboarding_checklist_items').update({ sort_order: sortOrder }).eq('id', itemId))
    return { itemId, sortOrder }
  },
}

// --- Call logs (Operasyon) ---------------------------------------------------
function mapCallLog(row) {
  return {
    id: row.id,
    kaynak: row.kaynak,
    arayanAd: row.arayan_ad,
    arayanTelefon: row.arayan_telefon,
    assignedTo: row.assigned_to,
    sonuc: row.sonuc,
    portfoyAlindiMi: row.portfoy_alindi_mi,
    donusYapildiMi: row.donus_yapildi_mi,
    donusAt: row.donus_at,
    opportunityId: row.opportunity_id,
    notlar: row.notlar,
    createdAt: row.created_at,
  }
}

export const callLogs = {
  async list() {
    const data = await run(client().from('call_logs').select('*').order('created_at', { ascending: false }))
    return data.map(mapCallLog)
  },
  async create(form) {
    const data = await run(
      client()
        .from('call_logs')
        .insert({
          kaynak: form.kaynak,
          arayan_ad: form.arayanAd,
          arayan_telefon: form.arayanTelefon || null,
          assigned_to: form.assignedTo || null,
        })
        .select()
        .single(),
    )
    return mapCallLog(data)
  },
  async update(id, patch) {
    const dbPatch = {}
    if ('assignedTo' in patch) dbPatch.assigned_to = patch.assignedTo
    if ('sonuc' in patch) dbPatch.sonuc = patch.sonuc
    if ('portfoyAlindiMi' in patch) dbPatch.portfoy_alindi_mi = patch.portfoyAlindiMi
    if ('donusYapildiMi' in patch) dbPatch.donus_yapildi_mi = patch.donusYapildiMi
    if ('donusAt' in patch) dbPatch.donus_at = patch.donusAt
    const data = await run(client().from('call_logs').update(dbPatch).eq('id', id).select().single())
    return mapCallLog(data)
  },
}

// --- Docs (Rehber) ------------------------------------------------------------
function mapDocVersion(v) {
  return {
    id: v.id,
    docId: v.doc_id,
    versionNo: v.version_no,
    filename: v.filename,
    url: v.url,
    isCurrent: v.is_current,
    uploadedBy: v.uploaded_by,
    uploadedAt: v.uploaded_at,
  }
}

export const docs = {
  async listDocs() {
    const data = await run(
      client().from('docs').select('id, baslik, content_text, created_by, created_at, categories(key)'),
    )
    return data.map((d) => ({
      id: d.id,
      categoryKey: d.categories?.key,
      baslik: d.baslik,
      contentText: d.content_text,
      createdBy: d.created_by,
    }))
  },
  async listVersions() {
    const data = await run(client().from('doc_versions').select('*'))
    return data.map(mapDocVersion)
  },
  // NOT: gerçek dosya baytları burada değil, storage.js -> uploadDocFile() ile
  // yüklenir; bu fonksiyon sadece docs/doc_versions KAYIT satırlarını yazar.
  // signedUrl parametresi storage.js'den gelen gerçek dosya yolunu taşır.
  async upload({ categoryKey, docId, baslik, filename, storagePath }, userId) {
    let targetDocId = docId
    if (!targetDocId) {
      const categoryRow = await run(
        client().from('categories').select('id').eq('module', 'docs').eq('key', categoryKey).single(),
      )
      const docRow = await run(
        client().from('docs').insert({ category_id: categoryRow.id, baslik, created_by: userId }).select().single(),
      )
      targetDocId = docRow.id
    }
    await run(client().from('doc_versions').update({ is_current: false }).eq('doc_id', targetDocId))
    const existing = await run(client().from('doc_versions').select('version_no').eq('doc_id', targetDocId))
    const versionNo = existing.length === 0 ? 1 : Math.max(...existing.map((v) => v.version_no)) + 1
    const versionRow = await run(
      client()
        .from('doc_versions')
        .insert({
          doc_id: targetDocId,
          version_no: versionNo,
          filename,
          url: storagePath ?? '#',
          is_current: true,
          uploaded_by: userId,
        })
        .select()
        .single(),
    )
    return { docId: targetDocId, version: mapDocVersion(versionRow) }
  },
}

// --- Takip (360° sağlık skoru) -----------------------------------------------
// portal_usage / customer_review şemada henüz bir tabloya karşılık gelmiyor
// (bkz. mockProvider.js aynı bölüm) — bu yüzden burada da mock'tan okunuyor.
// broker_notes GERÇEKTEN bir tabloya bağlanabilir ama bu PART'ta ayrı bir
// migration gerektirdiği için kapsam dışı bırakıldı; TODO olarak işaretli.
export { takip } from './mockProvider'

// --- League (Lig) --------------------------------------------------------------
function mapPeriod(row) {
  return { id: row.id, ad: row.ad, baslangic: row.baslangic, bitis: row.bitis }
}

// "Tarih"e göre doğru döneme otomatik atama — ay sonunda 2-3 gün geriden ya
// da ileriden giriş yapılabilmesi için (broker onaylı akış). Tarih hiçbir
// mevcut dönemin aralığına düşmüyorsa açık bir hata döner.
async function resolvePeriodByDate(tarih) {
  const period = await run(
    client().from('periods').select('id').lte('baslangic', tarih).gte('bitis', tarih).maybeSingle(),
  )
  if (!period) {
    throw new Error('Bu tarihi kapsayan bir dönem yok — önce dönemi oluşturman gerekiyor.')
  }
  return period
}

// Her ciro girişi 2 yorum hakkı getirir (broker onaylı kural) — var olan
// dönem/danışman satırı varsa üstüne eklenir, yoksa oluşturulur.
async function incrementReviewCredits(userId, periodId, amount) {
  const existing = await run(
    client()
      .from('review_credits')
      .select('id, hak_sayisi')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .maybeSingle(),
  )
  if (existing) {
    await run(
      client()
        .from('review_credits')
        .update({ hak_sayisi: existing.hak_sayisi + amount, updated_at: new Date().toISOString() })
        .eq('id', existing.id),
    )
  } else {
    await run(
      client()
        .from('review_credits')
        .insert({ user_id: userId, period_id: periodId, hak_sayisi: amount }),
    )
  }
}

export const league = {
  async getPeriod() {
    const data = await run(client().from('periods').select('*').order('baslangic', { ascending: false }).limit(1).single())
    return mapPeriod(data)
  },
  async listPeriods() {
    const data = await run(client().from('periods').select('*').order('baslangic', { ascending: false }))
    return data.map(mapPeriod)
  },
  // periods_manage RLS'i sadece broker'a izin veriyor.
  async createPeriod({ ad, baslangic, bitis }) {
    const data = await run(client().from('periods').insert({ ad, baslangic, bitis }).select().single())
    return mapPeriod(data)
  },
  async listScores() {
    const data = await run(client().from('score_entries').select('*'))
    return data.map((s) => ({ userId: s.user_id, periodId: s.period_id, type: s.type, value: Number(s.value) }))
  },
  async addScore({ userId, type, value, tarih }, enteredBy) {
    const period = await resolvePeriodByDate(tarih)
    const existing = await run(
      client()
        .from('score_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('period_id', period.id)
        .eq('type', type)
        .maybeSingle(),
    )
    if (existing) {
      await run(client().from('score_entries').update({ value }).eq('id', existing.id))
    } else {
      await run(
        client()
          .from('score_entries')
          .insert({ user_id: userId, period_id: period.id, type, value, entered_by: enteredBy }),
      )
    }
    // Sadece ciro girişleri yorum hakkı getirir — her girişte (yeni ya da
    // güncelleme) +2, spesifikasyon gereği.
    if (type === 'ciro') {
      await incrementReviewCredits(userId, period.id, 2)
    }
    return { userId, periodId: period.id, type, value: Number(value) }
  },
  // --- Yorum hakkı (Ciro'ya bağlı) -----------------------------------------
  async listReviewCredits() {
    const data = await run(client().from('review_credits').select('*'))
    return data.map((r) => ({
      userId: r.user_id,
      periodId: r.period_id,
      hakSayisi: r.hak_sayisi,
      alinanSayisi: r.alinan_sayisi,
    }))
  },
  async setReceivedReviews(userId, periodId, alinanSayisi) {
    const existing = await run(
      client()
        .from('review_credits')
        .select('id')
        .eq('user_id', userId)
        .eq('period_id', periodId)
        .maybeSingle(),
    )
    if (existing) {
      await run(
        client()
          .from('review_credits')
          .update({ alinan_sayisi: alinanSayisi, updated_at: new Date().toISOString() })
          .eq('id', existing.id),
      )
    } else {
      await run(
        client()
          .from('review_credits')
          .insert({ user_id: userId, period_id: periodId, hak_sayisi: 0, alinan_sayisi: alinanSayisi }),
      )
    }
    return { userId, periodId, alinanSayisi }
  },
  // --- Sosyal medya aktivite puanlaması -------------------------------------
  async listActivityTypes() {
    const data = await run(
      client().from('social_activity_types').select('*').eq('aktif', true).order('sort_order'),
    )
    return data.map((t) => ({ id: t.id, ad: t.ad, puan: Number(t.puan), sortOrder: t.sort_order }))
  },
  // broker onaylı: social_activity_types_manage RLS'i sadece broker'a izin veriyor.
  async updateActivityTypePoint(id, puan) {
    await run(client().from('social_activity_types').update({ puan }).eq('id', id))
    return { id, puan: Number(puan) }
  },
  // Aktivite kaydı eklenir VE o danışman/dönem için toplam sosyal medya
  // puanı yeniden hesaplanıp score_entries'e (type='sosyal_medya') yazılır —
  // böylece Lig'in mevcut sıralama/podyum mantığı hiç değişmeden çalışır.
  async logSocialActivity({ userId, activityTypeId, adet, tarih }, enteredBy) {
    const period = await resolvePeriodByDate(tarih)
    await run(
      client()
        .from('social_activity_log')
        .insert({ user_id: userId, period_id: period.id, activity_type_id: activityTypeId, adet, entered_by: enteredBy }),
    )

    const [logs, types] = await Promise.all([
      run(
        client()
          .from('social_activity_log')
          .select('activity_type_id, adet')
          .eq('user_id', userId)
          .eq('period_id', period.id),
      ),
      run(client().from('social_activity_types').select('id, puan')),
    ])
    const puanMap = Object.fromEntries(types.map((t) => [t.id, Number(t.puan)]))
    const total = logs.reduce((sum, l) => sum + Number(l.adet) * (puanMap[l.activity_type_id] ?? 0), 0)

    const existingScore = await run(
      client()
        .from('score_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('period_id', period.id)
        .eq('type', 'sosyal_medya')
        .maybeSingle(),
    )
    if (existingScore) {
      await run(client().from('score_entries').update({ value: total }).eq('id', existingScore.id))
    } else {
      await run(
        client()
          .from('score_entries')
          .insert({ user_id: userId, period_id: period.id, type: 'sosyal_medya', value: total, entered_by: enteredBy }),
      )
    }
    return { userId, periodId: period.id, total }
  },
}

// --- Users -----------------------------------------------------------------
export const users = {
  async listKnown() {
    const data = await run(client().from('users').select('id, ad, rol, durum').eq('durum', 'aktif'))
    const map = {}
    for (const u of data) map[u.id] = { id: u.id, name: u.ad, role: u.rol }
    return map
  },
}
