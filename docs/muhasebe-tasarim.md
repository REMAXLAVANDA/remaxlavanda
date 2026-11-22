# Ön Muhasebe Çekirdeği — Tasarım Dokümanı

Durum: **taslak, kod yok** — broker onayı bekliyor.
Hazırlayan: Claude (portal geliştirme oturumu), 2026-11-22.

## Neden bu doküman

Şu an para hareketleri 7 ayrı tabloda tutuluyor: `cari_hareketler`,
`banka_hareketleri`, `genel_giderler`, `tedarikci_odemeleri`,
`ortak_hesabi_hareketleri`, `kasa_transferleri`, `emanetler`/
`emanet_hareketleri`. Her biri kendi ekranını besliyor ama aralarında
TEK bir doğru toplam yok — "şirketin bugün elinde ne kadar para var",
"bu ay ne kadar kâr/zarar edildi" gibi sorulara cevap vermek için bu 7
tabloyu elle toplamak gerekiyor. Bu doküman, bunları BOZMADAN, üzerlerine
tek bir "defter" katmanı kurmanın planını anlatıyor.

Kapsam dışı: e-fatura/e-arşiv kesme, resmi defter, beyanname. Faturalar
Bizimhesap'ta kesilmeye devam edecek — portal sadece fatura no + PDF
tutacak (zaten bugün de öyle, bkz. `fatura_no`/`fatura_dosya_url`
kolonları).

---

## a) Hesap planı

Bugün koddan/veritabanından doğrulanan gerçek kategoriler:

**Kasa/banka hesapları** (`kasalar` tablosu, `kasa_id` ile her harekete
bağlanıyor):
- Vakıfbank, Ziraat (bkz. 2026-11-22 banka ekstresi işleme) — gerçek
  banka hesapları.
- Nakit kasa(lar) — `tip` kolonuyla banka/nakit ayrımı yapılıyor olmalı,
  tam liste `kasalar` tablosundan okunmalı.

**Cari hesaplar:**
- Danışman carisi (`cari_hareketler`, `danisman_id` ile) — tek taraflı
  (sadece danışmana borç/alacak), kategori: `hizmet_bedeli`,
  `sahibinden_bedeli`, `ofis_katilim_bedeli`, `islem_masrafi`,
  `komisyon_farki`, `avans`, `ceza`, `odeme`, `diger`.
- Tedarikçi carisi — **henüz yok**, `tedarikci_odemeleri` sadece ÖDEMEYİ
  tutuyor, borç (gelen fatura) tarafı kayıtlı değil (bkz. madde f).
- Müşteri carisi — kodlanmış bir tablo yok, `musteriCarisi()`
  (`lib/bankaHareketleri.js`) banka hareketlerinden `gonderenAdi`'na göre
  TÜRETİYOR, ayrı bir bakiye kaydı değil.
- Ortak carisi (`ortak_hesabi_hareketleri`) — şu an SADECE çekiş
  (`tur='cekis'`), madde 1.3'te "koyma" eklenecek.

**Gelir kalemleri** (`cari_hareketler.kategori` + `banka_hareketleri.tur`
üzerinden): hizmet bedeli, sahibinden bedeli, ofis katılım bedeli.

**Gider kalemleri** (`genel_giderler.ana_kategori`: personel/işletme/araç,
altında serbest `alt_kategori` metni) — madde 1.2'deki 14 kategori
(REMAX Royalty/Network, SGK/Vergi, Maaş, Prim, Avukat/Hukuk, Noter, Ofis
Mutfak, Yiyecek İçecek, Reklam, Sosyal Medya Ajans, Yazılım/Abonelik,
Kırtasiye/Kargo, Banka Masrafı, Bağış, Diğer) bunun ÜZERİNE, ana
kategorilerin ALTINA yerleşecek alt kategoriler olarak düşünülüyor —
şema değişmeden, UI ve bir eşleme tablosuyla.

**Ayrıca bugün keşfedilen, dokümantasyonu eksik ikinci bir "masraf"
mekanizması var:** `islem_masraflari` tablosu — bir SATIŞ İŞLEMİNE
(ciro raporuna) bağlı masraf (örn. o işlemin tapu/noter gideri),
`siniflandirma` alanı `danisman_cari` (danışmanın carisine borç yazılır)
veya `ofis_gideri`/`siniflandirilmamis` olabiliyor. **Önemli bulgu:**
`ofis_gideri` seçilince hiçbir `genel_giderler` kaydı OLUŞMUYOR — bu
yüzden banka hareketini "Masraf" yapıp `ofis_gideri` seçen bir kayıt,
Kasa Raporu'nda hiç görünmüyor. Bu, madde 1.2'nin çözmesi gereken asıl
sorun.

