# Marka Kimliği — RE/MAX Lavanda Panel

Bu dosya `gorsel-denetci` ajanının TEK marka referansı (bkz. CLAUDE.md
"Tasarım" kuralı). Aşağıdaki değerlerin tamamı `src/index.css`'teki
gerçek CSS token tanımlarından ve kod tabanındaki fiili kullanımdan
alındı — hiçbiri uydurulmadı. Kod tabanında karşılığı olmayan bir
tasarım kararı gerekiyorsa (marka dosyası bunu kapsamıyorsa) denetçi
sormalı, tahmin etmemeli.

**Sınır:** `src/index.css`'teki yorumlar "RE/MAX 2024 Marka
Standartları"na (broker'ın paylaştığı, fiziksel/PDF bir kılavuz, s.19
"Alternatif Renkler" paleti referansı) atıfta bulunuyor — bu kılavuzun
kendisi bu ortamda erişilebilir değil, sadece koda geçirilmiş kısımları
burada listeleniyor. Kılavuzun tamamına ihtiyaç varsa broker'dan istenmeli.

## Renkler

### Marka ana renkleri
| Token | Hex | Kullanım |
|---|---|---|
| `--red` / `brand-600` | `#DC1C2E` | RE/MAX kırmızısı — ana marka rengi |
| `--navy` / `remax-navy` / `ink-900` | `#0C2749` | RE/MAX lacivert |
| `--blue` / `remax-blue` | `#003DA5` | RE/MAX mavisi — ikincil aksan |

### Kırmızı skala (brand-*, `#DC1C2E` taban alınarak üretildi)
`brand-50` `#FDECEE` · `brand-100` `#FBD6DA` · `brand-200` `#F5AEB6` ·
`brand-300` `#ED7E8C` · `brand-400` `#E44F63` · `brand-500` `#E2394C` ·
`brand-600` `#DC1C2E` (ana) · `brand-700` `#B01522` (hover/koyu) ·
`brand-800` `#8A1019` · `brand-900` `#5C0A11`

### Nötr skala (ink-*, eski sistem — hâlâ aktif kullanımda)
`ink-50` `#F4F6F9` · `ink-100` `#E2E8F0` · `ink-200` `#DDE0E5` ·
`ink-300` `#C2C7CF` · `ink-400` `#9AA1AD` · `ink-500` `#6B7280` ·
`ink-600` `#4C5361` · `ink-700` `#363C48` · `ink-800` `#404041` ·
`ink-900` `#0C2749`

**Bilinen kontrast sorunu (2026-09-30 denetiminde bulundu, henüz
düzeltilmedi):** `ink-400` (`#9AA1AD`) beyaz zemin üzerinde 2.60:1
kontrast veriyor — WCAG 1.4.3/1.4.11 eşiklerinin (4.5:1 / 3:1) altında.
Gerçekten pasif olmayan metin/ikonlarda kullanılmamalı, `ink-500` veya
`text-secondary` tercih edilmeli.

### Yeni semantik token seti (2026-08 "Sakin & Odaklı" yeniden tasarımı)
Eski `brand-*`/`ink-*`/`remax-*` sistemi SİLİNMEDİ — henüz yeniden
tasarlanmamış ekranlar hâlâ onu kullanıyor. Yeni ekranlar bu semantik
tokenleri kullanmalı:

| Token | Hex | Amaç |
|---|---|---|
| `surface-page` | `#EEF1F6` | Sayfa zemini |
| `surface-raised` | `#FFFFFF` | Kart/panel zemini |
| `surface-sunken` | `#F4F6F9` | Girinti/ikincil alan |
| `border-default` | `#E6EAF0` | Standart kenarlık |
| `border-subtle` | `#EFF2F6` | Belirsiz/hafif kenarlık |
| `border-danger` | `#F5AEB6` | Hata/tehlike kenarlığı |
| `tint-red` | `#FBD6DA` | Kırmızı arka plan tonu (badge vb.) |
| `tint-blue` | `#DBE7FF` | Mavi arka plan tonu |
| `tint-amber` | `#FDF0D5` | Amber arka plan tonu |
| `tint-amber-text` | `#8A6100` | Amber üzerine yazılan metin |
| `text-primary` | `#1B2534` | Birincil metin |
| `text-secondary` | `#4C5361` | İkincil metin |
| `text-muted` | `#6B7280` | Soluk metin |
| `text-disabled` | `#9AA1AD` | Devre dışı metin (bkz. yukarıdaki kontrast uyarısı) |
| `canvas` | `#E5E9F1` | AppLayout genel zemin |

