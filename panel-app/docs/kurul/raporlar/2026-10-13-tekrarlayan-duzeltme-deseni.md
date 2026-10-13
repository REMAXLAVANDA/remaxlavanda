# Kurul Raporu — "Bir şeyi düzeltince başka şey bozuluyor" deseni

**Tarih:** 2026-10-13
**Konu:** Broker'ın sorusu: *"neden bir şeyi düzelttiğimizde başka şeyler bozuluyor... bir menüyü değiştirdiğimde her şeyin olumsuz etkilenmesini nasıl planlamalıyım?"*
**Denetçiler:** kod-güvenlik-denetçi, veri-zinciri-analisti, kullanılabilirlik-denetçi, görsel-denetçi, iş-değeri-analisti (2 aşamalı paralel + 1 aşama)

---

## 1. Yayına Engel Olanlar

Bu bir "yeni modülü yayına almadan önce" denetimi değil — konu zaten canlıdaki bir davranış kalıbıydı. Ama denetim sırasında, **bu oturumda bugün yapılan bir düzeltmenin kendisinin yeni bir hataya yol açtığı** doğrulandı. Bu, acil müdahale gerektiriyor:

> **[İhlal] [Kritik] — `callNeedsTracking()` değişikliği, DÖNÜŞMÜŞ bir Santral çağrısını sessizce "bilgi amaçlı"ya düşürüyor**
> Bugün Santral çağrıları için `callNeedsTracking()` "portföy talebi olsa da takip gerekmez" şeklinde değiştirildi. Ama `OperasyonTab.jsx` (satır ~280-289), bir Santral çağrısı gerçekten bir Fırsat'a dönüştüğünde `portfoyTalebiMi: true` yazıyor — TAM OLARAK bu durumda "Süreç" zincirinin (Portföy Alındı/Satıldı) görünmesi için. Artık `callNeedsTracking` bu alana hiç bakmadığından, **gerçekten portföye/satışa dönüşmüş bir Santral çağrısı bile sürekli "Bilgi Amaçlı" rozetinde kalıyor** — Süreç filtrelerinde (Operasyon) hiç görünmüyor, "Dikkat Gerekiyor"/Sağlık Skoru takibinden de düşüyor. Gerçek bir müşteri ilişkisi operasyonel görünürlükten çıkıyor.
> **Kanıt:** 3 ayrı dosyada (`supabaseProvider.js`, `CallTable.jsx`, `mockCallLogs.js`) hâlâ eski davranışı anlatan bayat yorumlar var — kodun kendisi değişmiş, açıklamalar değişmemiş.
> **Öneri:** `callSurecDurumu()`'na `if (call.opportunityId) return <gerçek süreç>` gibi bir bypass eklenmeli, YA DA OperasyonTab'daki `portfoyTalebiMi: true` ataması artık işe yaramadığı için kaldırılmalı — ikisinden biri seçilmeli, broker kararı bekliyor.

