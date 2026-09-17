# AI Notları

Bu dosya, AI asistan (Claude) tarafından yapılan yapısal değişikliklerin kısa
bir günlüğüdür — brief'lerdeki "değişiklikleri buraya işle" kuralı gereği.

**Eski aylar (arşiv):**
- [2026-07](docs/AI_NOTLARI_2026-07.md)
- [2026-08](docs/AI_NOTLARI_2026-08.md)

## 2026-09-17 — Güvenlik: Telsam şifresi hata loglarında açık metin duruyordu

`telsam-cdr-sync` Edge Function, Telsam CDR API'sine kullanıcı adı/şifreyi
URL query string'inde taşıyarak bağlanıyordu. Bağlantı hatası (timeout/DNS
vb.) oluştuğunda Deno'nun fetch hatası TAM URL'yi (şifre dahil) mesajına
gömüyordu, bu da olduğu gibi `telsam_webhook_errors.hata_mesaji`'na
yazılıyordu — kontrol edildiğinde 10 satırda (2026-08-13 tarihli) gerçek
Telsam santral şifresi açık metin halde bulundu (bir aydır DB'de
bekliyordu). Düzeltme: `logError()` artık `redactTelsamSecrets()` ile
mesajı DB'ye yazmadan önce maskeliyor (hem `password=...` deseni hem
`TELSAM_PASS`'in kendisi temizleniyor — env değişse de çalışır). Mevcut
10 satır ayrı bir migrationla (`20260917120000`) temizlendi. Broker
şifreyi ayrıca kendisi değiştirecek (Telsam panelinden, kod tarafı bunu
kapsamıyor).

## Watch: call_logs satır sayısı (performans)

2026-09-17'de ölçüldü: call_logs 1.461, event_attendance 265,
calendar_events 118, leads 70, opportunities 58 satır (~aylık 96 satır
organik büyüme call_logs'ta). `.select('*')` ile sınırsız çekilen 5 tablo
için pagination/tarih filtresi şimdilik ÖNERİLMİYOR (Panel.jsx,
FirsatlarTab, TakvimTab, GlobalSearch gibi ekranlar tüm-zamanlar verisine
dayanıyor, hazır bir desen yok) — broker onayladı. **call_logs ~5.000
satıra yaklaşınca bu konu tekrar değerlendirilmeli.**

## 2026-09-17 — Rehber: "yönetime özel" klasör görünürlüğü (rol bazlı RLS)

Broker isteği: Rehber'e broker/owner/ofis'in gördüğü, danışmanın hiç
göremediği bir klasör türü eklensin — daha önce Rehber'deki HER kategori/
doküman `ALL_ROLES` idi, rol bazlı görünürlük hiç yoktu. Asıl güvenlik
katmanı RLS'te: `categories`'e `visibility` kolonu eklendi
(`'herkes'`/`'yonetim'`, default `'herkes'`) — SADECE kategoriye, docs/
doc_versions ayrı kolon TAŞIMIYOR, kendi `category_id`'si üzerinden
`EXISTS` ile categories.visibility'ye bakıyor (tek kontrol noktası,
senkronizasyon riski yok). Rol grubu için `is_manager()` yetmiyordu
(sadece broker+owner) — projede zaten 10+ yerde kullanılan
`current_user_role() in ('broker','owner','ofis')` kalıbı tekrarlandı,
yeni fonksiyon yazılmadı. `categories_select`/`docs_select`/
`doc_versions_select` politikaları buna göre güncellendi (migration
20260917110000). UI tarafında `Rehber.jsx` artık kategorileri role göre
filtreliyor (`lib/roles.js` → `canViewManagerCategories`) — RLS zaten
veriyi getirmiyor ama mock modda (RLS yok) aynı davranış ve boş/kırık
görünüm olmaması için. Kategori oluşturma zaten UI'dan yapılıyordu
(Ayarlar > Kategori, broker/owner) — oraya "Yönetime özel" checkbox +
her satırda kilit ikonlu toggle eklendi.

## 2026-09-17 — Rehber: "Sıkça Sorulan Sorular" kategorisi + tüm dokümanlarda basit biçimlendirme

