# Geliştirme yaklaşımı — RE/MAX Lavanda Portal

Bu dosya kalıcıdır, her oturumda okunur. Broker (Ahmet Erdemir) burada
tek seferlik bir talimat değil, **bundan sonraki her geliştirme için
geçerli bir çalışma biçimi** tanımladı (2026-07-31). Aşağıdaki kural,
brief'te aksi açıkça belirtilmedikçe her modül geliştirmesinde uygulanır.

## Rol

Bu projede sadece "istenen ekranı yapan" bir geliştirici değilim. RE/MAX
Lavanda'nın **Operasyon Direktörü + CRM mimarı** gibi düşünmem gerekiyor.
Amaç güzel görünen ekranlar değil: hiçbir portföyün, alıcı adayının,
satıcı adayının, santral çağrısının kaybolmadığı; her kaydın mutlaka bir
sonraki aksiyona bağlı olduğu bir **operasyon platformu**.

## Kural: Önce analiz, sonra onay, sonra geliştirme

Broker'ın istediği literal özellik yeterli DEĞİL. Örnek: "Alıcı ekranını
yap" dendiğinde sadece isim+telefon eklemek yanlıştır — o modülün gerçek
hayattaki tam ihtiyacını (bütçe, bölge, ihtiyaç tipi, sonraki aksiyon,
takip tarihi, öncelik vb.) kendim analiz edip önermem gerekir.

Her yeni modül/ekran geliştirmesinden ÖNCE:

1. O modülü gerçek hayatta kullanan broker/operasyon yöneticisi/danışman
   gözüyle analiz et — hangi bilgi unutulabilir, hangi alan eksik
   kalabilir, danışman nerede hata yapabilir?
2. Eksik olabilecek alanları, zorunlu bilgileri, olası senaryoları, iş
   akışlarını ve veri ilişkilerini kendin tespit et.
3. Referans olarak profesyonel emlak CRM'lerini (Salesforce, HubSpot,
   Follow Up Boss, kvCORE) ve RE/MAX'ın kendi iş akışını kullan.
4. Bulduklarını broker'a **önerilerle birlikte** sun (metin yeterli,
   AskUserQuestion denenip reddedilirse düz metinle sor).
5. Onay aldıktan sonra geliştir.

Broker'ın tekrar tekrar "şunu da ekle", "bunu da unuttun" demesi
istenmiyor — bu, sürecin bir önceki adımda başarısız olduğu anlamına
gelir.

## Her ekran/alan tasarlamadan önce sorulacak 10 soru

(Broker'ın verdiği liste, birebir — brief'lerdeki gibi burada da referans)

1. Burada hangi bilgi unutulabilir?
2. Hangi alan eksik kalabilir?
3. Danışman burada hata yapabilir mi?
4. Broker neyi görmek ister?
5. Bir yıl sonra bu kayıt tekrar açıldığında bütün hikaye okunabiliyor mu?
6. Bu kayıt hangi aşamadan hangi aşamaya geçecek?
7. Sonraki işlem zorunlu mu?
8. Bu kayıt kaybolabilir mi?
9. Aynı kişiye ait farklı kayıtlar ilişkilendiriliyor mu?
10. Bu ekran gerçekten operasyonu hızlandırıyor mu?

## Kapsam dışı olan şey

Bu kural **mevcut mimariyi veya faz planını değiştirmek için bir çağrı
değil** — broker 2026-07-31'de açıkça "fazlar aynı kalsın, mimariyi
değiştirmek istemiyorum" dedi. Değişen şey sadece geliştirme
metodolojisi: her modül için önce derin analiz + öneri + onay, sonra kod.

## Diğer kalıcı kurallar (önceki oturumlardan)

- Asla onay almadan commit/push/deploy yapma.
- Yapısal her değişikliği `AI_NOTLARI.md`'ye kısaca işle.

## Migration Onay Kuralı (2026-08-02)

Artık Supabase MCP araçları bağlı (`apply_migration` vb. çalıştırılabilir)
— ama bu asla onaysız/otomatik migration çalıştırma anlamına gelmiyor.
Kural:

1. **HER DURUMDA önce migration dosyasını repoya commit et, SONRA uygula**
   — sırayı bozma.
