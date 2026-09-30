# Emlak CRM'lerinde Lead Takibi Hangi Aşamalarla Yapılır?

**Araştırma tarihi:** 2026-09-30

## Kısa Cevap
Sektördeki yaygın uygulama, bir lead'i tek bir "açık/kapalı" durumu yerine
5-6 aşamalı bir huni (funnel) üzerinden izlemek: Yeni Lead → İletişime
Geçildi → Gösterim Ayarlandı → Teklif Verildi → Sözleşme Aşamasında →
Kapandı. Bunun altında, ilk temasın **hızı** (ilk 5 dakika içinde dönüş)
dönüşüm oranını en çok etkileyen tek faktör olarak öne çıkıyor. Bizim
panelde bu kavram kısmen var (Lead Havuzu → Fırsatlar/Recruiting yönlendirme
+ Fırsatlar'ın kendi 3 durumlu akışı) ama sektördeki gibi tek, uçtan uca,
çok aşamalı bir pipeline değil — bu bilinçli bir mimari kararla ("Lead
Havuzu pipeline DEĞİL, dağıtım noktası") örtüşüyor, eksiklik değil.

## Temel Bulgular (kaynaklı)

- **Follow Up Boss** (yaygın kullanılan, özel amaçlı emlak CRM'i):
  tipik aşamalar Yeni Lead, İletişime Geçildi, Gösterim Ayarlandı, Teklif
  Verildi, Sözleşme Aşamasında, Kapandı — artı eski müşteriler için ayrı
  "yeniden temas" aşamaları. [Kaynak: keetechnology.com karşılaştırması](https://keetechnology.com/blog/follow-up-boss-vs-kvcore)

- **HubSpot** (genel amaçlı CRM, emlak için özelleştirilebilir): deal
  pipeline'ları İlan, Gösterim, Teklif, Kapanış gibi aşamalarla
  özelleştirilebiliyor; lead nitelendirme (qualification) → gösterim →
  teklif müzakeresi → kapanış akışı öneriliyor. **[Üretici iddiası]**
  — HubSpot'un kendi pazarlama sayfası. [Kaynak: blog.hubspot.com](https://blog.hubspot.com/sales/real-estate-crm)

- **kvCORE (BoldTrail)** (hepsi-bir-arada platform): otomatik lead
  yönlendirme + kişiselleştirilmiş e-posta/SMS ile besleme (nurture)
  kampanyaları; pipeline'ın her aşamasını izleyen özelleştirilebilir
  panolar sunduğu belirtiliyor. **[Üretici iddiası]** — doğrulayan
  bağımsız kaynak bulunamadı. [Kaynak: keetechnology.com](https://keetechnology.com/blog/follow-up-boss-vs-kvcore)

- **Dönüşüm hunisi (genel, bağımsız kaynaklar):** Bazı kaynaklar 5
  aşamalı bir huni tanımlıyor (farkındalık → ilgi → değerlendirme →
  niyet → dönüşüm), bazıları daha sade 3 aşamalı bir model kullanıyor
  (farkındalık → değerlendirme → karar). İki model de birbirini
  doğrulamıyor, sektörde TEK bir standart yok — **kaynaklar çelişiyor**,
  ikisi de burada gösteriliyor. [Kaynak: theclose.com (arama sonucu özeti)](https://theclose.com/real-estate-lead-conversion/) · [luxurypresence.com](https://www.luxurypresence.com/blogs/convert-leads-with-a-marketing-funnel/)

- **Hız-lead (speed-to-lead) prensibi:** Bir lead'e ilk 5 dakika içinde
  dönüş yapmanın dönüşüm oranını %300'den fazla artırdığı yaygın olarak
  alıntılanıyor. **[Doğrulanamadı — varsayım olarak işaretleniyor]**:
  bu istatistiğin birincil kaynağına (orijinal araştırmaya) doğrudan
  ulaşılamadı; ağ erişim kısıtı nedeniyle birincil kaynak sayfaları
  (theclose.com, followupboss.com) doğrudan açılamadı, sadece arama
  motoru özetleri üzerinden görüldü. Sayı sıkça tekrarlanıyor ama
  bağımsız doğrulaması bu araştırmada yapılamadı.

- **NAR (National Association of Realtors) verisi:** Ortalama emlak
  lead dönüşüm oranının %0.4-%1.2 arasında olduğu belirtiliyor — bu da
  hacim ve tutarlılığın (sadece hız değil) önemine işaret ediyor.
  [Kaynak: arama sonucu özeti, birincil NAR sayfasına ağ kısıtı nedeniyle
  ulaşılamadı] **[Doğrulanamadı — birincil kaynağa ulaşılamadı]**

## Bizim Panele Uygulanabilirlik: **Kısmen uygun**

- Mevcut mimari (`lib/leads.js`) Lead Havuzu'nu BİLİNÇLİ olarak bir
  pipeline değil, bir **dağıtım noktası** olarak tasarlamış: durum
  sadece `yeni → atandi/elendi`, gerçek süreç hedef modülde (Fırsatlar
  veya Recruiting) devam ediyor. Bu, sektördeki tek-uçtan-uca-pipeline
  yaklaşımından **bilinçli bir sapma** — CLAUDE.md'deki "fazlar aynı
  kalsın, mimariyi değiştirmek istemiyorum" (2026-07-31) kararıyla
  uyumlu, hata değil.
- Fırsatlar modülünün durumu (`acik → claimed → kapandi/iptal`, 3
  durum) sektördeki 5-6 aşamalı huniden (Gösterim/Teklif/Sözleşme ayrı
  aşamalar değil) daha sade. Bu bir EKSİKLİK olabilir ama mimari
  değişikliği gerektirir — kendi başıma genişletilmedi, sadece not
  düşüldü (aşağıya bakın).
  Recruiting modülü zaten sektöre yakın bir yapıda (Yeni Başvuru →
  Randevu → Karar Bekliyor → Olumlu/Olumsuz), bu tarafta ek aşamaya
  gerek görünmüyor.
- Hız-lead prensibinin (ilk yanıt hızı) bizim panelde karşılığı
  `isStaleLead()` DEĞİL, "Müşteri İletişim Kuralları" dokümanındaki
  **15 dakikalık ilk dönüş süresi** kuralı — bu ikisi aynı metrik
  sanılıp karşılaştırılmamalı (bkz. düzeltme notu, broker geri
  bildirimi). `isStaleLead()` koddan doğrulandı (`lib/leads.js`,
  `pages/Leads.jsx`, `components/leads/LeadTable.jsx`): tamamen farklı
  bir amaca hizmet ediyor — Lead Havuzu'nda `durum='yeni'` olarak 24
  saatten uzun süre HİÇ triyaj edilmemiş (Recruiting/Portföy'e
  yönlendirilmemiş) lead'leri tabloda vurgulamak ve "staleFocus" adlı
  ayrı bir filtre moduyla (Leads.jsx'teki "Sadece bunları göster"
  düğmesi) bunları tek başlarına listelemek için var — yani "bu lead
  tamamen unutulmuş, hiç işleme alınmamış" diye bir GERİ PLAN
  denetim/hatırlatma sinyali, "müşteriye ilk yanıt ne kadar hızlı
  verildi" sinyali değil. İkisi farklı ölçüyor, doğrudan kıyaslanamaz.

## Denetçilere Önerilen Kurallar (taslak — onaysız uygulanmadı)

- **is-degeri-analisti için [Görüş]:** Fırsatlar modülünün 3 durumlu
  akışını (açık/üstlenildi/kapandı) incelerken, sektördeki 5-6 aşamalı
  pipeline modelini referans olarak an, ama "eksik" diye [İhlal]
  etiketleme — bu CLAUDE.md'nin bilinçli mimari kararıyla (dağıtım
  noktası tasarımı) uyumlu bir sadeleştirme, sadece ileride
  değerlendirilebilecek bir [Görüş] olarak not düşülsün.
- ~~veri-zinciri-analisti için [Sapma] adayı: isStaleLead()'in 24
  saatlik eşiği ile "ilk 5 dakika" hız-lead prensibi arasındaki fark~~
  — **GERİ ÇEKİLDİ** (broker geri bildirimi, 2026-09-30): yanlış
  eşleştirmeydi. `isStaleLead()` (24 saat, "hiç triyaj edilmemiş
  lead" hatırlatması) ile "ilk 5 dakika" (müşteriye ilk yanıt hızı,
  bizde 15 dakikalık kural olarak zaten Müşteri İletişim
  Kuralları'nda var) iki farklı metrik — [Sapma] önerisi doğru değil,
  denetçiye gitmeden düzeltildi.

## Kaynak Listesi
- [Follow Up Boss vs kvCORE: Speed-to-Lead Breakdown](https://keetechnology.com/blog/follow-up-boss-vs-kvcore)
- [HubSpot — 6 best CRMs for real estate businesses](https://blog.hubspot.com/sales/real-estate-crm) — üretici iddiası
- [The Close — Real Estate Lead Conversion Guide](https://theclose.com/real-estate-lead-conversion/) — birincil sayfaya ağ kısıtı nedeniyle doğrudan erişilemedi, arama özeti kullanıldı
- [Luxury Presence — Real Estate Marketing Funnel](https://www.luxurypresence.com/blogs/convert-leads-with-a-marketing-funnel/)
- [Sierra Interactive — First Contact to Closing](https://www.sierrainteractive.com/insights/blog/first-contact-to-closing-master-real-estate-lead-conversion/)

**Not:** Bu oturumda ağ erişim politikası theclose.com ve
followupboss.com gibi bazı birincil kaynak sayfalarına doğrudan
erişimi engelledi (`EGRESS_BLOCKED`) — sadece arama motoru özetleri
üzerinden bilgi alınabildi. Bu, "300% dönüşüm artışı" gibi sık
alıntılanan istatistiklerin birincil kaynağının doğrulanamamasının
nedenidir; yukarıda ayrıca işaretlendi.