Broker isteği: Rehber'e SSS diye yeni bir klasör eklensin, sorular
tıklayınca açılan akordiyon şeklinde görünsün (`FaqAccordionItem`),
ve tüm yazı dokümanları artık `**kalın**`, `- madde` ve `# başlık`
biçimlendirmesini destekliyor (`lib/formattedText.js` + `FormattedText`
bileşeni — ağır bir markdown kütüphanesi yerine basit satır bazlı
parser). Kategori kimliği bu projede zaten `key` ile eşleşiyordu
(bkz. `lib/league.js`), SSS de aynı desenle `Rehber.jsx`'te
`selectedCategory === 'sss'` kontrolüyle özel render'a yönlendiriliyor
— veri modeli/CRUD akışı diğer kategorilerle birebir aynı. Doküman
ekle/düzenle penceresine biçimlendirme sözdizimini anlatan bir ipucu
metni eklendi. `categories` tablosuna yeni satır ekleyen migration
(`20260917100000_rehber_sss_kategorisi.sql`) broker onayıyla uygulandı.

## 2026-09-13 — ACİL: Portal açılmıyordu (eksik Supabase env değişkeni) + PDF üretme özelliği tamamen kaldırıldı

**Olay:** Broker "portal açılmıyor" / "Sistem yapılandırması eksik"
hatasını bildirdi — TÜM kullanıcılar için portal açılmıyordu. Kök sebep:
bir önceki gündeki panel-build-deploy.yml otomasyonu (bkz. aşağıdaki
2026-09-12 kaydı) derleme sırasında `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY`'i hiç tanımlamıyordu — Vercel kendisi build
çalıştırmadığı için (framework tanımsız, statik dosya sunuyor) gerçek
derleme SADECE bu iş akışında oluyor, ve bu iki değer olmadan panel
veritabanına hiç bağlanamadan "yapılandırma eksik" ekranında kalıyordu
(`lib/env.js` `HAS_SUPABASE_CONFIG=false` → `ConfigErrorScreen.jsx`).
Bu, otomasyonu kurarken gözden kaçan bir hataydı. Düzeltme: bu iki
değer (public/anon Supabase bilgisi, zaten tarayıcıya giden kodun
içinde — gizli değil) iş akışına `env:` olarak eklendi, elle bir
derleme tetiklenip canlıya alındı. Portal doğrulanıp düzeldi.

**Aynı gün ayrıca:** Broker isteği üzerine "Belge Doldurma Platformu"
(PDF üretme) özelliği portaldan komple kaldırıldı — iç ekran zaten
hiçbir menüden erişilemiyordu (bağlı değildi), müşteri genel-erişim
doldurma sayfası + 3 Supabase Edge Function + Vercel PDF fonksiyonu
(headless Chromium, `@sparticuz/chromium`) + 16 şablon silindi. Bu,
Vercel'in "Function Storage %100 doldu" uyarısını da doğrudan
hafifletti — o fonksiyon her deploy'da koca bir tarayıcı motoru
paketliyordu. Veritabanı tarafı (document_templates/fields/instances
tabloları, belge-ciktilari storage bucket'ı — kontrol edildi: 12 boş
taslak, gerçek belge yok) henüz kaldırılmadı, ayrı bir migration ile
broker onayından sonra kaldırılacak.

## 2026-09-12 — Etkinlik katılımı: sessiz kalan davetler otomatik "katılmadı"

Bir danışman etkinliğe davet edilip hiç yanıt vermezse ("katılacağım" da
demez, mazeret de bildirmez), `event_attendance` satırı sonsuza kadar
`davetli` kalıyor, `meetingAttendPercent()` bunu hiç saymıyordu — açıkça
"katılmıyorum" diyen dürüst biri (mazereti reddedilirse) skorda
cezalandırılırken, sessiz kalan hiç etkilenmiyordu. `auto_close_periods()`
(Lig) ile aynı `pg_cron` deseniyle `auto_resolve_attendance()` eklendi —
her gece 04:00'te, etkinlik bitişinden 3+ gün sonra hâlâ `davetli` kalan
satırları `katilmadi`ya çeviriyor. Sadece `davetli`ye dokunuyor —
`onayladi`/`mazeretli` kapsam dışı. `lib/takip.js`'te kod değişikliği
gerekmedi, zaten `katilmadi`yı sayıyordu. Broker onayıyla uygulandı
(migration `20260912100000_katilim_otomatik_cozum.sql`).

