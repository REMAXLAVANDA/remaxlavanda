# RE/MAX Lavanda Portal — Çalışma Prensibi Analizi

**Tarih:** 2026-08-15 (araştırma) / 2026-08-16 (bağımsız doğrulama)
**Kapsam:** Kod değiştirilmedi — sadece okuma/analiz. Tüm bulgular `panel-app/src`, `panel-app/supabase/migrations`, `panel-app/supabase/functions` ve `panel-app/supabase/seed` kaynak kodundan çıkarılmıştır.
**Yöntem:** 5 paralel araştırma turu + sentez, ardından **rapora hiç güvenmeyen, kaynak kodu sıfırdan yeniden okuyan 4 bağımsız doğrulama turu** (her bölüm ayrı bir ajan tarafından, orijinal bulgulardan habersiz şekilde tekrar doğrulandı). Emin olunamayan her nokta **DOĞRULANMADI** olarak işaretlendi. Öneri/"bence şöyle olmalı" içermez — sadece mevcut durumu anlatır.

**Doğrulama sonucu:** Rapordaki 152 somut, kontrol edilebilir iddianın **148'i DOĞRU**, **0'ı YANLIŞ**, **3'ü KISMEN DOĞRU** (aşırı sadeleştirme — aşağıda düzeltildi), **0'ı ARTIK GEÇERLİ DEĞİL** bulundu. Tespit edilen 4 küçük düzeltme bu sürüme işlenmiştir:
1. Archive şemasındaki tablo sayısı 28 değil **31**.
2. Ofis rolünün Görevler'de gördüğü kayıt kümesi "sadece kendi" değil, **"kendi oluşturduğu VEYA kendisine atanan"** (OR koşulu).
3. RLS mimarisinin "tutarlılığı" mutlak değil — Kartvizitim gibi bazı sayfalarda route guard hiç yok (bu zaten §16'da risk olarak işaretliydi, §17-A'daki genel ifade netleştirildi).
4. `public.users`→`auth.users` cascade FK'sinin kendisi migration satırında doğrudan görülmedi (davranışla tutarlı ama düşük güvenle "muhtemelen" olarak işaretlendi).

---

## 0. Önce iki kritik düzeltme

**"index.html" hakkında:** Bu portal artık tek bir `index.html` içinde çalışan bir sistem değil — React/Vite SPA'dır. `panel-app/index.html` sadece Vite'ın giriş dosyasıdır (`&lt;div id="root"&gt;` + `main.jsx` script etiketi), hiçbir iş mantığı içermez. Gerçek mantık `panel-app/src/pages/*`, `panel-app/src/components/*`, `panel-app/src/lib/*` altında, Supabase ile konuşan `panel-app/src/lib/dataProvider/supabaseProvider.js` üzerinden yürür. Bu rapor bu gerçek kaynağa dayanır.

**"dan_toplanti"/"dan_egitim" hakkında:** Bu tablolar mevcut/çalışan şemada **kullanılmıyor**. `panel-app/supabase/migrations/20260722090000_eski_portal_tablolarini_arsivle.sql` ile `archive` şemasına taşınmış, eski bir prototipten kalma tablolardır (dosya başı yorumu: *"mevcut React uygulamasının HİÇ kullanmadığı tablolar... kod tabanında bu tablolara hiçbir referans yok — doğrulandı"*). Aynı migration'la **31 tablo** arşivlenmiş (doğrulama turunda `alter table ... set schema archive` satırları tek tek sayıldı): `dan_toplanti, dan_egitim, skor_events, skor_event_attendance, etkinlikler, training_programs, training_modules, training_attendance, checklist_maddeler, leads(eski), recruiting_candidates(eski), danismanlar, havuz, timeline, cagri_log, ...` Bunlardan **`leads`** ve **`recruiting_candidates`** özellikle dikkat çekici: bugünkü `public.leads`/`public.recruiting_candidates` ile **aynı isimde ama tamamen farklı, ilgisiz şemalardır** — bugünküler çok sonra (`20260726090000`, `20260726150000` migration'ları ile) sıfırdan yeniden yazılmıştır. Bu raporun geri kalanı gerçek/çalışan tablo adlarını (`calendar_events`, `event_attendance`, `education_modules`, `education_progress`, güncel `leads`, güncel `recruiting_candidates` vb.) kullanır.

---

## 1. ROLLER VE YETKİLER

Kodda birebir kullanılan roller (`panel-app/src/lib/roles.js:5-10`, DB enum `panel-app/supabase/migrations/20260715072704_init_schema.sql:27`): **`broker`, `owner`, `ofis`, `danisman`** — 4 rol. "Admin/Ofis/GD" üçlüsü kodda birebir bu isimlerle yok; `broker` ve `owner` birbirinden farklı yetkilere sahip iki AYRI roldür (owner "Admin" değildir).

### 1.1 Route/Menü mimarisi

`HashRouter` (`panel-app/src/App.jsx:62-107`). Route seviyesinde rol bazlı `&lt;Route&gt;` guard'ı **yok** — `ProtectedRoute` sadece "oturum var mı" kontrolü yapar, role bakmaz. Rol kısıtı iki katmanda uygulanır:

1. **Menü görünürlüğü** — `panel-app/src/lib/modules.js`: `ALL_ROLES` (4 rol), `MANAGE_ROLES` (broker/owner/ofis), `LEADS_ROLES` (broker/owner). `getModulesForRole(role)` bu listeyi filtreler, `Sidebar.jsx` bunu kullanır.
2. **Sayfa içi guard** — bazı sayfalarda var, bazılarında yok (aşağıdaki tablo).

| Sayfa | Route guard | Kanıt |
|---|---|---|
| `/leads` | VAR — `if (!canManageLeads(role)) return &lt;Navigate to="/panel"/&gt;` | `Leads.jsx:244` |
| `/recruiting` | VAR — aynı desen | `Recruiting.jsx:161` |
| `/ayarlar` | VAR — kilit ekranı (yönlendirme değil) | `Ayarlar.jsx:332-340` |
| `/firsatlar`, `/operasyon` | YOK | — |
| `/takip`, `/egitim` | YOK (sayfa seviyesinde) | — |
| `/lig` | YOK | — |
| `/rehber` | YOK | — |
| `/kartvizitim` | **YOK — güvenlik bulgusu, bkz. §16** | `Kartvizitim.jsx` (role hiç okunmuyor) |
| `/pano` | YOK (sadece oturum kontrolü) | `Pano.jsx` |

**Kritik bulgu:** `ofis` rolü menüde "Kartvizitim" linkini görmez (`hasKartvizit()` false döner) ama sayfanın kendisinde hiçbir engel yok — URL'e `#/kartvizitim` yazan bir ofis kullanıcısı sayfayı açıp kendi kartvizit bilgisini (telefon/sosyal medya/avatar) görüntüleyip düzenleyebilir (RLS `users_update_self_or_broker` kendi satırına izin verir). Sadece UI seviyesi gizleme, gerçek erişim engeli değil.

### 1.2 RLS mimarisinin temel taşları

`current_user_role()`, `is_manager()` (sadece broker/owner), `is_active()` — üçü de `security definer`, `users` tablosunu RLS'i bypass ederek okur (döngüsel policy sorununu önlemek için). `is_manager()`'a **ofis dahil değildir** — bu portaldaki en sık yanlış varsayılabilecek nokta.

### 1.3 Rol Bazlı Özet Tablo

