# PART-5A — Supabase'e Hazırlık: Rapor

Tarih: 15 Temmuz 2026

Bu rapor, PART-5'in senin isteğinle ikiye bölünen ilk fazını (PART-5A —
"Supabase'e Hazırlık") kapatıyor. Kural gereği: aşağıda **"tamamlandı"**
yazan her madde local ortamda gerçek Postgres'e karşı veya gerçek build/lint
çalıştırılarak doğrulandı — hiçbiri sadece "kod yazıldı, çalışır olmalı"
varsayımına dayanmıyor. Auth/RLS/Storage'ın **canlı Supabase'de** çalıştığı
iddia edilmiyor, çünkü henüz canlı bir proje yok; bu PART-5B'nin konusu.

Önce dürüst bir not: Bu oturum sırasında bir dosya sistemi kilidini aşmaya
çalışırken (macOS senkronizasyon kaynaklı "Resource deadlock avoided" hatası)
15 dosyayı yanlışlıkla sildim. 4'ünü git geçmişinden, 11'ini ise bu
konuşmada yazdığım içerikten harfiyen yeniden oluşturdum. Hepsini tekrar
lint/build/test'ten geçirdim. Bunu burada belirtmemin sebebi: "sessizce
düzeltip geç" yerine ne olduğunu bilmen gerektiğini düşünmem.

---

## 1) Tamamlanan Hazırlıklar

- **Supabase istemci mimarisi**: `src/lib/env.js` (tek env okuma noktası),
  `src/lib/supabaseClient.js` (tembel/lazy singleton, `MissingSupabaseConfigError`).
  Production build'de `USE_SUPABASE` her zaman `true` zorlanıyor — geliştirici
  yanlışlıkla mock veriyle production build alamaz.
- **`.env.example`**: Gerekli değişkenler dokümante edildi, service_role/DB
  şifresi asla eklenmeyeceği açıkça yazıldı. `.env*` `.gitignore`'a eklendi.
- **Mock/Supabase adapter mimarisi** (`src/lib/dataProvider/`): `mockProvider.js`
  ve `supabaseProvider.js` birebir aynı arayüzü paylaşıyor (opportunities,
  calendarEvents, education, callLogs, docs, takip, league, users).
  Sayfalar hangi sağlayıcının aktif olduğunu bilmiyor.
- **Gizlilik mimarisi (network seviyesinde)**: `opportunities.list()` artık
  `lead_ad`/`lead_telefon` alanlarını **hiç seçmiyor** — ne mock modda ne
  Supabase modunda bu alanlar liste response'unda yer alıyor. Gerçek isim/
  telefon sadece detay modalı açıldığında, `getContact()` üzerinden (Supabase
  modunda `get_opportunity_contact()` RPC'si ile, sunucu tarafı yetki
  kontrolüyle) geliyor.
- **Auth akışı**: `AuthContext.jsx` artık iki moda ayrıldı — mock modda eski
  dev rol seçici davranışı korunuyor; gerçek modda `signInWithPassword`,
  `onAuthStateChange`, `getSession`, `signOut` ile tam bir oturum döngüsü var.
  `durum != 'aktif'` olan kullanıcı profil çekilirken tespit edilip
  otomatik `signOut` ediliyor (gerçek erişim engeli RLS'te, bu sadece UX).
- **`/login` sayfası ve `ProtectedRoute`**: Mock modda pas geçiliyor, gerçek
  modda oturum yoksa `/login`'e yönlendiriyor, `loading` sırasında bekletiyor.
- **Dev rol değiştirici gate'lendi**: `isMock && import.meta.env.DEV` koşulu
  — `import.meta.env.DEV` Vite tarafından production build'de sabit `false`e
  çevrilip dead-code elimination ile DOM'dan tamamen çıkarılıyor (build
  çıktısı kontrol edildi, production paketi 705 KB — rol seçici JSX'i
  içermiyor).
