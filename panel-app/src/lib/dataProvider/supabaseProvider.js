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
  'm2, oda_sayisi, fiyat_min, fiyat_max, kaynak_lead_id, islem_tipi, onceki_sahip_id, devir_tarihi, categories(key)'

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
    kaynakLeadId: row.kaynak_lead_id,
    // Satılık/kiralık — hem Satıcı hem Alıcı tarafında geçerli (bkz.
    // migration 20260729230000, lib/opportunities.js ISLEM_TIPI_LABELS).
    islemTipi: row.islem_tipi,
    // Pasif danışmandan devredilen bir kaydın "önceki sahip" izi (2026-10-06
    // broker isteği) — reassignOpen/reassignPending doldurur, UI'da sadece
    // bilgilendirme amaçlı gösterilir.
    oncekiSahipId: row.onceki_sahip_id,
    devirTarihi: row.devir_tarihi,
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
    // Tip (satıcı/alıcı) hangi fiyat alanının geçerli olduğunu belirler —
    // formda gizlenen alan burada da temizlenir, DB'deki CHECK kısıtı
    // (opportunities_fiyat_tip_tutarliligi) bunu zaten zorunlu kılıyor, bu
    // sadece aynı kuralı erken ve açık hatayla uygular (bkz. /kurul bulgusu:
    // eskiden gizlenen fiyat formda/DB'de hayalet değer olarak kalıyordu).
    const isAlici = payload.type === 'alici'
    const insertRow = {
      type: payload.type,
      category_id: categoryRow.id,
      lead_ad: payload.leadAd,
      lead_telefon: payload.leadTelefon || null,
      konum: payload.konum,
      fiyat: isAlici ? null : (payload.fiyat ?? null),
      ozet: payload.ozet || null,
      owner_id: ownerId,
      m2: payload.m2 ?? null,
      oda_sayisi: payload.odaSayisi || null,
      fiyat_min: isAlici ? (payload.fiyatMin ?? null) : null,
      fiyat_max: isAlici ? (payload.fiyatMax ?? null) : null,
      kaynak_lead_id: payload.kaynakLeadId ?? null,
      islem_tipi: payload.islemTipi || 'satilik',
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
  // lib/opportunities.js canEditOpportunity. type/category ARTIK
  // düzenlenebilir (eskiden bilerek dışarıda bırakılmıştı) — Lead
  // Havuzu'ndan Portföy'e yönlendirilen bir lead'de broker alıcı/satıcı
  // ayrımını bilemiyor ("biz reklamlarda ikisini de topluyoruz"), bu
  // yüzden danışman arayıp öğrendikten sonra kendi ekranından
  // düzeltebilmeli (bkz. AI_NOTLARI.md, Leads.jsx AssignPortfolioLeadModal).
  async update(id, patch) {
    const updateRow = {}
    if ('type' in patch) updateRow.type = patch.type
    if ('category' in patch) {
      const categoryRow = await run(
        client().from('categories').select('id').eq('module', 'opportunities').eq('key', patch.category).single(),
      )
      updateRow.category_id = categoryRow.id
    }
    if ('leadAd' in patch) updateRow.lead_ad = patch.leadAd
    if ('leadTelefon' in patch) updateRow.lead_telefon = patch.leadTelefon || null
    if ('konum' in patch) updateRow.konum = patch.konum
    if ('fiyat' in patch) updateRow.fiyat = patch.fiyat ?? null
    if ('fiyatMin' in patch) updateRow.fiyat_min = patch.fiyatMin ?? null
    if ('fiyatMax' in patch) updateRow.fiyat_max = patch.fiyatMax ?? null
    if ('ozet' in patch) updateRow.ozet = patch.ozet || null
    if ('m2' in patch) updateRow.m2 = patch.m2 ?? null
    if ('odaSayisi' in patch) updateRow.oda_sayisi = patch.odaSayisi || null
    if ('islemTipi' in patch) updateRow.islem_tipi = patch.islemTipi
    // bkz. create() — tip değişiyorsa (EditOpportunityModal her zaman
    // type+fiyat+fiyatMin+fiyatMax'i birlikte gönderir) ilgisiz fiyat
    // alanı burada da temizlenir.
    if ('type' in patch) {
      if (patch.type === 'alici') updateRow.fiyat = null
      else {
        updateRow.fiyat_min = null
        updateRow.fiyat_max = null
      }
    }
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
  // assign_opportunity_to() RPC'si — sadece broker/owner çağırabilir (bkz.
  // migration is_manager() kontrolü). close() ile aynı sebepten sadece
  // gerçekten değişen alanları döndürüp çağıran tarafta spread ile
  // birleştiriyoruz.
  async assignTo(id, userId) {
    const data = await run(client().rpc('assign_opportunity_to', { p_opportunity_id: id, p_user_id: userId }))
    const row = Array.isArray(data) ? data[0] : data
    return { id: row.id, status: row.status, claimerId: row.claimer_id, claimedAt: row.claimed_at }
  },
  // Pasife alınan danışmanın açık/üstlenilmiş fırsatlarını başka bir
  // danışmana toplu devreder (bkz. Ayarlar.jsx DevretModal, /kurul
  // "danışman takip menüleri" denetimi — pasife alma işi hiç devretmiyordu).
  // İki ayrı UPDATE: biri sahiplik (owner_id — kendi listelediği açık
  // portföyler), biri üstlenme (claimer_id — başkasının listelediği, bunun
  // üstlendiği fırsatlar). Kapanmış/iptal fırsatlara dokunulmuyor. Trigger
  // (trg_prevent_opportunity_status_bypass) bu alanlara doğrudan yazmayı
  // sadece is_manager() değilse engelliyor — bu sayfa zaten sadece broker/
  // owner'a açık, dolayısıyla buradan yazmak izinli.
  // onceki_sahip_id/devir_tarihi: "eski danışmanın ismi not olarak
  // görülsün" isteği (2026-10-06) — sadece SON devri tutuyoruz (broker
  // onayı), tam zincir audit_log'da zaten var.
  async reassignOpen(fromUserId, toUserId) {
    const devirAlani = { onceki_sahip_id: fromUserId, devir_tarihi: new Date().toISOString() }
    await run(
      client()
        .from('opportunities')
        .update({ owner_id: toUserId, ...devirAlani })
        .eq('owner_id', fromUserId)
        .in('status', ['acik', 'claimed']),
    )
    await run(
      client()
        .from('opportunities')
        .update({ claimer_id: toUserId, ...devirAlani })
        .eq('claimer_id', fromUserId)
        .in('status', ['acik', 'claimed']),
    )
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
    gorunurluk: row.gorunurluk,
  }
}

function mapAttendance(row) {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status,
    katilimTipi: row.katilim_tipi,
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
          gorunurluk: form.gorunurluk ?? 'davetliler',
        })
        .select()
        .single(),
    )
    // form.katilimTipleri: { [userId]: 'zorunlu'|'onerilen'|'istege_bagli' }
    // — anahtarların kümesi davetli listesi, "Davet Edilmedi" ayrı bir
    // değer değil, sözlükte hiç olmamak demek (bkz. NewEventModal).
    const invitees = Object.entries(form.katilimTipleri ?? {})
    if (invitees.length) {
      await run(
        client()
          .from('event_attendance')
          .insert(
            invitees.map(([userId, katilimTipi]) => ({
              event_id: eventRow.id,
              user_id: userId,
              status: 'davetli',
              katilim_tipi: katilimTipi,
            })),
          ),
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
    if ('gorunurluk' in patch) updateRow.gorunurluk = patch.gorunurluk
    const data = await run(client().from('calendar_events').update(updateRow).eq('id', id).select().single())
    return mapEvent(data)
  },
  // Daha önce davetsiz kurulmuş bir etkinliğe (ör. "otomatik görünür" diye
  // davet edilmemiş zorunlu toplantı/eğitim) yönetim sonradan davetli
  // ekleyebilsin diye — create()'teki davetli ekleme mantığıyla aynı, sadece
  // mevcut bir etkinliğe uygulanıyor (bkz. Düzenle ekranı "Davetli Ekle").
  // event_attendance_insert RLS'i broker/owner/ofis'e bunu koşulsuz
  // tanıyor, ayrı bir migration gerekmiyor.
  async addInvitees(eventId, katilimTipleri) {
    const invitees = Object.entries(katilimTipleri ?? {})
    if (!invitees.length) return []
    const data = await run(
      client()
        .from('event_attendance')
        .insert(
          invitees.map(([userId, katilimTipi]) => ({
            event_id: eventId,
            user_id: userId,
            status: 'davetli',
            katilim_tipi: katilimTipi,
          })),
        )
        .select(),
    )
    return data.map(mapAttendance)
  },
  // Ayarlar'daki doğum tarihi düzenleme/pasifleştirme akışının, o kullanıcı
  // için daha önce oluşturulmuş "🎂 ... — Doğum Günü" etkinliğini yeniden
  // bulup güncelleyebilmesi/silebilmesi için — event_attendance'taki katılımcı
  // bağlantısı üzerinden arıyoruz (calendar_events'te ayrı bir user_id kolonu
  // yok, event_attendance zaten stabil bir bağlantı sağlıyor).
  async findBirthdayEvent(userId) {
    const data = await run(
      client()
        .from('event_attendance')
        .select('event_id, calendar_events!inner(id, title, type)')
        .eq('user_id', userId)
        .eq('calendar_events.type', 'etkinlik')
        .like('calendar_events.title', '🎂 %'),
    )
    return data[0]?.event_id ?? null
  },
  // "Herkese açık" bir etkinliğe davet edilmemiş biri kendi kendine
  // katılır — event_attendance_insert RLS'i bunu sadece istege_bagli +
  // onayladi olarak, ve sadece gorunurluk='herkese_acik' olan etkinlikte
  // kabul ediyor (bkz. migration 20260802140000).
  async joinEvent(eventId, userId) {
    const data = await run(
      client()
        .from('event_attendance')
        .insert({ event_id: eventId, user_id: userId, status: 'onayladi', katilim_tipi: 'istege_bagli' })
        .select()
        .single(),
    )
    return mapAttendance(data)
  },
  async remove(id) {
    const data = await run(client().from('calendar_events').delete().eq('id', id).select('id'))
    if (!data || data.length === 0) {
      throw new Error('Etkinlik silinemedi — yetkin olmayabilir, tekrar dene.')
    }
  },
}

