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
const OPPORTUNITY_COLUMNS =
  'id, type, category_id, konum, fiyat, ozet, status, owner_id, claimer_id, claimed_at, created_at, ' +
  'm2, oda_sayisi, fiyat_min, fiyat_max, categories(key)'

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
    m2: row.m2,
    odaSayisi: row.oda_sayisi,
    fiyatMin: row.fiyat_min,
    fiyatMax: row.fiyat_max,
    // Bilinçli olarak leadAd/leadTelefon YOK — bkz. dosya başı not.
  }
}

export const opportunities = {
  async list() {
    const data = await run(
      client().from('opportunities').select(OPPORTUNITY_COLUMNS).order('created_at', { ascending: false }),
    )
    return data.map(mapOpportunity)
  },
  async create(payload, ownerId, selfClaim = false) {
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
      m2: payload.m2 ?? null,
      oda_sayisi: payload.odaSayisi || null,
      fiyat_min: payload.fiyatMin ?? null,
      fiyat_max: payload.fiyatMax ?? null,
      // Danışman kendi bulduğu müşteriyi eklerken (havuza atmadıysa) direkt
      // kendine atanmış olsun — açık havuza düşüp başka bir danışmana
      // kaptırılmasın (bkz. opportunities_insert RLS: danışman sadece
      // owner=claimer=kendisi olan satır ekleyebilir).
      ...(selfClaim ? { claimer_id: ownerId, status: 'claimed', claimed_at: new Date().toISOString() } : {}),
    }
    const data = await run(client().from('opportunities').insert(insertRow).select(OPPORTUNITY_COLUMNS).single())
    return mapOpportunity(data)
  },
  // opportunities_update_manage RLS'i broker/owner'a her satırı, ofis/
  // danışmana SADECE kendi girdiği (owner_id) kaydı düzenletir — bkz.
  // lib/opportunities.js canEditOpportunity. type/category bilerek
  // patch'e alınmıyor (hangi kutuya düştüğünü değiştirmek ayrı bir işlem
  // sayılır, burada sadece "yanlış yazılmış" alanlar düzeltiliyor).
  async update(id, patch) {
    const updateRow = {}
    if ('leadAd' in patch) updateRow.lead_ad = patch.leadAd
    if ('leadTelefon' in patch) updateRow.lead_telefon = patch.leadTelefon || null
    if ('konum' in patch) updateRow.konum = patch.konum
    if ('fiyat' in patch) updateRow.fiyat = patch.fiyat ?? null
    if ('fiyatMin' in patch) updateRow.fiyat_min = patch.fiyatMin ?? null
    if ('fiyatMax' in patch) updateRow.fiyat_max = patch.fiyatMax ?? null
    if ('ozet' in patch) updateRow.ozet = patch.ozet || null
    if ('m2' in patch) updateRow.m2 = patch.m2 ?? null
    if ('odaSayisi' in patch) updateRow.oda_sayisi = patch.odaSayisi || null
    const data = await run(
      client().from('opportunities').update(updateRow).eq('id', id).select(OPPORTUNITY_COLUMNS).single(),
    )
    return mapOpportunity(data)
  },
  // close_opportunity() RPC'si — durum değişikliğini SECURITY DEFINER
  // içinde kontrol eder (broker/owner ya da claimer). RPC ham
  // public.opportunities satırı döner (categories join'i YOK), bu yüzden
  // sadece gerçekten değişen alanları (status/closedAt/closedBy) döndürüp
  // çağıran tarafta mevcut satıra spread ile birleştiriyoruz — category
  // gibi diğer alanları yanlışlıkla ham uuid'yle ezmemek için.
  async close(id, status) {
    const data = await run(client().rpc('close_opportunity', { p_opportunity_id: id, p_status: status }))
    const row = Array.isArray(data) ? data[0] : data
    return { id: row.id, status: row.status, closedAt: row.closed_at, closedBy: row.closed_by }
  },
  // "İlgileniyorum" artık exclusive claim değil — opportunity_interest'e
  // kayıt ekler, müşteri bilgisini AÇMAZ. Fırsatı giren kişi kimin
  // ilgilendiğini görüp kendisi arar (bkz. listInterest).
  async expressInterest(opportunityId, userId) {
    await run(
      client().from('opportunity_interest').insert({ opportunity_id: opportunityId, user_id: userId }),
    )
  },
  async withdrawInterest(opportunityId, userId) {
    await run(
      client()
        .from('opportunity_interest')
        .delete()
        .eq('opportunity_id', opportunityId)
        .eq('user_id', userId),
    )
  },
  // Sadece fırsatı giren kişi veya yönetim görebilir (RLS ile garanti
  // altında) — kimlerin ilgilendiğini listeler ki owner onları arayabilsin.
  async listInterest(opportunityId) {
    const data = await run(
      client().from('opportunity_interest').select('user_id, created_at').eq('opportunity_id', opportunityId),
    )
    return data.map((row) => ({ userId: row.user_id, createdAt: row.created_at }))
  },
  async getContact(id) {
    const data = await run(client().rpc('get_opportunity_contact', { p_opportunity_id: id }))
    const row = Array.isArray(data) ? data[0] : data
    return { leadAd: row?.lead_ad ?? null, leadTelefon: row?.lead_telefon ?? null }
  },
  // opportunities_delete RLS'i sadece broker'a izin verir (bkz.
  // lib/opportunities.js canDeleteOpportunity). call_logs.opportunity_id
  // bu satırı referans alıyorsa (ON DELETE için NO ACTION) Postgres 23503
  // döner — lib/errors.js bunu 'in_use' olarak kullanıcıya net bir mesajla
  // gösterir, burada ayrıca kontrol etmeye gerek yok.
  // NOT: RLS izni engellerse PostgREST hata FIRLATMAZ, sessizce 0 satır
  // siler — bu yüzden .select() ile dönen satırı kontrol edip, boşsa
  // kendimiz hata fırlatıyoruz (aksi halde "silindi" diye yalan bir
  // başarı mesajı gösterirdik).
  async remove(id) {
    const data = await run(client().from('opportunities').delete().eq('id', id).select('id'))
    if (!data || data.length === 0) {
      throw new Error('Fırsat silinemedi — yetkin olmayabilir, tekrar dene.')
    }
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
  return {
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status,
    mazeretText: row.mazeret_text,
    mazeretStatus: row.mazeret_status,
    mazeretReviewedBy: row.mazeret_reviewed_by,
    mazeretReviewedAt: row.mazeret_reviewed_at,
  }
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
  // status='mazeretli' iken mazeretText zorunlu — event_attendance_update_self
  // RLS'i danışmanın kendi satırında status'ü sadece 'onayladi'/'mazeretli'
  // yapmasına izin veriyor, mazeret_status'ü de otomatik 'bekliyor' yapıyoruz
  // (danışman bunu kendi başına onaylandi/reddedildi yapamaz).
  async updateAttendance(eventId, userId, status, { mazeretText } = {}) {
    const updateRow = { status, responded_at: new Date().toISOString() }
    if (status === 'mazeretli') {
      updateRow.mazeret_text = mazeretText
      updateRow.mazeret_status = 'bekliyor'
    }
    const data = await run(
      client()
        .from('event_attendance')
        .update(updateRow)
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select()
        .single(),
    )
    return mapAttendance(data)
  },
  // Sadece yönetim çağırabilir (event_attendance_update_manager RLS) —
  // mazereti kabul/red eder, kim ne zaman karar verdiğini kaydeder.
  async resolveMazeret(eventId, userId, decision, reviewerId) {
    const data = await run(
      client()
        .from('event_attendance')
        .update({ mazeret_status: decision, mazeret_reviewed_by: reviewerId, mazeret_reviewed_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select()
        .single(),
    )
    return mapAttendance(data)
  },
  // calendar_events_manage RLS'i (for all) zaten broker/owner/ofis'e
  // düzenleme+silme izni veriyordu — sadece bu iki fonksiyon hiç
  // yazılmamıştı. Davetli listesi burada değişmiyor (ayrı bir işlem
  // sayılır), sadece etkinliğin kendi alanları (başlık/tarih/konum vb.).
  async update(id, patch) {
    const updateRow = {}
    if ('type' in patch) updateRow.type = patch.type
    if ('title' in patch) updateRow.title = patch.title
    if ('description' in patch) updateRow.description = patch.description || null
    if ('location' in patch) updateRow.location = patch.location || null
    if ('date' in patch || 'startTime' in patch) {
      updateRow.start_at = new Date(`${patch.date}T${patch.startTime}`).toISOString()
    }
    if ('date' in patch || 'endTime' in patch) {
      updateRow.end_at = patch.endTime ? new Date(`${patch.date}T${patch.endTime}`).toISOString() : null
    }
    const data = await run(client().from('calendar_events').update(updateRow).eq('id', id).select().single())
    return mapEvent(data)
  },
  async remove(id) {
    const data = await run(client().from('calendar_events').delete().eq('id', id).select('id'))
    if (!data || data.length === 0) {
      throw new Error('Etkinlik silinemedi — yetkin olmayabilir, tekrar dene.')
    }
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
    portfoyNo: row.portfoy_no,
    satildiMi: row.satildi_mi,
    satisTarihi: row.satis_tarihi,
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
    if ('portfoyNo' in patch) dbPatch.portfoy_no = patch.portfoyNo || null
    if ('satildiMi' in patch) dbPatch.satildi_mi = patch.satildiMi
    if ('satisTarihi' in patch) dbPatch.satis_tarihi = patch.satisTarihi
    if ('donusYapildiMi' in patch) dbPatch.donus_yapildi_mi = patch.donusYapildiMi
    if ('donusAt' in patch) dbPatch.donus_at = patch.donusAt
    // Arayan detayları — sadece son 7 gündeki kayıtlarda owner/ofis
    // düzenleyebilir, broker sınırsız (bkz. trg_call_logs_detail_edit_window).
    if ('arayanAd' in patch) dbPatch.arayan_ad = patch.arayanAd
    if ('arayanTelefon' in patch) dbPatch.arayan_telefon = patch.arayanTelefon || null
    if ('kaynak' in patch) dbPatch.kaynak = patch.kaynak
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

// --- Categories (Rehber klasörleri, Fırsatlar kategorileri) ----------------
function mapCategory(row) {
  return { id: row.id, module: row.module, key: row.key, label: row.label, sortOrder: row.sort_order, isActive: row.is_active }
}

export const categories = {
  // İkinci sıralama anahtarı (created_at) bilerek eklendi — sort_order
  // teorik olarak benzersiz olmalı ama pratikte (bkz. 20260718110000
  // migration'ının notu) iki kategori aynı değere sahip olabiliyor. Tek
  // anahtarla sıralarken eşitlik durumunda Postgres'in sırası GARANTİ
  // DEĞİL — bu da "ilk ikisi değişmiyor" gibi kararsız sıralama
  // davranışına yol açıyordu.
  async list(module) {
    const data = await run(
      client()
        .from('categories')
        .select('*')
        .eq('module', module)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    )
    return data.map(mapCategory)
  },
  async create({ module, key, label, sortOrder }) {
    const data = await run(
      client().from('categories').insert({ module, key, label, sort_order: sortOrder }).select().single(),
    )
    return mapCategory(data)
  },
  async update(id, patch) {
    const updateRow = {}
    if (patch.label !== undefined) updateRow.label = patch.label
    if (patch.sortOrder !== undefined) updateRow.sort_order = patch.sortOrder
    const data = await run(client().from('categories').update(updateRow).eq('id', id).select().single())
    return mapCategory(data)
  },
  async remove(id) {
    await run(client().from('categories').delete().eq('id', id))
  },
}

export const docs = {
  async listDocs() {
    const data = await run(
      client()
        .from('docs')
        .select('id, baslik, content_text, created_by, created_at, sort_order, categories(key)')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    )
    return data.map((d) => ({
      id: d.id,
      categoryKey: d.categories?.key,
      baslik: d.baslik,
      contentText: d.content_text,
      createdBy: d.created_by,
      sortOrder: d.sort_order,
    }))
  },
  async listVersions() {
    const data = await run(client().from('doc_versions').select('*'))
    return data.map(mapDocVersion)
  },
  // Sadece docs KAYIT satırını oluşturur — gerçek dosya baytları (varsa)
  // AYRI bir adımda storage.js -> uploadDocFile() ile yüklenir, çünkü
  // storage path'i oluşturmak (buildStoragePath) docId'yi gerektiriyor.
  // Bu yüzden akış: createDoc() -> uploadDocFile() -> addVersion() (dosya
  // için) ya da createDoc() -> setContentText() (metin için).
  async createDoc({ categoryKey, baslik, sortOrder }, userId) {
    const categoryRow = await run(
      client().from('categories').select('id').eq('module', 'docs').eq('key', categoryKey).single(),
    )
    const docRow = await run(
      client()
        .from('docs')
        .insert({ category_id: categoryRow.id, baslik, created_by: userId, sort_order: sortOrder ?? 0 })
        .select()
        .single(),
    )
    return {
      id: docRow.id,
      categoryKey,
      baslik: docRow.baslik,
      contentText: null,
      createdBy: docRow.created_by,
      sortOrder: docRow.sort_order,
    }
  },
  // storagePath, storage.js -> uploadDocFile()'ın dosyayı GERÇEKTEN
  // Supabase Storage'a yükledikten sonra döndürdüğü gerçek yol.
  async addVersion({ docId, filename, storagePath }, userId) {
    await run(client().from('doc_versions').update({ is_current: false }).eq('doc_id', docId))
    const existing = await run(client().from('doc_versions').select('version_no').eq('doc_id', docId))
    const versionNo = existing.length === 0 ? 1 : Math.max(...existing.map((v) => v.version_no)) + 1
    const versionRow = await run(
      client()
        .from('doc_versions')
        .insert({
          doc_id: docId,
          version_no: versionNo,
          filename,
          url: storagePath,
          is_current: true,
          uploaded_by: userId,
        })
        .select()
        .single(),
    )
    return mapDocVersion(versionRow)
  },
  // Doküman başlığı (her doküman için) ve/veya yazılı içeriği (sadece
  // metin dokümanları için) düzenler — doc_versions'a hiç dokunmaz.
  async update(docId, patch) {
    const updateRow = {}
    if (patch.baslik !== undefined) updateRow.baslik = patch.baslik
    if (patch.contentText !== undefined) updateRow.content_text = patch.contentText
    if (patch.sortOrder !== undefined) updateRow.sort_order = patch.sortOrder
    await run(client().from('docs').update(updateRow).eq('id', docId))
  },
  // doc_versions satırları DB'de ON DELETE CASCADE ile otomatik silinir —
  // ama Storage'daki gerçek dosya baytları bu cascade'e dahil DEĞİL, o
  // yüzden asıl dosyaları çağıran (Rehber.jsx) storage.js -> deleteDocFile()
  // ile AYRI ayrı siliyor, biz sadece kayıt satırını kaldırıyoruz.
  async remove(docId) {
    await run(client().from('docs').delete().eq('id', docId))
  },
}

// --- Takip (360° sağlık skoru) -----------------------------------------------
// Portal kullanımı ve müşteri memnuniyeti artık gerçek verilerden hesaplanıyor
// (bkz. lib/takip.js — users.listActivity() ve league.listCiroMusterileri()
// zaten yukarıda tanımlı, gerçek sorgular yapıyor). broker_notes GERÇEKTEN
// bir tabloya bağlanabilir ama bu PART'ta ayrı bir migration gerektirdiği
// için kapsam dışı bırakıldı; TODO olarak işaretli, hâlâ mock'tan okunuyor.
export { takip } from './mockProvider'

// --- League (Lig) --------------------------------------------------------------
function mapPeriod(row) {
  return { id: row.id, ad: row.ad, baslangic: row.baslangic, bitis: row.bitis }
}

// "Tarih"e göre doğru döneme otomatik atama — ay sonunda 2-3 gün geriden ya
// da ileriden giriş yapılabilmesi için (broker onaylı akış). Tarih hiçbir
// mevcut dönemin aralığına düşmüyorsa açık bir hata döner.
//
// periods tablosunda aralıkların çakışmasını engelleyen bir kısıt yok — iki
// dönem aynı tarihi kapsarsa (ör. yeni dönem açılırken eskisinin bitişi
// güncellenmemişse) .maybeSingle() "birden fazla satır" hatası fırlatıp
// bunu genel "Aradığın kayıt bulunamadı" mesajına çeviriyordu. Bunun yerine
// eşleşen dönemlerden en yenisini (baslangic'i en yakın) seçiyoruz.
async function resolvePeriodByDate(tarih) {
  const periods = await run(
    client()
      .from('periods')
      .select('id')
      .lte('baslangic', tarih)
      .gte('bitis', tarih)
      .order('baslangic', { ascending: false })
      .limit(1),
  )
  if (!periods.length) {
    throw new Error('Bu tarihi kapsayan bir dönem yok — önce dönemi oluşturman gerekiyor.')
  }
  return periods[0]
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
    return data.map((s) => ({
      userId: s.user_id,
      periodId: s.period_id,
      type: s.type,
      value: Number(s.value),
      updatedAt: s.updated_at,
    }))
  },
  async addScore({ userId, type, value, tarih }, enteredBy) {
    const period = await resolvePeriodByDate(tarih)

    // Ciro kümülatiftir: her "Skor Gir" BİR SATIŞIN tutarıdır, dönem
    // toplamı ciro_girisleri'ndeki tüm satışların toplamına eşittir
    // (Sosyal Medya'daki "logdan topla" deseniyle aynı) — "value" burada
    // üstüne yazılacak bir toplam değil, eklenecek bir satış tutarı.
    if (type === 'ciro') {
      await run(
        client()
          .from('ciro_girisleri')
          .insert({ user_id: userId, period_id: period.id, value, tarih, entered_by: enteredBy }),
      )
      const rows = await run(
        client()
          .from('ciro_girisleri')
          .select('value')
          .eq('user_id', userId)
          .eq('period_id', period.id),
      )
      const total = rows.reduce((sum, r) => sum + Number(r.value), 0)
      const existing = await run(
        client()
          .from('score_entries')
          .select('id')
          .eq('user_id', userId)
          .eq('period_id', period.id)
          .eq('type', 'ciro')
          .maybeSingle(),
      )
      if (existing) {
        await run(client().from('score_entries').update({ value: total }).eq('id', existing.id))
      } else {
        await run(
          client()
            .from('score_entries')
            .insert({ user_id: userId, period_id: period.id, type: 'ciro', value: total, entered_by: enteredBy }),
        )
      }
      return { userId, periodId: period.id, type, value: total }
    }

    // memnuniyet (ve ilerideki manuel tipler): tek satır, her girişte
    // üstüne yazılır — kümülatif değil, "şu anki puan" anlamına gelir.
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
    return { userId, periodId: period.id, type, value: Number(value) }
  },
  // --- Ciro giriş geçmişi (denetim için — score_entries.value'nun üstüne
  // her seferinde yazılması yüzünden ayrı tutuluyor) -------------------------
  async listCiroGirisleri() {
    const data = await run(
      client().from('ciro_girisleri').select('*').order('created_at', { ascending: false }),
    )
    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      periodId: r.period_id,
      value: Number(r.value),
      tarih: r.tarih,
      enteredBy: r.entered_by,
      createdAt: r.created_at,
    }))
  },
  // --- Ciro müşterileri (yorum hakkı VE "yorum alındı" durumu bunlardan
  // hesaplanır — review_credits artık kullanılmıyor) --------------------------
  async listCiroMusterileri() {
    const data = await run(
      client().from('ciro_musterileri').select('*').order('created_at', { ascending: false }),
    )
    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      periodId: r.period_id,
      adSoyad: r.ad_soyad,
      alindiMi: r.alindi_mi,
      createdAt: r.created_at,
    }))
  },
  async addCiroMusteri({ userId, periodId, adSoyad }, enteredBy) {
    await run(
      client()
        .from('ciro_musterileri')
        .insert({ user_id: userId, period_id: periodId, ad_soyad: adSoyad, entered_by: enteredBy }),
    )
    return { userId, periodId }
  },
  async removeCiroMusteri(id) {
    await run(client().from('ciro_musterileri').delete().eq('id', id))
    return { id }
  },
  async setCiroMusteriAlindi(id, alindiMi) {
    await run(client().from('ciro_musterileri').update({ alindi_mi: alindiMi }).eq('id', id))
    return { id, alindiMi }
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
  // Ayarlar > Kullanıcılar: pasif olanlar dahil HERKESİ listeler (yönetim
  // amaçlı) — users_select_all RLS'i is_active() ile sadece çağıranın
  // kendisinin aktif olmasını şart koşuyor, hedef satırın durumunu değil.
  async listAll() {
    const data = await run(client().from('users').select('id, ad, email, rol, durum, created_at').order('ad'))
    return data.map((u) => ({ id: u.id, name: u.ad, email: u.email, role: u.rol, durum: u.durum, createdAt: u.created_at }))
  },
  // users_update_self_or_broker RLS'i sadece broker/owner'a (veya kendi
  // satırına) izin veriyor.
  async updateUser(id, patch) {
    const dbPatch = {}
    if ('name' in patch) dbPatch.ad = patch.name
    if ('role' in patch) dbPatch.rol = patch.role
    if ('durum' in patch) dbPatch.durum = patch.durum
    await run(client().from('users').update(dbPatch).eq('id', id))
    return { id, ...patch }
  },
  // Gerçek auth hesabı oluşturmak service_role gerektirir — bu yüzden
  // tarayıcıdan doğrudan değil, create-user Edge Function'ı üzerinden
  // gidiyor (bkz. supabase/functions/create-user). Fonksiyon çağıranın
  // gerçekten broker/owner olduğunu kendi içinde ayrıca doğruluyor.
  async createUser({ ad, email, password, rol }) {
    const { data, error } = await client().functions.invoke('create-user', {
      body: { ad, email, password, rol },
    })
    if (error) throw new Error('Hesap oluşturulamadı, bağlantıyı kontrol edip tekrar dene.')
    if (!data?.ok) throw new Error(data?.error ?? 'Hesap oluşturulamadı.')
    return { id: data.user.id, name: data.user.ad, email: data.user.email, role: data.user.rol }
  },
  // list_user_activity() RPC'si — yönetim dışı roller için sessizce boş
  // dizi döner (bkz. migration), o yüzden burada ayrı bir rol kontrolüne
  // gerek yok, Panel'in tek Promise.all'ında herkes için güvenle çağrılabilir.
  async listActivity() {
    const data = await run(client().rpc('list_user_activity'))
    return data.map((row) => ({ userId: row.user_id, lastSignInAt: row.last_sign_in_at }))
  },
  // TC no / doğum tarihi — ayrı, kısıtlı-görünürlüklü tabloda tutuluyor
  // (bkz. user_private_info_select RLS: sadece broker/owner/ofis + kişinin
  // kendisi görebilir). user_private_info_write RLS'i is_manager() şartı
  // koyduğu için sadece broker/owner çağırabilir.
  async upsertPrivateInfo(userId, { dogumTarihi, tcNo }) {
    await run(
      client()
        .from('user_private_info')
        .upsert({ user_id: userId, dogum_tarihi: dogumTarihi ?? null, tc_no: tcNo ?? null }),
    )
  },
  // Ayarlar > Kullanıcılar'da Düzenle formunu mevcut değerlerle doldurmak
  // için — tek tek değil, hepsini bir kerede çekip client'ta userId'ye göre
  // eşleştiriyoruz (aynı RLS: broker/owner/ofis herkesinkini görebilir).
  async listAllPrivateInfo() {
    const data = await run(client().from('user_private_info').select('*'))
    return data.map((r) => ({ userId: r.user_id, dogumTarihi: r.dogum_tarihi, tcNo: r.tc_no }))
  },
  // Gerçek auth hesabını silmek service_role gerektirir — delete-user Edge
  // Function'ı üzerinden gidiyor (create-user ile aynı kalıp). Fonksiyon
  // henüz deploy edilmediyse (supabase functions deploy delete-user) bu
  // çağrı hata fırlatır — kasıtlı, sessizce "silinmiş gibi" davranmıyoruz.
  async deleteUser(id) {
    const { data, error } = await client().functions.invoke('delete-user', { body: { id } })
    if (error) throw new Error('Kullanıcı silinemedi — delete-user fonksiyonu deploy edilmemiş olabilir.')
    if (!data?.ok) throw new Error(data?.error ?? 'Kullanıcı silinemedi.')
  },
  // Unutulan şifre için broker/owner yeni bir geçici şifre atar —
  // reset-user-password Edge Function'ı üzerinden (service_role gerektirir).
  // must_change_password otomatik true olur (bkz. fonksiyon içi).
  async resetPassword(id, password) {
    const { data, error } = await client().functions.invoke('reset-user-password', { body: { id, password } })
    if (error) throw new Error('Şifre sıfırlanamadı — reset-user-password fonksiyonu deploy edilmemiş olabilir.')
    if (!data?.ok) throw new Error(data?.error ?? 'Şifre sıfırlanamadı.')
  },
}

// --- Audit Log (Ayarlar > Log) -----------------------------------------------
// audit_log_select RLS'i sadece broker/owner'a okuma izni veriyor —
// trigger'lar (bkz. 20260719070000 migration) kullanıcı/fırsat/skor
// değişikliklerini otomatik buraya yazıyor.
export const auditLog = {
  async list() {
    const data = await run(
      client().from('audit_log').select('*').order('created_at', { ascending: false }).limit(200),
    )
    return data.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      action: r.action,
      tableName: r.table_name,
      recordId: r.record_id,
      detay: r.detay,
      createdAt: r.created_at,
    }))
  },
}
