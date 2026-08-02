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
2. **Doğrudan `apply_migration` çalıştırma, önce sor.** Onay isteği kısa
   ve tek ekranda şunları içermeli: (a) ne yapıyor — bir cümle, (b) hangi
   tablo/fonksiyon etkileniyor, (c) geri alınabilir mi, (d) geri alma
   SQL'i.
3. **Sadece onay yeterli** (broker "onaylıyorum"/"evet" derse
   uygulanabilir): GRANT/REVOKE, search_path SET, RLS politikası
   ekleme/kaldırma, index ekleme.
4. **Onay yetmez** — broker açıkça **"bilgisayardayım, uygula"**
   demeden dokunma: DROP, DELETE, UPDATE, kolon tipi değişikliği,
   erişimi genişleten her değişiklik.