**Geçiş durumu (2026-09-30 denetiminde not edildi):** Kullanıcı/rol
yönetimi ekranları (`CreateUserModal`, `EditUserModal`, `UsersTable`,
`PermissionMatrix`, `ProfileMenu`) hâlâ eski `ink-*` katmanında; `Ayarlar.jsx`
kabuğu, `Badge.jsx`, `FolderList.jsx` yeni semantik tokenlere geçmiş.
Hangi ekranların ne zaman taşınacağı broker kararı bekliyor.

### Alternatif renkler (RE/MAX 2024 Marka Standartları, "Alternatif Renkler" paleti, s.19)
Mor/yeşil/amber/teal gibi markaya ait olmayan Tailwind stok renkleri
yerine, çoklu durum/tür ayrımı gereken yerlerde (etkinlik türü,
recruiting aşaması vb.) bunlar kullanılır:

`remax-red-dark` `#AA1120` · `remax-blue-mid` `#007DC3` ·
`remax-blue-dark2` `#2E3F5A` · `remax-blue-light` `#A4D7F4` ·
`remax-gray-mid` `#949CA1` · `remax-gray-light` `#C4C6C8`

(Darker Blue `#0C2749` zaten `remax-navy`, Dark Gray `#404041` zaten
`ink-800` ile aynı — ayrıca tanımlanmadı.)

## Tipografi

**Font ailesi:** `Poppins`, `Montserrat` (fallback: sistem fontları —
-apple-system, Segoe UI, Roboto, sans-serif)

**Tip skalası** (2026'da bir kademe büyütüldü, satır aralıkları
gevşetildi — `text-xs`/`sm`/`base`/`lg`/`xl` class'larını kullanan her
yer otomatik etkilenir):

| Class | Boyut | Satır yüksekliği |
|---|---|---|
| `text-xs` | 13px (0.8125rem) | 1.4 |
| `text-sm` | 15px (0.9375rem) | 1.5 |
| `text-base` | 17px (1.0625rem) | 1.6 |
| `text-lg` | 19px (1.1875rem) | 1.6 |
| `text-xl` | 21px (1.3125rem) | 1.5 |

## Logo

Dosya: `/panel/remax-balloon.png` (RE/MAX sıcak hava balonu ikonu).
Her kullanımda `object-contain` ile, `alt="RE/MAX"` veya
`alt="RE/MAX Lavanda"` ile birlikte render edilir. Gözlemlenen boyut
aralığı: `h-9 w-9` (36px, Sidebar) — `h-14 w-14` (56px, Login/şifre
sıfırlama ekranları) arası, context'e göre değişiyor; sabit bir "tek
doğru boyut" kuralı kod tabanında yok.

## Köşe yuvarlaklığı ve boşluk (gözlemlenen fiili kullanım — resmi bir skala olarak dokümante edilmemiş)

Bunlar bir kural kitabı değil, kod tabanındaki en sık kullanılan
değerlerin dökümü (gorsel-denetci için referans, "standart dışı" diye
raporlanmaması için):

- **Köşe yuvarlaklığı:** `rounded-lg` en yaygın (form input/buton
  varsayılanı, 311 kullanım), `rounded-full` (pill/badge, 127),
  `rounded-xl`/`rounded-2xl` (kart/modal, 106 birlikte).
- **Boşluk (gap):** `gap-2` (8px) ve `gap-1.5` (6px) en yaygın ikili;
  `gap-3` (12px) bir sonraki en sık kullanılan.
- **Gölge:** `shadow-sm` ve `shadow-lg` kullanılıyor, ara değerler
  (`shadow-md` vb.) neredeyse hiç yok — iki basamaklı bir sistem
  (hafif/belirgin), ara kademe yok.

## Kapsam dışı / bu dosyada YOK

Bu dosya dijital panel arayüzü için. RE/MAX Lavanda'nın kıyafet/kurumsal
görünüm standardı (personel kılık kıyafeti, yaka kartı vb.) ayrı bir
konu — bkz. Rehber > "Kurumsal Görünüm ve Kıyafet Standardı". Sosyal
medya hesap linkleri için bkz. Rehber > Sosyal Medya.
