# Portal Kurulu Raporu — Menü İşleyişi ve Seçim Butonları

**Tarih:** 2026-11-15
**Konu:** Portalın menü/navigasyon işleyişi (Sidebar, Topbar, MobileBottomNav, ProfileMenu,
`lib/modules.js`) ve formlardaki seçim butonları (segmented/pill/Evet-Hayır/tip seçimi —
özellikle `CiroRaporuFormModal.jsx`, `BankaHareketleriPanel.jsx`, `OpportunityDetailModal.jsx`)
nasıl işliyor, içerikleri ne kadar doğru/tutarlı, ne önerilir.
**Yöntem:** 5 denetçi (.claude/agents/ tanımları birebir) bu konu için ayrı ayrı, birbirinin
sonucunu görmeden çalıştırıldı. Sırasıyla: kod-güvenlik-denetçi + veri-zinciri-analisti
(paralel) → kullanılabilirlik-denetçi + görsel-denetçi (paralel) → iş-değeri-analisti.
**Not:** `OpportunityDetailModal.jsx`'teki kademeli (cascading) alan mantığı 2026-10-04 tarihli
ayrı bir raporda (`docs/kurul/raporlar/2026-10-04-kademeli-menu-secim.md`) zaten incelenmişti —
denetçilere bu raporla çakışan bulguyu tekrar etmemeleri söylendi, aşağıdakiler yeni bulgular.

---

## 1. Yayına engel olanlar

**[İhlal] [Kritik] "Dış ofis mi?" üst-seviye seçimi hiç kaydedilmiyor, alt seçimle senkron
değil** (veri-zinciri-analisti)
- `CiroRaporuFormModal.jsx`: `disOfisVarMi` (Evet/Hayır buton grubu) sadece ekranda zorunlu bir
  soru gibi davranıyor; `saticiTemsilciTipi`/`aliciTemsilciTipi` (Kendi Danışmanımız/Başka Ofis)
  ile hiç bağlı değil VE `onSubmit()` payload'ında **hiç gönderilmiyor**. Sonuç: biri "Evet,
  başka ofis" deyip alt seçimi "Kendi Danışmanımız"da unutursa rapor sessizce "dış ofis yok"
  kaydedilir (bu sorunun kendisi — bkz. Birgül Özdemir vakası — formun kendi yorumunda bu soruyu
  var eden neden olarak yazılı); tersi durumda "Hayır" dense de alt seçim "Başka Ofis" kalmışsa
  kayıt `dis_ofis_mi=true` ile üst cevapla çelişerek saklanır.
- Dayanak: CLAUDE.md "10 soru" madde 3 ve 8; dosyanın kendi yorumu bu soruyu tam bu hatayı
  önlemek için eklediğini söylüyor ama bağlayıcı değil.
- Çözüm: `disOfisVarMi` değişince alt seçimleri sıfırla (`false` → ikisi de `'kendi'`); "Evet"
  seçiliyken en az bir tarafın dış ofis olmasını `canSubmit`/`eksikAlanlar`'a ekle; alan payload'a
  dahil edilsin.

Bu bulgu düzeltilmeden modülün "doğru tasarlanmış" sayılması önerilmez. (Diğer 3 denetçiden
Kritik seviyede ek bulgu gelmedi — aşağıdaki öncelik listesindeki Önemli/İhlal'ler ayrıca takip
edilmeli ama yayını durdurmaz.)

---

## 2. Birleştirilmiş öncelik listesi

### [İhlal] — 1 denetçi, Önemli: Portföy Tipi "Portföyüm"e dönünce otomatik üretilen dış-ofis
beyan kodu temizlenmiyor
- `CiroRaporuFormModal.jsx` satır 28-36, 582-598: "Dış Portföy" seçilince boşsa otomatik
  `DIS-XXXXX` üretiliyor; kullanıcı "Portföyüm"e dönerse bu kod kalıyor — izlenebilirliği
  bozuyor (dosyanın kendi tasarım niyeti burada ihlal ediliyor).
- Çözüm: Portföy Tipi `onClick`'inde `key==='portfoyum'` seçilince `disBeyanKodu` `DIS-` ile
  başlıyorsa temizlensin.