## 2026-09-12 — mockProvider/supabaseProvider tutarsızlıkları: 3 eksik "kim yaptı" alanı

Karşılaştırma raporunda bulunan 3 eksiklik tamamlandı: (1) `Lig.jsx`'teki
`removeCiroGiris`/`removeSocialActivity` çağrılarına `user.id` eklendi —
supabaseProvider bunu zaten bekliyordu, gönderilmiyordu. (2)
`mockProvider.addScore` artık `enteredBy`'ı kaydediyor (aynı dosyadaki
`addCiroMusteri`/`logSocialActivity` deseniyle aynı). (3)
`mockProvider.savePushSubscription`/`removePushSubscription` artık
gerçekten çalışıyor (önceden tam no-op'tu, yorum "hafızada tutuyoruz"
diye yanlış bilgi veriyordu).

## 2026-09-12 — roles.js: güncelliğini yitirmiş yetkilendirme notu

Yorum hâlâ "gerçek yetkilendirme PART 2'de bağlanacak" diyordu ama
kontrol edildi: Supabase Auth + RLS çoktan bağlanmış, production'da
`USE_SUPABASE` her zaman zorunlu true (`lib/env.js`), rol RLS korumalı
`public.users.rol`'den okunuyor, kendi rolünü değiştirme ayrı bir DB
trigger'ıyla (`rol_yukseltme_koruma`, 2026-07-24) engelleniyor. Sadece
yorum güncellendi.

## 2026-09-12 — Panel derlemesi/deploy tam otomatik hale getirildi

Deploy süreci elle "derle → panel/ klasörüne kopyala → push et" idi,
unutulursa canlı site eskide kalıyordu (bkz. deploy-drift-check.yml).
`.github/workflows/panel-build-deploy.yml` eklendi — `panel-app`
kaynak kodu `main`'e girince testler+lint geçerse otomatik derlenip
`panel/` güncelleniyor ve commit'leniyor, Vercel bunu görüp otomatik
yayınlıyor. İlk sürümde bir YAML girinti hatası yüzünden dosya hiç
çalışmıyordu (bkz. commit ce169f6) — düzeltildi, artık uçtan uca
çalışıyor. `actions/checkout`/`actions/setup-node` de GitHub'ın Eylül
2026'da kaldıracağı Node 20 çalışma zamanından Node 24 kullanan v7'ye
yükseltildi.

## 2026-09-03 — Takvim: ay görünümü hücre sınırı, recruiting ikonu, görüşme bitiş saati

Üç ayrı iyileştirme birlikte deploy edildi:
1. Yoğun günlerde (4-6 etkinlikli) ay görünümü hücreleri dengesiz
   uzuyordu — `EventCalendar.jsx`'e `dayMaxEvents={4}` ve Türkçe
   `moreLinkText` ("+N daha") eklendi, fazlası popover'a taşınıyor.
2. `recruiting_gorusmesi` etkinlik rengi marka paleti kısıtı yüzünden
   kasıtlı olarak diğer türlerle aynı gri (bkz. `lib/calendar.js`
   `EVENT_TYPE_COLORS` notu, renk DEĞİŞTİRİLMEDİ) — bunun yerine
   `renderEventContent`'te başlığın önüne küçük bir `UserPlus` ikonu
   eklendi, ayrım renkte değil şekilde yapılıyor.
3. Recruiting görüşme randevusu Takvim'e her zaman `endTime: null` ile
   işleniyordu, sadece başlangıç saati görünüyordu. `RecruitingDetailModal`'a
   15/30/45/60 dakikalık bir "Süre" seçici eklendi (varsayılan 30),
   `Recruiting.jsx`'teki `syncInterviewEvent` artık `lib/calendar.js`'e
   eklenen `addMinutesToTimeString()` ile bitiş saatini hesaplıyor
   (süre formda yoksa eski kayıtlarla geriye dönük uyumluluk için
   varsayılan 30 dakika kullanılıyor).