**Emanet/bağlanma hesabı** (`emanetler` + `emanet_hareketleri`) — ayrı
bir "hesap" değil, bir fırsata bağlı, `yon` (giriş/çıkış) ve
`cikis_nedeni` ile izlenen bekleyen bakiye.

**KDV hesapları** — ayrı bir KDV tablosu yok; KDV oranı/tutarı
`ciro_raporu_katilimcilari.kdv_orani`/`kdv_haric_tutar` ve
`genel_giderler`/`tedarikci_odemeleri` seviyesinde satır satır duruyor,
toplanmış bir "KDV hesabı" bakiyesi hiçbir yerde tutulmuyor (madde h'deki
KDV özeti raporu bunu derleyecek, ayrı bir hesap AÇMAYA gerek yok çünkü
resmi beyanname zaten kapsam dışı).

---

## b) Tek defter tablosu (basitleştirilmiş çift taraflı kayıt)

Yeni tablo: `defter_kayitlari` (yalnızca OKUMA amaçlı, elle veri
girilmeyecek — bkz. madde c).

```
defter_kayitlari
  id                uuid
  tarih             date
  hesap_tip         text   -- 'kasa' | 'cari_danisman' | 'cari_tedarikci' |
                              'cari_musteri' | 'cari_ortak' | 'gelir' |
                              'gider' | 'emanet' | 'kdv'
  hesap_id          uuid   -- kasa_id / danisman_id / tedarikci kimliği / vb.
  yon               text   -- 'borc' | 'alacak'
  tutar             numeric
  kdv_tutari        numeric null
  kaynak_tablo      text   -- 'banka_hareketleri' | 'genel_giderler' | ...
  kaynak_id         uuid
  aciklama          text
  created_at        timestamptz
```

Kural: **her gerçek olay İKİ satır üretir** (bir hesaptan borç, başka bir
hesaba alacak), ikisinin tutarı birbirine eşit olmalı — klasik çift
taraflı mantık ama tam bir "genel muhasebe hesap planı" değil, sadece bu
7 kaynağı birbirine bağlayan bir köprü. Örnek: bir `genel_giderler` satırı
→ (kasa, borç/çıkış) + (gider kategorisi, alacak). Bir banka "hizmet
bedeli" girişi → (kasa, borç/giriş) + (gelir kategorisi, alacak).

Her kaydın `kaynak_tablo` + `kaynak_id` ile orijinaline dönülebilmesi
şart — defter hiçbir zaman "gerçek" veriyi barındırmayacak, sadece onu
yansıtacak.

---

## c) Mevcut tablolardan deftere bağlanma — trigger mı, view mi

**Trigger önerisi** (view değil): her kaynak tablo için
`AFTER INSERT/UPDATE/DELETE` trigger'ı, ilgili `defter_kayitlari`
satırlarını yazar/siler. View yerine trigger seçiliyor çünkü:
- Defter satırları geçmişe dönük sorgularda (ay sonu bakiye, geçmiş
  tarihli rapor) hızlı okunmalı — her sorguda 7 tabloyu birleştiren bir
  view, veri büyüdükçe yavaşlar.
- `kdv_tutari` gibi türetilmiş alanlar her satırda SABİT kalmalı (bir
  kaynak satırı silinirse defter satırı da silinmeli, güncellenirse
  defter satırı da güncellenmeli) — trigger bunu doğal olarak yapar.

Dokunulacak kaynaklar ve YÖN eşlemesi (ilk taslak):
- `banka_hareketleri` (INSERT/UPDATE: `durum`, `tutar`, `tip`)
- `genel_giderler` (INSERT/DELETE)
- `tedarikci_odemeleri` (INSERT/DELETE)
- `ortak_hesabi_hareketleri` (INSERT/DELETE, madde 1.3 sonrası)
- `kasa_transferleri` (INSERT/DELETE)
- `cari_hesap_odemeleri` (INSERT/DELETE)
- `emanet_hareketleri` (INSERT)

**Mevcut ekranlar hiç değişmeyecek** — hepsi bugünkü gibi kendi
tablosundan okumaya devam eder. Defter sadece YENİ raporların (madde h)
kaynağı olacak, var olan hiçbir sayfa defterden okumaya geçmeyecek. Bu
yüzden mevcut trigger'lara (`banka_hareketleri_komisyon_farki` vb.)
dokunulmuyor — defter trigger'ları bunlardan BAĞIMSIZ, ek olarak çalışır.