2. **Doğrudan `apply_migration` çalıştırma, önce sor.** Onay isteği
   **teknik terim kullanmadan**, düz Türkçe yazılır ve şu 3 soruyu
   MUTLAKA cevaplar (2026-08-02 broker kararı):
   1. Bir şey siliniyor mu? (evet/hayır)
   2. Ters giderse geri alınabilir mi? (evet/hayır)
   3. Portalda çalışan bir ekran bozulabilir mi? Kontrol ettim mi?
   SQL de eklenir ama **en alta**, 3 sorudan sonra.
3. **Sadece onay yeterli** (broker "onaylıyorum"/"evet"/"onay" derse
   uygulanabilir): GRANT/REVOKE, search_path SET, RLS politikası
   ekleme/kaldırma, index ekleme. Ayrıca (2026-08-23 broker: "risklilerde
   kalsın diğerlerinde kısa cevap" — kural riskli olmayan işlemler için
   gevşetildi): birkaç *spesifik, isimle/ID'yle belirtilmiş* satırı
   hedefleyen küçük DELETE (ör. test amaçlı birkaç kayıt) ve gerçek
   müşteri/işlem verisini DEĞİL de görünüm/etiket/sıralama gibi
   düşük riskli alanları (ör. `is_favorite`, `name`, `sort_order`)
   değiştiren UPDATE.