## 2026-09-03 — Bildirim izni: iOS ana ekran kontrolü + zaman aşımı

Broker: "aç diyorsun açılıyor yazıyor takılı kalıyor" — "Bildirimleri
Aç" düğmesi sonsuza kadar "Açılıyor..." durumunda kalıyordu. Kök
neden: iOS/iPadOS'ta Web Push sadece ana ekrana eklenmiş PWA içinde
çalışıyor, normal Safari sekmesinde izin isteği hiç sonuçlanmıyor.
`lib/push.js`'e iki katman eklendi: (1) iOS + ana ekrana eklenmemiş
durumu denemeden önce ayırt edilip anlaşılır bir mesaj gösteriliyor,
(2) hangi tarayıcıda olursa olsun 20 saniyelik zaman aşımı — düğme
artık hiçbir zaman sonsuza kadar takılı kalmıyor.

## 2026-09-03 — Panel: Dikkat Gerekiyor'a recruiting durgunluk uyarısı

"Ofisin Nabzı"ndaki Recruiting kutusu 0 yeni başvuru olsa bile diğer
kutularla aynı nötr renkte kalıyor (kart renkleri kasıtlı sabit).
`lib/attention.js`'e `isRecruitingStalled()` eklendi — son 7 gündür
hiç yeni recruiting başvurusu yoksa `Panel.jsx`'teki "Dikkat Gerekiyor"
listesine kritik bir uyarı ("7 gündür yeni recruiting başvurusu yok",
`/recruiting`'e yönlendiriyor) düşüyor. `attention.test.js` eklendi.

## 2026-09-03 — Deploy sonrası kalan açık sekmeler için otomatik yenileme

Broker: "bugün ben, ofis ve danışmanlar portala girmede sorun yaşamış".
Kök neden: aynı gün art arda yapılan birden fazla deploy, lazy-load
edilen sayfa paketlerinin dosya adlarını değiştirdi — deploy'lar
ARASINDA açık kalan bir sekim, henüz gidilmemiş bir sayfaya
tıklandığında artık sunucuda olmayan eski bir paket dosyasını istiyor,
donuyor/boş kalıyordu. `main.jsx`'e Vite'ın resmi `vite:preloadError`
olayını yakalayıp sayfayı otomatik yenileyen bir dinleyici eklendi
(bir oturumda en fazla bir kez, sonsuz döngü olmasın diye).

## 2026-09-03 — Kullanıcı yönetimi Edge Function'larında CORS düzeltmesi

Broker: "yeni danışman oluşturulamıyor, hata veriyor". Kök neden:
`create-user`/`delete-user`/`reset-user-password` sadece
`https://panel.remaxlavanda.com.tr` adresinden gelen isteklere izin
veriyordu (CORS), ama Vercel projesi aynı içeriği
`www.remaxlavanda.com.tr` ve `remaxlavanda.com.tr` adreslerinden de
servis ediyor — o adreslerden girildiğinde tarayıcı isteği sessizce
engelliyordu (sunucu logunda sadece OPTIONS ön-kontrolü görünüyor,
gerçek istek hiç gitmiyordu). Üç fonksiyon da artık bu üç bilinen
adresin hepsinden gelen istekleri kabul ediyor; yetki kontrolü
(broker/owner) zaten fonksiyon içinde ayrıca yapıldığı için güvenlik
gevşemedi. Broker onayıyla ("onaylıyorum") uygulandı, üç fonksiyon da
Supabase'e deploy edildi.

## 2026-09-03 — 3 kullanım rahatlığı önerisi (design panosu → uygulama)

Broker: "portaldaki detayları inceleyin, kullanım rahatlığı sunacak
önerilerde bulunun" — gerçek kod üzerinden 3 somut bulgu (`/design`
panosunda şu an/öneri karşılaştırmalı sunuldu, onaylandı, uygulandı):
1) Lig/Fırsat/Santral'da 6 yerde native `window.confirm()` → portalın
kendi `ConfirmDialog`'u. 2) `AddSocialActivityModal` tarih alanına
`AddScoreModal`'daki "hangi döneme yazılacağı" ipucu eklendi. 3) Yeni
`PastPeriodsMenu` — danışman artık "açıklanmış" geçmiş dönemleri
görebiliyor (sadece aciklandi durumundakiler, tarih ifşası yok);
seçilen açıklanmış dönemde artık tam sıralama da gösteriliyor (önceden
sadece ilk 3), broker'ın "'aciklandi' olunca danışman tam sıralamayı
görür" kararıyla tutarlı hale getirildi.

