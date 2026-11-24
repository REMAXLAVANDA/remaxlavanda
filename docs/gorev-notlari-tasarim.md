# Görev Tanımları + Atama — Tasarım Notu

Durum: **onaylandı, geliştirmeye Cumartesi (limitler yenilenince) başlanacak.**
Hazırlayan: Claude (portal geliştirme oturumu), 2026-11-24.

## Neden bu özellik

Şu an "Ofis Hesabı" diye tek, paylaşımlı bir giriş var — recruiter ve ofis
işi yapan kim varsa hepsi bunu kullanıyor, kimin ne yaptığı ayrışmıyor.

Ayrıca: bir kişiye bir görev (ör. "Sosyal Medya Yöneticisi", "Danışman
Gelişim Koçu") verildiğinde, o görevde yapılması/dikkat edilmesi
gerekenleri anlatan bir talimat/rehber yok. Broker'ın istediği: görev
tanımı bir kere yazılsın (yeniden kullanılabilir), kişiye ATANSIN, atanan
kişi kendi görev(ler)ini görüp okusun.

## Kapsam

1. **Görev tanımları** — Rehber'in var olan doküman yazma/düzenleme
   altyapısı kullanılacak (yeni bir "Görev Tanımları" kategorisi altında).
   Zengin metin, dosya ekleme gibi özellikler zaten hazır, sıfırdan yazım
   ekranı yapılmayacak.
2. **Atama** — yeni bir tablo: hangi görev tanımı (doküman) kime atanmış,
   kim atamış, ne zaman atanmış.
   - **Bir görev tanımı AYNI ANDA birden fazla kişiye atanabilir**
     (broker kararı, 2026-11-24 — örn. 2 kişi birlikte sosyal medyayı
     yönetiyorsa ikisine de atanabilsin).
3. **Okundu takibi** — atanan kişi "Okudum" dediğinde işaretlenir, ne
   zaman okuduğu kaydedilir (broker kararı, 2026-11-24 — kimin henüz
   okumadığını görebilmek için).
4. **"Görevlerim" ekranı** — rolden bağımsız HERKESE açık yeni bir sayfa/
   bölüm: kullanıcı kendine atanan görev tanımlarını listeler, her
   birinde "Okudum" butonu olur.
5. **Yönetim görünümü** — broker/owner, bir görev tanımının (Rehber
   dokümanının) yanında "Kime atandı" / "Ata" butonunu görür; kimin
   okuyup kimin okumadığını da buradan takip eder.

## Kapsam dışı (bu turda yapılmayacak)

- "Ofis Hesabı" paylaşımlı girişinin ayrı kişilere bölünmesi — bu kod
  değil, broker'ın Ayarlar > Kullanıcılar'dan yapacağı bir işlem.
- Bir kullanıcıya rol atama (broker/owner/ofis/muhasebe/danışman) —
  bu ZATEN var olan bir özellik (Ayarlar > Kullanıcılar), yeni bir şey
  gerekmiyor.

## Taslak veri modeli

```
gorev_atamalari
  id              uuid
  doc_id          uuid   -- Rehber dokümanına referans (docs.id)
  kullanici_id    uuid   -- atanan kişi (users.id)
  atayan_id       uuid   -- atamayı yapan (broker/owner)
  atanma_tarihi   timestamptz
  okundu          boolean default false
  okuma_tarihi    timestamptz null
```

RLS taslağı:
- broker/owner: tüm satırları okuyup/yazabilir (atama yapma/kaldırma).
- kullanıcı: SADECE kendi `kullanici_id`'sine ait satırları görebilir,
  SADECE `okundu`/`okuma_tarihi` alanlarını kendi satırında
  güncelleyebilir (başka alana dokunamaz).
- Atanan dokümanın kendisi, Rehber'in "yönetime özel" kategori
  kısıtından BAĞIMSIZ olarak atanan kişiye görünür olmalı (ör. bir
  danışmana atanan "Gelişim Koçu" görevi, o danışman normalde
  "yönetime özel" kategoriyi göremese de, kendisine atanan O dokümanı
  görebilmeli).

## Sıradaki adım

Cumartesi (limitler yenilendiğinde) bu tasarımla geliştirmeye başlanacak:
migration (gorev_atamalari tablosu + RLS) + Rehber'e "Ata" butonu +
yeni "Görevlerim" sayfası.
