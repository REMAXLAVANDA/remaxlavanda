# AI Notları

Bu dosya, AI asistan (Claude) tarafından yapılan yapısal değişikliklerin kısa
bir günlüğüdür — brief'lerdeki "değişiklikleri buraya işle" kuralı gereği.

## 2026-10-04 — Lead Havuzu'ndan mükerrer kayıt oluşması önlendi

`/kurul` denetiminin veri-zinciri bulgusu: Lead Havuzu'ndan yönlendirme
butonu çift tıklanınca aynı lead'den 2-3 Recruiting adayı/çağrısı
oluşabiliyordu (5 grup, 6 fazla satır — hepsi aynı gün, saniyeler/dakikalar
arayla). Broker'ın anlattığı kök neden: yönlendirme özelliği kurulmadan
önce ofis bazı kişileri elle Recruiting'e giriyordu, bu alışkanlık
yönlendirme kurulduktan sonra da bazen sürmüş. Karar: Lead Havuzu'nda
"yeni" (işlenmemiş) bir kayıt varken aynı telefonla Recruiting'e veya
Fırsat'a elle (Lead Havuzu atlanarak) kayıt girilemesin; bir lead de
sadece bir kez yönlendirilebilsin (kısmi tekil indeks, `kaynak_lead_id`).
Mevcut 6+1 fazla satır silinemedi — bu oturumda Supabase MCP aracında
DELETE komutu zaman aşımına uğruyordu (UPDATE/CREATE INDEX/DROP çalışıyor,
sadece DELETE donuyor, sebebi belirsiz) — bunun yerine `kaynak_lead_id`
NULL'a çekilerek lead ile ilişkisi koparıldı, satırlar duruyor ama artık
mükerrer sayılmıyor. Broker isterse Supabase Studio'dan elle silebilir.
4 senaryo rol simülasyonuyla doğrulandı. Ayrıca Lead Havuzu'ndaki
Recruiting/Portföy butonlarına `submitting` kilidi eklendi (çift tık
koruması). Not: aynı taramada ~40 gruplu, çoğu 2026-07-07'deki tek bir
toplu yükleme anına ait eski bir "aynı telefon, farklı kayıt" kümesi de
bulundu — bazıları gerçek mükerrer, bazıları (farklı isim, aynı telefon)
muhtemelen o yüklemenin veri kalitesi sorunu; otomatik silinmedi, broker'a
ayrıca sunuldu.

## 2026-10-04 — Etkinlik katılımında geriye dönük düzenleme sınırlandı (G1)

`/kurul` kademeli menü denetiminin yayına-engel bulgusu: danışman, geçmiş
bir etkinlikte (otomatik "katilmadi" yazılmış ya da reddedilmiş mazeret)
"Katılacağım"/"Mazeret Bildir" ile sağlık skorundaki cezayı geriye dönük
sessizce silebiliyordu. Broker kararı: danışman etkinlik bitmeden önce
değiştirebilir, bittikten sonra hiç dokunamaz; owner/ofis katılımcı
durumunu en fazla 7 gün geriye dönük düzeltebilir (ofis bu kayıtları
genelde ertesi gün/haftada işliyor); broker'da zaman sınırı yok.
`event_attendance_update_self`/`_manager` RLS politikaları buna göre
güncellendi, rol simülasyonuyla 4 senaryo (danışman geçmişte engellendi,
ofis 7 gün içinde/dışında, broker sınırsız) doğrulandı. Arayüz
(`EventDetailModal.jsx`) aynı kuralı `canSelfEditAttendance`/
`canManagerEditAttendance` (lib/calendar.js) ile yansıtıyor.

## 2026-10-03 — Genel görsel denetimin kalan 10 bulgusu tamamlandı

Önceki "Genel görsel denetim" girdisindeki 15 bekleyen bulgudan 10'u
sırayla uygulandı: Takip kritik kırmızısı + WCAG kontrast (lib/takip.js),
Leads rozet renk tutarlılığı, SegmentedControl/Table/Button'daki
hardcoded hex'ler, Panel.jsx'teki tekrarlanan InitialsBadge paylaşılan
Avatar'a taşındı (bu sırada Avatar'da TR locale case bug'ı da
düzeltildi), Panel.jsx'teki durum pill dokunma hedefleri ve
text-ink-300 kalıntıları, Rehber PreviewModal/UploadDocModal'ın ink-*
tokenlerden taşınması, ActivityPointsSettings onay butonunun dokunma
alanı. Hepsi lint/test/build ile ve mock modda Playwright ekran
görüntüsüyle doğrulandı.

Bilinçli olarak ERTELENDİ (ayrı, kapsamı netleşmiş bir iş gerektiriyor):
- Button/Badge/Card/SegmentedControl'ün uygulama genelinde benimsenmesi
  (şu an bu bileşenlerin gerçek kullanım yeri yok).
- Kullanılmayan dosyaların (ör. HealthScoreRow.jsx) silinmesi.
- Paylaşılan `text-disabled`/ink-400 tokeninin hex değerinin WCAG
  kontrastını düzeltecek şekilde yeniden tanımlanması (marka-kimligi.md'de
  bilinen/dokümante bir sorun olarak işaretli, token tüm uygulamayı
  etkiliyor — tek başına karar gerektiriyor).

## 2026-10-03 — Genel görsel denetim + mock modda Playwright doğrulaması