## 2026-09-03 — Performans: tüm sayfalar lazy-load

Broker: "portalda yavaşlama var mı" — Vercel'de 24 saatte hata yok,
Supabase tabloları çok küçük (en büyüğü 29 satır), backend'de sorun
bulunamadı. Gerçek sorun frontend'de: Takvim/Pano dışındaki tüm sayfalar
(Panel, Lig, Rehber, Fırsatlar, Recruiting, Ayarlar, Belge Oluştur vb.)
tek ~880 KB'lık JS pakete birleşmişti — hangi sayfaya girilirse girilsin
bu paket indiriliyordu (mobil/LTE'de hissedilir gecikme). Tüm sayfalar
`React.lazy` ile ayrı pakete alındı; ana paket 881 KB'dan 262 KB'a
düştü. Mock modda tüm route'lar Playwright ile tek tek test edildi.

## 2026-09-02 — Lig: veri girilmemiş danışman Memnuniyet sıralamasına girmesin

Broker: "aynı şey memnuniyette de Alper'de görünüyor" — bir önceki
"hayalet lider" hatasının (Sosyal Medya) Memnuniyet karşılığı. Kök
neden farklı ama sınıfı aynı: `rankingsByCategory`'deki memnuniyet
dalı, hiç müşteri girilmemiş (hakSayisi=0) danışmanı da puan=0 olarak
sıralamaya dahil ediyordu — kimse veri girmemişken listedeki ilk isim
rastgele "Lider" gösteriliyordu. Artık sadece en az 1 müşterisi
girilmiş danışman sıralamaya giriyor (`Lig.jsx`).

## 2026-09-02 — Lig: silinen son ciro/sosyal medya girişinde toplam satırı da sil

Broker: Murat Sarılgan'a girilen bir sosyal medya kaydını sildikten
sonra hâlâ listede "lider" görünmesi bildirildi. Kök neden:
`recomputeCiroTotal`/`recomputeSocialTotal` (bir önceki oturumda
eklenen silme özelliğinin parçası), altındaki tüm girişler silinse
bile `score_entries` toplam satırını 0 değerle bırakıyordu — bu tek
0'lık satır, başka kimsenin verisi olmadığında otomatik "lider"
görünüyordu. Artık son giriş de silinince toplam satır tamamen
siliniyor. Aynı desendeki mevcut tek kalıntı kayıt (Murat Sarılgan,
Eylül-Aralık) onayla temizlendi, başka kalıntı yok.

## 2026-09-02 — Lig: ofis'e geçmiş dönem görünürlüğü (RLS fix)

Broker: "sosyal medyada geçtiğimiz döneme veri girmek istediğimizde
otomatikman yeni döneme giriyor" — meğer veri doğru yere (eski döneme)
kaydediliyormuş, sorun GÖRME tarafındaymış. Aynı gün uygulanan dönem
görünürlüğü migration'ında (bkz. aşağıdaki "Lig Dönem Görünürlüğü"
kaydı) ofis'in YAZMA hakkı `is_current_period()` kontrolü yapmadan
sadece blackout'a bakıyordu (doğru), ama GÖRME tarafı
(`can_view_period_ranking()`, `ciro_musterileri_select`,
`social_activity_log_select`) ofis'i ayrı tutmuyordu — güncel olmayan
dönemde "sadece kendi satırı" kuralına düşüyordu, ofis'in danışman gibi
"kendi satırı" olmadığından geçmiş döneme girdiği veriyi kendisi hiç
göremiyordu. Ofis'in görme hakkı yazma hakkıyla simetrik hale getirildi
(`20260902140000_lig_ofis_gecmis_donem_gorunurlugu.sql`).

