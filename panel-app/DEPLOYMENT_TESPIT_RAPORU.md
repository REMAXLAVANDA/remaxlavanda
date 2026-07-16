# Deployment Tespit Raporu

Tarih: 15 Temmuz 2026

Bu rapor, "canlıya alma" işine başlamadan önce istenen tespit çalışmasının
sonucu. **Hiçbir deploy işlemi yapılmadı** — sadece mevcut altyapı
incelendi. Aşağıdaki her madde ya doğrudan dosya/repo incelemesiyle ya da
canlı siteye gerçek bir istek atılarak doğrulandı; hiçbiri varsayım değil,
varsayım olan yerler açıkça "doğrulanamadı" diye işaretlendi.

---

## 1) Bulunan yöntem: Vercel + manuel build/kopyala/commit/push

Bu klasörde (`portal/`) zaten bir **README.md** var ve deployment sürecini
belgeliyor (muhtemelen daha önceki bir oturumda yazılmış). Özet:

- Gerçek proje yapısı şöyle tasarlanmış: `remaxlavanda` adlı bir ana repo,
  içinde iki klasör — `panel-app/` (bizim şu an içinde çalıştığımız kaynak
  kod) ve `panel/` (derlenmiş/yayına hazır çıktı).
- **Vercel bu repo için otomatik build ÇALIŞTIRMIYOR.** Ana web sitesi
  (`remaxlavanda.com.tr`) zaten statik HTML dosyalarından oluşuyor, bu
  yüzden Vercel projesi "build yok, olduğu gibi servis et" şeklinde
  ayarlanmış görünüyor.
- Yayına almak için elle şu adımlar izleniyor: `npm run build` (dist
  üretir) → `panel/` klasörünün içini sil → dist içeriğini `panel/`ye
  kopyala → `panel` ve `panel-app`'i commit'le → `git push`.
- `vite.config.js`'te `base: '/panel/'` ayarı var — bu, üretilen
  `index.html`'in `/panel/assets/...` yollarını doğru üretmesi için ve
  README'deki açıklamayla birebir tutarlı. **Bu ayar hâlâ doğru şekilde
  duruyor**, dokunulmadı.

## 2) Canlı siteye gerçek istek atarak doğrulama

README'nin iddiasını gözle değil, gerçek HTTP isteğiyle test ettim:

| Adres | Sonuç |
|---|---|
| `remaxlavanda.com.tr` | RE/MAX Lavanda'nın **pazarlama sitesi** (Kariyer/Gayrimenkul/Rehber/İletişim) — bizim portalımız DEĞİL. |
| `panel.remaxlavanda.com.tr` | Yine **pazarlama sitesi** dönüyor. README bu alt alan adının (subdomain) portalı gösterdiğini söylüyor ama **bu doğru değil / artık geçerli değil** — muhtemelen README yazıldıktan sonra bir şey değişmiş, ya da hiç bu şekilde kurulmamış. |
| `www.remaxlavanda.com.tr/panel/` | **Sayfa başlığı "RE/MAX Lavanda Portal"** — bu bizim uygulamamız. Gerçek canlı adres bu. |

**Sonuç:** Portal canlıda gerçekten yayında, ama README'de yazan "alt alan
adı" (`panel.remaxlavanda.com.tr`) değil, "**yol**" (`remaxlavanda.com.tr/panel/`)
üzerinden. README bu noktada güncel değil ya da yanlış yazılmış — deployment
planını README'ye değil, bu gerçek teste göre kuracağım.

## 3) Kritik boşluk: gerçek "remaxlavanda" reposu nerede?

Bu `portal/` klasörünün kendisi:
- `git remote -v` → **boş**, hiçbir uzak bağlantı yok.
- Tek yerel dal (`master`), commit'ler sadece bu bilgisayarda duruyor.
- `panel/` klasörü (yayına hazır çıktı) veya `panel-app/` ile eşleşen bir
  klasör adı bu repoda **yok** — bu repo muhtemelen o daha büyük
  `remaxlavanda` reposunun SADECE `panel-app/` alt klasörünün bir kopyası,
  kendisi değil.

Yani şu an elimde: canlıya nasıl gidileceğini anlatan bir doküman var, ama
o dokümanın bahsettiği asıl repo'ya (ve dolayısıyla Vercel projesine)
bağlı DEĞİLİM. Daha önceki bir ekran görüntüsünde masaüstünde
`remaxlavanda-main` adlı bir klasör gördüm — bu isimlendirme (`-main`
soneki) GitHub'ın "Download ZIP" özelliğinin tipik çıktısıdır (bir repoyu
ZIP olarak indirip açtığında `reponame-main` klasörü oluşur). Bu, aradığım
gerçek repo olabilir, ama bu klasöre erişimim yok (bu oturumda sadece
`portal/` klasörü paylaşıldı) — **doğrulayamadım, tahmin ediyorum.**

## 4) Diğer olası yöntemler — kontrol edildi, bulunamadı

- **GitHub Actions**: `.github/workflows/` klasörü yok.
- **Netlify**: `netlify.toml` yok.
- **cPanel**: `.cpanel.yml` yok.
- **Docker**: `Dockerfile` yok.
- **`package.json`**: `deploy` scripti veya `gh-pages` gibi bir paket yok.

Bunların hiçbiri bu depoda kullanılmıyor — README'nin anlattığı
Vercel + manuel kopyalama yöntemi tek gerçek aday.

## 5) GitHub Desktop

Kullanıcının Dock'unda GitHub Desktop uygulaması kurulu (daha önceki bir
ekran görüntüsünde görüldü). Bu, muhtemelen `remaxlavanda` reposuna
push işlemleri için kullanılıyor/kullanılmış olabilir — ama bunu da
doğrulayamıyorum, sadece uygulamanın kurulu olduğunu biliyorum.

---

## Açık sorular — plan bunlara bağlı

Güvenli bir deployment planı yazabilmem için üç şeyi bilmem gerekiyor:

1. **`remaxlavanda-main` klasörü** gerçekten o ana repo mu? Öyleyse, bu
   `portal/` (yani `panel-app/`) klasöründeki PART-5A değişikliklerini
   oraya nasıl taşıyacağız — senin elle kopyalamanı mı istersin, yoksa
   bana o klasöre de erişim verip (Cowork'te ek klasör paylaşarak) işi
   ben mi yapayım?
2. **GitHub tarafında bir hesabın/reposu var mı** (`remaxlavanda` adında),
   ve Vercel projesi o repoya mı bağlı? Vercel dashboard'una giriş
   bilgin var mı (en azından "bu proje şu repoya bağlı" diye görebilmek
   için)?
3. Bu **PART-5A değişikliklerini canlıya koymadan önce**, mock veriyle
   değil gerçek Supabase ile mi çalışmasını istiyorsun (`.env` içinde
   Supabase bağlantı bilgileri var mı, yoksa canlı hâlâ mock modda mı
   kalacak)? Bu, deployment checklist'in en kritik maddelerinden biri.

Bu üç soruya cevap aldıktan sonra somut, adım adım bir plan + checklist
hazırlayacağım — henüz yazmadım çünkü gerçek repo/erişim durumunu
bilmeden yazacağım plan tahminlere dayanır, bu da senin "geçici çözüm
yapma, kök nedeni bul" prensibine aykırı olur.
