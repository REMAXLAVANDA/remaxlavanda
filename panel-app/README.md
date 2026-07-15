# RE/MAX Lavanda — Ofis Yönetim Sistemi (Portal)

React + Tailwind (Vite) + Supabase ile geliştirilen dahili operasyon portalı.
Broker / Müdür / Ofis / Danışman rolleri için Panel, Fırsatlar, Takvim,
Eğitim, Santral, Takip, Lig ve Rehber modüllerini tek çatı altında toplar.

## Geliştirme

```bash
npm install
npm run dev
```

## Yayına alma (deploy)

Bu proje `remaxlavanda` reposu içinde `panel-app/` klasöründe (kaynak kod)
yaşıyor. Canlıya çıkan kısım ise aynı reponun kök dizinindeki `panel/`
klasörü — Vercel, `panel.remaxlavanda.com.tr` adresine gelen istekleri
`vercel.json`'daki kurala göre `/panel/index.html`'e yönlendiriyor.

Vercel bu repo için otomatik build çalıştırmıyor (ana web sitesi de statik
HTML dosyalarından oluşuyor), bu yüzden her güncellemeden sonra derlenmiş
çıktıyı elle `panel/` klasörüne kopyalayıp commit etmek gerekiyor:

```bash
npm run build          # panel-app/dist oluşturur
rm -rf ../panel/*
cp -r dist/. ../panel/
cd .. && git add panel panel-app && git commit -m "panel güncellendi" && git push
```

`vite.config.js` içindeki `base: '/panel/'` ayarı, üretilen dosyaların
`/panel/assets/...` yoluyla doğru servis edilmesini sağlıyor — bu ayarı
değiştirmeyin.

## Supabase şeması

`supabase/migrations/` ve `supabase/seed/` altında. Detaylar için ilgili
dosyalardaki yorumlara bakın.
