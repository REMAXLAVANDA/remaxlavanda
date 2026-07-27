# AI Notları

Bu dosya, AI asistan (Claude) tarafından yapılan yapısal değişikliklerin kısa
bir günlüğüdür — brief'lerdeki "değişiklikleri buraya işle" kuralı gereği.

## 2026-07-27 — Meta Lead Ads webhook: Kampanya/Reklam Seti/Reklam adı birleşik kaydediliyor

Çok sayıda farklı isimlendirilmiş kampanya açıldığı için `RECRUIT_.../
SATICI_.../MARKA_...` öneki kuralına güvenmek yerine (kullanıcı: "az işlev,
basit seçenek" istedi — isimlendirme kuralı hatırlamak istemiyor),
`fetchAdInfo` artık `adset{name}` alanını da çekiyor ve `reklam_adi`
kolonuna **"Kampanya Adı / Reklam Seti Adı / Reklam Adı"** formatında
birleşik metin yazıyor. `kampanya_kodu` (RECRUIT/SATICI/MARKA) çıkarımı
hâlâ dursun diye bırakıldı (eşleşirse `tip` otomatik doğru gelir, zararsız)
ama artık tek güvenilir yol değil — broker Lead Havuzu'nda birleşik ad/
reklam bilgisine bakıp Recruiting/Portföy'ü elle seçiyor.

## 2026-07-27 — Meta Lead Ads webhook: gerçek lead teslimatı çalışmıyordu, 3 ayrı kök sebep bulundu ve düzeltildi

Bir gerçek Meta lead'i ("Erdem", Recruiting, 27.07 13:37) portala hiç
düşmedi. Önceki turda (26.07) "mekanik taraf doğru çalışıyor" denip
bırakılan "Testing Tool'un test lead'i webhook'a ulaşmıyor" bulgusu
aslında gerçek lead'lerin de kaybolduğu asıl sorunun belirtisiymiş. Üç
BAĞIMSIZ kök sebep vardı, üçü de aynı anda düzeltilmeden hiçbiri tek
başına yeterli olmuyordu:

1. **Sayfa, App'e hiç abone değildi.** App Dashboard'daki "Webhooks"
   ekranı (Callback URL/Verify Token/leadgen toggle) App'in NEYİ
   alabileceğini ayarlıyor — ama hedef Sayfa'nın o App'e abone olması
   için AYRICA `POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`
   çağrısı yapılması gerekiyor. Bu adım (ilk kurulumda "adım 8" olarak
   yazılmıştı) hiç yapılmamış — `GET /{page-id}/subscribed_apps` boş
   `data: []` dönüyordu. Graph API Explorer'dan POST edilerek düzeltildi.
2. **Lead Access Manager'da CRM'imize erişim verilmemişti.** Bu,
   `subscribed_apps`'ten TAMAMEN AYRI bir izin katmanı — Meta Business
   Suite > Ayarlar > Entegrasyonlar > Potansiyel Müşteri Bilgileri
   Erişimi > CRM'ler sekmesi. Lead Ads Testing Tool'un "Track status"
   özelliği hatayı açıkça gösterdi: *"CRM access has been revoked from
   Lead Access Manager"*. "CRM'ler Ata" ile App'imiz eklenerek çözüldü.
3. **Kayıtlı `META_PAGE_ACCESS_TOKEN` geçersiz hale gelmişti**
   (`Error validating access token: The session is invalid because the
   user logged out`, subcode 467) — muhtemelen kişisel oturuma bağlı bir
   türetmeydi. System User'dan yeni, süresiz bir token üretilip
   (`GET /{page-id}?fields=access_token` ile Page token'a çevrilip)
   secret güncellenerek düzeltildi.

**Teşhis yöntemi önemli:** Lead Ads Testing Tool'daki "Track status"
butonu (Create lead'in hemen altında) gerçek zamanlı teslimat durumunu
ve HATA MESAJINI gösteriyor — önceki turda bu özellik fark edilmemişti,
sadece Supabase Invocations/leads tablosuna bakılıyordu. Bir sonraki
webhook sorununda önce buraya bakılmalı.

Üçü de düzeltildikten sonra "Create lead" ile uçtan uca doğrulandı:
Testing Tool → Track status "Success" → Supabase Invocations'da 200 POST
→ `leads` tablosunda satır → Lead Havuzu UI'ında görünür. Kayıp "Erdem"
lead'i kullanıcı onayıyla elle SQL ile eklendi (`meta_lead_id` NULL,
`aciklama`'da not düşüldü), test lead'i silindi.

## 2026-07-26 — Lead Havuzu: elle "+ Yeni Lead" ekleme kaldırıldı

Meta webhook entegrasyonu canlıya alındıktan sonra elle lead ekleme
gereksiz hale geldi — lead'ler artık sadece Meta'dan otomatik geliyor.
`LeadFilters.jsx`'teki "+ Yeni Lead" butonu kaldırıldı, `Leads.jsx`'teki
`showModal` state'i ve `handleSave`'in "oluşturma" dalı silindi (artık
sadece güncelleme var, `editingLead` her zaman dolu geldiği için).
`LeadDetailModal.jsx` de buna göre sadeleşti: `lead` prop'u artık HER ZAMAN
dolu (null olabilme ihtimali kalktı) — `lead ? ... : 'Yeni Lead'` gibi
şartlı ifadeler ve dönüştürme butonunun `{lead && ...}` sargısı kaldırıldı.

**Değişmeyen:** Mevcut bir lead'e tıklayıp görüntüleme, durumu 'elendi'ye
çekme, Operasyon'a/Recruiting'e Gönder — hepsi aynen çalışıyor.
`lib/dataProvider`'daki `leads.create()` fonksiyonuna BİLEREK dokunulmadı
(provider seviyesinde genel bir CRUD metodu, zararsız duruyor) — sadece UI
tarafındaki tetikleyici kaldırıldı.

## 2026-07-26 — Meta Lead Ads webhook: Supabase deploy + Meta App kurulumu tamamlandı

Önceki notta yazılan `meta-leads-webhook` Edge Function'ı ve
`meta_webhook_errors` migration'ı bu turda gerçekten deploy edildi ve
kullanıcıyla birlikte adım adım Meta tarafı kuruldu:

- Migration çalıştırıldı, Edge Function Dashboard'un "Via Editor" yoluyla
  deploy edildi (Verify JWT kapatıldı — Meta Supabase auth header'ı
  göndermiyor).
- 3 secret girildi: `META_VERIFY_TOKEN` (bizim ürettiğimiz rastgele metin),
  `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`.
- **`META_PAGE_ACCESS_TOKEN` için Business Manager'da yeni bir System User**
  ("Lead Webhook Entegrasyonu", Admin erişimi, süresiz token) oluşturuldu —
  hem Facebook Sayfası hem App'in kendisi bu System User'a "varlık" olarak
  atanmak ZORUNDA (ikisi de ayrı ayrı, Business Settings > Kullanıcılar >
  Sistem kullanıcıları > Varlıklar Atayın) — App atanmadan token oluşturma
  adımında "Uygun izin yok" hatası alınıyordu. Token'ın kendisi System
  User'ın token'ı değil, `GET /{page-id}?fields=access_token` ile o
  token'dan TÜRETİLEN gerçek Page Access Token — ilk seferinde yanlışlıkla
  System User token'ı girilmişti, düzeltildi.
- Meta App önce sadece "Standard Access" (Ready for testing) izinleriyle
  kuruldu — App Review'a gerek kalmadı çünkü Sayfa/Reklam Hesabı zaten
  aynı doğrulanmış Business Portfolio'nun (Remax Lavanda) içinde.
- **Kritik bulgu:** App "Unpublished" durumdayken gerçek/test lead'ler
  webhook'a hiç ulaşmıyor — sadece Meta'nın kendi Dashboard'undaki
  "Webhooks > leadgen > Test" düğmesiyle gönderilen ÖRNEK veri ulaşıyor.
  Bunu App Settings'te Privacy Policy URL + Category doldurup **Publish**
  ederek çözdük.
- Uçtan uca doğrulama: Dashboard'un örnek `leadgen` payload'ı
  (`leadgen_id: 444444444444`, sahte) gönderildiğinde imza doğrulandı,
  Graph API'den veri çekilemedi (beklenen — sahte ID), `meta_webhook_errors`'a
  `graph_api_hatasi` olarak doğru loglandı, fonksiyon 200 döndü — mekanik
  tarafın tamamen doğru çalıştığı kanıtlandı.
- **Açık kalan tek nokta:** Lead Ads Testing Tool'un "Create lead" ile
  ürettiği test lead'i (App yayınlandıktan SONRA bile) webhook'a hiç
  ulaşmadı — bu aracın kendi güvenilirlik sorunu olabilir. Gerçek bir
  reklamdan gelecek gerçek bir lead ile ya da testing tool'u daha sonra
  tekrar deneyerek doğrulanmalı. Kod tarafında eksik/hatalı bir şey yok.
- Gerçek kampanyalar için üretim formu oluşturuldu: **"RE/MAX Lavanda -
  Başvuru Formu"** (Full name/Email/Phone number standart alanları,
  Türkçe karşılama/bitiş metinleri). Tek form hem Recruiting hem Portföy
  kampanyalarında kullanılacak — `tip` forma değil kampanya adına
  (`RECRUIT_.../SATICI_.../MARKA_...` öneki) bağlı olduğu için ayrı form
  gerekmiyor. Reklamı kim çıkaracaksa kampanya adının doğru önekle
  başlamasına dikkat etmeli, aksi halde `kampanya_kodu` boş kalır ve
  `tip` otomatik "portfoy"a düşer.

## 2026-07-26 — Meta Lead Ads webhook entegrasyonu (Edge Function, henüz deploy edilmedi)

`supabase/functions/meta-leads-webhook/index.ts` + `20260726190000_meta_webhook_hata_log.sql`
yazıldı, henüz Supabase'e deploy edilmedi / migration çalıştırılmadı — sıra
kullanıcının Meta panelinde App kurup gerekli izinleri alması ve secret'ları
(`META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN`) sağlamasında.

**Graph API sürümü:** `developers.facebook.com` doğrudan erişime kapalı
(403, bot koruması) — birden fazla ikincil kaynağı çapraz kontrol ederek
`v25.0` varsayımıyla ilerlendi, ama koda SABİT yazılmadı: `META_GRAPH_API_VERSION`
env var'ı (Dashboard secret) ile override edilebiliyor, verilmezse `v25.0`
fallback. Kullanıcı Meta App Dashboard'da gerçek güncel sürümü görünce
tek satır secret değişikliğiyle güncellenebilir, kod değişmez.

**Akış:** GET → `hub.challenge` doğrulaması. POST → `X-Hub-Signature-256`
(HMAC-SHA256, Web Crypto API) doğrulanır → `leadgen_id`'den Graph API'yle
`field_data` çekilir → Ad Soyad/Telefon/E-posta birden fazla bilinen alan adı
varyantıyla (standart İngilizce + Türkçe, case/aksan-duyarsız) eşleştirilir
— form alanlarının gerçek isimleri bilinmediği için (bkz. AI_NOTLARI eski
notu yok, bu ilk kurulum) esnek bırakıldı. Ad Soyad hiçbirine uymazsa
insert denenmez. `ad_id` üzerinden reklam adı + kampanya adı çekilir,
kampanya adının BAŞINDAKİ kod (`RECRUIT`/`SATICI`/`MARKA`, ardından
`_`/`-`/boşluk ayracı) ayıklanır — uymuyorsa `kampanya_kodu=NULL`,
uydurulmaz. `tip`: kod `RECRUIT` ise `recruiting`, aksi TÜM durumlarda
(SATICI/MARKA/NULL) `portfoy`. `telefon` alanı `src/lib/phone.js`
`formatPhoneInput` ile AYNI mantıkla (bilerek edge function içinde ayrı
yazıldı, telsam-webhook'taki normalizePhone ile aynı "self-contained
Edge Function" yaklaşımı) formatlanır — manuel girilen ve webhook'tan gelen
lead'ler aynı görünsün diye.

**Hata yönetimi — yeni `public.meta_webhook_errors` tablosu** (broker/owner
select, audit_log'dan BİLEREK ayrı: o kullanıcı aksiyonları için, bu sistem/
webhook kaynaklı): 4 tür — `imza_hatasi` (sahte/bozuk istek), `graph_api_hatasi`
(Meta'dan veri çekilemedi — token/izin/ağ sorunu), `alan_eslesmedi` (Ad Soyad
form cevaplarında bulunamadı), `insert_hatasi` (DB insert başarısız). Her
durumda ham payload kaydedilir, lead kaybolmaz. `meta_lead_id` zaten `unique`
olduğu için aynı `leadgen_id` tekrar gelirse (Meta retry) `ignoreDuplicates`
ile sessizce atlanır, hata sayılmaz. İmza doğrulaması başarısız olsa BİLE
Meta'ya her zaman 200 dönülür (brief'in açık talebi) — retry döngüsüne girip
webhook aboneliğinin Meta tarafından durdurulmasını önlemek için.

**Test:** Deno bu ortamda kurulamadı (deno.land kurulum script'i egress
politikasınca 403) — saf mantık fonksiyonları (`findFieldValue`,
`formatPhoneInput`, `extractKampanyaKodu`, `verifySignature`) Node'a
kopyalanıp 20 assertion'la doğrulandı (hepsi geçti), ayrıca dosyanın tamamı
`tsc --noEmit` ile (Deno global'leri için shim'lenerek) tip hatasız derlendi.
Gerçek Meta payload'ıyla uçtan uca test ancak Meta App onaylandıktan ve
gerçek bir lead formu doldurulduktan sonra mümkün.

## 2026-07-26 — Arşiv taşıması çalıştırıldı: 421 eski aday kaydı public.recruiting_candidates'a taşındı

`20260726160000_recruiting_arsiv_tasima.sql` kullanıcı onayıyla çalıştırıldı
(Kayıt Tipi filtresi önceden deploy edilip günlük görünüm korunduktan sonra
— bkz. bir alttaki not). Sonuç: `toplam_tasindi=421`,
`bilinen_oruntuyle_eslesti=418`, `hic_eslesmeyip_digere_dustu=3`. 3 eşleşmeyen
değer saat damgalı tarih string'leri (`"2026-03-04 00:00:00"` gibi) —
regex bare tarih formatını (`YYYY-MM-DD`) bekliyordu, saat kısmı yüzünden
"bilinen örüntü" olarak işaretlenmedi ama yine de doğru şekilde `diğer`'e
düştü, veri kaybı/hatası yok. `public.recruiting_candidates`'ta
`kayit_tipi='gecmis'` olan kayıt sayısı 421 olarak doğrulandı.

## 2026-07-26 — Recruiting listesi: arşiv kayıtları varsayılan görünümden gizlendi

Arşiv taşıma migration'ı (`20260726160000_recruiting_arsiv_tasima.sql`,
~421 kayıt) çalıştırılmadan ÖNCE, günlük görünümü kirletmesin diye hazırlık.

**Yeni "Kayıt Tipi" filtresi** (`lib/recruiting.js`
`RECRUITING_KAYIT_TIPI_FILTRELERI`/`matchesKayitTipiFilter`) — `Aktif`
(varsayılan, `kayitTipi in ('lead','manuel')`) | `Geçmiş`
(`kayitTipi==='gecmis'`) | `Tümü`. `pages/Recruiting.jsx`'in `visible`
listesi artık bu filtreyi de uyguluyor, `INITIAL_FILTERS.kayitTipi` `'aktif'`
— sayfa ilk açıldığında arşiv kayıtları hiç görünmüyor.

**Sayaç/uyarı çubuğu notu:** Recruiting sayfasında şu an (bu değişiklikten
önce de) ayrı bir sayaç/uyarı çubuğu YOK — `RecruitingTable`/
`RecruitingFilters` hiçbir toplam göstermiyor, `Panel.jsx` dashboard'unda da
recruiting aday sayısı yok. Yani "sayaçlar 'gecmis' saymasın" kuralı,
mevcut `visible` listesinin zaten varsayılan olarak filtrelenmesiyle
sağlanmış oluyor — ileride bir sayaç eklenirse `visible.length` (filtrelenmiş
liste) kullanılmalı, ham `candidates.length` değil.

## 2026-07-26 — Lead Havuzu yetki daraltma (sadece broker/owner) + "gönder" terminolojisi

Lead Havuzu artık sadece broker/owner erişebiliyor — ofis çıkarıldı (daha
önce Recruiting ile aynı üç rol grubunu paylaşıyordu). Recruiting'in
yetkisi DEĞİŞMEDİ (broker/owner/ofis).

**`canManageLeads`/`canManageRecruiting` ayrıştı** (`lib/roles.js`) —
`canManageRecruiting` artık `canManageLeads`'in takma adı değil, kendi
bağımsız fonksiyonu (broker/owner/ofis). `lib/recruiting.js`'in re-export'u
buna göre güncellendi. `lib/modules.js`'te `leads` modülü artık ayrı
`LEADS_ROLES = [broker, owner]` kullanıyor, `recruiting` hâlâ
`MANAGE_ROLES` (broker/owner/ofis) — ofis artık menüde Lead Havuzu'nu
görmüyor, `/leads` route'una da giremiyor.

**RLS** (`20260726180000_lead_havuzu_yetki_daraltma.sql`) — `leads_manage`
politikası 3 rolden 2'ye indi (`broker, owner`). `recruiting_manage`'e
DOKUNULMADI.

**Terminoloji: "dönüştür" → "gönder"** — buton etiketleri
`"Recruiting'e Gönder"` / `"Operasyon'a Gönder"` oldu (işlevsel değişiklik
yok, sadece "dağıtım noktası" kavramıyla tutarlı framing). Başarı toast'ları
`"Operasyon'a gönderildi."` / `"Recruiting'e gönderildi."`. Salt-okunur
görünümdeki banner metni `"Bu lead yönlendirildi, artık düzenlenemez."`
oldu. "Fırsatlarda Görüntüle"/"Recruiting'de Görüntüle" hedef-görüntüleme
butonları BİLEREK değiştirilmedi (kapsam dışı).

## 2026-07-26 — Lead Havuzu radikal sadeleştirme: pipeline değil, dağıtım noktası

Lead Havuzu bir süreç takip aracı DEĞİL — sadece dağıtır, sonucu izler.
Süreçler hedef modüllerde (Fırsatlar/Recruiting) işlenir.

**`leads.tip`: 4 değerden 2'ye.** `satici`/`alici`/`kiralik` kaldırıldı,
`portfoy` ile birleşti — bu ayrım artık `NewOpportunityModal`'ın (Fırsat
formu) işi, lead'in değil. "Fırsata Dönüştür" akışı artık tip'i ÖN
DOLDURMUYOR — `NewOpportunityModal` boş açılıyor (iki tip chip'i de pasif),
kullanıcı satıcı/alıcı seçmeden Kaydet aktifleşmiyor.

**`leads.durum`: 8 değerden 3'e** — `yeni | atandi | elendi`.
`arandi/randevu/gorusuldu/kazanildi` → `yeni`'ye, `gecersiz/kaybedildi` →
`elendi`'ye, eski `donusturuldu` → `atandi`'ye taşındı (migration
`20260726170000_lead_havuzu_sadelestirme.sql`). `'atandi'` hâlâ (eskiden
`donusturuldu` gibi) sadece dönüştürme aksiyonuyla set edilir, dropdown'da
sunulmaz. Eski "kayıp nedeni zorunlu" mekanizması (durum='kaybedildi' iken)
KALDIRILDI — `elendi` için ayrı bir zorunlu alan yok, genel Açıklama yeterli
görüldü. `kayip_nedeni` kolonu DB'de duruyor ama UI artık hiç yazmıyor.

**`atanan_danisman_id` / `ilk_temas_at` lead'den UI seviyesinde kalktı —
kolonlar SİLİNMEDİ, sadece formdan/tablodan çıkarıldı.** Danışman ataması
artık hedef modülde yapılıyor (fırsat için Fırsatlar sayfasından
`assignTo`, recruiting için `RecruitingDetailModal`'ın kendi Atanan alanı
— o BAĞIMSIZ bir alan, lead'den beslenmiyor). `ilk_temas_at` gereksiz hale
geldi çünkü artık `sonuc_at` zaten "ne zaman sonuçlandı"yı taşıyor
(`computeAutoFields()`'ten `ilkTemasAt` mantığı tamamen kaldırıldı).

**Yeni "Süreç Durumu" kolonu** (`LeadTable.jsx`) — `durum==='atandi'` olan
bir lead için hedef kaydın (opportunity/recruiting_candidate) GÜNCEL
durumunu gösterir (`Leads.jsx`'in zaten yüklediği `opportunities`/
`recruitingCandidates` listelerinden `kaynak_lead_id` eşleşmesiyle,
`resolveProcessStatus()` — ek sorgu yok). Mevcut `OPPORTUNITY_STATUS_LABELS`/
`RECRUITING_DURUM_LABELS` yeniden kullanıldı, yeni bir etiket seti
icat edilmedi.

**Tablo kolonları sadeleşti:** Tarih | Ad Soyad | Telefon | Tip | Durum |
Süreç Durumu. Kaynak ve Atanan kolonları listeden çıktı (kaynak sadece
detay modalinde, en altta "Kaynak Bilgisi" başlığı altında — kaynak/
kampanya_kodu/reklam_adi, hepsi opsiyonel). Filtreler de Tip + Durum'a
indi, Atanan filtresi kaldırıldı.

**Uyarı çubuğu metni** "24 saattir aranmamış" → "24 saattir işlenmemiş"
(koşul aynı: `durum==='yeni'` + 24 saat).

## 2026-07-26 — Lead Havuzu modülü

Yeni modül: reklam ve diğer kanallardan gelen lead'lerin tek yerde
toplanması/atanması/takibi. Sadece broker/owner/ofis erişebilir.

**Yeni dosyalar:**
- `supabase/migrations/20260726090000_lead_havuzu.sql` — `public.leads`
  tablosu (bigserial id, CHECK constraint'li `tip`/`kaynak`/`durum`), 3
  index, RLS (`leads_manage` — sadece broker/owner/ofis, danışman için
  ayrı select politikası yok).
- `src/lib/leads.js` — sabitler/etiketler, `isStaleLead()`,
  `computeAutoFields()` (ilk_temas_at/sonuc_at otomatik damgalama mantığı,
  client-side — `call_logs`'taki `donusAt`/`satisTarihi` ile aynı desen).
- `src/data/mockLeads.js` — mock seed verisi.
- `src/pages/Leads.jsx` — tek sayfa (tab yok), danışman için
  `<Navigate to="/panel" />` guard'ı.
- `src/components/leads/LeadTable.jsx`, `LeadFilters.jsx`,
  `LeadDetailModal.jsx` — create/edit için TEK modal (brief 3.5).

**Değiştirilen dosyalar:**
- `src/lib/roles.js` — `canManageLeads(role)` eklendi (broker/owner/ofis).
- `src/lib/modules.js` — `leads` modülü eklendi (`roles: [BROKER, OWNER,
  OFIS]`), Sidebar + Topbar başlığı buradan otomatik besleniyor.
- `src/App.jsx` — `/leads` route'u eklendi.
- `src/lib/dataProvider/{supabaseProvider,mockProvider,index}.js` — `leads`
  provider bloğu (`list/create/update`, silme YOK — bu fazın kapsamı dışı).

**Bu fazın DIŞINDA (brief madde 8):** Meta webhook/Edge Function otomatik
bağlantısı, lead durum geçmişi tablosu, raporlama/dönüşüm grafikleri,
danışman bildirimleri.

**Notlar/varsayımlar (kullanıcı onaylı):**
- Atanan danışman listesi: sadece `danisman` rolü, test hesabı hariç
  (uygulama genelindeki diğer listelerle tutarlı olsun diye).
- Uyarı çubuğu ("24 saattir aranmamış") sadece bu sayfada, local state —
  Panel'in "Dikkat Gerekiyor" bölümüne bağlanmadı.
- Detay paneli modal (brief'in ilk sürümü "sağ panel" diyordu, düzeltildi —
  projede sağ panel deseni yok, her yerde `Modal` bileşeni kullanılıyor).

## 2026-07-26 — Lead Havuzu → Fırsatlar / Recruiting dönüşümü + Recruiting modülü

**Teknik borç — Kiralık fırsat desteği eksik (sadece Fırsatlar tarafında,
bkz. 2026-07-26 radikal sadeleştirme notu — `leads.tip`'ten kiralık zaten
tamamen kalktı).** Gereken: `opportunity_type` enum'una `kiralik`,
`FirsatlarTab.jsx`'e 3. bölüm, `Panel.jsx` `openSatici`/`openAlici`
ayrımının üçe çıkarılması, `Panel.jsx` ve `Edit`/`NewOpportunityModal`'daki
ikili ternary'lerin (satıcı varsayılan) düzeltilmesi.

**Teknik borç — Leads.jsx üç listeyi tamamen client-side yüklüyor.**
Dönüşüm hedefini bulmak için `opportunities` ve `recruiting_candidates`
listelerinin tamamı yükleniyor. Düşük hacimde sorun değil, kayıt sayısı
artınca sunucu taraflı sorguya çevrilmeli.

**Kural — dönüşüm kaynağı ayrımı için ayrı bir alan YOK.** Bir
opportunity/recruiting_candidate satırının lead'den mi geldiğini (`Meta`
reklamı üzerinden) yoksa elle mi girildiğini (`kaynak_lead_id` NULL) ayırt
etmek için ayrı bir `kayit_tipi` kolonu eklenmedi — `kaynak_lead_id`
dolu/boş olması bu ayrımı zaten taşıyor. Sonraki dönüşüm-oranı raporlarında
bu kuralla hesap yapılmalı, karıştırılmamalı.

**Yeni dosyalar:**
- `supabase/migrations/20260726150000_recruiting_ve_lead_donusum.sql` —
  `opportunities.kaynak_lead_id` (FK → `leads.id`), `leads.durum` CHECK'ine
  `'donusturuldu'` eklendi, yeni `public.recruiting_candidates` tablosu +
  RLS (`recruiting_manage`, `leads_manage` ile aynı desen).
- `src/lib/recruiting.js` — 7 durumlu huni (6 aşama + `olumsuz`),
  `canManageRecruiting` (= `canManageLeads`).
- `src/data/mockRecruiting.js`, `src/pages/Recruiting.jsx`,
  `src/components/recruiting/{RecruitingTable,RecruitingFilters,
  RecruitingDetailModal}.jsx` — Lead Havuzu ile aynı basit desen (tablo +
  filtre + tek modal), kanban YOK. Kendi "+ Yeni Aday" akışı var — Lead
  Havuzu'ndan bağımsız da kullanılabilir (aday her zaman reklamdan
  gelmiyor).

**Değiştirilen dosyalar:**
- `src/lib/leads.js` — `'donusturuldu'` durumu `LEAD_DURUM_LABELS`/
  `STYLES`'a eklendi ama BİLEREK `LEAD_DURUMLARI` (dropdown listesi)
  dışında tutuldu — hiçbir zaman elle seçilemez, sadece dönüştürme
  aksiyonu set eder. DB trigger'ı YOK, sadece UI seviyesi engel (tablo
  zaten sadece broker/owner/ofis'e açık).
- `src/components/leads/LeadDetailModal.jsx` — `durum==='donusturuldu'`
  ise form yerine salt okunur görünüm + hedef kayda giden buton;
  `satici/alici` için "Fırsata Dönüştür", `recruiting` için "Recruiting'e
  Dönüştür" aksiyonu (kiralık için buton yok).
- `src/components/opportunities/NewOpportunityModal.jsx` — `initialValues`/
  `kaynakLeadId` prop'ları eklendi (dönüşüm formunu ön-doldurmak için),
  mevcut Fırsatlar sayfası kullanımını etkilemiyor.
- `src/pages/Leads.jsx` — dönüştürülen lead'in hedef kaydını bulmak için
  `opportunities`/`recruiting_candidates` de yükleniyor (bkz. teknik borç).
- `src/lib/dataProvider/{supabaseProvider,mockProvider,index}.js` —
  `opportunities`'e `kaynakLeadId`, yeni `recruiting` bloğu.
- `src/lib/modules.js`, `src/App.jsx` — `/recruiting` route + modül
  (Lead Havuzu ile aynı erişim: broker/owner/ofis).

**Basitleştirme:** Fırsata dönüştürülen opportunity her zaman havuzda
(unclaimed) oluşturuluyor — lead'in `atananDanismanId`'si otomatik olarak
yeni fırsata taşınmıyor (staff isterse Fırsatlar sayfasından elle atar).
Bu bir sonraki iyileştirme adayı, şimdilik kapsam dışı bırakıldı.

## 2026-07-26 — Meta metaveri alanları + Recruiting'in kendi kaynak listesi + arşiv taşıması

Meta webhook entegrasyonu baştan otomatik kurulacağı için (elle girişle
başlanmayacak) metaveri alanları erken eklendi. Ayrıca recruiting'in kaynak
listesi leads'ten ayrıştırıldı ve arşivdeki 429 eski aday kaydı için taşıma
migration'ı hazırlandı (ayrı onay bekliyor, henüz çalıştırılmadı).

**Şema değişiklikleri (`20260726150000_recruiting_ve_lead_donusum.sql`
içine işlendi, henüz canlıda değil):**
- `leads.kampanya_kodu` (CHECK: `RECRUIT`/`SATICI`/`MARKA`, nullable,
  dropdown), `leads.reklam_adi` (serbest metin), `leads.meta_ad_id`
  (serbest metin, **UNIQUE DEĞİL** — `meta_lead_id`'nin aksine bir reklam
  birden çok lead üretebilir). `meta_ad_id`/`meta_lead_id` formda YOK,
  sadece webhook'un dolduracağı alanlar.
- `recruiting_candidates.kaynak` — leads'in 7 değerlik listesinden AYRI,
  kendi 13 değerlik listesi: `meta_recruiting, kariyer_net, isinolsun,
  linkedin, secretcv, indeed, instagram, referans, remax_agi, seminer,
  santral, ofis, diger`. `sahibinden`/`web`/`tabela` bilerek YOK (recruiting
  kanalı değil), `ofis` (ofise gelip başvuran) eklendi.
- `recruiting_candidates.kayit_tipi` (`'lead'|'manuel'|'gecmis'`, formda
  YOK — `create()` içinde `kaynak_lead_id` dolu/boşa göre otomatik
  `'lead'`/`'manuel'` set edilir), `yeniden_aktif_at` (timestamptz).

**Kural — Lead Havuzu'ndan Recruiting'e dönüştürürken kaynak eşleştirmesi
deterministik, boş bırakılmıyor** (`lib/recruiting.js`
`LEAD_TO_RECRUITING_KAYNAK`): `meta_recruiting→meta_recruiting,
telefon→santral, referans→referans, web/tabela/meta_portfoy/diger→diger`.
Personel formda isterse değiştirebilir.

**"Yeniden Aktifleştir" butonu** (`RecruitingDetailModal.jsx`):
`kayit_tipi==='gecmis'` olan HER kayıtta görünür (durum fark etmez — 358
"Beklemede" arşiv kaydı zaten `yeni_basvuru` olarak gelecek, onları raporlu
sürece almak tam olarak bu demek). Tıklanınca: `kayit_tipi:'manuel'`,
`yeniden_aktif_at: now()`, `durum==='olumsuz'` ise `'yeni_basvuru'`'ya
çekilir, değilse durum korunur.

**Arşiv veri taşıması (`20260726160000_recruiting_arsiv_tasima.sql`) —
AYRI ONAY GEREKTİRİYOR, henüz çalıştırılmadı:**
`archive.recruiting_candidates`'taki `is_deleted=false` ~421 satır
`public.recruiting_candidates`'a taşınır. `durum` eşleştirmesi (Beklemede/
Yeni Başvuru→yeni_basvuru, Ön Görüşme→on_gorusme, Olumsuz/OLUMSUZ→olumsuz)
kullanıcı onaylı; eşleşmeyen bir değer çıkarsa INSERT NOT NULL ihlaliyle
patlar (sessiz varsayılan yok). `kaynak` Türkçe-locale-güvenli normalize
edilip (`translate`+`lower`) bilinen varyant listeleriyle eşleştirilir,
hiç eşleşmeyen HER ŞEY `diger`'e düşer — orijinal değer HER durumda
`aciklama`'ya "Eski kaynak: X" olarak yazılır. `gorusme_notu`,
`atanan_yonetici`, `gorusmeci`, `aday_puani`, `il`/`ilce`, tüm tarihler de
yapılandırılmış metin olarak `aciklama`'ya ekleniyor (yeni kolon açılmadı).
`atanan_danisman_id` NULL (eski `atanan_yonetici` bir isim metni, uuid'ye
güvenilir eşlenemez). Migration dosyasında INSERT'ten sonra 2 rapor sorgusu
var: (1) özet sayım — bilinen örüntüyle diğer'e düşen vs. hiç eşleşmeyen,
(2) hiç eşleşmeyen ham kaynak değerlerinin dökümü.

**`archive.gd_leads`'e (684 satır, portföy tarafı) DOKUNULMADI** — ayrı bir
faz olarak ele alınacak, bu taşımaya dahil değil.