### [İhlal] — 1 denetçi, Önemli: Harita RPC'si (`harita_kayitlari_v3`) menüde ofis'e kapalı
ama fonksiyon seviyesinde rol kontrolü yok
- `lib/modules.js`'te Harita `FINANS_ROLES`'e (broker/owner/danışman/muhasebe) kısıtlı, ofis
  görmüyor — ama `harita_kayitlari_v3` RPC'si içinde sadece `is_active()` kontrolü var, rol
  kontrolü yok; `anon`'dan `EXECUTE` geri alınmamış, Supabase advisor bunu anon-çağrılabilir
  işaretliyor. Ofis (veya menüde olmayan herhangi bir rol) konsoldan `rpc()` ile ofis geneli
  satış/portföy/danışman verisini okuyabilir. KVKK md.4/12 açısından hukuki kontrol gerektirir
  (hukuki yorum yapılmadı).
- Çözüm: fonksiyona `is_finans_yetkili()` kontrolü ekle + `anon`'dan `EXECUTE REVOKE` et.

### [İhlal] — 1 denetçi (görsel), 2 bulgu: Marka dışı stok renkler + düşük kontrastlı placeholder
- Menü/seçim-butonu dosyalarında `red-*`/`amber-600` gibi Tailwind stok renkleri kullanılmış,
  `brand-*`/`tint-*` karşılığı varken; `ink-400` placeholder kontrastı 2.60:1 (WCAG 1.4.3 altı,
  2026-10-04 raporundaki aynı sorunun burada da tekrarı).
- Çözüm: stok renkleri `docs/marka-kimligi.md`'deki tokenlere çevir (emerald gibi karşılığı
  belirsiz olanlar için broker'a sor); placeholder rengini kontrastı yeterli bir tona çek.

### [Sapma] — 3 denetçi: Menüde gizlenen/kısıtlanan modüllere route/bileşen seviyesinde koruma
yok, sadece RLS + arayüzdeki geç kontrol var
- **Masaüstü:** Muhasebe rolü `lib/modules.js`'te Panel/Fırsatlar/Takvim/Takip/Lig/Rehber'den
  çıkarılmış ama bu 6 sayfanın hiçbiri `ProtectedRoute`'ta rol kontrolünden geçmiyor (kod-güvenlik).
- **Mobil:** `MobileBottomNav.jsx`'teki 4 sabit öğe (Panel/Fırsat/Plan/Lig) role göre
  filtrelenmiyor — muhasebe mobilde "Panel"e dokunursa `App.jsx`'in kendi yorumunun "boş/anlamsız"
  dediği ekrana düşer (iş-değeri-analisti, kod-güvenlik'in aynı kökünün mobil tekrarı).
- **`/leads`, `/recruiting`:** Route seviyesinde rol koruması yok; danışman/ofis deep-link ile
  girdiğinde sayfa önce 4 sorguyu ağa gönderip rol kontrolünü en sona bırakıyor — RLS veri
  sızıntısını önlüyor (doğrulandı) ama mimari tek katmanlı (veri-zinciri-analisti).
- Çözüm: `ProtectedRoute`'a `allowedRoles` parametresi eklenip bu route'lara ve
  `MobileBottomNav`'a (`getModulesForRole` ile) uygulanmalı — tek değişiklik bu 3 bulguyu
  birden kapatır.

### [Sapma] — 2 denetçi: CiroRaporuFormModal'daki buton boyutu standardizasyonu (2026-11-10
düzeltmesi) eksik kalmış
- Kullanılabilirlik ve görsel denetçi bağımsız olarak: son düzeltme (`px-3 py-2 text-sm`)
  rengi birleştirmiş ama 3 grupta boyut/yerleşimi birleştirmemiş.
- Çözüm: eksik kalan buton gruplarına da aynı standart uygulanmalı (denetçiler dosya/satır
  belirtti, uygulama sırasında tekrar taranmalı).

### [Sapma] — 2 denetçi: "Ani kayma" düzeltmesi (`animate-expand-in`) kök nedeni çözmemiş
- Görsel denetçi: geçiş 2 koşullu alanda eksik kalmış. Kullanılabilirlik denetçisi: asıl kaymanın
  kaynağı `Modal.jsx`'teki `items-center` — 2026-10-04 raporunun bu konudaki önerisi (`items-start`
  + sabit üst boşluk) hâlâ uygulanmamış, yeni eklenen geçiş sadece bloğun kendi içini yumuşatıyor.
