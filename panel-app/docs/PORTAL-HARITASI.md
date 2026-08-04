# RE/MAX Lavanda Ofis Portalı — Mimari Haritası

Bu belge, `remaxlavanda` reposundaki `panel-app/` React+Vite+Supabase ofis
portalının mimari denetimidir. Kaynak: statik kod okuması (React
bileşenleri, `lib/dataProvider/supabaseProvider.js`, tüm migration
dosyaları, edge function'lar, `AI_NOTLARI.md`, `CLAUDE.md`). **Bu oturumda
canlı Supabase veritabanına SQL/MCP erişimi yoktu** — bu yüzden gerçek
kullanım sayıları, cron çalışma geçmişi, gerçek satır sayıları gibi
veritabanı sorgusu gerektiren her madde `DOĞRULANMADI` etiketiyle işlendi;
hiçbir sayı uydurulmadı.

Denetim tarihi: 2026-08-04. Denetlenen dal (branch):
`claude/operations-menu-empty-n7nxp8`.

---

## 1. Teknik Yığın

### 1.1 Framework ve sürümler (`panel-app/package.json`)

- **React** `^19.2.7`, **react-dom** `^19.2.7`
- **Vite** `^8.1.1` (build aracı), `@vitejs/plugin-react` `^6.0.3`
- **react-router-dom** `^7.18.1` — `HashRouter` kullanılıyor (bkz. `src/App.jsx`), yani gerçek URL'ler `#/panel` şeklinde — statik hosting altında server-side rewrite derdi olmadan SPA routing çalışsın diye tercih edilmiş (DOĞRULANMADI — yorum kodda yok, mantıksal çıkarım).
- **@supabase/supabase-js** `^2.45.4`
- **@fullcalendar/*** `^6.1.21` (core/daygrid/interaction/list/react/timegrid) — Takvim modülü, ağırlığı nedeniyle `lazy()` ile ayrı chunk olarak yükleniyor (`src/App.jsx` satır 26-28).
- **Tailwind CSS** `^4.3.2` (`@tailwindcss/vite` eklentisiyle), `autoprefixer`, `postcss`
- **lucide-react** `^1.24.0` (ikon seti), `qrcode` `^1.5.4` (kartvizit QR), `html-to-image` `^1.11.13` (Lig paylaşım kartı), `react-easy-crop` `^6.2.2` (avatar kırpma)
- **Test**: `vitest` `^2.1.4`, `@testing-library/react` `^16.3.2`, `jsdom`
- **Lint**: `oxlint` `^1.71.0` (`.oxlintrc.json`)

Script'ler: `dev` (vite), `build` (vite build), `lint` (oxlint), `preview`, `test` (vitest run).

### 1.2 Dizin yapısı (`panel-app/src/`)

```
components/   — sayfa-bağımsız UI bileşenleri, modül bazlı alt klasörler
              (auth, calendar, common, education, gorevler, kartvizit,
               layout, leads, league, operasyon, opportunities, panel,
               recruiting, rehber, settings, takip)
context/      — AuthContext, UsersContext, ToastContext
data/         — mock* dosyaları (sadece mock modda kullanılır)
hooks/        — useAsyncList, useEscapeKey
lib/          — iş mantığı + dataProvider (mock/supabase), rol kuralları
pages/        — route bileşenleri (Panel, Firsatlar, Leads, Recruiting,
              Takip, Lig, Rehber, Ayarlar, Login, Kartvizitim,
              KartvizitPublic, Takvim, Pano) + alt-sekme dosyaları
              (firsatlar/, takip/, takvim/)
```

`panel-app/supabase/` altında `migrations/` (77 SQL dosyası, kronolojik) ve
`functions/` (10 Edge Function).

### 1.3 Build ve deploy akışı

`panel-app/CLAUDE.md`'de "Asla onay almadan commit/push/deploy yapma"
kuralı var ama **deploy mekanizmasının kendisi** `DEPLOYMENT_PLANI.md`'de
tarif ediliyor (panel-app kökünde) ve repo kökündeki `panel/` klasörünün
varlığıyla doğrulanıyor:

1. `npm run build` → `panel-app/dist/` üretilir (Vite).
2. `dist/`'in içeriği, repo kökündeki `panel/` klasörüne kopyalanır —
   `panel/` klasörü **tamamen silinip yeniden doldurulur**
   (`DEPLOYMENT_PLANI.md` satır 59-60).
3. `git push` ile `main`'e gönderilir.
4. Canlı domain: `panel.remaxlavanda.com.tr` isteği `vercel.json`
   rewrite kuralıyla `/panel/index.html`'e yönlendiriliyor — yani asıl
   çalışan yol `www.remaxlavanda.com.tr/panel/`'dir
   (`DEPLOYMENT_PLANI.md` satır 34-37). Vercel'in bu repoyu otomatik
   deploy ettiği varsayılıyor (statik dosya push'u = canlıya yansıma) —
   **DOĞRULANMADI**, Vercel proje ayarlarına bu oturumda erişim yok.

Bu repoda şu an `panel/dist` içeriğiyle `panel-app/dist` içeriği aynı
dosya isimlerini taşıyor (`ls` ile doğrulandı: ikisinde de `assets`,
`index.html`, `sw.js` vb.) — yani en azından bir kere bu akış
gerçekten uygulanmış.

Bu akışın kritik riski: **iki farklı derlenmiş kopya** repoda birlikte
duruyor (`panel-app/dist/` ve `panel/`) ve senkron kalmaları tamamen elle
yapılan bir adıma bağlı — `dist/` derlenip `panel/`'e kopyalanmazsa
canlı sürüm eskide kalır, bunu tespit edecek otomatik bir kontrol yok
(CI/CD pipeline'ı bu depoda bulunamadı — DOĞRULANMADI, GitHub Actions
workflow dosyası aranmadı ayrıca doğrulanmalı).

### 1.4 Ortam sayısı

`.env.development.local`, `.env.production` ve `.env.example` dosyaları
var; ayrı bir **staging ortamı bulguya rastlanmadı** — DOĞRULANMADI
(Supabase projesi tek mi, ayrı bir staging Supabase projesi var mı
bilinmiyor; `.env.production`'daki `VITE_SUPABASE_URL` değeri bu
denetimde okunmadı, sadece değişken adı biliniyor).

`VITE_DATA_SOURCE` üzerinden **mock mod** (`USE_SUPABASE=false`,
sabit kullanıcı setiyle geliştirme) ile **gerçek Supabase modu**
ayrılıyor; ancak `.env.example` notuna göre `npm run build`
(production build) HER ZAMAN Supabase kullanır — mock veri asla
production'a girmiyor (`src/lib/env.js`, DOĞRULANMADI detaylı kod
okunmadı ama `.env.example` yorumunda açıkça yazıyor).

---

## 2. Ekran Envanteri

Route tanımları `src/App.jsx`'ten, rol kontrolü ilgili sayfa dosyasından,
tablo erişimi `supabaseProvider.js`'teki karşılık gelen modülden çıkarıldı.
"Son 30 gün kullanım" sütunundaki her hücre **DOĞRULANMADI** — bu oturumda
canlı veritabanına erişim yok.

| Route | Dosya | Erişebilen rol | Okuduğu tablo(lar) | Yazdığı tablo(lar) | Son 30 gün kullanım |
|---|---|---|---|---|---|
| `/login` | `src/pages/Login.jsx` | (auth gerektirmez) | `auth` (Supabase Auth) | — | DOĞRULANMADI |
| `/k/:userId` | `src/pages/KartvizitPublic.jsx` | Herkese açık (anon) | `get_kartvizit()` RPC | — | DOĞRULANMADI |
| `/pano` | `src/pages/Pano.jsx` | Tüm giriş yapmış roller (route seviyesinde kısıt yok) | `calendar_events`, `event_attendance` (varsayım — DOĞRULANMADI, dosya detaylı okunmadı) | — | DOĞRULANMADI |
| `/panel` | `src/pages/Panel.jsx` | Tüm roller — içerik role göre değişir (`isDanisman`, `isBrokerOrOwner`, `role===ROLES.OFIS` dallanmaları, satır 291/298/1179) | `opportunities`, `call_logs`, `leads`, `users` (list_user_activity RPC), `ciro_musterileri` (Panel.jsx içi Promise.all — DOĞRULANMADI tam liste) | — (salt okunur pano) | DOĞRULANMADI |
| `/firsatlar` | `src/pages/Firsatlar.jsx` (+ `firsatlar/FirsatlarTab.jsx`, `firsatlar/OperasyonTab.jsx`) | Tüm roller; alt sekmeler role göre görünür/gizli olabilir (DOĞRULANMADI, dosya içi filtre detaylı okunmadı) | `opportunities`, `categories`, `opportunity_interest`, `call_logs` | `opportunities` (insert/update/close/assignTo RPC'leri), `opportunity_interest`, `call_logs` | DOĞRULANMADI |
| `/operasyon` | Aynı bileşen: `Firsatlar.jsx` (route alias) | Aynı | Aynı | Aynı | DOĞRULANMADI |
| `/takvim` | `src/pages/Takvim.jsx` (+ `takvim/TakvimTab.jsx`, lazy-loaded) | Tüm roller — görünürlük satır bazında RLS ile filtreleniyor (bkz. Bölüm 3) | `calendar_events`, `event_attendance` | `calendar_events`, `event_attendance` | DOĞRULANMADI |
| `/gorevler` | Aynı `Takvim.jsx` bileşeni, `takvim/GorevlerTab.jsx` sekmesi | Tüm roller — görme kuralı `canViewTask()` (bkz. Bölüm 3) | `tasks` | `tasks` | DOĞRULANMADI |
| `/leads` | `src/pages/Leads.jsx` | **Sadece broker/owner** — `canManageLeads(role)` false ise `<Navigate to="/panel"/>` (satır 244) | `leads`, `users` (danışman listesi) | `leads` | DOĞRULANMADI |
| `/recruiting` | `src/pages/Recruiting.jsx` | broker/owner/ofis (`canManageRecruiting`) — sayfa içi rol kontrolü DOĞRULANMADI tam olarak okunmadı, `canManageRecruiting` importu `lib/roles.js`'te tanımlı | `recruiting_candidates`, `leads` (kampanya bilgisi kopyalamak için) | `recruiting_candidates` | DOĞRULANMADI |
| `/takip` | `src/pages/Takip.jsx` (+ `takip/TakipTab.jsx`, `takip/EgitimTab.jsx`) | Tüm roller (yönetim geniş görür, danışman kendi verisini) — DOĞRULANMADI ayrıntı | `users` (listActivity RPC), `ciro_musterileri`, `education_*`, `onboarding_checklist_*`, `badges`, `user_badges` — **`takip` objesi hâlâ `mockProvider.js`'ten export ediliyor** (bkz. Bölüm 9, kısmen mock) | `education_progress`, `onboarding_checklist_status`, `user_badges` | DOĞRULANMADI |
| `/egitim` | Aynı `Takip.jsx` bileşeni | Aynı | Aynı | Aynı | DOĞRULANMADI |
| `/lig` | `src/pages/Lig.jsx` | Tüm roller — bazı paneller sadece yönetime (`ReviewCreditsPanel`, `ActivityPointsSettings` broker'a özel — DOĞRULANMADI) | `periods`, `score_entries`, `ciro_girisleri`, `ciro_musterileri`, `list_musteri_review_counts()` RPC, `social_activity_types`, `social_activity_log` | `periods`, `score_entries`, `ciro_girisleri`, `ciro_musterileri`, `social_activity_types`, `social_activity_log` | DOĞRULANMADI |
| `/rehber` | `src/pages/Rehber.jsx` | Tüm roller; yönetim ekleyip silebilir (`canManageDocs`) | `docs`, `doc_versions`, `categories`, Storage (docs bucket) | `docs`, `doc_versions`, `categories`, Storage | DOĞRULANMADI |
| `/kartvizitim` | `src/pages/Kartvizitim.jsx` | Tüm roller (kendi kartviziti) | `users` (getMyProfile) | `users` (updateProfile), Storage (avatar) | DOĞRULANMADI |
| `/ayarlar` | `src/pages/Ayarlar.jsx` | Tüm roller görebilir ama yönetim bölümleri `canManageUsers(role)` (broker/owner) arkasında (satır 41: `canManage`) | `users`, `user_private_info`, `audit_log`, `meta_webhook_errors`, `categories`, edge functions (create-user/delete-user/reset-user-password) | `users`, `user_private_info`, edge functions | DOĞRULANMADI |

**Önemli mimari not:** `ProtectedRoute.jsx` (`src/components/auth/ProtectedRoute.jsx`)
**hiçbir route'ta rol bazlı erişim kontrolü yapmıyor** — sadece
"oturum açık mı" ve "şifre değiştirmesi zorunlu mu" kontrol ediyor. Yani
`/leads`, `/ayarlar` gibi sayfalara **URL doğrudan yazılarak** herhangi bir
kimlik doğrulanmış kullanıcı (danışman dahil) girebilir; gerçek engel
sayfa bileşeninin kendi içindeki `if (!canManageX(role)) return <Navigate/>`
satırlarıdır (JS/render seviyesinde). Bu, Bölüm 3'te detaylandırılan
"JS koruması var, ama route seviyesinde değil" kalıbının kanıtıdır.

---

## 3. Kimlik ve Yetki

### 3.1 Login akışı (`src/context/AuthContext.jsx`, `RealAuthProvider`)

1. `client.auth.getSession()` ile mevcut oturum kontrol edilir.
2. Oturum varsa `loadProfile(userId)` çağrılır → `public.users` tablosundan
   `id, ad, email, rol, durum, must_change_password` seçilir
   (`loadProfileOnce`, satır 60-64).
3. `data.durum !== 'aktif'` ise `auth.signOut()` çağrılıp hata fırlatılır
   ("Hesabın pasif durumda...") — **ama** koddaki yorum açıkça diyor ki
   gerçek erişim engeli **burada değil**, RLS/`is_active()`'te (satır 71).
   Yani JS tarafındaki bu kontrol sadece kullanıcı deneyimi için (net
   mesaj), güvenlik sınırı DB tarafında.
4. Girişten hemen sonra PostgREST'in `auth.uid()` bağlamı henüz oturmamış
   olabileceği için, `not_found` (PGRST116) hatası alınırsa 700ms
   bekleyip bir kez daha denenir (satır 87-97) — bu bir race condition
   iş-arounddır, DB tarafında `is_active()` fonksiyonunun RLS
   context'inin gecikmeli oturmasına karşı savunma.
5. `client.auth.onAuthStateChange` aboneliği, oturum değişikliklerinde
   (sign-in/sign-out) `profile`'ı günceller.
6. `signIn(email, password)` → `signInWithPassword`; hata `mapSupabaseError`
   ile kullanıcıya gösterilebilir mesaja çevrilir.
7. İlk giriş / şifre sıfırlama sonrası `must_change_password=true` ise
   `ProtectedRoute` her sayfa yerine `ForceChangePasswordScreen` gösterir;
   `markPasswordChanged()` şifre güncellendikten SONRA bayrağı kapatır.

### 3.2 Rol kaynağı

Rol, `auth.users` değil **`public.users.rol`** kolonundan geliyor — yani
Supabase Auth sadece kimlik doğrulama (e-posta/şifre) için, yetkilendirme
verisi ayrı bir tabloda. `public.users.id`, muhtemelen `auth.users.id` ile
aynı (foreign key/PK ilişkisi migration'da — DOĞRULANMADI, init_schema
tam okunmadı ama satır 42 `create table public.users` `auth.users`e
referans veriyor gibi görünüyor, birebir teyit edilmedi).

### 3.3 Yetki kontrolü nerede yapılıyor — modül modül

Bu portalda **JS tarafı (`lib/*.js`'teki `can*`/`is*` fonksiyonları) ve
RLS tarafı (migration'lardaki `CREATE POLICY`) bağımsız yazılmış iki ayrı
katman.** Aralarındaki senkronu koruma sorumluluğu tamamen geliştiriciye
ait — kod yorumlarında sistematik olarak "... RLS'iyle aynı kural" notu
düşülmüş (bu, ikisinin birbirinden bağımsız olduğunun kanıtı; aynı olması
"garanti" değil, "hedef").

**Kanıtlanmış senkron kopması örneği (bkz. `AI_NOTLARI.md`, 2026-08-04
"Takvim genel türler: RLS'te de aynı kural gerekiyormuş"):**
Broker'ın istediği "genel etkinlik türleri (Toplantı/Eğitim/Etkinlik/
RE MAX Türkiye) danışmana otomatik görünsün" kuralı önce **sadece
`lib/calendar.js`'teki `canViewEvent()`/`ALWAYS_VISIBLE_EVENT_TYPES`**'a
eklendi (JS-only değişiklik, migration yok — commit `774b12a`). Broker
"hâlâ görülmüyor" deyince incelenince gerçek engelin
`calendar_events_select` RLS politikasında olduğu ortaya çıktı: satır
API'den zaten dönmüyordu, JS'in göstermek istemesi hiçbir işe yaramıyordu
(commit `a100a37`/`0cc935b`, migration
`20260802150000_remax_turkiye_etkinlik_turu.sql` ve
`20260804150000_genel_etkinlik_turleri_rls_gorunurluk.sql`). Bu, "önce
JS'te düzeltildi sanıldı, RLS unutuldu, kullanıcı hâlâ göremedi" kalıbının
belgelenmiş, gerçek bir örneğidir.

Modül modül değerlendirme (yorumlardaki "RLS ile aynı" notlarından
çıkarıldı, `src/lib/dataProvider/supabaseProvider.js` ve `src/lib/*.js`):

| Modül | JS tarafı kuralı | RLS karşılığı (yorumdan) | Durum |
|---|---|---|---|
| Kullanıcı yönetimi | `roles.js canManageUsers()` | `users_update_self_or_broker` + `create-user` Edge Function kendi içinde ayrıca doğruluyor | Çift katman, JS + RLS + Edge Function üçlü kontrol — en sağlam modül |
| Lead Havuzu | `roles.js canManageLeads()` | `leads_manage` RLS (broker/owner/ofis idi, sonradan ofis çıkarıldı — bkz. AI_NOTLARI) | Danışman için ayrı select policy YOK, "zaten sıfır satır alır" yorumu var (satır 535-536, `supabaseProvider.js`) — JS kontrolü (`Navigate`) olmasa bile RLS boş döner, güvenli |
| Recruiting | `roles.js canManageRecruiting()` | `recruiting_manage` RLS — leads_manage ile "birebir aynı" ama **bilerek ayrı tutuluyor** (satır 606-608) | Kasıtlı ayrışma, izlenmesi gereken teknik borç |
| Fırsatlar (opportunities) görünürlük | `opportunities.js canViewOpportunity()` | `opportunities_select` RLS — "birebir aynısı" yorumu (satır 7) | Senkron İDDİA ediliyor, test dosyası (`opportunities.test.js`) bu iki kuralı ayrı ayrı test ediyor — ama testler RLS'i simüle ediyor, gerçek DB politikasını çalıştırmıyor; ikisi elle senkron tutulmalı |
| Fırsat kapatma | `opportunities.js canCloseOpportunity()` | `close_opportunity()` SECURITY DEFINER RPC içinde ayrıca kontrol ediliyor ("birebir aynı kural", satır 94) | RPC seviyesinde gerçek zorlama var — bu görece güvenli, çünkü mutasyon path'i RPC'den geçiyor |
| Fırsat silme | `opportunities.js canDeleteOpportunity()` | `opportunities_delete` RLS sadece broker | JS + RLS ikisi de var |
| Görevler görünürlük | `tasks.js canViewTask()` | `tasks_select` RLS — "aynı kural" (satır 8) | 2026-08-04'te broker isteğiyle SADECE JS tarafı (`canViewTask`'tan ROLES.OFIS çıkarıldı) değişti, ayrı bir migration (`20260804140000_gorevler_ofis_gorunurlugu_daralt.sql`) ile RLS de güncellendi — bu kez ikisi birlikte, aynı gün içinde yapıldı (Takvim örneğinden ders çıkarılmış görünüyor) |
| Çağrı kayıtları (call_logs) düzenleme penceresi | `callLogs.js canEditCallDetails(role, createdAt)` | `trg_call_logs_detail_edit_window` (DB **trigger**, RLS değil) — "aynı kural" (satır 78) | JS + trigger — trigger seviyesinde zorlanıyor olması RLS policy'den daha güçlü bir garanti (satır bazlı update'i veritabanı seviyesinde reddedebilir), ama yine de iki ayrı yerde aynı zaman penceresi mantığı tekrarlanıyor |
| Kategori yönetimi | `categories.js canManageCategories()` | DOĞRULANMADI — migration'da karşılık gelen RLS ismi bu oturumda teyit edilmedi | Senkron durumu belirsiz |
| Lig skorları | `league.js canManageScores()`, `canManagePeriods()` | `periods_manage` RLS ("sadece broker" — satır 880 yorumu) | JS + RLS |

**Sadece JS'te gizlenip RLS'te KORUNMAYAN işlem taraması** (güvenlik açığı
adayı — TESPİT EDİLDİ, DÜZELTİLMEDİ):

1. **Route seviyesinde hiçbir rol kısıtı yok** (Bölüm 2 sonundaki not) —
   `/leads`, `/ayarlar` gibi sayfalara herhangi bir authenticated kullanıcı
   URL ile girebilir. Gerçek veri RLS ile korunuyor olabilir (ör. Lead
   Havuzu'nda danışman zaten 0 satır alıyor) ama **sayfanın kendisi**
   (boş tablo, formlar, buton yerleşimleri) render olur — bu bir bilgi
   sızıntısı değil ama tutarsız/kırık bir kullanıcı deneyimi riski
   taşır ve ileride birinin "sadece JS kontrolüyle yetinip RLS'i unutma"
   hatasını route seviyesinde de tekrarlamasına zemin hazırlar.
2. **`AI_NOTLARI.md`'deki Takvim örneği** (yukarıda detaylandırıldı) —
   düzeltildi ama kalıbın kendisi (önce JS, sonra "hâlâ olmuyor" şikayeti,
   sonra RLS) en az bir kez daha (Görevler, 2026-08-04) yaşanmış; bu
   sefer aynı gün içinde ikisi birlikte yapılmış — süreç iyileşme emaresi.
3. **Kategori yönetimi ve Ayarlar > Reklam Kaynakları gibi daha küçük
   yönetim ekranlarının RLS karşılığı bu denetimde tek tek doğrulanmadı**
   — DOĞRULANMADI, ayrı bir tarama gerektirir.

---

## 4. Veri Giriş Noktaları

| Giriş noktası | Dosya | Doğrulama var mı | Hata olursa ne oluyor | Son veri girişi |
|---|---|---|---|---|
| Telsam santral webhook (çağrı başlangıç/bitiş) | `supabase/functions/telsam-webhook/index.ts` | `key` query param, `TELSAM_WEBHOOK_KEY` secret'ıyla eşleşme kontrolü (satır 41-43) — imza doğrulama yok, sadece paylaşılan sır. `chan` yoksa sessizce `skipped` döner (satır 46) | `error` varsa `{ok:false, error}` + HTTP 500 döner (satır 66, 79) — Telsam'ın bunu nasıl işlediği (retry var mı) DOĞRULANMADI. Uygulama tarafında toast YOK (webhook, kullanıcı arayüzünden tetiklenmiyor) | DOĞRULANMADI |
| Telsam CDR pull-sync (cron) | `supabase/functions/telsam-cdr-sync/index.ts` | DOĞRULANMADI — içerik detaylı okunmadı, cron/pg_cron referansı `20260724100000_telsam_cdr_pull_sync.sql` migration'ında var | DOĞRULANMADI | DOĞRULANMADI |
| Meta (Facebook/Instagram) Lead Ads webhook | `supabase/functions/meta-leads-webhook/index.ts` | HMAC-SHA256 imza doğrulama (`X-Hub-Signature-256`, `verifySignature()`, satır 104-116, sabit zamanlı karşılaştırma) + GET doğrulamasında `hub.verify_token` kontrolü (satır 212-219) | İmza geçersizse veya alan eşleşmezse **`meta_webhook_errors` tablosuna loglanır**, Meta'ya yine de HTTP 200 dönülür (satır 237-241 — "Meta'ya her durumda 200 dönüyoruz, retry döngüsüne girip aboneliği tehlikeye atmasın" yorumu) — yani hatalar Meta'dan **gizleniyor**, sadece portalın "Ayarlar > Webhook Hataları" ekranından (`metaWebhookErrors` provider objesi, sadece broker/owner görür) görülebiliyor. Reklam bilgisi (Graph API `fetchAdInfo`) çekilemezse lead yine de kaydedilir, sadece `reklam_adi`/`kampanya_kodu` boş kalır (satır 176-182, kritik olmayan hata) | DOĞRULANMADI |
| Lead Havuzu elle giriş | `src/pages/Leads.jsx` + `src/lib/dataProvider/supabaseProvider.js` `leads.create()` | Form seviyesinde (React) — DOĞRULANMADI ayrıntı, DB seviyesinde zorunlu alan kısıtları migration'da olabilir | `run()` helper'ı hata olursa `mapSupabaseError` ile fırlatır, sayfa `showToast` ile gösterir (DOĞRULANMADI tam akış, ama `showToast` kullanımı 117 yerde tespit edildi genel olarak) | DOĞRULANMADI |
| Fırsat elle giriş / Operasyon çağrı kaydı | `src/pages/Firsatlar.jsx`, `NewOpportunityModal.jsx`, `NewCallModal.jsx` | Form seviyesinde | Aynı `run()`/`showToast` deseni | DOĞRULANMADI |
| Toplu aktarım / API | Bulunamadı — bu portalda dışa açık bir "bulk import" veya genel API endpoint'i tespit edilmedi | — | — | — |

---

## 5. Zamanlanmış İşler ve Tetikleyiciler

### 5.1 Edge Function'lar (`supabase/functions/`)

| Fonksiyon | Görevi | Tetikleme şekli |
|---|---|---|
| `telsam-webhook` | Santral çağrı olaylarını `call_logs`'a yazar | HTTP webhook (Telsam santralinin panelinden tanımlanan URL) |
| `telsam-cdr-sync` | CDR (çağrı detay kaydı) pull-sync — muhtemelen periyodik senkron | Migration adı `..._cdr_pull_sync` cron çağrıştırıyor — **DOĞRULANMADI**, bu fonksiyonun bir pg_cron job'una bağlı olup olmadığı, sıklığı, bu oturumda canlı veritabanından teyit edilemedi |
| `meta-leads-webhook` | Meta Lead Ads formlarını `leads`'e yazar | HTTP webhook (Meta) |
| `create-user`, `delete-user`, `reset-user-password` | service_role gerektiren kullanıcı yönetimi işlemleri (auth.users tarafı) | Frontend'den `functions.invoke()` ile senkron çağrılıyor, zamanlanmış değil |
| `notify-call-assigned`, `notify-event-invite`, `notify-new-opportunity`, `notify-opportunity-assigned` | Web Push bildirimleri (VAPID) | Muhtemelen DB trigger veya frontend tetiklemesiyle çağrılıyor — DOĞRULANMADI, içerikleri bu denetimde detaylı okunmadı |

### 5.2 DB trigger'ları (migration'larda `CREATE TRIGGER` geçen dosyalar)

`CREATE TRIGGER` ifadesi şu migration dosyalarında bulundu:

- `20260715072704_init_schema.sql`
- `20260717080000_call_logs_detay_duzenleme_penceresi.sql` → `trg_call_logs_detail_edit_window` (call_logs'ta arayan bilgisi düzenleme penceresi — Bölüm 3'te ele alındı)
- `20260717120000_score_entries_updated_at.sql` → muhtemelen `updated_at` otomasyonu
- `20260718190000_kullanici_ozel_bilgi.sql`
- `20260719070000_audit_log_trigger.sql` → kullanıcı/fırsat/skor değişikliklerini `audit_log`'a otomatik yazan trigger (`supabaseProvider.js` satır 1239-1241 yorumu bunu doğruluyor)
- `20260721070000_push_bildirimleri.sql`
- `20260721080000_firsat_atama_ve_takvim_bildirimleri.sql` → fırsat atama/takvim bildirimlerini muhtemelen `notify-*` edge function'larını tetikleyen trigger'lar
- `20260723090000_gorevler.sql`
- `20260724120000_webhook_secret_rotasyon.sql`
- `20260724140000_rol_yukseltme_koruma.sql` → rol yükseltme koruması (muhtemelen kendi kendine broker rolü verme engeli)

Her birinin **tam SQL içeriği ve "son ne zaman çalıştığı" bu oturumda
doğrulanmadı** — DOĞRULANMADI, canlı DB'ye erişim yok. Özellikle
`notify-*` fonksiyonlarını tetikleyen trigger'ların **hiç ateşlenmemiş
olma ihtimali** var (ör. push bildirimleri kullanıcı tarafından hiç
etkinleştirilmediyse) — bu bir tahmin, doğrulanmalı.

---

## 6. Dış Entegrasyonlar

| Entegrasyon | Kimlik doğrulama | Token ömrü/yenileme | Hata yakalama | Retry mantığı | Hatalar nereye yazılıyor |
|---|---|---|---|---|---|
| **Telsam PBX (santral)** | Paylaşılan sır (`TELSAM_WEBHOOK_KEY` query param) | Sabit secret, rotasyon mekanizması bu fonksiyonda görülmedi (ama `20260724120000_webhook_secret_rotasyon.sql` diye bir migration var — muhtemelen başka bir secret'ın rotasyonu, DOĞRULANMADI hangi secret) | `error` durumunda HTTP 500 + `{ok:false}` | Telsam tarafında retry var mı DOĞRULANMADI (dışarıdan bir sistem, kontrolümüz yok) | Hiçbir yere ayrıca loglanmıyor — sadece HTTP response'ta hata mesajı dönüyor, portal içi bir hata tablosu (`meta_webhook_errors` benzeri) YOK |
| **Meta (Facebook/Instagram) Lead Ads** | HMAC-SHA256 imza (`META_APP_SECRET`) + `META_VERIFY_TOKEN` (GET doğrulama) + `META_PAGE_ACCESS_TOKEN` (Graph API) | `META_PAGE_ACCESS_TOKEN`'ın ömrü/yenilenmesi bu Edge Function'ın sorumluluğunda değil — Meta tarafında süresi dolabilir, dolduğunda `fetchLeadFieldData`/`fetchAdInfo` başarısız olur ve `graph_api_hatasi` olarak loglanır (satır 152, 181) ama **token'ı otomatik yenileyen bir mekanizma yok** — DOĞRULANMADI token'ın uzun ömürlü (long-lived) olup olmadığı | Kapsamlı: imza hatası, Graph API hatası, alan eşleşmeme, insert hatası ayrı ayrı `meta_webhook_errors` tablosuna yazılıyor | Yok — Meta'ya her koşulda HTTP 200 dönülüyor (retry döngüsüne girmesin diye bilinçli tercih), yani **hata durumunda Meta bir daha denemez**, veri kalıcı olarak kaybolabilir (sadece hata logu kalır, lead kaydı oluşmaz) | `meta_webhook_errors` tablosu → `src/components/settings/WebhookErrorsTable.jsx` üzerinden sadece broker/owner'a gösteriliyor |
| **Supabase Auth** | E-posta/şifre (`signInWithPassword`) | Supabase'in kendi JWT/refresh token mekanizması (supabase-js içinde otomatik) | `mapSupabaseError` ile normalize edilip `AuthContext.error`'a yazılıyor, ekranda gösteriliyor | supabase-js kütüphanesinin dahili retry/refresh mantığına bağlı — DOĞRULANMADI özel bir retry kodu yazılmamış | `AuthContext` `error` state'i → Login ekranında gösteriliyor |
| **WhatsApp linkleri** | Yok — entegrasyon değil, sadece `wa.me/...` formatında link üretimi (danışman/lead telefonundan tıklanabilir link oluşturma) | — | — | — | — |
| **VAPID Web Push** | `VITE_VAPID_PUBLIC_KEY` (frontend'e gömülü, gizli değil) + private key sadece `notify-*` Edge Function secret'larında | Push subscription `endpoint` unique — yeniden abone olma upsert ile üstüne yazıyor (`savePushSubscription`, satır 1178-1179) | DOĞRULANMADI — `notify-*` fonksiyonlarının içeriği bu denetimde okunmadı | DOĞRULANMADI | DOĞRULANMADI |

---

## 7. İş Mantığı Nerede Duruyor (JS ⟷ RLS Senkron Riskleri)

Bölüm 3'teki tabloya ek olarak, **birden fazla yerde aynı kuralın
tekrarlandığı** (senkron riski taşıyan) çiftler:

1. **Telefon formatlama mantığı iki kez yazılmış**: `src/lib/phone.js`
   `formatPhoneInput()` ve `supabase/functions/meta-leads-webhook/index.ts`
   içindeki `formatPhoneInput()` — Edge Function dosyasının kendi başına
   yeterli (self-contained) olması için **bilerek kopyalanmış**
   (dosya başı yorumu, satır 27-30: "O dosya değişirse burası da elle
   güncellenmeli"). Bu açık bir teknik borç: `lib/phone.js` değişirse
   webhook'un fark etmesi hiçbir otomasyona bağlı değil, tamamen insan
   hafızasına bağlı.
2. **Ciro kümülatif toplama mantığı iki modülde tekrarlanmış**: Lig
   modülündeki ciro toplamı (`league.addScore`, tip='ciro' dalı, satır
   902-935) ve sosyal medya puanı toplamı (`logSocialActivity`, satır
   1047-1087) **aynı deseni** ("log tablosuna satır ekle, sonra tüm
   satırları çekip topla, `score_entries`'e üzerine yaz") iki ayrı
   fonksiyonda birebir tekrarlıyor — ortak bir yardımcı fonksiyona
   çıkarılmamış.
3. **Takvim görünürlük kuralı**: `lib/calendar.js` `canViewEvent()` /
   `ALWAYS_VISIBLE_EVENT_TYPES` sabiti ile `calendar_events_select` +
   `event_attendance_insert` RLS politikaları — Bölüm 3'te detaylandırılan,
   **kanıtlanmış senkron kopması yaşanmış** çift.
4. **Görevler görünürlük kuralı**: `lib/tasks.js` `canViewTask()` ile
   `tasks_select` RLS — aynı gün (2026-08-04) birlikte güncellendi,
   şu an senkron ama yapısal olarak yine iki ayrı dosyada aynı mantık.
5. **Çağrı kaydı düzenleme zaman penceresi**: `lib/callLogs.js`
   `canEditCallDetails(role, createdAt)` ile `trg_call_logs_detail_edit_window`
   DB trigger'ı — "aynı kural" yorumu var, trigger DB seviyesinde daha
   güçlü bir garanti veriyor ama zaman penceresinin süresi (kaç gün) iki
   yerde ayrı ayrı sabit kodlanmış olabilir — DOĞRULANMADI, trigger'ın
   tam SQL'i bu denetimde okunmadı.
6. **`review_credits` tablosu ile `ciro_musterileri` arasındaki geçiş** —
   Lig modülünün "yorum hakkı" hesaplaması eskiden `review_credits`
   tablosundaydı, sonra `ciro_musterileri`'ne taşındı
   (`20260718160000_ciro_musterileri.sql` migration yorumu: "review_credits
   ile birebir aynı görünürlük deseni"). `review_credits` tablosu ve RLS
   politikaları **hâlâ veritabanında duruyor ama hiçbir `.js` dosyası
   ondan okuma/yazma yapmıyor** — bkz. Bölüm 9 (Ölü Kod).

---

## 8. Ana Veri Akışları

### 8.1 Lead (Lead Havuzu)

- **Giriş noktaları**: (a) Meta Lead Ads webhook → `leads` tablosuna
  otomatik `upsert` (tip='recruiting' veya 'portfoy', kampanya kodundaki
  `RECRUIT` önekine göre otomatik sınıflandırılıyor — satır 185-186,
  meta-leads-webhook), (b) Lead Havuzu ekranından (`/leads`, sadece
  broker/owner) elle giriş.
- **Geçtiği ekranlar**: `/leads` (Lead Havuzu, sadece broker/owner
  görür/yönetir) → danışmana atanabilir (`atanan_danisman_id`) → durum
  alanı (`durum`) üzerinden takip edilir.
- **Dönüşüm**: Bir lead, **Recruiting** (`recruiting_candidates`, `kaynak_lead_id`
  ile bağlanıyor, `kayit_tipi='lead'`) veya **Fırsat/Portföy**
  (`opportunities`, `kaynak_lead_id` alanı) tarafına yönlendirilebilir —
  `AssignPortfolioLeadModal.jsx` bunun UI'ı. Reklam bilgisi
  (`reklam_adi`, `kampanya_kodu`) dönüşüm anında **denormalize edilerek**
  hedef tabloya kopyalanıyor (ör. `recruiting.create()` satır 640-651)
  ki liste ekranında ayrı bir join gerekmeden görünsün.
- **Bitiş**: `durum` alanı bir "kayıp nedeni" (`kayip_nedeni`) ile
  kapanabilir veya dönüşümle "recruiting"/"opportunity" tarafına geçip
  Lead Havuzu'nda pasif kalır (silinmiyor, arşiv değil — DOĞRULANMADI
  tam durum makinesi, migration'daki enum değerleri tek tek okunmadı).

### 8.2 Aday (Recruiting)

- **Giriş noktaları**: (a) Lead Havuzu'ndan dönüştürme, (b) doğrudan
  "+ Yeni Aday" akışı (`kayit_tipi='manuel'`), (c) muhtemelen
  `RECRUIT` kodlu Meta reklamlarından (dolaylı, lead üzerinden).
- **Geçtiği ekranlar**: `/recruiting` — `RecruitingTable.jsx`,
  `RecruitingDetailModal.jsx`, `RecruitingFilters.jsx`.
- **Durum değişikliği**: `durum` alanı manuel güncelleniyor;
  `yeniden_aktif_at` alanı "arşivden geri getirme" senaryosunu
  destekliyor (`kayit_tipi='gecmis'` sadece arşiv taşıma migration'ı
  veya "Yeniden Aktifleştir" tersiyle set ediliyor, `supabaseProvider.js`
  satır 636-638 yorumu). `gorusme_event_id` alanı, adayla yapılacak
  görüşmeyi Takvim'e bir etkinlik olarak bağlıyor (recruiting görüşmesi
  etkinlik türü, migration `20260803235900`).
- **Arşivleme**: `20260726160000_recruiting_arsiv_tasima.sql` migration'ı
  ayrı bir arşiv taşıma mekanizması öneriyor — muhtemelen belirli süre
  hareketsiz kalan adayları "gecmis" durumuna taşıyan bir işlem
  (DOĞRULANMADI, otomatik mi elle mi tetiklendiği bu denetimde
  netleştirilmedi).

### 8.3 Fırsat (Opportunity)

- **Giriş noktaları**: (a) danışmanın kendi bulduğu müşteri (`selfClaim=true`,
  direkt kendine atanmış — `opportunities.create()` satır 82-86), (b)
  Operasyon (çağrı kaydı) ekranından dönüştürme
  (`OperasyonTab.jsx handleOpportunitySubmit`, `call_logs.opportunity_id`
  ile geriye bağlanıyor), (c) Lead Havuzu'ndan yönlendirme
  (`kaynak_lead_id`).
- **Durum makinesi**: `status` alanı — havuzda bekleyen ("açık"),
  `claimer_id` ile üstlenilmiş ("claimed"), kapatılmış (`close_opportunity()`
  RPC'si, sadece broker/owner veya claimer çağırabilir). "İlgileniyorum"
  (`opportunity_interest` tablosu) **exclusive claim DEĞİL** — birden çok
  danışman ilgi gösterebilir, fırsatı giren kişi kimin ilgilendiğini görüp
  kendisi arar (satır 143-145 yorumu).
- **Gizlilik**: `opportunities.list()` bilinçli olarak `lead_ad`/`lead_telefon`
  seçmiyor — detay ekranı açıldığında ayrı bir `get_opportunity_contact()`
  RPC'si çağrılıyor, o da sunucu tarafında yetki kontrolü yapıp gerçek
  değeri ya da `null` dönüyor (dosya başı yorumu, satır 5-9). "Kaydeden"
  bilgisi de `isOwnerOrManager || alreadyInterested` koşuluna bağlı
  (2026-08-04 düzeltmesi, Bölüm 3'te bahsedildi).
- **Bitiş**: `close_opportunity()` RPC'si ile `status` kapatılır
  (`closed`/`iptal` gibi bir değer — DOĞRULANMADI kesin enum), veya
  `remove()` ile silinir (sadece broker, `opportunities_delete` RLS).
  `call_logs.opportunity_id` bu satırı referans alıyorsa silme
  Postgres 23503 hatası fırlatır, `lib/errors.js` bunu `in_use` olarak
  kullanıcıya gösteriyor (satır 174-177 yorumu).

### 8.4 Çağrı Kaydı (call_logs)

- **Giriş noktaları**: (a) Telsam santral webhook'u (otomatik, `kaynak='Santral'`,
  `telsam_chanid` ile eşleşen `upsert`), (b) Ofis personelinin elle girişi
  (`NewCallModal.jsx`), (c) Meta reklamlarından gelen `reklam_kodu` bağlantısı
  (`20260802120000_call_logs_reklam_baglantisi.sql`).
- **Geçtiği ekranlar**: `/operasyon` (`OperasyonTab.jsx`) —
  `CallTable.jsx`, `CallFilters.jsx`, `EditCallDetailsModal.jsx`,
  `StatsCards.jsx`, `SourceConversionBoard.jsx`, `ReklamKoduConversionBoard.jsx`.
- **Durum değişikliği**: `sonuc` (görüşme sonucu), `portfoy_alindi_mi`/
  `portfoy_no` (portföy alındıysa), `satildi_mi`/`satis_tarihi` (satış
  gerçekleşti mi), `donus_yapildi_mi`/`donus_at` (geri dönüş yapıldı mı),
  `portfoy_talebi_mi` (2026-08-04 eklenen ayrım — santral çağrısı portföy
  talebi DEĞİLSE danışmanın hiçbir işaretleme yapmasına gerek yok, sadece
  "aktarılmış çağrı" olarak görür, bildirim de almaz — bkz. AI_NOTLARI ve
  migration `20260804130000_santral_cagri_portfoy_talebi_mi.sql`).
- **Dönüşüm**: `opportunity_id` alanı, çağrının bir Fırsat kaydına
  dönüştürüldüğünü işaretler (`OperasyonTab.jsx handleOpportunitySubmit`).
- **Düzenleme kısıtı**: Arayan adı/telefonu sadece son 7 gün içindeki
  kayıtlarda owner/ofis tarafından düzenlenebilir, broker sınırsız
  (`trg_call_logs_detail_edit_window` trigger + `canEditCallDetails()` JS
  fonksiyonu — Bölüm 7, madde 5).
- **Bitiş**: Silme (`remove()`, RLS'e bağlı yetki) veya kalıcı kayıt
  olarak arşivde kalma (aktif silme dışında bir "kapatma" durumu yok gibi
  görünüyor — DOĞRULANMADI).

---

## 9. Ölü Kod

Kesin kanıt olmadıkça "muhtemelen ölü, DOĞRULANMADI" ifadesiyle işaretlendi.

1. **`review_credits` tablosu (muhtemelen ölü)** — `20260716220000_lig_yorum_hakki_ve_sosyal_medya.sql`
   migration'ında tablo + RLS politikaları (`review_credits_select`,
   `review_credits_manage`) oluşturulmuş, `20260717130000` migration'ında
   RLS'i güncellenmiş, ama `src/` altında hiçbir `.js`/`.jsx` dosyası bu
   tablodan `select`/`insert`/`update` yapmıyor — sadece **yorumlar**
   ondan bahsediyor ("review_credits artık kullanılmıyor",
   `supabaseProvider.js` satır 976; "review_credits tablosuna
   dokunulmuyor, geçmiş dönemlerin sayıları kalsın diye",
   `20260718160000_ciro_musterileri.sql` satır 16). **Muhtemelen ölü ama
   veri saklama amacıyla bilerek DROP edilmemiş** — DOĞRULANMADI tabloda
   hâlâ satır var mı.

2. **`broker_notes` — hiç var olmamış tablo, sadece TODO** —
   `supabaseProvider.js` satır 838 ve `mockProvider.js`/`mockTakip.js`
   yorumlarında bahsi geçiyor ("broker_notes GERÇEKTEN bir tabloya
   bağlanabilir ama bu PART'ta ayrı bir migration gerektirdiği için
   kapsam dışı bırakıldı; TODO olarak işaretli, hâlâ mock'tan okunuyor").
   Bu bir "ölü kod" değil, **hiç doğmamış özellik** — `takip` objesi hâlâ
   `mockProvider.js`'ten export ediliyor (satır 839:
   `export { takip } from './mockProvider'`), yani **Takip modülünün bir
   kısmı (broker notları) production'da bile gerçek veriyle değil, mock
   veriyle çalışıyor olabilir** — bu ciddi bir bulgu, DOĞRULANMADI ama
   kod satırı net.

3. **Kullanılmayan migration kolonları** — bu denetimde her migration
   kolonunun her `.js` dosyasında select/patch edilip edilmediğinin
   tam çapraz taraması yapılmadı (77 migration dosyası, 1334 satırlık
   provider) — DOĞRULANMADI, daha derin bir tarama gerektirir. Tek
   somut örnek yukarıdaki `review_credits` (tüm tablo, tek tek kolon
   değil).

4. Component/export seviyesinde "1 tanım + 0 kullanım" taraması bu
   denetim kapsamında dosya dosya yapılmadı (163+ dosya, zaman kısıtı) —
   DOĞRULANMADI, ayrı bir `grep -c` çaprazlaması önerilir (her
   `components/**/*.jsx` export'u için `grep -rn "ComponentAdı" src`
   ile referans sayımı).

---

## 10. Teknik Borç

`AI_NOTLARI.md`'nin 2026-08-04 tarihli girişleri (63-341. satırlar ve
sonrası, toplam dosya 2004 satır) tek bir günde en az 6 ayrı broker
talebi/düzeltmesi kaydediyor — bu, `CLAUDE.md`'deki "Broker'ın tekrar
tekrar 'şunu da ekle', 'bunu da unuttun' demesi istenmiyor" kuralının
pratikte hâlâ zorlandığının işareti. Somut borç kalemleri:

1. **JS/RLS senkron riski, yapısal bir kalıp olarak tekrarlanıyor**
   (Bölüm 3 ve 7) — bu tek seferlik bir hata değil, mimarinin doğası
   (iki bağımsız katman, elle senkron). Otomatik bir test/CI adımı
   (ör. RLS politikalarını da test ortamında çalıştıran bir entegrasyon
   testi) bulunamadı — `opportunities.test.js` gibi testler RLS
   *kuralını simüle ediyor*, gerçek Postgres RLS'ini çalıştırmıyor
   (DOĞRULANMADI test dosyası detaylı okunmadı, ama isimlendirme ve
   yorumlardan bu çıkarım yapıldı).
2. **Telefon formatlama mantığının iki dosyada elle senkron tutulması**
   (Bölüm 7, madde 1) — Deno Edge Function'ın "tek dosyada kendi kendine
   yeterli olması" gerekçesiyle bilinçli bir tercih, ama bakım riski
   açık ve yorumla itiraf edilmiş.
3. **`panel/` + `panel-app/dist/` iki kopyalı deploy modeli** (Bölüm 1.3)
   — otomasyon yok, elle "sil ve kopyala" adımına bağlı; CI/CD pipeline'ı
   bulunamadı.
4. **`takip.js`'in bir kısmının hâlâ mock veriden okunması**
   (`export { takip } from './mockProvider'`, Bölüm 9 madde 2) —
   production'da bu modülün "broker notları" kısmının gerçek veri mi
   mock veri mi döndürdüğü bu kod satırından açıkça mock olduğu
   anlaşılıyor; UI'da bunun kullanıcıya nasıl yansıdığı (sabit/placeholder
   metin mi) DOĞRULANMADI.
5. **Kampanya kodu tahmini kırılgan** — `meta-leads-webhook`'taki
   `extractKampanyaKodu()` sadece kampanya adı `RECRUIT`/`SATICI`/`MARKA`
   önekiyle başlıyorsa kod çıkarıyor, "uydurmuyoruz" diye bilinçli
   sınırlandırılmış (satır 96-98) — ama pratikte "çoğu zaman
   kod öneki yok" notu var (satır 170-174), yani reklamların önemli bir
   kısmı `kampanyaKodu=null` ile geliyor ve broker elle Recruiting/Portföy
   ayrımı yapmak zorunda kalıyor; otomasyon kısmi.
6. **Aynı gün içinde tekrarlayan "kaydeden görünmesin" / "üstlenen ismi
   görünmüyor" gibi ince görünürlük hataları** (AI_NOTLARI 2026-08-04
   girişleri) — `OpportunityDetailModal.jsx`'te birkaç kez peş peşe
   düzeltilen koşullu render mantığı (`isOwnerOrManager`,
   `alreadyInterested`), modülün görünürlük kurallarının component
   içinde dağınık if-else'ler yerine merkezi bir yerde (ör.
   `lib/opportunities.js`'te tek bir "hangi alan kime görünür" fonksiyonu)
   toplanmadığının işareti — her yeni broker isteği ayrı bir satırlık
   patch olarak ekleniyor.
7. **Sabit kodlanmış zaman pencereleri ve büyüklükler** — çağrı kaydı
   düzenleme penceresi (7 gün, Bölüm 8.4), profil yükleme retry gecikmesi
   (700ms, `AuthContext.jsx` satır 92), audit log limiti (200 satır,
   `supabaseProvider.js` satır 1245), webhook hata limiti (100 satır,
   satır 1267) — hepsi kod içinde magic number olarak duruyor, merkezi
   bir config dosyası yok.
8. **`TODO`/`FIXME` grep sonucu tek bir açık madde döndürdü** (broker_notes,
   Bölüm 9) — bu düşük sayı, borcun az olduğu anlamına gelmiyor; bu
   projede teknik borç TODO yorumlarıyla değil, **anlatı biçiminde
   AI_NOTLARI.md günlüğünde** tutuluyor (2004 satır) — yapısal olarak
   standart dışı ama fiilen çalışan bir "değişiklik geçmişi" mekanizması.

---

## 11. Yapılandırma (Ortam Değişkenleri)

Sadece **değişken adları** — hiçbir değer bu belgede yazılmamıştır.

| Değişken | İşlevi | Kaynak dosya |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase proje URL'i | `src/lib/supabaseClient.js` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) API anahtarı | `src/lib/supabaseClient.js` |
| `VITE_VAPID_PUBLIC_KEY` | Web Push VAPID public key (tarayıcıya güvenle gömülebilir) | `src/lib/push.js` |
| `VITE_DATA_SOURCE` | `mock` \| `supabase` — hangi dataProvider'ın kullanılacağını seçer; production build'de her zaman `supabase` (bkz. Bölüm 1.4) | `src/lib/env.js` |

Edge Function secret'ları (frontend env değişkeni DEĞİL, Supabase
Dashboard → Edge Functions → Secrets üzerinden tutuluyor, koddan sadece
isim olarak görülebiliyor):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — tüm Edge Function'larda ortak
- `TELSAM_WEBHOOK_KEY` — telsam-webhook
- `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN`, `META_GRAPH_API_VERSION` (opsiyonel) — meta-leads-webhook

`.env.example` dosyasında açık uyarı var: "ASLA buraya service_role key
veya veritabanı şifresi YAZMA" — bu kural bu denetimde de aynen
uygulandı.

---

## 12. Hata Görünürlüğü

- **`console.error`/`console.log`/`console.warn` kullanımı çok sınırlı**:
  grep taramasında `src/` altında sadece **1 dosyada** (`src/lib/errors.js`)
  bulundu — yani bu portalda hata görünürlüğü stratejisi bilinçli olarak
  "konsola yazma, kullanıcıya toast göster" yönünde kurulmuş.
- **`showToast(...)` kullanımı 117 yerde** tespit edildi (`.jsx`
  dosyalarında) — bu, hataların (ve başarı mesajlarının) sistematik
  olarak `ToastContext` üzerinden kullanıcıya gösterildiğini doğruluyor.
- **`mapSupabaseError` / `lib/errors.js`** — Supabase'in ham hata
  nesnelerini (`ApiError`, `kind` alanlı: `not_found`, `in_use` vb.)
  kullanıcı dostu mesajlara çeviren merkezi bir katman var; `AuthContext.jsx`
  bu mekanizmayı `not_found` (PGRST116) özel durumunda retry tetiklemek
  için de kullanıyor (Bölüm 3.1).
- **Sessizce yutulan catch bloğu — TESPİT EDİLDİ**: `src/pages/Rehber.jsx`
  satır 129:
  ```js
  docVersions.filter((v) => v.url && v.url !== '#').map((v) => deleteDocFile(v.url).catch(() => {}))
  ```
  Bir dokümanın eski dosya versiyonları Storage'dan silinirken, silme
  başarısız olursa **hiçbir yere loglanmıyor, kullanıcıya da
  gösterilmiyor** — sessizce yutuluyor. Muhtemelen bilinçli bir tercih
  (DB kaydı zaten `ON DELETE CASCADE` ile silindiği için, Storage'daki
  "yetim" dosya kritik değil — Bölüm 8'deki `docs.remove()` yorumuyla
  tutarlı) ama **hiçbir iz bırakmaması** ileride "Storage'da neden hâlâ
  eski dosyalar var" sorusuna cevap bulmayı zorlaştırır.
- **Meta webhook hataları** özel bir kalıcı log tablosuna
  (`meta_webhook_errors`) yazılıyor, kullanıcıya (broker/owner) Ayarlar
  ekranından gösteriliyor — bu, portaldaki **en olgun** hata görünürlüğü
  örneği (Bölüm 6).
- **Telsam webhook hataları** hiçbir yere kalıcı loglanmıyor, sadece HTTP
  response'ta dönüyor (Bölüm 6) — Meta'nınkiyle karşılaştırıldığında daha
  az olgun.
- **RLS reddi sessiz olabilir** — `opportunities.remove()` yorumunda
  açıkça belirtiliyor (satır 178-181): "RLS izni engellerse PostgREST
  hata FIRLATMAZ, sessizce 0 satır siler" — bu yüzden kod, dönen satır
  sayısını manuel kontrol edip kendi hatasını fırlatıyor
  (`calendarEvents.remove()`'da da aynı desen var, satır 359-364). Bu,
  RLS'in "sessiz başarısızlık" davranışına karşı **bilinçli bir savunma**
  — ama bu deseni uygulamayan başka `delete()` çağrısı olup olmadığı bu
  denetimde tek tek doğrulanmadı (DOĞRULANMADI).

---

## Ek: Denetim Kapsamı Dışında Kalanlar (açıkça belirtilmesi gereken sınırlar)

- Canlı Supabase veritabanına hiçbir sorgu atılmadı — tüm şema bilgisi
  migration dosyalarından ve `supabaseProvider.js`'teki
  select/insert/update çağrılarından **statik olarak** çıkarıldı.
- 10 Edge Function'dan sadece 2'sinin (`telsam-webhook`,
  `meta-leads-webhook`) tam içeriği okundu; `telsam-cdr-sync` ve
  `notify-*` dörtlüsü (4 fonksiyon) bu denetimde detaylı incelenmedi.
- `Panel.jsx` (1179+ satır), `Takvim.jsx`/`TakvimTab.jsx`, `Recruiting.jsx`,
  `Takip.jsx` gibi büyük sayfa dosyalarının tam içeriği satır satır
  okunmadı — Bölüm 2'deki tablo verileri kısmen `supabaseProvider.js`
  modül isimlerinden ve dosya başı yorumlarından çıkarıldı.
- 77 migration dosyasının tamamı tek tek açılıp okunmadı; kronolojik
  liste (`ls`) ve hedefli `grep` (RLS/trigger/anahtar kelime) ile
  taranıp örnekleme yapıldı. Şemanın **son hali** iddia edilen her
  noktada mümkün olduğunca `supabaseProvider.js` (en güncel gerçek
  kullanım) ile çapraz kontrol edildi.
- Ölü kod taraması (Bölüm 9) kapsamlı bir "her export için referans
  sayımı" değil, hedefli örnekleme oldu.
