# Portal Kurulu Raporu — Kademeli (cascading) menü/seçim mantığı

**Tarih:** 2026-10-04
**Konu:** Panel genelinde bir alanın (dropdown, seçim, filtre, buton grubu) seçiminin
ilgili başka bir alanın seçeneklerini/görünürlüğünü/değerini nasıl etkilediği —
bu mantık doğru tasarlanmış mı?
**Yöntem:** 5 denetçi (.claude/agents/ tanımları birebir) bu konu için ayrı ayrı,
birbirinin sonucunu görmeden çalıştırıldı. Sırasıyla: kod-güvenlik-denetçi +
veri-zinciri-analisti (paralel) → kullanılabilirlik-denetçi + görsel-denetçi
(paralel) → iş-değeri-analisti.

---

## 1. Yayına engel olanlar

**[İhlal] [Kritik] Geçmiş etkinlik katılımı geriye dönük, sunucu tarafında
engellenmeden değiştirilebiliyor** (kod-güvenlik-denetçi, G1)
- `EventDetailModal.jsx` butonları sadece `status==='mazeretli'` koşuluna bakıyor;
  etkinliğin geçmiş olup olmadığına bakmıyor. RLS politikası
  (`event_attendance_update_self`) da eski durumu/etkinlik tarihini kontrol etmiyor.
  Danışman, 3 gün sonra otomatik "katilmadi" yazılmış bir kaydı veya reddedilmiş
  bir mazereti geri açıp sağlık skorunu geriye dönük düzeltebiliyor.
- CLAUDE.md "Asla olmaması gerekenler — Puanın geriye dönük olarak sessizce
  değişmesi" kuralına doğrudan aykırı.

**[İhlal] [Kritik] Lead'i başka modüle yönlendirmede mükerrer kayıt önleniyor
değil — canlıda kanıtlı** (veri-zinciri-analisti, bulgu 1)
- `Leads.jsx`'teki butonlar kayıt sırasında kilitlenmiyor, `kaynak_lead_id` için
  tekillik kısıtı yok. **Canlıda 5 mükerrer aday, 1 mükerrer çağrı kaydı** bulundu
  (0,08–1,7 sn arayla oluşmuş — çift tık izi). Recruiting dönüşüm oranını şişiriyor.

**[İhlal] [Kritik] Sosyal medya puanı geriye dönük ve sessizce değişebiliyor —
açıklanmış dönem dahil** (veri-zinciri-analisti, bulgu 2)
- `social_activity_log` puanı anlık değil, toplamı her girişte **güncel**
  `social_activity_types.puan` ile yeniden hesaplıyor. Broker bir aktivitenin
  puanını değiştirirse geçmiş dönemler (açıklanmış olanlar dahil) sessizce
  değişebiliyor. CLAUDE.md'nin aynı maddesine aykırı.

**[İhlal] [Kritik] Lig'de geçmiş dönem seçilince danışman/ofis hangi dönemde
olduğunu göremiyor, güncel döneme dönüş yolu yok** (kullanılabilirlik-denetçi, K1)
- "Geçmiş Dönemler" menüsünden bir dönem seçilince ekranda hangi dönemde
  olunduğunu gösteren hiçbir iz kalmıyor; geri dönmek için sayfayı yenilemek
  gerekiyor. Kullanıcı eski bir dönemin sıralamasını "bugünkü" sanabilir.

