---
description: Portal kurulunu (5 denetçi) çalıştırır, tek raporda birleştirir ve kaydeder
argument-hint: [incelenecek modül veya özellik]
---
İncelenecek konu: $ARGUMENTS

5 denetçiyi bu konu için çalıştır. Hepsine aynı konuyu ve ilgili dosya/ekranları ver; birbirlerinin sonuçlarını GÖSTERME.

1. Aşama (paralel): kod-guvenlik-denetci, veri-zinciri-analisti
2. Aşama (paralel): kullanilabilirlik-denetci, gorsel-denetci
3. Aşama: is-degeri-analisti

1. aşamada Kritik [İhlal] çıkarsa en üstte "YAYINA ENGEL" olarak belirt.

Moderatör olarak tek rapor hazırla:
1. **Yayına engel olanlar**
2. **Birleştirilmiş öncelik listesi:** etki ve efora göre sırala; aynı sorunu söyleyen bulguları birleştir, kaç denetçinin işaret ettiğini yaz. [İhlal] > [Sapma] > [Görüş]
3. **Senin kararını bekleyen [Sapma]'lar:** "bilinçli tercih mi?" soruları, tek listede
4. **Denetçilerin çeliştiği noktalar** ve senin değerlendirmen
5. **İş değeri özeti** (danışman / ofis, tek satır)
6. **Önerilen sonraki 3 adım**

Raporu docs/kurul/raporlar/ altına YYYY-AA-GG-konu.md adıyla kaydet. Bunun dışında hiçbir dosyayı değiştirme. Düzeltmelere ancak broker onay verirse başla.

Rapor sonuna şunu ekle: "Yanlış veya eksik bulguları docs/kurul/geri-bildirim.md dosyasına yazıp /kurul-egit komutunu çalıştırın."