## 2026-09-02 — Gerçek portal aktivite takibi (son_aktif) — Portal Kullanımı doğru sinyal alsın

Broker: "gerçekten hiç portalı kullanan yok mu" — Panel'deki "Portal
Kullanımı" widget'ı `auth.users.last_sign_in_at`'e dayanıyordu, bu alan
SADECE yeniden şifre/link ile giriş yapıldığında güncelleniyor, oturum
açık kaldığı sürece (normal kullanım) hiç yenilenmiyor — broker'ın kendi
kaydı bile günlerce eskiydi, hâlbuki aktif kullanıyordu. `users.son_aktif`
kolonu + `touch_activity()` RPC'si eklendi; `AuthContext.jsx` her profil
yüklemesinde (saatte bir ile sınırlı, localStorage) şifre istemeden
sessizce çağırıyor. `list_user_activity()` artık iki sinyalin
(`auth.last_sign_in_at` + `son_aktif`) en güncelini (`greatest`) döndürüyor.
Geçmişe dönük veri yok — sadece bugünden itibaren.

## 2026-09-02 — Belge Oluştur menüsü kaldırıldı

"Yer Gösterme Belgesi" PDF'e çevrilirken tekrar tekrar "The object
exceeded the maximum allowed size" hatası verdi — depolama sınırı 25 MB'a
çıkarılmasına, Chromium/headless-mod zincirindeki tüm düzeltmelere rağmen
(bkz. bir alttaki not) sorun sürdü. Broker: "hepsini kaldır belge oluştur
menüsü olmasın" — Rehber sayfasındaki "Belge Oluştur" sekmesi/girişi
kaldırıldı (`Rehber.jsx`), alttaki `BelgeOlusturTab` bileşenine ve
Supabase/Vercel altyapısına dokunulmadı — geri getirilmek istenirse kolay.
Ayrıca `document_templates.is_active` üzerinden sadece "Yer Gösterme
Belgesi" şablonu pasife alındı (menü kaldırılmadan önceki ara adım).

## 2026-09-01/02 — PDF üretimi: Chromium/Node 24 uyumluluk zinciri + Vercel'de iki proje karışıklığı

