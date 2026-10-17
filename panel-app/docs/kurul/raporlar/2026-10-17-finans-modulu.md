# Kurul Raporu — Finans Modülü (Ciro Raporları / Banka Hareketleri / Gider Defteri / Danışman Anlaşmaları)

**Tarih:** 2026-10-17
**Konu:** Broker'ın paylaştığı "Finans Modülü Mimarisi" diyagramı ve sorusu: *"bu kısımda sorun yaşıyorum yeni halinde eksik hata var mı"*
**Denetçiler:** kod-güvenlik-denetçi, veri-zinciri-analisti, kullanılabilirlik-denetçi, görsel-denetçi, iş-değeri-analisti (2 aşamalı paralel + 1 aşama)
**Bağlam notu:** Denetim sırasında, broker'ın canlı geri bildirimleriyle üç küçük düzeltme ayrıca yapılıp yayınlandı (rapor detayında müşteri bilgileri/beyan artık gösteriliyor, KDV dahil/hariç tutarlar tutarlı formatta, "Önerilen fatura" etiketi "Hakediş" oldu) — bu rapor onları kapsamıyor, aşağıdaki bulgular bunlardan ayrı, daha derin konular.

---

## 1. Yayına Engel Olanlar

Bu modül zaten canlıda ve kullanımda (2026-10-08'den beri) — "yayına almadan önce" denetimi değil. Ama iş-değeri-analisti'nin Supabase'den çektiği gerçek veri önemli bir bağlam veriyor: **sistemde toplam 1 ciro raporu var, henüz onaylanmamış, ve o tek kayıt bile aşağıdaki #8 (hakediş hesaplanamaması) sorununu canlıda yaşayıp elle düzeltilmek zorunda kaldı.** Yani bu bulgular teorik değil — ilk gerçek kullanımda zaten gerçekleşmiş.

Stage 1'den (kod-güvenlik-denetçi + veri-zinciri-analisti) **4 ayrı [İhlal] [Kritik]** çıktı, hepsi para/veri bütünlüğünü doğrudan etkiliyor:

> **[İhlal] [Kritik] — Onay (approve) işlemi tek bir veritabanı işlemi değil, çift sayım mümkün**
> `supabaseProvider.js` (satır 1652-1688): `approve()` 5+ ayrı ayrı REST çağrısından oluşuyor (katılımcı başına `league.addScore`, durum güncelleme, cari hesap satırı ekleme) — tek transaction değil. Başında "rapor hâlâ onay_bekliyor mu" kontrolü YOK. Çift tıklama, ağ kesintisi sonrası tekrar deneme veya iki yöneticinin (broker+owner, ikisi de yetkili) aynı anda "Onayla"ya basması → bir danışmanın cirosu Lig'e ve cari hesaba **iki kez** yazılabilir, hiçbir kayıt bunu sonradan ayırt edemez (kaynak izi yok). CLAUDE.md'nin "Asla olmaması gerekenler — Puanın geriye dönük olarak sessizce değişmesi" maddesiyle doğrudan çakışıyor.

> **[İhlal] [Kritik] — Aynı işlemi iki kez raporlayıp onaylamayı engelleyen hiçbir kısıt yok**
> `dis_beyan_kodu` (tekil işlem kimliği) üzerinde DB'de UNIQUE kısıt yok (sadece `is not null`). Aynı satış iki farklı danışman veya aynı danışman tarafından iki kez girilip onaylanabilir — tek koruma insan dikkati.

> **[İhlal] [Kritik] — Muhasebeye özel alanlar (fatura teyidi, ofis fatura bilgisi, RT/Ofis payı) danışman tarafından da yazılabiliyor**
> RLS satır bazlı izin veriyor ama kolon bazlı kısıt yok; `information_schema.column_privileges` sorgusuyla doğrulandı — `authenticated` rolü `teyit_edildi`, `teyit_eden_id`, `rt_payi_tutari`, `ofis_payi_tutari`, `gd_cirosu` dahil her kolonda UPDATE yetkisine sahip. Bir danışman, API'ye doğrudan istek atarak kendi faturasını kendisi "broker onaylı" işaretleyebilir — Fatura Kontrol sürecinin tüm amacını (muhasebe ayrılığı ilkesi) devre dışı bırakır. Codebase'de aynı sınıf soruna karşı iki emsal düzeltme zaten var (`tasks_restrict_assignee_update`, `event_attendance_restrict_katilim_tipi`) — bu desen ciro_raporlari'na hiç uygulanmamış.

> **[İhlal] [Kritik] — Danışman kendi taslak/reddedilen raporunu silebiliyor, broker'ın zaten eşleştirdiği banka kayıtları da onaysız siliniyor**
> `banka_hareketleri.ciro_raporu_id` → `ON DELETE CASCADE`. Danışman "Sil"e bastığında, o rapora bağlı TÜM banka hareketleri gider — broker bunları çoktan `eşleşti`/`teyit edildi` yapmış olsa bile. CLAUDE.md "Asla olmaması gerekenler — Onaysız veri silme" ile doğrudan çakışıyor.

**Ek olarak (Stage 1'de [Önemli] ama iş-değeri-analisti'nce [Kritik]'e yükseltildi):** Owner rolünün banka hareketi/masraf ekranlarına giremediği kararı sadece arayüzde — RLS'te `is_manager()` (broker+owner) tam yetki veriyor. Owner hesabı zaten "muhasebeci" olarak kullanılıyorsa bu bilinçli olabilir (aşağıda [Sapma] olarak da listelendi, broker kararı bekliyor).

**Özet:** Bu modül şu an "resmi cari hesap kaynağı, ayrı bir muhasebe programına gerek bırakmayan" bir sistem olarak güvenilemez — finansal kayıt bütünlüğünün temel garantileri (çift sayılmama, onaysız silinmeme, sadece yetkilinin teyit edebilmesi) veritabanı seviyesinde henüz sağlanmıyor.

---

## 2. Birleştirilmiş Öncelik Listesi

### [İhlal] — Kritik, birden fazla denetçi

1. **Onay akışı atomik değil / çift sayım riski** — *3 denetçi* (veri-zinciri, kod-güvenlik, iş-değeri). Bkz. Bölüm 1.
2. **Ortak katılımcı, rapor "Taslak" iken habersiz kalıyor** — *4 denetçi* (veri-zinciri, kod-güvenlik, kullanılabilirlik, iş-değeri). `taslakReports` filtresi sadece `olusturanId===user.id`; `danismanRaporlarim` taslak durumunu tamamen dışlıyor. Ortak danışman, raporu "Onaya Gönder"e basılana kadar hiçbir ekranda görmüyor.
3. **Onay, ortak katılımcının faturası girilmeden yapılabiliyor** — *4 denetçi* (aynı grup). Hem "Onaya Gönder" (`ownFaturaNoVar`) hem broker'ın "Onayla"sı sadece raporu oluşturanın fatura no'suna bakıyor. #2 ile birleşince: ortak danışman habersizken, kendi faturası hiç girilmeden işlem onaylanıp Lig'e ve cari hesaba yazılabiliyor.
4. **Ortak danışmanın hakediş tutarı hesaplanamıyor (RLS kısıtı)** — *4 denetçi* (veri-zinciri, kod-güvenlik, kullanılabilirlik, iş-değeri) — **gerçekleşmiş olay.** Danışmanlar birbirinin anlaşma oranını göremiyor (doğru/bilinçli gizlilik kararı), ama bu yüzden formu dolduran kişinin tarayıcısında ortağın "kesmesi gereken hakediş" hesaplanamıyor, NULL kaydediliyor. Bugünkü tek gerçek rapor bunu yaşadı, elle düzeltildi. Kök neden: finansal hesap tamamen istemci tarafında yapılıyor, sunucu tarafında doğrulanmıyor/yeniden hesaplanmıyor.
5. **Tekil işlem kimliği yok, çift rapor/çift onay engeli yok** — *2 denetçi* (veri-zinciri, iş-değeri — DB'de doğrulandı, pkey dışında UNIQUE yok). #1 ile birleşince riski güçlendiriyor.
6. **Muhasebeye özel alanlar danışmandan korunmuyor (kolon bazlı RLS yok)** — *2 denetçi* (kod-güvenlik, iş-değeri — `column_privileges` ile doğrulandı).
7. **Danışman sildiğinde broker'ın eşleştirdiği banka kayıtları da onaysız gidiyor** — *2 denetçi* (kod-güvenlik, iş-değeri — CASCADE doğrulandı).
8. **"Onayla" butonunda onay penceresi (confirm) yok** — *2 denetçi* (kullanılabilirlik, iş-değeri). Geri alınamaz bir işlem tek tıkla kesinleşiyor; #1'deki çift tıklama riskini büyütüyor.

### [İhlal] — Önemli

9. **`cari_hareketler` satırı hiç açılmamışsa, sonradan fatura girilince sessizce güncellenmiyor** — *1 denetçi* (veri-zinciri). #4'ün devamı: ortağın hakedişi NULL kaydedildiği için onay anında cari hesaba hiç "alacak" satırı açılmıyor; danışman sonra kendi faturasını girse bile sistem SADECE var olan satırı günceller (insert etmez) — o danışmanın alacağı Cari Hesap'ta hiç görünmüyor.
10. **Owner, RLS seviyesinde banka hareketi/masraf düzenleyebiliyor** — *2 denetçi* (kod-güvenlik, iş-değeri). UI'da gizli ama API'den erişilebilir. **Broker kararı bekliyor** (bkz. Bölüm 3) — owner zaten muhasebeci olarak mı kullanılıyor?
11. **SECURITY DEFINER yardımcı fonksiyonlar (`ciro_raporu_durum`, `ciro_raporu_olusturan_id`, `ciro_raporunda_katilimci_mi`) anon/authenticated'dan revoke edilmemiş** — *1 denetçi* (kod-güvenlik). Herhangi bir oturum, erişimi olmayan bir raporun durumunu/sahibini RLS'i hiç tetiklemeden sorgulayabiliyor. Codebase'de aynı deseni kapatan bir emsal migration zaten var.
12. **Durum rozetleri marka token'larını değil, stok Tailwind renklerini kullanıyor; ortak `Badge` bileşeni hiç kullanılmıyor** — *2 denetçi* (görsel, iş-değeri).
13. **`masrafOlarakIsaretle()`/`blokeyiCozumle()` de approve() ile aynı atomik-olmayan desende** — *1 denetçi* (veri-zinciri). Aynı kök nedenin (DB fonksiyonuna taşınmamış işlemler) başka iki yerdeki tekrarı.

### [İhlal] — Önemli (görsel/erişilebilirlik)

14. **`text-muted`/`surface-sunken` metin-zemin kontrastı WCAG 1.4.3 eşiğinin (4.5:1) hemen altında (~4.47:1)** — *1 denetçi* (görsel, hesaplandı).
15. **Standart-dışı hizmet bedeli uyarı metni 11px özel boyut + ~2.94:1 kontrast (WCAG ihlali, finansal açıdan önemli bir uyarı)** — *1 denetçi* (görsel).
16. **Marka kırmızısı (`brand-600`) ile yıkıcı işlem kırmızısı (`red-600`) göz ile ayırt edilemiyor** — *1 denetçi* (görsel).
17. **Form (`CiroRaporuFormModal.jsx`) hâlâ eski `ink-*` paletinde, aynı veriyi gösteren panel yeni semantik tokenlerde** — *1 denetçi* (görsel) — broker kararı bekliyor, bkz. Bölüm 3.
18. **Form: eksik alan isimle söylenmiyor (sadece buton pasif), telefon/TC alanlarında doğru mobil klavye (`inputMode`) yok** — *2 denetçi* (kullanılabilirlik, iş-değeri) — düşük maliyetli, yüksek getirili bir düzeltme.
19. **Küçük "×" kaldır butonları WCAG 2.5.8 dokunma hedefi (24×24px) eşiğinin altında olabilir** — *1 denetçi* (görsel, kod çıkarımı — tarayıcıda ölçülmedi).

### [Sapma] — Önemli

20. **KVKK: TC Kimlik No zorunlu alan, saklama/silme/anonimleştirme politikası tanımsız** — *1 denetçi* (kod-güvenlik) — hukuki görüş gerektirir, broker/hukuk danışmanı netleştirmeli.
21. **`danisman_anlasmalari`'nde geçerlilik tarihi çakışmasını engelleyen DB kısıtı yok** — *1 denetçi* (veri-zinciri) — "hangi oran geçerli" seçimi tamamen istemci tarafında.
22. **`create()` rollback'i (hata durumunda yarım taslağı silme) sonucu doğrulanmıyor** — *1 denetçi* (kod-güvenlik) — rollback'in kendisi başarısız olursa yarım/katılımcısız taslak sessizce kalabilir.
23. **Satıcı/alıcı temsilci danışman seçimi varsayılan hep "Ben"; eski 2-kişilik kayıtları düzenlerken satıcı/alıcı eşleşmesi "tahmin" ama ekranda bu belirsizlik gösterilmiyor** — *1 denetçi* (kullanılabilirlik).

### [Görüş] — Öneri

24. Fatura/dekont dosyaları, rapor silinince storage'da sahipsiz kalıyor (KVKK silme talebi senaryosunda sorun yaratabilir).
25. Dosya türü doğrulaması sadece uzantı/MIME, gerçek içerik (magic bytes) kontrol edilmiyor — düşük risk.
26. Genişletilmiş rapor kartı mobilde yoğun; para hareketi satırları kaydedildikten sonra düzenlenemiyor; boş durumlar aksiyon önermiyor; Banka Hareketleri tablosu mobilde yatay kaydırma gerektiriyor.
27. Bugün eklenen müşteri bilgisi bloğu, katılımcı satırlarıyla aynı kart/kenarlık stilini kullanmıyor (kenarlıksız dolgu vs. kenarlıklı kart).
28. Klavye odak halkaları hiçbir yerde özel tanımlanmamış (tarayıcı varsayılanı duruyor, olumlu ama marka'ya özel değil).

---

## 3. Senin Kararını Bekleyen [Sapma]'lar

1. **Owner'ın banka hareketi/masraf ekranlarına girememesi bilinçli bir rol kararı mıydı, yoksa sadece UI'da mı unutuldu?** Owner hesabı zaten "muhasebeci" olarak kullanılıyorsa (CLAUDE.md'de böyle bir not var) DB'nin de izin vermesi kasıtlı olabilir — ama o zaman kod yorumlarındaki "owner bunu göremesin" ifadesiyle çelişiyor. Netleşirse ya RLS daraltılmalı ya da CLAUDE.md'ye "bilinçli" diye not düşülmeli.
2. **`CiroRaporuFormModal.jsx` eski `ink-*` renk paletinde kalsın mı, yoksa panelle (yeni semantik token) aynı sisteme mi taşınsın?** Finans modülü marka-kimligi.md'nin "geçiş durumu" listesinde hiç geçmiyor — bilinçli bir bekletme mi, unutulmuş mu belli değil.
3. **Durum rozetlerinde (Taslak/Onay Bekliyor/Onaylandı/Reddedildi/Eşleşti/Blokede) marka paletinde henüz tanımlı olmayan yeşil/mavi tonlar var — bunlar marka kimliğine resmen eklensin mi?**
4. **TC Kimlik No alanı gerçekten her durumda zorunlu olmalı mı (veri minimizasyonu), yoksa bazı senaryolarda opsiyonel mi olabilir?** Hukuki/KVKK netleşmesi gerekiyor.

---

## 4. Denetçilerin Çeliştiği Noktalar

Doğrudan bir çelişki yok, ama **vurgu farkı** var: kod-güvenlik-denetçi ve iş-değeri-analisti, owner'ın banka/masraf erişimini "Kritik" seviyede güvenlik açığı olarak işaretlerken, iş-değeri-analisti aynı bulguyu "muhasebe = owner hesabı kullanılıyorsa bilinçli olabilir" diye yumuşatıyor. Benim değerlendirmem: **bu, netleşene kadar [Sapma] olarak kalmalı** (Bölüm 3, madde 1) — sadece broker hangisi olduğunu söyleyebilir, ikisi de kodun kendisinden çıkarılamıyor.

---

## 5. İş Değeri Özeti

**Danışman için:** Kendi cirosunu kendi girmesi gerçek bir kazanç (Lig/Mentor Primi doğrudan buna bağlı, "ofis istedi" değil "param buna bağlı" diye kullanır) — ama ortaklı işlemlerde habersiz kalma ve kendi hakedişinin hesaplanamaması riski, özellikle co-listing yapan danışmanlarda güven kırıcı; bugünkü tek gerçek kayıt bunu doğruladı.

**Ofis için:** Vizyon doğru (ayrı muhasebe programına gerek kalmasın) ama şu anki haliyle finansal kayıt bütünlüğünün temel garantileri (çift sayılmama, onaysız silinmeme, sadece yetkilinin teyit edebilmesi) veritabanı seviyesinde sağlanmıyor — broker bu modüle "resmi cari hesap kaynağı" olarak güvenip ayrı takibi bırakırsa, çift sayım/mükerrer kayıt riskini de üstlenmiş olur.

---

## 6. Önerilen Sonraki 3 Adım

1. **Onay (approve) işlemini tek bir veritabanı fonksiyonuna (RPC) taşı** — başında "rapor hâlâ onay bekliyor mu" kontrolü olsun, tüm adımlar (Lig, cari hesap, durum güncelleme) tek seferde ya hep ya hiç çalışsın. Bu, #1 (çift sayım) ve dolaylı olarak #9'u (cari hesaba hiç satır açılmaması) kapatır — en yüksek öncelik, çünkü gerçek para/puan riski.
2. **Ortaklı rapor akışını tamamla:** taslak aşamasında ortak katılımcıya da görünür yap, "Onaya Gönder"i ve "Onayla"yı TÜM katılımcıların faturası girilene kadar kapat, hakediş hesabını sunucu tarafına taşı (danışmanlar birbirinin oranını görmeden, sistem doğru hesaplasın). Bu üçü (#2, #3, #4) birbirine bağlı, ayrı ayrı yapılırsa eksik kalır.
3. **Bölüm 3'teki 4 soruyu** (owner yetkisi, form'un renk paleti, durum rozetlerinin marka tonu, TC No zorunluluğu) karara bağla — sonra kalan [İhlal]/[Sapma] listesinden broker'ın onayladığı maddeler sırayla işleme alınsın.

---

Yanlış veya eksik bulguları docs/kurul/geri-bildirim.md dosyasına yazıp /kurul-egit komutunu çalıştırın.