---

## d) Eski verinin taşınma planı ve mutabakat kontrolü

1. Trigger'lar yazılır ama "backfill" henüz yapılmaz.
2. Tek seferlik bir SQL script, var olan TÜM kayıtları (ilk kuruluştan
   bugüne) `defter_kayitlari`'na işler — trigger'ların ÜRETECEĞİ ile
   AYNI mantığı kullanır (aynı fonksiyon, elle çağrılır).
3. Mutabakat kontrolü: her `kasa_id` için, defterden hesaplanan bakiye
   (`acilis_bakiyesi` + tüm borç/alacak toplamı) ile bugün Kasa
   Raporu'nun gösterdiği bakiye KARŞILAŞTIRILIR — tutmazsa göç
   DURDURULUR, fark bulunup kapatılır. Aynı kontrol her danışmanın cari
   bakiyesi için de yapılır (defter toplamı == `cari_hareketler`'den
   bugün hesaplanan bakiye).
4. Mutabakat geçerse backfill canlıya uygulanır, geriye dönük hiçbir
   ekran değişmez (madde c).
5. Geri dönüş: `defter_kayitlari` tamamen ayrı, boş bir tablo olarak
   silinip yeniden denenebilir — hiçbir kaynak veri bu adımda
   değişmediği için risk düşük.

---

## e) Emanet/bağlanma parası akışı

Bugünkü akış (koddan doğrulandı — `cozumle_emanet()` RPC,
`BlokeCozumleModal.jsx`):

```
Alıcıdan bağlanma parası gelir
  → banka_hareketleri (durum='blokede', tur='baglanma_parasi')
  → trigger (banka_hareketleri_emanet_olustur) OTOMATİK emanetler kaydı açar
  → emanetler.durum = 'acik'

Tapu günü, 4 senaryodan biri (cozumle_emanet RPC):
  1. geri_gonder   → emanet kapanır, tüm tutar alıcıya geri çıkış
  2. saticiya_gonder → emanet kapanır, tüm tutar satıcıya çıkış
  3. mahsup_et     → emanet kapanır, tutar danışmanın hizmet bedeline sayılır
  4. kismi_mahsup  → bir kısmı mahsup, kalanı çıkış (emanet kapanır)

Her senaryo emanet_hareketleri'ne bir "çıkış" satırı ekler,
emanetler.durum = 'kapandi' olur.
```

**Zaten kural: emanet sıfırlanmadan (durum≠'kapandi') ilgili fırsat/ciro
raporu kapanamıyor mu?** — bugün KODLANMIŞ bir engel YOK, bu broker'ın
istediği (e) maddesindeki "emanet sıfırlanmadan işlem kapanmasın" kuralı
şu an sadece ekranda görünürlük (açık emanet rozeti) seviyesinde, veri
tabanı seviyesinde bir kısıt değil. Bu, 2. aşamada eklenecek YENİ bir
kontrol: ciro raporunu `onaylandi`'dan sonraki bir "kapandı" durumuna
(şu an böyle bir durum da yok, eklenmesi gerekir) geçirmeden önce, o
fırsata bağlı açık emanet kalmadığını trigger ile kontrol etmek.

---

## f) Tedarikçi carisi

Bugün: `tedarikci_odemeleri` SADECE yapılan ödemeyi tutuyor — gelen
faturanın borç tarafı hiç kayıtlı değil, yani "bu tedarikçiye ne kadar
borcumuz var" sorusunun cevabı yok.

Önerilen akış:
1. Yeni tablo `tedarikci_faturalari` (tedarikçi adı/vergi no, fatura no,
   tutar, KDV, tarih, Bizimhesap'tan geldiyse referans no, PDF url) —
   BORÇ tarafı, Bizimhesap'tan manuel aktarılır (API entegrasyonu bu
   aşamanın kapsamında değil, broker/ofis fatura geldiğinde elle girer).
2. `tedarikci_odemeleri`'ne `tedarikci_fatura_id` (null olabilir) eklenir
   — bir ödeme bir faturaya eşleşebilir.
3. Tedarikçi bakiyesi = `tedarikci_faturalari` toplamı − `tedarikci_odemeleri`
   toplamı (aynı `tedarikci_adi`/vergi no için).
4. Banka hareketi ↔ tedarikçi ödemesi eşleştirmesi, bugünkü
   `banka_hareketleri` ↔ ciro katılımcı eşleştirmesiyle AYNI desen
   (`eslesen_katilimci_id` deseni, burada `eslesen_tedarikci_odeme_id`).

---

## g) Aylık danışman katılım bedelinin otomatik borçlandırılması