- Çözüm: `Modal.jsx`'te `items-center` → `items-start`; eksik 2 alana `animate-expand-in` eklensin.

### [Sapma] — 2 denetçi: Finans ekranlarındaki Giriş/Çıkış (ikili seçim) bileşeni
CiroRaporuFormModal standardına uymuyor
- Veri-zinciri ve görsel denetçi bağımsız olarak: `BankaHareketleriPanel.jsx`'teki seçili buton
  stili (`border-brand-300 bg-brand-50 text-brand-700`) `CiroRaporuFormModal.jsx`'in kendi
  yorumunda "tüm seçim butonları aynı desende" dediği standarda (`border-brand-600 bg-brand-600
  text-white`) taşınmamış; Finans'ın iki sekmesinde aynı bileşen farklı görünüyor.
- Çözüm: `BankaHareketleriPanel.jsx` Giriş/Çıkış butonları standart desene çevrilsin.

### [Sapma] — 1 denetçi, Önemli: "Satıcı ve alıcı aynı anda dış ofis olamaz" kuralı sadece
client'ta, DB CHECK satırlar-arası değil
- Kod-güvenlik denetçisi: tek CHECK kısıtı satır-içi tutarlılığı doğruluyor, iki katılımcı
  arasındaki kuralı değil — doğrudan insert ile ikisi de dış ofis seçilip kaydedilebilir.
  (Bölüm 1'deki Kritik bulguyla aynı özellik alanının farklı bir katmanı — bkz. Bölüm 4.)
- Çözüm: trigger/CHECK ile "en az bir katılımcı dis_ofis_mi=false" kuralı DB'ye taşınmalı.

### [Sapma] — 1 denetçi, Önemli: Katılımcı mali alanları (pay oranı, GD cirosu, komisyon/RT
payı) client'ta hesaplanıp sunucuda yeniden doğrulanmıyor
- Veri-zinciri-analisti: sunucuda sadece "toplam ≤%100" kontrolü var; "snapshot" kavramı
  muhtemelen bilinçli (geçmişe dönük oranı dondurmak) — broker kararı bekleniyor (bkz. Bölüm 3).

### [Sapma] — 1 denetçi: Finans formlarında "Ekle" butonu sessizce disabled kalıyor
- Kullanılabilirlik-denetçisi: `BankaHareketleriPanel`/`BankaHareketiDanismanPanel`,
  `CiroRaporuFormModal`'da zaten çözülmüş olan bu sorunu tekrarlıyor.

### [Sapma] — 1 denetçi: MobileBottomNav'da aktif sekme sadece renkle ayrılıyor (WCAG 1.4.1)
- Görsel denetçisi.

---

## 3. Senin kararını bekleyen [Sapma]'lar — "bilinçli tercih mi?"

1. **Menüde gizlenen modüllere (muhasebe, leads, recruiting, mobil nav) sadece RLS güveniliyor,
   route seviyesinde ayrı bir koruma yok** — bugüne kadar veri sızdırmadığı doğrulandı, bilinçli
   bir "RLS yeter" kararı mı, yoksa eklenmesi gereken bir savunma katmanı mı?
2. **"Satıcı ve alıcı aynı anda dış ofis olamaz" kuralı DB'ye de taşınsın mı?** Bugüne kadar
   client kontrolü yetmiş (12 raporda hiç ihlal yok) ama doğrudan insert'e açık.
3. **Katılımcı mali alanları (pay oranı, GD cirosu, komisyon/RT payı) "snapshot" olarak
   client'tan yazılıyor, sunucu yeniden hesaplamıyor** — bu geçmişe dönük oranı dondurmak için
   bilinçli bir tasarım mı, yoksa sunucu tarafında da doğrulama (trigger/RPC) ister misin?
4. **Banka Hareketleri'nin `kaynak` alanı (manuel/otomatik) toplu yüklemeleri de "manuel"
   sayıyor** — organik tek-tek girişle toplu içe aktarımı ayırt eden ayrı bir değer
   (`toplu_yukleme`) eklensin mi? (İş-değeri-analisti: bu ayrım olmadan ekranın gerçek kullanım
   hacmini ölçmek mümkün değil.)