"PDF üretilemedi (401)" hatasıyla başlayan uzun bir zincir: (1) `BELGE_PDF_SECRET`
Supabase'de hiç yoktu, Vercel'de değişmişti — ikisi eşitlendi ama hata
sürdü çünkü (2) **bu depoya bağlı Vercel'de iki proje var** — üzerinde
çalıştığımız `remaxlavanda` projesi canlı alan adına (www/panel.
remaxlavanda.com.tr) bağlı DEĞİLDİ, gerçek canlı proje `project-se28x`
(garip otomatik isim) imiş. Doğru projede düzeltilince sırasıyla: (3)
`@sparticuz/chromium`@131 Node 24 ortamıyla uyuşmuyordu (`libnss3.so`
bulunamadı) → 149'a yükseltildi (engines: node ^22.17.0 || >=24.0.0); (4)
149 + `puppeteer-core`@25 artık ES Module, `require()` ile yüklenemiyordu
(`ERR_REQUIRE_ESM`) → dinamik `import()`'a geçirildi; (5) `page.
waitForTimeout` kaldırılmış bir metod → düz `setTimeout` Promise'i; (6)
`chromium.args` zaten `--headless=shell` içeriyordu ama `launch()`'a
`headless:true` veriliyordu — bu çakışma bozuk/aşırı büyük PDF üretimine
yol açıyordu ("The object exceeded the maximum allowed size") →
`headless:'shell'` + `puppeteer.defaultArgs` (paketin belgelediği desen).
Depolama sınırı ayrıca 10→25 MB'a çıkarıldı, gerçek boyut/sayfa sayısı
teşhis için loglanıyor. Sonunda "Yer Gösterme Belgesi" hâlâ aşıyordu,
kaldırıldı (yukarıdaki not).

## 2026-09-01/02 — Lig dönem görünürlüğü: acik/kapali/aciklandi

Büyük bir özellik: dönemin 3 hali. Bitişe 7 gün kala OTOMATİK "kapali"
olur (kimse düğmeye basmaz — hem `pg_cron` her gece `durum` kolonunu
senkronlar, hem RLS tarihten CANLI hesaplar, cron'a bağımlı değil).
Kapalıyken danışman VE ofis hiçbir şey göremez (kendi satırı dahil),
broker/owner görür + skor girmeye devam eder. Broker/owner "Sonuçları
Açıkla" der → "aciklandi" olur, danışman o dönemin TAM sıralamasını
görür — bu KALICI, yeni dönem başlasa bile daralmaz. Açıklanmamış geçmiş
dönemde danışman/ofis sadece kendi satırını görür. **Erişim RLS
seviyesinde** (`score_entries`/`ciro_girisleri`/`ciro_musterileri`/
`social_activity_log`/`periods` + `list_musteri_review_counts()` RPC'si
— bu RPC SECURITY DEFINER olduğu için RLS'i bypass ediyordu, ayrıca
kapatıldı) — broker'ın kendi uyardığı Takvim genel türler hatasının
(774b12a → a100a37: sadece UI'da gizleyip RLS'i unutma) tekrarlanmaması
için özellikle. Mock modda 4 rolde Playwright ile görsel doğrulandı.

## 2026-09-01 — Lig: sıralama farkı artık bir üstteki komşuya göre + dönem tarih aralığı danışman ekranından kaldırıldı

Broker: "1. ile 2. arasındaki fark görünmeli... bir danışman bir üst
seviyeye kaç puan fark olduğunu bilmeli" — `rankingsFor()`'daki diff
hesaplaması eskiden (önceki broker onaylı spesifikasyon) SADECE lidere
göreydi, şimdi bir üst basamağa göre. Ayrıca "ödül günü sürpriz olmalı"
— dönem seçici ("2026 - Dönem 2 (May-Ağu)") tarih aralığını herkese
gösteriyordu, artık sadece yöneticiye (broker/owner/ofis) görünüyor.

## 2026-09-01 — Lig: Ciro Gir'de "+"ya basılmadan yazılan müşteri ismi kayboluyordu

Broker: "ciro'ya isim ekledik ama müşteri memnuniyetinde görünmüyor" —
kök sebep: isim kutusuna yazılıp "+" ile onaylanmadan "Kaydet"e basılırsa
isim sessizce kayboluyordu (ciro tutarı kaydediliyor, hata çıkmıyor, çünkü
teknik olarak başarılı bir kayıt). Kaydet'e basılırken draft'ta kalan
metin varsa artık otomatik listeye ekleniyor. Songül İşcan için bu şekilde
kaybolan isimler (Selen Geyik'in bugün girdiği ciro kayıtları) elle
geri eklendi. Ayrıca aynı tarih aralığına sahip kopya bir "dönem" kaydı
("Q2 2026", tamamen boş/kullanılmayan) bulunup silindi.

## 2026-09-01 — Lig: Sosyal Medya sekmesine de giriş geçmişi (açılır satır) eklendi

Ciro ve Memnuniyet sekmelerinde satıra tıklayınca danışmana özel geçmiş
açılıyordu, Sosyal Medya'da yoktu — broker: "en son hangi veri
girdiğimizi göremiyoruz". `LeagueBoard`'a üçüncü mod (`activityByUser`)
eklendi, Ciro'daki `historyByUser` ile aynı desen.

## 2026-09-02 — Güvenlik: event_attendance katilim_tipi self-edit kapatıldı

2026-08-24 taramasının 2. (o gün ertelenen) bulgusu: `event_attendance_
update_self` RLS'i status/mazeret alanlarını kısıtlıyordu ama
`katilim_tipi`'ni (zorunlu/onerilen/istege_bagli) hiç kısıtlamıyordu —
gerekçe "app kodu göndermiyor" idi (aynı sınıf hata: Takvim genel türler
emsali). Danışman doğrudan API isteğiyle kendi katılımını zorunludan
isteğe bağlıya çekip kendini muaf tutabilirdi. `tasks_restrict_
assignee_update` ile aynı desen: `BEFORE UPDATE` trigger, yönetim
dışındaki güncellemede `katilim_tipi` eski değerine sessizce döner.

