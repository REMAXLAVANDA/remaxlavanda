# Portal Kurulu Raporu — Danışmanın takip etmesi gereken menüler

**Tarih:** 2026-10-04
**Konu:** Portalda danışmanın düzenli takip etmesi gereken menüler/widget'lar
(Panel danışman bloğu, Sağlık Skoru, Eğitim, Görevler, Operasyon, Fırsatlar,
Lig) işlevsel mi — danışman "ne yapmam gerekiyor, nerede duruyorum"
sorusuna doğru cevap bulabiliyor mu?
**Yöntem:** 5 denetçi (.claude/agents/ tanımları birebir) birbirinin
sonucunu görmeden çalıştırıldı. kod-güvenlik + veri-zinciri (paralel) →
kullanılabilirlik + görsel (paralel) → iş-değeri.

---

## 1. Yayına engel olanlar

**[İhlal] [Kritik] Danışman kendi `users` satırında yönetimin kontrol ettiği
alanları değiştirerek Sağlık Skorunu manipüle edebiliyor** (kod-güvenlik)
- `users_update_self_or_broker` RLS'i + geniş kolon yetkisi, danışmanın
  `test_hesabi` (kendini tüm listelerden gizler), `son_aktif` (geleceğe
  çekip "aktif" görünür, portal kullanım yüzdesi üst sınırsız olduğu için
  %3750'ye kadar şişebiliyor), `created_at` (ciro hedefini düşürür) gibi
  alanları kendi başına değiştirebilmesini sağlıyor. Rol simülasyonuyla
  doğrulandı. CLAUDE.md "Asla olmaması gerekenler — Puanın geriye dönük
  olarak sessizce değişmesi" kuralına aykırı.

**[İhlal] [Kritik] 7 günlük varsayılan filtre bekleyen işlerin çoğunu
gizliyor, ekran "harika!" diyor** (kullanılabilirlik, iş-değeri ile
canlı veride doğrulandı)
- Canlıda takip gerektiren 24 bekleyen çağrının sadece 5'i (%21) işaretli,
  14'ü 2 günden eski. Panel'in "Sana Atanan Çağrılar"/"Açık Fırsatlar"
  widget'ları 7 günlük filtre yüzünden bunların çoğunu (bazı
  danışmanlarda %76'sını) hiç göstermiyor; son 7 günde yeni kayıt yoksa
  ekran "Bekleyen çağrı yok, harika!" yazıyor. Broker/owner'ın "Dikkat
  Gerekiyor" kartı bilerek tarih filtresinden bağımsız yapılmışken aynı
  mantık danışman kartına uygulanmamış.

**[Sapma → Kritik etki] Sağlık Skoru yapısal olarak "İyi" sonuç
veremiyor** (iş-değeri, kod/veri ile doğrulandı)
- Eğitim bileşeni (ağırlık %20) canlıda 0 modül olduğu için herkeste
  sabit %0 — skorun tavanı bu yüzden 80, yani tam olarak "İyi" eşiği.
  Pratikte hiçbir danışman "İyi" olamıyor. Ayrıca `education_modules`
  tablosunu doldurabilecek bir arayüz portalda hiç yok (sadece SQL'den
  eklenebilir) — özellik hiç başlatılamamış, terk edilmiş değil.

**[İhlal] [Kritik] Panel'deki Lig podyumu, Lig sayfasının podyumuyla AYNI
DEĞİL** (veri-zinciri + görsel, bağımsız olarak aynı bulguyu buldu)
- Panel farklı bir Memnuniyet formülü (saf Wilson) ve farklı bir sıralama
  mantığı kullanıyor; Lig sayfası düzeltilmiş `memnuniyetPuani` formülünü
  ve "hiç yorum hakkı olmayanı sıralamaya katma" kuralını kullanıyor. Kod
  yorumunda "Lig ile BİREBİR aynı" yazsa da artık değil. Kanıt: aktif
  dönemde kimsede alınan yorum yok; Lig 7 kişiyi ciroya göre sıralarken
  Panel 21 kişiyi (0 puanlılar dahil) liste sırasına göre diziyor —
  farklı kişiye "lider" tacı verebiliyor.

**[İhlal] [Kritik] "Lead Dönüş Oranı", broker'ın "girmesi gerekmez"
dediği bilgi amaçlı çağrıları da cezalandırıyor** (veri-zinciri +
kullanılabilirlik + iş-değeri, 3 denetçi bağımsız buldu)
- `leadResponsePercent` tüm atanmış çağrıları sayıyor, `callNeedsTracking`
  filtresini (migration 20260804130000'deki broker kararı: "portföy
  çağrısı değilse danışman bilgi girmesi gerekmesin") uygulamıyor. Canlı
  örnekler: takip gerektirenlerde fiilen %85-100 dönüş yapan danışmanlar
  skorda %29-31 görünüyor.

Bu 5 bulgu, modülün bugünkü haliyle "danışman kendi işini portaldan takip
edebiliyor" iddiasını geçersiz kılıyor — düzeltilmeden yayında kalması
önerilmez.

---

## 2. Birleştirilmiş öncelik listesi

### [İhlal] — 3 denetçi: Dönem kapalıyken Panel ile Lig çelişiyor
Lig sayfası danışmana "sonuçlar hazırlanıyor, sürpriz kalsın" diyor; Panel
aynı anda tam podyumu gösteriyor çünkü dönem durumu kontrolü yok. İlk
gerçekleşme ~24 Aralık (dönem bitişine 7 gün kala). Kaynaklar:
veri-zinciri #13, kullanılabilirlik #12, görsel #11. Çözüm: Panel'de de
`periodEffectiveDurum` kontrolü, Lig'le aynı kilit mesajı.

### [İhlal] — 2 denetçi: Daha önce raporlanan (kademeli-menü taramasındaki
G3/G6) "fırsat durumu RPC'yi atlıyor" bulgusu hâlâ açık
Bu oturumun önceki `/kurul` taramasında (2026-10-04, kademeli menü
seçimi) "yayına engel" listesine girmişti, henüz düzeltilmedi — bu tarama
bağımsız olarak aynı açığı tekrar buldu (kod-güvenlik G6). `status`,
`claimer_id`, `owner_id`, `closed_at`, `closed_by` kolonlarının UPDATE
yetkisi hâlâ `authenticated`'a açık.

### [İhlal] — 2 denetçi: Memnuniyet podyumu formülü Panel/Lig arasında
ayrışmış (Bölüm 1'deki "Lig podyumu" bulgusuyla aynı kök, ayrı maddeler)
veri-zinciri #9 + kullanılabilirlik #9. Çözüm: sıralamayı tek bir paylaşılan
fonksiyona (`buildLeagueRankings`) taşı.

### [İhlal] — 1 denetçi, ama canlı veriyle güçlü: Pasife alma danışmanın
açık çağrı/fırsatlarını devretmiyor (veri-zinciri #17, Kritik)
Canlıda pasif bir danışmanın üzerinde 10 bekleyen çağrı + 6 üstlenilmiş
fırsat var, hiçbir listede görünmüyor. Bugün ayrı bir düzeltmeyle (isim
görünürlüğü) bu kayıtların en azından "Atanmadı" ile karışması önlendi,
ama asıl "devret" akışı hâlâ yok.

### [İhlal] — 1 denetçi, geniş kapsamlı: `text-text-disabled` kontrastı
(2.60:1) danışman ekranlarının ~21 yerinde kullanılıyor (görsel #2)
Önceki denetimde bilinen bir sorun (marka-kimligi.md'de işaretli), bu
taramada danışman ekranlarında somut 21 konum listelendi. Çözüm:
`text-text-muted` (4.83:1) ile değiştir.

### [İhlal] — 1 denetçi: 375px'te Açık Fırsatlar satırları karttan taşıp
kırpılıyor + %200 yakınlaştırmada çakışma (görsel #4, #5)

### [İhlal] — 1 denetçi: Takvim ay görünümü 375px'te okunamıyor, etkinlik
adları harf harf kırılıyor (görsel #14)

### [Sapma] — 3 denetçi: Danışmanın kendi "Dikkat Gerekiyor" eşdeğeri yok
(kullanılabilirlik #3, iş-değeri #5, kod-güvenlik dolaylı)
Danışman kendi gecikmelerini (bekleyen çağrı, süresi geçmiş görev, eski
açık fırsat) görmek için kendisi birkaç ayrı sayfaya girmeyi hatırlamak
zorunda — Panel'de hiçbir eşdeğer sinyal yok.

### [Sapma] — 2 denetçi: Açık dönemde danışman Lig'de kendi sırasını/
farkını hiçbir yerde göremiyor (sadece ilk 3 gösteriliyor)
kullanılabilirlik #8, iş-değeri #6. CLAUDE.md'nin "komşuya fark (diff)"
felsefesi "bilgiyi yumuşat" demekti, "hiç gösterme" değil — 4-17. sıradaki
14 danışman 4 ay boyunca Lig'den geri bildirim almıyor. Ayrıca CLAUDE.md
ve `docs/bilgi-bankasi/puanlama-motivasyon.md`, kodun artık yapmadığı
"tam liste herkese açık" ifadesini hâlâ taşıyor — doküman güncel değil.

### [Sapma] — 1 denetçi: "Broker Notları" bölümü hâlâ mock/deneme
verisinden okunuyor, gerçek kullanıcıda hep boş (kullanılabilirlik #17,
veri-zinciri H7)

### [Sapma] — 1 denetçi: Sağlık Skoru tablosunda eşik renkleri masaüstünde
hiç görünmüyor (bir CSS kuralı eziyor), mobilde görünüyor (görsel #6)

### [Sapma] — tekil ama önemli bulgular (1 denetçi, Önemli seviyede)
- G2: Danışman kendi çağrısında `created_at`, `reklam_kodu`,
  `portfoy_talebi_mi` gibi broker'ın görmesini beklediği alanları da
  değiştirebiliyor (kod-güvenlik).
- G4: Danışman katılım satırını başka bir etkinliğe taşıyıp zorunlu
  toplantı cezasından kurtulabilir (kod-güvenlik, statik analiz).
- G5: "Katılacağım" deyip gelmeyen danışman hiç skor kaybetmiyor (cron
  sadece 'davetli' satırları çözüyor, 'onayladi' kalıcı nötr kalıyor) —
  veri-zinciri bu kök nedeni teyit etti, canlıda 11 örnek.
- Eğitim/checklist'teki "Tamamlandı" rengi sayfa içinde iki farklı renk
  (kırmızı modül onayı / yeşil checklist onayı) — kırmızı aynı ekranda
  hem "kritik" hem "bitti" anlamına geliyor (görsel #9).
- Kısmi veri hatasında widget "yüklenemedi" yerine olumlu boş mesaj
  gösteriyor, hata ile boş durum görsel olarak ayrışmıyor (kullanılabilirlik
  #11, görsel #10 — 2 denetçi aynı kökten).

---

## 3. Senin kararını bekleyen [Sapma]'lar

1. **Eğitim modülleri portalda gerçekten takip edilecek mi?** Evetse
   modül ekleme ekranı şart (şu an yok). Hayırsa Sağlık Skoru'nun eğitim
   bileşeni onboarding checklist'inden hesaplanmalı (checklist zaten
   canlı ve ortalama %77 — gerçek kullanılan mekanizma bu).
2. **Açık dönemde Lig'de danışman kendi sırasını görsün mü?** Göremiyor
   olması bilinçli bir "sürpriz" kararı mı, yoksa "komşuya fark" kararının
   istenmeyen bir sonucu mu?
3. **"Katılacağım" deyip gelmeyen danışman için skor cezası olsun mu?**
   Şu an hiç olmuyor (cron sadece cevapsız davetleri çözüyor).
4. **Danışman panelinde Lig podyumu en üstte mi kalsın?** (Bilerek
   istendiği kod yorumunda yazıyor ama CLAUDE.md'nin "bilinçli tasarım
   kararları" listesinde değil — orada da yazılsın mı?)
5. **Çağrı/katılım alanlarında danışmanın düzenleyebileceği kolonlar
   (G2, G4) bilinçli mi, yoksa dar bir trigger ile mi kısıtlanmalı?**

---

## 4. Denetçilerin çeliştiği noktalar

- **Kod-güvenlik**, danışmanın `users.test_hesabi`/`son_aktif` alanlarını
  değiştirebilmesini doğrudan bir güvenlik açığı (Kritik İhlal) olarak
  görürken, **iş-değeri** aynı olayın ARKASINDAKİ motivasyonu sorguluyor:
  "Sağlık Skoru zaten güvenilmez görünüyorsa, danışman neden manipüle
  etmek istesin ki?" — ikisi de haklı, ama öncelik sırası farklı: önce
  skorun kendisini (Bölüm 1, madde 3) güvenilir hale getirmek, sonra
  manipülasyon kapısını kapatmak mantıklı bir sıra olabilir; ya da ikisi
  paralel yürütülebilir.
- **Görsel denetçi**, Panel'deki Lig podyumunun en üstte olmasını düşük
  önemde bir "Sapma" olarak işaretlerken, **kullanılabilirlik** bunu
  "danışmanın en çok zaman kaybettiği 3 nokta"dan biri sayıyor (gerçek iş
  3. sıraya düşüyor). Pratik çözüm ikisinde de aynı: en üste aksiyon
  gerektiren bir şerit eklemek.

---

## 5. İş değeri özeti

- **Danışman:** Zayıf. Hiçbir ekran danışmanın lehine çalışmıyor —
  gecikmelerini göremiyor, Lig'de kendi yerini göremiyor, Sağlık Skoru'nu
  görmüyor (ve görse de güvenemez), veri girişinin (checklist, dönüş
  işaretleme) kendine hiçbir karşılığı yok. Checklist'te danışmanın kendi
  işaretlediği madde sayısı **0** — hepsini ofis işaretliyor.
- **Ofis:** Koşullu. Ham veri gerçek ve kısmen canlı (1.507 çağrı kaydı,
  checklist ortalama %77, 17 danışmandan 12'si haftalık aktif), ama
  yönetim sinyalleri kirli: eğitim uyarısı kalıcı yanlış alarm, skor
  herkesi kırmızı gösteriyor, ciro hesabı Mayıs öncesini atlıyor. Broker
  bu sayılara bakıp karar verirse yanılabilir.
- **Çatışma:** Ofis, Sağlık Skoru ve "dönüş yapıldı" işaretlemesi
  üzerinden danışmanı denetlemek istiyor; danışman bu veriyi girmenin
  bedelini ödüyor ama karşılığında kendine dönük bir iş listesi almıyor.
  Sonuç: danışman veriyi girmiyor (dönüş işaretleme oranı %21), ofis
  eksik veriden üretilen kırmızı skorları görüp danışmanı "disiplinsiz"
  sanıyor, danışman da skoru haksız bulup ekranı görmezden geliyor —
  kısır döngü.

---

## 6. Önerilen sonraki 3 adım

1. **Danışman Panel'inin en üstüne "Benim gecikenlerim" kutusu ekleyin**
   — mevcut `isStaleReturn`/`isStaleOpp` fonksiyonlarını (tarih filtresi
   olmadan) kullanarak. Bu, 4 ayrı bulguyu (7 günlük filtre, Dikkat
   Gerekiyor eksikliği, veri girişinin karşılıksız kalması) aynı anda
   iyileştirir ve en düşük riskli, en yüksek etkili değişiklik.
2. **Sağlık Skoru'nu dürüst hale getirin**: eğitim bileşenini
   checklist'ten hesaplayın (ya da modül yoksa ağırlıktan çıkarın), ciro
   hedefini gerçek veri başlangıcından orantılayın, lead metriğine
   `callNeedsTracking` filtresini uygulayın. Bölüm 3'teki 1. soruya
   cevabınız bu işin kapsamını belirler.
3. **Panel ile Lig arasındaki podyum/formül ayrışmasını tek bir paylaşılan
   fonksiyona toplayın** (`buildLeagueRankings`) — hem Bölüm 1'deki
   "farklı lider" riskini hem Bölüm 2'deki Memnuniyet formülü ayrışmasını
   aynı anda kapatır.

---

Yanlış veya eksik bulguları docs/kurul/geri-bildirim.md dosyasına yazıp
/kurul-egit komutunu çalıştırın.