---

## 4. Denetçilerin çeliştiği noktalar

- **Dış ofis tutarlılığı:** Kod-güvenlik denetçisi bunu [Sapma] (DB CHECK eksik, "bilinçli mi?")
  olarak orta önemde işaretlerken, veri-zinciri-analisti aynı özelliğin başka bir katmanını
  (üst seçimin client state'inde senkron olmaması VE payload'a hiç yazılmaması) [İhlal][Kritik]
  sayıp Bölüm 1'e taşıdı. **Değerlendirme:** çelişki değil, aynı kök zayıflığın (dış ofis
  seçiminin hiçbir katmanda tam zorlanmaması) iki farklı yüzü — önce Kritik olanı (payload'a
  hiç yazılmaması) çözülmeli, DB CHECK onu tamamlayan ikinci bir savunma katmanı olarak eklenebilir.
- **Seçim butonu değerlerinin korunma düzeyi:** Kod-güvenlik denetçisi "çoğu seçim-butonu değeri
  (işlem tipi, kategori, kredi durumu, banka hareketi tip/tür) DB CHECK ile korunuyor" diye olumlu
  not düşerken, veri-zinciri-analisti "katılımcı mali alanları hiçbir DB kuralıyla doğrulanmıyor"
  diyor. **Değerlendirme:** çelişki değil — biri kategorik/metin seçim alanlarından, diğeri
  hesaplanmış finansal alanlardan (pay oranı, GD cirosu) bahsediyor; ikisi de doğru, farklı alan
  gruplarını kapsıyor.

**Not (kapsam dışı, kayıt altına alındı):** İş-değeri-analisti `opportunities.status`'ta
veritabanında sadece `'claimed'`/`'acik'` değerlerinin bulunduğunu, CLAUDE.md'nin tanımladığı
`'kapandı'`/`'iptal'` durumlarının hiç kullanılmadığını fark etti — bu konunun (Fırsat yaşam
döngüsü) doğrudan parçası değil, ayrı bir /kurul turunda incelenmeli.

---

## 5. İş değeri özeti

- **Danışman:** Koşullu. Zorunlu seçim butonları (Evet/Hayır, dış ofis, bağlanma parası) gerçek
  dallanma üretip hataları önlüyor (veride doğrulandı) ama en uzun formda (CiroRaporuFormModal)
  taslak/otomatik kayıt olmaması, az kullanılsa da (ayda kişi başı ~0,5 kez) tek seferlik bir
  kaybı (sekme kapanması) riskli kılıyor.
- **Ofis/Broker:** Koşullu. Menü/rol mimarisi genel olarak tutarlı ve belgeli, ama Harita RPC'si,
  dış ofis senkronu ve route-guard eksikliği gibi birkaç noktada arayüz koruması sunucuda tam
  karşılığını bulmuyor — düşük hacimli ama yüksek sonuçlu bir risk (yanlış bir satırın
  faturaya/hakedişe geçmesi, ya da yetkisiz bir rolün ofis geneli veriye erişmesi).

---

## 6. Önerilen sonraki 3 adım

1. **Bölüm 1'deki Kritik bulguyu çöz:** "Dış ofis mi?" seçimini alt seçimle senkronize et ve
   payload'a dahil et (`CiroRaporuFormModal.jsx`) — tek dosyalık değişiklik, en büyük veri kaybı
   riskini kapatır.
2. **Harita RPC'sine (`harita_kayitlari_v3`) rol kontrolü ekle + `anon` EXECUTE'u geri al** —
   dar kapsamlı, somut bir güvenlik düzeltmesi.
3. **Route-level rol koruması ekle (`ProtectedRoute`'a `allowedRoles`) ve `MobileBottomNav`'ı
   `getModulesForRole`'a bağla** — 3 denetçinin bağımsız bulduğu en yaygın kök sorunu (muhasebe
   masaüstü+mobil, /leads, /recruiting) tek seferde kapatır.

---

Yanlış veya eksik bulguları docs/kurul/geri-bildirim.md dosyasına yazıp /kurul-egit komutunu çalıştırın.