// --- Education (Checklist) ----------------------------------------------
// Power Camp modülleri/rozetleri kaldırıldı (2026-10-07, broker kararı —
// "işimize yaramıyor, süreç içine dahil edeceğim"). DB tabloları
// (education_modules/education_progress/badges/user_badges) ve ilgili
// migration'lar duruyor, sadece uygulama bu veriyi artık hiç çekmiyor.
export const education = {
  async listChecklistItems() {
    const data = await run(client().from('onboarding_checklist_items').select('*').order('sort_order'))
    return data.map((i) => ({ id: i.id, tip: i.tip, baslik: i.baslik, sortOrder: i.sort_order }))
  },
  async listChecklistStatus() {
    const data = await run(client().from('onboarding_checklist_status').select('*'))
    return data.map((s) => ({ itemId: s.item_id, userId: s.user_id, doneAt: s.done_at, doneBy: s.done_by }))
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
  async updateChecklistItem(itemId, baslik) {
    const data = await run(
      client().from('onboarding_checklist_items').update({ baslik }).eq('id', itemId).select().single(),
    )
    return { id: data.id, tip: data.tip, baslik: data.baslik, sortOrder: data.sort_order }
  },
  // onboarding_checklist_status.item_id "on delete cascade" ile tanımlı
  // (migration 20260715072704) — bu maddeyi işaretlemiş olan herkesin
  // durumu da otomatik siliniyor, ayrıca bir temizlik gerekmiyor.
  async deleteChecklistItem(itemId) {
    await run(client().from('onboarding_checklist_items').delete().eq('id', itemId))
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
    portfoyTalebiMi: row.portfoy_talebi_mi,
    opportunityId: row.opportunity_id,
    notlar: row.notlar,
    reklamKodu: row.reklam_kodu,
    kaynakLeadId: row.kaynak_lead_id,
    createdAt: row.created_at,
    // "Önceki sahip" izi — bkz. opportunities reassignOpen notu, aynı desen.
    oncekiSahipId: row.onceki_sahip_id,
    devirTarihi: row.devir_tarihi,
  }
}

export const callLogs = {
  async list() {
    const data = await run(client().from('call_logs').select('*').order('created_at', { ascending: false }))
    return data.map(mapCallLog)
  },
  // Panel açılışındaki 17 paralel istekten biri — Panel sadece özet
  // sayılar/uyarılar için (assignedTo/donusYapildiMi/portfoyAlindiMi vb.)
  // kullanıyor, arayanAd/arayanTelefon/notlar gibi ağır alanları hiç
  // göstermiyor (bkz. AI_NOTLARI.md "açılışta donma" notu, 2026-09-28).
  // list()'in TAMAMINI değiştirmiyoruz — Operasyon/Lead Havuzu/Takip hâlâ
  // tam veriye ihtiyaç duyuyor, sadece Panel bu daha hafif sürümü kullanıyor.
  async listSummary() {
    const data = await run(
      client()
        .from('call_logs')
        .select(
          'id, created_at, assigned_to, donus_yapildi_mi, portfoy_alindi_mi, satildi_mi, kaynak, reklam_kodu, portfoy_talebi_mi, arayan_ad, arayan_telefon',
        )
        .order('created_at', { ascending: false }),
    )
    return data.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      assignedTo: row.assigned_to,
      donusYapildiMi: row.donus_yapildi_mi,
      portfoyAlindiMi: row.portfoy_alindi_mi,
      satildiMi: row.satildi_mi,
      kaynak: row.kaynak,
      reklamKodu: row.reklam_kodu,
      portfoyTalebiMi: row.portfoy_talebi_mi,
      arayanAd: row.arayan_ad,
      arayanTelefon: row.arayan_telefon,
    }))
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
          notlar: form.notlar || null,
          reklam_kodu: form.reklamKodu || null,
          portfoy_no: form.portfoyNo || null,
          portfoy_talebi_mi: form.portfoyTalebiMi ?? false,
          kaynak_lead_id: form.kaynakLeadId ?? null,
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
    if ('portfoyTalebiMi' in patch) dbPatch.portfoy_talebi_mi = patch.portfoyTalebiMi
    // Arayan detayları — sadece son 7 gündeki kayıtlarda owner/ofis
    // düzenleyebilir, broker sınırsız (bkz. trg_call_logs_detail_edit_window).
    if ('arayanAd' in patch) dbPatch.arayan_ad = patch.arayanAd
    if ('arayanTelefon' in patch) dbPatch.arayan_telefon = patch.arayanTelefon || null
    if ('kaynak' in patch) dbPatch.kaynak = patch.kaynak
    if ('notlar' in patch) dbPatch.notlar = patch.notlar || null
    if ('reklamKodu' in patch) dbPatch.reklam_kodu = patch.reklamKodu || null
    // Operasyon'dan Fırsata dönüştürme akışı set ediyor (bkz. OperasyonTab.jsx
    // handleOpportunitySubmit) — kolon zaten vardı (init_schema), sadece
    // yazan bir akış hiç yoktu.
    if ('opportunityId' in patch) dbPatch.opportunity_id = patch.opportunityId
    const data = await run(client().from('call_logs').update(dbPatch).eq('id', id).select().single())
    return mapCallLog(data)
  },
  async remove(id) {
    const data = await run(client().from('call_logs').delete().eq('id', id).select('id'))
    if (!data || data.length === 0) {
      throw new Error('Çağrı silinemedi — yetkin olmayabilir, tekrar dene.')
    }
  },
  // Pasife alınan danışmanın takip gerektiren, dönüşü yapılmamış
  // çağrılarını başka bir danışmana toplu devreder (bkz. Ayarlar.jsx
  // DevretModal). callNeedsTracking dışında kalanlar (santral kaynaklı,
  // portföy talebi olmayan bilgi çağrıları) zaten takip gerektirmediği
  // için devredilmiyor — tek tek ID ile güncellenir (RLS'in anladığı
  // tek UPDATE şekli bu, SQL'de callNeedsTracking'i tekrar yazmak yerine
  // tek doğru kaynağı (lib/callLogs.js) kullanıyoruz).
  async reassignPending(callIds, toUserId, fromUserId) {
    if (callIds.length === 0) return
    await run(
      client()
        .from('call_logs')
        .update({ assigned_to: toUserId, onceki_sahip_id: fromUserId, devir_tarihi: new Date().toISOString() })
        .in('id', callIds),
    )
  },
}

// --- Leads (Lead Havuzu) ------------------------------------------------------
// leads_manage RLS'i sadece broker/owner/ofis'e izin verir — danışman için
// ayrı bir select politikası yok, bu yüzden danışman zaten sıfır satır alır.
function mapLead(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    tip: row.tip,
    kaynak: row.kaynak,
    adSoyad: row.ad_soyad,
    telefon: row.telefon,
    email: row.email,
    atananDanismanId: row.atanan_danisman_id,
    durum: row.durum,
    ilkTemasAt: row.ilk_temas_at,
    sonucAt: row.sonuc_at,
    kayipNedeni: row.kayip_nedeni,
    aciklama: row.aciklama,
    metaLeadId: row.meta_lead_id,
    kampanyaKodu: row.kampanya_kodu,
    reklamAdi: row.reklam_adi,
    metaAdId: row.meta_ad_id,
  }
}

export const leads = {
  async list() {
    const data = await run(client().from('leads').select('*').order('created_at', { ascending: false }))
    return data.map(mapLead)
  },
  async create(form) {
    const data = await run(
      client()
        .from('leads')
        .insert({
          tip: form.tip,
          kaynak: form.kaynak,
          ad_soyad: form.adSoyad,
          telefon: form.telefon || null,
          email: form.email || null,
          atanan_danisman_id: form.atananDanismanId || null,
          durum: form.durum,
          aciklama: form.aciklama || null,
          kampanya_kodu: form.kampanyaKodu || null,
          reklam_adi: form.reklamAdi || null,
        })
        .select()
        .single(),
    )
    return mapLead(data)
  },
  async update(id, patch) {
    const dbPatch = {}
    if ('tip' in patch) dbPatch.tip = patch.tip
    if ('kaynak' in patch) dbPatch.kaynak = patch.kaynak
    if ('adSoyad' in patch) dbPatch.ad_soyad = patch.adSoyad
    if ('telefon' in patch) dbPatch.telefon = patch.telefon || null
    if ('email' in patch) dbPatch.email = patch.email || null
    if ('atananDanismanId' in patch) dbPatch.atanan_danisman_id = patch.atananDanismanId || null
    if ('durum' in patch) dbPatch.durum = patch.durum
    if ('ilkTemasAt' in patch) dbPatch.ilk_temas_at = patch.ilkTemasAt
    if ('sonucAt' in patch) dbPatch.sonuc_at = patch.sonucAt
    if ('kayipNedeni' in patch) dbPatch.kayip_nedeni = patch.kayipNedeni || null
    if ('aciklama' in patch) dbPatch.aciklama = patch.aciklama || null
    if ('kampanyaKodu' in patch) dbPatch.kampanya_kodu = patch.kampanyaKodu || null
    if ('reklamAdi' in patch) dbPatch.reklam_adi = patch.reklamAdi || null
    const data = await run(client().from('leads').update(dbPatch).eq('id', id).select().single())
    return mapLead(data)
  },
}