| Rol | Menüler | Görebildiği (RLS SELECT özet) | Ekleyebildiği | Düzenleyebildiği | Silebildiği | Cross-module etkiler |
|---|---|---|---|---|---|---|
| **broker** | Panel, Fırsatlar, Lead Havuzu, Recruiting, Planlama, Takip, Lig, Rehber + Kartvizitim + Ayarlar | Her şey (owner'ın gizlediği fırsatlar dahil) | Her şey | Her şey (users.rol/durum dahil) | **opportunities (tek yetkili)**, categories, tasks | Yeni havuz fırsatı → push; kullanıcı silme → tasks/opportunities/call_logs vb. referansları NULL'lanır (silinmez) |
| **owner** | broker ile aynı | broker ile aynı, **istisna: broker'ın fiilen üstlendiği fırsatlar owner'dan gizli** (2026-08-02 kararı) | opportunities/call_logs/leads/recruiting/tasks/score_entries/calendar (docs, periods, social_activity_types HARİÇ) | opportunities/users/call_logs(7 gün)/tasks/calendar | **opportunities SİLEMEZ**; categories/tasks silebilir | assign_opportunity_to() kullanabilir |
| **ofis** | Panel, Fırsatlar, Recruiting, Planlama, Takip, Lig, Rehber (**Lead Havuzu, Kartvizitim, Ayarlar YOK**) | opportunities(kendi+açık havuz), call_logs(tümü), recruiting(tümü), tasks(**kendi oluşturduğu VEYA kendisine atanan**), score/ciro/social(tümü), calendar(tümü), docs(tümü); **leads=0 satır, audit_log=erişemez, webhook_errors=erişemez** | opportunities, call_logs, recruiting, tasks, score/ciro/social, docs; **leads EKLEYEMEZ** | opportunities(kendi), call_logs(7 gün penceresi), tasks(kendi), users(kendi) | **opportunities SİLEMEZ**; tasks silebilir | assign_opportunity_to() **KULLANAMAZ** (is_manager şartı); Kartvizitim'e route guard olmadan URL'den erişebilir (bkz. §16) |
| **danisman** | Panel, Fırsatlar, Planlama, Takip, Lig, Rehber + Kartvizitim (**Lead Havuzu, Recruiting, Ayarlar YOK**) | opportunities(kendi+açık havuz), call_logs(**sadece kendine atanan**), tasks(kendine atanan), score/ciro/social(**herkesinkini görür** — Lig için bilinçli), calendar(davetli+genel tür), docs(tümü); **leads/recruiting/audit_log/webhook_errors = hiç erişemez** | opportunities(kendi adına), opportunity_interest, event_attendance(kendi, sınırlı); **call_logs/leads/recruiting/tasks/skor girişi YAPAMAZ** | opportunities(kendi), call_logs(sadece kendine atananın sonucu), tasks(sadece kendi durumu), users(kendi, rol/durum hariç) | **HİÇBİR ŞEYİ SİLEMEZ** | close_opportunity() sadece kendi üstlendiği fırsatı kapatabilir |

*(Rol/RLS detayının tam dökümü — her tablonun SELECT/INSERT/UPDATE/DELETE policy'si, RPC yetkileri, kolon-seviyesi kısıtlar — bu raporun temelini oluşturan araştırmada tablo tablo çıkarılmıştır; en kritik olanlar §3, §6, §7, §9, §11'de ilgili modül bağlamında tekrar geçer.)*

---

## 2. TÜM MENÜLERİN ÇALIŞMA PRENSİBİ

### Panel
**Amaç:** Ana kokpit — role göre farklılaşan özet ekranı (broker/owner: "Ofisin Nabzı" + kartlar; danışman: kişisel özet; ofis: 2 sütunlu klasik görünüm + Danışman Sağlık Skoru kartı).
**Veri Kaynağı:** Tek bir `Promise.all` (`Panel.jsx:63-124`) ile 17 kaynak paralel çekilir: `calls, opps, events, attendance, modules, progress, checklistItems, checklistStatus, periods, scores, activity, ciroMusterileri, users, ciroGirisleri, musteriReviewCounts, leads, recruitingCandidates`.
**Veri Girişi:** Panel'de doğrudan veri girişi yok (salt-okunur özet), yalnızca danışman ekranında etkinliklere RSVP mümkün.
**İşlem Sonucu:** Yok — görüntüleme ekranı.
**Veri Nereye Yazılıyor:** N/A.
**Bağlantılı Modüller:** Operasyon, Fırsatlar, Recruiting, Takvim, Eğitim, Takip, Lig — hepsinin özetini gösterir, `?odak=` query param'ıyla ilgili sayfaya filtreli yönlendirme yapar (`attention.js` kriterleri).
**Silme/Düzenleme:** Yok.
**Rol Yetkisi:** ALL_ROLES görür, içerik role göre şekillenir (ayrıntı §3).

### Fırsatlar / Operasyon
**Amaç:** Portföy (satıcı/alıcı) fırsatlarının ve gelen çağrıların (Santral/Reklam/Web) yönetimi — aynı sayfada iki sekme.
**Veri Kaynağı:** `opportunities`, `call_logs` tabloları.
**Veri Girişi:** Fırsat formu (tip, kategori, konum, fiyat, m², oda sayısı, özet); çağrı formu (kaynak, arayan ad/telefon, sonuç).
**İşlem Sonucu:** Fırsat kaydet → `opportunitiesProvider.create()` (INSERT `opportunities`); çağrı kaydet → `callLogsProvider.create()` (INSERT `call_logs`, `generateTalepKodu()` ile `portfoy_no` üretilir); çağrıyı fırsata dönüştür → yeni `opportunities` satırı + `call_logs.opportunity_id` set edilir.
**Veri Nereye Yazılıyor:** `opportunities` (owner_id/claimer_id/status/closed_by), `call_logs` (assigned_to/donus_yapildi_mi/opportunity_id).
**Bağlantılı Modüller:** Örnek: Operasyon → call_logs → (dönüştürülürse) Fırsatlar → Panel (Ofisin Nabzı "Portföy" kutusu) → Dikkat Gerekiyor (3+ gün açık kalan fırsatlar).
**Silme/Düzenleme:** Fırsat: `opportunitiesProvider.remove()` **gerçek DELETE**, sadece **broker**. Çağrı: `callLogsProvider.remove()` **gerçek DELETE**, broker/owner/ofis.
**Rol Yetkisi:** Ekleme broker/owner/ofis (+ danışman sadece kendi adına); görüntüleme rol bazlı filtreli (§1.3).

### Lead Havuzu
**Amaç:** Meta reklam webhook'undan gelen ham lead'lerin (recruiting veya portföy niyetli) triyaj/dağıtım noktası — artık bir "pipeline" değil, sadece "kime gitsin" kararının verildiği yer.
**Veri Kaynağı:** `leads` tablosu (`tip`: recruiting/portfoy; `durum`: yeni/atandi/elendi).
**Veri Girişi:** **Elle kayıt eklenmiyor** — sadece Meta webhook'undan otomatik gelir (`Leads.jsx:132-134` yorum).
**İşlem Sonucu:** "Recruiting'e Dönüştür" → `recruiting_candidates` INSERT + `leads.durum='atandi'`; "Portföy'e Ata" → `opportunities` INSERT (`portfoyNo: generateTalepKodu('Reklam')`) + `leads.durum='atandi'`; "Ele" → `leads.durum='elendi'`.
**Veri Nereye Yazılıyor:** `leads.durum`, hedef tabloya (`recruiting_candidates` veya `opportunities`) yeni satır.
**Bağlantılı Modüller:** Lead Havuzu → Recruiting (kaynak eşleme: `LEAD_TO_RECRUITING_KAYNAK` sabiti) → Recruiting özet/Panel; Lead Havuzu → Fırsatlar → Panel "Reklam Kaynakları".
**Silme/Düzenleme:** **Silme fonksiyonu hiç yok** (`supabaseProvider.js`'de `leads.remove()` tanımlı değil) — sadece durum güncellenir.
**Rol Yetkisi:** **Sadece broker/owner** (RLS `leads_manage`, 2026-07-26'da ofis'ten alınmış).

### Recruiting
**Amaç:** İşe alım adayı takibi, 7 aşamalı huni.
**Veri Kaynağı:** `recruiting_candidates` tablosu.
**Veri Girişi:** Ad-soyad, telefon, email, kaynak (13 değerlik sabit liste), görüşme/randevu tarihi.
**İşlem Sonucu:** Durum değişikliği bir `&lt;select&gt;` dropdown ile yapılır (**kanban/drag-drop YOK**), "Kaydet" → `recruitingProvider.update()`. Görüşme tarihi girilince otomatik `calendar_events` (`type='recruiting_gorusmesi'`) satırı açılır/güncellenir.
**Veri Nereye Yazılıyor:** `recruiting_candidates.durum`, `.gorusme_event_id` → `calendar_events`.
**Bağlantılı Modüller:** Lead Havuzu (dönüşüm kaynağı), Takvim (görüşme etkinliği), Panel ("Recruiting" kutusu — sadece `yeni_basvuru` sayısı, "Reklam Kaynakları" widget'ı — `evrak` durumu bazlı dönüşüm). `durum='evrak'` olunca Onboarding'e devir **kodda yok** ("sonraki fazda" notu).
**Silme/Düzenleme:** **Silme fonksiyonu hiç yok**.
**Rol Yetkisi:** broker/owner/ofis (`recruiting_manage`), danışman hiç erişemez.

### Planlama (Takvim + Görevler)
**Amaç:** Etkinlik/toplantı/eğitim takvimi ve görev atama, tek sayfada iki sekme.
**Veri Kaynağı:** `calendar_events`, `event_attendance` (Takvim); `tasks` (Görevler).
**Veri Girişi:** Etkinlik formu (tür, başlık, tarih, davetliler+katılım tipi, görünürlük); görev formu (başlık, atanan kişi, son tarih).
**İşlem Sonucu:** Etkinlik kaydet → `calendar_events` INSERT + `event_attendance` toplu INSERT (davetli sayısı kadar satır, `status='davetli'`). Katılım güncelle → `event_attendance` UPDATE (bkz. §4).
**Veri Nereye Yazılıyor:** `calendar_events.*`, `event_attendance.status/mazeret_*`, `tasks.assignee_id/status`.
**Bağlantılı Modüller:** Toplantı katılımı → `meetingAttendPercent()` → Danışman Sağlık Skoru (Panel/Takip); Görevler bağımsız, sadece Panel'de dolaylı olarak "Dikkat Gerekiyor" listesine girmez (görev gecikmesi Panel'de izlenmiyor — DOĞRULANMADI/ayrı incelenmedi).
**Silme/Düzenleme:** Etkinlik/görev yönetimi broker/owner/ofis; danışman kendi katılım durumunu sınırlı olarak günceller (`onayladi`/`mazeretli` bekliyor), görev durumunu (bekliyor/tamamlandı) günceller.
**Rol Yetkisi:** Görüntüleme ALL_ROLES (görünürlük kuralına tabi, §4), yönetim broker/owner/ofis.

### Takip (+ Eğitim sekmesi)
**Amaç:** Danışman 360° sağlık skoru + eğitim modülleri + onboarding checklist.
**Veri Kaynağı:** `lib/takip.js computeHealthScore()` girdileri (11 kaynak — bkz. §5) + `education_modules`, `education_progress`, `onboarding_checklist_items`, `onboarding_checklist_status`, `badges`, `user_badges`.
**Veri Girişi:** Eğitim modülü tamamlama (danışman kendi işaretler); checklist işaretleme (**sadece broker/owner**).
**İşlem Sonucu:** Modül tamamla → `education_progress` upsert/delete. Checklist işaretle → `onboarding_checklist_status` upsert/delete.
**Veri Nereye Yazılıyor:** `education_progress.done_at`, `onboarding_checklist_status.done_at/done_by`.
**Bağlantılı Modüller:** computeHealthScore() → Panel (ofis rolü kartı) + kendi tam liste tablosu; educationGaps → Panel "Dikkat Gerekiyor".
**Silme/Düzenleme:** Checklist "kaldır" = satırı **DELETE** eder (geçmiş tutulmaz).
**Rol Yetkisi:** Görüntüleme ALL_ROLES (danışman sadece kendisi, broker/owner/ofis takım — CAN_SEE_TEAM_ROLES), checklist yazma sadece broker/owner (`CAN_MANAGE_ROLES=['broker','owner']` — eğitim/checklist yönetiminde **ofis yok**, Takvim'den farklı olarak).

### Lig
**Amaç:** Dönemsel performans sıralaması (ciro, eğitim, sosyal medya, memnuniyet vb. kategoriler).
**Veri Kaynağı:** `periods`, `score_entries`, `review_credits`, `social_activity_types`, `social_activity_log`, `ciro_musterileri`, `ciro_girisleri`, RPC `list_musteri_review_counts()`.
**Veri Girişi:** Ciro girişi, müşteri isim listesi, sosyal medya aktivite sayısı — hepsi **sadece broker/owner/ofis** girer (danışman kendi rakamını giremez, RLS bilinçli engelliyor).
**İşlem Sonucu:** DOĞRULANMADI — Lig.jsx'in tam iç mantığı bu raporda satır satır incelenmedi, sadece RLS/route guard doğrulandı; kaydet fonksiyonlarının birebir isimleri teyit edilmedi.
**Veri Nereye Yazılıyor:** `score_entries`, `ciro_musterileri`, `ciro_girisleri`, `social_activity_log`.
**Bağlantılı Modüller:** `score_entries`/`ciro_musterileri` → `customerReviewPercent()`/`ciroHedefPercent()`/`socialUsagePercent()` (Danışman Sağlık Skoru) VE ayrıca → `list_musteri_review_counts()` (Wilson skoru, Panel "Dönem Liderleri") — **iki farklı hesaplama aynı temel veriden** (bkz. §13).
**Silme/Düzenleme:** DOĞRULANMADI (ayrıntılı incelenmedi).
**Rol Yetkisi:** Görüntüleme herkes (`score_entries_select`: `using(is_active())` — herkes herkesinkini görür), yazma broker/owner/ofis; `periods`/`social_activity_types` yönetimi **sadece broker**.

### Rehber
**Amaç:** Doküman/kılavuz kütüphanesi, kategori bazlı.
**Veri Kaynağı:** `docs`, `doc_versions`, `categories`.
**Veri Girişi:** Doküman başlığı, dosya, kategori.
**İşlem Sonucu:** DOĞRULANMADI (Rehber.jsx'in içeriği bu raporda satır satır okunmadı, sadece RLS doğrulandı).
**Veri Nereye Yazılıyor:** `docs`, `doc_versions` (versiyon geçmişi tutulur, `is_current` bayrağıyla).
**Bağlantılı Modüller:** Bağımsız bir modül, başka hiçbir yeri beslemiyor/beslenmiyor (DOĞRULANMADI/kanıt aranmadı ama diğer 4 araştırmada Rehber'e referans veren kod bulunmadı).
**Silme/Düzenleme:** DOĞRULANMADI.
**Rol Yetkisi:** Görüntüleme herkes; **yönetim (`docs_manage`) sadece broker+ofis** — dikkat: **owner Rehber'i yönetemez**, sadece görüntüler (kategoriler ise `is_manager()`=broker+owner ile farklı bir role seti).

### Kartvizitim
**Amaç:** Kişisel dijital kartvizit (public paylaşılabilir sayfa, `/k/:userId`).
**Veri Kaynağı:** `users` tablosu (telefon, sosyal medya, avatar alanları).
**Veri Girişi:** Telefon, sosyal medya linkleri, avatar.
**İşlem Sonucu:** `usersProvider.updateProfile()` → `users` UPDATE.
**Veri Nereye Yazılıyor:** `users` tablosu, kendi satırı.
**Bağlantılı Modüller:** `get_kartvizit()` RPC ile public sayfa (`/k/:userId`) besleniyor.
**Silme/Düzenleme:** Kendi profilini düzenler.
**Rol Yetkisi:** Menüde broker/owner/danışman'a görünür (**ofis'e görünmez**), ama route guard olmadığı için ofis de URL'den erişip düzenleyebilir (§1.1, güvenlik bulgusu).

### Ayarlar
**Amaç:** Kullanıcı yönetimi, webhook hata logları, işlem geçmişi (Log sekmesi).
**Veri Kaynağı:** `users`, `user_private_info`, `meta_webhook_errors`, `telsam_webhook_errors`, `audit_log`.
**Veri Girişi:** Yeni kullanıcı formu (ad/email/rol/şifre), TC no/doğum tarihi, kullanıcı aktif/pasif toggle.
**İşlem Sonucu:** Kullanıcı oluştur → `create-user` Edge Function (service-role, RLS bypass) → `auth.users`+`public.users` INSERT; kullanıcı sil → `delete-user` Edge Function → ilişkili tabloları NULL'lar, `auth.users` DELETE (§7'de detay); doğum tarihi kaydet/değişiklik → Takvim'de otomatik `🎂` etkinliği senkronu.
**Veri Nereye Yazılıyor:** `users`, `user_private_info`.
**Bağlantılı Modüller:** Kullanıcı silme → `opportunities`/`call_logs`/`tasks`/`leads`/`recruiting_candidates`/`docs`/`audit_log`/`score_entries` vb. referansları NULL'lanır (2026-08-15 kararı). Doğum tarihi → Takvim.
**Silme/Düzenleme:** Kullanıcı silme **gerçek DELETE** (auth.users üzerinden; public.users'ın buna cascade ile bağlı olduğu gözlemlenen davranışla tutarlı ama migration satırında doğrudan görülmedi — kişisel veriler kalıcı kaybolur, iş kayıtları korunur).
**Rol Yetkisi:** **Sadece broker/owner** (`canManageUsers`).

---

## 3. PANEL / BROKER KOKPİTİ

*(Bu bölüm doğrudan Panel.jsx'in satır satır okunmasına dayanır — en detaylı araştırılan alanlardan biri.)*

Panel `filters.dateRange` (varsayılan `7g`) ile bazı kartları filtreler; bazı kartlar **bilinçli olarak bağımsız** (kod içinde birden fazla yerde açıkça yorumlanmış bir tasarım kararı).

### 3.1 "Ofisin Nabzı" — 6 KPI kutusu

| Kutu | Değer | Kaynak | Tarih filtresi | Link |
|---|---|---|---|---|
| Operasyon | `callStats.total` | `call_logs`, `isWithinRange` | Evet | `/operasyon` |
| Portföy | `opportunityStats.acik` | `opportunities.status==='acik'` | Evet | `/firsatlar` |
| Recruiting | `recruitingStats.yeniBasvuru` | `recruiting_candidates.durum==='yeni_basvuru'` | Evet | `/recruiting` |
| Etkinlik | `nextEventsAlways.length` | `calendar_events`, `startAt&gt;=şimdi` | **Hayır (bağımsız)** | `/takvim` |
| Eğitim | `educationGaps.length` | modül+checklist &lt;100% | — | `/egitim` |
| Kritik Uyarılar | `attentionItems.length` | `lib/attention.js` | **Hayır (bağımsız)** | sayfa içi scroll |

### 3.2 "Dikkat Gerekiyor" (= Kritik Uyarılar'ın içeriği)

Dört olası satır, hepsi **tarih filtresinden bağımsız**, `lib/attention.js`'te tek yerden tanımlı:

1. **Gecikmiş çağrı dönüşleri** — `isStaleReturn`: atanmış + `donus_yapildi_mi=false` + `callNeedsTracking` + eski kayıt değil + 2 günden fazla geçmiş → `kritik`, `/operasyon?odak=cagri`.
2. **Bekleyen açık fırsatlar** — `isStaleOpp`: `status='acik'` + eski değil + 3 günden fazla → `kritik`, `/firsatlar?odak=firsat`.
3. **İnaktif danışmanlar** — `isInactiveAgent`: `lastSignInAt` yok VEYA 7 günden fazla → `uyari`, `/takip?odak=danisman`.
4. **Eğitim/checklist geride kalanlar** — `isBehindEducation`: modül%&lt;50 VEYA checklist%&lt;50 → `uyari`, `/egitim?odak=egitim`.

Boş liste gizlenmez, yeşil "şu an müdahale gerektiren konu yok" satırı gösterilir. **"Müdahale Gerektiren Danışmanlar" adında ayrı bir kart YOK** — en yakın karşılığı bu listedeki tek satırlık "inaktif danışman" uyarısı.

### 3.3 "Portal Kullanımı"

`activityRanking` (gerçek `auth.users.last_sign_in_at`, RPC `list_user_activity()`) → 3 kova: `bugun` / `son7gun` (≤7 gün) / `uzunSuredir` (yok veya &gt;7 gün). Her kova `ProgressRing` ile `kova sayısı/toplam*100` gösterir. **Not:** bu 7 günlük eşik `usageBuckets` içinde elle (`diffDays &lt;= 7`) yazılmış, `attention.js isInactiveAgent()`'taki AYNI eşikle **ayrı kod konumunda tekrarlanmış** (bkz. §13).

### 3.4 "Dönem Liderleri" (WeeklyLeadersCard)

`rankingsByCategory` — Lig kategorileri (`score_entries`) + **memnuniyet kategorisi özel**: `list_musteri_review_counts()` RPC → `wilsonScoreLowerBound()` (Wilson skoru alt sınırı, z=1.96) ile canlı hesaplanır — RLS nedeniyle ham `ciro_musterileri`den hesaplarsa danışmana yanlış sıra çıktığı için bilinçli olarak ayrı yol (Panel.jsx:666-669 yorum). İlk 3 gösterilir, sayısal fark bilerek gizli.

### 3.5 "Eğitim — Geride Kalanlar"

`educationGaps`: `moduleProgressFor()` (education_modules/education_progress) + `checklistProgress()` (onboarding_checklist_items/status, tip='baslangic') **birlikte** ağırlıklı toplam yüzde (`overallPercent`) üretir — bu, `computeHealthScore`'un `education` bileşeninden (SADECE modül, checklist hariç) **farklı bir formül** (bkz. §13).

### 3.6 "Reklam Kaynakları"

`computeReklamKoduConversion(calls)` (Portföy) + `computeRecruitingReklamConversion(candidates)` (Recruiting) — ikisi de reklam adı/kod stringine göre gruplar, **tarih filtresinden bağımsız** ("tüm zamanların en iyi reklamları"), ilk 3'ü gösterir.

### 3.7 "Yaklaşan Etkinlik"

En yakın etkinlik, Ofisin Nabzı'ndaki "Etkinlik" kutusuyla aynı listeyi paylaşır.

### 3.8 Danışman ve Ofis ekranları

- **Danışman:** Lig Durumu → Açık Fırsatlar → Sana Atanan Çağrılar → Yaklaşan Etkinlikler → Eğitim/Checklist Durumun (sabit tek sütun).
- **Ofis:** 2 sütunlu klasik düzen + **SADECE ofis rolüne özel** "Danışman Sağlık Skoru" kartı (en iyi/en kötü 2 satır, `/takip`'e link). **Broker/owner bu kartı Panel'de GÖRMEZ** (yorum: "broker/owner'ın yeni akışında yok, artık sadece ofis görüyor").

### 3.9 Görevde sorulan ama Panel'de bulunmayan kartlar

- **"Bugünün Özeti"** — yok, DOĞRULANMADI.
- **"Müdahale Gerektiren Danışmanlar"** (ayrı kart) — yok, "Dikkat Gerekiyor" içindeki tek satır bunun en yakın karşılığı.
- **"Danışman Performansı"** (genel kart) — yok, en yakın karşılığı "Danışman Sağlık Skoru" kartı (sadece ofis) + Takip sayfasının tam listesi.
- **"Toplantı Katılımı" / "Eğitim Katılımı" / "Müşteri Memnuniyeti"** (ayrı kartlar) — bunlar Panel'de kendi başlarına kart değil, sadece sağlık skorunun alt bileşenleri (ağırlıklı) veya Dönem Liderleri'nin bir kategorisi olarak görünür.
- **"Son İşlemler"** — yok, DOĞRULANMADI.

---

## 4. TAKVİM ÇALIŞMA PRENSİBİ

### 4.1 Şema

`calendar_events` (`id, type, title, description, location, start_at, end_at, creator_id, gorunurluk`). **"hedef" adında bir kolon YOK — DOĞRULANMADI/mevcut değil.** "Durum" kavramının karşılığı bu tabloda yok; katılım durumu ayrı tabloda (`event_attendance.status`).

`event_attendance` — **junction tablo** (`event_id, user_id` composite PK), array kolon DEĞİL: `status, responded_at, mazeret_text, mazeret_status, mazeret_reviewed_by, mazeret_reviewed_at, katilim_tipi`.

**"atanan_danismanlar" gerçek karşılığı: ayrı tablo (`event_attendance`), array kolon değil.** Kod yorumu açıkça reddediyor: *"calendar_events üzerinde ayrı bir invited_ids kolonu YOK (eski taslakta çelişkiliydi)"*.

**Enum değerleri (birebir):**
- `calendar_event_type`: `toplanti, egitim, etkinlik, broker_gorusmesi, kocluk_gorusmesi, remax_turkiye, recruiting_gorusmesi` (7 tür).
- `attendance_status`: `davetli, onayladi, katildi, katilmadi, gec, mazeretli` (6 durum).
- `katilim_tipi`: `zorunlu, onerilen, istege_bagli`.
- `mazeret_status`: `bekliyor, onaylandi, reddedildi`.
- `gorunurluk`: `davetliler, herkese_acik`.

### 4.2 Etkinlik oluşturma

"Tüm Ofis" butonu **davet listesini otomatik doldurmaz** — sadece checkbox'ları toplu işaretler; katılım tipi ayrıca toplu-aksiyon butonlarıyla ("Zorunlu Yap" vb.) atanmalıdır. DB yazımı iki ayrı adım: (1) `calendar_events` INSERT, (2) dönen id ile `event_attendance`'a davetli sayısı kadar satır toplu INSERT (`status='davetli'` sabit başlangıç). **Bu iki adım arasında trigger/otomasyon yok — sadece uygulama kodu, transaction da değil.**

### 4.3 Toplantı akışı — adım adım

1. `calendar_events`'e `type='toplanti'` ile kayıt açılır.
2. Katılım kaydı, uygulama kodu tarafından (**DB trigger yok**) `event_attendance`'a toplu INSERT ile oluşur.
3. **Katıldı** → `event_attendance.status='katildi'`, `responded_at=now()` (yönetim işaretler).
4. **Katılmadı** → `status='katilmadi'` (yönetim işaretler).
5. **Geç Geldi** → `status='gec'` (yönetim işaretler) — **skora hiç girmez, tamamen hesap dışı.**
6. **Mazeretli** → danışmanın kendisi başlatır, `status='mazeretli'` + `mazeret_status` **otomatik olarak `'bekliyor'`** set edilir (danışman kendi kendine onaylayamaz).
7. **Mazeret onaylanırsa** (`mazeret_status='onaylandi'`) — sadece broker/owner/ofis (`resolveMazeret()` RPC benzeri fonksiyon, RLS `event_attendance_update_manager`) → skora **nötr** etki.
8. **Mazeret reddedilirse** (`mazeret_status='reddedildi'`) — aynı yetki → **"katılmadı" ile aynı muamele**, skoru düşürür.
9. **Danışman performansına yansıma** — `meetingAttendPercent()`: sadece `katildi`/`katilmadi`/`mazeretli+reddedildi` olan VE geçmişte kalmış etkinlikler "resolved" sayılır; `bekliyor`/`onaylandi` mazeretler ve `gec` durumu hesaba hiç girmez (nötr).

Danışmanın kendi satırı üzerindeki yetkisi RLS ile kısıtlı: sadece `onayladi` veya `mazeretli(bekliyor)` yazabilir, gerçek karar (katıldı/katılmadı, mazeret onay/red) alanlarına hiç dokunamaz.

### 4.4 Görünürlük kuralı

`ALWAYS_VISIBLE_EVENT_TYPES = ['toplanti', 'egitim', 'etkinlik', 'remax_turkiye']` — bu 4 tür danışmana davetsiz de otomatik görünür; `broker_gorusmesi`/`kocluk_gorusmesi`/`recruiting_gorusmesi` bilerek dışarıda (bire bir görüşmeler). Aynı mantık hem `lib/calendar.js canViewEvent()` (uygulama) hem RLS'te (`calendar_events_select`, en güncel migration `20260804150000`) uygulanıyor — bir ara migration'da (`20260802140000`) sadece JS güncellenip RLS eski kalmış, broker "hâlâ görünmüyor" şikayeti sonrası düzeltilmiş (kod yorumu bunu doğruluyor).

### 4.5 Eğitim modülü — Toplantı ile veri modeli farkı

`education_modules` + `education_progress` (composite PK: `module_id, user_id`, sadece `done_at` dolu/boş — **ara durum yok**, 6 değerli attendance enum'un aksine). `toggleModuleProgress()`: `done=true` → upsert, `done=false` → delete.

| | Toplantı (Takvim) | Eğitim (modüller) |
|---|---|---|
| Durum modeli | 6 değerli enum + mazeret alt-durumu | İkili (satır var/yok) |
| Kim işaretler | Katıldı/Katılmadı: yönetim. Mazeret: danışman (onay yönetimde) | Danışmanın kendisi |
| Davet/görünürlük | Var, RLS kontrollü | Yok — `education_modules_select` herkese açık (`using(true)`) |
| Skor ağırlığı | %15 (`meetingAttend`) | %20 (`education`) |

**Önemli nüans:** `calendar_events.type='egitim'` (bir eğitim *etkinliği/semineri*) ile `education_modules` (Power Camp video/içerik modülleri) **tamamen ayrı, birbirine FK ile bağlı olmayan iki sistemdir** — sadece isim benzerliği var.

---

## 5. DANIŞMAN PERFORMANSI (`lib/takip.js`)

### 5.1 Ağırlıklar (birebir)

```
ciro: 0.25, education: 0.20, meetingAttend: 0.15, leadResponse: 0.15,
portalUsage: 0.10, customerReview: 0.10, socialUsage: 0.05
```
`YILLIK_CIRO_HEDEFI = 2304000` (sabit).

### 5.2 Metrik metrik kaynak/hesap/tarih aralığı/mazeret etkisi/veri-yok davranışı

| Metrik | Kaynak tablo | Tarih aralığı | Mazeret etkisi | Veri yoksa |
|---|---|---|---|---|
| `meetingAttendPercent` | `calendar_events`+`event_attendance` | Sadece geçmiş etkinlikler | bekliyor/onaylandi=nötr, reddedildi=katılmadı gibi, gec=nötr | 0 |
| `leadResponsePercent` | `call_logs` (`assigned_to`) | **Tüm zamanlar** (aralık yok) | — | 0 |
| `portalUsagePercent` | `auth.users.last_sign_in_at` (RPC `list_user_activity`) | Bugün=100, -10/gün | — | 0 |
| `customerReviewPercent` | `ciro_musterileri` | **Tüm geçmiş** (döneme bağlı değil) | — | 0 |
| `ciroHedefPercent` | `users.created_at` + `ciro_girisleri` | İşe giriş tarihinden bugüne, o yıl içinde orantılı | — | 0 |
| `socialUsagePercent` | `score_entries`(sosyal_medya) + `periods[0]` | Sadece **aktif (en yeni) dönem** | — | 0 |

**Ofis/broker dahil mi?** `socialUsagePercent`'te HAYIR — ortalama sadece `!role || role==='danisman'` filtresiyle hesaplanır. Diğer metrikler kullanıcı bazlı çalışır, rol filtresi yok (ama `Panel.jsx`/`TakipTab.jsx` çağıran taraf zaten `teamMembers` = sadece danışman rolü ile sınırlıyor).

**Veri yoksa ne olur:** Her bileşen gerçek **%0** döner — "veri yok" diye gizlenmez; dosya başı yorumu bunu bilinçli tasarım olarak açıklıyor: "broker skorun neyi yansıttığını görsün diye hiçbir bileşen gizlenmiyor/nötrlenmiyor".

### 5.3 `computeHealthScore()` ve eşikler

```
score = round(Σ metrik * ağırlık)
status: score≥80 → 'good' (İyi), 60≤score&lt;80 → 'warn' (Dikkat), score&lt;60 → 'critical' (Kritik)
```
Aynı 80/60 eşiği metrik hücre renklerinde de (`metricValueStyle`) tekrarlanıyor.

**Not:** `computeHealthScore`'un `education` bileşeni **SADECE modül** (`moduleProgressFor`) kullanır, checklist'i dahil etmez — Panel'in "Eğitim — Geride Kalanlar" kartındaki `overallPercent` (modül+checklist toplamı) ile **farklı bir sayı** üretir (bkz. §13).

### 5.4 Panel vs Takip sayfası karşılaştırması

İkisi de **aynı `computeHealthScore()` fonksiyonunu, aynı `teamMembers` filtresini (`!role||role==='danisman' && !testHesabi`), aynı veri kaynaklarını** kullanır. Fark sadece görünüm: Panel sadece en iyi/en kötü 2 satırı (ve sadece ofis rolüne), Takip tam listeyi (broker/owner/ofis için tüm takım, danışman için sadece kendisi) + broker notu detayını gösterir.

---

## 6. BAŞLANGIÇ SÜRECİ / ONBOARDING

1. **Danışman kaydı** — `create-user` Edge Function: token doğrula → çağıranın broker/owner olduğunu kontrol et → `auth.users` oluştur → `public.users` profili oluştur (`must_change_password:true`). **Checklist satırı burada hiç açılmıyor** — otomatik değil.
2. **Başlangıç görevlerinin kaynağı** — `onboarding_checklist_items` (`tip='baslangic'`). Kod tabanında birebir görülebilen sabit liste sadece `seed.sql`'deki 5 madde (3 baslangic: "Sözleşme imzalandı", "IBAN bilgisi alındı", "Portal hesabı oluşturuldu" + 2 ayrılis). **Production'da "21 madde" olduğuna dair bir migration yorumu var ama içerikleri hiçbir migration/seed dosyasında yok** (muhtemelen UI'dan elle eklenmiş, migration'a yansımaz) — DOĞRULANMADI.
3. **GD nasıl tamamlıyor** — **Tamamlamıyor.** `ChecklistPanel` checkbox'ı `disabled={!isManager}` — sadece broker/owner işaretleyebilir. Danışman ekranında "Bu liste yönetim tarafından işaretlenir, kendin değiştiremezsin" mesajı var.
4. **Yönetim nasıl onaylıyor** — `toggleChecklistItem(itemId, userId, done, doneBy)`: `done=true` → `onboarding_checklist_status` upsert (`done_at=now(), done_by=işaretleyen yöneticinin id'si`); RLS de aynı şekilde sadece `is_manager()`'a (broker/owner — **ofis dahil değil**) izin veriyor.
5. **Reddedilirse ne olur** — **Mekanizma yok.** Sadece iki durum var: satır var (tamamlandı) / satır yok (tamamlanmadı). "Reddet" kavramı, kolon, buton bulunamadı.
6. **Not alanı** — **Yok.** `onboarding_checklist_status` kolonları: `item_id, user_id, done_at, done_by` — açıklama/not sütunu yok.
7. **Tamamlanma oranı** — `checklistProgress()`: `(tamamlanan/toplam)*100`, yuvarlanmış.
8. **Süreç bitince** — Danışman ekranında checklist %100 olunca **bölüm tamamen kayboluyor** (`showChecklistSection = isManager || completed&lt;total`) — yönetim her zaman görür, danışman sadece eksiği varsa.

---

## 7. PORTFÖY / LEAD AKIŞI

- **Portföy kodu** — `opportunities` tablosunda **hiçbir kod/numara kolonu yok**. Bulunan `generateTalepKodu()` fonksiyonu aslında **`call_logs.portfoy_no`** için (`&lt;KAYNAK-ÖNEKİ&gt;-&lt;5 haneli rastgele&gt;`, örn. `S-A1B2C`).
- **Danışmana atama** — `owner_id` (giren kişi) / `claimer_id` (fiilen üstlenen). `claim_opportunity()` fonksiyonu **tamamen kaldırılmış** (dropped); yerine (a) `assign_opportunity_to()` RPC — **sadece yönetim** doğrudan atar, (b) `opportunity_interest` tablosu — **exclusive olmayan** "İlgileniyorum" (birden fazla danışman ilgi gösterebilir, müşteri bilgisi asla açılmaz).
- **Durum değişince** — `close_opportunity(id, status)` RPC: sadece `'kapandi'`/`'iptal'`, zaten kapalıyı tekrar kapatamaz, yetki `is_manager() or claimer_id=kendisi`. Migration'ın kendi itirafı: bu özellik eklenene kadar (19 Temmuz) status hiç `kapandi`/`iptal` olmuyordu, Panel'deki ilgili yüzde hep %0'dı.
- **Sonraki takip tarihi** — **Yok.** Böyle bir kolon bulunamadı.
- **Geciken takip** — `isStaleOpp()`: `status='acik'` + `created_at`'tan 3 günden fazla geçmiş (eski/migrasyon kayıtları hariç) — **manuel bir takip tarihine değil, sadece oluşturma tarihine dayanıyor.**
- **Timeline/not** — **Yok.** Sadece tek bir serbest metin alanı (`opportunities.ozet`), versiyon/geçmiş tutulmuyor. Eski prototipteki `timeline` tablosu `archive` şemasına taşınmış, kullanılmıyor.
- **Kazanıldı/Kaybedildi hangi raporları etkiliyor** — `Panel.jsx opportunityStats` bu sayıları (`acik/claimed/kapandi/iptal`) hesaplıyor ama **sadece `acik` sayısı ekrana basılıyor** — kapandı/iptal/claimed hiçbir yerde gösterilmiyor (hesaplanıp kullanılmayan "yarım" veri). Lig/ciro sistemiyle `opportunities` arasında **hiçbir bağlantı yok** — ciro tamamen ayrı, elle girilen bir rakam.
- **Silme** — **Gerçek (hard) DELETE**, sadece **broker**. Soft-delete kolonu yok.
- **Archive** — Sadece 2026-07-22'de yapılmış tek seferlik eski-prototip temizliği; bugünkü uygulamada aktif bir "arşivle" akışı yok.
- **Lead Havuzu evrimi** — Başlangıçta 4 tip/8 durumluydu, sonradan 2 tip (`recruiting, portfoy`) / 3 duruma (`yeni, atandi, elendi`) sadeleştirildi; erişim ofis'ten alınıp sadece broker/owner'a daraltıldı; elle kayıt eklenmiyor, sadece Meta webhook.

---

## 8. RECRUITING AKIŞI

- **Tablo** — `recruiting_candidates` (bigserial id).
- **Kaynak** — 13 değerlik sabit liste: `meta_recruiting, kariyer_net, isinolsun, linkedin, secretcv, indeed, instagram, referans, remax_agi, seminer, santral, ofis, diger`.
- **Durum akışı (birebir sıra)** — `yeni_basvuru → ilk_arama → on_gorusme → ofis_tanitimi → karar_bekliyor → evrak` + ayrı dal `olumsuz`. Eski 8 aşamalı huninin "Başladı"/"İlk 30 Gün" adımları bilinçli olarak çıkarılmış, o süreç artık Onboarding checklist'inde.
- **Randevu/görüşme tarihi** — Ayrı kolon değil, **Takvim entegrasyonu**: doldurulunca `calendar_events`(`type='recruiting_gorusmesi'`) otomatik açılır/güncellenir, id `recruiting_candidates.gorusme_event_id`'ye yazılır.
- **Kanban** — **Yok.** Durum değişikliği bir `&lt;select&gt;` dropdown ile yapılıyor, drag-drop kodu bulunamadı.
- **Kazanıldı/Olumsuz raporları** — Panel'in "Recruiting" kutusu **sadece `yeni_basvuru` sayısını** gösteriyor. `computeRecruitingReklamConversion()` reklam bazlı dönüşüm (`evrak` durumu = "alındı") hesaplıyor, Panel "Reklam Kaynakları" + Leads.jsx reklam tablosunda kullanılıyor.
- **Lead Havuzu → Recruiting dönüşümü** — `LEAD_TO_RECRUITING_KAYNAK` sabiti gerçekten var ve deterministik eşliyor (`meta_recruiting→meta_recruiting, telefon→santral, referans→referans, web/tabela/meta_portfoy/diger→diger`). Dönüşürken `leads.durum='atandi'` olur.
- **Silme** — **Hiç yok** (fonksiyon tanımlı değil).

---

## 9. SANTRAL

- **Veri konumu** — %100 Supabase (`call_logs`). Repo genelinde `localStorage` sadece bildirim-izni bayrakları için kullanılıyor, çağrı verisiyle hiçbir ilgisi yok.
- **Çağrı oluşturma — 3 yol:**
  1. **Manuel** — broker/owner/ofis formdan girer.
  2. **Telsam webhook (push)** — `telsam-webhook` Edge Function, `event=start`/`event=end` — sadece dahili numaralara gelen çağrılar (`isExtension()` mantığı) loglanır, giden çağrılar hiç loglanmaz.
  3. **Telsam CDR pull-sync (cron, asıl kullanılan yöntem)** — `telsam-cdr-sync`, `pg_cron` her dakika tetikler, Telsam CDR API'sinden `calltype='incoming'` olanları çeker, `telsam_chanid` üzerinden idempotent upsert.
- **Fırsata dönüştürme** — Tamamen **manuel** (`handleConvertToOpportunity`): yeni `opportunities` satırı + `call_logs.opportunity_id` set edilir. **Otomatik hiçbir trigger/RPC bu kolonu doldurmuyor.**
- **Danışmana atama** — Tamamen **manuel**, dropdown ile broker/owner/ofis yapıyor; Telsam webhook/cron `assigned_to`'yu hiç set etmiyor (atamasız gelir).
- **Silme** — **Sert (hard) DELETE**, onay diyaloğuyla ("kalıcı olarak silinsin mi? geri alınamaz"), broker/owner/ofis yetkili. **Audit_log'a hiç düşmüyor** (bkz. §16, kritik risk).
- **Farklı cihazdan görünürlük** — Evet, Supabase tablosu + RLS (danışman sadece kendine atananı, yönetim tümünü) — cihaza değil kullanıcı kimliğine bağlı.

---

## 10. OFİS HAVUZU / ALICI TALEBİ

- **Alıcı talebi nerede tutuluyor** — **Ayrı tablo yok**, `opportunities.type='alici'` olan satırlar. "Ofis Havuzu" da ayrı tablo değil, `status='acik' AND claimer_id IS NULL` olan satırlar.
- **"Havuza at" seçeneği** — `selfClaim = !form.havuzaAt`; işaretlenince `claimer_id` set edilmez (NULL kalır), `status` default `'acik'`de kalır → satır havuza düşer. Bunun düzgün çalışması için ayrı bir RLS bug-fix migration'ı bile gerekmiş (danışman için `claimer_id = auth.uid() OR claimer_id IS NULL` şartı).
- **Müşteri telefonu kimlere gösteriliyor** — `get_opportunity_contact()` RPC (security definer, RLS bypass eder): SADECE (a) fırsatı giren kişi (`owner_id=kendisi`), (b) broker, (c) owner — **ama sadece fiilen üstlenen kişi broker DEĞİLSE** (broker'ın kendi müşterilerini owner'dan gizleme kuralı). **"İlgileniyorum" diyen kişiye telefon ASLA açılmıyor** — sadece fırsatı giren + yönetim kimlerin ilgilendiğini görüp kendisi arar.
- **Eşleştirme mantığı / Match Score** — **DOĞRULANMADI değil, kesin: bulunamadı.** Repo genelinde konum/bütçe/m² bazlı otomatik alıcı-satıcı eşleştirmesi yapan hiçbir kod, fonksiyon, view veya trigger yok. "Match Score" adında bir kavram, kolon veya hesaplama mantığı kodda mevcut değil.
- **Bağlı tablolar** — `opportunities.category_id→categories`, `.owner_id/.claimer_id→users`, `opportunity_interest.opportunity_id→opportunities (cascade)`, `.user_id→users (cascade, unique çift)`, `opportunities.kaynak_lead_id→leads`, `call_logs.opportunity_id→opportunities (NO ACTION)`.

---

## 11. LOG / İŞLEM GEÇMİŞİ

### 11.1 `audit_log` — hangi tablolara bağlı

Tablo başta (init_schema) tanımlıydı ama **hiç dolmuyordu** (kod yorumu: "hiçbir yerden hiç INSERT edilmiyordu... Log sekmesi hiçbir zaman gerçek bir şey gösteremezdi"). `log_audit_event()` trigger fonksiyonu sonradan eklendi, `detay=to_jsonb(satırın tamamı)` ile.

**Sadece 4 tabloya trigger bağlı:** `trg_audit_users` (`public.users`), `trg_audit_opportunities` (`public.opportunities`), `trg_audit_score_entries` (`public.score_entries`), `trg_audit_tasks` (`public.tasks`).

### 11.2 Loglanmayan önemli işlemler

`call_logs` (**bir çağrının silinmesi hiç loglanmıyor**), `opportunity_interest`, `leads`, `recruiting_candidates`, `docs`/`doc_versions`, `calendar_events`/`event_attendance`, `categories`, `onboarding_checklist_*`. `meta_webhook_errors`/`telsam_webhook_errors`/`telsam_sync_state` bilerek dışarıda (ayrı amaçlı sistem tabloları).

**En kritik bulgu:** `delete-user` fonksiyonunun kullanıcı silmeden önce yaptığı toplu NULL'lama işlemleri (`call_logs.assigned_to`, `leads.atanan_danisman_id`, `recruiting_candidates.atanan_danisman_id`, `docs.created_by` vb.) sadece `opportunities` ve `score_entries` üzerindekiler audit_log'a düşer (bu iki tabloda trigger var) — **`call_logs`, `leads`, `recruiting_candidates`, `docs` üzerindeki aynı boşaltma işlemleri hiç loglanmaz.**

### 11.3 "Yapan" nasıl tutuluyor

`auth.uid()` ile, `actor_id` kolonu. Kullanıcı silinirken `audit_log.actor_id` elle `null`lanıyor (FK ihlalini önlemek için) — geçmiş kayıtlar "kim yaptı" bilgisini kaybederek de olsa korunuyor.

### 11.4 IP/User agent

**Kesinlikle tutulmuyor.** `audit_log` kolonları: `id, actor_id, action, table_name, record_id, detay, created_at` — bunun dışında hiçbir alan yok, repo genelinde `ip_address`/`user_agent`/`inet` için hiçbir eşleşme bulunamadı.

### 11.5 Ayarlar &gt; Log sekmesi

Sadece **broker/owner** görebiliyor (`canManageUsers` + RLS `audit_log_select: using(is_manager())` tutarlı). `auditLog.list()`: son **200 kayıt**, en yeni üstte, **pagination yok, filtre kontrolü hiç yok** (tarih/aksiyon/tablo/kullanıcı filtresi kodda bulunmuyor). UI metni "kullanıcı, fırsat ve skor değişiklikleri" diyor ama `tasks`'tan bahsetmiyor — ve `AuditLogTable.jsx`'in `TABLE_LABELS` sözlüğünde `tasks` için etiket **yok**, bu yüzden bir görev değişikliği log listesinde ham `"tasks"` string'i olarak görünüyor (muhtemelen görevler eklenirken UI güncellenmemiş).

---

## 12. VERİ BAĞLANTI HARİTASI

```text
TAKVİM (calendar_events)
│
├── event_attendance (junction — davetli/durum/mazeret)
│     status: davetli → onayladi/mazeretli(danışman) → katildi/katilmadi/gec(yönetim)
│     mazeret_status: bekliyor → onaylandi/reddedildi (yönetim)
│           │
│           └── meetingAttendPercent() [lib/takip.js]
│                 └── computeHealthScore() (ağırlık %15)
│                       └── Panel.jsx (sadece ofis rolü kartı) + TakipTab.jsx (tam liste)
│
├── recruiting_candidates.gorusme_event_id → type='recruiting_gorusmesi' (Recruiting → Takvim, tek yönlü)
│
└── Ayarlar (doğum tarihi) → type='etkinlik', "🎂 ... — Doğum Günü" (otomatik senkron)

EĞİTİM (education_modules + education_progress) — TAKVİM'DEN TAMAMEN AYRI, FK YOK
│
└── moduleProgressFor() → computeHealthScore() (ağırlık %20, SADECE modül)
      └── Panel.jsx "Eğitim — Geride Kalanlar" / EgitimTab.jsx

ONBOARDING (onboarding_checklist_items + onboarding_checklist_status) — Eğitim sayfasında gösterilir, ayrı tablo
│
└── checklistProgress() → Panel.jsx educationGaps (modül+checklist TOPLAMI — computeHealthScore'dan FARKLI formül)
      └── attention.js isBehindEducation() → "Dikkat Gerekiyor"

SANTRAL (call_logs)
│
├── (manuel) "Fırsata Dönüştür" → opportunities (yeni satır) + call_logs.opportunity_id set edilir
│
└── leadResponsePercent() [donus_yapildi_mi oranı] → computeHealthScore() (ağırlık %15)

PORTFÖY (opportunities)
│
├── owner_id / claimer_id
│     ├── opportunity_interest ("İlgileniyorum", exclusive değil)
│     ├── assign_opportunity_to() RPC (sadece yönetim)
│     └── close_opportunity() RPC → status: kapandi/iptal
│           └── Panel.jsx opportunityStats (HESAPLANIYOR ama sadece 'acik' gösteriliyor)
│
└── isStaleOpp() (created_at&gt;3gün, status='acik') → Panel.jsx "Dikkat Gerekiyor"

LEAD HAVUZU (leads) — sadece Meta webhook'tan gelir
│
├── → Fırsatlar (portfoyNo: generateTalepKodu('Reklam'), leads.durum→'atandi')
└── → Recruiting (LEAD_TO_RECRUITING_KAYNAK ile kaynak eşleme, leads.durum→'atandi')

RECRUITING (recruiting_candidates)
│
├── gorusme_event_id → calendar_events (yukarıda)
├── computeRecruitingReklamConversion() → Panel "Reklam Kaynakları" + Leads.jsx
└── durum='evrak' → Onboarding'e devir: KODDA BAĞLANTI YOK ("sonraki fazda" notu)

MÜŞTERİ MEMNUNİYETİ (ciro_musterileri.alindi_mi)
│
├── customerReviewPercent() [ham oran, tüm geçmiş] → computeHealthScore() (ağırlık %10)
└── list_musteri_review_counts() RPC → wilsonScoreLowerBound() [Wilson skoru, dönem bazlı]
      └── Panel.jsx WeeklyLeadersCard "Dönem Liderleri"
      (İKİ FARKLI HESAPLAMA, AYNI TEMEL VERİ — bkz. §13)

PORTAL KULLANIMI (auth.users.last_sign_in_at)
│
└── list_user_activity() RPC (rol bazlı görünürlük)
      ├── portalUsagePercent() → computeHealthScore() (ağırlık %10)
      ├── Panel.jsx activityRanking/usageBuckets (elle yazılmış 7 gün eşiği)
      └── attention.js isInactiveAgent() (AYNI 7 gün eşiği, AYRI kod konumu)

OFİS HAVUZU (opportunities: type='alici', status='acik', claimer_id=null)
│
└── get_opportunity_contact() RPC (owner/broker/owner-değilse-broker-tutuyor → telefon açılır)
      (Otomatik eşleştirme / Match Score: BULUNAMADI)
```

---

## 13. AYNI VERİNİN BİRDEN FAZLA YERDE TUTULDUĞU / TEKRAR EDEN MANTIK ALANLARI

1. **Müşteri memnuniyeti iki farklı formülle hesaplanıyor.** `customerReviewPercent()` (`lib/takip.js`, ham `ciro_musterileri` oranı, RLS'e tabi, tüm geçmiş) vs `list_musteri_review_counts()` RPC + `wilsonScoreLowerBound()` (`lib/league.js`, Wilson skoru, sadece aktif dönem, Panel'in Dönem Liderleri kartında). Panel.jsx'teki kod yorumu bu ayrımı bilinçli olarak açıklıyor (RLS nedeniyle ham veriden hesaplarsa danışmana yanlış sıra çıkıyor) — ama pratik sonuç: **aynı kavram için portalda iki farklı sayı üretiliyor**, biri Danışman Sağlık Skoru'nda, biri Lig'de.

2. **"İnaktif danışman / 7 gün" eşiği iki ayrı kod konumunda elle tekrarlanmış.** `attention.js isInactiveAgent()` ve `Panel.jsx usageBuckets` (satırda elle `diffDays &lt;= 7` yazılmış) — ortak bir sabite/fonksiyona çıkarılmamış. Biri değişip diğeri unutulursa Panel ile Takip/Dikkat Gerekiyor arasında tutarsız sayı doğar.

3. **Eğitim/checklist toplam yüzdesi iki farklı yerde farklı birleştiriliyor.** `computeHealthScore()` sadece `moduleProgressFor()` (modül) kullanır, checklist'i **hiç dahil etmez**; Panel.jsx'teki `educationGaps`/`overallPercent` ise modül+checklist toplamını **birlikte** hesaplar. Aynı "eğitim tamamlama" kavramı, sağlık skorunda ve "Eğitim — Geride Kalanlar" kartında **farklı formüllerle** ölçülüyor.

4. **`archive` şemasında isim çakışan eski tablolar.** `archive.leads`, `archive.recruiting_candidates`, `archive.dan_toplanti`, `archive.dan_egitim` — bugünkü `public.leads`/`public.recruiting_candidates` ile **birebir aynı isimde ama tamamen ilgisiz şemalar.** Bu raporun başlangıç talimatında da tam bu isim çakışmasından kaynaklı bir karışıklık örneği yaşandı (§0).

5. **`takip.listBrokerNotes()` hâlâ mock veriden okunuyor** — `supabaseProvider.js:855`: `export { takip } from './mockProvider'`. Production modunda bile broker notları gerçek bir Supabase tablosuna bağlı değil; yarım kalmış bir entegrasyon.

6. **`AuditLogTable.jsx`'in `TABLE_LABELS` sözlüğü `tasks`'ı içermiyor** — `trg_audit_tasks` eklenirken (Görevler modülü, sonradan gelen özellik) UI etiket sözlüğü güncellenmemiş.

7. **`generateTalepKodu()` fonksiyonu iki farklı akıştan (Santral manuel giriş + Lead Havuzu→Portföy dönüşümü) çağrılıyor** — duplikasyon değil ama aynı fonksiyonun iki call-site'ı olması, birinde davranış değiştirilirse diğerinin gözden kaçma riski taşır.

8. **Recruiting'in eski/yeni süreç modeli ayrışması** (olumlu bulgu, çakışma değil): eski 8 aşamalı huninin "Başladı"/"İlk 30 Gün" adımları bilinçli çıkarılıp Onboarding checklist'ine taşınmış — iki modül arasında süreç netleştirilmiş.

---

## 14. ÖLÜ / KULLANILMAYAN KOD

- **`archive` şemasındaki 31 tablo** (`dan_toplanti, dan_egitim, skor_events, skor_event_attendance, etkinlikler, training_programs, training_modules, training_attendance, checklist_maddeler, leads(eski), recruiting_candidates(eski), danismanlar, havuz, timeline, cagri_log, danisman_notlar, arayislar, dis_portfolyo, eslesmeler, islem_log, bilgi_merkezi, gd_badges, gd_onboarding_progress, app_credentials, dan_ayrilis_progress, legacy_records, dan_memnuniyet, dan_recruiting_katki, assignments` + 3 diğer) — kod tarafından hiç referans edilmiyor, sadece veritabanı şemasında duruyor. **Silinmedi, sadece görünürlükten kaldırıldı.**
- **`claim_opportunity()`** — DB'den tamamen `drop` edilmiş fonksiyon; isim kalıntısı sadece `lib/errors.js`/`errors.test.js` yorum satırlarında geçiyor.
- **`takip.listBrokerNotes()`** — mock'tan okunan, gerçek tabloya hiç bağlanmamış "yarım" özellik.
- **Match Score / otomatik alıcı-satıcı eşleştirme** — hiç yazılmamış (menüde/dokümantasyonda beklenebilecek ama kod tabanında yok).
- **Timeline/not geçmişi (opportunities)** — eski prototipte vardı (`archive.timeline`), bugünkü sistemde tek satırlık `ozet` alanıyla "değiştirilmiş", gerçek bir versiyon sistemi hiç kurulmamış.
- **Onboarding "reddet" mekanizması** — hiç yazılmamış.

---

## 15. TUTARSIZLIK ANALİZİ

- **"Katıldı" (event_attendance) vs "Tamamlandı" (tasks.status)** — Karışıklık **bulunamadı**; bunlar tamamen ayrı domain/kolonlardır, isim benzerliği yok.
- **"Davetli" ile "Katılmadı" karıştırılması** — `meetingAttendPercent()` `davetli`/`onayladi` durumlarını hesaba hiç katmıyor (resolved listesine girmiyor). Yani **davet edilip hiç yanıt vermeyen bir danışman sonsuza kadar nötr kalır, "katılmadı" sayılmaz** — karışıklık değil ama davranışsal bir risk (bkz. §16).
- **Mazeretin farklı yerlerde farklı hesaplanması** — Asıl skor hesaplaması **tek yerde** (`meetingAttendPercent`), tutarlı. Ancak `EventDetailModal`'daki "Katılmayacak" sayacı (`AttendanceSummary`) **aynı mantığı** (`mazeretli+reddedildi=katılmayacak`) ayrı bir kod konumunda tekrar yazmış — mantık kopyalanmış, henüz çelişki yok ama bakım riski.
- **Kullanıcı tiplerinin filtrelenmesi** — `teamMembers` tanımı (`!role || role==='danisman' && !testHesabi`) Panel.jsx, TakipTab.jsx, `socialUsagePercent()` içinde ayrı ayrı ama **tutarlı** şekilde tekrar yazılmış (ortak fonksiyona çıkarılmamış, ama şu an fiilen aynı).
- **Tarih filtresinin ekranlar arasında farklı çalışması** — Panel.jsx'te bazı kartlar tarih filtresine tabi (Operasyon/Portföy/Recruiting sayıları), bazıları **bilinçli olarak bağımsız** (Dikkat Gerekiyor, Portal Kullanımı, Dönem Liderleri, Reklam Kaynakları, Yaklaşan Etkinlik). Kod içinde tasarım kararı olarak yorumlanmış, ama kullanıcı gözünden "neden bu kart filtreye tepki vermiyor" sorusu doğurabilir.
- **Arşiv/silinmiş kayıtların rapora dahli** — `archive` şemasındaki tablolar hiçbir raporu beslemiyor (kod hiç referans etmiyor), bu açıdan risk yok.
- **Eski verinin yeni veri gibi sayılması** — `isLegacyRecord()` (created_at &lt; 2025-01-02) tam olarak bunu önlemek için var, `call_logs`/`opportunities`'te kullanılıyor. Recruiting/Lead Havuzu'nda aynı kavramın uygulanıp uygulanmadığı bu raporda ayrıntılı incelenmedi — DOĞRULANMADI.
- **İsim bazlı eşleştirme riski** — `computeReklamKoduConversion()`/`computeRecruitingReklamConversion()` reklam adı/kampanya kodunu **string** olarak grupluyor (id değil) — yazım farkı olursa aynı reklam iki ayrı satır sayılabilir. Bu bir gözlemlenmiş hata değil, yapısal bir risktir — DOĞRULANMADI olarak işaretlenir.

---

## 16. RİSKLİ NOKTALAR

### KRİTİK

- **`/kartvizitim` route guard'sız** — ofis rolü menüde göremediği bir sayfaya URL ile erişip kendi profilini düzenleyebiliyor. Gerçek zarar düşük (sadece kendi profili) ama tasarım amacına aykırı bir erişim kontrolü boşluğu.
- **`call_logs` hard-delete + audit_log kapsamı dışı** — Bir çağrı kaydı (telefon numarası, arama sonucu) **hiçbir iz bırakmadan** kalıcı olarak silinebiliyor; kim sildiğine dair hiçbir kayıt yok.
- **`delete-user` sonrası `call_logs`/`leads`/`recruiting_candidates`/`docs` üzerindeki toplu NULL'lama işlemleri audit_log'a hiç düşmüyor** — kullanıcı silme sırasındaki geniş çaplı veri değişikliği bu 4 tablo için tamamen izsiz (sadece `opportunities`/`score_entries`/`users`/`tasks` loglanıyor).

### YÜKSEK

- **Müşteri memnuniyetinin iki farklı formülle hesaplanması** (§13.1) — broker/owner farklı ekranlarda farklı bir sayı görüp yanlış yorumlayabilir.
- **`opportunityStats`'ın (kapandı/iptal/claimed) hesaplanıp hiç gösterilmemesi** — "fırsat kapanma oranı" gibi önemli bir iş metriği Panel'de yok; veri var, gösterim yok.
- **7 günlük "inaktif danışman" eşiğinin iki ayrı kod konumunda kopyalanmış olması** (§13.2) — biri güncellenip diğeri unutulursa tutarsızlık doğar.
- **Recruiting "evrak" → Onboarding devrinin koda bağlanmamış olması** — aday kabul edilince checklist süreci otomatik başlamıyor, elle takip gerektiriyor, unutulma riski taşıyor.
- **Davet edilip hiç yanıt vermeyen danışmanın sonsuza kadar nötr kalması** (§15) — bir danışman toplantı davetlerini sistematik olarak yanıtsız bırakırsa bu hiç fark edilmez, skoru hiç etkilemez.

### ORTA

- Panel'deki bazı kartların tarih filtresine tabi, bazılarının bağımsız olması — UX tutarsızlığı, yanlış yorumlama riski.
- `AuditLogTable.jsx` `TABLE_LABELS`'da `tasks` eksik — küçük ama kanıtlanmış UI kusuru.
- Reklam dönüşüm raporlarının string bazlı gruplama kullanması — yazım tutarsızlığı riski.
- `education_progress`/`onboarding_checklist_status` yazma RLS'inin `is_active()` şartı taşımaması (yalnızca `is_manager()`) — pasif bir broker/owner hesabının teorik olarak hâlâ yazabilmesi ihtimali (DOĞRULANMADI, test edilmedi).

### DÜŞÜK

- `archive` şemasındaki 28 ölü tablo temizlenmeden duruyor — çalışmayı etkilemiyor, sadece şema kalabalığı ve gelecekte kafa karışıklığı riski (bu raporun başlangıcında yaşandığı gibi).
- `claim_opportunity` isim kalıntısı sadece yorum satırlarında.

---

## 17. SONUÇ

### A. ŞU AN DOĞRU ÇALIŞANLAR

- Rol/RLS mimarisi (`roles.js` + RLS policy'leri) — RLS katmanının kendisi (`is_manager()`, `current_user_role()`, `opportunities_select`, `call_logs_select`, `tasks` RLS'leri, kolon-seviyesi trigger'lar) titizlikle inşa edilmiş ve iç tutarlı; menü+route guard katmanı ise tüm sayfalarda eşit uygulanmamış (Leads/Recruiting/Ayarlar'da var, Kartvizitim/Pano/Fırsatlar/Takip/Lig/Rehber'de yok — bkz. §16).
- Takvim/toplantı/mazeret akışı uçtan uca tutarlı — `event_attendance` durum makinesi, RLS ve `meetingAttendPercent()` birbirini doğruluyor.
- Portal Kullanımı metriği gerçek `auth.users.last_sign_in_at` verisiyle çalışıyor (mock değil) — `list_user_activity()` RPC.
- Danışman silindiğinde müşteri/iş kayıtlarının artık korunması (2026-08-15 değişikliği) — `opportunities`/`tasks`/`call_logs`/`leads`/`recruiting_candidates`/`docs` referansları NULL'lanıyor, kayıtlar silinmiyor.
- Lead Havuzu → Recruiting dönüşümünde kaynak eşleme (`LEAD_TO_RECRUITING_KAYNAK`) deterministik ve kod kanıtlı.
- Müşteri telefon gizliliği (`get_opportunity_contact()`) — "İlgileniyorum" diyene asla açılmıyor kuralı kod seviyesinde sağlam uygulanmış.

### B. ÇALIŞIYOR AMA RİSKLİ OLANLAR

- Müşteri memnuniyeti çifte hesaplama (`customerReviewPercent()` vs `wilsonScoreLowerBound()`).
- `call_logs` hard-delete + audit_log kapsamı dışı kalması.
- `/kartvizitim` route guard'sızlığı.
- 7 gün eşiğinin (`isInactiveAgent()` / `usageBuckets`) iki ayrı yerde kopyalanması.
- Recruiting → Onboarding devrinin koda bağlanmamış olması.
- Davet edilip yanıtsız kalan danışmanın skor açısından fark edilmemesi.

### C. HATALI / TUTARSIZ OLANLAR

- `AuditLogTable.jsx` `TABLE_LABELS` sözlüğünde `tasks` eksik — kanıtlanmış, küçük ama gerçek bir UI hatası.
- `opportunityStats` içinde hesaplanıp hiçbir yerde gösterilmeyen `kapandi`/`iptal`/`claimed` sayıları — "yarım" bırakılmış bir özellik.
- `takip.listBrokerNotes()` hâlâ mock veriden okunuyor — production'da hiç gerçek veriye bağlanmamış, yarım entegrasyon.
- `computeHealthScore()`'un eğitim bileşeni (sadece modül) ile Panel'in `educationGaps` (modül+checklist) farklı formül kullanması — aynı isimle anılan iki farklı sayı.

---

*Bu rapor 5 paralel araştırma turunun (roller/menüler, panel/performans, takvim/toplantı/eğitim, onboarding/portföy/recruiting, santral/ofis havuzu/log) ve ardından bunları rapora hiç güvenmeden yeniden doğrulayan 4 ayrı bağımsız denetim turunun bulgularının sentezidir. Her bölümdeki iddialar ilgili alt-araştırmada dosya:satır referanslarıyla kanıtlanmıştır; bu özet belgede yer kazanmak için bazı satır numaraları kısaltılmış olabilir — ayrıntılı kaynak gerekirse ilgili modülün kod dosyaları (yukarıda anılan `panel-app/src/...` ve `panel-app/supabase/...` yolları) doğrudan kontrol edilebilir.*

---

## EK: DOĞRULAMA SONUÇLARI (Bulgu Bazında)

Aşağıdaki tablolar, 4 bağımsız doğrulama turunun her bir somut iddia için verdiği DOĞRU/YANLIŞ/KISMEN DOĞRU/ARTIK GEÇERLİ DEĞİL sonucunu özetler. Doğrulama, rapora hiç bakmadan/güvenmeden kaynak koda geri dönülerek yapılmıştır.

### Doğrulama 1 — Roller/Yetkiler (§1) + Panel (§3) — 46 DOĞRU, 0 YANLIŞ, 2 KISMEN DOĞRU

| İddia | Verdict |
|---|---|
| Kodda 4 rol: broker/owner/ofis/danisman; "Admin/GD" kodda birebir yok | DOĞRU |
| HashRouter, route seviyesinde rol guard'ı yok, ProtectedRoute sadece oturum kontrolü | DOĞRU |
| Menü görünürlüğü `modules.js` (ALL_ROLES/MANAGE_ROLES/LEADS_ROLES) ile filtreleniyor | DOĞRU |
| `/leads`, `/recruiting`, `/ayarlar` route guard'lı; `/firsatlar`, `/takip`, `/lig`, `/rehber`, `/kartvizitim`, `/pano` guard'sız | DOĞRU |
| Ofis Kartvizitim linkini göremez ama URL'den erişip düzenleyebilir (RLS izin veriyor) | DOĞRU |
| `is_manager()` sadece broker/owner, ofis dahil değil | DOĞRU |
| broker: opportunities silmede tek yetkili; owner: silemez fakat neredeyse her şeyi yönetir, docs/periods/social_activity_types hariç | DOĞRU |
| owner'ın broker'ın üstlendiği fırsatları göremediği istisna (2026-08-02 kararı) | DOĞRU |
| ofis: leads=0 satır, audit_log/webhook_errors erişemez, tasks görünürlüğü | **KISMEN DOĞRU** — "sadece kendi" değil, "kendi oluşturduğu VEYA kendisine atanan" |
| danışman: hiçbir şeyi silemez, opportunities/call_logs/tasks sadece kendine ait olanı görür/düzenler | DOĞRU |
| Panel'de "Ofisin Nabzı" 6 kutu, "Dikkat Gerekiyor" 4 kriter (attention.js), tarih filtresinden bağımsız | DOĞRU |
| Portal Kullanımı — gerçek `auth.users.last_sign_in_at`, 7 gün eşiği iki ayrı kod konumunda kopyalanmış | DOĞRU |
| Dönem Liderleri memnuniyet kategorisi Wilson skoruyla ayrı hesaplanıyor (RLS nedeniyle bilinçli) | DOĞRU |
| Eğitim — Geride Kalanlar (modül+checklist) ile computeHealthScore (sadece modül) farklı formül | DOĞRU |
| Panel'de "Bugünün Özeti", "Müdahale Gerektiren Danışmanlar", "Danışman Performansı", "Son İşlemler" adında kart yok | DOĞRU |
| opportunityStats (kapandı/iptal/claimed) hesaplanıp hiç gösterilmiyor | DOĞRU |
| RLS mimarisinin "her sayfada eşit tutarlı" olduğu genellemesi | **KISMEN DOĞRU** — RLS katmanı iç tutarlı, route-guard katmanı tüm sayfalarda eşit uygulanmamış |

### Doğrulama 2 — Takvim (§4) + Danışman Performansı (§5) — 48 DOĞRU, 0 YANLIŞ, 0 KISMEN DOĞRU

| İddia | Verdict |
|---|---|
| `calendar_events`'te "hedef" kolonu yok, "durum" yok (katılım durumu ayrı tabloda) | DOĞRU |
| `event_attendance` junction tablo, array kolon değil (`invited_ids` kasıtlı olarak yok) | DOĞRU |
| 7 etkinlik türü, 6 katılım durumu, katilim_tipi 3 değer, mazeret_status 3 değer, gorunurluk 2 değer — hepsi birebir | DOĞRU |
| "Tüm Ofis" butonu sadece checkbox işaretler, katılım tipini otomatik atamaz | DOĞRU |
| Etkinlik oluşturma 2 ayrı adım (INSERT+INSERT), trigger/transaction yok | DOĞRU |
| Katıldı/Katılmadı/Geç Geldi yönetim tarafından işaretlenir; Geç Geldi skora hiç girmez | DOĞRU |
| Mazeret danışman başlatır, mazeret_status otomatik 'bekliyor'; onay/red sadece yönetim | DOĞRU |
| Reddedilen mazeret "katılmadı" gibi, onaylanan/bekleyen nötr | DOĞRU |
| ALWAYS_VISIBLE_EVENT_TYPES 4 tür, RLS'te bir ara migration'da eksik kalıp sonra düzeltilmiş | DOĞRU |
| education_progress ikili (satır var/yok), toplantının 6 durumlu modelinden farklı | DOĞRU |
| calendar_events.type='egitim' ile education_modules FK'siz, tamamen ayrı sistemler | DOĞRU |
| WEIGHTS toplamı 1.00, YILLIK_CIRO_HEDEFI=2304000 | DOĞRU |
| 7 metriğin (ciro/education/meetingAttend/leadResponse/portalUsage/customerReview/socialUsage) kaynak/tarih aralığı/veri-yok davranışı | DOĞRU (tümü) |
| socialUsagePercent'te ofis/broker ortalamaya dahil değil | DOĞRU |
| computeHealthScore eşikleri (≥80 iyi, 60-79 dikkat, &lt;60 kritik) | DOĞRU |
| computeHealthScore'un education bileşeni sadece modül, checklist hariç | DOĞRU |
| Panel ve Takip sayfası aynı computeHealthScore + aynı teamMembers filtresini kullanıyor, sadece görünüm farklı | DOĞRU |
| Davet edilip hiç yanıt vermeyen danışman sonsuza kadar nötr kalır | DOĞRU |

### Doğrulama 3 — Onboarding (§6) + Portföy/Lead (§7) + Recruiting (§8) — 30 DOĞRU, 0 YANLIŞ, 0 KISMEN DOĞRU

| İddia | Verdict |
|---|---|
| create-user checklist satırı hiç açmıyor, otomatik değil | DOĞRU |
| seed.sql'de sadece 5 madde (3 baslangic+2 ayrilis); "21 madde" sadece bir migration yorumunda, içerikleri kod tabanında yok | DOĞRU |
| Checklist işaretleme sadece broker/owner (`disabled={!isManager}`), ofis dahil değil | DOĞRU |
| Reddetme mekanizması yok, sadece işaretli/işaretsiz iki hal | DOĞRU |
| Not alanı yok (item_id/user_id/done_at/done_by dışında kolon yok) | DOĞRU |
| Checklist %100 olunca danışman ekranından bölüm kayboluyor | DOĞRU |
| opportunities tablosunda kod/numara kolonu yok; generateTalepKodu aslında call_logs.portfoy_no için | DOĞRU |
| claim_opportunity() DB'den tamamen drop edilmiş, yerine assign_opportunity_to() + opportunity_interest geldi | DOĞRU |
| close_opportunity() sadece kapandi/iptal, migration'ın kendi itirafı: 19 Temmuz'a kadar hiç kullanılmıyordu | DOĞRU |
| Sonraki takip tarihi kolonu yok; gecikme hesabı sadece created_at'a dayanıyor | DOĞRU |
| Timeline/not geçmişi yok, sadece tek satırlık ozet alanı | DOĞRU |
| opportunityStats hesaplanıp sadece 'acik' gösteriliyor; ciro/Lig ile opportunities arasında bağlantı yok | DOĞRU |
| Silme gerçek DELETE, sadece broker, soft-delete kolonu yok | DOĞRU |
| Archive sadece tek seferlik 2026-07-22 temizliği, aktif bir arşivleme akışı yok | DOĞRU |
| Lead Havuzu 4 tip/8 durumdan 2 tip/3 duruma sadeleşti, erişim ofis'ten alınıp broker/owner'a daraltıldı, elle kayıt eklenmiyor | DOĞRU |
| Recruiting: 13 kaynak, 7 durumlu huni, kanban yok (dropdown var), silme fonksiyonu hiç yok | DOĞRU |
| Görüşme tarihi Takvim'e (recruiting_gorusmesi) otomatik bağlanıyor | DOĞRU |
| LEAD_TO_RECRUITING_KAYNAK sabiti gerçek ve deterministik | DOĞRU |
| Recruiting "evrak"→Onboarding devri kodda yok ("sonraki fazda" notu) | DOĞRU |

### Doğrulama 4 — Santral (§9) + Ofis Havuzu (§10) + Log (§11) + Silme/Audit — 24 DOĞRU, 0 YANLIŞ, 1 KISMEN DOĞRU

| İddia | Verdict |
|---|---|
| call_logs verisi %100 Supabase'de, localStorage sadece bildirim bayrakları için | DOĞRU |
| Telsam webhook sadece gelen (dahili numaraya) çağrıları loglar, giden çağrılar hiç loglanmaz | DOĞRU |
| Telsam CDR pull-sync (cron, her dakika) asıl kullanılan senkron yöntemi | DOĞRU |
| Fırsata dönüştürme ve danışmana atama tamamen manuel, otomatik trigger yok | DOĞRU |
| Çağrı silme gerçek DELETE, onay diyaloğuyla, audit_log'a hiç düşmüyor | DOĞRU |
| Alıcı talebi/Ofis Havuzu ayrı tablo değil, opportunities.type='alici' / claimer_id null+status='acik' | DOĞRU |
| "Havuza at" claimer_id'yi null bırakıyor, bunun için ayrı bir RLS bug-fix migration'ı gerekmiş | DOĞRU |
| get_opportunity_contact() sadece owner/broker/owner(broker tutmuyorsa)'a telefon açıyor, ilgi gösterene asla | DOĞRU |
| Match Score / otomatik eşleştirme kodda yok | DOĞRU |
| Sadece 4 tabloya audit trigger bağlı: users, opportunities, score_entries, tasks | DOĞRU |
| delete-user'ın call_logs/leads/recruiting_candidates/docs üzerindeki null'lama işlemleri audit_log'a hiç düşmüyor | DOĞRU |
| audit_log'da IP/user agent kesinlikle tutulmuyor (sadece 7 kolon) | DOĞRU |
| Log sekmesi sadece broker/owner, son 200 kayıt, pagination/filtre yok | DOĞRU |
| AuditLogTable.jsx TABLE_LABELS'da tasks eksik | DOĞRU |
| delete-user artık opportunities'i silmiyor, sadece owner_id/claimer_id/closed_by null'luyor (2026-08-15 kararı, bugün de geçerli) | DOĞRU |
| public.users→auth.users cascade FK'si (kişisel veri kaybı mekanizması) | **KISMEN DOĞRU** — davranışla tutarlı ama migration satırında doğrudan görülmedi |

---

*Doğrulama turlarının tam, satır satır gerekçeli halleri (yukarıdaki tabloların dayandığı orijinal ~150 madde) bu oturumun ajan kayıtlarında mevcuttur; bu ek, okunabilirlik için özetlenmiş halidir.*