İlk kez bu ortamda Playwright çalıştırıldı — üretim/Supabase'e ağ erişimi
engelli olduğu için gerçek giriş yapılamıyordu, bunun yerine yerel `npm
run dev`'in varsayılan MOCK veri modu (gerçek backend gerektirmiyor)
kullanıldı. Genel panel görsel denetimi 18 bulgu çıkardı, en kritik 3'ü
gerçek ekran görüntüsüyle doğrulanıp düzeltildi:
1. Takip > Eğitim sekmesinde aynı satırda iki "Tümü" butonu farklı
   renkteydi (bg-remax-blue vs DateRangeFilter'ın bg-brand-600) —
   DateRangeFilter'ın Chip bileşeni dışa açılıp paylaşıldı.
2. RecruitingDetailModal.jsx tamamen eski ink-* token katmanındaydı
   (liste görünümü zaten yeni sistemdeydi) — semantik tokenlere taşındı.
3. Fırsatlar/Operasyon sarmalayıcısı (border-ink-100 bg-white) semantik
   tokenlere taşındı, navy aksan korunarak.

Kalan 15 bulgu (Panel'de iki farklı "kritik" kırmızısı + WCAG kontrast
sorunu, Rehber modallerinin eski sistemde kalması, kullanılmayan paylaşılan
bileşenler — Button/Badge/Card — vb.) henüz uygulanmadı, broker'ın
sırayla değerlendirmesi bekleniyor.

## 2026-10-03 — Yetki raporunun 5 kararı uygulandı

Broker 5 karar verdi: (1) hard-delete'te Ciro/Eğitim/Sosyal Medya/Rozet
geçmişi artık silinmiyor (user_id NULL'a düşüyor — education_progress/
user_badges'de birleşik PK surrogate id'ye çevrildi), (2) broker/owner
dahil kimse kendi rolünü değiştiremez (DB trigger + UI), (3) ofis'in
recruiting'i bitirememesi bilinçli (dokümante edildi), (4) yetki
ekranları yeni tasarım tokenlerine taşındı, (5) yetkisiz erişimde tüm
sayfalar aynı mesajı gösteriyor (RestrictedAccess bileşeni).

## 2026-10-03 — Portal danışmanlarda açılmıyordu: periods RLS sonsuz döngüsü

Kök neden: `period_is_blackout()`/`is_current_period()` SECURITY DEFINER
değildi, periods_select politikası bunları çağırıyor, onlar da periods'u
sorguluyordu — bir önceki gün eklenen search_path sabitlemesi bu
fonksiyonların inline edilmesini engelleyince sonsuz döngüye döndü
("stack depth limit exceeded"). SECURITY DEFINER eklenerek düzeltildi.
Detaylı ders CLAUDE.md'deki "RLS/Performans Dersleri" bölümüne eklendi.

## 2026-09-30 — İlk /kurul denetimi: Yetki modülü, 3 hızlı güvenlik düzeltmesi uygulandı

`/kurul yetki` bu oturuma yüklenmediği için 5 denetçi (.claude/agents/
tanımları birebir) Agent aracıyla manuel çalıştırıldı, sonuç
docs/kurul/raporlar/2026-09-30-yetki.md'ye kaydedildi. 2 Kritik [İhlal]
(opportunities PII sızıntısı, hard-delete'te Ciro/Eğitim geçmişi izsiz
kayboluyor) + kullanılabilirlik denetçisinin bulduğu 2 ek Kritik (rol
değişikliği onaysız + hatada arayüz yanlış değer gösteriyor) + 3
denetçinin bağımsız bulduğu ortak bir RLS tutarsızlığı (users_insert_broker
sadece broker'a izin veriyordu, owner hariç) içeren kapsamlı bir rapor.

Raporun "bugün kapatın" maddesindeki 3 düzeltme uygulandı:
1. `opportunities.lead_ad/lead_telefon`: authenticated/anon'un DOĞRUDAN
   SELECT erişimi kaldırıldı — gerçek, istismar edilebilir PII sızıntısıydı
   (`get_opportunity_contact()` RPC'sinin kısıtlamak istediği erişim DB
   seviyesinde uygulanmıyordu). İlk deneme (kolon bazlı REVOKE) yetersiz
   çıktı çünkü tablo seviyesinde daha geniş bir SELECT grantı vardı —
   (aynı ders, bugün ikinci kez: tablo/PUBLIC seviyesindeki grant, dar
   REVOKE'u geçersiz kılıyor) tablo grantı kaldırılıp hassas 2 kolon
   hariç tek tek grant verilerek düzeltildi, `information_schema`
   üzerinden doğrudan doğrulandı.
2. `users_insert_broker` RLS politikası owner'ı da kapsayacak şekilde
   genişletildi.
3. Sadece trigger olarak çalışması gereken 3 fonksiyonun
   (log_audit_event, event_attendance_restrict_katilim_tipi,
   tasks_restrict_assignee_update) gereksiz anon/authenticated EXECUTE
   yetkisi kaldırıldı.

Raporun geri kalan maddeleri (rol değişikliğine onay diyaloğu, 4 [Sapma]
sorusu, hard-delete cascade sorunu vb.) broker kararı/kod değişikliği
bekliyor, uygulanmadı.

**Eski aylar (arşiv):**
- [2026-07](docs/AI_NOTLARI_2026-07.md)
- [2026-08](docs/AI_NOTLARI_2026-08.md)

## 2026-09-30 — Güvenlik: auto_close_periods/auto_resolve_attendance herkese açık RPC uç noktasıydı

`get_advisors` (security) taramasında bulundu: bu iki `SECURITY DEFINER`
fonksiyonu (Lig dönemini otomatik kapatan ve etkinlik katılımını otomatik
"katılmadı" yapan zamanlanmış bakım görevleri) hiçbir yetki kontrolü
yapmıyordu — `/rest/v1/rpc/...` üzerinden giriş yapmadan (anon) tetiklenebiliyordu.
Etki sınırlıydı (sadece zaten eşiğe yakın kayıtları erken tetikleyebilirdi,
veri bütünlüğünü bozmuyordu) ama gerçek bir açıktı.

İlk düzeltme (`revoke execute ... from anon, authenticated`) YETERSİZ
çıktı — advisor'ı tekrar çalıştırınca hâlâ listelendiğini gördük.
`proacl`'e bakınca sebep anlaşıldı: Postgres fonksiyon oluşturulunca
varsayılan olarak `PUBLIC` rolüne EXECUTE veriyor, `anon`/`authenticated`
bunu PUBLIC üzerinden miras alıyor — sadece o iki rolden almak yetmiyor,
`PUBLIC`'ten de alınması gerekiyor. İkinci bir migration'la (`revoke
execute ... from public`) düzeltildi, `proacl` doğrudan sorgulanarak
(sadece advisor'a güvenmeden) doğrulandı.

Aynı taramada 3 fonksiyonda (`period_effective_durum`, `is_current_period`,
`period_is_blackout`) eksik olan `search_path` de sabitlendi.

Kontrol edilen diğer 10 SECURITY DEFINER fonksiyonda (`get_opportunity_contact`
dahil — müşteri adı/telefonu döndüren fonksiyon) sorun bulunmadı, hepsinde
zaten `auth.uid()`/rol kontrolü var.

Ayrıca (aynı görüşmede): Supabase MCP bağlayıcısının `execute_sql` ve
diğer yazma/yönetim araçları bu oturuma kadar `always_allow` (onaysız)
yapılandırılmıştı — hesap ayarından (`claude.ai/customize/connectors`)
`always_ask`'a çekildi (bu bir kod/migration değil, hesap ayarı).

## 2026-09-30 — CLAUDE.md: Portal Kurulu bölümü koddan doğrulanarak dolduruldu

`portal-kurulu.zip` kurulumunda eklenen Portal Kurulu şablonundaki
köşeli parantez placeholder'ları (Roller ve yetkiler, İş kuralları,
Bilinçli tasarım kararları, Asla olmaması gerekenler) koddan/veritabanından
doğrulanarak dolduruldu — hiçbir madde uydurulmadı (ör. rol sayısının
şablonun varsaydığı 3 değil 4 olduğu `lib/roles.js`'ten, Lig puan
detayları `lib/league.js` ve `social_activity_types` tablosundan
doğrulandı). Broker satır satır inceledi, onayladı; tek eksik olarak
İş kuralları'nda bugüne kadar Rehber'e eklenen Çağrı Karşılama ve Panel
Veri Girişi dokümanlarına atıf olmadığını belirtti — bu ikisine kısa
referans eklenerek main'e alındı. Sadece dokümantasyon, kod değişikliği
yok.

## 2026-09-30 — KVKK araştırmasından 2 düzeltme: WhatsApp onayı netleştirildi + SSS'de kimlik fotokopisi kaldırıldı

Dördüncü araştırmanın ("Emlak ofisleri için KVKK'da kritik noktalar")
bulgusu üzerine broker onayıyla iki içerik düzeltmesi yapıldı:

1. **Sosyal Medya > WhatsApp (Durum/Broadcast):** "onayı alınmış
   olmalı" maddesi netleştirildi — bu onayın AYRI ve AÇIK olması, başka
   bir onayla (hizmet sözleşmesi, portföy yetki belgesi) BİRLEŞTİRİLEMEYECEĞİ
   eklendi (KVKK Kurulu'nun 2025/1072 ilke kararı gereği).
2. **SSS > "Tapu randevusuna giderken satıcıdan/alıcıdan hangi belgeler
   istenir?" (2 soru):** "Kimlik (aslı + fotokopi)" ifadesi "Kimlik
   (sadece görülür, fotokopisi alınmaz/saklanmaz)" olarak değiştirildi
   — KVKK Kurulu'nun 06/11/2025 tarihli 2025/2120 sayılı ilke kararı
   (kimlik fotokopisi alıp saklamanın "ölçülülük" ilkesine aykırı
   bulunması, turizm sektörü kararından genellenerek) referans alındı.
   Her iki cevabın sonuna "bu uygulama KVKK'nın genel ilkesine dayanır,
   hukuk danışmanına teyit ettirilmesi önerilir" notu eklendi — karar
   doğrudan emlak sektörüne özel değil, genelleme olduğu için. "Tapu
   senedi aslı ve fotokopisi" maddesine DOKUNULMADI (mülkiyet belgesi,
   kişisel kimlik belgesi değil, kapsam dışı).

Sadece `docs` tablosunda içerik güncellemesi (`execute_sql`), kod
değişikliği yok.

## 2026-09-30 — Rehber > Sosyal Medya'ya gerçek hesap linkleri eklendi (içerik ekleme, kod değişikliği yok)

Broker RE/MAX Lavanda'nın 9 gerçek sosyal medya hesabının linkini
verdi (Instagram, Facebook Sayfa + ayrı bir Facebook Profil — "haftalık
kontrole dahil değil" notuyla, YouTube, TikTok, LinkedIn, X, Pinterest,
Google İşletme). Her platform dokümanının başına o platformun gerçek
hesap linki (**Hesap:** satırı) eklendi; Genel Kurallar dokümanına da
tüm 9 linki tek bakışta gösteren bir "Hesap Linkleri" listesi eklendi
(hem tek tek dokümanda bağlamla hem toplu listede hızlı erişim için).
Facebook'un ikinci (kişisel tarz) profili "Facebook — Kişisel Hesap
(Danışman)" dokümanına DEĞİL, "Facebook — Sayfa" dokümanına eklendi —
o doküman danışmanların GENEL kişisel hesap kuralları için, bu link
ise ofis'in kendi ikinci hesabı, farklı bir şey. Sadece `docs`
tablosunda içerik güncellemesi (`execute_sql`), kod değişikliği yok.

## 2026-09-29 — Lig: period_id indexleri eklendi — "statement timeout" kök nedeni

Broker'a "portalın günlük sağlık durumunu kontrol et" dendiğinde tespit
edildi: bugün 08:04-16:36 arası en az 10 kez Lig sayfasının paralel
sorguları (`periods`/`ciro_girisleri`/`ciro_musterileri`/
`social_activity_log`) 2 dakikalık `statement_timeout`'a takılıp hata
vermiş (`postgres_logs`: "canceling statement due to statement
timeout"). Tablolar çok küçük (44-123 satır) olduğu için bu bir hesaplama
maliyeti değil, kilitlenme sorunuydu — Supabase performance advisor'da
zaten işaretli olan "unindexed_foreign_keys" bulgusu ile örtüşüyordu:
`ciro_girisleri`/`ciro_musterileri`/`social_activity_log` tablolarının
`period_id` (Dönem) yabancı anahtarında index yoktu. Bir Dönem kaydı
güncellendiğinde veritabanı bu üç tabloyu index olmadan satır satır
tarayıp kilitliyor, aynı anda Lig'i açan biri bu kilidi bekleyip zaman
aşımına düşüyordu. Broker'a düz Türkçe 3-soru formatıyla sunuldu
("onaylıyorum" — düşük riskli, sadece index tier'ı), migration
(`20260929230000_lig_period_id_indexleri.sql`) önce commit edilip sonra
uygulandı, 3 index de oluştuğu doğrulandı.

## 2026-09-29 — Panel Veri Girişi klasörüne 4. bölüm eklendi: Ofis Eşya/Ekipman Koruması (içerik ekleme, kod değişikliği yok)

Broker aynı dosyayı bu sefer 4. bir bölüm eklenmiş halde tekrar gönderdi
— 1-3. bölümler (Panel Veri Girişi, İlan Portalı Eşleştirme, Kurumsal
Görünüm) zaten DB'dekiyle birebir aynıydı, sadece "Ofis Eşya ve
Malzemelerinin Kullanımı ve Korunması" (çizilme/düşürülme/sıvı teması
önlemleri + hasar bildirimi) yeniydi. Var olan 3 dokümana dokunulmadan
sort_order 4 olarak eklendi; klasör etiketi de genişleyen kapsamı
yansıtsın diye "Panel Veri Girişi ve Kurumsal Görünüm" → "Veri Girişi,
Görünüm ve Ekipman" olarak güncellendi. Sadece `categories`/`docs`
tablosunda veri ekleme/güncelleme (`execute_sql`), kod tarafında
değişiklik yok.

## 2026-09-29 — Rehber'e yeni klasör: Panel Veri Girişi ve Kurumsal Görünüm (içerik ekleme, kod değişikliği yok)

Broker'ın altıncı kural dosyası — üç farklı konuyu tek dosyada
birleştiriyordu (panel/CRM veri girişi disiplini, sahibinden.com/
remax.com.tr ilan eşleştirme sorumluluğu, kurumsal kıyafet standardı).
Aynı desen: yeni `categories` satırı (`veri-girisi-kurumsal-gorunum`,
`visibility='yonetim'`) + 3 doküman (Panel Veri Girişi, İlan Portalı
Eşleştirme, Kurumsal Görünüm/Kıyafet). Sadece `categories`/`docs`
tablosunda veri ekleme (`execute_sql`), kod tarafında değişiklik yok.

## 2026-09-29 — Rehber > SSS'ye 6 yeni soru-cevap + ilk kez gerçek alt kategoriler kullanıldı (içerik ekleme, kod değişikliği yok)

Broker "Code'un terminaline yapıştır" diyerek 6 yeni SSS sorusu verdi
(para transferi kontrolü, mesai dışı sorun prosedürü, uzaktan yetki,
paralel temsil şikayeti, kiracılı satış, tahliye taahhütnamesi) ve bunları
mevcut alt-kategori eşleştirme sistemine göre uygun kategorilere
yerleştirmemi istedi. Not: SSS alt kategori ALTYAPISI 2026-09-17'de
kurulmuştu (`lib/subcategorySuggest.js`, 7 anahtar kelime grubu) ama
**hiç kullanılmamıştı** — mevcut 16 SSS sorusunun tamamı düz `sss`
kategorisinin altındaydı, gerçek bir alt kategori satırı hiç
oluşturulmamıştı. Bu 6 soru için önerilen 7 gruba tam uymayan (İşlem/
Finans, Ofis İşleyişi, Sözleşme/Yetki, Meslek Etiği, Kiracı/Tahliye)
5 yeni alt kategori (`categories`, `parent_id=sss`, `visibility` üst
kategoriden kopyalandı) oluşturuldu — bu sistemin gerçek bir alt
kategoriyle İLK kullanımı. Sıralama önemliydi: `listDocs()` sorgusu
TÜM dokümanları `sort_order`'a göre GLOBAL sıralıyor (kategori bazlı
değil), bu yüzden yeni sorular mevcut 16 sorunun (`sort_order` 1-16)
sort_order'ına çakışmayacak şekilde 17-22 aralığına, her alt kategori
kendi içinde ardışık kalacak şekilde yerleştirildi — aksi halde
`Rehber.jsx`'teki `sssGroupLabels` mantığı (aynı alt kategoriye ait
soruların ekranda bitişik durması varsayımı) bozulurdu.

Doğrulama: `execute_sql` ile gerçek bir danışman kullanıcısının
(rol='danisman') RLS gözünden sorgu çalıştırıldı — 22 SSS sorusunun
tamamı (16 eski + 6 yeni, doğru alt kategori etiketleriyle) döndü;
`yonetim` klasörleri (Sosyal Medya, Müşteri İletişim, Çağrı Karşılama,
Toplantı/Etkinlik) aynı sorguda hiç görünmedi — mahremiyet ayrımı
sağlam. `oxlint`/`npm run build`/`vitest run` (145/145) de çalıştırıldı
(kod değişmediği için beklenen şekilde hepsi temiz). Sadece
`categories`/`docs` tablosunda veri ekleme (`execute_sql`), kod
tarafında hiçbir şey değişmedi.

## 2026-09-29 — Rehber > Sosyal Medya'ya "Video Çekim Standartları" eklendi (içerik ekleme, kod değişikliği yok)

Broker aynı Sosyal Medya dosyasını bu sefer başına yeni bir bölüm
eklenmiş halde tekrar gönderdi — geri kalan tüm içerik (Genel Kurallar +
10 platform) zaten DB'dekiyle birebir aynıydı, sadece "Video Çekim
Standartları (Tüm Platformlar İçin Ortak)" bölümü yeniydi. Var olan 11
dokümana dokunmadan, yeni bir doküman olarak eklendi (format, çözünürlük,
FPS, sabitlik, ışık, ses, güvenli alan, süre, marka — tüm platformlarda
ortak çekim kuralları), sırası Genel Kurallar'dan hemen sonra (sort_order
2, geri kalanlar +1 kaydırıldı). Sadece `docs` tablosunda ekleme
(`execute_sql`), kod değişikliği yok.

## 2026-09-29 — Rehber'e yeni klasör: Toplantı, Etkinlik ve Eğitim (içerik ekleme, kod değişikliği yok)

Broker'ın dördüncü kural dosyası: "Planlama: Toplantı, Etkinlik ve
Eğitim Organizasyon Kuralları". Not: dosyanın başlığı "Planlama" olsa da
uygulamadaki mevcut "Planlama" sayfasıyla (Takvim/etkinlik modülü) bir
ilgisi yok — karışmasın diye kategori etiketi bilinçli olarak "Toplantı,
Etkinlik ve Eğitim" seçildi, "Planlama" değil. Aynı desen: yeni
`categories` satırı (`toplanti-etkinlik-egitim`, `visibility='yonetim'`)
+ 6 doküman (Ofis Toplantıları — 09:30 başlangıç + hazırlık kontrol
listesi, Mola Takibi, Sosyal Medya Çekimi, Ofis İçi Eğitimler, Ofis Dışı
Eğitimler, Sosyal Etkinlikler). Sadece `categories`/`docs` veri ekleme
(`execute_sql`), kod tarafında değişiklik yok.

## 2026-09-29 — Rehber'e yeni klasör: Çağrı Karşılama/Yönlendirme + klasör listesi rol bazlı gruplandı

Broker'ın üçüncü kural dosyası: "Çağrı Karşılama, Kapı Müşterisi ve
Yönlendirme Kuralları" — santral operasyonunun tam olarak sorulan ilk
kısmı ("santrale nasıl cevap verilir", bkz. bu günkü ilk mesaj).
Sosyal Medya/Müşteri İletişim'le AYNI desen: yeni `categories` satırı
(`cagri-karsilama`, `visibility='yonetim'`) + 4 doküman (Zorunlu
Bilgiler, Yönlendirme Senaryoları A/B/C/D, Santral SMS Bilgilendirmesi,
Portföy Mahremiyeti).

Aynı mesajda ikinci bir istek daha vardı: "danışmanların gördüğü rehber
bölümüyle ofis/owner'ın gördüğü bölümler ayrı sıralansın, karışmasın" —
bu SADECE UI, `FolderList.jsx`'e kod değişikliği gerektirdi. Önceden tüm
klasörler (herkese açık + yönetime özel) tek düz listede karışık
görünüyordu (erişim zaten RLS/`canViewManagerCategories` ile
kısıtlıydı, ama görünürdeki SIRALAMA karışıktı). `FolderList` artık
`visibility` alanına göre ikiye ayırıyor: üstte herkese açık klasörler,
altta "YÖNETİME ÖZEL" başlığı + kilit ikonuyla (CategoryManager'daki
Lock/Unlock ikonuyla aynı dil) ayrı bir grup. Danışmanda ikinci grup
zaten hiç veri almadığı için render edilmiyor (`yonetim.length > 0`
kontrolü). Mock modda broker görünümünde doğrulandı (Sözleşmeler/Şirket
Bilgileri/vb. üstte, "Yönetim Notları" altta kilit ikonuyla ayrı grupta).

## 2026-09-29 — Rehber'e yeni klasör: Müşteri İletişim Kuralları (içerik ekleme, kod değişikliği yok)

Broker'ın gönderdiği ikinci bir kural dosyası daha işlendi — bu sefer
farklı bir konu (sosyal medya değil, müşteri iletişimi). Sosyal Medya
klasörüyle AYNI desen tekrarlandı: yeni bir `categories` satırı
(`musteri-iletisim`, `visibility='yonetim'` — sadece broker/owner/ofis
görür) + 6 doküman (Genel Kurallar + Telefon/WhatsApp/Yüz Yüze/E-posta/
Sosyal Medya-Yorum-DM), her biri Amaç/Kurallar/Yapılmaz/Standart
yapısında. Dosyanın kendisi zaten bu formatta net ve kısaydı, ekstra
sadeleştirme gerekmedi — sadece Rehber'in desteklediği biçimlendirmeye
(kalın etiket + madde listesi) uyarlandı. Dosyada "sıradaki: Portföy Alım
ve Sunum Standartları" notu var — üçüncü bir dosya daha bekleniyor
olabilir. Yine sadece `categories`/`docs` tablosunda veri ekleme
(`execute_sql`, broker'ın kendi gönderdiği dosya = onay), kod tarafında
hiçbir şey değişmedi.

## 2026-09-29 — Rehber > Sosyal Medya: eksik/fazla kontrolü (2 küçük düzeltme, kod değişikliği yok)

Broker bir önceki harmanlama sonrası "yeni yaptıklarımızla uyuşuyor mu,
eksik fazla bir şey var mı" diye sordu. Kaynak dosyayla dokuman dokuman
karşılaştırdım: Google İşletme Profili dokümanından "detaylı
optimizasyon ayrı takip ediliyor" notu sehven düşmüştü, geri eklendi;
kaynak dosyanın sonundaki "bu doküman ilk sürüm, güncellenmeli" notu da
Genel Kurallar dokümanının sonuna eklendi. Genel Kurallar/Instagram'daki
görünüşte "fazla" kısımlar (yapay zekâ ibaresi yasağı, eşzamanlı
paylaşım, özel gün takvimi, aylık kira artışı, hikâye/etiketleme
zorunluluğu) hataya bağlı değil — bunlar bu son dosyada yok ama daha
önceki (Seren'in orijinal içeriği) kaynaktan geliyor, broker'ın "hepsini
harmanla" talimatı gereği korundu, kendisine açıklandı.

## 2026-09-29 — Rehber > Sosyal Medya: tüm kaynaklar tek, yalın haliyle harmanlandı (içerik değişikliği yok)

Broker ikinci bir dosya daha gönderdi (aynı 10 platform + her birine "Büyüme
İpuçları" eklenmiş hali) ve "önceki paylaştığım, sonraki şimdiki
paylaştığım ve senin eklediklerini harmanlayarak en profesyonel en yalın
en kısa haliyle rehberi yeniden düzenle" dedi. Üç kaynak birleştirildi:
(1) orijinal Seren içeriği (Instagram hikâye/etiketleme kuralı, Google
Haritalar adım adım talimatı — ikisi de gerçek, korunması gereken
operasyonel detaylardı), (2) broker'ın ilk gönderdiği genel kurallar +
Amaç/Paylaşılır/Paylaşılmaz/Sıklık yapısı, (3) ikinci dosyadaki büyüme
ipuçları. Format sıkılaştırıldı: her alan `# Başlık` yerine tek satırlık
`**Etiket:** metin` haline getirildi (daha az yer kaplıyor), büyüme
ipuçları 4 ayrı madde yerine yoğun 2-4 cümleye indirildi — hiçbir gerçek
bilgi çıkarılmadı, sadece anlatım sadeleştirildi. Yine `docs` tablosunda
içerik güncellemesi (`execute_sql`, broker'ın kendi isteği = onay), kod
tarafında değişiklik yok.

## 2026-09-29 — Rehber > Sosyal Medya: broker'ın gönderdiği detaylı kural dosyası işlendi (içerik düzenleme, kod değişikliği yok)

Bir önceki maddedeki (aynı gün) ilk düzenlemede LinkedIn/TikTok/X/YouTube/
Pinterest için elimde gerçek kural olmadığından sadece genel standarda
atıf yapan kısa notlar bırakılmıştı. Broker ardından platform bazlı
gerçek kuralları içeren bir dosya yükledi
(`remaxlavanda-sosyal-medya-kurallari.md`) — bu dosyanın içeriği
`sosyal-medya` klasöründeki 11 dokümana işlendi: 1 "Genel Kurallar" +
10 platform dokümanı (Instagram, Facebook — Sayfa, Facebook — Kişisel
Hesap, TikTok, LinkedIn, YouTube, Pinterest, X, Google İşletme Profili,
WhatsApp). Önceki placeholder'lar silinip yerine gerçek "Amaç/
Paylaşılır/Paylaşılmaz/Sıklık" yapısı yazıldı; Instagram'ın hikaye/
etiketleme kuralı ve Google Haritalar'ın adım adım paylaşım talimatı
(daha önce zaten gerçekti) yeni dokümanların içine taşınıp korundu.
WhatsApp daha önce hiç kapsanmıyordu, yeni eklendi. Yine sadece `docs`
tablosunda içerik değişikliği (`execute_sql` ile, broker'ın kendi
gönderdiği dosya = onay) — kod/kategori/görünürlük tarafında hiçbir şey
değişmedi.

## 2026-09-29 — Rehber > Sosyal Medya: platform başına ayrı doküman (içerik düzenleme, kod değişikliği yok)

Broker: "sosyal medya ile ilgili... her bir sosyal medya platformunun
içeriğinin ayrı satırlarda olmasını istiyorum... kurumsallığa uygun
olarak tekrar düzenler misin sen." Önceki durumda "Sosyal Medya"
klasöründe 3 doküman vardı (genel bir "hesaplarımız" listesi + sadece
Instagram ve Google Haritalar'a özel detaylı metinler); LinkedIn, TikTok,
X, YouTube, Pinterest, Facebook gibi hesaplar için ayrı içerik yoktu,
platforma özgü olmayan genel kurallar (kurumsal kimlik, özel gün takvimi,
aylık kira artışı paylaşımı) da Instagram dokümanının içine gömülüydü.

Yeniden düzenlendi: ortak kurallar tek bir "Genel Paylaşım Standardı ve
Kurumsal Kimlik" dokümanına toplandı, sonra kullanılan HER platform
(Facebook, Instagram, Google Haritalar, LinkedIn, TikTok, X, YouTube,
Pinterest) kendi ayrı dokümanına ayrıldı — mevcut gerçek içerik
(Instagram'ın hikaye/etiketleme kuralları, Google Haritalar'ın adım adım
paylaşım talimatı) taşınıp yeniden yazıldı, platforma özel kuralı
OLMAYAN hesaplar (LinkedIn/TikTok/X/YouTube/Pinterest) için uydurma
kural eklenmedi — sadece genel standarda atıf yapan kısa, dürüst bir not
bırakıldı. Bu SADECE içerik/veri düzenlemesi — `docs` tablosunda 3 satır
silinip 9 yeni satır eklendi (`execute_sql` ile, broker'ın "sen
düzenle" onayıyla), kategori/görünürlük (`sosyal-medya`, visibility=
`yonetim`) ve kod tarafında hiçbir şey değişmedi.

## 2026-09-29 — Aday detayı: Açıklama kutusu kaldırıldı, notlar en alta taşındı, saat eklendi

Broker: "açıklamalar en altta olmalı... artı ile açıklama ekleme
özelliğini en alta alalım. Bir de her eklememize otomatik tarih saat
versin." Kayıtlı bir adayı düzenlerken hem "Görüşme Notları" (+) bloğu
hem de altında ayrı, çoğu zaman boş görünen tek satırlık "Açıklama"
kutusu vardı — kafa karıştırıyordu.

Kontrol ettim: `recruiting_candidates.aciklama` 598 kayıttan 499'unda
dolu (çoğunlukla referans/kaynak bilgisi) — kutuyu sessizce kaldırmak bu
verinin görünürden kaybolması demekti. Onun yerine: kayıtlı bir adayda
ayrı Açıklama kutusu tamamen kaldırıldı, Görüşme Notları bloğu forma en
alta (Kaydet'in hemen üstüne) taşındı; eski açıklama artık düzenlenemiyor
ama silinmedi — notlar listesinin en altına (en eski kayıt gibi)
salt-okunur "Genel not" olarak ekleniyor. Yeni aday eklerken (henüz
candidate.id yok, nota bağlanamaz) Açıklama kutusu DEĞİŞMEDEN kaldı.

Not zaman damgası: DB zaten her notu otomatik `created_at` (default
now()) ile kaydediyordu, ama ekranda sadece `relativeTime` ("bugün/dün")
gösteriliyordu — saat hiç görünmüyordu. Yeni `formatDateTime` ile artık
"29.09.2026 15:04" gibi gün+saat gösteriliyor. Mock modda Playwright ile
hem mevcut adayda (Genel not + yeni not saat damgasıyla) hem yeni aday
ekleme akışında (Açıklama kutusu aynen duruyor) doğrulandı.

## 2026-09-29 — Recruiting Kanban kartları sadeleşti: isim, kaynak, tarih

Broker (ekran görüntüsüyle): "şu ekranda isim soyisim kaynak ve tarih
olsun. detaylar içine girince olsun." Kart üzerinde telefon numarası ve
reklam/kampanya bilgisi gösteriliyordu — bunlar kaldırıldı, kart artık
sadece isim, kaynak ve başvuru tarihini gösteriyor (görüşme notu sayısı
rozeti aynen kaldı, o da broker'ın "kaç görüşme yapıldı görülmeli"
isteğiyle ayrı bir karardı). Telefon/reklam/atanan danışman gibi tüm
detaylar hâlâ kartın tıklanmasıyla açılan Aday Detayı modalında —
sadece görünürlük yeri değişti, veri kaybı yok. `RecruitingBoard.jsx`
`resolveName`/`showCampaign` prop'larını artık kullanmadığı için
`Recruiting.jsx`'teki çağrı noktasından ve `showCampaign` tanımından
temizlendi (detay modalı hâlâ `resolveName`'e ihtiyaç duyuyor, o
kaldırılmadı). Mock modda Playwright ile hem kart hem detay modalı
doğrulandı.

## 2026-09-29 — Recruiting arşivinde 17 tamamen boş kayıt silindi

Broker ekran görüntüsüyle işaret etti: bazı arşiv kayıtlarının isim
alanında "Kapaklı", "Süleymanpaşa" gibi yer adları/kaynak adları vardı,
içi boştu. İncelemede tam olarak 17 `recruiting_candidates` kaydının
(hepsi `kayit_tipi='gecmis'`, `durum='olumsuz'`, `created_at`'i
2026-07-07 arşiv aktarım anına sabit) ne telefonu, ne e-postası, ne
açıklaması olduğu, ad alanının da bir yer/kaynak adından ibaret olduğu
doğrulandı — hiçbir yabancı anahtar referansı (kaynak lead, görüşme
etkinliği, not) yoktu. Broker "SİL" dedi, 17 kayıt `execute_sql` ile
silindi (id'ler: 377, 251, 330, 398, 405, 92, 406, 411, 91, 95, 276,
415, 416, 414, 413, 412, 376). Gerçek isim/not içeren 3 benzer kayıt
(Okan Akgün, Samet Arslan, Tahir Akay) BİLEREK silinmedi.

## 2026-09-28 — Panel açılışta "donma": call_logs'un ağır sütunları kesildi

Broker: "donma sorunu var... açılışta." Araştırma: RLS tarafında yeni bir
sorun yoktu (iki önceki düzeltme hâlâ geçerli, en ağır sorgu bile canlı
testte 5-6ms) — loglarda gerçek bir kullanıcının (iPhone) panel'i 13
dakikada 3 kez, ikisini 8 saniye arayla açtığı görüldü (donma hissiyle
sayfa yenileme davranışına uyuyor).

Kök neden: Panel.jsx açılışta **17 sorguyu paralel** atıyor, bunlardan
`call_logs` HİÇBİR sınır olmadan (1492 kaydın TAMAMI, `notlar` gibi uzun
metin sütunları dahil `select('*')`) her açılışta çekiliyordu — oysa
Panel sadece özet sayılar/uyarılar için 11 alana ihtiyaç duyuyor.

**Denenmeyen/reddedilen çözüm**: "son 7 güne sınırla" — broker önerdi ama
analiz ettim, İKİ şeyi bozardı: (1) Lig puanları dönem bazlı (çeyreklik),
son 7 günle sınırlanırsa toplamlar sıfıra yakın görünür; (2) "Dikkat
Gerekiyor" listesi TAM OLARAK 7+ günden eski unutulmuş kayıtları yakalamak
için var — sorguyu 7 günle sınırlamak en çok dikkat gerektiren kayıtları
gizlerdi. Broker'a bunu açıkladım, kabul etti.

**Uygulanan çözüm**: `callLogs.listSummary()` — Panel'in gerçekten
kullandığı 11 alanla sınırlı yeni, hafif bir sorgu (tam `list()`
DEĞİŞMEDİ, Operasyon/Lead Havuzu/Takip hâlâ tam veriyi kullanıyor).
Panel.jsx artık `list()` yerine bunu çağırıyor. Mock modda Playwright ile
hem broker hem danışman görünümü doğrulandı (Dikkat Gerekiyor, Sana
Atanan Çağrılar widget'ları — arayanAd/telefon dahil — sorunsuz).

## 2026-09-28 — Recruiting: Sebep menüsü Karar'la birleşti + Olumsuz sebep listesi genişledi + arşiv açıklamaları temizlendi

Broker'dan üç bağlantılı geri bildirim:

- **"Kaydet butonu gri oluyor, bug mu"** — bug değildi (Olumsuz seçilince
  Sebep zorunlu, broker'ın kendi isteği), sadece neden pasif kaldığı hiç
  görünmüyordu. RecruitingDetailModal'a amber uyarı eklendi: "Sebep
  seçilmeden kaydedilemez."
- **"Karar kısmına taşı, ben oradan yeni menülerden seçeyim"** — Sebep
  dropdown'ı artık durum ("Karar") seçiminin AYNI satırında, ayrı bir alt
  blok değil.
- **Sebep listesi güncellendi** (broker önerisi) — "Başka bir teklif/
  fırsat kabul etti" ikiye ayrıldı: "Başka bir emlak ofisiyle anlaştı"
  (rakip analizi için) / "Farklı bir sektörden iş teklifi kabul etti"
  (sektör cazibesi için) — broker için bu ikisi FARKLI anlam taşıyor.
  "Randevuya gelmedi" eklendi (gerçek kullanımda sık ama listede hiç
  yoktu, elle Açıklama'ya yazılıyordu — bkz. Aysel Çayan kaydı). "Deneyim/
  yetkinlik yetersiz" ve "İletişime geçilemedi" listeden çıkarıldı
  (kullanım: sırasıyla 1 ve 0 kayıt). Migration
  `20260928090000_olumsuz_sebep_listesi_ve_arsiv_temizlik.sql` — CHECK
  constraint SADECE genişledi, eski değerler DB'de hâlâ geçerli (geçmiş
  kayıtlar bozulmadı), sadece panel seçim listesinden çıkarıldı.
- **Arşiv açıklamaları temizlendi** — "[Arşivden taşındı]\nEski kaynak: X"
  ön eki 344 kayıttan silindi (broker: "onları sil bizim yazdıklarımız
  kalsın"). 76 kayıt SADECE bu ön eki taşıyordu (temiz sonrası açıklama
  boş kaldı), 268 kayıtta ön ekin ardından gerçek personel notu vardı
  (ör. "Randevu: 2026-01-29\n---\nGörüşmeye gelmedi.") — o kısım AYNEN
  korundu, sadece ön ek silindi (regex tam eşleşen tek satırlık "Eski
  kaynak: ..." kalıbını hedefledi, başka metne dokunmadı).

## 2026-09-27 — RLS performans düzeltmesi (2. tur): sabahki fix'in atladığı auth.uid() çağrıları

Broker: "danışman yine panelin açılmadığını söylüyor." Sabahki büyük RLS
fix'i (`20260927160000_rls_initplan_performans_duzeltmesi.sql`)
`current_user_role()`/`is_active()`/`is_manager()` ailesini `(select ...)`
ile sarmalamıştı ama BİRÇOK politikadaki ÇIPLAK `auth.uid()` çağrılarını
(ör. `assigned_to = auth.uid()`) atlamıştı — Supabase Performance
Advisor'da 30 yeni `auth_rls_initplan` bulgusu bunu doğruladı. En çok
etkilenen, danışmanın panel açar açmaz dokunduğu tablolar: **call_logs
(Operasyon), tasks (Panel), opportunities (Fırsatlar)**.

- Kanıt: `call_logs_select` politikası authenticated rolüyle EXPLAIN
  ANALYZE edildiğinde hâlâ Seq Scan + satır başına filtre hesaplanıyordu
  (assigned_to = auth.uid() InitPlan'a düşmüyordu).
- Migration `20260927200000_rls_auth_uid_initplan_devami.sql` — 30
  politikada `auth.uid()` → `(select auth.uid())`. Yetki mantığı BİREBİR
  AYNI, sadece hesaplama sorgu başına bir kez yapılıyor.
- Doğrulama: aynı EXPLAIN ANALYZE sonrası `auth.uid()` artık InitPlan'a
  düşüyor (execution time ~2x düştü bu veri hacminde); Performance
  Advisor'da `auth_rls_initplan` kategorisi tamamen temizlendi (30 → 0).
- Ders: bir RLS initplan taramasında SADECE özel yardımcı fonksiyonları
  değil, çıplak `auth.uid()`/`auth.jwt()`/`auth.role()` çağrılarını da
  ayrıca aramak gerekiyor — ikisi ayrı bulgu türü.

## 2026-09-27 — Lead Havuzu: gün filtresi eklendi (ana liste + Yönlendirilenler ortak)

Broker: "lead havuzunda da gün filtresi olsun... filtre her ikisini de
etkilesin, tek seçim olsun." Recruiting'deki AYNI `DateRangeFilter` (7
gün/30 gün/4 ay/Bu yıl/Tümü/Özel) Lead Havuzu'na da eklendi — TEK bir
seçim hem ana bekleyen listeyi (durum='yeni') hem alttaki "Yönlendirilenler
— Aşama Durumu" tablosunu (durum='atandi') birlikte süzüyor, varsayılan
'7g'.

"24 saattir işlenmemiş" odak modu (staleFocus) BİLEREK bu filtreden MUAF
bırakıldı — o zaten unutulmuş/eski lead'leri bulmak için var, bir tarih
penceresi tam da o kayıtları gizleyip amacını boşa çıkarırdı; o modda
tarih filtresi satırı hiç gösterilmiyor. Mock modda Playwright ile
doğrulandı: "Tümü" seçilince 7 günden eski bir "Yönlendirilenler" kaydı
(Halil Sönmez) ortaya çıkıyor.

## 2026-09-27 — Recruiting: birikimli "Görüşme Notları" günlüğü + kaynak eşleme düzeltmesi

Broker: "bir danışmanla yapılan görüşmelerin randevuların notlarını parça
parça ekleyelim, ne yaptı kaç görüşme yapıldı görülmeli." Mevcut tek
satırlık `aciklama` alanı her düzenlemede ÜZERİNE YAZILIYORDU — bunun
YERİNE geçmiyor, EK bir append-only günlük eklendi:

- Yeni tablo `recruiting_candidate_notes` (migration
  `20260927190000_recruiting_gorusme_notlari.sql`) — candidate_id, not_metni,
  created_by, created_at. Görme/ekleme `recruiting_manage` ile AYNI
  (broker/owner/ofis), **silme SADECE broker/owner** (broker onaylı: "yanlışlıkla
  eklenmiş bir notu sadece broker/owner silebilir").
- `RecruitingDetailModal`'da "Görüşme Notları" bölümü — en yeni üstte,
  yazan+tarih+metin, "Ekle" ana Kaydet formundan BAĞIMSIZ (ayrı
  noteSubmitting state, ayrı buton) çalışıyor.
- Kanban kartında not sayısı rozeti (💬 N) — karta tıklamadan "kaç görüşme
  yapıldığı" görünsün diye (broker: "kaç görüşme yapıldığı görülmeli").
  Notlar `loadAll()`'da candidates/events ile BİRLİKTE tek seferde
  yükleniyor, ayrı bir lazy-load adımı yok.
- Mock modda Playwright ile doğrulandı: not ekleme sayaç ve listeyi anında
  güncelliyor, silme ikonu sadece broker/owner'da görünüyor.

**Ayrıca aynı gün fark edilen bir veri hatası düzeltildi**: broker "neden
kaynak Meta'yken Diğer işaretli" diye sordu — Lead Havuzu'ndan Recruiting'e
dönüşürken `lead.kaynak='meta_portfoy'` (Meta'dan portföy ilgisiyle gelen
lead) `LEAD_TO_RECRUITING_KAYNAK` eşlemesinde YANLIŞLIKLA `'diger'`e
düşüyordu (recruiting'in kaynak listesinde ayrı bir "meta portföy"
seçeneği hiç yoktu). `meta_portfoy` artık `'meta_recruiting'`e eşleniyor
(hangi kampanyadan geldiği zaten reklamAdi/kampanyaKodu'nda ayrı duruyor).
Halihazırda yanlış "Diğer" görünen 6 kayıt (id 601, 611-615) geriye dönük
`meta_recruiting`'e düzeltildi (küçük, ID'yle hedefli UPDATE, broker
onaylı).

## 2026-09-27 — Recruiting: filtre çubuğu, aşama düzeni ve etiketler ince ayarı

Aynı gün içinde broker'dan gelen art arda küçük düzeltmeler:

- **Kanban panosu + üst filtreden "Olumlu" tamamen kalktı**: broker "olumlu
  hâlâ görünüyor" dedi, meğer kanban panosunda ayrı bir sütun olarak
  duruyormuş. `RecruitingBoard`/`RecruitingFilters` artık `RECRUITING_
  DURUMLARI` yerine `RECRUITING_DURUM_SECILEBILIR` kullanıyor (form
  dropdown'ıyla AYNI desen) — olumluya geçen aday artık panoda görünmüyor,
  hikayesi Ayarlar > Kullanıcılar'da devam ediyor.
- **"Yanlış Başvuru" en sona alındı** — broker fikrini değiştirdi (ilk
  başta 2. sıradaydı). Sadece `RECRUITING_DURUMLARI` dizisinin sırası
  değişti.
- **"İlk Görüşme"/"İkinci Görüşme" etiketleri "Randevu"/"Karar Bekliyor"
  oldu** — SADECE görünen isim, `ilk_gorusme`/`ikinci_gorusme` durum
  değerleri ve Meta CAPI eşlemesi (`send-meta-conversion`) aynı kaldı,
  migration gerekmedi. Doğrulandı: Randevu (ilk_gorusme) hâlâ Meta'ya
  Qualified, Yanlış Başvuru hâlâ Disqualified gönderiyor.
- **"Aktif/Geçmiş/Tümü" (kayıt tipi) filtresi standart tarih filtresiyle
  değiştirildi** (broker: "7 gün 30 gün gibi seçimler olmalı, diğerleri
  çok mantıksız artık") — Panel/Operasyon'daki AYNI `DateRangeFilter`
  bileşeni (7 gün/30 gün/4 ay/Bu yıl/Tümü/Özel), varsayılan '7g'. Arşivden
  taşınan ~418 kayıt hepsi 2026-07-07/14 tarihli (bugünden ~75+ gün eski)
  olduğu için varsayılan pencere onları zaten doğal olarak dışarıda
  bırakıyor, "Tümü" seçilince görünüyorlar. "Yeniden Aktifleştir"le geri
  dönen kayıtlar TAZE sayılsın diye filtre `createdAt` yerine (varsa)
  `yenidenAktifAt`'i baz alıyor. `matchesKayitTipiFilter` sadece Panel.jsx
  özet kartı için kaldı (kayıt tipi listesi/etiketleri silindi, artık
  kullanılmıyordu).
- Mock modda Playwright ile görsel doğrulandı.

## 2026-09-27 — Recruiting: "Olumlu" kalktı, yerine "Danışman Olarak Ekle" + "Olumsuz" sebep zorunlu

Broker: "olumlu olanlar zaten direk danışman olarak eklenmeli... o
danışmanları biz nereden aldığımızı da bilmeliyiz" + "olumsuz seçilince
sebepler seçilebilsin."

- "Olumlu" artık form/dropdown'da SEÇİLEMEZ (`RECRUITING_DURUM_SECILEBILIR`,
  bkz. lib/recruiting.js) — TEK yol `RecruitingDetailModal`'daki yeni
  "Danışman Olarak Ekle" butonu: mevcut `CreateUserModal` (Ayarlar >
  Kullanıcılar ile AYNI bileşen, ad/telefon/email ön-dolu) üzerinden gerçek
  bir `users` hesabı açılıyor, AYNI anda aday `durum='olumlu'`ya geçiyor
  (`Recruiting.jsx handleCreateDanisman`). Aday zaten "olumlu" ise
  dropdown yerine salt-okunur "Danışman olarak eklendi ✓" rozeti görünür.
- Kaynak izlenebilirliği: yeni `users.kaynak` (text, nullable) — danışman
  Recruiting'den açıldığında `candidateKaynakOzeti()` ile bir anlık özet
  yazılıyor (ör. "Recruiting: Kariyer.net — RECRUIT_..."). BİLEREK canlı bir
  FK değil, geçmişe dönük okunabilir bir metin — aday kaydı silinse/değişse
  bile users'ta kalıyor. `create-user` edge function'ı artık `telefon`/
  `kaynak`'ı da kabul edip `users` insert'ine yazıyor (redeploy edildi).
  Ayarlar > Kullanıcılar listesinde "Kaynak: ..." satırı olarak görünüyor.
- "Olumsuz" seçilince yeni bir `olumsuz_sebebi` (text, 7 sabit değer +
  NULL check constraint) zorunlu soruluyor — "Yanlış Başvuru"da
  sorulmuyor (o kendi açıklamasını zaten taşıyor, spam/yanlış numara).
  Mevcut olumsuz kayıtlar geriye dönük etkilenmedi, hepsi NULL kaldı.
- Migration: `20260927180000_recruiting_danisman_donusum_ve_sebep.sql`
  (`users.kaynak`, `recruiting_candidates.olumsuz_sebebi` + check).
- Mock modda Playwright ile görsel doğrulandı: durum "Olumsuz" seçilince
  Sebep dropdown'ı çıkıyor ve Kaydet düğmesi sebep seçilene kadar disabled
  kalıyor; "Danışman Olarak Ekle" tıklanınca Kullanıcı Ekle formu aday
  bilgileriyle ön-dolu açılıyor.

## 2026-09-27 — RLS performans düzeltmesi: "portal açılmakta zorlanıyor" kök nedeni

Broker şikayeti: portal yavaş/zorlanarak açılıyor. Kök neden bulundu —
`current_user_role()`/`is_active()`/`is_manager()`/`is_event_creator()`/
`is_invited_to_event()`/`period_is_blackout()`/`can_view_period_ranking()`
RLS politikalarında SATIR BAŞINA yeniden hesaplanıyordu (Postgres'in resmi
`auth_rls_initplan` performans uyarısıyla aynı desen, 29 politika zaten
işaretliydi — bu migration `current_user_role()` ailesini de kapsayarak
genişletti). Kanıt: `call_logs_select` politikası `authenticated` rolüyle
`EXPLAIN ANALYZE` edildiğinde 1489 satırlık tabloda **1279ms**'ye çıkıyordu
ve index kullanmıyordu (Seq Scan + satır başına `users` tablosuna sorgu).
`pg_stat_statements`: aynı sorgu 1363 çağrıda ortalama 1.2sn, en kötü
7.8sn.

- Migration `20260927160000_rls_initplan_performans_duzeltmesi.sql` —
  35 tablodaki ~70 politika `ALTER POLICY` ile `(select fonksiyon())`
  sarmalamasına geçirildi. **Yetki mantığı birebir aynı**, sadece
  fonksiyon sonucu sorgu başına bir kez hesaplanıyor (InitPlan).
- Doğrulama: aynı `EXPLAIN ANALYZE` sonrasında **1.37ms** (~930x hızlanma),
  broker "hızlandı" diye teyit etti.
- Kalan küçük optimizasyon: birkaç politikada çıplak `auth.uid()` çağrısı
  hâlâ sarmalanmadı (advisor'da 29 bulgu kaldı) — etkisi çok daha küçük
  (subquery değil, JWT okuma), ayrı bir işe bırakıldı.

## 2026-09-27 — Meta CAPI: 3 kademeli sinyal modeline geçiş + call_logs köprüsü

Broker + danışılan Meta uzmanının kararı: aşama bazlı çoklu event yerine
3 kademeli sinyal (Qualified/Converted/Disqualified) — hacim düşük olduğu
için (Meta'nın öğrenme eşiği ~50 event/hafta/ad-set) çok parçalı liste her
birini eşiğin altında bırakıyordu.

- `send-meta-conversion` güncellendi: `META_CAPI_EVENT_QUALIFIED/_SCHEDULED/
  _WON/_LOST` (4) yerine `_QUALIFIED/_CONVERTED/_DISQUALIFIED` (3). Ara
  aşamalar (2. Görüşme, Ofis Tanıtımı, Karar Bekliyor vb.) artık event
  üretmiyor. `recruiting_candidates`: `ilk_arama`→Qualified,
  `evrak`→Converted, `olumsuz`→Disqualified (7 aşamanın kendisi
  DEĞİŞMEDİ). `opportunities`: `claimed` artık event üretmiyor (Qualified
  zaten call_logs'tan gidiyor), `kapandi`→Converted, `iptal`→Disqualified.
- Yeni: `call_logs` de artık bir sinyal kaynağı — migration
  `20260927150000_meta_capi_call_logs_koprusu.sql` ile yeni trigger
  `trg_capi_call_durum` (`donus_yapildi_mi`/`portfoy_alindi_mi` değişince).
  `donus_yapildi_mi=true`→Qualified, `portfoy_alindi_mi=true`→Converted.
  Operasyon'un mevcut iki-alanlı yapısına (broker: "önceden bilerek
  ikiye bölünmüştü, dokunma") DOKUNULMADI.
- Lead Havuzu'ndaki salt-okunur Portföy özeti (bkz. aşağıdaki madde) aynı
  4 kademeye (Yeni Başvuru/Görüşüldü/Alındı/Olumsuz) güncellendi —
  "Ulaşılamadı" bilerek "Olumsuz" sayılmıyor (broker onayı: henüz ret
  değil, süreç devam ediyor).

## 2026-09-27 — Lead Havuzu: sadece Recruiting/Portföy seçimi + aşama köprüsü

Broker kararı: "Lead Havuzu'nda ya Recruiting seçeceğiz ya Portföy, orada
hiçbir işlem veya hiçbir bilgi görmeyeceğiz." Radikal sadeleştirme:

- `LeadDetailModal.jsx` ve `LeadFilters.jsx` tamamen kaldırıldı — satıra
  tıklayınca açılan detay penceresi ve Tip/Durum filtreleri yok. Ana liste
  SADECE yönlendirilmemiş (`durum='yeni'`) lead'leri, iki büyük buton
  (Recruiting/Portföy) ile gösteriyor.
- Yan etki (bilerek kabul edildi): lead'i elle "Elendi" işaretleme yolu
  kalktı, bu yüzden `leads.durum='elendi'` tetikleyicisine bağlı Meta CAPI
  "Disqualified" sinyali artık hiç tetiklenmiyor.
- Yeni `RoutedLeadsTable.jsx` — yönlendirilen lead'ler için ayrı, SALT
  OKUNUR bir "Yönlendirilenler — Aşama Durumu" bölümü: atanan modülde
  (Recruiting/Operasyon/Fırsatlar) durum değiştikçe burada da otomatik
  görünüyor, ama buradan tıklanamıyor/düzenlenemiyor — "seçim yapılabilir
  ama başka işlem yapılamaz" kararına uygun.

## 2026-09-27 — Portal → Meta CAPI: lead durumu geri bildirimi

meta-leads-webhook'un TERSİ yönü — broker onaylı kapsam: SADECE lead
durumu (nitelikli/görüşme planlandı/kapandı/kayıp), parasal değer YOK
(ayrı aşamada ele alınacak). Önce mevcut şema (leads/opportunities/
recruiting_candidates) incelenip bir durum-eşleme tablosu sunuldu,
onaylandı:

- Yeni edge function `send-meta-conversion` — `opportunities.status`,
  `recruiting_candidates.durum` veya `leads.durum='elendi'` değiştiğinde
  (Database Webhook trigger) tetiklenir, `kaynak_lead_id` üzerinden
  `leads.meta_lead_id`'yi bulup (Meta kaynaklı değilse sessizce atlar)
  Meta CAPI'ye `POST /{pixel}/events` ile durum event'i gönderir.
  Eşleme: opportunities `claimed`→nitelikli, `kapandi`→kapandı,
  `iptal`→kayıp; recruiting_candidates `ilk_arama`→nitelikli,
  `on_gorusme`→görüşme planlandı, `evrak`→kapandı, `olumsuz`→kayıp;
  leads `elendi`→kayıp. Portföy'de "görüşme planlandı" karşılığı YOK
  (opportunities.status bunu ayrı bir aşama olarak tutmuyor) — bilinen,
  broker onaylı bir kapsam boşluğu, kapatılmadı.
- Event adları (`META_CAPI_EVENT_QUALIFIED/_SCHEDULED/_WON/_LOST`) secret
  üzerinden yapılandırılabilir — Meta'da bu dört isim için sabit bir
  standart yok, Events Manager'da custom conversion olarak tanımlanmaları
  gerekiyor.
- Yeni `meta_capi_errors` tablosu (migration
  `20260927120000_meta_capi_geri_bildirim.sql`) — gönderim hatalarını
  `meta_webhook_errors` ile aynı desende tutuyor, BİLEREK ayrı tablo
  (yön farklı). `notify-webhook-error` bu üçüncü tabloyu da izleyecek
  şekilde genişletildi — broker/owner push bildirim alıyor.
- Ayarlar > Webhook Hataları'na üçüncü bir bölüm eklendi ("Portal → Meta
  (durum bildirimi)") — `MetaCapiErrorsTable.jsx`, mevcut iki bölümle
  aynı görsel desen.
- **Dikkat:** Bu ortamın ağ kısıtı Meta'nın geliştirici dokümantasyonuna
  erişimi engelliyor (developers.facebook.com bloklu) — CAPI JSON şeması
  canlı dokümanla birebir doğrulanamadı, genel bilinen şemaya göre
  yazıldı. İlk canlı denemede Meta Events Manager > Test Events ile
  kontrol edilmeli; sorun olursa `meta_capi_errors` Meta'nın ham hata
  yanıtını saklıyor.
- Çalışması için (benim tarafımdan sağlanamaz, Meta hesabını yöneten
  kişi eklemeli — Dashboard > Edge Functions > Secrets):
  `META_CAPI_ACCESS_TOKEN` (Events Manager'dan üretilecek, bilerek
  `META_PAGE_ACCESS_TOKEN`'dan ayrı) ve `META_PIXEL_ID`.

## 2026-09-27 — Panel: "hiç donma yaşanmasın" — sessiz yeniden deneme + kısmi hata toleransı

Önceki zaman aşımı düzeltmesinin (bkz. 2026-09-24 kaydı) devamı — broker
"hiç donma yaşanmasın istesek" diye sordu, 2 seçenekli bir plan sundum,
onaylandı:

- `hooks/useAsyncList.js`: tek 20 saniyelik zaman aşımı yerine, 8 saniyelik
  deneme + (zaman aşımı ya da bağlantı hatasında, `kind: 'network'`) sessiz
  BİR KEZ yeniden deneme. Anlık ağ takılmaları artık kullanıcıya hiç
  yansımıyor; kalıcı sorun varsa yine en fazla ~16 sn'de hataya düşüyor.
- `pages/Panel.jsx`: `loadAll()` artık `Promise.all` yerine
  `Promise.allSettled` kullanıyor — 17 sorgudan biri kalıcı olarak
  başarısız olsa bile geri kalanı normal render ediliyor (başarısız kısım
  boş `[]` ile dolduruluyor), sayfanın üstünde küçük bir "Bazı veriler
  yüklenemedi" şeridi + Tekrar Dene çıkıyor. Artık tek bir sorgu TÜM
  sayfayı bloklamıyor.
- Yeni `hooks/useAsyncList.test.js` testi (bağlantı hatasının sessizce
  yeniden denenip ikinci seferde başarılı olması) + mevcut zaman aşımı
  testi yeni süreye göre güncellendi.

Migration yok — tamamen frontend.

## 2026-09-24 — Panel "sürekli donuyor" hatası: veri yüklemeye zaman aşımı eklendi

Geri bildirim: Panel bazen "Yükleniyor..." ekranında süresiz takılı
kalıyordu (ekran görüntüsüyle bildirildi). Kök neden: Panel açılırken
`Promise.all` ile 10+ sorgu paralel çekiliyor, ama `hooks/useAsyncList.js`'te
HİÇ zaman aşımı yoktu — mobil ağda bu isteklerden biri bile takılırsa
(WiFi'den mobil veriye geçiş, zayıf çekim, arka plana alınan sekme)
`Promise.all` hiç sonuçlanmıyor, ekran süresiz bekliyor ve ne hata ne
"Tekrar Dene" butonu çıkıyordu (buton sadece gerçek bir hata oluşunca
render ediliyor, istek hiç bitmediği için o da tetiklenmiyordu).

- `hooks/useAsyncList.js`'e 20 saniyelik bir zaman aşımı eklendi —
  `lib/push.js`'teki AYNI `Promise.race` deseni (`withTimeout`). Süre
  dolarsa istek artık hataya düşüyor, kullanıcı net bir mesaj ("İstek
  zaman aşımına uğradı, tekrar dene.") ve gerçek bir "Tekrar Dene"
  butonu görüyor.
- Bu hook'u kullanan HER sayfa (Panel, Takvim, Fırsatlar, Takip, Lig...)
  otomatik olarak korunuyor — tek tek dokunmaya gerek yok.
- Yeni `hooks/useAsyncList.test.js` (3 test) — normal başarı/hata
  akışları + asıl düzeltilen senaryo: fetcher hiç sonuçlanmazsa (sahte
  zamanlayıcıyla simüle edildi) artık zaman aşımına uğrayıp hataya
  düşüyor.

Migration yok — tamamen frontend.

## 2026-09-24 — Planlama (Takvim): katılım oranı gösterimi

Geri bildirim: `event_attendance` ve `lib/takip.js` -> `meetingAttendPercent()`
zaten katılım verisini hesaplıyordu ama sadece Takip > Sağlık Skoru'na
besleniyordu — Takvim'in kendisinde (geçmiş etkinliklerde) hiç katılım oranı
gösterilmiyordu. Önce yazılı plan sunuldu (`meetingAttendPercent()`'ın KİŞİ
bazlı olduğu, etkinlik bazlı ayrı bir hesap gerektiği netleştirildi), A+C
kombinasyonu onaylandı:

- `lib/calendar.js`'e yeni `eventAttendPercent(attendees)` eklendi —
  `meetingAttendPercent()` ile AYNI "çözümlenmiş katılım" tanımını (katıldı/
  katılmadı/reddedilen mazeret sayılır; bekleyen/onaylanan mazeret ve
  davetli/katılacak nötr) kişi yerine ETKİNLİK bazında gruplar.
- `EventDetailModal.jsx`: geçmiş bir etkinlik açıldığında (`isPastEvent`),
  yönetimin gördüğü eski "Katılacak/Katılmayacak/Mazeretli/Davetli" niyet
  özeti (AttendanceSummary) yerine gerçek "%X — Y/Z kişi katıldı" oranı
  (yeni `PastAttendanceSummary`) gösteriliyor. Gelecekteki etkinliklerde
  eski davranış aynen duruyor — ikisi farklı soruları cevapladığı için
  karıştırılmıyor.
- `TakvimTab.jsx`: sayfanın üstüne herkesin (danışman dahil, sadece kendi
  oranı) toplantı katılımını tıklamadan gördüğü kısa bir özet şeridi
  eklendi — `meetingAttendPercent()` OLDUĞU GİBİ tekrar kullanıldı, yeni
  hesap mantığı yok.
- Takvim ay görünümüne (FullCalendar hücrelerine) hiç dokunulmadı — daha
  önce özenle sadeleştirilen yoğunluk dengesini bozmamak için rozet SADECE
  etkinlik detayında.

Migration yok — tamamen frontend. Görevler'de gecikmiş görev takibi (aynı
brief'in ikinci maddesi) ayrı bir talimatla ele alınacak.

## 2026-09-17 — Panel menüsü: Operasyon girişi geri döndü, isim çakışmaları netleştirildi

Geri bildirim: (1) Operasyon sayfası ("çağrı kayıtları") sidebar'da hiç
görünmüyordu — önce Fırsatlar'la tek sayfada birleştirilip menüden
kaldırılmıştı, danışman "nerede" diye arayamıyordu. (2) "Takip" hem grup
başlığı ("Takip & Gelişim") hem de içindeki bir menü öğesiydi; "Panel" hem
sistemin günlük konuşmadaki adı hem spesifik bir sayfa. Önce yazılı plan
sunuldu (3 alan, her biri için 2-3 seçenek), şu kombinasyon onaylandı:

- `lib/modules.js`'e yeni `operasyon` modülü eklendi (Fırsatlar'ın hemen
  altında, aynı grup) — zaten var olan `/operasyon` route'unu kullanıyor,
  yeni route/component YOK. Tıklanınca sayfa aynı component'i (Fırsatlar
  + Operasyon tek sayfa, üst üste iki bölüm — bu mimari değişmedi) render
  edip doğrudan Operasyon bölümüne kaydırıyor.
- `MODULE_GROUPS.takip`: "Takip & Gelişim" → "Gelişim". "Takip" menü
  öğesinin adı/path'i DOKUNULMADI (kullanıcı zaten günlük konuşmada
  spesifik sayfayı "Takip" diye biliyor, grup başlığı nadiren referans
  alınıyor — alışkanlığı en az bozan yön).
- "Panel"in adına DOKUNULMADI (broker kararı: "Panel'e gir" alışkanlığı
  yerleşik). Bunun yerine Panel ve Takip modüllerine `subtitle` alanı
  eklendi, `Sidebar.jsx`'te etiketin yanında küçük/soluk, HER ZAMAN
  görünen (hover değil — mobilde de okunsun diye) bir alt-etiket olarak
  gösteriliyor: "Panel · Anasayfa", "Takip · Sağlık & Eğitim". Diğer
  modüllerde subtitle yok, sidebar'ın geneli sade kalıyor.
- `AppLayout.jsx`'teki `/operasyon` için özel sayfa-başlığı case'i
  kaldırıldı — artık MODULES listesinde birebir karşılığı olduğu için
  otomatik doğru başlığı buluyor.

Migration yok — tamamen frontend, veri modeli/route yapısına dokunulmadı.

## 2026-09-17 — Operasyon: süreç zinciri döngüleme yerine açık seçim menüsü

Geri bildirim: `CallProgressSteps`'teki Görüşüldü/Portföy rozetleri tek
tıkla üç durum arasında döngüleniyordu (Bekliyor→Ulaşılamadı→Görüşüldü→
tekrar Bekliyor gibi) — bu mekanizma sadece bakarak anlaşılmıyordu,
kullanıcı tıklamadan önce ne olacağını kestiremiyordu (mobilde hover
olmadığı için "tıklayınca X olur" title'ı da görünmüyordu). Önce yazılı
plan sunuldu (3 seçenek: popover ile direkt seçim / hep-açık segmented
control / minimal — sadece "?" ipucu ekle), "popover ile direkt seçim"
onaylandı:

- `CallTable.jsx`'e yeni `StatusPickerPill` bileşeni eklendi — rozete
  tıklayınca döngülemek yerine olası durumları (2-3 seçenek, her biri
  kendi ikon/rengiyle) açıkça listeleyen bir menü açılıyor, aktif olan
  işaretli, birine tıklamak DİREKT o değeri yazıyor. Popover mekanizması
  `SourceLegendInfo.jsx` ile aynı desen (dışarı tık/ESC ile kapanır,
  `useEscapeKey` paylaşılıyor). Rozetin üzerine bir chevron eklendi ki
  tıklanabilir olduğu (Satıldı/Satış bekliyor gibi salt bilgi adımlarından
  farklı olarak) görsel olarak da belli olsun. Popover içine kısa bir
  açıklama satırı da eklendi ("Görüşme/Portföy durumunu değiştirmek için
  birini seç.").
- `lib/callLogs.js`'teki artık kullanılmayan `GORUSULDU_CYCLE`/
  `PORTFOY_CYCLE`/`cycleValue` kaldırıldı.
- Veri modeline DOKUNULMADI — `donusYapildiMi`/`portfoyAlindiMi` aynı üç
  değerli alanlar (`null`/`true`/`false`), sadece yazma şekli "sırayla
  döngüle" yerine "seçileni direkt yaz" oldu; `OperasyonTab.jsx`'teki
  `handleToggle(id, field, nextValue)` imzası/davranışı aynı kaldı.

Migration yok — tamamen frontend.

## 2026-09-17 — Rehber: owner da belge ekleyip düzenleyebiliyor

Broker isteği: Rehber'de belge ekleme daha önce sadece broker/ofis'e
açıktı (`canManageDocs` — owner sadece görüntülüyordu/denetliyordu).
Owner'a da aynı yetki verildi — `lib/docs.js`'teki `canManageDocs` artık
`ROLES.OWNER`'ı da kapsıyor. RLS'in UI ile tutarsız kalıp owner'ın
"+ Ekle" butonunu görüp yüklemenin sunucuda reddedilmesini önlemek için
4 politika da aynı migration'da güncellendi: `docs_manage`,
`doc_versions_manage` ve `docs` storage bucket'ındaki `docs_bucket_insert`/
`update`/`delete` — hepsi artık `('broker', 'ofis', 'owner')`.
`categories_manage` (Ayarlar > Kategori) zaten `is_manager()` (broker+owner)
kullanıyordu, ona dokunulmadı.

## 2026-09-17 — Operasyon sayfası sadeleştirme (kaynak kod tooltip'i, katlanabilir filtre/istatistik)

Broker/danışman geri bildirimi: Operasyon sayfası genel olarak yoğun
geliyordu. Kodu inceleyip (`OperasyonTab.jsx`, `CallTable.jsx`) önce plan
sundum — danışman rolünün zaten yapısal olarak sade bir görünüm gördüğü
tespit edildi (`isManager` koşullu render'lar sayesinde kaynak rozeti/
filtresi, danışman filtresi, Yeni Çağrı butonu zaten ona hiç görünmüyor),
bu yüzden AYRI bir danışman görünümü inşa ETMEDEN, tek paylaşılan
component yapısını koruyarak üç değişiklik yapıldı:
- Kaynak kod açıklaması (S/R/WS/D) artık sabit bir satır değil, tıklanınca
  açılan küçük bir "ⓘ" tooltip'i (`SourceLegendInfo.jsx` — mobilde hover
  çalışmadığı için tıklamayla açılıyor, CallTable'daki aynı gerekçeyle).
- `CallFilters.jsx`: kaynak çipleri/danışman dropdown'u/Herkes-SadeceBenim
  artık varsayılan kapalı bir "Filtrele" panelinin arkasında — tarih
  çipleri ve Yeni Çağrı her zaman görünür kalıyor. Danışman zaten bu
  kontrolleri hiç görmediği için ("Filtrele" butonu bile render edilmiyor)
  bu değişiklik SADECE yönetim görünümünü etkiliyor.
- İstatistik kartları kendi başlıklı, katlanabilir bir kart içine alındı —
  masaüstünde varsayılan açık, mobilde varsayılan kapalı
  (`window.matchMedia` ile ilk render'da belirleniyor, kullanıcı istediği
  zaman değiştirebiliyor).

Migration yok — tamamen frontend, davranış/yetki mantığı değişmedi.

## 2026-09-17 — Fırsatlar accordion'a Apple ana ekran tarzı ikonlar

Kategori>İşlemTipi>Taraf accordion'unun (bkz. aşağıdaki kayıt) her
seviyesine Lucide'dan (mevcut kütüphane, ek bağımlılık yok) renkli
rounded-square ikon rozetleri eklendi — Konut/Arsa/Ticari, Satılık/
Kiralık, Alıcı/Satıcı (Ticari+Kiralık'ta Mülk/Kiracı). Satılık/Kiralık
renk tonları bilerek `OpportunityTable`'daki mevcut SAT/KİR rozet
renkleriyle (`ISLEM_TIPI_STYLES`) aynı tutuldu — tutarlı bir görsel dil
için. Sadece görsel katman, davranış/mantık değişmedi.

## 2026-09-17 — Fırsatlar menüsü: Kategori>İşlemTipi>Taraf accordion'a geçiş

Broker isteği: danışmanlardan "Satıcılar/Alıcılar üstte, altında 4
kategori kutusu" yapısının kafa karıştırıcı olduğu geri bildirimi üzerine,
Fırsatlar menüsü Kategori (Konut/Arsa/Ticari) > İşlem Tipi (Satılık/
Kiralık) > Taraf (Alıcı/Satıcı) şeklinde 3 seviyeli, her zaman TEK dalın
açık kaldığı bir accordion'a çevrildi (`OpportunityCategoryTree.jsx`,
`OpportunitySection.jsx`'in yerini aldı). Arsa'da kiralık dalı hiç
render edilmiyor (`OPPORTUNITY_TREE`'de arsa.islemTipleri=['satilik']).
Ticari+Kiralık dalında taraflar "Satıcı/Alıcı" değil "Mülk/Kiracı" —
`tarafLabel()` yardımcı fonksiyonu SADECE bu dalda etiketi değiştiriyor,
`OPPORTUNITY_TYPE_LABELS`/veri modeli aynı kaldı; tutarlılık için bu
etiket New/Edit/Detail modallarına da uygulandı.

"Diğer" kategorisi kaldırıldı — ama prod'da bu kategoride 25 gerçek AÇIK
kayıt bulundu (kontrol edildi, çoğu net kategoriye otomatik atanamayacak
serbest metin notları). `categories` tablosundaki satır SİLİNMEDİ (25 FK
referansı var), sadece yeni kayıt için seçilemez oldu. Sessizce
kaybolmasınlar diye sadece broker/owner/ofis'e görünen bir "kategorisi
belirsiz" bandı eklendi (`LegacyCategoryReview.jsx`) — tıklanınca bu
kayıtların tablosu açılıyor, mevcut Düzenle akışıyla gerçek kategoriye
taşınabiliyor (`EditOpportunityModal`'a bu kayıtlar için geçici "Diğer
(eski)" seçeneği eklendi, yoksa `<select>` sessizce yanlış kategori
seçebilirdi). Migration YOK — tamamen frontend katmanı, RLS/şema
değişmedi. `canViewOpportunity`/`canExpressInterest`/`canRevealContact`/
açık havuz mantığı/Panel'in "Dikkat Gerekiyor" deep-link'i hiç
değişmedi.

## 2026-09-17 — Rehber: SSS'ye alt kategori (ücretsiz anahtar kelime önerisi)

Broker isteği: SSS sorularına alt kategori (Fatura, Komisyon, KDV, Tapu
İşlemleri vb.) eklenebilsin, sisteme yazılan soru+cevaba göre uygun alt
kategori önerilsin. Broker önce "yapay zeka" istedi, sonra fikrini
değiştirip API anahtarı/Anthropic entegrasyonu istemedi — tamamen
ücretsiz, client-side anahtar kelime eşleştirmesiyle ilerlendi
(`lib/subcategorySuggest.js`). Veri modeli: yeni tablo yerine
`categories.parent_id` (self-FK) — üst seviye klasörler yine
`parent_id IS NULL`, bir alt kategori sadece `module='docs'` +
`parent_id`=SSS'in id'si olan sıradan bir `categories` satırı. RLS'e
DOKUNULMADI — mevcut `categories_select`/`docs_select` zaten satırın
kendi `visibility`'sine bakıyor, parent/child ayrımını bilmesine gerek
yok (alt kategori oluşturulurken üst kategorinin visibility'si kod
tarafında kopyalanıyor). `UploadDocModal`'da yeni bir SSS sorusu
eklerken "Öner" butonu önerileri gösteriyor, broker her zaman
değiştirebiliyor/reddedebiliyor — hiçbir şey otomatik kaydolmuyor.
`FolderList` artık sadece üst seviye klasörleri gösteriyor, SSS
görünümünde dokümanlar alt kategori başlıklarıyla gruplanıyor.

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