// --- Recruiting (Aday takibi) --------------------------------------------------
// recruiting_manage RLS'i leads_manage ile birebir aynı — sadece broker/
// owner/ofis. Lead Havuzu'ndan bağımsız da (kendi "+ Yeni Aday" akışıyla)
// kullanılabilir, bkz. lib/recruiting.js notu.
function mapCandidate(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    kaynakLeadId: row.kaynak_lead_id,
    kaynak: row.kaynak,
    adSoyad: row.ad_soyad,
    telefon: row.telefon,
    email: row.email,
    atananDanismanId: row.atanan_danisman_id,
    durum: row.durum,
    olumsuzSebebi: row.olumsuz_sebebi,
    kayitTipi: row.kayit_tipi,
    yenidenAktifAt: row.yeniden_aktif_at,
    aciklama: row.aciklama,
    reklamAdi: row.reklam_adi,
    kampanyaKodu: row.kampanya_kodu,
    gorusmeEventId: row.gorusme_event_id,
    // sorumluId: mentor amaçlı atananDanismanId'den AYRI — adayla fiilen
    // görüşen recruiter (broker/owner/ofis). ilkGorusmeTarihi/sonucTarihi
    // elle hiç yazılmaz, trigger otomatik doldurur (bkz. migration
    // 20261006100000_recruiting_kaynak_raporu.sql).
    sorumluId: row.sorumlu_id,
    ilkGorusmeTarihi: row.ilk_gorusme_tarihi,
    sonucTarihi: row.sonuc_tarihi,
  }
}

