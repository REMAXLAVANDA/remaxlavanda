-- ============================================================================
-- Katılım kuralı: "Katılacağım" dedi ama sonucu hiç işaretlenmedi →
-- 3 gün sonra otomatik "katılmadı" (2026-10-06, broker onayı)
--
-- auto_resolve_attendance() (migration 20260912100000) SADECE 'davetli'
-- (hiç yanıt vermeyen) satırları çözüyordu; 'onayladi' durumu (davetsiz
-- bir etkinliğe "Katılmak İstiyorum" diyerek katılan kişi — bkz.
-- migration 20260802140000) kasıtlı olarak dışarıda bırakılmıştı,
-- "ayrıca değerlendirilecek" notuyla.
--
-- Kim neyi işaretler kuralı DEĞİŞMİYOR: katıldı/katılmadı'yı hâlâ sadece
-- ofis/broker/owner işaretliyor, danışmanın tek kendi yapabileceği mazeret
-- bildirmek (ofis onaylıyor/reddediyor). Bu kural sadece HİÇ KİMSENİN bir
-- şey yapmadığı durumu kapatıyor — tıpkı cevapsız davetlerde olduğu gibi.
--
-- Aynı fonksiyon, aynı cron (ayrı bir ikincisi değil) — tek fark WHERE
-- koşulundaki durum listesi. Zaten var olan 7 günlük yönetim düzeltme
-- penceresi (owner/ofis) bu durumda da geçerli: biri gerçekten katıldıysa
-- ama otomatik "katılmadı" yazıldıysa, 7 gün içinde düzeltilebilir.
--
-- ÖNEMLİ NÜANS (2026-10-06, broker açıklaması): "Katılmak İstiyorum"
-- akışı HER ZAMAN katilim_tipi='istege_bagli' ile kayıt açıyor — bu,
-- zorunlu olmayan bir etkinliğe (ör. artık zorunlu olmayan ama yine de
-- katılmak isteyen 3. ayındaki danışmanın oryantasyon eğitimine gönüllü
-- katılımı) gönüllü katılımı TEŞVİK etmek için var. Durumu burada
-- "katılmadı" yapmak (veri/raporlama doğruluğu için doğru) AMA bunun
-- Sağlık Skoru'ndaki Toplantı Katılımı yüzdesine girmesi YANLIŞ olurdu —
-- gönüllü katılıp gelemeyeni cezalandırmak amacın tersine çalışır. Bu
-- yüzden ayrı bir frontend düzeltmesi de yapıldı: lib/takip.js
-- meetingAttendPercent() artık katilimTipi==='istege_bagli' satırları
-- hiç saymıyor (sonucu ne olursa olsun).
-- ============================================================================

create or replace function public.auto_resolve_attendance()
returns void
language sql
security definer
set search_path = public
as $$
  update public.event_attendance ea
  set status = 'katilmadi', responded_at = now()
  from public.calendar_events ce
  where ea.event_id = ce.id
    and ea.status in ('davetli', 'onayladi')
    and coalesce(ce.end_at, ce.start_at) < now() - interval '3 days';
$$;
