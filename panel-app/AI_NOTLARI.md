# AI Notları

Bu dosya, AI asistan (Claude) tarafından yapılan yapısal değişikliklerin kısa
bir günlüğüdür — brief'lerdeki "değişiklikleri buraya işle" kuralı gereği.

## 2026-08-02 — Renkli üst çizgi deseni diğer ekranlara da yayıldı

Fırsatlar'daki "kenarları renkli, içi nötr" deseni (bkz. bir alt madde)
broker isteğiyle ("hepsinin de premium görüntü olsun, okunaklı olsun...
hepsini tek tek yap") diğer stat-kutusu ekranlarına da uygulandı, hepsi
AYNI marka renk eşlemesini paylaşıyor (bir modül her sayfada hep aynı
renk):

- **Panel → Ofisin Nabzı** (`OfisinNabziGrid.jsx`, yeni `accent` prop'u):
  Operasyon=lacivert, Portföy=kırmızı, Recruiting=mavi, Etkinlik=lacivert,
  Eğitim=mavi, Kritik Uyarılar=kırmızı — ritim bozulmasın diye yan yana iki
  kutu aynı renk gelmiyor.
- **Panel → Dikkat Gerekiyor** (`DikkatGerekiyorList.jsx`): "kritik"
  rengi stok `red-500`'den marka kırmızısı `brand-600`'e çevrildi (uyarı
  sarısı semantik olduğu için aynen kaldı).
- **Panel/Lig → Dönem Özeti podyumu** (`PeriodSummaryBoard.jsx`) ve **Lig
  sekmeleri**: Ciro=kırmızı, Memnuniyet=mavi, Sosyal Medya=lacivert — tek
  kaynak `lib/league.js`'teki yeni `LEAGUE_CATEGORY_COLORS` sabiti,
  podyum kartları VE sekme aktif rengi aynı yerden besleniyor.
- **Operasyon StatsCards**: 4 istatistik kutusu artık lacivert üst
  çizgili — Fırsatlar'daki Operasyon bölümüyle ve Ofisin Nabzı'ndaki
  Operasyon kutusuyla aynı renk.

DB değişikliği yok.

## 2026-08-02 — Fırsatlar/Operasyon: widget renklendirmesi tamamen geri alındı

"Sanki ilk renklendirmedeki hali daha şıktı, en başa dönelim" isteğiyle
hem tam doygun hem de açık-tonlu widget renklendirmeleri geri alındı.
`OpportunitySection.jsx` ve `StatsCards.jsx` artık ilk haline (03/2026-08-02
öncesi, commit `04ec168`) birebir döndü: kategori/istatistik kutuları
nötr beyaz zemin + ince kenarlık, sadece seçili kutuda `border-brand-400
bg-brand-50`. Bölümleri ayırt eden renk artık yalnızca dış kartın üst
kenarındaki kalın çizgide (`border-t-brand-600` / `border-t-remax-blue` /
`border-t-remax-navy`) kalıyor. DB değişikliği yok.

## 2026-08-02 — Fırsatlar/Operasyon: widget renkleri yumuşatıldı

"Dediğin gibi fazla koyu oldu" geri bildirimiyle bir önceki dolu-renk +
beyaz-yazı widget tasarımı geri alındı: kategori kutuları
(`OpportunitySection.jsx`, yeni `boxTextColor` prop'u) ve Operasyon'un 4
istatistik kutusu (`StatsCards.jsx`) artık tam doygun zemin yerine açık
tonlu zemin (`/10` opaklık, ör. `bg-brand-600/10`, `bg-remax-navy/10`) +
bölümün kendi rengiyle yazı (`text-brand-700`, `text-remax-blue`,
`text-remax-navy`) kullanıyor. Seçili kutudaki koyu ring
(`ring-2 ring-ink-900`) aynı şekilde duruyor. DB değişikliği yok.

## 2026-08-02 — Fırsatlar/Operasyon: widget'lar renkli dolu, yazılar beyaz

Bölüm renklerinin (kırmızı/mavi/lacivert) sadece üst çizgide kalması
yeterli bulunmadı — "widget'lar renkli olsun, içindeki yazılar beyaz
olsun" isteğiyle kategori kutuları (Konut/Ticari/Arsa/Diğer,
`OpportunitySection.jsx` yeni `boxColor` prop'u) ve Operasyon'un 4 istatistik
kutusu (`StatsCards.jsx`) artık bölümün kendi rengiyle dolu, üzerlerindeki
yazı beyaz. Seçili kategori kutusu koyu bir ring (`ring-2 ring-ink-900`)
ile ayrışıyor. StatsCards'taki uyarı durumu (atanmamış/dönüş bekleyen > 0)
artık amber-300 ile lacivert zemin üzerinde okunaklı kalıyor. DB
değişikliği yok.

## 2026-08-02 — Fırsatlar: Satıcılar/Alıcılar/Operasyon üç ayrı renk

"Birbirinden daha çabuk ayırt edilebilir" isteği — üç bölüm artık üstte
kalın renkli bir çizgiyle ayrışıyor. İlk halde emerald/blue/amber
(Tailwind stok renkleri) kullanılmıştı, sonra "genel RE/MAX renkleri
yapsak" isteğiyle index.css'teki marka tokenlarına (brand-600 kırmızı,
remax-blue, remax-navy) çevrildi: Satıcılar kırmızı, Alıcılar mavi,
Operasyon lacivert. Operasyon önceden kart bile değildi (sadece başlık +
içerik) — artık diğer ikisiyle aynı görsel dilde (rounded-2xl border
bg-white) bir kart. DB değişikliği yok.

## 2026-08-02 — Takvim: renkli dolu kutucuklar + "Tüm Ofis" hızlı seçim

İki küçük kullanılabilirlik isteği: (1) FullCalendar etkinlikleri artık
ince nokta + düz yazı değil, tür rengiyle dolu kutucuk içinde beyaz yazı
(`eventDisplay="block"` + yeni `EventCalendar.css`) — hangi rengin ne
olduğu üstteki tür filtresi butonlarında zaten var (renkli nokta +
etiket), ayrı bir lejant eklenmedi. (2) Yeni Etkinlik formunda "Tüm Ofis"
butonu — herkesi tek tıkla işaretler, ardından mevcut Zorunlu/Önerilen/
İsteğe Bağlı Yap toplu işlem butonlarından katılım tipi seçilir; tek tek
seçim istenirse checkbox'lardan aynı akış zaten vardı, sadece "hepsini
seç" kısayolu eklendi. DB değişikliği yok.

## 2026-08-02 — Yeni etkinlik türü: RE/MAX Türkiye

`kocluk_gorusmesi` ile aynı desen (calendar_event_type enum'una yeni değer)
— RE/MAX Türkiye'nin ulusal etkinlikleri (konferans, eğitim vb.) artık
Yeni/Düzenle Etkinlik formunda ayrı bir tür olarak elle girilebiliyor.
Etkinlik/Eğitim/Toplantı ile birlikte Aylık Pano'ya da otomatik dahil
(bkz. EventBoardModal.jsx BOARD_TYPES) — ayrıca bir işaretleme gerekmiyor.

## 2026-08-02 — DÜZELTME: event_attendance.katilim_tipi kolonu gerçekte "zorunluluk" imiş

"Herkese Açık" migration'ı çalıştırılırken ortaya çıktı: `event_attendance`
tablosundaki kolon `katilim_tipi` değil `zorunluluk` adıyla duruyordu —
20260729190000 migration dosyası `katilim_tipi` diyor ama canlıda hiç bu
isimle çalıştırılmamış/farklı isimle oluşturulmuş. Bu, Zorunlu/Önerilen/
İsteğe Bağlı özelliğinin (davetli ekleme akışı) muhtemelen production'da
hiç çalışmadığı anlamına geliyor — INSERT sırasında "column does not
exist" hatası vermiş olmalı. `alter table event_attendance rename column
zorunluluk to katilim_tipi;` ile düzeltildi, kod hiç değişmedi (zaten
katilim_tipi bekliyordu). Bundan sonra migration dosyalarıyla canlı şema
arasında böyle bir sapma şüphesi olursa önce information_schema.columns'a
bakılacak, isim tahmin edilmeyecek.

## 2026-08-02 — Etkinlikler: "Herkese Açık" görünürlük + serbest katılım

Önceden davet edilmeyen bir danışman bir etkinliği Takvim'de HİÇ göremiyordu
— "bu bana mı özel, ofise mi özel, yoksa başkalarına zorunlu ama ben de
katılabiliyor muyum" sorusunu sormaya bile fırsat yoktu. Yeni
`calendar_events.gorunurluk` alanı ('davetliler' varsayılan/mevcut davranış,
'herkese_acik' yeni): açık bir etkinliği davetli olmayanlar da görür, Etkinlik
Detayı'nda sağ üstte "Herkese Açık"/"Sadece Davetliler" rozeti + (davetli
değilse) motivasyon cümlesi ve "Katılmak İstiyorum" butonu çıkar — tıklayınca
kendini isteğe bağlı+onaylı olarak katılımcı listesine ekler.

RLS: `calendar_events_select` danışman için artık `gorunurluk='herkese_acik'`
olan satırları da geçiriyor; `event_attendance_insert` artık kendi satırını
(SADECE istege_bagli+onayladi, SADECE açık bir etkinlikte) ekleyebiliyor —
zorunlu/önerilen ataması hâlâ sadece yönetimin işi. NewEventModal/
EditEventModal'a "Herkese açık" tikini ekledik.

## 2026-08-02 — Aylık Pano: lejant ve seçim menüsü kaldırıldı, etkinlik adları takvime yazıldı

İki eleman kaldırıldı: sağ üstteki tür lejantı (Toplantı/Eğitim/Etkinlik/
Broker Görüşmesi/Koçluk Görüşmesi renkli nokta listesi) ve "Bu Paylaşıma
Dahil Et (N/N)" manuel seçim kutusu — artık o ayın etkinlik/eğitim/
toplantıları hep tamamı otomatik dahil. Lejant gidince renk kodlarının
anlamı belirsiz kalmasın diye gün hücrelerindeki küçük ikon noktaları,
etkinlik adının kendisiyle (renkli sol çizgi + başlık, kısa metin taşarsa
"+N daha") değiştirildi — artık takvimin kendisi kendi kendini açıklıyor,
ayrı bir lejant/liste gerekmiyor (bkz. "takvimin içinde herşey yazsın"
isteği).

## 2026-08-02 — Aylık Etkinlik Panosu indirme çözünürlüğü sabitlendi

"Görseli İndir" sabit `pixelRatio: 2` kullanıyordu — çıktı çözünürlüğü
modalın o anki ekran genişliğine bağlıydı, dar ekranda düşük çözünürlükte
iniyordu (bkz. "görsel pikseli düşük mü" geri bildirimi). Artık hedef
genişliğe (2560px) göre oran anlık hesaplanıyor — `pixelRatio =
2560 / cardRef.current.offsetWidth` — ekran boyutundan bağımsız her zaman
2560×1440 (QHD) sabit çıkıyor.

## 2026-08-02 — Aylık Etkinlik Panosu düzeltildi ve sadeleştirildi

Bug: "Aylık Pano" açılınca hiçbir şey çıkmıyordu — pano SADECE elle
"Panoda göster" işaretlenmiş etkinlikleri gösteriyordu (önceki brief:
"yönetici sadece ... gibi etkinlikleri seçecek"), kimse bu kutuyu hiç
işaretlememiş, pano hep boş kalmıştı. Kaldırıldı: artık o ayın Etkinlik/
Eğitim/Toplantı türündeki TÜM etkinlikleri otomatik geliyor (broker_
gorusmesi/kocluk_gorusmesi bilerek dışarıda — herkese açık paylaşımda
birebir görüşmelerin yeri yok). "Bu Paylaşıma Dahil Et" alt seçimi kaldı
(paylaşmadan önce istemeyeni çıkarabiliyor), sadece kaynak artık tür
bazlı.

Sadeleştirme: pano artık SADECE takvim ızgarasını gösteriyor — "Bu Ay
Seni Neler Bekliyor?" (etkinlik listesi) ve "Bu Ayın Odak Noktaları"
(eğitim eksiği/doğum günü/lig/en büyük etkinlik) sağ paneli tamamen
kaldırıldı (bkz. "sadece takvim bölümü çıksın" isteği). Bu panel SADECE
buradaki focusItems için eğitim/lig verisi çekiyordu — panel gidince o
ekstra sorgu da (educationProvider/leagueProvider) kaldırıldı, modal artık
anında açılıyor (ayrı bir loading/error adımı yok). `panoGoster` alanı
(checkbox, form state, provider mapping) artık hiçbir yerde okunmadığı
için New/Edit Etkinlik formlarından da kaldırıldı — DB'deki `pano_goster`
kolonu dokunulmadan kaldı (kullanılmıyor ama zararsız, silme migration'ı
gerekmiyor).

## 2026-08-02 — Takip: sağlık skoru artık tablo, metrikler açmadan görünüyor

"Danışman Sağlık Skoru" listesi (Takip sayfası) önceden sadece isim +
toplam skor gösteriyordu, 7 metriği (Ciro/Eğitim/Toplantı/Lead Dönüş/
Portal/Memnuniyet/Sosyal Medya) görmek için satıra tıklayıp modalı açmak
gerekiyordu. Yeni `HealthScoreTable.jsx`: masaüstünde her metrik kendi
sütununda (başlık üstte, altında renkli % — çubuk YOK), mobilde 2 sütunlu
kompakt kart grid'i. Satıra tıklamak hâlâ modalı açıyor (Broker Notları
için). `HealthScoreRow.jsx` silinmedi — Panel.jsx'teki dashboard widget'ı
hâlâ kullanıyor, sadece Takip sayfasındaki liste değişti.

## 2026-08-02 — Operasyon'da "Müşterilerime Ekle" → "Fırsata Çevir"

"Müşterilerime Ekle" ismi kafa karıştırıcı bulundu — uygulamada "Müşteri"
diye bir menü/kavram yok, "Havuz" var; buton zaten `NewOpportunityModal`'ı
açıyor (danışman kalan bilgileri girer, havuza atma tikini kendi seçer).
İsim, gerçekte yaptığı işi (Fırsata çevirme) yansıtsın diye "Fırsata Çevir"
olarak değiştirildi (`CallTable.jsx`, hem masaüstü hem mobil buton).

## 2026-08-02 — Broker'ın fiilen üstlendiği fırsatlar owner'dan gizlendi

Broker da bir gayrimenkul danışmanı gibi kendi müşterilerini giriyor —
"bilgiler özel, owner ya da ofis görmesin" isteği. Önceden owner
`is_manager()` üzerinden HER fırsatı görüyordu (broker'la aynı "denetim
rolü" ilkesi); bu artık broker'ın FİİLEN ÜSTLENDİĞİ (claimer_id, yoksa
owner_id) fırsatlar için bir istisnaya sahip. Owner'ın diğer her yetkisi
(kullanıcı yönetimi, skor/ciro, log, diğer danışmanların/ofisin fırsatları)
DEĞİŞMEDİ — sadece bu istisna eklendi. Ofis zaten genel kuralın (owner_id/
claimer_id/açık havuz) dışına çıkamıyordu, ek bir şey gerekmedi.

Bilerek claimer_id > owner_id önceliği kullanıldı: broker'ın havuza attığı
ama BAŞKA bir danışmanın üstlendiği bir fırsat (ownerId=broker,
claimerId=başka danışman) owner'dan gizlenMİYOR — aksi halde owner o
danışmanı denetleyemezdi. Açık/sahipsiz havuz kayıtları zaten ayrı bir
kuralla herkese görünüyor.

Değişen yerler: `lib/opportunities.js` (canViewOpportunity/canRevealContact
üçüncü parametre — resolveHolderRole, verilmezse eski davranış korunur),
`FirsatlarTab.jsx` (resolver knownUsers'tan), `mockProvider.js` getContact,
migration `20260802130000_broker_firsatlari_owner_gizliligi.sql`
(opportunities_select RLS + get_opportunity_contact() RPC — RPC ayrıca
güncellendi çünkü SECURITY DEFINER olduğu için RLS'i bypass ediyor, oradan
da aynı istisna uygulanmazsa owner id'yi bilerek RPC'yi doğrudan çağırıp
müşteri bilgisini çekebilirdi).

## 2026-08-02 — "Danışmana Ata" artık Operasyon'a çağrı düşürüyor + Reklam Kaynakları raporu

Lead Havuzu'nda Portföy tipi bir lead'i "Danışmana Ata" ile yönlendirmek
daha önce direkt bir Fırsat (opportunity) oluşturuyordu — bu, Operasyon'daki
reklam takibiyle (Görüşüldü/Portföy Alındı/Satıldı) hiç kesişmiyordu ve
akışa tersti. Şimdi bu işlem, diğer reklam çağrıları gibi Operasyon'a bir
çağrı düşürüyor (`kaynak='Reklam'`, `reklamKodu` = lead'in reklam adı/
kampanya kodu, danışman doğrudan atanmış). Danışman bunu Operasyon'dan
işler, hazır olunca kendisi "Müşterilerime Ekle" ile Fırsata çevirir —
akış hiç değişmedi, sadece giriş noktası Lead Havuzu oldu.

Bunun için `call_logs`'a yeni `kaynak_lead_id` kolonu eklendi (migration
`20260802120000_call_logs_reklam_baglantisi.sql`, opportunities/
recruiting_candidates'taki aynı kolonla aynı desen) — Lead Havuzu'nun
"Süreç Durumu" ve "nereye gitti" gösterimi artık call_logs'u da tarıyor.

Bu değişiklik, uzun süredir hiç kullanılmayan `computeReklamKoduConversion()`
fonksiyonunu (call_logs.reklamKodu bazlı dönüşüm) ilk kez canlıya çıkardı:
Ayarlar > yeni "Reklam Kaynakları" sekmesi (broker/owner-only), reklam
bazında iki tablo — Recruiting reklamları (`recruiting_candidates`'tan,
yeni `computeRecruitingReklamConversion()`) ve Portföy reklamları
(`call_logs`'tan). İkisi de kendi hedef tablosundaki veriyi okuyor, Lead
Havuzu'na hiç geri dönmüyor.

## 2026-08-02 — Operasyon'da reklam kodu sadece broker/owner'a görünüyor

Recruiting'deki AYNI kısıt Operasyon'a da uygulandı. `call_logs.reklam_kodu`
(hangi reklamdan geldiği, ofis elle giriyor) `CallTable.jsx`'te KOŞULSUZ
render ediliyordu — danışman/ofis dahil herkes görüyordu. Yeni
`showReklamKodu = currentRole === broker || owner` hem masaüstü hem mobil
görünümde bu satırı gizliyor, geri kalan bilgiler (isim, telefon, süreç,
atanan) değişmedi.

## 2026-08-02 — Recruiting'de reklam/kampanya bilgisi sadece broker/owner'a görünüyor

Broker: "danışman görmesine gerek yok, broker ve owner görebilsin".
Lead Havuzu tarafında zaten sorun yok — o sayfa `canManageLeads` ile
zaten sadece broker/owner'a açık (danışman/ofis hiç giremiyor). Asıl
kısıt Recruiting'de gerekti: `canManageRecruiting` broker/owner/OFİS'i
kapsıyor, yani ofis Recruiting'e erişebiliyor ama reklam bilgisi onun işi
değil. `Recruiting.jsx`'te `showCampaign = role === broker || role ===
owner` hesaplanıp `RecruitingTable`'a veriliyor — false ise reklam
adı/kodu hiç render edilmiyor, tablonun geri kalanı (isim/telefon/kaynak/
durum) ofis için değişmedi. Danışman zaten sayfaya giremiyor, bu değişiklik
onu etkilemiyor.

## 2026-08-02 — Recruiting listesinde de kampanya/reklam bilgisi (henüz canlı değil, migration bekliyor)

Broker canlı Recruiting ekranını gösterip "hangi reklam üzerinden
geldiğini göremez miyiz" dedi — `leads.reklam_adi`/`kampanya_kodu`
sadece Lead Havuzu'nda duruyordu, Recruiting'e dönüşünce hiç
taşınmıyordu (`recruiting_candidates`'ta bu kolonlar hiç yoktu).

**Şema** (`20260802100000_recruiting_reklam_bilgisi.sql`, henüz
çalıştırılmadı): `recruiting_candidates`'a `reklam_adi text` ve
`kampanya_kodu text` eklendi — canlı join yerine denormalize edildi
(call_logs.reklam_kodu ile aynı desen), lead kaydı silinse/arşivlense
bile bilgi kalıcı kalsın diye.

**Kod**: `recruiting.create()` (`supabaseProvider.js`/`mockProvider.js`)
`kaynakLeadId` doluysa kaynak lead'in reklam bilgisini otomatik kopyalar
— forma yeni alan eklenmedi, danışman/broker hiçbir şey yapmıyor.
`RecruitingTable.jsx`'e `LeadTable.jsx` ile aynı desende gösterim
eklendi (Kaynak hücresinin/satırının altında küçük gri metin).

## 2026-08-02 — Lead Havuzu listesi: kampanya/reklam bilgisi artık satırda, satıra girmeye gerek yok

Broker geri bildirimi: "lead giren biri hiç içine girmeye gerek kalmasın"
— kampanya/reklam bilgisi (`reklamAdi`/`kampanyaKodu`) sadece Lead
Detayı'na girince görünüyordu, broker Portföy/Recruiting yönlendirme
kararını vermeden önce her satırı tek tek açmak zorunda kalıyordu.
`LeadTable.jsx`'e yeni `campaignLabel(lead)` helper'ı eklendi — hem
masaüstü tabloda (Tip hücresinin altında küçük gri metin) hem mobil
kartlarda (Tip satırının altında) doğrudan gösteriliyor, bilgi yoksa
hiçbir şey render edilmiyor. Kod içindeki eski yorum ("broker kampanya/
reklam adına bakıp Ad Soyad'ın yanında karar veriyor") aslında hiç
uygulanmamış bir niyeti tarif ediyordu — şimdi gerçek davranışla eşleşti.

## 2026-08-02 — Operasyon: "Fırsata Dönüştür" ikonu → "Müşterilerime Ekle" yazılı buton

Broker geri bildirimi: danışman kendi çağrısını fırsata aktarırken
tıklaması gereken buton sadece bir ok/uçak ikonuydu (Send), ne olduğu
anlaşılmıyordu (aynı "ikon anlaşılmıyor" deseni — bkz. Satılık/Kiralık
ikon vakası). `CallTable.jsx`'te hem masaüstü tablo hem mobil kart
görünümündeki buton, sadece ikon yerine ikon + "Müşterilerime Ekle"
yazısına çevrildi — Düzenle/Sil ikonlarının aksine bu işlem en sık
kullanılan/en önemli aksiyon olduğu için bilerek görsel olarak öne
çıkarıldı (metin etiketli). Fonksiyon (onConvertToOpportunity) değişmedi.

## 2026-08-02 — Danışman dropdown'ları alfabetik sıralandı

`lib/format.js`'e `sortByName(list)` eklendi — Türkçe İ/ı/Ş/Ğ/Ü/Ö/Ç doğru
sıralansın diye `localeCompare(..., 'tr')` kullanıyor. `Object.values(
knownUsers)` her yerde nesne ekleme sırasını (rastgele/kronolojik) veriyordu,
alfabetik değildi. Danışman SEÇİMİ yapılan her yerde uygulandı — Fırsatlar/
Operasyon atama, Lead Havuzu "Danışmana Ata", Recruiting/Lig danışman
listeleri, Takvim davetli seçimi, Planlama > Görevler atanan seçimi.
Panel/Takip/Eğitim'deki ekip DASHBOARD'ları (seçim değil, listeleme)
BİLEREK dokunulmadı — kendi mantıklı sıralamaları var.

## 2026-08-02 — Lead Havuzu → Portföy: broker artık SADECE danışman seçiyor

Bir önceki maddede Lead→Portföy dönüşümüne "Hangi danışmana atansın?"
seçimi eklenmişti ama NewOpportunityModal'ın koca formuyla birlikte
(mahalle zorunlu, fiyat, kategori, m², oda...). Broker bunu düzeltti:
"biz reklamlarda alıcı ve satıcı adaylarının [ikisini de] topluyoruz,
alıcı mı satıcı mı ben bunu bilmiyorum" — broker property'i hiç
tanımıyor, sadece reklamın kime ait olduğunu biliyor. Form tamamen yanlış
katmandaydı.

**Kök çözüm — Tür/Kategori artık düzenlenebilir:** Eskiden bir fırsat
oluşturulduktan sonra `type` (Satıcı/Alıcı) ve `category` HİÇ
değiştirilemiyordu ("hangi kutuya düştüğünü değiştirmek ayrı bir işlem
sayılır" kararı). Bu, broker'ın bilmediği bir şeyi ilk anda doğru tahmin
etmesini zorunlu kılıyordu — yanlış tahmin telafisi SQL gerektirirdi.
`supabaseProvider.js` `opportunities.update()`'e `type`/`category`
eklendi (mock zaten generic `Object.assign`, dokunmadı).
`EditOpportunityModal.jsx`'teki salt-okunur rozetler, `NewOpportunityModal`
ile AYNI Satıcı/Alıcı toggle + Kategori dropdown'a çevrildi.

**Yeni akış** (`AssignPortfolioLeadModal.jsx`, `Leads.jsx`
`handleAssignPortfolioLead`): Lead Havuzu'nda "Portföy" → "Operasyon'a
Gönder" artık bu minimal pencereyi açıyor — lead'in adı/telefonu/kampanya
bilgisi salt-okunur gösteriliyor, TEK etkileşim danışman seçimi. Kaydedince
`type:'satici', category:'diger'` gibi güvenli varsayımlarla, seçilen
danışmana DOĞRUDAN atanmış (claimed) minimal bir fırsat oluşuyor — mahalle/
fiyat/tür/kategori dahil her şeyi danışman kendi Fırsatlar ekranından ilk
incelediğinde tamamlıyor/düzeltiyor.

`danismanOptions` filtresi de düzeltildi — broker artık kendi adını da
("Ahmet Erdemir" listede yoktu) görüyor, broker de fiilen danışmanlık
yapabiliyor (`FirsatlarTab.jsx`'teki `assignableOptions` ile AYNI kapsam:
danışman + broker).

## 2026-08-02 — Recruiting'den gayrimenkul danışmanı ataması TAMAMEN kaldırıldı

Az önceki maddede sadece Lead Havuzu → Recruiting dönüşüm akışından
kaldırılmıştı (`hideAssignment` prop'uyla). Broker bunu genişletti:
"Recruiting menüsünde gayrimenkul danışmana atama diye bir seçim
olmamalı" — yani Recruiting'in KENDİ yönetim ekranında (+ Yeni Aday /
mevcut adayı düzenleme) da anlamsız. `RecruitingDetailModal.jsx`'ten
`atananDanismanId` select'i ve `hideAssignment`/`danismanOptions`
prop'ları tamamen silindi — artık koşulsuz, hiçbir yerde gösterilmiyor.

`RecruitingTable`/`RecruitingFilters`'taki "Atanan" sütunu ve filtresine
DOKUNULMADI — eski (bu karardan önce) atanmış kayıtlar varsa hâlâ
görünür/filtrelenebilir, sadece BİR DAHA buradan set edilemiyor. Kolon
DB'de duruyor, silinmedi (geriye dönük veri kaybı riski almadan).

## 2026-08-02 — Lead Havuzu dönüşümü: Recruiting'den danışman ataması kaldırıldı, Portföy'e elle atama eklendi

Broker kararı: Lead Havuzu sadece bir yönlendirme noktası — Recruiting'e
giden bir başvuruya gayrimenkul danışmanı atamak anlamsız ("biz herhangi
bir gayrimenkul danışmanı da bunu atamayacağız"), Portföy'e giden bir
lead'de ise broker reklam kampanya/reklam seti başlığına bakıp (zaten
görünen `reklam_adi`) hangi danışmanın reklamı olduğunu KENDİSİ tanıyıp
elle seçebilmeli — otomatik bir reklam→danışman eşleştirmesi YOK, broker
her seferinde kendi kararını veriyor.

**Recruiting** (`RecruitingDetailModal.jsx`): yeni `hideAssignment` prop'u
— true olunca "Atanmadı/[danışman]" select'i hiç render edilmiyor.
Sadece `Leads.jsx`'in dönüştürme akışında true; Recruiting sayfasının
kendi yönetim ekranındaki (aday zaten var/elle ekleniyor) kullanımına
DOKUNULMADI, orada hâlâ gösteriliyor.

**Portföy** (`NewOpportunityModal.jsx`): yeni `assignableOptions` prop'u
— verilirse "Hangi danışmana atansın? — seçilmezse havuza girer" select'i
en üstte görünür, seçilirse "Havuza at" kutusu (zaten anlamsız kalacağı
için) gizlenir. Seçim yapılırsa `Leads.jsx`'teki `handleOpportunitySubmit`
`targetOwnerId`/`selfClaim`'i o danışmana göre ayarlar (owner+claimer O
danışman olur, direkt kendisine düşer, havuza değil) — Operasyon'daki
"atanmış çağrıyı kendine çalma" düzeltmesiyle AYNI desen, sadece atamayı
seçen kişi bu sefer çağrının kendisi değil broker'ın kendi tanıması.

## 2026-08-02 — Ayarlar > Webhook Hataları + gerçek bir Meta lead kaybı vakası

Broker'ın "reklam bilgisi neden boş" sorusundan başlayan canlı bir olay
zincirinden çıktı (bkz. bu tarihli sohbet): `meta_webhook_errors` tablosu
vardı ama okumanın TEK yolu SQL'di — broker her seferinde SQL Editor'e
girmek zorunda kalıyordu. Vaka esnasında şu bulunup düzeltildi:

- **Meta App'in Sistem Kullanıcı token'ında `ads_read` izni eksikti**
  (sadece `leads_retrieval` vardı) — bu yüzden hangi reklamdan geldiği
  hiç çekilemiyordu. Kod hatası DEĞİL, Meta Business Manager tarafında bir
  izin eksikliğiydi; broker token'ı yeniledi.
- Bu eksiklik yüzünden **bir lead yanlış kategoriye düşmüştü**: kampanya
  adı `RECRUIT_...` ile başladığı için normalde otomatik "Recruiting"
  etiketlenmesi gerekirken, reklam bilgisi çekilemediğinde kod
  `kampanyaKodu`'yu hesaplayamıyor ve sessizce "Portföy" varsayılanına
  düşüyordu (bkz. `meta-leads-webhook/index.ts` `tip = kampanyaKodu ===
  'RECRUIT' ? ... : 'portfoy'`). Elle SQL ile düzeltildi.
- **Bir lead kalıcı olarak kayboldu**: `field_data` çekme adımı (lead'in
  isim/telefonunu Meta'dan almak) token geçersizken başarısız olmuş, lead
  hiç `public.leads`'e düşmemiş. Meta'nın veri saklama süresi dolduğu için
  isim/telefon geri getirilemedi — token düzeltildiğinde artık çok geçti.

**Yeni ekran** (`WebhookErrorsTable.jsx`, `Ayarlar.jsx` "Webhook Hataları"
sekmesi, broker/owner-only — `metaWebhookErrors_select` RLS ile aynı
kısıt): `meta_webhook_errors`'ı SQL'e inmeden gösterir. `graph_api_hatasi`
türü ikiye ayrılıyor — `hata_mesaji` "field_data çekilemedi" ile
başlıyorsa **"Lead kaybolmuş olabilir"** (kırmızı, en öncelikli — yukarıdaki
vakadaki gibi lead hiç kaydedilmemiş olabilir), "Reklam bilgisi
çekilemedi" ile başlıyorsa **"Sadece reklam adı eksik"** (amber, düşük
öncelik — lead zaten kayıtlı). Bu ayrım UI'da otomatik, tur sütununun
kendisi bunu ayırt etmiyordu — canlı vakada bunu SQL'i tek tek okuyarak
elle yapmıştık, artık ekran yapıyor.

## 2026-07-31 — Fırsat dönüşüm hatası: broker atanmış çağrıyı dönüştürünce kendine geçiyordu + "Sadece Benim" filtresi

Kod denetiminde bulundu (broker'ın "CRM mimarı gibi analiz et" talimatı
üzerine yapılan gözden geçirmede): Operasyon'da bir danışmana atanmış bir
çağrıyı broker/ofis "Fırsata Dönüştür" ile fırsata çevirdiğinde, oluşan
fırsat sessizce broker'a atanıyordu — atanan danışmanın adı hiç
geçmiyordu, "Havuza at" seçeneği de bu ekranda broker'a hiç
gösterilmiyordu (`showPoolToggle={role === ROLES.DANISMAN}`).

**Düzeltme** (`OperasyonTab.jsx`): `targetOwnerId = convertingCall.assignedTo || user.id`
— çağrı bir danışmana atanmışsa fırsat ONA (owner+claimer) kaydediliyor,
dönüştüren kişi (broker/ofis) kim olursa olsun. Atanmamış bir çağrıda
eski davranış (dönüştüren kişiye) korunuyor. "Havuza at" kutusu artık bu
ekranda HERKESE gösteriliyor (`showPoolToggle` sabit true), broker de
isterse havuza gönderebilsin diye.

`NewOpportunityModal`'a yeni `poolToggleNote` prop'u eklendi — varsayılan
"tik kapalıysa fırsat sende kalır" metnini ezip, hedef başka biriyse
("Zeynep Kaya adına kaydedilir" gibi) doğru kişiyi adıyla gösteriyor.

**"Sadece Benim" filtresi**: ilk denemede Fırsatlar sayfasına eklendi, ama
broker "fırsatlardan kaldıralım, Operasyon'a ekleyelim" diye düzeltti —
esas ihtiyaç kendine ATANAN ÇAĞRILARI ayırt etmekti. `FirsatlarTab.jsx`'teki
toggle geri alındı, yerine `CallFilters.jsx`'e "Herkes / Sadece Benim"
eklendi (`OperasyonTab.jsx`, sadece isManager'da görünür — danışman zaten
RLS'te yalnız kendine atananı görüyor). Şemada "kim ekledi" diye ayrı bir
alan olmadığından `call.assignedTo === user.id` üzerinden filtreleniyor.

## 2026-07-31 — Satılık/Kiralık: ikon yerine kısa harf kodlu rozet

Broker geri bildirimi: bir önceki maddedeki ikon (Satılık=ev, Kiralık=
anahtar) "hiç anlaşılmıyor" — soyut bir sembolün ne anlama geldiğini
tahmin etmek gerekiyordu, sözcüğe hiç yakın değildi.

Çözüm: `CallTable`'daki `KaynakBadge` (Kynk sütunu: S/R/WS/D) ile AYNI
dilde küçük, renkli, kısa harf kodlu rozet — `ISLEM_TIPI_ICONS`/
`ISLEM_TIPI_ICON_STYLES` kaldırıldı, yerine `ISLEM_TIPI_CODES` geldi
(`lib/opportunities.js`): Satılık="SAT" (sky), Kiralık="KİR" (fuchsia).
"S" bilerek kullanılmadı — CallTable'da aynı satırda Kynk sütunundaki "S"
(Santral) ile karışırdı. Rozet zaten kelimeye yakın olduğu için ayrıca
sözcük yazmaya (tam "Satılık"/"Kiralık" pill) gerek kalmadı — bu da bir
önceki "göz yoruyor" bulgusuna geri dönmeden kompakt kalmasını sağladı.

`OpportunityTable` (Mahalle sütunu) ve `CallTable` (arayanAd yanı, sadece
call.opportunityId doluysa) aynı rozeti kullanıyor; RLS izin vermeyen
kayıtlarda (`islemTipiByOpportunityId`'de karşılığı yoksa) CallTable genel
"dönüştü" Target ikonuna düşmeye devam ediyor. Form seçimi (NewOpportunity/
EditOpportunityModal toggle butonları) yine dokunulmadı.

## 2026-07-29 — Satılık/Kiralık: renkli rozet yerine küçük ikon

Broker geri bildirimi: bir önceki maddedeki renkli rozet ("Satılık"/
"Kiralık" yazılı dolgulu pill) hem OpportunityTable hem CallTable'da
"listeyi göz yoruyordu". Ayrıca Operasyon'da bir çağrı Fırsata (özellikle
Alıcı tarafına, ör. kiralık arayan bir müşteri) dönüşünce "Portföy:
Alındı" yazısının kelime olarak pek oturmadığı da not edildi — ama çözüm
olarak yeni bir durum/kelime icat etmek yerine (ör. "Arayış Başladı"),
konunun bağlamını (satılık mı kiralık mı) bir İKONLA anında görünür
kılmak tercih edildi; "Alındı/Almadık/Bekliyor" metinleri hiç değişmedi.

`ISLEM_TIPI_ICONS`/`ISLEM_TIPI_ICON_STYLES` eklendi (`lib/opportunities.js`)
— Satılık=ev (Home), Kiralık=anahtar (Key), gerçek emlak ilanlarındaki
yaygın sezgisel kullanım. Renkli rozet (`ISLEM_TIPI_STYLES`) SADECE
`OpportunityDetailModal`'da (tek kayıtlık detay, liste değil) kaldı;
`OpportunityTable`'da Mahalle sütununun başına küçük bir ikona indirgendi
("Tür" sütunu artık sade metin, kategori). `CallTable`'da ise bir çağrı
Fırsata dönüşünce (call.opportunityId) `arayanAd`'ın yanında AYNI ikon
gösteriliyor — bunun için `OperasyonTab.jsx` artık `opportunities`
listesini de çekip `islemTipiByOpportunityId` haritası oluşturuyor (RLS
izin vermeyen kayıtlarda ikon sessizce gösterilmiyor, genel "dönüştü"
Target ikonuna düşülüyor — iki ikon birden gösterilmiyor, tekrar/kalabalık
olmasın diye).

Katılım tipi seçimindeki (Zorunlu/Önerilen/İsteğe Bağlı) veya Satılık/
Kiralık FORM seçimindeki (NewOpportunityModal/EditOpportunityModal
buton toggle'ları) hiçbir şey değişmedi — broker'ın "biz seçelim ama"
ifadesi bu seçim mekanizmalarının aynen kalmasını, sadece LİSTE
görünümünün sadeleşmesini istediğini doğruladı.

## 2026-07-29 — Fırsatlar: Satılık/Kiralık + Operasyon'dan direkt dönüştürme

Broker'ın iki bulgusu — ikisi de doğrulandı, kodda gerçekten yoktu:

**1) Satılık/Kiralık hiç yoktu.** Fırsatlar formunda sadece Satıcı/Alıcı
(taraf) ve Konut/Ticari/Arsa/Diğer (emlak tipi) vardı, mülkün satılık mı
kiralık mı olduğu hiç sorulmuyordu. Eklendi: `opportunities.islem_tipi`
(migration `20260729230000_islem_tipi_ve_cagri_donusum.sql`,
`'satilik'|'kiralik'`, NOT NULL DEFAULT 'satilik' — geriye dönük tüm
kayıtlar satılık sayılıyor). Broker kararı: **hem Satıcı hem Alıcı**
tarafında geçerli (Alıcı için "satın almak mı kiralamak mı istiyor"),
kiralık seçilince fiyat alanının placeholder'ı da değişiyor ("Aylık Kira
(₺)" / "Kira bütçesi min-max (₺)"). `NewOpportunityModal` VE
`EditOpportunityModal`'da düzenlenebilir (type/category'nin aksine "hangi
kutu" değişimi sayılmıyor, konum/fiyat gibi düzeltilebilir bir detay).
Rozet: `OpportunityTable` (Tür sütununda kategori yanında), `OpportunityDetailModal`
(üstteki rozet satırında + fiyatın yanına kiralıksa "/ ay"). BİLİNÇLİ
kapsam dışı: `computeBoxCounts` (Fırsatlar'daki 8 kutu) değiştirilmedi —
Satıcı/Alıcı × 4 kategoriye üçüncü bir eksen (× 2 işlem tipi = 16 kutu)
eklemek kalabalıklaştırırdı, rozet tabloda/detaya yeterli. Panel.jsx'in
`OpportunityMiniRow`'una (Açık Fırsatlar mini widget) da eklenmedi — o
zaten çok dar, kategori+konum+fiyat+tarih tek satırda sığıyor.

**2) Operasyon'dan Fırsata direkt dönüştürme hiç yoktu.** `call_logs.
opportunity_id` kolonu VE "Fırsata dönüştü" ikonu (CallTable.jsx) zaten
vardı ama hiçbir akış bu alanı YAZMIYORDU — yarım bırakılmış bir özellik.
Broker: "Santral/Sponsorlu'dan gelen bir çağrı zaten bilgisayar yazıyor,
ben onu hiçbir şeye dokunmadan havuza atabilir miyim". Lead Havuzu'ndaki
"Fırsata Dönüştür" ile BİREBİR aynı desen CallTable satırlarına eklendi
(Send ikonu, "Fırsata Dönüştür" title) — tıklanınca `NewOpportunityModal`
`arayanAd`/`arayanTelefon` ile ÖN DOLU açılıyor, isim/telefon tekrar
yazılmıyor (mahalle/fiyat gibi telefonda konuşulmayan bilgiler yine de
girilmeli — tam "hiçbir şeye dokunmadan" değil, ama en can sıkıcı
tekrarı ortadan kaldırıyor). Buton SADECE çağrıyı üstlenen danışman veya
yönetim için görünüyor, `call.opportunityId` doluysa (zaten dönüştüyse)
gizleniyor.

Havuza atma seçimi: Lead Havuzu dönüşümünün AKSİNE (o her zaman havuza
gider, selfClaim hep false) burada FirsatlarTab.jsx'in "Yeni Fırsat"
akışıyla AYNI kural kullanıldı — danışman/broker "Havuza at"ı
işaretlemezse fırsat direkt kendine atanır. Gerekçe: bir Lead Havuzu
kaydı dönüşümden ÖNCE zaten paylaşılan bir kaynak, ama bir Operasyon
çağrısı zaten `assignedTo` ile TEK bir danışmana atanmış oluyor — kendi
çalıştığı müşteriyi otomatik havuza zorlamak yanlış olurdu, seçim
bırakıldı (broker'ın "havuza atabilir miyim" sorusu zaten "seçebilmek"
istediğini gösteriyordu).

Yan otomasyon: dönüşüm anında çağrının `portfoyAlindiMi`'si de otomatik
"Alındı" yapılıyor — Fırsat oluşup Süreç zincirinde "Portföy: Bekliyor"
çelişkili görünmesin diye.

## 2026-07-29 — Aylık Etkinlik Panosu: gerçek Takvim'e bağlandı (WhatsApp/TV görseli)

Daha önce sadece bir tasarım örneği (artifact, Temmuz 2026 uydurma
verilerle) olarak gösterilen "Aylık Etkinlik Panosu" gerçek Takvim'e
bağlandı — Planlama sayfasında yönetici (broker/owner/ofis) artık "Aylık
Pano" butonuyla o ayın panosunu görüp PNG olarak indirebiliyor.

**Etkinlik seçimi:** brief'teki gibi yönetici işaretleyerek seçiyor (tüm
takvim otomatik DEĞİL) — Yeni/Düzenle Etkinlik formuna "Aylık Etkinlik
Panosunda göster" checkbox'ı eklendi (`calendar_events.pano_goster`,
migration `20260729210000_etkinlik_panosu.sql`, NOT NULL DEFAULT false).
Panoda SADECE bu işaretli etkinlikler görünür — hem takvim ızgarasındaki
ikonlar hem "Bu Ay Seni Neler Bekliyor?" kartları için (broker/1-1
görüşmeleri gibi özel etkinlikler sosyal medyaya sızmasın diye).

**Format:** şimdilik SADECE 16:9 (WhatsApp/TV) yapıldı — Instagram Story
(9:16) ve A4 baskı ayrı, sonraki bir adım (farklı en-boy oranı = farklı
yerleşim, ayrı bir tasarım işi). `EventBoard.jsx`/`EventBoard.css`
component'i tasarım aşamasındaki artifact'in NEREDEYSE BİREBİR AYNISI —
cqw/cqh container query birimleri (`container-type: size` şart, bkz. o
zamanki bulgu) aynen taşındı, sadece font embedding (@font-face base64)
ve logo/QR base64 embedding kaldırıldı — gerçek uygulamada Poppins/
Montserrat zaten global yüklü (`--font-sans`), logo `/panel/remax-
balloon.png`'den, QR `qrcode` paketiyle (KartvizitCard.jsx'teki aynı
desen) canlı üretiliyor. İndirme `html-to-image`'in `toPng()` fonksiyonuyla
(ShareCardModal.jsx'teki AYNI desen, pixelRatio:2).

**Etkinlik ikonları/renkleri:** ilk tasarımdaki uydurma 6 kategori
(Haftalık Toplantı/Ticari Toplantı/Recruiting/Ödül Töreni...) YERİNE
uygulamanın GERÇEK 5 etkinlik tipi kullanıldı (Toplantı/Eğitim/Etkinlik/
Broker Görüşmesi/Koçluk Görüşmesi — `EVENT_TYPE_LABELS`/`EVENT_TYPE_COLORS`,
Takvim'in geri kalanıyla aynı renkler) — veri modelinde olmayan bir
taksonomi icat etmek yerine var olanı kullanmak daha doğru.

**Katılım rozeti panoda BİLEREK kişiye özel değil** (broker'ın kararı —
bkz. bir önceki madde): her kartta o etkinliğin davetlilerinden en az biri
zorunlu ise kırmızı "Zorunlu" rozeti, yoksa en az biri önerilen ise amber
"Önerilen" rozeti, hepsi isteğe bağlıysa/davetli yoksa hiç rozet yok.
Kişisel "Senin için Zorunlu" bilgisi sadece Portal'da (Panel/Takvim).

**Bu Ayın Odak Noktaları — gerçek veri kaynakları:**
- Tamamlanması Gereken Eğitim: `moduleProgressFor`/`checklistProgress`
  (Panel.jsx'teki `educationGaps` ile aynı hesap)
- Doğum Günleri: ayrı bir veri kaynağı YOK — Ayarlar.jsx'in kullanıcı
  oluştururken otomatik eklediği `🎂 {isim} — Doğum Günü` başlıklı takvim
  etkinliklerinden regex ile çıkarılıyor (zaten var olan bir kayıt,
  tekrar icat edilmedi)
- Lig Güncelleme: aktif dönemin (`periods[0]`) `ad` alanı
- Ayın En Büyük Etkinliği: panoya işaretli etkinlikler arasından en çok
  davetlisi olan (heuristik — "en büyük" için başka bir sinyal yok)
- **Ayın Portföy Hedefi BİLEREK EKLENMEDİ** — uygulamada aylık hedef
  belirleme diye bir kavram/veri yok, uydurmak yerine bu satır atlandı.
  Broker isterse ayrı bir "hedef belirleme" özelliği olarak ele alınmalı.

**Yan not — regresyon düzeltmesi:** Bu çalışma sırasında `Ayarlar.jsx`'teki
doğum günü otomatik takvim ekleme akışının önceki turda (katılım tipi
değişikliğinde) kırıldığı fark edildi — hâlâ eski `inviteeIds` formatını
gönderiyordu, yeni `katilimTipleri` sözlüğünü değil, bu yüzden doğum günü
etkinlikleri davetsiz (0 katılımcı) oluşuyordu. Düzeltildi.

**Sonraki turda eklenen ince ayar — paylaşıma özel seçim:** Broker: "biz
bunu paylaşım yapacağımız zaman istediklerimizi seçebilelim" — "Panoda
göster" işareti sadece o ayın ADAY listesini belirliyor (etkinlik
oluşturulurken bir kere işaretlenir), ama her paylaşımda hepsinin
görünmesi gerekmeyebilir. Bu yüzden `EventBoardModal`'a ayrıca, sadece O
GÖRSELE özel bir checkbox listesi eklendi ("Bu Paylaşıma Dahil Et") — ay
değişince adayların hepsi varsayılan seçili gelir, paylaşmadan önce
istemediğini tek tek çıkarabilir. Bu seçim hiçbir yere KAYDEDİLMİYOR
(sadece modal açıkken yaşayan geçici state) — her açılışta yeniden aday
listesinin tamamından başlar. Şema değişikliği gerektirmedi, saf
client-side bir filtre.

## 2026-07-29 — Etkinlik katılımı: kişi bazlı Zorunlu / Önerilen / İsteğe Bağlı

Broker'ın bulgusu ve sonraki genişletme talebi: aynı etkinliğe (ör. Base
Camp eğitimi) bazı danışmanlar zorunlu, bazıları önerilen, bazıları isteğe
bağlı katılabiliyor — eskiden `event_attendance`'ta bu bilgi hiç
tutulmuyordu. Katılım tipi etkinliğin kendisine DEĞİL, her davet satırına
eklendi (migration `20260729190000_katilim_zorunluluk.sql`,
`event_attendance.katilim_tipi`, `'zorunlu'|'onerilen'|'istege_bagli'`,
NOT NULL DEFAULT 'zorunlu' — geriye dönük tüm eski davetler önceki
davranışla aynı şekilde zorunlu sayılıyor). "Davet Edilmedi" ayrı bir enum
değeri DEĞİL — o kullanıcı için `event_attendance`'ta hiç satır yoksa
zaten davetli değildir, bu yeterli (4 seçenekten 3'ü DB değeri, 4.'sü
yokluk).

(Önceki tasarım — sadece "davetliler" + ayrı "isteğe bağlı alt kümesi" iki
adımlı chip akışı — bu maddeyle TAMAMEN değiştirildi, henüz production'a
hiç deploy edilmemişti.)

`NewEventModal`'da tek, birleşik bir liste var: her bilinen kullanıcı için
bir satır — checkbox (toplu işlem için) + isim + açılır liste (Davet
Edilmedi / Zorunlu / Önerilen / İsteğe Bağlı, varsayılan "Davet Edilmedi").
Bir kişiyi davet etmek = dropdown'dan bir katılım tipi seçmek; ayrı bir
"davet et" adımı yok. Üstte, en az bir kişi işaretliyken beliren toplu
işlem çubuğu ("Seçilenleri: Zorunlu Yap · Önerilen Yap · İsteğe Bağlı
Yap") — checkbox'lar dropdown değerinden bağımsız, admin önce "yeni
başlayanlar"ı işaretleyip Zorunlu Yap'a basıyor, sonra başka bir alt
kümeyi işaretleyip Önerilen Yap'a basıyor gibi çok geçişli bir akışı
destekliyor. Liste `max-h-56 overflow-y-auto` — büyük ekip listesi modalı
şişirmesin diye.

Rozet/etiket iki ayrı sözlükle ayrılıyor (`lib/calendar.js`):
`KATILIM_TIPI_LABELS` (üçüncü şahıs, "Zorunlu"/"Önerilen"/"İsteğe Bağlı" —
EventDetailModal'da yönetimin BAŞKALARININ katılım tipini gördüğü liste)
ve `KATILIM_TIPI_SELF_LABELS` (birinci şahıs, "Senin için Zorunlu"/"Sana
Öneriliyor"/"İsteğe Bağlı" — EventDetailModal'ın "Katılım Durumun"
bölümünde ve Panel.jsx'in danışman "Yaklaşan Etkinlikler" kartında,
danışman KENDİ durumunu görürken). Renk: Zorunlu=kırmızı, Önerilen=amber,
İsteğe Bağlı=nötr gri (`KATILIM_TIPI_STYLES`) — kritik/uyarı renk kuralına
paralel, ATTENDANCE_STATUS_STYLES ile aynı aile.

Kapsam dışı bırakılan: `EditEventModal` davetli listesini hiç düzenlemiyor
(zaten önceki davranış — "ayrı bir işlem sayılıyor"), katılım tipi de
invite anında set ediliyor, sonradan değiştirme UI'ı yok (broker isterse
ayrı ele alınmalı). Aylık Etkinlik Panosu tasarımındaki (bkz. artifact,
henüz koda bağlanmadı) tek rozet kişiye özel DEĞİL ve olmamalı — pano
(WhatsApp/TV) tek, herkese aynı görsel, broker'ın kendi kararı: pano genel
bir rozet göstermeli (ör. "Bazı Danışmanlar İçin Zorunlu"), kişiye özel
gerçek durum sadece Portal'da (bu değişiklikle) görülüyor. Bu ileride pano
otomasyonu inşa edilirken uygulanacak.

Raporlama için (broker'ın "ileride büyümeye uygun" isteği): `katilim_tipi`
ve `status` (RSVP) aynı satırda birlikte durduğu için "zorunlu eğitim
katılım oranı", "kaç zorunlu etkinlik kaçırıldı" gibi raporlar ek bir
tabloya gerek kalmadan bu iki alanın kombinasyonuyla hesaplanabilir — şu an
böyle bir rapor EKRANI yok, sadece veri modeli buna hazır.

## 2026-07-29 — Panel/Dashboard: üstteki tarih filtresi hangi kartları etkiliyor

Broker'ın "Tarih Filtresi Kararları" briefi — bir önceki maddedeki yeni
Dashboard'un HANGİ kartlarının üstteki tarih filtresini (7 gün/30 gün/4 ay/
Yıl/Tümü/Özel) dinleyeceği netleştirildi. Filtre seçenekleri DEĞİŞMEDİ
(90 gün eklenmedi, "4 ay" aynen kaldı) — sadece hangi kartın filtreye göre
yeniden hesaplandığı netleşti:

**Filtreyi dinleyen** (zaten filtreliydi veya bu maddeyle filtreli hale
getirildi): Operasyon (çağrı sayısı + artık "yeni lead" detayı da —
`leadStats` önceki maddede bilerek bağımsız bırakılmıştı, broker'ın açık
talimatıyla bu karar TERSİNE çevrildi), Portföy, Recruiting (`recruitingStats`
de aynı şekilde artık filtreli), Reklam Kaynakları.

**Filtreden bağımsız kalan** (broker'ın açık kararı — "her kartı zorla
tarih filtresine bağlamayacağız, ürün mantığı açısından yanlış"): Haftanın
Liderleri (Lig'in kendi aktif dönemini gösterir — kart başlığının altına
"Aktif lig dönemi" notu eklendi), Portal Kullanımı (sabit Bugün/Son 7 gün/
7+ gün kovaları — "Güncel giriş durumu" notu eklendi), Dikkat Gerekiyor
("Açık konular" notu eklendi), Yaklaşan Etkinlik (artık `upcomingEvents`
— filtreli, danışman/ofis'in kullandığı liste — DEĞİL, yeni ayrı bir
`nextEventsAlways` listesi kullanıyor; "En yakın etkinlik" notu eklendi).
Ofisin Nabzı'ndaki "Etkinlik" KPI kutusu da aynı `nextEventsAlways` sayısını
gösteriyor — aksi halde aynı ekranda aynı kavram ("kaç etkinlik var") için
iki farklı sayı görünürdü.

**Not (kendi kararım, broker'a açıkça sorulmadı):** "Eğitim" KPI kutusu ve
"Eğitim — Geride Kalanlar" kartı da bilerek bağımsız bırakıldı —
`educationGaps` bir AKIŞ değil BACKLOG metriği ("kaç kişi %100 altında"),
Dikkat Gerekiyor ile aynı mantık. Modül/checklist'in `doneAt` tarihi var
ama bunu "bu aralıkta kaç kişi tamamladı" gibi ayrı bir aktivite metriğine
çevirmek brief'te istenmedi, mevcut "geride kalanlar" anlamını bozardı.
Broker bunu farklı isterse ayrıca ele alınmalı.

## 2026-07-29 — Panel/Dashboard: Broker/Owner için baştan tasarım (Ofisin Nabzı + Dikkat Gerekiyor)

Bir önceki maddedeki `ProcessSummaryTable` (tek büyük tablo) bu maddeyle
TAMAMEN kaldırıldı — broker'ın "panele girer girmez tüm süreçlere hakim
olmak istiyorum ama hala okunaklılığa ulaşamadık" geri bildirimi üzerine
önce ASCII wireframe onayı alınıp (bkz. brief süreci), sonra React'e
geçildi. Sadece `isBrokerOrOwner` rolünü etkiliyor — Ofis ve Danışman
dashboard'ları (Lig Durumu podyumu, Danışman Sağlık Skoru vb.) bilerek
dokunulmadan bırakıldı, Playwright ile rol bazlı ekran görüntüleriyle
doğrulandı.

Yeni bileşenler (`components/panel/`):
- **`OfisinNabziGrid`** — 6 KPI kutusu (Operasyon, Portföy, Recruiting,
  Etkinlik, Eğitim, Kritik Uyarılar), masaüstünde tek satır (`lg:grid-cols-6`).
  Lead Havuzu ayrı kutu DEĞİL, Operasyon kutusunun "detail" satırına
  dahil edildi (brief'in açık kararı). "Kritik Uyarılar" kutusu ayrı bir
  sayfaya gitmiyor, aynı sayfada `#dikkat-gerekiyor`'a scroll ediyor.
- **`DikkatGerekiyorList`** — KRİTİK (kırmızı) / UYARI (amber) rozetli
  liste, her zaman render ediliyor; problem yoksa kart gizlenmek yerine
  tek satır yeşil "Şu anda müdahale gerektiren bir konu bulunmuyor."
  gösteriliyor.
- **`WeeklyLeadersCard`** — eskiden 3 ayrı kart (Ciro/Memnuniyet/Sosyal
  Medya) olan Lig liderleri artık TEK kartta, her kategorinin sadece
  1. sırası tek satır; o dönem hiç veri girilmemiş kategori hiç
  gösterilmiyor.

`Panel.jsx`'te `usageBuckets` ("Portal Kullanımı") 3 kesişmeyen kovaya
netleştirildi: Bugün (son giriş bugün) / Son 7 gün (bugün hariç, 1-7 gün
önce) / 7+ gün (7 günden fazla veya hiç giriş yok) — eski hali "dün"
ile "7 gün" arası tanımsız bir boşluk bırakıyordu.

Renk kuralı SADECE bu yeni bölümde değişti: `Widget` bileşenine
`accent="navy"` prop'u eklendi — broker bölümündeki normal aksiyon
linkleri ("X'e git →") artık kurumsal lacivert, kırmızı sadece gerçekten
kritik durumlar için ayrıldı (Kritik Uyarılar kutusu, KRİTİK rozeti).
Uygulamanın geri kalanı (danışman/ofis widget'ları, diğer tüm sayfalar)
eski kırmızı-link kuralında bırakıldı, `accent` default'u `'red'`.

Broker'ın açıkça reddettiği bir öneri: ağırlıklı "Genel Performans" skoru
(dönüş oranı + fırsat sağlığı + eğitim + dikkat-gerekiyor sayısından tek
bir 0-100 puan). Gerekçe: "Henüz sağlam ve güvenilir bir formülü yok,
rastgele ağırlıklarla üretilen 91/100 gibi bir sayı yöneticiye gerçekte
olduğundan daha kesin bilgi verir." Bu skor EKLENMEDİ — formül netliği,
tanımlı ağırlıklar, tarihsel karşılaştırma ve davranış açıklaması
netleşmeden tekrar gündeme getirilmemeli.

## 2026-07-28 — Panel: dağınık halka/kart grid'i yerine tek Süreç Özeti tablosu (SONRADAN KALDIRILDI — bkz. 2026-07-29 maddesi)

"Dashboard'a girer girmez Office'in tüm süreçlerine hakim olmak
istiyorum" isteği — eskiden Operasyon/Fırsatlar/Yaklaşan Etkinlik/Eksik
Eğitim dört ayrı `StatCard` (yüzdelik halka) kartına dağılmıştı, **Lead
Havuzu ve Recruiting Panel'de hiç yoktu**. Yeni `ProcessSummaryTable`
bileşeni (bkz. `components/panel/`) altı süreci (Operasyon, Fırsatlar/
Portföy, Lead Havuzu, Recruiting, Etkinlikler, Eğitim) TEK bir tabloda,
satır satır gösteriyor — her satır ilgili sayfaya link, dikkat
gerektiren sayı (atanmamış çağrı, 24s+ işlenmemiş lead, %100 altında
eğitim vb.) kırmızı rozetle vurgulanıyor. En üstte, "Dikkat Gerekiyor"
bölümünden bile önce render ediliyor (bkz. "panele girer girmez"
isteği). `Panel.jsx`'in `loadAll()`'ına `leads`/`recruitingCandidates`
eklendi — RLS zaten broker/owner dışı rollerde boş dizi döndürüyor,
tablo da zaten sadece `isBrokerOrOwner`'da render ediliyor. Artık hiç
kullanılmayan `StatCard`/`SegmentedRing` bileşenleri kaldırıldı (bkz.
"ölü kod bırakma" kuralı).

Lead Havuzu/Recruiting sayıları BİLEREK üstteki tarih filtresinden
bağımsız — "Dikkat Gerekiyor" bölümüyle aynı gerekçe, o anki gerçek
duruma bakılmalı, seçili tarih aralığına göre değişmemeli.

## 2026-07-28 — capitalizeFirst: caps-lock notlarını normalize ederken yer adlarını koru

Bir önceki maddedeki düzeltmeden SONRA bile yeni girilen bazı notlar
büyük harfle kalmaya devam ediyordu ("hala büyük yazmaya devam
edilebiliyor" bulgusu) — sebep `capitalizeFirst`'ün sadece ilk harfi
büyütüp gerisine dokunmaması: metin baştan sona büyük harfle yazılmışsa
(caps lock) ilk harf zaten büyük olduğu için hiçbir şey değişmiyordu.
`capitalizeFirst` artık metin TAMAMEN büyük harfse önce küçültüyor, SONRA
ilk harfi büyütüyor. Bunu yaparken bilinen özel isimlerin (81 il +
ofisin çalıştığı bölgedeki sık geçen ilçeler — Çorlu, Çerkezköy, Ergene
vb., `PROPER_NOUNS` sabiti) küçülmemesi için ayrıca bir eşleştirme
katmanı var — tam dil bilgisi doğruluğu (kişi adları dahil) kapsamlı bir
sözlük/NLP gerektirdiği için kapsam bilerek yer adlarıyla sınırlandırıldı
(bkz. "dil bilgisine uygun olsun" isteği). `capitalizeFirst` tüm notlar/
açıklama alanlarında ortak kullanıldığı için (Lead Havuzu, Recruiting,
Operasyon) tek yerden düzeltilip her yerde otomatik etkili oldu.

## 2026-07-28 — Aynı telefonla tekrar kayıt girilirse uyarı (Operasyon + Recruiting)

"Yeni Çağrı" (Operasyon) ve "Yeni Aday" (Recruiting) formlarında, girilen
telefon numarasıyla eşleşen mevcut bir kayıt varsa formun altında
bilgilendirici bir uyarı gösteriliyor (isim + tarih, göreceli değil net
"gg.aa.yyyy" formatında — `lib/format.js`'e eklenen `formatDateOnly`).
Engellemiyor, sadece bilgi veriyor. `RecruitingDetailModal` hem "+ Yeni
Aday" hem Lead Havuzu'ndan "Recruiting'e Gönder" akışında kullanıldığı
için kontrol SADECE `candidate` prop'u boşken (yeni kayıt) çalışıyor —
düzenlerken kayıt kendi numarasıyla eşleşip yanlış uyarı vermesin diye.

## 2026-07-28 — Operasyon çağrı tablosu: açıklama artık alt satırda tam görünüyor

Notlar (açıklama), dar "Arayan" sütununa sıkışıp `line-clamp-2` ile 2
satırdan sonra kesiliyordu. `CallTable.jsx`'te not varsa artık ayrı, tüm
genişlikte bir alt `<tr>` ile tam metin gösteriliyor (masaüstü tabloda
`Fragment` ile iki satır; mobil kartta zaten kesilmiyordu, değişmedi).

## 2026-07-28 — Lead Havuzu: satırdan tek tıkla Recruiting/Portföy'e gönder

Kampanya adı artık `RECRUIT_.../SATICI_.../MARKA_...` önekiyle otomatik
`tip` tahmin etmek yerine (bkz. aşağıdaki "Kampanya/Reklam Seti/Reklam adı
birleşik" maddesi) çoğunlukla elle karar gerektirdiği için, `LeadTable.jsx`
her satıra "Recruiting" ve "Portföy" hızlı gönderme butonları eklendi —
broker `reklam_adi`'na bakıp Lead Detayı'nı hiç açmadan doğrudan hedef
formunu (Fırsat/Recruiting oluşturma) açabiliyor. Zaten yönlendirilmiş
(durum=atandi) satırlarda gösterilmiyor. `Leads.jsx`'teki mevcut
`handleConvertToRecruiting`/`handleConvertToOpportunity` fonksiyonları
aynen kullanılıyor, yeni bir akış değil — sadece tetikleyici satırdan da
erişilebiliyor.

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