export const recruiting = {
  async list() {
    const data = await run(
      client().from('recruiting_candidates').select('*').order('created_at', { ascending: false }),
    )
    return data.map(mapCandidate)
  },
  // kayit_tipi formda YOK — kaynak_lead_id doluysa 'lead', boşsa 'manuel'
  // (bkz. lib/recruiting.js notu). 'gecmis' sadece arşiv taşımasıyla veya
  // "Yeniden Aktifleştir"in tersiyle set edilir, buradan asla.
  async create(form) {
    // Hangi reklamdan geldiği leads.reklam_adi/kampanya_kodu'nda duruyor —
    // dönüşüm anında recruiting_candidates'a kopyalanıyor (denormalize,
    // bkz. migration notu) ki liste ekranında görünsün, aday elle
    // eklendiyse (kaynakLeadId yok) bu adım atlanır.
    let reklamAdi = null
    let kampanyaKodu = null
    if (form.kaynakLeadId) {
      const leadRow = await run(
        client().from('leads').select('reklam_adi, kampanya_kodu').eq('id', form.kaynakLeadId).single(),
      )
      reklamAdi = leadRow.reklam_adi
      kampanyaKodu = leadRow.kampanya_kodu
    }
    const data = await run(
      client()
        .from('recruiting_candidates')
        .insert({
          kaynak_lead_id: form.kaynakLeadId ?? null,
          kaynak: form.kaynak,
          ad_soyad: form.adSoyad,
          telefon: form.telefon || null,
          email: form.email || null,
          atanan_danisman_id: form.atananDanismanId || null,
          durum: form.durum,
          olumsuz_sebebi: form.olumsuzSebebi || null,
          kayit_tipi: form.kaynakLeadId ? 'lead' : 'manuel',
          aciklama: form.aciklama || null,
          reklam_adi: reklamAdi,
          kampanya_kodu: kampanyaKodu,
          sorumlu_id: form.sorumluId || null,
        })
        .select()
        .single(),
    )
    return mapCandidate(data)
  },
  async update(id, patch) {
    const dbPatch = {}
    if ('kaynak' in patch) dbPatch.kaynak = patch.kaynak
    if ('adSoyad' in patch) dbPatch.ad_soyad = patch.adSoyad
    if ('telefon' in patch) dbPatch.telefon = patch.telefon || null
    if ('email' in patch) dbPatch.email = patch.email || null
    if ('atananDanismanId' in patch) dbPatch.atanan_danisman_id = patch.atananDanismanId || null
    if ('durum' in patch) dbPatch.durum = patch.durum
    if ('olumsuzSebebi' in patch) dbPatch.olumsuz_sebebi = patch.olumsuzSebebi || null
    if ('kayitTipi' in patch) dbPatch.kayit_tipi = patch.kayitTipi
    if ('yenidenAktifAt' in patch) dbPatch.yeniden_aktif_at = patch.yenidenAktifAt
    if ('aciklama' in patch) dbPatch.aciklama = patch.aciklama || null
    if ('gorusmeEventId' in patch) dbPatch.gorusme_event_id = patch.gorusmeEventId || null
    if ('sorumluId' in patch) dbPatch.sorumlu_id = patch.sorumluId || null
    const data = await run(client().from('recruiting_candidates').update(dbPatch).eq('id', id).select().single())
    return mapCandidate(data)
  },
  // Görüşme notları günlüğü (recruiting_candidate_notes, bkz. migration
  // 20260927190000) — aciklama'dan AYRI, birikimli/append-only. listNotes()
  // TÜM adayların notlarını tek seferde döner (candidates ile aynı desen,
  // bkz. mockProvider notu) — kart rozetindeki sayı ve detaydaki liste aynı
  // veriden türer. Silme RLS'te SADECE broker/owner'a açık, deleteNote()
  // ofis'ten çağrılırsa sunucu sessizce reddeder (0 satır silinir).
  async listNotes() {
    const data = await run(
      client().from('recruiting_candidate_notes').select('*').order('created_at', { ascending: false }),
    )
    return data.map((n) => ({
      id: n.id,
      candidateId: n.candidate_id,
      notMetni: n.not_metni,
      createdBy: n.created_by,
      createdAt: n.created_at,
    }))
  },
  async addNote({ candidateId, notMetni }, createdBy) {
    const data = await run(
      client()
        .from('recruiting_candidate_notes')
        .insert({ candidate_id: candidateId, not_metni: notMetni, created_by: createdBy })
        .select()
        .single(),
    )
    return { id: data.id, candidateId: data.candidate_id, notMetni: data.not_metni, createdBy: data.created_by, createdAt: data.created_at }
  },
  async deleteNote(id) {
    await run(client().from('recruiting_candidate_notes').delete().eq('id', id))
    return { id }
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
  return {
    id: row.id,
    module: row.module,
    key: row.key,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    visibility: row.visibility,
    parentId: row.parent_id,
  }
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
  async create({ module, key, label, sortOrder, visibility, parentId }) {
    const insertRow = { module, key, label, sort_order: sortOrder }
    if (visibility !== undefined) insertRow.visibility = visibility
    if (parentId !== undefined) insertRow.parent_id = parentId
    const data = await run(client().from('categories').insert(insertRow).select().single())
    return mapCategory(data)
  },
  async update(id, patch) {
    const updateRow = {}
    if (patch.label !== undefined) updateRow.label = patch.label
    if (patch.sortOrder !== undefined) updateRow.sort_order = patch.sortOrder
    if (patch.visibility !== undefined) updateRow.visibility = patch.visibility
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

// --- League (Lig) --------------------------------------------------------------
function mapPeriod(row) {
  return { id: row.id, ad: row.ad, baslangic: row.baslangic, bitis: row.bitis, durum: row.durum ?? 'acik' }
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

// addScore (ciro) ve removeCiroGiris ORTAK — bir satış eklenince/silinince
// score_entries.value (o danışman/dönem toplamı) aynı şekilde yeniden
// hesaplanır. Yanlış girilen bir satırı düzeltmenin tek yolu (broker:
// "Murat Sarılgan'a yanlış giriş yaptık") — önce sil, sonra doğrusunu gir.
async function recomputeCiroTotal(userId, periodId, enteredBy) {
  const rows = await run(
    client().from('ciro_girisleri').select('value').eq('user_id', userId).eq('period_id', periodId),
  )
  const existing = await run(
    client().from('score_entries').select('id').eq('user_id', userId).eq('period_id', periodId).eq('type', 'ciro').maybeSingle(),
  )
  // Son satış da silinince toplam satırı da silinsin — 0 değerli bir
  // score_entries bırakırsak kişi "gerçek verisi yok" olmasına rağmen
  // sıralamada (hatta lider olarak) görünmeye devam eder (broker:
  // "sildim ama sanki kayıt varmış gibi listede görünüyor").
  if (rows.length === 0) {
    if (existing) {
      await run(client().from('score_entries').delete().eq('id', existing.id))
    }
    return
  }
  const total = rows.reduce((sum, r) => sum + Number(r.value), 0)
  if (existing) {
    await run(client().from('score_entries').update({ value: total }).eq('id', existing.id))
  } else {
    await run(client().from('score_entries').insert({ user_id: userId, period_id: periodId, type: 'ciro', value: total, entered_by: enteredBy }))
  }
}

// logSocialActivity ve removeSocialActivity ORTAK — aynı mantık.
// Toplam, girişin yapıldığı andaki puanı sabitleyen puan_snapshot'tan
// hesaplanır — social_activity_types.puan'ın GÜNCEL değerinden değil
// (bkz. /kurul veri-zinciri bulgusu 2: aksi halde broker bir aktivitenin
// puanını değiştirince açıklanmış dönemler dahil tüm geçmiş toplamlar
// sessizce değişiyordu).
async function recomputeSocialTotal(userId, periodId, enteredBy) {
  const logs = await run(
    client().from('social_activity_log').select('adet, puan_snapshot').eq('user_id', userId).eq('period_id', periodId),
  )
  const existing = await run(
    client().from('score_entries').select('id').eq('user_id', userId).eq('period_id', periodId).eq('type', 'sosyal_medya').maybeSingle(),
  )
  // bkz. recomputeCiroTotal — son giriş de silinince toplam satırı silinir.
  if (logs.length === 0) {
    if (existing) {
      await run(client().from('score_entries').delete().eq('id', existing.id))
    }
    return
  }
  const total = logs.reduce((sum, l) => sum + Number(l.adet) * Number(l.puan_snapshot), 0)
  if (existing) {
    await run(client().from('score_entries').update({ value: total }).eq('id', existing.id))
  } else {
    await run(client().from('score_entries').insert({ user_id: userId, period_id: periodId, type: 'sosyal_medya', value: total, entered_by: enteredBy }))
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
  // "Sonuçları açıkla" — periods_manage RLS'i broker/owner'a izin veriyor.
  // Kalıcı: bir kere 'aciklandi' olan dönem geri 'kapali'ya dönmez, danışman
  // o dönemin tam sıralamasını hep görür (2026-09-02 broker kararı).
  async announcePeriod(id) {
    const data = await run(client().from('periods').update({ durum: 'aciklandi' }).eq('id', id).select().single())
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
      await recomputeCiroTotal(userId, period.id, enteredBy)
      return { userId, periodId: period.id, type }
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
      enteredBy: r.entered_by,
      createdAt: r.created_at,
    }))
  },
  // ciro_musterileri_select RLS'i danışmana sadece kendi müşterilerini
  // gösteriyor (mahremiyet) — bu yüzden Memnuniyet sıralaması listCiroMusterileri()
  // yerine bu RPC'den (herkesin TOPLAM sayısını, isim vermeden döner)
  // besleniyor (bkz. migration 20260725110000).
  async listMusteriReviewCounts() {
    const data = await run(client().rpc('list_musteri_review_counts'))
    return data.map((r) => ({ userId: r.user_id, periodId: r.period_id, hakSayisi: Number(r.hak_sayisi), alinanSayisi: Number(r.alinan_sayisi) }))
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
  // "Son Girişler" (bkz. Lig.jsx) — score_entries.value toplamı üstüne
  // yazıldığı için tek başına "en son ne girildi" sorusuna cevap vermiyor,
  // bu da ciro_girisleri/ciro_musterileri gibi ayrı bir geçmiş satırı.
  async listSocialActivityLog() {
    const data = await run(
      client().from('social_activity_log').select('*').order('created_at', { ascending: false }),
    )
    return data.map((r) => ({
      id: r.id,
      userId: r.user_id,
      periodId: r.period_id,
      activityTypeId: r.activity_type_id,
      adet: Number(r.adet),
      enteredBy: r.entered_by,
      createdAt: r.created_at,
    }))
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
    await recomputeSocialTotal(userId, period.id, enteredBy)
    return { userId, periodId: period.id }
  },
  // Yanlış girilen bir ciro satırını/sosyal medya kaydını düzeltmenin tek
  // yolu (broker: "Murat Sarılgan'a yanlış giriş yaptık") — sil, doğrusunu
  // yeniden gir. Silinen satırın user_id/period_id'si score_entries
  // toplamını yeniden hesaplamak için önce okunuyor.
  async removeCiroGiris(id, enteredBy) {
    const row = await run(client().from('ciro_girisleri').select('user_id, period_id').eq('id', id).single())
    await run(client().from('ciro_girisleri').delete().eq('id', id))
    await recomputeCiroTotal(row.user_id, row.period_id, enteredBy)
    return { id }
  },
  async removeSocialActivity(id, enteredBy) {
    const row = await run(client().from('social_activity_log').select('user_id, period_id').eq('id', id).single())
    await run(client().from('social_activity_log').delete().eq('id', id))
    await recomputeSocialTotal(row.user_id, row.period_id, enteredBy)
    return { id }
  },
}

function mapCiroRaporuKatilimcisi(k) {
  return {
    id: k.id,
    ciroRaporuId: k.ciro_raporu_id,
    danismanId: k.danisman_id,
    payOrani: Number(k.pay_orani),
    anlasmaOraniSnapshot: k.anlasma_orani_snapshot == null ? null : Number(k.anlasma_orani_snapshot),
    komisyonTutariOnerisi: k.komisyon_tutari_onerisi == null ? null : Number(k.komisyon_tutari_onerisi),
    faturaNo: k.fatura_no,
    faturaTarihi: k.fatura_tarihi,
    faturaTutari: k.fatura_tutari == null ? null : Number(k.fatura_tutari),
    kdvOrani: k.kdv_orani == null ? null : Number(k.kdv_orani),
    kdvHaricTutar: k.kdv_haric_tutar == null ? null : Number(k.kdv_haric_tutar),
    vergiNo: k.vergi_no,
    faturaDosyaUrl: k.fatura_dosya_url,
    odemeDurumu: k.odeme_durumu,
    notlar: k.notlar,
    gdCirosu: k.gd_cirosu == null ? null : Number(k.gd_cirosu),
    rtPayOraniSnapshot: k.rt_pay_orani_snapshot == null ? null : Number(k.rt_pay_orani_snapshot),
    rtPayiTutari: k.rt_payi_tutari == null ? null : Number(k.rt_payi_tutari),
    ofisPayiTutari: k.ofis_payi_tutari == null ? null : Number(k.ofis_payi_tutari),
  }
}

function mapCiroRaporu(r) {
  return {
    id: r.id,
    opportunityId: r.opportunity_id,
    islemTipi: r.islem_tipi,
    islemTutari: Number(r.islem_tutari),
    islemTarihi: r.islem_tarihi,
    durum: r.durum,
    redSebebi: r.red_sebebi,
    olusturanId: r.olusturan_id,
    onaylayanId: r.onaylayan_id,
    onayTarihi: r.onay_tarihi,
    notlar: r.notlar,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    portfoyTipi: r.portfoy_tipi,
    disBeyanKodu: r.dis_beyan_kodu,
    saticiHizmetBedeliAlindi: r.satici_hizmet_bedeli_alindi,
    saticiAdSoyad: r.satici_ad_soyad,
    saticiTelefon: r.satici_telefon,
    saticiKimlikNo: r.satici_kimlik_no,
    saticiHizmetBedeli: r.satici_hizmet_bedeli == null ? null : Number(r.satici_hizmet_bedeli),
    saticiEkHizmetBedeli: r.satici_ek_hizmet_bedeli == null ? null : Number(r.satici_ek_hizmet_bedeli),
    aliciHizmetBedeliAlindi: r.alici_hizmet_bedeli_alindi,
    aliciAdSoyad: r.alici_ad_soyad,
    aliciTelefon: r.alici_telefon,
    aliciKimlikNo: r.alici_kimlik_no,
    aliciHizmetBedeli: r.alici_hizmet_bedeli == null ? null : Number(r.alici_hizmet_bedeli),
    aliciEkHizmetBedeli: r.alici_ek_hizmet_bedeli == null ? null : Number(r.alici_ek_hizmet_bedeli),
    katilimcilar: (r.ciro_raporu_katilimcilari ?? []).map(mapCiroRaporuKatilimcisi),
  }
}

// --- Ciro Raporu (danışman kendi ciro/fatura raporunu girer, broker
// onaylar — "Ciro Gir" akışının YERİNE geçti, bkz. AI_NOTLARI.md) --------
export const ciroRaporlari = {
  // RLS zaten danışmana sadece kendi/katılımcı olduğu raporları döndürür —
  // broker/owner hepsini görür, ayrı bir filtre parametresi gerekmiyor.
  async list() {
    const data = await run(
      client().from('ciro_raporlari').select('*, ciro_raporu_katilimcilari(*)').order('created_at', { ascending: false }),
    )
    return data.map(mapCiroRaporu)
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
    const rapor = await run(
      client()
        .from('ciro_raporlari')
        .insert({
          opportunity_id: opportunityId ?? null,
          islem_tipi: islemTipi,
          islem_tutari: islemTutari,
          islem_tarihi: islemTarihi,
          notlar: notlar || null,
          olusturan_id: olusturanId,
          portfoy_tipi: portfoyTipi ?? 'portfoyum',
          dis_beyan_kodu: disBeyanKodu || null,
          satici_hizmet_bedeli_alindi: !!saticiHizmetBedeliAlindi,
          satici_ad_soyad: saticiHizmetBedeliAlindi ? saticiAdSoyad || null : null,
          satici_telefon: saticiHizmetBedeliAlindi ? saticiTelefon || null : null,
          satici_kimlik_no: saticiHizmetBedeliAlindi ? saticiKimlikNo || null : null,
          satici_hizmet_bedeli: saticiHizmetBedeliAlindi ? saticiHizmetBedeli ?? null : null,
          satici_ek_hizmet_bedeli: saticiHizmetBedeliAlindi ? saticiEkHizmetBedeli ?? null : null,
          alici_hizmet_bedeli_alindi: !!aliciHizmetBedeliAlindi,
          alici_ad_soyad: aliciHizmetBedeliAlindi ? aliciAdSoyad || null : null,
          alici_telefon: aliciHizmetBedeliAlindi ? aliciTelefon || null : null,
          alici_kimlik_no: aliciHizmetBedeliAlindi ? aliciKimlikNo || null : null,
          alici_hizmet_bedeli: aliciHizmetBedeliAlindi ? aliciHizmetBedeli ?? null : null,
          alici_ek_hizmet_bedeli: aliciHizmetBedeliAlindi ? aliciEkHizmetBedeli ?? null : null,
        })
        .select()
        .single(),
    )
    const katilimciRows = katilimcilar.map((k) => ({
      ciro_raporu_id: rapor.id,
      danisman_id: k.danismanId,
      pay_orani: k.payOrani,
      anlasma_orani_snapshot: k.anlasmaOraniSnapshot ?? null,
      komisyon_tutari_onerisi: k.komisyonTutariOnerisi ?? null,
      gd_cirosu: k.gdCirosu ?? null,
      rt_pay_orani_snapshot: k.rtPayOraniSnapshot ?? null,
      rt_payi_tutari: k.rtPayiTutari ?? null,
      ofis_payi_tutari: k.ofisPayiTutari ?? null,
    }))
    await run(client().from('ciro_raporu_katilimcilari').insert(katilimciRows))
    return mapCiroRaporu(rapor)
  },
  // Taslak/reddedilen bir raporun başlık alanlarını düzenler — RLS zaten
  // sadece olusturan_id + taslak/reddedildi durumunda izin veriyor.
  async update(id, { islemTipi, islemTutari, islemTarihi, notlar }) {
    await run(
      client()
        .from('ciro_raporlari')
        .update({ islem_tipi: islemTipi, islem_tutari: islemTutari, islem_tarihi: islemTarihi, notlar: notlar || null })
        .eq('id', id),
    )
  },
  // "Gönder" — taslak/reddedildi -> onay_bekliyor. RLS WITH CHECK'i
  // danışmanın doğrudan 'onaylandi'ya atlamasını zaten engelliyor.
  async submit(id) {
    await run(client().from('ciro_raporlari').update({ durum: 'onay_bekliyor' }).eq('id', id))
  },
  async updateKatilimciFatura(id, patch) {
    const dbPatch = {}
    if ('faturaNo' in patch) dbPatch.fatura_no = patch.faturaNo || null
    if ('faturaTarihi' in patch) dbPatch.fatura_tarihi = patch.faturaTarihi || null
    if ('faturaTutari' in patch) dbPatch.fatura_tutari = patch.faturaTutari ?? null
    if ('kdvOrani' in patch) dbPatch.kdv_orani = patch.kdvOrani ?? null
    if ('kdvHaricTutar' in patch) dbPatch.kdv_haric_tutar = patch.kdvHaricTutar ?? null
    if ('vergiNo' in patch) dbPatch.vergi_no = patch.vergiNo || null
    if ('faturaDosyaUrl' in patch) dbPatch.fatura_dosya_url = patch.faturaDosyaUrl || null
    if ('odemeDurumu' in patch) dbPatch.odeme_durumu = patch.odemeDurumu
    if ('notlar' in patch) dbPatch.notlar = patch.notlar || null
    if ('rtPayiTutari' in patch) dbPatch.rt_payi_tutari = patch.rtPayiTutari ?? null

    // Çalışan Payı (fatura) veya RT Payı değiştiyse, Ofis Payı (hep kalan)
    // yeniden hesaplanır — üçü GD Cirosu'na eşit kalsın garantisi burada.
    if ('faturaTutari' in patch || 'rtPayiTutari' in patch) {
      const guncel = await run(
        client().from('ciro_raporu_katilimcilari').select('gd_cirosu, fatura_tutari, rt_payi_tutari').eq('id', id).single(),
      )
      const gdCirosuDeger = guncel.gd_cirosu
      if (gdCirosuDeger != null) {
        const calisanPayi = 'faturaTutari' in patch ? patch.faturaTutari : guncel.fatura_tutari
        const rtPayi = 'rtPayiTutari' in patch ? patch.rtPayiTutari : guncel.rt_payi_tutari
        dbPatch.ofis_payi_tutari = Number(gdCirosuDeger) - Number(calisanPayi || 0) - Number(rtPayi || 0)
      }
    }
    await run(client().from('ciro_raporu_katilimcilari').update(dbPatch).eq('id', id))

    // Cari Hesap senkronu: fatura tutarı değiştiyse ilgili alacak satırının
    // tutarı güncellenir; ödeme durumu değiştiyse satır kapanır/açılır —
    // bu katılımcı için approve()'da oluşturulmuş bir satır varsa (yoksa
    // no-op, eq eşleşen satır bulamaz).
    if ('faturaTutari' in patch && patch.faturaTutari != null) {
      await run(
        client()
          .from('cari_hareketler')
          .update({ tutar: patch.faturaTutari })
          .eq('kaynak_tip', 'ciro_raporu_katilimcisi')
          .eq('kaynak_id', id),
      )
    }
    if ('odemeDurumu' in patch) {
      await run(
        client()
          .from('cari_hareketler')
          .update({ durum: patch.odemeDurumu === 'alindi' ? 'kapandi' : 'acik' })
          .eq('kaynak_tip', 'ciro_raporu_katilimcisi')
          .eq('kaynak_id', id),
      )
    }
  },
  // Onaylanınca her katılımcının payına düşen SATIŞ tutarı (komisyon değil
  // — bkz. lib/ciroRaporlari.js notu), mevcut league.addScore() üzerinden
  // ciro_girisleri'ne yazılır. Böylece Lig'in dönem eşleştirmesi/toplam
  // yeniden hesabı (resolvePeriodByDate, recomputeCiroTotal) HİÇ
  // değişmeden, sadece kaynağı değişerek çalışmaya devam ediyor.
  async approve(id, approverId) {
    const [rapor, katilimcilar] = await Promise.all([
      run(client().from('ciro_raporlari').select('islem_tutari, islem_tarihi').eq('id', id).single()),
      run(
        client()
          .from('ciro_raporu_katilimcilari')
          .select('id, danisman_id, pay_orani, komisyon_tutari_onerisi, fatura_tutari')
          .eq('ciro_raporu_id', id),
      ),
    ])
    for (const k of katilimcilar) {
      const value = Number(rapor.islem_tutari) * (Number(k.pay_orani) / 100)
      await league.addScore({ userId: k.danisman_id, type: 'ciro', value, tarih: rapor.islem_tarihi }, approverId)
    }
    await run(
      client()
        .from('ciro_raporlari')
        .update({ durum: 'onaylandi', onaylayan_id: approverId, onay_tarihi: new Date().toISOString() })
        .eq('id', id),
    )
    // Cari Hesap: her katılımcı için hak ediş kadar "alacak" satırı —
    // tutar fatura girilmişse fatura tutarı, girilmemişse önerilen komisyon
    // (sonradan fatura girilince updateKatilimciFatura senkronize eder).
    const cariRows = katilimcilar
      .filter((k) => Number(k.fatura_tutari ?? k.komisyon_tutari_onerisi) > 0)
      .map((k) => ({
        danisman_id: k.danisman_id,
        tarih: rapor.islem_tarihi,
        tur: 'alacak',
        tutar: k.fatura_tutari ?? k.komisyon_tutari_onerisi,
        kategori: 'hizmet_bedeli',
        kaynak_tip: 'ciro_raporu_katilimcisi',
        kaynak_id: k.id,
        created_by: approverId,
      }))
    if (cariRows.length > 0) {
      await run(client().from('cari_hareketler').insert(cariRows))
    }
  },
  async reject(id, redSebebi) {
    await run(client().from('ciro_raporlari').update({ durum: 'reddedildi', red_sebebi: redSebebi }).eq('id', id))
  },
}

// --- Danışman Anlaşmaları (komisyon paylaşım oranı, tarih aralıklı) ------
export const danismanAnlasmalari = {
  async list() {
    const data = await run(client().from('danisman_anlasmalari').select('*').order('gecerlilik_baslangic', { ascending: false }))
    return data.map((a) => ({
      id: a.id,
      danismanId: a.danisman_id,
      paylasimOrani: Number(a.paylasim_orani),
      rtPayOrani: a.rt_pay_orani == null ? null : Number(a.rt_pay_orani),
      gecerlilikBaslangic: a.gecerlilik_baslangic,
      gecerlilikBitis: a.gecerlilik_bitis,
      createdBy: a.created_by,
      createdAt: a.created_at,
    }))
  },
  // Yeni oran girildiğinde, o danışmanın AÇIK (gecerlilik_bitis'i boş) eski
  // satırı varsa, yeni oranın başlangıcından bir gün öncesine kadar
  // kapatılır — social_activity_log'daki puan_snapshot ile AYNI "geçmişi
  // bozma" refleksi: eski rapor hesaplamaları eski oranla donmuş kalır.
  async create({ danismanId, paylasimOrani, rtPayOrani, gecerlilikBaslangic }, createdBy) {
    const acikSatirlar = await run(
      client()
        .from('danisman_anlasmalari')
        .select('id')
        .eq('danisman_id', danismanId)
        .is('gecerlilik_bitis', null),
    )
    if (acikSatirlar.length > 0) {
      const oncekiGun = new Date(new Date(gecerlilikBaslangic).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      await run(
        client()
          .from('danisman_anlasmalari')
          .update({ gecerlilik_bitis: oncekiGun })
          .in(
            'id',
            acikSatirlar.map((r) => r.id),
          ),
      )
    }
    const data = await run(
      client()
        .from('danisman_anlasmalari')
        .insert({
          danisman_id: danismanId,
          paylasim_orani: paylasimOrani,
          rt_pay_orani: rtPayOrani ?? null,
          gecerlilik_baslangic: gecerlilikBaslangic,
          created_by: createdBy,
        })
        .select()
        .single(),
    )
    return {
      id: data.id,
      danismanId: data.danisman_id,
      paylasimOrani: Number(data.paylasim_orani),
      rtPayOrani: data.rt_pay_orani == null ? null : Number(data.rt_pay_orani),
      gecerlilikBaslangic: data.gecerlilik_baslangic,
    }
  },
}

// --- Banka Hareketleri (Vakıfbank API bağlanana kadar elle giriş +
// Ciro Raporu ödemeleriyle eşleştirme, bkz. migration
// 20261009090000_banka_hareketleri.sql) ---------------------------------
function mapBankaHareketi(row) {
  return {
    id: row.id,
    tutar: Number(row.tutar),
    tarih: row.tarih,
    gonderenAdi: row.gonderen_adi,
    aciklama: row.aciklama,
    referansNo: row.referans_no,
    kaynak: row.kaynak,
    durum: row.durum,
    tip: row.tip,
    opportunityId: row.opportunity_id,
    ustHareketId: row.ust_hareket_id,
    tur: row.tur,
    mahsupTutari: row.mahsup_tutari == null ? null : Number(row.mahsup_tutari),
    eslesenKatilimciId: row.eslesen_katilimci_id,
    eslestirenId: row.eslestiren_id,
    eslesmeTarihi: row.eslesme_tarihi,
    olusturanId: row.olusturan_id,
    createdAt: row.created_at,
  }
}

export const bankaHareketleri = {
  async list() {
    const data = await run(client().from('banka_hareketleri').select('*').order('tarih', { ascending: false }))
    return data.map(mapBankaHareketi)
  },
  // bagliOpportunityId + bloke:true verilirse "bağlanma parası" olarak
  // girilir (tapu gününü bekleyen, fırsatla doğrudan ilişkili bir giriş
  // hareketi) — ciro raporu henüz yoktur, bkz. lib/bankaHareketleri.js.
  // tip 'cikis' verilirse (ör. kira/maaş ödemesi) bloke mantığı uygulanmaz,
  // doğrudan eşleşmemiş bir çıkış olarak girilir — sonra "Masraf Olarak
  // İşaretle" ile sınıflandırılır (bkz. masrafOlarakIsaretle).
  async create({ tutar, tarih, gonderenAdi, aciklama, referansNo, opportunityId, bloke, tip }, olusturanId) {
    const cikis = tip === 'cikis'
    const data = await run(
      client()
        .from('banka_hareketleri')
        .insert({
          tutar: Number(tutar),
          tarih,
          gonderen_adi: gonderenAdi || null,
          aciklama: aciklama || null,
          referans_no: referansNo || null,
          kaynak: 'manuel',
          tip: cikis ? 'cikis' : 'giris',
          opportunity_id: !cikis && opportunityId ? opportunityId : null,
          tur: !cikis && bloke ? 'baglanma_parasi' : 'diger',
          durum: !cikis && bloke ? 'blokede' : 'eslesmedi',
          olusturan_id: olusturanId,
        })
        .select()
        .single(),
    )
    return mapBankaHareketi(data)
  },
  // Eşleşmemiş bir çıkış hareketini masraf olarak sınıflandırır —
  // kayıt kaynaksız kalmasın diye islem_masraflari.banka_hareketi_id ile
  // bu hareketle ilişkilendirilir. danismanId verilirse Cari Hesabına
  // "borç" satırı da yazılır (updateKatilimciFatura'daki AYNI senkron
  // deseni — ayrı bir tabloya yazılan, kaynağı net satır).
  async masrafOlarakIsaretle(hareketId, { tur, aciklama, danismanId }, kullaniciId) {
    const hareket = await run(client().from('banka_hareketleri').select('tutar, tarih').eq('id', hareketId).single())
    const masraf = await run(
      client()
        .from('islem_masraflari')
        .insert({
          ciro_raporu_id: null,
          danisman_id: danismanId || null,
          tur,
          aciklama: aciklama || null,
          tutar: Number(hareket.tutar),
          banka_hareketi_id: hareketId,
          created_by: kullaniciId,
        })
        .select()
        .single(),
    )
    if (danismanId) {
      await run(
        client().from('cari_hareketler').insert({
          danisman_id: danismanId,
          tarih: hareket.tarih,
          tur: 'borc',
          tutar: Number(hareket.tutar),
          kategori: 'islem_masrafi',
          aciklama: aciklama || null,
          kaynak_tip: 'islem_masrafi',
          kaynak_id: masraf.id,
          created_by: kullaniciId,
        }),
      )
    }
    await run(
      client()
        .from('banka_hareketleri')
        .update({ durum: 'masraf', eslestiren_id: kullaniciId, eslesme_tarihi: new Date().toISOString() })
        .eq('id', hareketId),
    )
  },
  // Eşleştirince hem hareket "eşleşti" olur hem o katılımcının ödeme
  // durumu "alındı"ya döner — Ciro Raporları ekranındaki elle işaretleme
  // ile AYNI alan, tek kaynak (bkz. CiroRaporuKatilimciRow). Cari Hesap'taki
  // ilgili alacak satırı da kapanır (approve() orada oluşturmuştu).
  async eslestir(hareketId, katilimciId, eslestirenId) {
    await run(
      client()
        .from('banka_hareketleri')
        .update({
          durum: 'eslesti',
          eslesen_katilimci_id: katilimciId,
          eslestiren_id: eslestirenId,
          eslesme_tarihi: new Date().toISOString(),
        })
        .eq('id', hareketId),
    )
    await run(client().from('ciro_raporu_katilimcilari').update({ odeme_durumu: 'alindi' }).eq('id', katilimciId))
    await run(
      client()
        .from('cari_hareketler')
        .update({ durum: 'kapandi' })
        .eq('kaynak_tip', 'ciro_raporu_katilimcisi')
        .eq('kaynak_id', katilimciId),
    )
  },
  // Yanlış eşleştirmeyi düzeltmenin tek yolu — hareketi tekrar
  // "eşleşmedi"ye, katılımcıyı "bekliyor"a, cari hareketi "açık"a döndürür.
  async eslesmeyiKaldir(hareketId) {
    const hareket = await run(
      client().from('banka_hareketleri').select('eslesen_katilimci_id').eq('id', hareketId).single(),
    )
    await run(
      client()
        .from('banka_hareketleri')
        .update({ durum: 'eslesmedi', eslesen_katilimci_id: null, eslestiren_id: null, eslesme_tarihi: null })
        .eq('id', hareketId),
    )
    if (hareket.eslesen_katilimci_id) {
      await run(
        client().from('ciro_raporu_katilimcilari').update({ odeme_durumu: 'bekliyor' }).eq('id', hareket.eslesen_katilimci_id),
      )
      await run(
        client()
          .from('cari_hareketler')
          .update({ durum: 'acik' })
          .eq('kaynak_tip', 'ciro_raporu_katilimcisi')
          .eq('kaynak_id', hareket.eslesen_katilimci_id),
      )
    }
  },
  // Bloke (bağlanma parası) tapu günü çözümlenir — 4 senaryo:
  // geri_gonder/saticiya_gonder (tamamı çıkış), mahsup_et (tamamı hizmet
  // bedeline), kismi_mahsup (bir kısmı mahsup, kalanı çıkış). Mahsup olan
  // kısım mevcut eşleştirme mantığıyla AYNI (katılımcı odeme_durumu +
  // cari hareket kapanır); çıkış kısmı yeni bir banka_hareketleri satırı
  // olarak (tip='cikis', ust_hareket_id=bloke) kayıt altına alınır.
  async blokeyiCozumle(blokeId, { aksiyon, katilimciId, mahsupTutari, aliciAdi }, kullaniciId) {
    const bloke = await run(client().from('banka_hareketleri').select('tutar, tarih').eq('id', blokeId).single())
    const mahsupVar = aksiyon === 'mahsup_et' || aksiyon === 'kismi_mahsup'
    const cikisVar = aksiyon === 'geri_gonder' || aksiyon === 'saticiya_gonder' || aksiyon === 'kismi_mahsup'
    const gercekMahsup = aksiyon === 'mahsup_et' ? Number(bloke.tutar) : Number(mahsupTutari || 0)
    const cikisTutari = aksiyon === 'kismi_mahsup' ? Number(bloke.tutar) - gercekMahsup : Number(bloke.tutar)

    if (mahsupVar && katilimciId) {
      await run(client().from('ciro_raporu_katilimcilari').update({ odeme_durumu: 'alindi' }).eq('id', katilimciId))
      await run(
        client()
          .from('cari_hareketler')
          .update({ durum: 'kapandi' })
          .eq('kaynak_tip', 'ciro_raporu_katilimcisi')
          .eq('kaynak_id', katilimciId),
      )
    }
    if (cikisVar && cikisTutari > 0) {
      await run(
        client()
          .from('banka_hareketleri')
          .insert({
            tutar: cikisTutari,
            tarih: new Date().toISOString().slice(0, 10),
            gonderen_adi: aliciAdi || null,
            aciklama: aksiyon === 'saticiya_gonder' ? 'Satıcıya gönderim' : 'Geri gönderim',
            kaynak: 'manuel',
            tip: 'cikis',
            ust_hareket_id: blokeId,
            durum: 'eslesti',
            olusturan_id: kullaniciId,
          }),
      )
    }
    await run(
      client()
        .from('banka_hareketleri')
        .update({
          durum: 'cozuldu',
          eslesen_katilimci_id: mahsupVar ? katilimciId : null,
          mahsup_tutari: aksiyon === 'kismi_mahsup' ? gercekMahsup : null,
          eslestiren_id: kullaniciId,
          eslesme_tarihi: new Date().toISOString(),
        })
        .eq('id', blokeId),
    )
  },
}

// --- Cari Hesap (danışman borç/alacak defteri, bkz. migration
// 20261009110000_cari_hesap_ve_masraflar.sql) -------------------------------
function mapCariHareket(row) {
  return {
    id: row.id,
    danismanId: row.danisman_id,
    tarih: row.tarih,
    tur: row.tur,
    tutar: Number(row.tutar),
    kategori: row.kategori,
    aciklama: row.aciklama,
    kaynakTip: row.kaynak_tip,
    kaynakId: row.kaynak_id,
    durum: row.durum,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export const cariHareketler = {
  // RLS: broker/owner hepsini görür, danışman sadece kendi satırlarını.
  async list() {
    const data = await run(client().from('cari_hareketler').select('*').order('tarih', { ascending: false }))
    return data.map(mapCariHareket)
  },
  // Elle borç/alacak girişi — aylık ofis faturası (sahibinden/katılım
  // bedeli) burdan girilir, kategori/danisman seçilerek.
  async create({ danismanId, tarih, tur, tutar, kategori, aciklama }, createdBy) {
    const data = await run(
      client()
        .from('cari_hareketler')
        .insert({
          danisman_id: danismanId,
          tarih,
          tur,
          tutar: Number(tutar),
          kategori,
          aciklama: aciklama || null,
          kaynak_tip: 'manuel',
          created_by: createdBy,
        })
        .select()
        .single(),
    )
    return mapCariHareket(data)
  },
}

// --- İşlem Masrafları (ciro raporuna bağlı masraf detayı, bkz. aynı
// migration) ------------------------------------------------------------
function mapIslemMasrafi(row) {
  return {
    id: row.id,
    ciroRaporuId: row.ciro_raporu_id,
    danismanId: row.danisman_id,
    tur: row.tur,
    aciklama: row.aciklama,
    tutar: Number(row.tutar),
    bankaHareketiId: row.banka_hareketi_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export const islemMasraflari = {
  // Masraflar artık manuel girilmiyor — tamamı Banka Hareketleri'nden
  // "Masraf Olarak İşaretle" ile geliyor (bkz. bankaHareketleri.
  // masrafOlarakIsaretle, 2026-10-09 broker kararı). listAll() Masraflar
  // sekmesindeki rapor listesi için.
  async listAll() {
    const data = await run(client().from('islem_masraflari').select('*').order('created_at', { ascending: false }))
    return data.map(mapIslemMasrafi)
  },
}

// --- Users -----------------------------------------------------------------
export const users = {
  async listKnown() {
    const data = await run(client().from('users').select('id, ad, rol, durum, test_hesabi').eq('durum', 'aktif'))
    const map = {}
    for (const u of data) map[u.id] = { id: u.id, name: u.ad, role: u.rol, testHesabi: u.test_hesabi }
    return map
  },
  // Ayarlar > Kullanıcılar: pasif olanlar dahil HERKESİ listeler (yönetim
  // amaçlı) — users_select_all RLS'i is_active() ile sadece çağıranın
  // kendisinin aktif olmasını şart koşuyor, hedef satırın durumunu değil.
  async listAll() {
    const data = await run(
      client().from('users').select('id, ad, email, rol, durum, test_hesabi, kaynak, created_at').order('ad'),
    )
    return data.map((u) => ({
      id: u.id,
      name: u.ad,
      email: u.email,
      role: u.rol,
      durum: u.durum,
      testHesabi: u.test_hesabi,
      kaynak: u.kaynak,
      createdAt: u.created_at,
    }))
  },
  // users_update_self_or_broker RLS'i sadece broker/owner'a (veya kendi
  // satırına) izin veriyor.
  async updateUser(id, patch) {
    const dbPatch = {}
    if ('name' in patch) dbPatch.ad = patch.name
    if ('role' in patch) dbPatch.rol = patch.role
    if ('durum' in patch) dbPatch.durum = patch.durum
    if ('testHesabi' in patch) dbPatch.test_hesabi = patch.testHesabi
    await run(client().from('users').update(dbPatch).eq('id', id))
    return { id, ...patch }
  },
  // Gerçek auth hesabı oluşturmak service_role gerektirir — bu yüzden
  // tarayıcıdan doğrudan değil, create-user Edge Function'ı üzerinden
  // gidiyor (bkz. supabase/functions/create-user). Fonksiyon çağıranın
  // gerçekten broker/owner olduğunu kendi içinde ayrıca doğruluyor.
  async createUser({ ad, email, password, rol, telefon, kaynak }) {
    const { data, error } = await client().functions.invoke('create-user', {
      body: { ad, email, password, rol, telefon, kaynak },
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
  // Gerçek "portal kullanıyor" sinyali — auth.users.last_sign_in_at sadece
  // yeniden şifre/link girişinde güncelleniyor, oturum açık kaldığı sürece
  // donuk kalıyor (bkz. migration 20260902130000). AuthContext bunu şifre
  // istemeden, sınırlı sıklıkta çağırır.
  async touchActivity() {
    await run(client().rpc('touch_activity'))
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
  // endpoint unique olduğu için aynı cihaz/tarayıcı tekrar abone olursa
  // upsert ile üstüne yazılır, ikinci bir satır oluşmaz.
  async savePushSubscription(subscription, userId) {
    await run(
      client()
        .from('push_subscriptions')
        .upsert(
          { user_id: userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
          { onConflict: 'endpoint' },
        ),
    )
  },
  async removePushSubscription(endpoint) {
    await run(client().from('push_subscriptions').delete().eq('endpoint', endpoint))
  },
  // Dijital kartvizit: kendi profilini düzenlerken mevcut değerleri
  // doldurmak için — users_select_all zaten kendi satırını görmesine izin
  // veriyor, ayrı bir RPC gerekmiyor (get_kartvizit sadece BAŞKALARININ
  // kartını anonim/herkese açık okumak için var, bkz. migration).
  async getMyProfile(userId) {
    const data = await run(
      client().from('users').select('id, ad, telefon, email, avatar_url, rol, sosyal_medya, kartvizit_aktif').eq('id', userId).single(),
    )
    return {
      id: data.id,
      name: data.ad,
      telefon: data.telefon,
      email: data.email,
      avatarUrl: data.avatar_url,
      role: data.rol,
      sosyalMedya: data.sosyal_medya ?? {},
      kartvizitAktif: data.kartvizit_aktif,
    }
  },
  async updateProfile(userId, patch) {
    const dbPatch = {}
    if ('telefon' in patch) dbPatch.telefon = patch.telefon || null
    if ('avatarUrl' in patch) dbPatch.avatar_url = patch.avatarUrl || null
    if ('sosyalMedya' in patch) dbPatch.sosyal_medya = patch.sosyalMedya ?? {}
    if ('kartvizitAktif' in patch) dbPatch.kartvizit_aktif = patch.kartvizitAktif
    await run(client().from('users').update(dbPatch).eq('id', userId))
    return { id: userId, ...patch }
  },
  // Herkese açık kartvizit sayfası (/k/:userId) — giriş yapmamış (anon)
  // ziyaretçi için, sadece kartvizit_aktif=true VE durum='aktif' olan
  // kullanıcıların GÜVENLİ bir alt kümesini döner (bkz. get_kartvizit RPC).
  async getPublicCard(userId) {
    const data = await run(client().rpc('get_kartvizit', { p_user_id: userId }).maybeSingle())
    if (!data) return null
    return {
      name: data.ad,
      telefon: data.telefon,
      email: data.email,
      avatarUrl: data.avatar_url,
      role: data.rol,
      sosyalMedya: data.sosyal_medya ?? {},
    }
  },
}

// --- Mentor Primi (Ayarlar, sadece broker) ----------------------------------
// mentor_primi_baslangic_manage RLS'i SADECE broker'a izin veriyor (owner
// dahil hiç kimse — bkz. migration 20261008110000). Her danışman için
// AYRICA belirlenen bir mentorluk başlangıç tarihi — users.created_at'ten
// BİLEREK bağımsız (bkz. lib/mentorPrimi.js notu).
export const mentorPrimi = {
  async listBaslangicTarihleri() {
    const data = await run(client().from('mentor_primi_baslangic').select('*'))
    return data.map((r) => ({ userId: r.user_id, baslangicTarihi: r.baslangic_tarihi, setBy: r.set_by, updatedAt: r.updated_at }))
  },
  async upsertBaslangicTarihi(userId, baslangicTarihi, setBy) {
    await run(
      client()
        .from('mentor_primi_baslangic')
        .upsert({ user_id: userId, baslangic_tarihi: baslangicTarihi, set_by: setBy, updated_at: new Date().toISOString() }),
    )
    return { userId, baslangicTarihi }
  },
  async removeBaslangicTarihi(userId) {
    await run(client().from('mentor_primi_baslangic').delete().eq('user_id', userId))
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
  // Yönlendirme Puanı "Kapalı" durumdaki bir danışmana yine de atama
  // yapılırken gerekçeyi audit_log'a yazan RPC (bkz. migration
  // 20261006120000). audit_log'a uygulama kodundan elle yazılan tek
  // kayıt türü — actor_id sunucu tarafında auth.uid() ile set edilir.
  async logDusukPuanAtama({ tablo, kayitId, danismanId, gerekce }) {
    await run(
      client().rpc('log_dusuk_puan_atama', {
        p_tablo: tablo,
        p_kayit_id: kayitId,
        p_danisman_id: danismanId,
        p_gerekce: gerekce,
      }),
    )
  },
}

// --- Webhook Hataları (Ayarlar > Webhook Hataları) ----------------------------
// meta_webhook_errors_select RLS'i sadece broker/owner'a okuma izni veriyor —
// Meta Lead Ads webhook'u (bkz. supabase/functions/meta-leads-webhook) bir
// lead'i işleyemediğinde (imza/Graph API/alan eşleşme/insert hatası) ham
// payload'ı buraya yazar. audit_log'dan BİLEREK ayrı (bkz. o dosyanın notu).
export const metaWebhookErrors = {
  async list() {
    const data = await run(
      client().from('meta_webhook_errors').select('*').order('created_at', { ascending: false }).limit(100),
    )
    return data.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      tur: r.tur,
      leadgenId: r.leadgen_id,
      rawPayload: r.raw_payload,
      hataMesaji: r.hata_mesaji,
    }))
  },
}

// telsam_webhook_errors_select RLS'i sadece broker/owner'a okuma izni veriyor
// — meta_webhook_errors ile birebir aynı desen, telsam-webhook (push) ve
// telsam-cdr-sync (pull/cron) entegrasyonlarının hatalarını tutar.
export const telsamWebhookErrors = {
  async list() {
    const data = await run(
      client().from('telsam_webhook_errors').select('*').order('created_at', { ascending: false }).limit(100),
    )
    return data.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      kaynak: r.kaynak,
      tur: r.tur,
      chanid: r.chanid,
      rawPayload: r.raw_payload,
      hataMesaji: r.hata_mesaji,
    }))
  },
}

// meta_capi_errors_select RLS'i sadece broker/owner'a okuma izni veriyor —
// meta_webhook_errors ile AYNI desen, ama TERS yön (Portal -> Meta durum
// bildirimi, meta-leads-webhook'un tersi — bkz.
// supabase/functions/send-meta-conversion).
export const metaCapiErrors = {
  async list() {
    const data = await run(
      client().from('meta_capi_errors').select('*').order('created_at', { ascending: false }).limit(100),
    )
    return data.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      tur: r.tur,
      metaLeadId: r.meta_lead_id,
      eventName: r.event_name,
      rawPayload: r.raw_payload,
      hataMesaji: r.hata_mesaji,
    }))
  },
}

// --- Görevler (Planlama > Görevler) -------------------------------------------
function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    createdBy: row.created_by,
    dueDate: row.due_date,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }
}

export const tasks = {
  // tasks_select RLS'i zaten görebileceklerini filtreliyor — burada ek bir
  // client-side rol kontrolüne gerek yok (diğer list()'lerle aynı desen).
  async list() {
    const data = await run(client().from('tasks').select('*').order('created_at', { ascending: false }))
    return data.map(mapTask)
  },
  async create(form, createdBy) {
    const row = await run(
      client()
        .from('tasks')
        .insert({
          title: form.title,
          description: form.description || null,
          assignee_id: form.assigneeId,
          created_by: createdBy,
          due_date: form.dueDate || null,
        })
        .select()
        .single(),
    )
    return mapTask(row)
  },
  async update(id, patch) {
    const dbPatch = {}
    if ('title' in patch) dbPatch.title = patch.title
    if ('description' in patch) dbPatch.description = patch.description || null
    if ('assigneeId' in patch) dbPatch.assignee_id = patch.assigneeId
    if ('dueDate' in patch) dbPatch.due_date = patch.dueDate || null
    if ('status' in patch) {
      dbPatch.status = patch.status
      dbPatch.completed_at = patch.status === 'tamamlandi' ? new Date().toISOString() : null
    }
    const row = await run(client().from('tasks').update(dbPatch).eq('id', id).select().single())
    return mapTask(row)
  },
  async remove(id) {
    await run(client().from('tasks').delete().eq('id', id))
  },
}

// --- Koçluk Notları (Takip) ---------------------------------------------------
// coaching_notes_select RLS'i zaten broker/owner dışını filtreliyor — ofis/
// danışman list() çağırırsa boş dizi döner (hata değil). Danışmanın kendi
// "hedef/aksiyon" kısmı AYRI bir görünümden (coaching_note_hedefleri) gelir
// — konusulanlar/yazan_id o görünümde hiç yok, gerçek bir sunucu sınırı
// (bkz. migration 20261006090000 notu).
function mapCoachingNote(row) {
  return {
    id: row.id,
    danismanId: row.danisman_id,
    yazanId: row.yazan_id,
    gorusmeTarihi: row.gorusme_tarihi,
    gorusmeTuru: row.gorusme_turu,
    konusulanlar: row.konusulanlar,
    konu: row.konu,
    portfoyHedefi: row.portfoy_hedefi,
    portfoySayisiOAn: row.portfoy_sayisi_o_an,
    sonuc: row.sonuc,
    takipTarihi: row.takip_tarihi,
    durum: row.durum,
    createdAt: row.created_at,
  }
}

export const coachingNotes = {
  async list() {
    const data = await run(client().from('coaching_notes').select('*').order('gorusme_tarihi', { ascending: false }))
    return data.map(mapCoachingNote)
  },
  // userId parametresi mockProvider ile aynı imzayı korumak için var —
  // gerçek sorguda kullanılmıyor, görünüm zaten auth.uid()'e göre daralıyor.
  async listMyTargets(_userId) {
    const data = await run(
      client().from('coaching_note_hedefleri').select('*').order('takip_tarihi', { ascending: true }),
    )
    return data.map((row) => ({
      id: row.id,
      danismanId: row.danisman_id,
      gorusmeTarihi: row.gorusme_tarihi,
      konu: row.konu,
      portfoyHedefi: row.portfoy_hedefi,
      portfoySayisiOAn: row.portfoy_sayisi_o_an,
      takipTarihi: row.takip_tarihi,
      durum: row.durum,
    }))
  },
  // portfoySayisiOAn: broker elle yazmıyor — çağıran taraf (TakipTab) zaten
  // yüklü olan opportunities listesinden lib/coachingNotes.js
  // countActivePortfoy() ile hesaplayıp buraya geçiriyor (bkz. o dosyadaki
  // not — raporlanabilir yapı, 2026-10-07).
  async create(form) {
    const row = await run(
      client()
        .from('coaching_notes')
        .insert({
          danisman_id: form.danismanId,
          yazan_id: form.yazanId,
          gorusme_tarihi: form.gorusmeTarihi || new Date().toISOString().slice(0, 10),
          gorusme_turu: form.gorusmeTuru,
          konusulanlar: form.konusulanlar,
          konu: form.konu,
          portfoy_hedefi: form.portfoyHedefi ?? null,
          portfoy_sayisi_o_an: form.portfoySayisiOAn ?? null,
          takip_tarihi: form.takipTarihi || null,
        })
        .select()
        .single(),
    )
    return mapCoachingNote(row)
  },
  async update(id, patch) {
    const dbPatch = {}
    if ('konusulanlar' in patch) dbPatch.konusulanlar = patch.konusulanlar
    if ('konu' in patch) dbPatch.konu = patch.konu
    if ('portfoyHedefi' in patch) dbPatch.portfoy_hedefi = patch.portfoyHedefi ?? null
    if ('sonuc' in patch) dbPatch.sonuc = patch.sonuc ?? null
    if ('takipTarihi' in patch) dbPatch.takip_tarihi = patch.takipTarihi || null
    if ('durum' in patch) dbPatch.durum = patch.durum
    if ('gorusmeTuru' in patch) dbPatch.gorusme_turu = patch.gorusmeTuru
    const row = await run(client().from('coaching_notes').update(dbPatch).eq('id', id).select().single())
    return mapCoachingNote(row)
  },
}
