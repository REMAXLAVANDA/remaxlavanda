# Deployment Planı (Taslak — Henüz Uygulanmadı)

Tarih: 2026-07-16

Bu belge, `DEPLOYMENT_TESPIT_RAPORU.md`'deki tespitlerin ve Vercel
dashboard'undan doğrulanan gerçek ayarların üzerine kurulu, adım adım bir
uygulama planıdır. **Henüz hiçbir adımı uygulanmadı** — talimat "önce ayarları
doğrula ve raporla" idi, bu belge o raporun ikinci yarısı.

---

## 1) Vercel'den doğrulanan gerçek ayarlar

Ekran görüntülerinden (Settings > Git, Settings > Build and Deployment)
doğrudan okundu, tahmin değil:

| Ayar | Değer |
|---|---|
| Bağlı GitHub reposu | **REMAXLAVANDA/remaxlavanda** (Jun 29'da bağlanmış) |
| Framework Preset | Other |
| Root Directory | **`./`** (reponun kökü — alt klasör YOK) |
| Build Command | Override kapalı → **çalışmıyor** |
| Output Directory | Override kapalı → **repo kökü olduğu gibi servis ediliyor** |
| Install Command | Override kapalı → **çalışmıyor** |
| Development Command | None |
| "Include files outside root" | Enabled (Root zaten kök olduğu için şu an etkisiz) |

## 2) Bu ayarların gerçek anlamı

**Vercel bu proje için hiçbir build işlemi yapmıyor.** Sadece repo'nun
içinde push edilen ne varsa, olduğu gibi internete servis ediyor —
tıpkı bir dosya sunucusu gibi. Bu, `DEPLOYMENT_TESPIT_RAPORU.md`'deki
tahmini doğruluyor: `remaxlavanda` reposunun kökünde hem pazarlama
sitesinin statik dosyaları hem de `panel/` adlı bir klasör (bizim React
uygulamamızın derlenmiş hâli) birlikte duruyor olmalı, ve `vercel.json`'daki
kural `panel.remaxlavanda.com.tr` isteklerini `/panel/index.html`'e
yönlendiriyor (canlıda asıl çalışan yol `www.remaxlavanda.com.tr/panel/`
olsa da).

**Kritik sonuç:** Push = anında canlıya çıkış. Build adımı olmadığı için
hiçbir "hata yakalama" katmanı yok — yanlış/eksik bir dosya push edilirse
site anında bozulur. Bu yüzden canlıya göndermeden önce yerelde tam
doğrulama şart (bkz. Adım 3).

## 3) Adım adım plan

**Adım 0 — Gerçek repo'ya erişim (kullanıcı yapacak):**
Şu an elimizdeki iki klasörden hiçbiri gerçek `remaxlavanda` reposuna bağlı
değil: `portal/`'ın git remote'u yok, `remaxlavanda-main/` ise eski bir ZIP
indirmesi (git geçmişi bile yok). Bu yüzden **yeni, temiz bir klon**
gerekiyor — mevcut klasörlerin üzerine yazmak yerine bu en güvenli yol.

**Adım 1 — Build (ben yapacağım):**
`portal/` içindeki mevcut PART-5A kodundan `npm run build` ile `dist/`
üretilir, `npm run preview` ile yerel olarak gerçek bir build gibi son kez
kontrol edilir.

**Adım 2 — Kopyalama (ben yapacağım, klon klasörüne erişim verildikten sonra):**
Klonlanan `remaxlavanda` reposundaki `panel/` klasörünün içi tamamen
silinir, `dist/` içeriği oraya kopyalanır. **Sadece `panel/` klasörüne
dokunulur — kök dizindeki pazarlama sitesi dosyalarına kesinlikle
dokunulmaz.**

**Adım 3 — Commit (ben hazırlayacağım, push kullanıcıda):**
Net bir commit mesajıyla değişiklik hazırlanır. **Push işlemini bilerek
kullanıcının kendisi, GitHub Desktop'tan yapacak** — hem git kimlik
bilgilerine erişimim yok hem de push = anında canlı demek, bu adımın
kullanıcı onayıyla, kullanıcının elinden çıkması gerekiyor.

**Adım 4 — Canlı doğrulama (birlikte):**
Push sonrası `www.remaxlavanda.com.tr/panel/` açılır, PART-5A'nın yeni
davranışları (loading/hata/tekrar dene ekranları, 6 modülün çalışması)
gerçek canlı sitede kontrol edilir.

## 4) Riskler ve önlemler

- **Build hatası yakalanmaz, direkt canlıya yansır** → Adım 1'deki yerel
  `npm run preview` kontrolü bu yüzden atlanmayacak.
- **Yanlışlıkla pazarlama sitesi dosyalarının silinmesi/bozulması** →
  Adım 2 sadece `panel/` klasörüyle sınırlı tutulacak, kök dizin dosyaları
  hiç listelenmeyecek/silinmeyecek.
- **Geri dönüş planı** → Sorun çıkarsa, GitHub Desktop'tan bir önceki
  commit'e "revert" yapılıp tekrar push edilerek eski hâle anında
  dönülebilir (build olmadığı için bu da anında etkili olur).
- **Mock veri uyarısı** → Kullanıcının talimatı gereği bu sürüm hâlâ mock
  veriyle çalışıyor (gerçek Supabase'e geçilmedi) — canlıya çıkan sürümde
  kullanıcılar gerçek veri değil, örnek/mock veri görecek. Bu bilinçli ve
  geçici, ayrı bir sonraki adım olarak PART-6/Supabase geçişinde ele
  alınacak.

## 5) Kullanıcıdan istenen sıradaki fiziksel adım

GitHub Desktop'ta gerçek `remaxlavanda` reposunun **yeni bir klasöre**
klonlanması gerekiyor (mevcut `portal` veya `remaxlavanda-main` klasörleri
KULLANILMAYACAK). Adımlar sohbette ayrıca sade dille anlatılacak.