**[Sapma → iş etkisi Kritik] "Portföy talebi mi?" varsayılanı "Hayır" —
canlıda satıcı adayı kaybı kanıtlı** (iş-değeri-analisti, bulgu 1)
- Teknik olarak bir standart ihlali değil (broker'ın kendi kararı), ama somut
  iş kaybı doğrulandı: son 2 ayda **16 Santral çağrısında** notlarda "satmak
  istiyor/kiralamak istiyor" yazılı olduğu halde "Hayır — bilgi amaçlı" işaretli;
  bunların **0'ı** bir Fırsat'a dönüşmüş. Etiket [İhlal] değil çünkü kural
  bilinçli konulmuş, ama sonucu CLAUDE.md'nin "hiçbir portföyün kaybolmadığı"
  hedefiyle doğrudan çelişiyor — bu yüzden burada listelendi.

Bu 5 bulgu düzeltilmeden modülün "doğru tasarlanmış" sayılması önerilmez.

---

## 2. Birleştirilmiş öncelik listesi

Aynı kök sorunu işaret eden bulgular birleştirildi, kaç denetçinin bağımsız
olarak değindiği not edildi. Sıralama: [İhlal] > [Sapma] > [Görüş], eşit
etikette etki/efor.

### [İhlal] — 4 denetçi: Gizlenen/koşullu alanlar sıfırlanmıyor, sunucu da
tutarlılığı zorlamıyor
- category→odaSayisi hariç (bu doğru sıfırlanıyor), **tip→fiyat** (alıcı/satıcı),
  **kaynak→reklamKodu/portfoyTalebiMi** değişince eski değer formda/DB'de kalıyor.
- Kanıt: canlıda 3 alıcı fırsatında satıcı-tipi `fiyat` alanı dolu kalmış ve
  ekranda alıcı bütçesi gibi gösteriliyor; Reklam-dışı kaynakta `portfoy_talebi_mi`
  hayalet `true` olarak 4 kayıtta duruyor.
- Kaynaklar: kod-güvenlik H1, veri-zinciri 7/9, kullanılabilirlik Ö6, görsel notu.
- Çözüm: Tek bir `normalizeOpportunityPayload`/`normalizeCallPayload` provider'da
  uygulanmalı; DB'ye karşılık gelen CHECK kısıtları eklenmeli (ör.
  `type='alici' → fiyat IS NULL`).

### [İhlal] — 4 denetçi: "Danışman Olarak Ekle" tek imzası hesap açmada
zorlanıyor, aday durumunda ve arayüzde zorlanmıyor
- `create-user` edge function broker/owner kontrolü yapıyor (doğru). Ama
  `recruiting_candidates.durum='olumlu'` değerini DB'de hiçbir kısıt korumuyor;
  ofis bunu doğrudan yazabiliyor. Buton ofise de görünüyor, tıklayınca 403 ile
  başarısız oluyor ama kullanıcıya "bağlantını kontrol et" gibi yanıltıcı bir
  hata gösteriliyor. Form kapanırken onay istemiyor, kaydedilmemiş değişiklik
  sessizce kayboluyor.
- Kaynaklar: kod-güvenlik G4/G6, kullanılabilirlik Ö1/Ö4, iş-değeri 4.
- Çözüm: Buton `canManageUsers(role)`'a bağlanmalı; `durum='olumlu'` yazımı bir
  BEFORE trigger ile sadece yönetici/service_role'e kısıtlanmalı; ofise ayrı bir
  "broker onayına gönder" adımı gösterilmeli.

### [İhlal] — 3 denetçi: Fırsat durumu (status/claimer_id) RPC'yi atlayarak
doğrudan yazılabiliyor
- `close_opportunity`/`assign_opportunity_to` RPC'lerindeki kurallar (sadece
  üstlenen/yönetici kapatabilir, sadece broker/owner atayabilir) tablo kolon
  yetkisiyle desteklenmiyor; sahibi doğrudan UPDATE ile bu kuralları atlayabiliyor.
- Kaynak: kod-güvenlik G3.
- Çözüm: `status`, `claimer_id`, `closed_at`, `closed_by`, `owner_id` için
  UPDATE yetkisi `authenticated`'dan geri alınmalı (RPC'ler SECURITY DEFINER
  olduğu için çalışmaya devam eder).