- **`durum='aktif'` RLS/SECURITY DEFINER düzeltmesi** (migration
  `20260715120000_active_user_enforcement.sql`): 18 policy + 2 RPC fonksiyonu
  düzeltildi. **Gerçek Postgres'e karşı test edildi** (embedded-postgres):
  aktif kullanıcı 5 kullanıcı + 3 fırsat görüyor; `durum='pasif'` yapıldıktan
  sonra 15 tablonun tamamı 0 satır dönüyor; `claim_opportunity()` RPC'si
  pasif kullanıcı için "Hesabın pasif durumda..." hatasıyla reddediyor.
  Bu test yolda **gerçek bir bug** da yakaladı ve düzeltti: `calendar_events`
  ile `event_attendance` policy'leri birbirini çapraz sorguluyordu, gerçek
  sorguda "infinite recursion detected in policy" hatası veriyordu (init_schema.sql'den
  beri var olan, daha önce hiç tetiklenmemiş bir hata) — `is_invited_to_event()`
  / `is_event_creator()` SECURITY DEFINER yardımcı fonksiyonlarıyla çözüldü.
- **Storage bucket kodu**: `docs` bucket'ı (private, 20MB, mime allowlist),
  4 RLS policy'si, `src/lib/storage.js` (upload/signed URL/silme/validasyon).
  **Yerel olarak test edilemedi** — `storage.*` şemaları sadece gerçek
  Supabase projesinde var, vanilla Postgres'te yok. PART-5B'de ilk
  uygulanacak ve gerçek test edilecek migration bu.
- **Hata yönetimi**: `src/lib/errors.js` — hiçbir Supabase/Postgres hatası
  ham haliyle kullanıcıya gösterilmiyor, 9 kategoriye (network/timeout/
  session_expired/forbidden/not_found/conflict/validation/storage/server)
  ayrılıp Türkçe, güvenli mesajlara çevriliyor. Teknik detay sadece dev
  konsoluna, kullanıcı verisi içermeden loglanıyor.
- **Fırsatlar modülü uçtan uca bağlandı** (referans implementasyon):
  `list/create/claim/getContact` artık `dataProvider` üzerinden, `useAsyncList`
  hook'uyla loading/error state'leri, `ErrorState`'te "Tekrar Dene" butonu.
  `OpportunityDetailModal` artık `opp.leadAd`'a güvenmiyor, ayrı bir
  `fetchContact` çağrısıyla veriyi istiyor.
- **Kullanıcı ismi çözümleme**: `UsersContext` — `dataProvider.users.listKnown()`
  üzerinden, mock/gerçek modda aynı şekilde çalışıyor.
- **Otomatik test altyapısı (vitest)**: `vitest.config.js` kuruldu, 3 test
  dosyasında **33 gerçek unit test** yazıldı ve hepsi geçiyor:
  `canViewOpportunity`/`canRevealContact`/`canClaim` (RLS'in istemci
  aynası — gizlilik kuralının UI'da doğru uygulandığını doğruluyor),
  `mapSupabaseError` (hiçbir ham hata mesajının sızmadığını doğruluyor),
  `normalizeFilename`/`validateFile`/`buildStoragePath` (path traversal,
  dosya boyutu/tipi kontrolü).
- **Seed idempotency**: `seed.sql` artık birden fazla kez çalıştırılabilir.
  Önceden `opportunities`, `calendar_events`, `education_modules`, `badges`,
  `onboarding_checklist_items`, `call_logs`, `score_entries`, `docs`,
  `doc_versions` için doğal bir tekrar-koruması yoktu (gerçek bug — ikinci
  çalıştırma satırları çoğaltıyordu). **Gerçek Postgres'e karşı 3 kez art
  arda çalıştırılarak doğrulandı**: satır sayıları 3 çalıştırma boyunca
  birebir aynı kaldı (users:5, opportunities:3, calendar_events:2, vb.).
- **Migration/Rollback dokümantasyonu**: `supabase/ROLLBACK.md` — 4
  migration'ın her biri için ne yaptığı, geri alınıp alınamayacağı ve geri
  alma SQL'i.
- **Lint/build doğrulandı**: `npm run lint` → 0 hata (4 uyarı, hepsi
  önceden var olan bir kod stili deseniyle aynı — `ToastContext.jsx`'te de
  zaten vardı, yeni bir regresyon değil). `npm run build` → başarılı,
  705 KB production paketi üretti.
- **Yerel commit**: Tüm değişiklikler `70927b9` commit'ine eklendi
  (mesaj: "PART-5A: Supabase entegrasyonuna hazırlık...").

---

## 2) Canlı Supabase Bekleyen Maddeler

Aşağıdakilerin HİÇBİRİ şu an "çalışıyor" olarak iddia edilmiyor — kod hazır,
ama canlı bir Supabase projesi olmadan gerçek doğrulama imkansız:

- Gerçek `signInWithPassword` akışı (şu an sadece kod incelemesiyle doğru
  görünüyor, gerçek bir auth sunucusuna karşı hiç çalıştırılmadı).
- `onAuthStateChange` ile oturum yenileme/çoklu sekme senkronizasyonu.
- RLS policy'lerinin gerçek Supabase Postgres üzerinde (embedded-postgres
  değil) aynı şekilde davrandığı — çok yüksek ihtimalle evet, ama Supabase'in
  kendi `auth.uid()`/JWT claim mekanizması embedded-postgres stub'ından
  farklı olabilir.