Bunun dışında bugüne kadar deploy edilmiş bir şey için "yayın durdur" gerektiren başka bir bulgu yok (diğer [İhlal] Kritik'ler mevcut/eski davranışlar, aşağıda sırayla var).

---

## 2. Birleştirilmiş Öncelik Listesi

### 🔴 En üst öncelik — birden çok denetçi aynı kök nedeni işaret etti

**A. Merkezi iş kuralı fonksiyonları (`callNeedsTracking` gibi), kaç yerde kullanıldığı belgelenmeden değiştiriliyor** — *4/5 denetçi işaret etti (kod-güvenlik, veri-zinciri, kullanılabilirlik, iş-değeri)*
`callNeedsTracking()` 7+ dosyada (Panel, Takip, Operasyon, Ayarlar, attention.js) bağımsız tüketiliyor. Bugün broker bu kuralı AYNI GÜN İKİ KEZ değiştirmek zorunda kaldı çünkü ilk turda etkisi tam görülemedi. Yukarıdaki "Yayına Engel" bulgusu bunun doğrudan sonucu.
**Çözüm:** CLAUDE.md'ye merkezi fonksiyonların üstüne "bunu değiştirmeden önce şu dosyaları kontrol et" listesi + mevcut RLS kontrol listesinin (CLAUDE.md "Donma Olayları") iş-mantığı katmanına genişletilmesi.

**B. "Koşullu zorunlu alan" (A doluysa B de zorunlu) deseni kodda kalıp değil, her formda elle icat ediliyor — ve icat edilen hallerin bazıları WCAG kontrastını geçmiyor** — *3/5 denetçi (kullanılabilirlik, görsel, veri-zinciri referans)*
Randevu saat/tarih örneği düzeltildi ama AYNI deseni taşıyan en az 2 başka yer bulundu: Takvim'de `startTime` boşsa kod hata fırlatıyor (sessiz kayıp değil ama anlaşılmaz hata); Çağrı girişinde "Reklam" kaynağı seçilip `reklamKodu` boş bırakılırsa rapor sessizce o kaydı atlıyor. Düzeltmede kullanılan `text-amber-600` (3.19:1) ve `border-amber-300` (1.44:1) WCAG 1.4.3/1.4.11'i geçmiyor — marka dosyasında zaten doğrulanmış `tint-amber-text` (5.54:1) token'ı var ama kullanılmamış.
**Çözüm:** `components/common/Badge.jsx`'i genişleten ortak bir `FieldHint` bileşeni + CLAUDE.md "10 soru" listesine 11. soru ("bu alan başka bir alanın zorunluluğunu değiştiriyor mu, bu GÖRÜNÜR mü?").

**C. Çok adımlı yazma işlemleri atomik değil, retry/çift tıklamada çift sayım riski taşıyor** — *1/5 denetçi (veri-zinciri), ama [İhlal] Kritik ×2*
`delete-user` Edge Function (14 ayrı HTTP isteği, transaction yok) ve `ciroRaporlari.approve()` (çok katılımcılı döngü, idempotency guard yok, `cari_hareketler`'de UNIQUE kısıt yok) — ağ hatası/çift tıklama/iki onaylayıcının yarışı durumunda yarım silme veya çift puan/alacak kaydı riski.
**Çözüm:** Her ikisi de SECURITY DEFINER tek bir Postgres fonksiyonuna taşınmalı (proje zaten bu deseni `telsam-cdr-sync`'te doğru kullanıyor — örnek var, kopyalanabilir).

### 🟡 Önemli — tekil ama somut

- **[İhlal] Önemli** `UsersContext.knownUsers` önbelleği, danışman pasife alınınca/silinince güncellenmiyor — context'in kendi yorumu bu riski zaten tanımlamış, sadece `handleToggleDurum`/`handleDeleteUser`'da uygulanmamış. *(veri-zinciri)*
- **[İhlal] Önemli** `security_definer_view`: `public.coaching_note_hedefleri` — gerçek rol simülasyonuyla test edilmemiş. *(kod-güvenlik)*
- **[Sapma] Önemli** Dönem kapanma eşiği (`current_date`) UTC'de hesaplanıyor, Türkiye UTC+3 — ay/dönem sınırında ~3 saatlik kayma riski. *(veri-zinciri)*
- **[Görüş] Önemli** `ciro_girisleri`/`social_activity_log`'da idempotency anahtarı yok — çift tıklamada çift sayım riski (ayrı ve bağımsız bir risk, Ciro Raporu onayından farklı). *(veri-zinciri)*

### ✅ Bu oturumda zaten bulunup DÜZELTİLEN ve DEPLOY EDİLEN

- **Yönlendirme Durumu + Sağlık Skoru "ilk 90 gün"/ciro hedefi** gerçek işe başlama tarihi yerine `users.created_at` (toplu taşıma tarihi) kullanıyordu — 12 danışman yarın aynı anda (gerçek kıdemlerinden bağımsız) etkilenecekti. `mentor_primi_baslangic`'teki gerçek tarihi kullanacak şekilde düzeltildi, owner'a okuma izni eklendi, test edildi, deploy edildi. *(bu bulguyu veri-zinciri-analisti de bağımsız olarak doğruladı, iş-değeri-analisti riskini "en ağır" olarak işaretledi — Alper Özsevim örneği: %42 toplantı katılımı ama "Açık" görünüyordu.)*

---

## 3. Senin Kararını Bekleyen [Sapma]'lar — "bilinçli tercih mi?"

1. `public.telsam_sync_state` RLS açık ama politika yok (sadece service_role erişebiliyor) — bilinçli mi?
2. `assign_opportunity_to`/`close_opportunity`/`release_opportunity_to_pool` gibi yazma RPC'leri `anon` (giriş yapmamış) rolüne de açık görünüyor (fonksiyon içi kontrol var mı derinlemesine bakılmadı) — kontrol edilmeli.
3. `portfoyTalebiMi` alanı artık (Santral kararı sonrası) hiçbir davranışa etki etmiyor ama ofis hâlâ bu checkbox'ı işaretliyor — alan kaldırılsın mı, yoksa sadece bilgi amaçlı not olarak mı kalsın?
4. Dönem kapanışının UTC yerine Türkiye saatine göre hesaplanması — şimdiye kadar fark edilmemiş bir kayma, düzeltilsin mi?
5. "Koşullu zorunlu alan"ın görsel kalıbı (kenarlık mı, sadece metin mi, hangi renk) için tek bir standart belirlensin mi, CLAUDE.md'ye eklensin mi?
6. Amber rengi bir yerde "engelliyor" bir yerde "sadece bilgi" anlamına geliyor (Ciro Raporu formunda) — bu ayrıştırılsın mı?
7. "Oran Uyarısı" rozeti ile "Onay Bekliyor" durum rozeti birebir aynı renk/stil — ayırt edilebilir olsunlar mı (ör. ikon eklensin mi)?

---

## 4. Denetçilerin Çeliştiği Noktalar

Doğrudan bir çelişki bulunamadı — 5 denetçi de aynı kök deseni (merkezi kural/veri kaynağının birden fazla bağımsız, senkronsuz tüketicisi) farklı açılardan doğruladı, bu tutarlılığın kendisi dikkat çekici. Tek nüans farkı: kod-güvenlik-denetçi `callNeedsTracking` sorununu **somut, bugün yaşanan bir regresyon** olarak (production'da şu an yanlış davranan bir ekran) raporladı; iş-değeri-analisti aynı olayı **süreç/dokümantasyon boşluğu** olarak çerçeveledi. İkisi de doğru — biri "şimdi ne bozuk" sorusuna, diğeri "bir dahaki sefere nasıl önleriz" sorusuna cevap veriyor. Değerlendirmem: ikisi de rapora alındı, önce somut regresyon (Bölüm 1), sonra süreç önerisi (Bölüm 2-A).

---

## 5. İş Değeri Özeti

Danışman/ofis için tek satır: **Aynı bilgiyi (randevu saati, çağrı takip kuralı, danışmanın gerçek başlama tarihi) birden fazla ekranın birbirinden habersiz kullanması, bir yeri düzeltince diğerinin öğrenmemesine yol açıyor — bunun şu anki somut faturası: 12 danışmanın yarın aynı anda yanlışlıkla "yönlendirmeye açık" görünme riskiydi (düzeltildi), ve bugünkü Santral düzeltmesinin kendisi, dönüşmüş gerçek bir müşteri kaydını görünürlükten düşürdü (düzeltme bekliyor).**

---

## 6. Önerilen Sonraki 3 Adım

1. **Hemen:** Bölüm 1'deki `callSurecDurumu`/`OperasyonTab` çakışmasını karara bağla (bypass mı, ölü kod temizliği mi) — bu şu an canlıda yanlış davranan bir ekran.
2. **Bu hafta:** CLAUDE.md'ye "Paylaşılan Veri Kaynakları / Kural Haritası" bölümü ekle — hangi bilgi nerede gerçek kaynak, kim okuyor, bilinen tuzak (ör. "işe başlama tarihi → mentor_primi_baslangic, YOKSA users.created_at → Mentor Primi + Yönlendirme Durumu"). Bu, tam olarak bugün ikinci kez tekrarlanan hatayı (iki modülün aynı dersi iki kez öğrenmesi) önler.
3. **Sıradaki /kurul turu:** Bölüm 3'teki 7 "bilinçli mi?" sorusuna cevap ver, sonra `delete-user`/`ciroRaporlari.approve()` atomiklik düzeltmesini (Bölüm 2-C) planla — bu ikisi para/veri kaybı riski taşıyor, acil değil ama ertelenmemeli.

---

Yanlış veya eksik bulguları `docs/kurul/geri-bildirim.md` dosyasına yazıp `/kurul-egit` komutunu çalıştırın.
