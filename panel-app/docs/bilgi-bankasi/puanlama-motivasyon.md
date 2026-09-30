# Danışman Puanlama Sistemleri Hangi Durumlarda Motivasyonu Bozar?

**Araştırma tarihi:** 2026-09-30

## Kısa Cevap
Araştırmalar, halka açık (herkesin görebildiği) performans sıralamalarının
kısa vadede üst sıradakileri motive ederken, çoğunluk (orta ve alt sıra)
için net motivasyon kaybına yol açtığını gösteriyor — biri yukarı
çıktığında zorunlu olarak biri aşağı iner, takım genelinde net kazanç
sıfıra yakın. Zorlama sıralama (forced ranking) sistemlerinde bu etki daha
şiddetli: araştırmalar %14'e varan bağlılık (engagement) düşüşü
gösteriyor. Riski asıl büyüten şey sıralamanın kendisi değil, **kişinin
kontrol edemediği faktörlere** (bölge, lead kalitesi gibi) dayanması, **tek
bir metriğe** indirgenmesi ve **sonuçların** (sadece "kim kazandı"
değil) herkese açık gösterilmesi.

## Temel Bulgular (kaynaklı)

- **Sıfır-toplamlı motivasyon etkisi:** Kısa vadeli rekabetçi ortamlarda
  liderlik tabloları motive edici olabiliyor, ama işyerinde çoğu
  katılımcı için demotive edici bir araç haline geliyor — biri bir sıra
  yükseldiğinde bir başkası zorunlu olarak düşüyor, takım genelinde net
  motivasyon kazancı sıfıra yakın kalıyor. [Kaynak: Medium — "Death of the Leaderboard"](https://medium.com/@kaizo/death-of-the-leaderboard-why-ranking-is-whats-wrong-in-workplace-gamification-7af68c408b60)

- **Kontrol edilemeyen faktörler:** Liderlik tablosu bölge, hesap
  kalitesi gibi çalışanın kontrolünde olmayan faktörleri yansıttığında,
  sıralamalar keyfi ve demotive edici hissettiriyor. [Kaynak: Spotio — Sales Leaderboards Guide](https://spotio.com/blog/sales-leaderboards/)

- **Zorlama sıralama (forced ranking) araştırmaları:** Institute for
  Corporate Productivity'nin araştırması, zorlama sıralama kullanan
  şirketlerde çalışan bağlılık puanlarında %14 düşüş bulmuş. Microsoft
  bu uygulamayı terk ederken gerekçe olarak "keyfi sıralamalar, yönetici
  güç mücadeleleri ve meslektaşlar arası sağlıksız rekabet" gösterdi.
  [Kaynak: i4cp araştırma özeti (ResearchGate üzerinden)](https://www.researchgate.net/publication/353014182_Do_Performance_Ranking_Increase_Employee_Performance) · [taggd.in — Forced Ranking](https://taggd.in/hr-glossary/forced-ranking/)

- **Tek metrik riski:** Sadece kapanan satış/ciro gibi TEK bir sonucu
  ödüllendiren bir tablo, orta ve alt sıradakilerin "zaten kazanamam"
  diyerek kopmasına yol açan sıfır-toplamlı bir ortam yaratıyor. Çözüm
  olarak metriklerin çeşitlendirilmesi/rotasyonu (arama sayısı, randevu,
  itiraz yönetimi gibi farklı davranışların da ölçülmesi) öneriliyor —
  aksi halde hep aynı birkaç kişi kazanıyor. [Kaynak: Spinify — Sales Leaderboard Best Practices](https://spinify.com/blog/top-10-sales-leaderboard-best-practices/)

- **Adalet ilkeleri (riski azaltan tasarım):** Kademeli/gruplu
  yarışmalar (yeni başlayan / orta / üst seviye ayrı liderlik tabloları),
  ilerleme ve bireysel gelişimi vurgulayan (sadece mutlak sıra değil)
  tasarımlar, ve şeffaf/tutarlı ölçüm kuralları önerilen düzeltmeler
  arasında. [Kaynak: Spinify](https://spinify.com/blog/top-10-sales-leaderboard-best-practices/) · [eLearning Industry — 5 Leaderboard Mistakes](https://elearningindustry.com/sales-gamification-5-leaderboard-mistakes-avoid)

- **Olumlu taraf (karşıt bulgu, dengelemek için gösteriliyor):**
  Bazı kaynaklar %89 çalışanın işi daha "oyunlaştırılmış" olsaydı daha
  üretken olacağını söylediğini, iyi tasarlanmış gamification'ın satışı
  %35,8'e kadar artırabildiğini aktarıyor. **[Üretici/pazarlama
  iddiası olabilir]** — bu rakamlar gamification yazılımı satan
  firmaların blog yazılarından geliyor, bağımsız akademik kaynağa
  bu araştırmada ulaşılamadı, dikkatli kullanılmalı. [Kaynak: Corporate Traditions — Employee Leaderboard](https://blog.corporatetraditions.com/glossary/employee-leaderboard)

## Bizim Panele Uygulanabilirlik: **Kısmen uygun — dikkat edilmesi gereken noktalar var**

Lig modülünü (`lib/league.js`, `pages/Lig.jsx`) koddan inceledim:

- **İyi yönler (riski zaten azaltan tasarım kararları):**
  - Tek metrik değil, **3 ayrı kategori** var (Ciro/₺, Memnuniyet/puan,
    Sosyal Medya/puan) — "tek metrik = hep aynı kişiler kazanır" riskini
    zaten kısmen azaltıyor, farklı danışmanlar farklı kategoride öne
    çıkabiliyor.
  - Memnuniyet kategorisi ham yüzde değil **Wilson score lower bound**
    (`wilsonScoreLowerBound`) kullanıyor — az sayıda yorum alan bir
    danışmanın şans eseri %100 görünüp haksız yere üstte çıkmasını
    istatistiksel olarak engelliyor.
  - `rankingsFor()` her danışman için mutlak puanı DEĞİL, **üstteki
    komşuya fark**ı (`diff`) hesaplıyor (`i === 0 ? r.value -
    ranked[1].value : ranked[i-1].value - r.value`) — bu muhtemelen
    puan farkının acı vermesini yumuşatmak için bilinçli bir tasarım,
    "adil ölçüm" ilkesiyle örtüşüyor (broker geri bildirimi,
    2026-09-30).
- **Risk taşıyan nokta — ÖNEMLİ AYRIM:** `rankingsFor()` "puan farkını"
  (`diff`) yumuşatmış olsa da, aynı fonksiyon her satıra ayrıca mutlak
  bir **`rank`** değeri de veriyor (`i + 1` — yani 1., 2., 3., ... en
  son) ve bu iki alan da (`diff` VE `rank`) birlikte UI'a geçiyor. Bu
  ikisi FARKLI şeyler yumuşatıyor: `diff` "ne kadar geridesin" acısını
  azaltıyor, ama `rank` "kaçıncısın" bilgisini hiç gizlemiyor.
  `Lig.jsx`'te sıralama listesi (`rankings`) herhangi bir `.slice(0,
  N)` ile kısıtlanmadan **TAM listeyi** `RankingTable`'a geçiyor
  (sadece Panel'deki podyum widget'ı ilk 3'le sınırlı) — yani her
  danışman, kendi rank'ının yanında **en alttaki** danışmanın rank'ını
  da görebiliyor. Ayrıca sayfada rol bazlı bir görünürlük kısıtı
  bulunamadı (`canManageScores` sadece kimin PUAN GİREBİLECEĞİNİ
  kısıtlıyor, kimin GÖREBİLECEĞİNİ değil) — araştırmadaki en yüksek
  riskli örüntüyle (tam, herkese açık, alt sıra dahil sıralama) birebir
  örtüşüyor. **Bu yüzden "zaten çözdük" diye kapatılmamalı** — mevcut
  tasarım sadece PUAN FARKI riskini azaltmış, SIRA NUMARASI riski
  hâlâ duruyor.
  - Ciro kategorisi TEK BAŞINA ele alınırsa "kontrol edilemeyen faktör"
    riski taşıyabilir (bölge/kaynak farkı gibi) — ama elimde bu konuda
    panelin bölge/kaynak dağılımını nasıl ele aldığına dair yeterli veri
    yok, bu bir [Görüş] olarak bırakılıyor, kesin bulgu değil.

## Denetçilere Önerilen Kurallar (taslak — onaysız uygulanmadı)

- **is-degeri-analisti için [Görüş] — İKİ AYRI ŞEYİ AYIRARAK
  DEĞERLENDİR (broker düzeltmesi, 2026-09-30):** Lig zaten `diff`
  (üstteki komşuya puan farkı) göstererek PUAN FARKI riskini bilinçli
  şekilde yumuşatmış — bunu "eksik" diye raporlama. Ama bununla
  KARIŞTIRILMAMASI gereken ayrı bir risk var: `rank` (mutlak sıra, 1.,
  2., ... en son) hâlâ tam listede, alt sıra dahil, rol kısıtı olmadan
  herkese açık. Bu ikisi FARKLI mekanizmalar — biri (`diff`) zaten
  çözülmüş, diğeri (`rank`'ın herkese açık tam listede görünmesi) hâlâ
  açık bir soru. Raporda ikisini net ayır, "zaten çözülmüş" diye tek
  kalemde kapatma. Broker'a soru olarak ilet: sıra numarasının tam
  liste halinde herkese açık olması bilinçli bir tercih mi (rekabeti
  körüklemek istiyor), yoksa gözden mi kaçtı? [İhlal] DEĞİL —
  CLAUDE.md'de bunu yasaklayan bir kural yok, sadece bilinçli karar mı
  diye sorulmalı.
- **is-degeri-analisti için [Görüş]:** Ciro kategorisinin danışmanın
  kontrolü dışındaki faktörlerden (bölge, lead kaynağı) ne kadar
  etkilendiği modül tamamlandığında araştırılabilir — bu araştırmada
  yeterli veri toplanmadı, sadece işaret ediliyor.
- **veri-zinciri-analisti için not (uygulanmadı, sadece bilgi):**
  `wilsonScoreLowerBound` kullanımı ve 3 kategorili tasarım zaten
  araştırmadaki "adil ölçüm" ilkeleriyle uyumlu — bunlar [İhlal]/[Sapma]
  değil, tam tersi iyi örnek olarak not edilebilir.

## Kaynak Listesi
- [Medium — Death of the Leaderboard](https://medium.com/@kaizo/death-of-the-leaderboard-why-ranking-is-whats-wrong-in-workplace-gamification-7af68c408b60)
- [Spotio — Sales Leaderboards: The Complete Guide](https://spotio.com/blog/sales-leaderboards/)
- [Spinify — Top 10 Best Practices for Gamification and Sales Leaderboard](https://spinify.com/blog/top-10-sales-leaderboard-best-practices/)
- [eLearning Industry — 5 Leaderboard Mistakes To Avoid](https://elearningindustry.com/sales-gamification-5-leaderboard-mistakes-avoid)
- [taggd.in — Forced Ranking in the Workplace](https://taggd.in/hr-glossary/forced-ranking/)
- [ResearchGate — Do Performance Ranking Increase Employee Performance?](https://www.researchgate.net/publication/353014182_Do_Performance_Ranking_Increase_Employee_Performance)
- [Corporate Traditions — Employee Leaderboard](https://blog.corporatetraditions.com/glossary/employee-leaderboard) — bazı istatistikleri üretici/pazarlama kaynaklı, dikkatli kullanıldı

**Not:** Bu araştırma da arama motoru sonuç özetleri üzerinden yapıldı;
birincil akademik kaynaklara (ör. ResearchGate'teki tam makaleler)
doğrudan erişim bu oturumda denenmedi. Akademik doğrulama isteniyorsa
ayrı bir tur önerilir.