Bugün `ofis_katilim_bedeli` kategorisi VAR ama girişi elle — her ay
broker/ofis her danışman için tek tek `cari_hareketler` kaydı açıyor
(doğrulanmadı ama kod bunu gösteriyor, otomatik bir iş YOK).

Önerilen: aylık çalışan bir zamanlanmış görev (pg_cron veya Supabase
Scheduled Function) — ayın 1'inde, `durum='aktif'` olan her danışman
için `ofis_katilim_bedeli` kategorili bir `cari_hareketler` borç kaydı
açar. Tutar danışmanın anlaşmasından (`danisman_anlasmalari`) okunmalı —
bugün bu tabloda katılım bedeli tutarı YOK, sadece paylaşım oranı var,
bu yüzden ya bu tabloya bir `aylik_katilim_bedeli` kolonu eklenmeli ya da
tek bir sabit tutar (tüm danışmanlar için aynı) kullanılmalı — **bu bir
broker kararı**, iki seçenek de teknik olarak basit.

Riskler: işe yeni başlayan/ayrılan danışmanda ay ortası kıstelyevm
(gün bazında bölme) mi, tam ay mı — broker'ın belirlemesi gerekiyor.

---

## h) Raporlar

Hepsi `defter_kayitlari`'ndan okuyacak (madde b/c), var olan raporların
üzerine EK olarak:

1. **Cari bakiyeleri** — danışman/tedarikçi/müşteri/ortak, tek ekranda
   yan yana (bugün 4 ayrı yerde: Cari Hesap, yeni tedarikçi carisi,
   Müşteri Carisi, Ortak Hesabı).
2. **Aylık gelir-gider** — kategori bazında, ay/dönem filtresiyle.
3. **Kâr-zarar** — gelir toplamı − gider toplamı − (varsa) danışman
   payları, aylık ve kümülatif.
4. **Nakit akışı** — kasa/banka bazında giriş-çıkış, bugünkü Kasa
   Raporu'nun zaten yaptığına çok yakın, farkı: tüm kasalar tek
   tabloda toplanmış, kategori kırılımlı.
5. **KDV özeti** — gelir KDV'si − gider KDV'si, ay bazında (beyanname
   DEĞİL, sadece bilgi amaçlı özet — mali müşavire referans).
6. **Danışman bazında kârlılık** — bugünkü Kârlılık ekranının (Finans >
   Raporlar) devamı, defterden besleniyor olması dışında değişmiyor.
7. **Mali müşavire aylık Excel dökümü** — yukarıdaki raporların CSV/
   Excel export'u, tek butonla ay seçilip indirilebilir.

---

## i) Riskler, aşamalandırma, süre tahmini

**Riskler:**
- Mutabakat (madde d) tutmazsa göç durur — bu NORMAL kabul edilmeli,
  acele ettirilmemeli; geçmiş veri zaten dağınık olduğu için ilk
  denemede fark çıkması olası.
- Trigger sayısı artıyor (7 yeni trigger) — performans riski düşük
  (tek satır INSERT/DELETE, index'li foreign key'ler üzerinden), ama
  her yeni trigger RLS/performans kontrol listesine (panel-app/CLAUDE.md,
  "RLS/Performans Dersleri") göre tek tek test edilmeli.
- Tedarikçi carisi (madde f) Bizimhesap entegrasyonu olmadan elle veri
  girişine bağımlı — ofis bunu gerçekten güncel tutmazsa bakiye
  yanlış kalır (aynı risk bugün banka ekstresi elle girişinde de var).
- Aylık katılım bedeli otomasyonu (madde g) için broker'ın tutar/
  kıstelyevm kararı net olmadan başlanamaz.

**Aşamalandırma ve tahmini süre** (geliştirme günü, test dahil —
canlıya alma/onay süreleri hariç):
1. Defter tablosu + 7 trigger + backfill script + mutabakat kontrolü: **3-4 gün**
2. Tedarikçi carisi (madde f): **1-2 gün**
3. Aylık katılım bedeli otomasyonu (madde g, broker kararından sonra): **1 gün**
4. Emanet kapanmadan işlem kapanmasın kontrolü (madde e): **1 gün**
5. Raporlar (madde h, 7 rapor): **3-4 gün** (Excel export dahil)

**Toplam: ~10-12 geliştirme günü**, aşamalar ayrı ayrı canlıya
alınabilir (birbirine bağımlı değil, 1 bitmeden 2'ye başlanabilir).

---

Bu doküman TASLAK. Onay/düzeltme bekleniyor — kod yazımına
başlanmayacak.