- Storage bucket + signed URL akışının tamamı (upload, indirme, silme).
- `get_opportunity_contact()` ve `claim_opportunity()` RPC'lerinin gerçek
  bir JWT ile çağrılması.
- Gerçek ağ hatası senaryoları (timeout, 401 refresh, RLS reddi) — şu an
  `mapSupabaseError` sadece sentetik test verisiyle test edildi.
- Diğer 6 modülün (Takvim, Operasyon, Eğitim, Rehber, Takip, Lig)
  `dataProvider` mimarisine bağlanması — **bilinçli bir kapsam kararı**:
  bu PART'ta sadece Fırsatlar referans implementasyon olarak tam bağlandı.
  Diğer sayfalar hâlâ eski `lib/api.js` + doğrudan mock import desenini
  kullanıyor. Karşılık gelen `mockProvider`/`supabaseProvider` fonksiyonları
  ZATEN yazıldı ve hazır — sadece sayfa tarafında bağlanmadı.

---

## 3) Supabase Projesi Açıldığında Uygulanacak Adım Adım Kurulum

1. [supabase.com](https://supabase.com) üzerinde yeni proje oluştur (bölge:
   tercihen Frankfurt/eu-central, Türkiye'ye en yakın).
2. Proje ayarlarından `Project URL` ve `anon public` anahtarını al —
   **`service_role` anahtarını hiçbir yere kopyalama.**
3. Yerel `.env` dosyasını `.env.example`'dan kopyala, gerçek değerleri gir
   (bkz. Bölüm 4).
4. Supabase CLI kur (`npm install -g supabase`), `supabase login`,
   `supabase link --project-ref <proje-ref>`.
5. Migration'ları SIRAYLA uygula (bkz. Bölüm 5) — `supabase db push` ya da
   her dosyayı SQL Editor'de elle çalıştır.
6. `supabase/seed/seed.sql`'i SADECE dev/test projesinde çalıştır (5 dev
   kullanıcı + dev şifresi `[REDACTED]` oluşturuyor — production'da ASLA).
7. Authentication → Providers'ta Email/Password'ün açık olduğunu doğrula.
8. Authentication → Email Templates'te (opsiyonel) davet/şifre sıfırlama
   metinlerini Türkçeleştir.
9. Storage → `docs` bucket'ının migration ile doğru oluştuğunu, `Public`
   olarak İŞARETLİ OLMADIĞINI kontrol et.
10. `VITE_DATA_SOURCE=supabase` ile `npm run dev` başlat, `/login`'den
    seed'deki bir kullanıcıyla giriş yap.
11. Bölüm 7'deki canlı doğrulama checklist'ini role role çalıştır.
12. Sonuçları bu raporun devamına (PART-5B raporu olarak) ekle — sadece o
    zaman "Auth çalışıyor" / "RLS güvenli" denebilir.

---

## 4) Gerekli Environment Değişkenleri

```
VITE_SUPABASE_URL=https://<proje-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_DATA_SOURCE=supabase
```

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: Supabase proje ayarlarından
  (Settings → API).
- `VITE_DATA_SOURCE`: sadece development'ta etkili; `mock` (varsayılan) veya
  `supabase`. Production build'de zaten otomatik `supabase` zorlanıyor, bu
  değişken production'da hiç okunmuyor.
- **Asla eklenmeyecekler**: `SUPABASE_SERVICE_ROLE_KEY`, veritabanı şifresi,
  JWT secret. Bunlardan hiçbiri frontend koduna veya `.env`'e girmemeli.

---

## 5) Çalıştırılacak Migration Sırası

1. `20260715072704_init_schema.sql` — temel şema (tablolar, enum'lar, RLS,
   `current_user_role()`/`is_manager()`, `claim_opportunity()`,
   `get_opportunity_contact()`).
2. `20260715091035_attendance_status_extra_values.sql` — `attendance_status`
   enum'ına `gec`/`mazeretli` değerleri.
3. `20260715120000_active_user_enforcement.sql` — `is_active()` zorunluluğu,
   RLS recursion düzeltmesi. **Yerel Postgres'te test edildi.**
4. `20260715130000_storage_docs_bucket.sql` — Storage bucket + policy'ler.
   **Yerel test edilemedi, PART-5B'de canlıda ilk test burada yapılmalı.**

Ardından (sadece dev/test projesinde): `supabase/seed/seed.sql`.

---

## 6) Test Kullanıcıları ve Rol Matrisi

`seed.sql` çalıştırıldığında oluşan 5 kullanıcı (hepsi `[REDACTED]` şifresiyle — gerçek değer için `seed.sql` dosyasına bakın, sadece dev/test ortamında kullanılır):

| E-posta | Rol | Amaç |
|---|---|---|
| broker@lavanda.dev | broker | Tam yönetici — tüm veriye erişim, rol/pasif yönetimi |
| owner@lavanda.dev | owner | Broker ile aynı erişim seviyesi (RLS'te birlikte "manager") |
| ofis@lavanda.dev | ofis | Veri girişi yapar (fırsat/çağrı ekler), kendi girdiklerini + sahipsiz açık kayıtları görür |
| danisman1@lavanda.dev | danisman | Sadece kendi sahiplendiği/üstlendiği + sahipsiz açık kayıtları görür |
| danisman2@lavanda.dev | danisman | Aynı danisman kısıtları, çapraz görünürlük testi için ikinci danışman |

Canlı doğrulamada mutlaka test edilmesi gerekenler: danisman1'in
danisman2'nin claim ettiği bir fırsatı **göremediği**, ofis'in başka bir
danışmanın müşteri telefonunu **göremediği**, broker/owner'ın her şeyi
gördüğü, bir kullanıcı `durum='pasif'` yapıldığında **hiçbir tablodan** veri
alamadığı.

---

## 7) Canlı Doğrulama Checklist'i (PART-5B'de çalıştırılacak)

**Auth**
- [ ] Doğru email/şifre ile giriş başarılı, `/panel`'e yönlendiriyor
- [ ] Yanlış şifre ile giriş `mapSupabaseError` üzerinden Türkçe hata veriyor
- [ ] Çıkış yap, oturum gerçekten kapanıyor (sayfa yenilenince `/login`'e düşüyor)
- [ ] `durum='pasif'` yapılan kullanıcı bir sonraki istekte otomatik çıkış yapıyor

**RLS — her rol için ayrı test**
- [ ] danisman1: sadece kendi + sahipsiz açık fırsatları görüyor
- [ ] danisman1: danisman2'nin claim ettiği fırsatı listede GÖRMÜYOR
- [ ] danisman1: kendi sahiplenmediği bir fırsatın detayında isim/telefon GÖRMÜYOR
- [ ] ofis: fırsat oluşturabiliyor, broker/owner'ın tümünü görebiliyor
- [ ] broker/owner: tüm modüllerde tüm veriyi görüyor

**RPC**
- [ ] `claim_opportunity()`: açık bir fırsat başarıyla üstlenilebiliyor
- [ ] `claim_opportunity()`: zaten claim edilmiş fırsat ikinci kez denenince anlaşılır hata veriyor
- [ ] `get_opportunity_contact()`: yetkisiz kullanıcı için `null` dönüyor, network response'unda isim/telefon YOK (DevTools → Network sekmesinden kontrol)

**Storage**
- [ ] `docs` bucket'ı public DEĞİL (doğrudan URL ile erişim reddediliyor)
- [ ] broker/ofis dosya yükleyebiliyor, danışman yükleyemiyor
- [ ] signed URL süresi doluyor, süresi dolmuş linkle erişim reddediliyor

**Genel**
- [ ] Network sekmesinde hiçbir response'ta ham Postgres/Supabase hata mesajı yok
- [ ] Console'da kullanıcı verisi (isim/telefon/e-posta) loglanmıyor
- [ ] Production build'de dev rol seçici DOM'da yok (View Source / React DevTools ile kontrol)

---

## 8) Açık Riskler

- **En büyük risk**: Bu raporun 1. bölümündeki her şey embedded-postgres
  üzerinde test edildi, gerçek Supabase'de değil. Supabase'in kendi
  `auth.uid()`/JWT/connection pooling katmanı farklı davranabilir —
  PART-5B'nin canlı doğrulaması atlanmadan hiçbir güvenlik iddiası
  kesinleşmemeli.
- **6 modül henüz bağlı değil**: Takvim/Operasyon/Eğitim/Rehber/Takip/Lig
  hâlâ eski mock-only `lib/api.js` deseninde. Bu sayfalar şu an gerçek
  Supabase verisiyle ÇALIŞMAZ (mock veriye bakmaya devam eder) —
  `USE_SUPABASE=true` olsa bile. Production'a çıkmadan önce bunların da
  bağlanması gerekiyor.
- **Storage migration'ı hiç çalıştırılmadı**: SQL sözdizimi doğru görünüyor
  ama Supabase Storage'a özgü davranışlar (RLS + bucket etkileşimi) canlıda
  ilk kez test edilecek.
- **GitHub'a push edilmedi**: Bu oturumdaki değişiklikler `/Users/AHMETERDEMIR/Desktop/portal`
  klasöründe yerel olarak commit edildi (`70927b9`), ama bu repoda tanımlı
  bir GitHub remote'u yok ve bende push için kullanılabilecek bir kimlik
  bilgisi/token yok. Değişiklikleri GitHub'a göndermek için ya bana repo
  URL'i + erişim ver, ya da kendi terminalinden `git remote add origin <url>`
  + `git push` çalıştır.
- **Dosya kaybı olayı**: Bu oturumda 15 dosya yanlışlıkla silindi ve yeniden
  yazıldı (bkz. rapor girişi). Hepsi lint/build/test'ten geçti ve mantıksal
  olarak orijinal tasarımla birebir aynı olacak şekilde yeniden oluşturuldu,
  ama "birebir aynı byte'lar" garantisi veremem — küçük bir formatlama
  farkı olabilir. Riski azaltmak istersen bu dosyaları gözden geçirebilirsin:
  `App.jsx`, `AuthContext.jsx`, `ProfileMenu.jsx`, `Firsatlar.jsx` (git
  geçmişinden kısmen kurtarılabilirdi ama yeniden yazmayı tercih ettim).
- **Seed script'i production'da asla çalıştırılmamalı** — `auth.users`'a
  doğrudan satır ekliyor, dev şifresi sabit ve `seed.sql` dosyasında açık
  yazılı (bu raporda `[REDACTED]`).
- **pgcrypto/telefon şifreleme henüz yok** — PART-5 spesifikasyonunda
  "şimdilik kurma" denildiği için bilerek atlandı; telefon numaraları
  düz metin olarak saklanıyor, sadece erişim kontrolü (RLS + RPC) var.

---

**Production Ready yüzdesi bu raporda YÜKSELTİLMEDİ** — PART-4 sonunda
verilen değer, canlı doğrulama yapılmadan değişmeyecek. PART-5B'nin
sonunda, yukarıdaki checklist gerçekten çalıştırıldıktan sonra güncellenmeli.