### [İhlal] — 3 denetçi: Koşullu beliren alanlar görsel/işitsel olarak fark
edilmiyor
- Reklam kodu, "portföy talebi mi?", olumsuz sebebi gibi aniden beliren alanların
  görünür etiketi yok; tek ipucu düşük kontrastlı placeholder (`ink-400`,
  2.60:1 — WCAG 1.4.3'ün altında). "Portföy talebi mi?" mobilde "...danışman
  işlem yapmaz" metni "yapmaz" kesilecek şekilde taşıyor.
- Kaynaklar: görsel 2/3/6, kullanılabilirlik Ö3.
- Çözüm: Koşullu alanlara görünür etiket + bağlı-olduğu-alana atıf; kritik
  "portföy talebi mi?" sorusu segment kontrole çevrilmeli (Satıcı/Alıcı
  desenindeki gibi).

### [İhlal] — 2 denetçi: Modal dikey ortalaması her kademe değişiminde
başlığı/tetikleyiciyi kaydırıyor
- Ölçülmüş: Yeni Çağrı Santral→Web Sitesi geçişinde kaynak select'i ve başlık
  36px aşağı kayıyor; Recruiting'de Olumsuz seçilince iki ayrı sıçrama oluyor.
- Kaynak: görsel 1 (ayrıca kullanılabilirlik dolaylı destekliyor).
- Çözüm: `Modal.jsx`'te `items-center` → `items-start` + sabit üst boşluk. Tek
  dosyalık değişiklik, tüm kademeli modalleri düzeltir.

### [Sapma] — 3 denetçi: "Portföy talebi mi?" varsayılanı "Hayır" + elle giriş
hiç zorlanmıyor
- Telsam entegrasyonu bugüne kadar hiç satır yazmamış (`telsam_chanid` 0/1257);
  tüm Santral çağrıları ofis tarafından elle giriliyor ve girerken ne istendiği
  zaten biliniyor — "otomatik düşen çağrı" senaryosu bugün için geçersiz.
- Kaynaklar: iş-değeri 1 (kritik iş etkisi, bkz. Bölüm 1), kullanılabilirlik Ö5,
  kod-güvenlik/veri-zinciri dolaylı (H1/bulgu 7 ile aynı kök).
- Bu, Bölüm 3'teki "bilinçli tercih mi?" sorularından biri — karar sizin.

### [Sapma] — 2 denetçi: Olumsuz sebebi zorunlu toplanıyor ama okunmuyor,
"yeniden aktifleştir" yolunda temizlenmiyor
- 210 olumsuz adayın 81'inde sebep dolu ama bunu toplayan hiçbir rapor/filtre
  yok. `handleReactivate` sebebi NULL'a çekmiyor; aday tekrar olumsuz olursa
  eski sebep sessizce geri görünebilir (henüz 0 ihlal var, risk potansiyel).
- Kaynaklar: iş-değeri 3, kod-güvenlik H2, veri-zinciri bulgu 8.
- Çözüm: `handleReactivate` patch'ine `olumsuzSebebi: null` eklensin; Recruiting
  sayfasına "Olumsuz sebep dağılımı" tablosu eklensin (zorunlu alanın bir
  karşılığı olsun).

### [Sapma] — 2 denetçi: Reklam kodu kutusu fiilen kullanılmıyor
- Elle girilen tek değer "İNSTAGRAM"/"instagram" (platform adı, kampanya değil);
  7 haftadır hiç elle giriş yok, gerçek kampanya kodu artık Lead Havuzu'ndan
  otomatik geliyor. Rapor (Reklam Kaynakları) değerli ama elle giriş kutusu
  ölü ağırlık; iki görüntüleme bileşeni (`ReklamKoduConversionBoard`,
  `SourceConversionBoard`) hiçbir yerden import edilmiyor.
- Kaynaklar: iş-değeri 2.
- Çözüm: Serbest metin yerine Lead Havuzu'nda görülmüş kampanya adlarından
  seçilen liste; kullanılmayan iki bileşen temizlensin.

### [Sapma] — 2 denetçi: Lig dönem/tarih kayması (UTC vs Europe/Istanbul)
- Skor/aktivite girişinin varsayılan tarihi UTC üretiliyor; TR saatinde
  00:00–03:00 arası girişler önceki güne/döneme yazılabiliyor. Dönem durumu
  hesabı ekranda ve veritabanında ayrı mantıkla hesaplandığı için bir gün
  kayabiliyor.
- Kaynaklar: veri-zinciri bulgu 5/6, görsel/kullanılabilirlik dolaylı.
- Çözüm: Tüm tarih varsayılanları `Europe/Istanbul` takvim gününe göre
  üretilsin (`toLocaleDateString('sv-SE')` gibi).

### [Sapma] — tekil ama önemli bulgular (1 denetçi, Önemli seviyede)
- Çok adımlı yazmalar (fırsat oluştur→çağrı güncelle, kullanıcı oluştur→aday
  güncelle) atomik değil; ikinci adım başarısızsa yetim/tutarsız kayıt kalıyor
  (kod-güvenlik H3, veri-zinciri 11).
- Çağrı notu ağ hatasında kayboluyor ama "kaydedildi" mesajı gösteriliyor
  (veri-zinciri 12).
- "Fırsata Çevir" formu tür seçilmeden açılıyor, Kaydet sebepsiz pasif kalıyor
  (kullanılabilirlik Ö2).
- Recruiting "Danışman Olarak Ekle" ve Lead Havuzu "Recruiting'e Yönlendir"
  butonlarında çift-tık koruması yok (kullanılabilirlik Ö10/H3 ile aynı kök).
- İki renk sistemi: 6 kademeli modal (Opportunity/Call/Event) hâlâ tamamen
  eski `ink-*` paletinde, RecruitingDetailModal zaten semantik tokene geçmiş
  (görsel 6).
- Zorunlu "Olumsuz sebebi" uyarı rengi/kenarlığı WCAG kontrast eşiğinin altında
  (görsel 4).

---

## 3. Senin kararını bekleyen [Sapma]'lar — "bilinçli tercih mi?"

1. **"Portföy talebi mi?" varsayılanı "Hayır" olarak mı kalsın?** Telsam hiç
   çalışmadığı için bugün tüm Santral çağrıları elle giriliyor; varsayılanı
   boş/zorunlu yapmak 16 kayıp satıcı adayı riskini kapatır ama ofise her
   çağrıda bir tık daha ekler. Sizin kararınız.
2. **Reklam kodu elle giriş kutusu kalsın mı, kaldırılsın mı?** Veri 7
   haftadır hiç dolmuyor; otomatik akış zaten var.
3. **Çağrı ilerleme adımlarını (Görüşüldü/Portföy) sadece atanan danışman mı
   değiştirebilsin, yoksa ofis/owner/broker'ın düzeltme yetkisi bilinçli mi?**
   Arayüz kısıtlıyor, sunucu kısıtlamıyor — tutarsızlık kasıtlı mı?
4. **Recruiting akışından açılan "Danışman Olarak Ekle" formunda rol seçimi
   neden serbest?** Owner, broker rolünde bir hesap açabiliyor.
5. **Telefon numaraları Panel'de (ofis rolünde) maskelenmemiş gösteriliyor** —
   bilinçli mi, yoksa unutulmuş bir sunucu-taraf maskeleme mi gerekiyor?

---

## 4. Denetçilerin çeliştiği noktalar

- **Kod-güvenlik (G5)** çağrı ilerleme adımlarının arayüzde sunucudan daha sıkı
  olmasını [Sapma] olarak işaretleyip "bilinçli mi?" diye sorarken,
  **kullanılabilirlik (Ö13)** aynı durumu "ofis/owner çağrı satırında
  açıklamasız kaybolan düğmeler" olarak UX sorunu sayıyor. İkisi de aynı kök
  nedene (arayüz/sunucu kural farkı) farklı açılardan bakıyor — çözüm tek
  (kuralı DB'de de netleştirmek) ama hangi yönde (kısıtlamak mı, genişletmek
  mi) netleştirileceği broker kararına bağlı.
- **Görsel denetçi**, modal dikey ortalamasının sıçramasını [Sapma]/Önemli
  olarak görece düşük önemde değerlendirirken, aynı kademeli alanların
  **kullanılabilirlik** tarafında (Ö3, Ö6, Ö7) kafa karışıklığının "danışmanın
  en çok zaman kaybettiği 3 nokta"dan biri sayılması — ikisi aynı belirtiyi
  farklı şiddette görüyor. Моderatör notu: iki denetçi de aynı düzeltmeyi
  (etiket + sabit modal konumu) önerdiği için pratik çözüm ortak.
- **İş-değeri analisti**, "portföy talebi mi?" varsayılanını [Sapma] (broker
  kararı, standart ihlali değil) olarak etiketlerken, somut iş kaybı kanıtı
  sunduğu için bu rapor onu Bölüm 1'e (yayına engel) taşıdı — etiket/önem
  seviyesi arasında bir gerilim var, bilinçli olarak not edildi.

---

## 5. İş değeri özeti

- **Danışman:** Koşullu. Kademeli formlar (kategori→oda, tip→fiyat) danışmana
  yük getirmiyor ama bugün hiçbir karşılık (eşleştirme, otomasyon) üretmiyor.
  "Portföy talebi mi?" sorusu danışmana haftada ~1 dakikadan az zaman
  kazandırıyor; karşılığında en az 16 satıcı adayı danışmanın önüne hiç
  gelmemiş olabilir — komisyon riski kazanılan zamandan büyük.
- **Ofis/Broker:** Koşullu. Reklam Kaynakları raporu broker'ın gerçekten
  kullandığı değerli bir ekran, ama onu besleyen elle-giriş kutusu ölü ağırlık.
  Olumsuz sebebi toplama fikri doğru ama raporu yok — bugün "veri çöplüğü".
  Tek imza kuralı recruiting hunisini ölçülebilir biçimde hızlandırmıyor (20
  aday "Karar Bekliyor"da, panelde sadece 1 "Olumlu").
- **Çatışma:** Santral "bilgi amaçlı" varsayılanında ofis ve danışmanın kısa
  vadeli çıkarı (daha az tık, daha az alarm) hizalı ama ikisi de ofisin
  portföy hedefiyle (öncelik #5) çelişiyor — kaybedilen satıcı adayını hiç
  kimse görmüyor.

---

## 6. Önerilen sonraki 3 adım

1. **Bölüm 1'deki 5 bulguyu önceliklendirin** — özellikle 2'si (puanın geriye
   dönük değişmesi, mükerrer lead kaydı) CLAUDE.md'nin açık kurallarına aykırı
   ve veri bütünlüğünü etkiliyor; "Portföy talebi mi?" varsayılanı ise somut
   iş kaybı. Bölüm 3'teki 5 soruya kısa cevaplarınızı verin.
2. **Gizlenen/koşullu alan normalizasyonunu tek yerde (provider + DB CHECK)
   toplayın** — 4 denetçinin bağımsız bulduğu en yaygın kök sorun bu; tek bir
   düzeltme turu (`normalizeOpportunityPayload` / `normalizeCallPayload` +
   ilgili CHECK kısıtları) listedeki ~6 ayrı bulguyu aynı anda kapatır.
3. **Modal.jsx'teki dikey ortalamayı üstten sabitlemeye çevirin** — tek
   dosyalık, düşük riskli bir değişiklik; 2 denetçinin bağımsız bulduğu
   "kademeli alan değişince ekran zıplıyor" sorununun tamamını kapatır.

---

Yanlış veya eksik bulguları docs/kurul/geri-bildirim.md dosyasına yazıp
/kurul-egit komutunu çalıştırın.