4. **Onay yetmez** — broker açıkça **"bilgisayardayım, uygula"**
   demeden dokunma (gerçekten riskli/geri dönüşü belirsiz olanlar):
   DROP (tablo/kolon), kolon tipi değişikliği, erişimi genişleten RLS/
   politika değişikliği, geniş çaplı veya gerçek müşteri/işlem verisini
   etkileyen DELETE/UPDATE, hangi satırların etkileneceği net olmayan
   (WHERE'siz veya geniş kapsamlı) her değişiklik.

## RLS/Performans Dersleri — "Donma" Olayları Kontrol Listesi (2026-10-03)

2026-09-03'ten bugüne 9 ayrı "portal açılmıyor/donuyor" olayı yaşandı
(tam döküm için AI_NOTLARI.md'de o tarihlerdeki kayıtlara bakılabilir).
4'ü aynı kök kalıba düşüyor: RLS politikaları ve içlerinde kullanılan
fonksiyonlar. İkisi aynı gün art arda oldu (09-27 sabah fix, öğleden
sonra farklı bir eksik yüzünden tekrar bozuldu); biri (2026-10-03) bir
önceki GÜNÜN kendi güvenlik düzeltmesinin yan etkisiydi. Bu yüzden
RLS/fonksiyon değişikliklerinde aşağıdaki kontrol listesi ZORUNLU:

1. **Her RLS politikası/fonksiyon değişikliğinden SONRA**, sadece
   Supabase advisor'a bakıp geçme — gerçek bir danışman/ofis rolü
   simülasyonuyla (`set role authenticated; set request.jwt.claims =
   '{"sub":"<gerçek-kullanici-id>","role":"authenticated"}';`) o
   politikanın koruduğu tabloları bizzat sorgula. 2026-10-03'teki
   sonsuz döngüyü advisor değil, bu yöntem yakaladı.
2. RLS politikasında kullanılan bir fonksiyon **kendi koruduğu tabloyu
   (veya herhangi RLS'li bir tabloyu) sorguluyorsa**, mutlaka
   `SECURITY DEFINER` olmalı — değilse döngü/sonsuz recursion riski var.
   Yeni bir yardımcı fonksiyon yazarken bu kontrol maddesi atlanmamalı.
3. "Küçük" bir fonksiyon değişikliği (search_path, isim, dönüş tipi
   fark etmez) bile, o fonksiyon bir RLS politikasında kullanılıyorsa
   **davranış/performans değişikliği riski taşır** (Postgres'in sorguyu
   fonksiyon içine "inline" etme kararı değişebilir) — "sadece güvenlik
   düzeltmesi, UI'a dokunmuyor" diye düşük riskli sayılmamalı, madde
   1'deki testten geçmeli.
4. RLS politikalarındaki yardımcı fonksiyon çağrıları VE çıplak
   `auth.uid()`/`auth.jwt()`/`auth.role()` çağrıları AYRI bulgu
   türleridir — bir tarama/düzeltme turu sadece birini kapsayıp
   diğerini atlayabilir (09-27'de tam bu yüzden aynı gün iki ayrı
   düzeltme gerekti). İkisi de ayrı ayrı kontrol edilmeli.
5. Sık açılan sayfalarda (Panel gibi) yeni bir sorgu eklerken varsayılan
   `select('*')` değil, "bu ekran gerçekten hangi alanlara ihtiyaç
   duyuyor" sorusu sorulmalı (bkz. 09-28 call_logs olayı).
6. Yeni sayfa/veri yükleme her zaman `useAsyncList` hook'u üzerinden
   gitmeli, kendi `Promise.all` deseni kurulmamalı — zaman aşımı/sessiz
   yeniden deneme/kısmi hata toleransı (`Promise.allSettled`) hazır
   gelir, tek bir yavaş sorgu tüm sayfayı kilitlemez.
7. Yeni bir foreign key eklenen migration'da, o kolona index eklemek
   varsayılan adım olmalı — sonradan ayrı bir "kilitlenme" turu
   beklenmemeli (bkz. 09-29 Lig period_id olayı).

# Portal Kurulu (denetçi ajanlar) — proje kuralları

Aşağıdaki bölümler `portal-kurulu.zip` kurulum şablonundan eklendi
(2026-09-30). Köşeli parantezler **taslak olarak dolduruldu**
(2026-09-30, koddan/veritabanından doğrulanarak) — broker onayı/
düzeltmesi bekleniyor, kesinleşmedi.

## Tasarım
Arayüzle ilgili her işte önce docs/marka-kimligi.md dosyasını oku.
Renk, font ve boşluk değerlerini sadece oradan al; kendi değer uydurma.
Dosyada karşılığı olmayan bir tasarım kararı gerekiyorsa sor.

## Roller ve yetkiler
(4 rol var, şablonun varsaydığı 3 değil — bkz. `lib/roles.js`)
- **broker**: Tek üst yetki (admin). Veri girmez; kullanıcı ekler/
  düzenler, her modülü yönetir/denetler, Lead Havuzu'na erişen tek rol
  (owner ile birlikte).
- **owner**: Broker'a çok yakın yetki — yönetir/denetler ama veri
  girmez. Lead Havuzu'na erişir. Bazı üst-seviye kısıtlarda broker'dan
  ayrılabiliyor (bkz. `opportunities.js` içindeki notlar), esası aynı.
- **ofis**: SADECE veri girer, yönetmez (kullanıcı ekleyemez, Lead
  Havuzu'na giremez). Recruiting'e girebilir, Rehber'in "yönetime özel"
  klasörlerini görebilir.
- **danisman**: Ne veri yönetir ne yönetim yetkisi var. Lead Havuzu'na
  HİÇ erişemez, Rehber'in "yönetime özel" klasörlerini HİÇ göremez;
  sadece kendi portföy/müşteri/görev verisini görür — başkasının
  verisini ASLA görmez.

## İş kuralları
- **Lig puanlaması:** 3 kategori — Ciro (₺, TEK elle girilen kategori),
  Memnuniyet ("Yorum Hakkı"ndaki alınan/toplam yorumdan Wilson score
  lower bound ile otomatik hesaplanır — az yorumlu birinin şansla üste
  çıkmasını istatistiksel olarak engeller), Sosyal Medya (aktivite
  başına sabit puan, otomatik toplanır — ör. Google Yorumu 15p,
  YouTube Videosu 12p, Instagram Post 8p, Meta Reklam Bütçesi/100TL
  3p, LinkedIn Paylaşımı 3p, Instagram Story 2p — güncel liste
  `social_activity_types` tablosunda). Dönem 4 aylık (yılda 3 dönem);
  bitişine 7 gün veya daha az kalınca durum otomatik "kapalı"ya döner,
  broker/owner sonra "açıklandı" yapar.
- **Yetki süreci:** Kodlanmış bir modül YOK, manuel süreç — danışman
  WhatsApp'tan tek seferde eksiksiz bilgi gönderir, ofis aynı gün
  sözleşmeyi hazırlayıp geri yollar; mesai bitimine yakın/mesai dışı
  talepler ertesi gün (hafta sonuna denk gelirse hafta sonu bitiminde)
  işlenir (bkz. Rehber > Müşteri İletişim Kuralları).
- **Çağrı yönlendirme:** Santralden gelen çağrılar 4 senaryoya göre
  yönlendirilir (branda/ilan → ilgili danışman; danışmandan bağımsız
  portföy sahibi → owner/broker onayı; direkt ofis araması → mevcut
  yönlendirmeye göre; kapı müşterisi → KESİNLİKLE direkt danışmana
  verilmez, misafir edilir, owner/broker kararı beklenir). Detay:
  Rehber > Çağrı Karşılama, Kapı Müşterisi ve Yönlendirme Kuralları.
- **Panel veri girişi:** Portföy ve call log alanlarının aynı gün
  güncel tutulması (fiyat, durum, dönüş/portföy alındı mı vb.) iş
  sorumluluğu sayılır, Sağlık Skoru/Lig bu veriye dayanır. Detay:
  Rehber > Panel Veri Girişi, İlan Portalı Eşleştirme, Kurumsal Görünüm
  ve Ofis Ekipman Kuralları.
- **Portföy:** Kodlanmış bir "pasif" durumu yok — `status` alanı
  açık/üstlenildi/kapandı/iptal. "Dikkat Gerekiyor", durumu hâlâ
  "açık" olan bir fırsatın 3 günden uzun süre hareketsiz kalmasını
  işaretliyor (`isStaleOpp`).
- **Eğitim/onboarding:** Kodlanmış bir "tamamlandı" eşiği yok, sadece
  "geride kalma" eşiği var — eğitim modül tamamlama YÜZDESİ VEYA
  checklist tamamlama yüzdesi %50'nin altındaysa "Dikkat Gerekiyor"a
  düşüyor (`isBehindEducation`).
- **Recruiting:** Yeni Başvuru → Randevu → Karar Bekliyor →
  Olumlu (danışman olarak eklenir, kaydı Recruiting'den çıkar) /
  Olumsuz / Yanlış Başvuru. "Danışman Olarak Ekle" (gerçek hesap açma)
  BİLİNÇLİ olarak sadece broker/owner'da — ofis süreci "Olumlu"ya kadar
  taşıyabilir ama bitiremez (2026-10 broker onayı: bilinçli tek imza).
- **Lead Havuzu:** BİLİNÇLİ olarak pipeline değil — sadece dağıtım
  noktası (durum: yeni → atandı/elendi), gerçek süreç hedef modülde
  (Fırsatlar veya Recruiting) devam eder.

## Bilinçli tasarım kararları (denetçiler bunları hata saymaz)
- Recruiting'de "Olumlu" diye ayrı bir kanban kolonu YOK — bir aday
  "Danışman Olarak Ekle" ile olumluya geçince gerçek bir kullanıcı
  oluyor, hikayesi Ayarlar > Kullanıcılar'da devam ediyor.
- Lig'de her danışmana mutlak puan yerine ÜSTTEKİ KOMŞUYA FARK
  gösteriliyor (`diff`) — puan farkının acı vermesini yumuşatmak için
  bilinçli bir tasarım. NOT: bu, sıra NUMARASININ (`rank`, tam liste
  halinde herkese açık) gizlenmesi anlamına gelmiyor — ayrı bir konu,
  bkz. `docs/bilgi-bankasi/puanlama-motivasyon.md`.
- Lead Havuzu bilinçli olarak pipeline değil, dağıtım noktası (yukarı
  bakın) — sektördeki tek-uçtan-uca-pipeline yaklaşımından bilinçli
  bir sapma, bkz. `docs/bilgi-bankasi/lead-takip-asamalari.md`.

## Asla olmaması gerekenler
- Bir danışmanın başka danışmanın müşteri veya kişisel verisini görmesi
- Puanın geriye dönük olarak sessizce değişmesi
- Onaysız veri silme
- Danışmanın Lead Havuzu'na erişmesi (sadece broker/owner)
- Bir kullanıcının kendi rolünü/durumunu değiştirmesi (DB trigger'ıyla
  zaten engelleniyor, bkz. migration `20260724140000_rol_yukseltme_koruma.sql`)

## Çalışma şekli
- Büyük değişikliklerden önce kısa bir plan sun, onay bekle.
- Canlı veritabanında yazma işlemini onaysız yapma.
- Modül tamamlanınca /kurul ile denetim öner.
