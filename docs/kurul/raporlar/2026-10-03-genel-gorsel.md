# Portal Kurulu Raporu — Genel Görsel Denetim

**Tarih:** 2026-10-03
**Kapsam:** Panel/Fırsatlar/Lig/Takip/Rehber/Recruiting (Yetki/kullanıcı yönetimi hariç — 2026-09-30'da ayrı incelendi).
**Not:** İlk kez yerel mock modda Playwright ile gerçek ekran görüntüsü alınarak doğrulandı (üretim/Supabase'e bu ortamdan ağ erişimi engelli).

## Düzeltildi (3/18)

1. **Takip > Eğitim sekmesi** — aynı satırda iki "Tümü" butonu farklı renkteydi (lacivert/kırmızı). `DateRangeFilter`'ın `Chip` bileşeni paylaşılarak düzeltildi.
2. **RecruitingDetailModal.jsx** — tamamen eski `ink-*` token katmanındaydı, liste görünümüyle tutarsızdı. Semantik tokenlere taşındı.
3. **Fırsatlar/Operasyon sarmalayıcısı** — eski token (`border-ink-100 bg-white`), semantik tokene taşındı, navy aksan korundu.

Üçü de gerçek ekran görüntüsüyle doğrulandı, regresyon yok (151 test geçti).

## Henüz uygulanmayan (15 bulgu)

- Panel.jsx'te iki farklı "kritik" kırmızısı, biri WCAG kontrastını geçmiyor (~4.41:1) — `lib/takip.js` tek satır düzeltme.
- Rehber modalları (PreviewModal/UploadDocModal) eski sistemde, liste/kart görünümü yeni sistemde.
- Leads.jsx'teki rozet ailesinde 3 farklı renk kaynağı.
- Paylaşılan `Button`/`Badge`/`Card`/`SegmentedControl` bileşenleri hiç kullanılmıyor (tutarsızlığın kök nedeni).
- Panel.jsx'te kendi "baş harf dairesi" paylaşılan `Avatar`'dan farklı renkte.
- Birkaç ham hex değer (`bg-[#E4E8EF]`, inline `#003da5`/`#dc1c2e`).
- Durum rozeti dolgu boyutu üç farklı ölçüde.
- `ActivityPointsSettings.jsx`'te dokunma hedefi WCAG eşiğinin altında (varsayım, tarayıcı gerekir).

Tam bulgu listesi ve dayanaklar için bu raporun ilk sürümüne (ajan çıktısı, bu konuşmanın geçmişinde) bakılabilir — broker onayı sonrası ayrı bir turda ele alınabilir.

---

Yanlış veya eksik bulguları docs/kurul/geri-bildirim.md dosyasına yazıp /kurul-egit komutunu çalıştırın.
