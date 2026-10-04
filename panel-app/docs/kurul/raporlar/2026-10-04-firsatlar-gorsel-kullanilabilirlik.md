# /kurul Raporu — Fırsatlar Bölümü: Görsel + Kullanılabilirlik

**Tarih:** 2026-10-04
**Konu:** "Fırsatlar bölümü ile ilgili daha kullanışlı bir görsel plan" (broker talebi)
**Kapsam notu:** Bu, standart 5 denetçili `/kurul` değil — token maliyeti nedeniyle broker'ın tercihiyle **sadece gorsel-denetci + kullanilabilirlik-denetci** (2. aşama) çalıştırıldı. kod-guvenlik-denetci, veri-zinciri-analisti ve is-degeri-analisti bu turda YOK. Bu yüzden klasik "YAYINA ENGEL" etiketi (kuralda 1. aşamadaki güvenlik/veri bulgusuna bağlı) bu raporda kullanılmıyor — ama aşağıdaki Kritik bulgular, özellikle veri kaybı riski taşıyanlar, aynı aciliyette okunmalı.

İki denetçi birbirinin sonucunu görmeden, bağımsız çalıştı. İkisi de **akordeon (Kategori › İşlem Tipi › Taraf), tek-açık-dal kuralı ve Fırsatlar/Operasyon'un üst üste iki bölüm olmasını** broker kararı (2026-09-17) olarak kabul etti, hata saymadı. Aşağıdaki hiçbir öneri bu yapıyı değiştirmiyor.

---

## 1. Kritik bulgular (en öncelikli — veri kaybı / işlev engeli)

Bunlar "YAYINA ENGEL" değil (güvenlik/veri denetçisi bu turda çalışmadı) ama danışmanın gerçek veri kaybetmesine veya işini bitirememesine yol açtıkları için en üstte:

1. **Not kaydedilemezse ekranda "Not kaydedildi" çıkıyor, yazılan not kayboluyor** — `OperasyonTab.jsx:142-149, 213-223`. Hata yutuluyor, kullanıcı başarılı sanıyor. *(kullanılabilirlik, B1)*
2. **Fırsatı kapatmak ("Müşteri Bulundu/Bulunamadı") onaysız ve geri alınamaz** — `OpportunityDetailModal.jsx:298-320`. Tek yanlış dokunuş kalıcı. Aynı ekranda atama/ilgi gösterme onay istiyor, kapatma istemiyor — tutarsız. *(kullanılabilirlik, B2)*
3. **Form penceresi dışına dokununca veya ESC'ye basınca onaysız kapanıyor, yazılan veri siliniyor** — `Modal.jsx:15,44`. Mobilde pencere kenarındaki dar boşluğa (16px) başparmak değmesi yeterli. *(kullanılabilirlik, B3)*
4. **Mobilde fırsat tablosunun kart görünümü yok; "İlgileniyorum" düğmesi ekranın dışında kalıyor** — `OpportunityTable.jsx`. 375px ekranda ~900px'lik tablo yatay kaydırma istiyor, danışmanın asıl eylemi görünmüyor. **2 denetçi bağımsız olarak aynı bulguyu yaptı** (gorsel #1, kullanılabilirlik B7).
5. **Mobil çağrı kartında arayan adı sıfıra kadar sıkışıyor** — `CallTable.jsx:514-579`. Kartın en önemli bilgisi (kimin aradığı) `truncate` ile kayboluyor, masaüstünde de `title` yok. *(gorsel, #2)*

---

## 2. Birleştirilmiş öncelik listesi

### Önemli — [İhlal] (standart/kural ihlali)

- **İkon-only düğmeler dokunma hedefinin altında (24×24px'in altı, WCAG 2.5.8)** — telefon göster/gizle, not/düzenle/sil ikonları ~13×13px. **2 denetçi** (gorsel #7, kullanılabilirlik B16).
- **Form alanlarında görünür etiket yok, zorunlu alan işaretsiz, kenarlıklar/placeholder kontrastı WCAG'ın altında** — Yeni/Düzenle Fırsat formları. **2 denetçi, tamamlayıcı açı** (gorsel #8: kenarlık 1.32:1, placeholder 2.60:1; kullanılabilirlik B8: etiket yok, zorunlu alan belirsiz, Kaydet sebepsiz pasif).
- **Operasyon ve Fırsatlar'da `ink-400` metin/ikon kontrastı WCAG 1.4.3/1.4.11'i geçmiyor** (2.40–2.60:1, gereken 4.5:1) — başlıklar, tarihler, rozetler, "Bilgi amaçlı" notu, StatsCards etiketleri dahil çok sayıda yer. *(gorsel, #4-#6)*
- **Marka dışı stok Tailwind renkleri** (sky/emerald/violet/rose/cyan/indigo/teal/amber) kategori ikonlarında ve rozetlerde — CLAUDE.md "renk sadece marka dosyasından" kuralına aykırı, ayrıca durum renkleriyle çakışıyor (ör. Arsa ikonu yeşili ile "Kapandı" yeşili). *(gorsel, #9)*
- **Tip skalası dışı font boyutları** (`text-[10px]`, `text-[11px]`) — marka dosyasındaki en küçük değer `text-xs`/13px. *(gorsel, #10)*
- **Fırsatlar içinde arama/filtre yok; genel arama mobilde gizli ve bulduğu kaydı açmıyor** — danışman bir kaydı bulmak için 3 seviyeyi tek tek gözle taramak zorunda. *(kullanılabilirlik, B4)*
- **Havuza fırsat atan danışman o fırsatı devredemiyor veya kapatamıyor** — sadece yönetici veya üstlenen kapatabiliyor/atayabiliyor; danışman sistemde "açık kalan" kaydı broker'ı arayarak çözmek zorunda. *(kullanılabilirlik, B5)*
- **Gösterilen ilgi geri çekilemiyor; sayfa yenilenince düğme geri geliyor ve yanıltıcı "başkası değiştirmiş olabilir" hatası çıkıyor** — `withdrawInterest` sağlayıcıda var ama arayüzde hiç kullanılmıyor. *(kullanılabilirlik, B9)*
- **"Fırsata Çevir" yarıda kalırsa tekrar deneme çift fırsat oluşturuyor** — iki ayrı istek, transaction yok. *(kullanılabilirlik, B10)*
- **Panel'deki "N fırsatın hareketsiz" uyarısı ile tıklanınca açılan liste farklı sayıyı ve farklı başlığı gösteriyor** — Panel sadece kendi kayıtlarını sayıyor, liste herkesinkini gösteriyor. *(kullanılabilirlik, B12)*
- **Çağrı durumu değiştirilirken yükleniyor/başarı göstergesi yok** — zayıf bağlantıda dokunuş "işe yaramadı" gibi görünüyor. *(kullanılabilirlik, B15)*
- **Terminoloji tutarsızlıkları ve ofis jargonu** — "Kynk" kısaltması, aynı ekrana 3 farklı ad (Fırsatlar/Fırsat/Portföy), "Operasyon" danışman için "çağrılarım" demiyor, kapatma düğmesinde "Müşteri Bulunamadı" sonuçta "İptal" görünüyor. **2 denetçi** (gorsel #19, kullanılabilirlik B18).
- **Genel doğrulama hatası hangi alanın hatalı olduğunu söylemiyor** — "Girdiğin bilgilerde bir sorun var" (WCAG 3.3.3). *(kullanılabilirlik, B20)*

### Önemli — [Sapma] (broker onayı gerekebilir, kural ihlali değil)

- **İki tablo (Fırsatlar/Çağrılar) iki farklı tasarım dilinde** — paylaşılan `Table.jsx` ile elle yazılmış eski `ink-*` tonları; başlık, boşluk, boş durum, tarih biçimi (göreceli/mutlak) hepsi farklı. *(gorsel, #11)*
- **Rozet/düğme/seçim kontrolü aileleri tutarsız boyutlarda** — paylaşılan `Badge`, `Button`, `SegmentedControl`, `MetricCard` bileşenleri hiç kullanılmıyor. *(gorsel, #12)*
- **"Ne bekliyor" hiyerarşisi yok** — sayfa açılınca sadece kapalı kategori kartları ve TÜM durumları (açık+kapanan+iptal) içeren toplam sayılar görünüyor; bekleyen fırsatlar ağaçta hiç işaretlenmiyor; "Benim işlerim" görünümü yok. **2 denetçi aynı kökten bulguya ulaştı** (gorsel #13, kullanılabilirlik B6).
- **Kırmızı çok fazla anlam taşıyor** — "Açık" durumu, aciliyet, seçim ve birincil eylem hepsi aynı kırmızı tonda; acil olan seçilemiyor. *(gorsel, #14)*
- **Role göre anlamsız/boş kalan sütunlar** — broker için "İlgileniyorum" sütunu hep "—", danışman için "Atanan" sütunu hep kendi adı. *(gorsel, #18)*
- **Danışmana yönetim istatistik kartları gösteriliyor** ("Atanmamış", "Portföy Dönüşüm Oranı") — danışmanda bir anlamı yok, kafa karıştırıyor. *(kullanılabilirlik, B17)*
- **Varsayılan "7 gün" filtresi bekleyen eski çağrıları danışmanın görünümünden gizliyor.** *(kullanılabilirlik, B11)*
- **En acil iş (çağrılar/Operasyon) sayfanın en altında**, mobil alt menüde de yok. *(kullanılabilirlik, B13)*
- **Yeni eklenen fırsat kayıttan sonra görünmüyor** — tüm dallar kapalı kalıyor, danışman "kaydettim mi?" diye 3 seviye gezmek zorunda. *(kullanılabilirlik, B14)*
- **Bölüm çerçeveleri asimetrik** — Fırsatlar çerçevesiz, Operasyon kart içinde kart; lacivert üst çizgi 5 kez tekrarlanıyor. *(gorsel, #15)*

### Öneri ([Görüş] / düşük öncelik)

- Fırsat detay modalında fiyat ve birincil eylem ("İlgileniyorum") geride kalıyor, meta bilgi önde. *(gorsel, #16)*
- Bekleyen satır işareti sadece `box-shadow` — Safari/iOS'ta görünmeme riski, sadece renge dayanmama ilkesine de aykırı olabilir. *(gorsel, #17)*
- Düzenle'ye müşteri bilgisi yüklenmeden basılırsa form boş açılıyor. *(kullanılabilirlik, B19)*
- Mahalle serbest metinle giriliyor, yazım farkları (Hürriyet/Hurriyet) ileride arama/eşleştirmeyi zorlaştırır. *(kullanılabilirlik, B21)*
- Erişilebilirlik: `aria-expanded`, `aria-pressed`, `aria-haspopup` eksik; ikon düğmeler `title` kullanıyor, `aria-label` yok. **2 denetçi** (gorsel #19 notunda h2-in-button; kullanılabilirlik B22).
- Silme/atama sırasında düğme hep "Gönderiliyor..." diyor, işleme özgü değil ("Siliniyor...", "Atanıyor..."). *(kullanılabilirlik, B23)*

---

## 3. Senin kararını bekleyen Sapma'lar ("bilinçli tercih mi?")

1. **Marka dosyasında "başarılı/yeşil" tokenı tanımlı değil.** Kapandı, Görüşüldü, Portföy Alındı ve WhatsApp yeşili hangi tonu kullansın? *(gorsel #9)*
2. **Mobilde OpportunityTable'ın kart görünümüne geçmemesi** bilinçli bir tercih mi, yoksa CallTable'a yapılan düzeltme (kart görünümü) buraya da uygulanmalı mı? **İki denetçi de bağımsız olarak sordu.** *(gorsel #1, kullanılabilirlik B7)*
3. **Fırsatlarda göreceli tarih** ("bugün", "3 gün önce") kullanılıyor; çağrılarda senin isteğinle mutlak tarihe geçilmişti ("tarih kısmında bugün yazıyor, orada tarih yazmalı"). Fırsatlarda da aynı kural uygulansın mı? *(gorsel #11)*
4. **"Açık" durumunun kırmızı yerine mavi olması** — kırmızının sadece aciliyet/birincil eylem için ayrılması — kabul edilsin mi? *(gorsel #14)*
5. **Akordeon/3-seviye yapısı sabit kalsın** kararına, "tüm işlerimi tek ekranda göremem" sonucu da dahil miydi? "Benim işlerim | Havuz | Tümü" görünüm anahtarı eklensin mi (yapıyı değiştirmeden, üstüne)? *(kullanılabilirlik B6)*
6. **Havuza fırsat ekleyen danışmanın o fırsatı devretmesi/kapatamaması** bilinçli bir yetki kararıysa, bunun danışmana ekranda açıkça söylenmesi mi ("ilgilenenle anlaştıysan broker'a ata dedirt"), yoksa yetki genişletilsin mi (bu RLS/yetki değişikliği gerektirir)? *(kullanılabilirlik B5)*
7. **Operasyon'un danışmana gösterdiği istatistik kartları** ("Atanmamış", "Portföy Dönüşüm Oranı") yönetim metriği — danışman için aynı kalsın mı yoksa ona özel kartlara mı geçelim ("Bekleyen dönüşüm", "Bu hafta görüştüğüm")? *(kullanılabilirlik B17)*
8. **Varsayılan "7 gün" filtresi** yöneticinin kalabalık listesi için düşünülmüş olabilir — danışmana da aynı varsayılan uygulansın mı? *(kullanılabilirlik B11)*
9. **Operasyon'un Fırsatlar'ın altında, üst üste iki bölüm olarak durması** (2026-09-17 kararı) danışman rolü için de mi geçerli, yoksa danışmanda bekleyen çağrı varsa Operasyon üste mi çıksın? *(kullanılabilirlik B13)*

---

## 4. Denetçilerin çeliştiği noktalar

Doğrudan bir çelişki yok. İki denetçi birbirini görmeden aynı 2 bulguya ayrı ayrı ulaştı (mobil kart görünümü eksikliği, ikon-buton boyutu) — bu örtüşme, bulguların güvenilirliğini artıran bir sinyal olarak okunmalı.

Tek nüans: gorsel-denetci "İlgileniyorum" sütununun broker/owner için rol bazlı gizlenmesini öneriyor (#18); kullanılabilirlik-denetci ise aynı akışın danışman tarafında zaten 5 tıkla zor ve geri alınamaz olduğunu söylüyor (B9). Bunlar çelişmiyor, tamamlıyor: sorun hem görünürlük hem de akış tarafında.

---

## 5. İş değeri özeti

Bu turda **is-degeri-analisti çalıştırılmadı** (kapsam broker tercihiyle görsel+kullanılabilirlik ile sınırlandı). Değer değerlendirmesi yapılmadı; istenirse ayrı bir `/kurul` turu ile eklenebilir.

---

## 6. Önerilen sonraki 3 adım

1. **Veri kaybı/onay eksikliği düzeltmeleri** (Bölüm 1, madde 1-3): not kaydetme hatası, kapatma onayı, form-kapanma onayı. Kod değişikliği düşük risk, DB dokunmuyor, hemen başlanabilir.
2. **Mobil + dokunma hedefi ortak bulguları** (Bölüm 1 madde 4-5, Bölüm 2'deki ikon-buton boyutu): iki denetçinin bağımsız doğruladığı, danışmanın sahada en çok hissedeceği sorunlar.
3. **Yukarıdaki Sapma sorularına (Bölüm 3) cevap almak**, özellikle yeşil token ve "Açık" rengi — bunlar netleşmeden renk/hiyerarşi düzeltmelerine (kontrast toplu düzeltmesi, "ne bekliyor" özet şeridi) geçmek yarım kalır.

---

Yanlış veya eksik bulguları docs/kurul/geri-bildirim.md dosyasına yazıp /kurul-egit komutunu çalıştırın.
